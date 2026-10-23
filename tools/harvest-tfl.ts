#!/usr/bin/env node
/**
 * Generate the probe-verified TfL JamCam staging snapshot for WorldEye.
 *
 *   TfL Unified API (GET /Place/Type/JamCam, anonymous 50 req/min, or
 *   the subscribed 500 req/min product when TFL_APP_KEY is set)
 *     → classify (src/app/api/cctv/tfl.ts — the runtime module's own
 *       mapper, so staged and live records can never drift apart)
 *     → dedupe vs the current served catalogue minus this source's own
 *       records (src/lib/camera-expansion/dedupe — provider id, URL,
 *       same-location and geo+name matchers, in that order)
 *     → probe (src/lib/camera-expansion/probe — Range-request image
 *       verification + the identical-bytes placeholder pass)
 *     → emit tfl-staged.generated.ts (with --write)
 *
 * The staged snapshot is the fallback src/app/api/cctv/tfl.ts serves
 * when the TfL API is unreachable at network level; the live API stays
 * the primary source. Refreshing the snapshot is a regeneration +
 * review + commit, exactly like the OpenCCTV harvest.
 *
 * Baseline discipline mirrors tools/harvest-opencctv.ts: dedupe against
 * the production catalogue (largest answer while regions are pending),
 * with this source's own records (source "TfL" / id prefix "tfl-")
 * removed — they are the previous generation of this very source, and
 * counting them would mark every JamCam a duplicate of itself. If the
 * production catalogue cannot be fetched, the baseline falls back to
 * the committed OpenCCTV harvest shards in this repo, and the report
 * says so.
 *
 * Run (esbuild bundles the TS + @ alias; Node runs the bundle):
 *   npx esbuild tools/harvest-tfl.ts --bundle --platform=node \
 *     --format=esm --alias:@=./src --outfile=node_modules/.cache/harvest-tfl.mjs
 *   node node_modules/.cache/harvest-tfl.mjs --dry-run
 *   node node_modules/.cache/harvest-tfl.mjs --write
 *
 * --dry-run is the default and writes nothing into the repo.
 */

import { execFile } from 'node:child_process';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CameraIndex, haversineM, type DupMethod } from '../src/lib/camera-expansion/dedupe';
import { applyPlaceholderPass, probeFeed, type ProbeResult } from '../src/lib/camera-expansion/probe';
import { classifyJamCam, tflPlacesUrl, type TfLPlace } from '../src/app/api/cctv/tfl';
import type { CctvCamera } from '../src/app/api/cctv/types';

/* ── args ─────────────────────────────────────────────────────────────── */

const args = new Map<string, string>();
for (let i = 2; i < process.argv.length; i++) {
  const arg = process.argv[i];
  if (!arg.startsWith('--')) continue;
  const eq = arg.indexOf('=');
  if (eq > 2) args.set(arg.slice(2, eq), arg.slice(eq + 1));
  else if (process.argv[i + 1] && !process.argv[i + 1].startsWith('--')) args.set(arg.slice(2), process.argv[++i]);
  else args.set(arg.slice(2), 'true');
}
const WRITE = args.has('write');
const BASELINE_URL = args.get('baseline-url') ?? 'https://worldeye.app/api/cctv?region=all';
const OUT = args.get('out') ?? join(process.cwd(), 'src/app/api/cctv/tfl-staged.generated.ts');
const REPORT_OUT = args.get('report') ?? '';
const PROBE_CONCURRENCY = Number(args.get('probe-concurrency') ?? '8');
const HOST_PACE_MS = 250;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function pool<T, R>(items: T[], concurrency: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, async () => {
      while (next < items.length) {
        const index = next++;
        out[index] = await fn(items[index]);
      }
    }),
  );
  return out;
}

/* ── baseline: the current served catalogue, minus this source ────────── */

function parseOccGenerated(path: string): CctvCamera[] {
  const src = readFileSync(path, 'utf8');
  const cameras: CctvCamera[] = [];
  for (const match of src.matchAll(/_DATA = "((?:[^"\\]|\\.)*)"/g)) {
    cameras.push(...(JSON.parse(JSON.parse(`"${match[1]}"`)) as CctvCamera[]));
  }
  return cameras;
}

