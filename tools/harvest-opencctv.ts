#!/usr/bin/env node
/**
 * Generate the OpenCCTV harvest source for the WorldEye camera catalogue.
 *
 *   adapter (OpenCCTV markers + batch, uncapped)
 *     → normalize (src/lib/camera-expansion/normalize)
 *     → family licensing gate (families registry — only CLEAR families,
 *       plus any CONDITIONAL family named in --families; Windy never)
 *     → dedupe vs the current served catalogue + the accepted set
 *       (dedupe — the audit's four matchers + provider id)
 *     → probe (generation-time feed verification, Range fingerprints)
 *     → emit a generated source file for the catalogue (with --write)
 *
 * Everything resumable lives in the expansion workspace, never in git:
 * fetched records, probe verdicts and reports are cached under
 * ~/workspace/worldeye-camera-expansion/work (WE_EXPANSION_WORK overrides),
 * so a re-run continues where the last one stopped and a second identical
 * run adds zero records (ids are deterministic in (provider, upstream id)
 * and every candidate is re-classified against the served catalogue).
 *
 * Run (esbuild bundles the TS + @ alias; Node runs the bundle):
 *   npx esbuild tools/harvest-opencctv.ts --bundle --platform=node \
 *     --format=esm --alias:@=./src --outfile=node_modules/.cache/harvest-opencctv.mjs
 *   node node_modules/.cache/harvest-opencctv.mjs --dry-run --sample 15000
 *   node node_modules/.cache/harvest-opencctv.mjs --write    --sample 15000
 *
 * --dry-run is the default and writes nothing into the repo.
 */

import { execFile } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { CameraIndex } from '../src/lib/camera-expansion/dedupe';
import { familyEnabled, familyInfo } from '../src/lib/camera-expansion/families';
import { normalizeOccRecord, type OccRawRecord } from '../src/lib/camera-expansion/normalize';
import {
  emptyFamilyStats,
  reportReconciles,
  summarizeFamilies,
  type FamilyStats,
  type HarvestReport,
} from '../src/lib/camera-expansion/pipeline';
import { applyPlaceholderPass, probeFeed, type ProbeKind, type ProbeResult } from '../src/lib/camera-expansion/probe';
import { OCC_HARVEST_SHARDS, shardFor, type OccHarvestShard } from '../src/lib/camera-expansion/shards';
import type { CctvCamera } from '../src/app/api/cctv/types';

/* ── args ─────────────────────────────────────────────────────────────── */

const args = new Map<string, string>();
for (let i = 2; i < process.argv.length; i++) {
  const arg = process.argv[i];
  if (!arg.startsWith('--')) continue;
  const eq = arg.indexOf('=');
  if (eq > 2) {
    args.set(arg.slice(2, eq), arg.slice(eq + 1));
  } else if (process.argv[i + 1] && !process.argv[i + 1].startsWith('--')) {
    args.set(arg.slice(2), process.argv[++i]);
  } else {
    args.set(arg.slice(2), 'true');
  }
}
const flag = (name: string) => args.has(name);
const opt = (name: string, fallback: string) => args.get(name) ?? fallback;

const WRITE = flag('write');
const SAMPLE = args.has('sample') ? Number(args.get('sample')) : undefined;
const FORCE_FAMILIES = new Set((args.get('families') ?? '').split(',').map(s => s.trim()).filter(Boolean));
const PROBE_TTL_HOURS = Number(opt('probe-ttl-hours', '168'));
const PROBE_DEAD_TTL_HOURS = Number(opt('probe-dead-ttl-hours', '24'));
const PROBE_BUDGET_MS = Number(opt('probe-budget-min', '90')) * 60_000;
const BASELINE_URL = opt('baseline-url', 'https://worldeye.app/api/cctv?region=all');
const WORK = opt('work-dir', process.env.WE_EXPANSION_WORK ?? join(homedir(), 'workspace/worldeye-camera-expansion/work'));
/* Resolved from the working directory — the tool always runs from the
   repo root, and import.meta.url points at the esbuild bundle, not here. */
const OUT = opt('out', join(process.cwd(), 'src/app/api/cctv/opencctv-harvest.generated.ts'));

const MARKERS_URL = 'https://opencctv.org/api/cameras/markers';
const BATCH_URL = 'https://opencctv.org/api/cameras/batch';
const BATCH_SIZE = 50; // the server truncates a batch response to 50 rows
const FETCH_CONCURRENCY = 4;
const PROBE_CONCURRENCY = Number(opt('probe-concurrency', '8'));
const HOST_PACE_MS = 250;