async function loadBaseline(): Promise<{ cameras: CctvCamera[]; source: string }> {
  try {
    console.log(`[tfl] fetching baseline catalogue: ${BASELINE_URL}`);
    let best: CctvCamera[] | null = null;
    for (let attempt = 1; attempt <= 5; attempt++) {
      const res = await fetch(BASELINE_URL, { signal: AbortSignal.timeout(120_000) });
      if (!res.ok) throw new Error(`baseline HTTP ${res.status}`);
      const body = (await res.json()) as { cameras?: CctvCamera[]; pendingRegions?: string[] };
      if (!Array.isArray(body.cameras)) throw new Error('baseline returned no cameras array');
      if (!best || body.cameras.length > best.length) best = body.cameras;
      console.log(`[tfl]   attempt ${attempt}: ${body.cameras.length} cameras, ${body.pendingRegions?.length ?? 0} regions pending`);
      if (!body.pendingRegions?.length) break;
      await sleep(15_000);
    }
    if (!best) throw new Error('baseline fetch produced nothing');
    const own = best.filter(c => c.source === 'TfL' || c.id.startsWith('tfl-')).length;
    const cameras = best.filter(c => c.source !== 'TfL' && !c.id.startsWith('tfl-'));
    return {
      cameras,
      source: `GET ${BASELINE_URL} @ ${new Date().toISOString()} (${best.length} served, ${own} own TfL records excluded)`,
    };
  } catch (error) {
    const path = join(process.cwd(), 'src/app/api/cctv/opencctv-harvest.generated.ts');
    const cameras = parseOccGenerated(path).filter(c => c.source !== 'TfL' && !c.id.startsWith('tfl-'));
    console.warn(
      `[tfl] baseline fetch failed (${error instanceof Error ? error.message : error}) — falling back to the committed OpenCCTV harvest shards (${cameras.length} cameras). Dedupe is therefore against the harvest only, not the full served catalogue.`,
    );
    return { cameras, source: 'committed OpenCCTV harvest shards (production baseline unreachable)' };
  }
}

/* ── curl-backed fetch for probing ──────────────────────────────────── */
/* Same transport choice as tools/harvest-opencctv.ts, for the same
   reason: from this sandbox, Node's fetch under concurrency times out
   on hosts that answer curl immediately. The probe criteria in
   lib/camera-expansion/probe are unchanged — only the transport. */
const PROBE_TIMEOUT_S = 8;
let curlSeq = 0;
async function curlFetch(url: string, init?: RequestInit): Promise<Response> {
  const headers = (init?.headers ?? {}) as Record<string, string>;
  const bodyPath = join(tmpdir(), `we-tfl-probe-${process.pid}-${curlSeq++}`);
  const argv = ['-sS', '-L', '--max-time', String(PROBE_TIMEOUT_S), '--max-filesize', '2097152', '-o', bodyPath, '-w', '%{http_code} %{content_type}'];
  for (const [key, value] of Object.entries(headers)) argv.push('-H', `${key}: ${value}`);
  argv.push(url);
  try {
    const { stdout } = await new Promise<{ stdout: string }>((resolve, reject) => {
      execFile('curl', argv, { timeout: (PROBE_TIMEOUT_S + 5) * 1000, maxBuffer: 1 << 20 }, (error, stdout, stderr) => {
        if (stdout) resolve({ stdout });
        else {
          const code = (error as { code?: number } | null)?.code;
          reject(new Error(code === 28 ? 'The operation was aborted due to timeout' : `curl ${code ?? ''} ${stderr}`.trim()));
        }
      });
    });
    const match = /^(\d{3})\s*(.*)$/.exec(stdout.trim());
    if (!match || match[1] === '000') throw new Error('no response');
    let bytes: Buffer = Buffer.alloc(0);
    try { bytes = readFileSync(bodyPath).subarray(0, 65_536); } catch { /* empty body */ }
    const contentType = match[2].trim();
    return new Response(bytes.length ? new Uint8Array(bytes) : null, {
      status: Number(match[1]),
      headers: contentType ? { 'content-type': contentType } : {},
    });
  } finally {
    rmSync(bodyPath, { force: true });
  }
}

/* Per-host pacing, copied from the harvest tool: slots for a host are
   handed out through a promise chain so concurrent workers cannot all
   fire in one burst. All JamCam stills share one S3 host. */
const hostChains = new Map<string, Promise<void>>();
const hostLastStart = new Map<string, number>();
async function paceHost(host: string): Promise<void> {
  if (!host) return;
  const previous = hostChains.get(host) ?? Promise.resolve();
  let release!: () => void;
  const mine = new Promise<void>(resolve => { release = resolve; });
  hostChains.set(host, previous.then(() => mine));
  await previous;
  const wait = (hostLastStart.get(host) ?? 0) + HOST_PACE_MS - Date.now();
  if (wait > 0) await sleep(wait);
  hostLastStart.set(host, Date.now());
  release();
}

/* ── main pipeline ────────────────────────────────────────────────────── */

interface Counts {
  inspected: number;
  unavailable: number;
  invalidCoordinates: number;
  invalidFeed: number;
  missingId: number;
  duplicates: Record<DupMethod, number>;
  intraDuplicates: number;
  nearDistinct: number;
  probeDead: number;
  placeholder: number;
  verifiedNew: number;
}