mkdirSync(join(WORK, 'reports'), { recursive: true });

/* ── small utilities ──────────────────────────────────────────────────── */

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function pool<T, R>(items: T[], concurrency: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, async () => {
      while (next < items.length) {
        const index = next++;
        out[index] = await fn(items[index], index);
      }
    }),
  );
  return out;
}

function readJson<T>(path: string): T | null {
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as T;
  } catch {
    return null;
  }
}

/* ── marker index (cached 24 h) ───────────────────────────────────────── */

interface MarkerIndex { ids: string[]; lats: number[]; lngs: number[] }

async function loadMarkers(): Promise<MarkerIndex> {
  const cachePath = join(WORK, 'harvest-markers.json');
  const cached = readJson<{ fetchedAt: number; index: MarkerIndex }>(cachePath);
  if (cached && Date.now() - cached.fetchedAt < 24 * 3600_000 && cached.index.ids?.length) {
    console.log(`[harvest] markers from cache (${cached.index.ids.length} ids, ${new Date(cached.fetchedAt).toISOString()})`);
    return cached.index;
  }
  console.log('[harvest] fetching OpenCCTV marker index…');
  const res = await fetch(MARKERS_URL, { headers: { Accept: 'application/json', Referer: 'https://opencctv.org/' }, signal: AbortSignal.timeout(60_000) });
  if (!res.ok) throw new Error(`markers HTTP ${res.status}`);
  const index = (await res.json()) as MarkerIndex;
  if (!Array.isArray(index.ids) || !Array.isArray(index.lats) || !Array.isArray(index.lngs)) throw new Error('markers returned no index');
  writeFileSync(cachePath, JSON.stringify({ fetchedAt: Date.now(), index }));
  console.log(`[harvest] markers fetched (${index.ids.length} ids)`);
  return index;
}

/** The production sampler's stride walk — spread across operators, not the first N. */
function strideSample<T>(items: T[], cap: number): T[] {
  if (items.length <= cap) return items;
  const stride = items.length / cap;
  const out: T[] = [];
  for (let i = 0; out.length < cap && Math.floor(i) < items.length; i += stride) out.push(items[Math.floor(i)]);
  return out;
}

/* ── record harvest (JSONL cache, resumable) ──────────────────────────── */

function loadRecordCache(): Map<string, OccRawRecord> {
  const path = join(WORK, 'harvest-records.jsonl');
  const cache = new Map<string, OccRawRecord>();
  if (!existsSync(path)) return cache;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try {
      const rec = JSON.parse(line) as OccRawRecord;
      if (rec.id) cache.set(rec.id, rec);
    } catch { /* a torn last line from an interrupted run — the ids get refetched */ }
  }
  return cache;
}

async function fetchBatch(ids: string[]): Promise<OccRawRecord[]> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(BATCH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', Referer: 'https://opencctv.org/' },
        body: JSON.stringify({ ids }),
        signal: AbortSignal.timeout(30_000),
      });
      if (!res.ok) throw new Error(`batch HTTP ${res.status}`);
      const data = (await res.json()) as OccRawRecord[];
      return Array.isArray(data) ? data.filter(Boolean) : [];
    } catch (error) {
      if (attempt === 1) console.warn(`[harvest] batch failed (${ids[0]}…): ${error instanceof Error ? error.message : error}`);
    }
  }
  return [];
}

async function harvestRecords(ids: string[], cache: Map<string, OccRawRecord>): Promise<{ fetched: number; fromCache: number }> {
  const missing = ids.filter(id => !cache.has(id));
  const fromCache = ids.length - missing.length;
  if (!missing.length) return { fetched: 0, fromCache };
  const chunks: string[][] = [];
  for (let i = 0; i < missing.length; i += BATCH_SIZE) chunks.push(missing.slice(i, i + BATCH_SIZE));
  console.log(`[harvest] fetching ${missing.length} records in ${chunks.length} batches (${fromCache} already cached)…`);
  const cachePath = join(WORK, 'harvest-records.jsonl');
  let fetched = 0;
  let done = 0;
  await pool(chunks, FETCH_CONCURRENCY, async chunk => {
    await sleep(HOST_PACE_MS);
    const records = await fetchBatch(chunk);
    for (const rec of records) {
      if (rec.id && !cache.has(rec.id)) {
        cache.set(rec.id, rec);
        appendFileSync(cachePath, JSON.stringify(rec) + '\n');
        fetched++;
      }
    }
    done++;
    if (done % 100 === 0) console.log(`[harvest]   ${done}/${chunks.length} batches`);
  });
  return { fetched, fromCache };
}

/* ── baseline: the current served catalogue ───────────────────────────── */

async function loadBaseline(): Promise<{ cameras: CctvCamera[]; source: string }> {
  const cachePath = join(WORK, 'harvest-baseline.json');
  const cached = readJson<{ fetchedAt: number; source: string; cameras: CctvCamera[] }>(cachePath);
  if (cached && Date.now() - cached.fetchedAt < 3600_000) {
    console.log(`[harvest] baseline from cache (${cached.cameras.length} cameras, ${cached.source})`);
    return { cameras: cached.cameras, source: cached.source };
  }
  try {
    console.log(`[harvest] fetching baseline catalogue: ${BASELINE_URL}`);
    /* A cold production instance answers with the regions it has and lists
       the rest as pending — dedupe against a partial catalogue would call
       served cameras "new". Retry while regions are pending and keep the
       largest answer; every response also nudges that instance to rebuild. */
    let best: { cameras: CctvCamera[]; pending: number } | null = null;
    for (let attempt = 1; attempt <= 5; attempt++) {
      const res = await fetch(BASELINE_URL, { signal: AbortSignal.timeout(120_000) });
      if (!res.ok) throw new Error(`baseline HTTP ${res.status}`);
      const body = (await res.json()) as { cameras?: CctvCamera[]; pendingRegions?: string[] };
      if (!Array.isArray(body.cameras)) throw new Error('baseline returned no cameras array');
      const pending = body.pendingRegions?.length ?? 0;
      if (!best || body.cameras.length > best.cameras.length) best = { cameras: body.cameras, pending };
      console.log(`[harvest]   attempt ${attempt}: ${body.cameras.length} cameras, ${pending} regions pending`);
      if (!pending) break;
      await sleep(15_000);
    }
    if (!best) throw new Error('baseline fetch produced nothing');
    /* Union with the audit capture: a region a cold instance leaves
       pending is still served catalogue, and dedupe must know about it
       or the harvest "discovers" cameras the site already has. */
    let cameras = best.cameras;
    const auditCapture = readJson<{ cameras?: CctvCamera[] }>(join(WORK, 'we_cctv_prod.json'));
    if (auditCapture?.cameras?.length) {
      const byId = new Map(cameras.map(camera => [camera.id, camera]));
      let added = 0;
      for (const camera of auditCapture.cameras) {
        if (!byId.has(camera.id)) { byId.set(camera.id, camera); added++; }
      }
      cameras = [...byId.values()];
      console.log(`[harvest]   audit capture union: +${added} cameras (dedupe input ${cameras.length})`);
    }
    const source = `GET ${BASELINE_URL} @ ${new Date().toISOString()}${best.pending ? ` (still ${best.pending} regions pending — largest answer kept)` : ''} ∪ audit capture`;
    writeFileSync(cachePath, JSON.stringify({ fetchedAt: Date.now(), source, cameras }));
    return { cameras, source };
  } catch (error) {
    const fallback = readJson<{ cameras?: CctvCamera[] }>(join(WORK, 'we_cctv_prod.json'));
    if (fallback?.cameras?.length) {
      console.warn(`[harvest] baseline fetch failed (${error instanceof Error ? error.message : error}) — using the audit capture work/we_cctv_prod.json`);
      return { cameras: fallback.cameras, source: 'audit capture work/we_cctv_prod.json (2026-10-18)' };
    }
    throw error;
  }
}

/* ── curl-backed fetch for probing ──────────────────────────────────── */
/**
 * The probe transport matters as much as the criteria: from this sandbox,
 * Node's fetch under concurrency times out on hosts that answer curl
 * immediately (measured: curl revived 36/40 "timeout-dead" URLs; the Stage
 * A audit's liveness numbers were likewise gathered with curl). The
 * prober in lib/camera-expansion takes an injectable fetch for exactly
 * this reason — the criteria stay identical, the transport matches the
 * one the audit validated. Not used for the OpenCCTV API or the baseline
 * catalogue, which Node fetch handles fine at low concurrency.
 */