async function main() {
  const startedAt = Date.now();
  const url = tflPlacesUrl();
  console.log(`[tfl] fetching JamCams: ${url.replace(/app_key=[^&]+/, 'app_key=…')}`);
  const res = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(60_000) });
  if (!res.ok) throw new Error(`TfL HTTP ${res.status}`);
  const places = (await res.json()) as TfLPlace[];
  if (!Array.isArray(places)) throw new Error('TfL returned no JamCam array');
  console.log(`[tfl] ${places.length} places returned`);

  const baseline = await loadBaseline();
  const index = new CameraIndex(baseline.cameras);
  console.log(`[tfl] dedupe index over ${baseline.cameras.length} served cameras (own TfL records excluded)`);

  const counts: Counts = {
    inspected: places.length,
    unavailable: 0,
    invalidCoordinates: 0,
    invalidFeed: 0,
    missingId: 0,
    duplicates: { id: 0, 'url-full': 0, 'url-hostpath': 0, 'same-location': 0, 'geo-name': 0 },
    intraDuplicates: 0,
    nearDistinct: 0,
    probeDead: 0,
    placeholder: 0,
    verifiedNew: 0,
  };

  /* Pass 1 — classify + dedupe vs the served catalogue. */
  const candidates: { camera: CctvCamera; nearDistinct: boolean }[] = [];
  for (const place of places) {
    const result = classifyJamCam(place);
    if (!result.ok) {
      if (result.reason === 'unavailable') counts.unavailable++;
      else if (result.reason === 'invalid-coordinates') counts.invalidCoordinates++;
      else if (result.reason === 'missing-id') { counts.invalidFeed++; counts.missingId++; }
      else counts.invalidFeed++;
      continue;
    }
    const classified = index.classify(result.camera);
    if (classified.cls === 'duplicate') { counts.duplicates[classified.method]++; continue; }
    candidates.push({ camera: result.camera, nearDistinct: classified.cls === 'near-distinct' });
  }
  console.log(`[tfl] ${candidates.length} candidates after classify + dedupe`);

  /* Pass 2 — probe every distinct still URL, paced per host. */
  const byUrl = new Map<string, { camera: CctvCamera; nearDistinct: boolean }[]>();
  for (const candidate of candidates) {
    const url = candidate.camera.feed_url!;
    const list = byUrl.get(url);
    if (list) list.push(candidate);
    else byUrl.set(url, [candidate]);
  }
  const urls = [...byUrl.keys()];
  console.log(`[tfl] probing ${urls.length} still URLs…`);
  const probeByUrl = new Map<string, ProbeResult>();
  let probed = 0;
  await pool(urls, PROBE_CONCURRENCY, async url => {
    let host = '';
    try { host = new URL(url).hostname; } catch { /* probeFeed classifies it */ }
    await paceHost(host);
    let result = await probeFeed(url, 'image', curlFetch);
    if (result.status === 'dead' && result.detail?.startsWith('network:')) {
      await paceHost(host);
      result = await probeFeed(url, 'image', curlFetch);
    }
    probeByUrl.set(url, result);
    if (++probed % 200 === 0) console.log(`[tfl]   probed ${probed}/${urls.length}`);
  });

  /* Placeholder pass: identical first bytes from ≥3 distinct cameras is
     an agency "camera offline" image, not three working feeds. */
  const probeEntries = new Map<string, { probe: ProbeResult; probeUrl: string }>();
  for (const candidate of candidates) {
    const probe = probeByUrl.get(candidate.camera.feed_url!);
    if (probe) probeEntries.set(candidate.camera.id, { probe, probeUrl: candidate.camera.feed_url! });
  }
  applyPlaceholderPass(probeEntries);

  /* Pass 3 — verdicts + second dedupe pass against the accepted set
     (the harvest tool's rule, including its url-hostpath corroboration
     exception for providers that put camera identity in the query). */
  const verified: CctvCamera[] = [];
  const acceptedById = new Map<string, CctvCamera>();
  for (const candidate of candidates) {
    const probe = probeEntries.get(candidate.camera.id)?.probe;
    if (!probe || probe.status === 'dead') { counts.probeDead++; continue; }
    if (probe.status === 'placeholder') { counts.placeholder++; continue; }
    const recheck = index.classify(candidate.camera);
    if (recheck.cls === 'duplicate') {
      const matched = acceptedById.get(recheck.matchedId);
      const corroborated =
        recheck.method !== 'url-hostpath' ||
        !matched ||
        haversineM(candidate.camera.lat, candidate.camera.lng, matched.lat, matched.lng) <= 120;
      if (corroborated) {
        if (matched) counts.intraDuplicates++;
        else counts.duplicates[recheck.method]++;
        continue;
      }
    }
    counts.verifiedNew++;
    if (candidate.nearDistinct || recheck.cls === 'near-distinct') counts.nearDistinct++;
    index.add(candidate.camera);
    acceptedById.set(candidate.camera.id, candidate.camera);
    verified.push(candidate.camera);
  }

  const dupTotal = Object.values(counts.duplicates).reduce((a, b) => a + b, 0);
  const outcomes =
    counts.unavailable + counts.invalidCoordinates + counts.invalidFeed +
    dupTotal + counts.intraDuplicates + counts.probeDead + counts.placeholder + counts.verifiedNew;
  const reconciles = outcomes === counts.inspected;

  const report = {
    generatedAt: new Date().toISOString(),
    mode: WRITE ? 'write' : 'dry-run',
    source: url.replace(/app_key=[^&]+/, 'app_key=…'),
    keyUsed: Boolean(process.env.TFL_APP_KEY?.trim()),
    baseline: { total: baseline.cameras.length, source: baseline.source },
    counts: { ...counts, duplicatesTotal: dupTotal },
    reconciles,
    notes: [
      'Probe verdicts from this sandbox are floors, not ceilings: hosts that block datacenter IPs read dead here and may play in a browser.',
      'near-distinct records (≤120 m from an existing camera, different name) are imported as distinct cameras and never merged into the existing record.',
      'Places TfL marks available=false are counted as unavailable and never probed or staged.',
    ],
  };
  console.log('\n[tfl] ── report ───────────────────────────────────────────');
  console.log(`  inspected ${counts.inspected} · verified-new ${counts.verifiedNew} (near-distinct ${counts.nearDistinct})`);
  console.log(`  unavailable ${counts.unavailable} · invalid-coords ${counts.invalidCoordinates} · invalid-feed ${counts.invalidFeed} (missing-id ${counts.missingId})`);
  console.log(`  duplicates ${JSON.stringify(counts.duplicates)} · intra ${counts.intraDuplicates}`);
  console.log(`  probe-dead ${counts.probeDead} · placeholder ${counts.placeholder}`);
  console.log(`  reconciles: ${reconciles}`);
  if (REPORT_OUT) writeFileSync(REPORT_OUT, JSON.stringify(report, null, 2) + '\n');
  if (!reconciles) {
    console.error('[tfl] ACCOUNTING DOES NOT RECONCILE — refusing to write output.');
    process.exitCode = 1;
    return;
  }

  if (WRITE) {
    const sorted = [...verified].sort((a, b) => a.id.localeCompare(b.id));
    const lines: string[] = [];
    lines.push("import type { CctvCamera } from './types';");
    lines.push('');
    lines.push('/**');
    lines.push(' * OSIRIS — TfL JamCams, probe-verified staged generation (GENERATED — do not edit by hand).');
    lines.push(' *');
    lines.push(' * Regenerate with tools/harvest-tfl.ts (see its header). Every record');
    lines.push(' * below was, at generation time: published by the TfL Unified API with');
    lines.push(' * the API\u2019s own coordinates, not a duplicate of the then-served');
    lines.push(' * catalogue (provider id, URL, same-location and geo+name matchers),');
    lines.push(' * and probe-verified alive. tfl.ts serves this snapshot only when the');
    lines.push(' * live API is unreachable at network level; the live API is primary.');
    lines.push(` * Generated: ${report.generatedAt} · mode: ${report.mode}`);
    lines.push(` * Baseline: ${report.baseline.total} served cameras (${report.baseline.source}).`);
    lines.push(` * Verified-new in this file: ${sorted.length} of ${counts.inspected} inspected.`);
    lines.push(' */');
    lines.push('');
    if (!sorted.length) {
      lines.push('export const TFL_STAGED_CAMERAS: CctvCamera[] = [];');
    } else {
      /* JSON string + JSON.parse, not object literals — the harvest
         generated file's shape, immune to the TS2590 union blow-up. */
      lines.push(`const TFL_STAGED_DATA = ${JSON.stringify(JSON.stringify(sorted))};`);
      lines.push('export const TFL_STAGED_CAMERAS: CctvCamera[] = JSON.parse(TFL_STAGED_DATA);');
    }
    writeFileSync(OUT, lines.join('\n') + '\n');
    console.log(`[tfl] wrote ${sorted.length} verified cameras to ${OUT}`);
  } else {
    console.log('[tfl] dry-run — no catalogue files written. Re-run with --write to emit the staged source.');
  }
  console.log(`[tfl] done in ${Math.round((Date.now() - startedAt) / 1000)}s`);
}

void main().catch(error => {
  console.error('[tfl] failed:', error);
  process.exitCode = 1;
});