let curlSeq = 0;
async function curlFetch(url: string, init?: RequestInit): Promise<Response> {
  const headers = (init?.headers ?? {}) as Record<string, string>;
  const bodyPath = join(tmpdir(), `we-probe-${process.pid}-${curlSeq++}`);
  const argv = ['-sS', '-L', '--max-time', String(PROBE_TIMEOUT_S), '--max-filesize', '2097152', '-o', bodyPath, '-w', '%{http_code} %{content_type}'];
  for (const [key, value] of Object.entries(headers)) argv.push('-H', `${key}: ${value}`);
  argv.push(url);
  try {
    const { stdout } = await new Promise<{ stdout: string }>((resolve, reject) => {
      execFile('curl', argv, { timeout: (PROBE_TIMEOUT_S + 5) * 1000, maxBuffer: 1 << 20 }, (error, stdout, stderr) => {
        /* A --max-filesize abort (exit 63) still leaves a usable prefix
           and a status line — resolve whenever curl reported one. */
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
const PROBE_TIMEOUT_S = 8;

/* ── probe cache ──────────────────────────────────────────────────────── */

type ProbeCache = Record<string, ProbeResult>;

function loadProbeCache(): ProbeCache {
  const cache = readJson<ProbeCache>(join(WORK, 'harvest-probe-cache.json')) ?? {};
  if (flag('retry-network-dead')) {
    /* Transport failures are transient evidence — a throttled host or a
       congested minute reads as a timeout, not as a verdict. HTTP answers
       (a real 404/403) are verdicts and stay cached. */
    let dropped = 0;
    for (const [url, result] of Object.entries(cache)) {
      if (result.status === 'dead' && result.detail?.startsWith('network:')) {
        delete cache[url];
        dropped++;
      }
    }
    if (dropped) console.log(`[harvest] probe cache: dropped ${dropped} network-failure verdicts for re-probing`);
  }
  return cache;
}

/**
 * Per-host pacing that actually paces: slots for a host are handed out
 * through a promise chain, so concurrent workers cannot all read the same
 * "last request" timestamp and fire in one burst (the failure mode that
 * got cam.river.go.jp throttled into mass timeouts on the first run).
 */
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

function probeCacheFresh(result: ProbeResult): boolean {
  const age = Date.now() - Date.parse(result.probedAt);
  const ttl = (result.status === 'alive' ? PROBE_TTL_HOURS : PROBE_DEAD_TTL_HOURS) * 3600_000;
  return Number.isFinite(age) && age < ttl;
}

/* ── main pipeline ────────────────────────────────────────────────────── */

interface Candidate {
  camera: CctvCamera;
  family: string;
  probeUrl: string;
  probeKind: ProbeKind;
  nearDistinct: boolean;
}

async function main() {
  const startedAt = Date.now();
  const markers = await loadMarkers();
  const selectedIds = SAMPLE ? strideSample(markers.ids, SAMPLE) : markers.ids;
  console.log(`[harvest] ${selectedIds.length} ids selected${SAMPLE ? ` (stride sample of ${markers.ids.length})` : ''}`);

  const recordCache = loadRecordCache();
  const { fetched, fromCache } = await harvestRecords(selectedIds, recordCache);

  const baseline = await loadBaseline();
  const index = new CameraIndex(baseline.cameras);
  const acceptedIds = new Set<string>();
  console.log(`[harvest] dedupe index over ${baseline.cameras.length} served cameras`);

  const familyStats = new Map<string, FamilyStats>();
  const statsFor = (family: string) => {
    let stats = familyStats.get(family);
    if (!stats) familyStats.set(family, (stats = emptyFamilyStats(family)));
    return stats;
  };

  /* Pass 1 — licensing gate, normalization, dedupe. Deterministic order. */
  const candidates: Candidate[] = [];
  const selected = selectedIds
    .map(id => recordCache.get(id))
    .filter((rec): rec is OccRawRecord => Boolean(rec))
    .sort((a, b) => String(a.id).localeCompare(String(b.id)));

  for (const rec of selected) {
    const family = rec.source?.trim() || 'unknown';
    const stats = statsFor(family);
    stats.inspected++;

    const info = familyInfo(family);
    if (info.verdict === 'excluded') { stats.licenseExcluded++; continue; }
    if (!familyEnabled(family, FORCE_FAMILIES)) { stats.licenseHeld++; continue; }

    const normalized = normalizeOccRecord(rec);
    if (!normalized.ok) {
      if (normalized.reason === 'invalid-coordinates') stats.invalidCoordinates++;
      else stats.invalidFeed++;
      continue;
    }
    const { camera, probeUrl, probeKind } = normalized.value;

    const result = index.classify(camera);
    if (result.cls === 'duplicate') {
      if (acceptedIds.has(result.matchedId)) stats.intraDuplicates++;
      else stats.duplicates[result.method]++;
      continue;
    }
    candidates.push({ camera, family, probeUrl, probeKind, nearDistinct: result.cls === 'near-distinct' });
  }

  /* Pass 2 — probes, cached and paced. One probe per distinct URL. */
  const probeCache = loadProbeCache();
  const byUrl = new Map<string, Candidate[]>();
  for (const candidate of candidates) {
    const list = byUrl.get(candidate.probeUrl);
    if (list) list.push(candidate);
    else byUrl.set(candidate.probeUrl, [candidate]);
  }
  const urls = [...byUrl.keys()];
  const fresh = urls.filter(url => probeCache[url] && probeCacheFresh(probeCache[url]));
  const toProbe = urls.filter(url => !probeCache[url] || !probeCacheFresh(probeCache[url]));
  console.log(`[harvest] probing ${toProbe.length} feeds (${fresh.length} fresh in cache, ${candidates.length} candidate cameras)…`);

  const probeStarted = Date.now();
  let probedCount = 0;
  let budgetHit = false;
  await pool(toProbe, PROBE_CONCURRENCY, async url => {
    if (Date.now() - probeStarted > PROBE_BUDGET_MS) { budgetHit = true; return; }
    let host = '';
    try { host = new URL(url).hostname; } catch { /* probeFeed will classify it */ }
    const kind = byUrl.get(url)![0].probeKind;
    await paceHost(host);
    let result = await probeFeed(url, kind, curlFetch);
    if (result.status === 'dead' && result.detail?.startsWith('network:')) {
      /* One retry for transport failures — throttling is transient. */
      await paceHost(host);
      result = await probeFeed(url, kind, curlFetch);
    }
    probeCache[url] = result;
    probedCount++;
    if (probedCount % 250 === 0) {
      writeFileSync(join(WORK, 'harvest-probe-cache.json'), JSON.stringify(probeCache));
      console.log(`[harvest]   probed ${probedCount}/${toProbe.length}`);
    }
  });
  writeFileSync(join(WORK, 'harvest-probe-cache.json'), JSON.stringify(probeCache));
  if (budgetHit) console.warn('[harvest] probe budget reached — unprobed candidates are counted as dead this run and stay cached for the next');

  /* Placeholder pass over this run's candidates. */
  const probeEntries = new Map<string, { probe: ProbeResult; probeUrl: string }>();
  for (const candidate of candidates) {
    const probe = probeCache[candidate.probeUrl];
    if (probe) probeEntries.set(candidate.camera.id, { probe, probeUrl: candidate.probeUrl });
  }
  applyPlaceholderPass(probeEntries);

  /* Pass 3 — verdicts, accepted set, output. */
  const verified: CctvCamera[] = [];
  for (const candidate of candidates) {
    const stats = statsFor(candidate.family);
    const probe = probeEntries.get(candidate.camera.id)?.probe;
    if (!probe) { stats.dead++; continue; }
    if (probe.status === 'placeholder') { stats.placeholder++; continue; }
    if (probe.status !== 'alive') { stats.dead++; continue; }
    stats.verifiedNew++;
    if (candidate.nearDistinct) stats.nearDistinct++;
    index.add(candidate.camera);
    acceptedIds.add(candidate.camera.id);
    verified.push(candidate.camera);
  }

  const families = [...familyStats.values()].sort((a, b) => b.inspected - a.inspected);
  const totals = summarizeFamilies(families);
  const notes: string[] = [
    'Probe verdicts from this sandbox are floors, not ceilings: hosts that block datacenter IPs read dead here and may play in a browser (audit §3.1).',
    'near-distinct records (≤120 m from an existing camera, different name) are imported as distinct cameras and never merged into the existing record.',
  ];
  if (budgetHit) notes.push('Probe budget was reached; unprobed candidates were counted as dead and remain cached for the next run.');
  if (SAMPLE) notes.push(`Stride sample of ${SAMPLE} ids from a ${markers.ids.length}-id index — a pipeline proof slice, not the full harvest (Stage C/D).`);

  const report: HarvestReport = {
    generatedAt: new Date().toISOString(),
    mode: WRITE ? 'write' : 'dry-run',
    harvest: { markersTotal: markers.ids.length, idsSelected: selectedIds.length, recordsFetched: fetched, recordsCached: fromCache },
    baseline: { total: baseline.cameras.length, source: baseline.source },
    families,
    totals,
    reconciles: false,
    notes,
  };
  report.reconciles = reportReconciles(report);

  const reportPath = join(WORK, 'reports', `harvest-${report.generatedAt.replace(/[:.]/g, '-')}.json`);
  writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log('\n[harvest] ── report ───────────────────────────────────────────');
  console.log(`  inspected ${totals.inspected} · verified-new ${totals.verifiedNew} (near-distinct ${totals.nearDistinct})`);
  console.log(`  duplicates ${JSON.stringify(totals.duplicates)} · intra ${totals.intraDuplicates}`);
  console.log(`  license-held ${totals.licenseHeld} · license-excluded ${totals.licenseExcluded}`);
  console.log(`  invalid-coords ${totals.invalidCoordinates} · invalid-feed ${totals.invalidFeed} · dead ${totals.dead} · placeholder ${totals.placeholder}`);
  console.log(`  reconciles: ${report.reconciles} · report: ${reportPath}`);
  if (!report.reconciles) {
    console.error('[harvest] ACCOUNTING DOES NOT RECONCILE — refusing to write output.');
    process.exitCode = 1;
    return;
  }

  if (WRITE) {
    writeGenerated(verified, report);
  } else {
    console.log('[harvest] dry-run — no catalogue files written. Re-run with --write to emit the generated source.');
  }
  console.log(`[harvest] done in ${Math.round((Date.now() - startedAt) / 1000)}s`);
}

/* ── generated output ─────────────────────────────────────────────────── */

function writeGenerated(verified: CctvCamera[], report: HarvestReport) {
  const shards = new Map<OccHarvestShard, CctvCamera[]>();
  for (const camera of verified) {
    const shard = shardFor(camera.lat, camera.lng);
    const list = shards.get(shard);
    if (list) list.push(camera);
    else shards.set(shard, [camera]);
  }
  const lines: string[] = [];
  lines.push("import type { CctvCamera } from './types';");
  lines.push('');
  lines.push('/**');
  lines.push(' * OSIRIS — OpenCCTV global harvest (GENERATED — do not edit by hand).');
  lines.push(' *');
  lines.push(' * Regenerate with tools/harvest-opencctv.ts (see its header). Every record');
  lines.push(' * below was, at generation time: from a licensing-cleared OpenCCTV family,');
  lines.push(' * not a duplicate of the then-served catalogue (provider id, URL,');
  lines.push(' * same-location and geo+name matchers), and probe-verified alive.');
  lines.push(` * Generated: ${report.generatedAt} · mode: ${report.mode}${SAMPLE ? ` · stride sample of ${SAMPLE} ids` : ' · full index'}`);
  lines.push(` * Baseline: ${report.baseline.total} served cameras (${report.baseline.source}).`);
  lines.push(` * Verified-new in this file: ${verified.length}.`);
  lines.push(' */');
  /* All five shards are always emitted (empty when the run verified
     nothing there) — the catalogue module imports them unconditionally. */
  for (const shard of OCC_HARVEST_SHARDS) {
    const cameras = shards.get(shard) ?? [];
    const constName = shard.replace(/(^|-)(\w)/g, (_m, _d, c: string) => c.toUpperCase()).replace(/^Occ/, 'OCC');
    lines.push('');
    if (!cameras.length) {
      lines.push(`export const ${constName}: CctvCamera[] = [];`);
      continue;
    }
    lines.push(`export const ${constName}: CctvCamera[] = [`);
    for (const camera of [...cameras].sort((a, b) => a.id.localeCompare(b.id))) {
      lines.push(`  ${JSON.stringify(camera)},`);
    }
    lines.push('];');
  }
  writeFileSync(OUT, lines.join('\n') + '\n');
  console.log(`[harvest] wrote ${verified.length} verified cameras to ${OUT}`);
}

void main().catch(error => {
  console.error('[harvest] failed:', error);
  process.exitCode = 1;
});
