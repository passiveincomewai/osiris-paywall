#!/usr/bin/env node
/**
 * WorldEye camera catalogue — the harvest sync (expansion Stage E).
 *
 * The OpenCCTV harvest is generation-time work: it cannot run inside
 * Vercel (a full pass probes ~30k feeds with per-host pacing and takes
 * far longer than any function limit), so refreshing the source means
 * running this on the catalogue machine, reviewing the outcome, and
 * committing the regenerated source + artifacts it updates:
 *
 *   src/app/api/cctv/opencctv-harvest.generated.ts   (write mode only)
 *   src/lib/camera-expansion/reports/harvest-latest-{write,dry-run}.json
 *   src/lib/camera-expansion/harvest-health.json
 *   src/lib/camera-expansion/sync-status.json
 *
 * The admin dashboard reads those committed artifacts — that is how the
 * last sync's outcome stays visible on the deployed site.
 *
 * Baseline discipline (learned in Stage C/D, do not relax): the harvest
 * dedupes against a baseline catalogue, and the repo's saved snapshot
 * (.cache/cctv-catalog.json) leaks harvest records past the
 * OSIRIS_CCTV_OCC_HARVEST flag — a baseline captured from a normal
 * server silently includes the very records being regenerated. This
 * wrapper therefore always captures the baseline from a throwaway
 * server started with the harvest flag OFF and a FRESH snapshot path,
 * and deletes the harvest tool's 1-hour baseline cache first so the
 * capture is genuinely fresh. (Pass --baseline-url to use your own
 * server instead — the anomaly gates below assume it is flag-off.)
 *
 * Refusal gates — a sync that trips one writes NOTHING to the repo and
 * exits 2 with the reason in sync-status.json:
 *   • the run's accounting does not reconcile (the tool also refuses);
 *   • the Windy family produced verified-new records (licensing
 *     regression — Windy is structurally excluded, so any appearance
 *     means the registry changed and a human must look);
 *   • the regenerated set shrinks >5% vs the committed generation
 *     without --allow-shrink (a probe outage or partial baseline
 *     must never wipe the harvest);
 *   • the regenerated set grows >50% vs the committed generation
 *     without --allow-growth (same reasoning, other direction);
 *   • the baseline came back partial AND smaller than 90% of the
 *     previous run's baseline (dedupe against a partial catalogue
 *     manufactures duplicates).
 *
 * Probe-cache reuse is the harvest tool's own TTL discipline, passed
 * through explicitly: alive verdicts are reused for 168h, dead verdicts
 * for 24h (a dead feed gets retried on the next day's run, not hammered
 * hourly, and never trusted for a week).
 *
 * Run (esbuild bundles the TS + @ alias, like the harvest tool):
 *   npx esbuild tools/sync-cameras.ts --bundle --platform=node \
 *     --format=esm --alias:@=./src --outfile=node_modules/.cache/sync-cameras.mjs
 *   node node_modules/.cache/sync-cameras.mjs --dry-run
 *   node node_modules/.cache/sync-cameras.mjs --write
 *   node node_modules/.cache/sync-cameras.mjs --refresh-artifacts
 *
 * Recommended schedule: weekly (see docs/camera-sync.md).
 */

import { spawn, type ChildProcess } from 'node:child_process';
import {
  copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync,
  rmSync, writeFileSync,
} from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import type { HarvestReport } from '../src/lib/camera-expansion/pipeline';
import { gateReport } from '../src/lib/camera-expansion/sync-gate';
import type { ProbeResult } from '../src/lib/camera-expansion/probe';
import type {
  HarvestHealthArtifact,
  SyncStatus,
} from '../src/lib/camera-expansion/dashboard';
import type { CctvCamera } from '../src/app/api/cctv/types';

/* ── args ─────────────────────────────────────────────────────────────── */

const argv = process.argv.slice(2);
const flag = (name: string) => argv.includes(`--${name}`);
const opt = (name: string, fallback: string) => {
  const hit = argv.find(a => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};

const WRITE = flag('write');
const REFRESH_ARTIFACTS = flag('refresh-artifacts');
const ALLOW_SHRINK = flag('allow-shrink');
const ALLOW_GROWTH = flag('allow-growth');
const PORT = Number(opt('port', '3217'));
const BASELINE_URL_ARG = opt('baseline-url', '');
const PROBE_TTL_HOURS = opt('probe-ttl-hours', '168');
const PROBE_DEAD_TTL_HOURS = opt('probe-dead-ttl-hours', '24');
const REPO = process.cwd();
const WORK = opt('work-dir', process.env.WE_EXPANSION_WORK ?? join(homedir(), 'workspace/worldeye-camera-expansion/work'));
const GENERATED = join(REPO, 'src/app/api/cctv/opencctv-harvest.generated.ts');
const ARTIFACT_DIR = join(REPO, 'src/lib/camera-expansion');
const REQUEST_DIR = join(REPO, '.cache/camera-sync');

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

function readJson<T>(path: string): T | null {
  try { return JSON.parse(readFileSync(path, 'utf8')) as T; } catch { return null; }
}

/* ── generated-file parsing (works for the temp output too) ──────────── */

const SHARD_EXPORTS: Record<string, string> = {
  OCCNorthAmerica: 'occ-north-america',
  OCCLatinAmerica: 'occ-latin-america',
  OCCEurope: 'occ-europe',
  OCCAfrica: 'occ-africa',
  OCCAsiaPacific: 'occ-asia-pacific',
};

export function parseGeneratedFile(path: string): Record<string, CctvCamera[]> {
  const src = readFileSync(path, 'utf8');
  const shards: Record<string, CctvCamera[]> = {};
  for (const [exportName, shard] of Object.entries(SHARD_EXPORTS)) {
    const match = new RegExp(`${exportName}_DATA = "((?:[^"\\\\]|\\\\.)*)"`).exec(src);
    if (!match) { shards[shard] = []; continue; }
    shards[shard] = JSON.parse(JSON.parse(`"${match[1]}"`)) as CctvCamera[];
  }
  return shards;
}

const countRecords = (shards: Record<string, CctvCamera[]>) =>
  Object.values(shards).reduce((n, list) => n + list.length, 0);

/* ── harvest-health artifact ─────────────────────────────────────────── */

/**
 * Join the generated records to the probe cache by feed URL: every
 * camera's last-verified timestamp and verdict, aggregated per shard.
 * This is the per-camera health the admin dashboard renders — derived
 * entirely from verdicts the probes actually recorded.
 */
export function buildHarvestHealth(
  shards: Record<string, CctvCamera[]>,
  probeCache: Record<string, ProbeResult>,
): HarvestHealthArtifact {
  const out: HarvestHealthArtifact = {
    generatedAt: new Date().toISOString(),
    shards: {},
    oldest: [],
  };
  const oldest: { id: string; shard: string; probedAt: string; epoch: number }[] = [];
  for (const [shard, records] of Object.entries(shards)) {
    const verifiedProbedAt: number[] = [];
    let unverified = 0;
    for (const rec of records) {
      const url = rec.feed_url ?? rec.stream_url ?? '';
      const verdict = url ? probeCache[url] : undefined;
      if (verdict && verdict.status === 'alive' && verdict.probedAt) {
        const epoch = Math.floor(Date.parse(verdict.probedAt) / 1000);
        verifiedProbedAt.push(epoch);
        oldest.push({ id: rec.id, shard, probedAt: verdict.probedAt, epoch });
      } else {
        unverified += 1;
      }
    }
    verifiedProbedAt.sort((a, b) => a - b);
    out.shards[shard] = { records: records.length, verifiedProbedAt, unverified };
  }
  oldest.sort((a, b) => a.epoch - b.epoch);
  out.oldest = oldest.slice(0, 10).map(({ id, shard, probedAt }) => ({ id, shard, probedAt }));
  return out;
}

function refreshHealthArtifact(): void {
  const shards = parseGeneratedFile(GENERATED);
  const probeCache = readJson<Record<string, ProbeResult>>(join(WORK, 'harvest-probe-cache.json')) ?? {};
  const health = buildHarvestHealth(shards, probeCache);
  writeFileSync(join(ARTIFACT_DIR, 'harvest-health.json'), JSON.stringify(health));
  const total = Object.values(health.shards).reduce((n, s) => n + s.records, 0);
  const verified = Object.values(health.shards).reduce((n, s) => n + s.verifiedProbedAt.length, 0);
  console.log(`[sync] harvest-health: ${total} records, ${verified} with an alive probe verdict on file`);
}

/* ── reports + status ────────────────────────────────────────────────── */

function latestWorkspaceReports(): { write: HarvestReport | null; dryRun: HarvestReport | null; any: HarvestReport | null } {
  const dir = join(WORK, 'reports');
  if (!existsSync(dir)) return { write: null, dryRun: null, any: null };
  const files = readdirSync(dir).filter(f => f.startsWith('harvest-') && f.endsWith('.json')).sort();
  let write: HarvestReport | null = null;
  let dryRun: HarvestReport | null = null;
  let any: HarvestReport | null = null;
  for (const f of files) {
    const report = readJson<HarvestReport>(join(dir, f));
    if (!report) continue;
    any = report;
    if (report.mode === 'write') write = report;
    else dryRun = report;
  }
  return { write, dryRun, any };
}

function statusFromReport(
  report: HarvestReport,
  verdict: SyncStatus['verdict'],
  detail: string,
  occTotalAfter: number | null,
  reportFile: string | null,
  requestSatisfiedAt: string | null,
): SyncStatus {
  const t = report.totals;
  return {
    lastRunAt: report.generatedAt,
    mode: report.mode,
    verdict,
    detail,
    counts: {
      inspected: t.inspected,
      verifiedNew: t.verifiedNew,
      duplicates: Object.values(t.duplicates).reduce((a, b) => a + b, 0),
      intraDuplicates: t.intraDuplicates,
      licenseHeld: t.licenseHeld,
      licenseExcluded: t.licenseExcluded,
      invalidFeed: t.invalidFeed,
      invalidCoordinates: t.invalidCoordinates,
      dead: t.dead,
      placeholder: t.placeholder,
      reconciles: report.reconciles,
    },
    baselineTotal: report.baseline.total,
    occTotalAfter,
    reportFile,
    requestSatisfiedAt,
  };
}

function writeStatus(status: SyncStatus): void {
  writeFileSync(join(ARTIFACT_DIR, 'sync-status.json'), JSON.stringify(status, null, 2) + '\n');
  console.log(`[sync] status: ${status.verdict} — ${status.detail}`);
}

/* ── dashboard dry-run requests ──────────────────────────────────────── */

interface RequestFile { pending: { requestedAt: string; requestedBy: string } | null; lastSatisfiedAt: string | null }

function readRequest(): RequestFile {
  return readJson<RequestFile>(join(REQUEST_DIR, 'requests.json')) ?? { pending: null, lastSatisfiedAt: null };
}

function satisfyRequest(at: string): string | null {
  const req = readRequest();
  if (!req.pending) return null;
  mkdirSync(REQUEST_DIR, { recursive: true });
  writeFileSync(join(REQUEST_DIR, 'requests.json'), JSON.stringify({ pending: null, lastSatisfiedAt: at }, null, 2) + '\n');
  return at;
}

/* ── baseline server ─────────────────────────────────────────────────── */

async function startBaselineServer(): Promise<{ url: string; stop: () => void }> {
  const snapshotPath = join(tmpdir(), `we-baseline-snapshot-${process.pid}.json`);
  rmSync(snapshotPath, { force: true });
  const child: ChildProcess = spawn('npx', ['next', 'start', '-p', String(PORT)], {
    cwd: REPO,
    detached: true,
    stdio: 'ignore',
    env: {
      ...process.env,
      /* The discipline: harvest flag OFF so the baseline cannot contain
         the records being regenerated; fresh snapshot path so the saved
         catalogue cannot leak them past the flag either. */
      OSIRIS_CCTV_OCC_HARVEST: 'off',
      OSIRIS_CCTV_SNAPSHOT: snapshotPath,
    },
  });
  const stop = () => {
    try { process.kill(-(child.pid ?? 0), 'SIGTERM'); } catch { /* already gone */ }
    rmSync(snapshotPath, { force: true });
  };
  const url = `http://localhost:${PORT}/api/cctv?region=all`;
  /* Wait until the throwaway instance holds a complete catalogue — its
     own restore path has no snapshot to lean on, so this is a genuine
     live build of every non-harvest region. */
  const deadline = Date.now() + 6 * 60_000;
  let lastTotal = 0;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
      if (res.ok) {
        const body = (await res.json()) as { total?: number; pendingRegions?: string[] };
        lastTotal = body.total ?? 0;
        console.log(`[sync] baseline server: ${lastTotal} cameras, ${body.pendingRegions?.length ?? 0} regions pending`);
        if (!body.pendingRegions?.length && lastTotal > 0) return { url, stop };
      }
    } catch { /* not up yet */ }
    await sleep(10_000);
  }
  console.warn(`[sync] baseline server did not fully warm in 6 min (last total ${lastTotal}) — proceeding; the harvest tool keeps the largest answer and the baseline gate below still applies`);
  return { url, stop };
}

/* ── harvest invocation ──────────────────────────────────────────────── */

async function runHarvest(mode: 'dry-run' | 'write', baselineUrl: string, outPath: string): Promise<HarvestReport> {
  /* Fresh baseline discipline: the tool caches the baseline for an
     hour — a sync must never dedupe against a capture older than the
     run itself. */
  rmSync(join(WORK, 'harvest-baseline.json'), { force: true });

  const bundle = join(REPO, 'node_modules/.cache/harvest-opencctv.mjs');
  await new Promise<void>((resolve, reject) => {
    const build = spawn('npx', [
      'esbuild', 'tools/harvest-opencctv.ts', '--bundle', '--platform=node',
      '--format=esm', '--alias:@=./src', `--outfile=${bundle}`,
    ], { cwd: REPO, stdio: 'inherit' });
    build.on('exit', code => (code === 0 ? resolve() : reject(new Error(`esbuild exited ${code}`))));
  });

  const args = [
    bundle,
    mode === 'write' ? '--write' : '--dry-run',
    `--baseline-url=${baselineUrl}`,
    `--out=${outPath}`,
    `--probe-ttl-hours=${PROBE_TTL_HOURS}`,
    `--probe-dead-ttl-hours=${PROBE_DEAD_TTL_HOURS}`,
  ];
  const code = await new Promise<number | null>(resolve => {
    const child = spawn('node', args, { cwd: REPO, stdio: 'inherit' });
    child.on('exit', resolve);
  });

  const dir = join(WORK, 'reports');
  const files = readdirSync(dir).filter(f => f.startsWith('harvest-') && f.endsWith('.json')).sort();
  const report = files.length ? readJson<HarvestReport>(join(dir, files[files.length - 1])) : null;
  if (!report) throw new Error(`harvest produced no report (exit ${code})`);
  return report;
}

/* ── gates (rules live in src/lib/camera-expansion/sync-gate.ts) ───── */

/* ── main ────────────────────────────────────────────────────────────── */

async function main(): Promise<number> {
  mkdirSync(join(ARTIFACT_DIR, 'reports'), { recursive: true });

  if (REFRESH_ARTIFACTS) {
    const { write, dryRun, any } = latestWorkspaceReports();
    if (write) copyFileSync(join(WORK, 'reports', `harvest-${write.generatedAt.replace(/[:.]/g, '-')}.json`), join(ARTIFACT_DIR, 'reports/harvest-latest-write.json'));
    if (dryRun) copyFileSync(join(WORK, 'reports', `harvest-${dryRun.generatedAt.replace(/[:.]/g, '-')}.json`), join(ARTIFACT_DIR, 'reports/harvest-latest-dry-run.json'));
    refreshHealthArtifact();
    if (any) {
      const occTotal = countRecords(parseGeneratedFile(GENERATED));
      writeStatus(statusFromReport(any, any.reconciles ? 'ok' : 'failed',
        'Status seeded from the latest workspace report by --refresh-artifacts (no generation run).',
        occTotal, null, null));
    }
    console.log('[sync] artifacts refreshed');
    return 0;
  }

  const prevStatus = readJson<SyncStatus>(join(ARTIFACT_DIR, 'sync-status.json'));
  const prevOccTotal = countRecords(parseGeneratedFile(GENERATED));
  const requestedAt = readRequest().pending?.requestedAt ?? null;
  if (requestedAt) console.log(`[sync] a dashboard dry-run request from ${requestedAt} is pending — this run satisfies it`);

  let baselineUrl = BASELINE_URL_ARG;
  let stopServer: (() => void) | null = null;
  if (!baselineUrl) {
    if (!existsSync(join(REPO, '.next/BUILD_ID'))) {
      console.error('[sync] no production build found (.next/BUILD_ID) — run `npm run build` first, or pass --baseline-url=<flag-off server>');
      return 1;
    }
    const server = await startBaselineServer();
    baselineUrl = server.url;
    stopServer = server.stop;
  }

  const tmpOut = join(tmpdir(), `we-harvest-generated-${process.pid}.ts`);
  try {
    /* Pass 1 is always a generation into a temp file (write mode) or a
       pure dry run: the repo's generated source is only replaced after
       the gates pass, so a refused sync leaves the catalogue untouched. */
    const report = await runHarvest(WRITE ? 'write' : 'dry-run', baselineUrl, tmpOut);
    const reportName = `harvest-${report.generatedAt.replace(/[:.]/g, '-')}.json`;
    const gate = gateReport({
      report,
      prevOccTotal,
      /* Only compare baselines captured the same way: the status seeded
         from Stage C/D's flag-on idempotency run (71,101) and a flag-off
         sync baseline (~40k) are different quantities, and comparing
         them would refuse every first sync spuriously. */
      prevBaselineTotal: prevStatus?.baselineDiscipline === 'flag-off' ? prevStatus.baselineTotal : null,
      allowShrink: ALLOW_SHRINK,
      allowGrowth: ALLOW_GROWTH,
    });

    if (!gate.ok) {
      const satisfied = satisfyRequest(new Date().toISOString());
      const refusedStatus = statusFromReport(report, 'refused', gate.reason, prevOccTotal, reportName, satisfied);
      refusedStatus.baselineDiscipline = 'flag-off';
      writeStatus(refusedStatus);
      console.error(`[sync] REFUSED: ${gate.reason}`);
      return 2;
    }

    let occTotalAfter = prevOccTotal;
    if (WRITE) {
      copyFileSync(tmpOut, GENERATED);
      occTotalAfter = report.totals.verifiedNew;
      copyFileSync(join(WORK, 'reports', reportName), join(ARTIFACT_DIR, 'reports/harvest-latest-write.json'));
    } else {
      copyFileSync(join(WORK, 'reports', reportName), join(ARTIFACT_DIR, 'reports/harvest-latest-dry-run.json'));
    }
    refreshHealthArtifact();
    const satisfied = satisfyRequest(new Date().toISOString());
    const okStatus = statusFromReport(report, 'ok',
      WRITE ? `Write run complete. ${gate.reason}.` : `Dry run complete — nothing written to the catalogue. ${gate.reason}.`,
      occTotalAfter, reportName, satisfied);
    okStatus.baselineDiscipline = 'flag-off';
    writeStatus(okStatus);
    console.log(`[sync] done: inspected ${report.totals.inspected}, verified-new ${report.totals.verifiedNew}, reconciles ${report.reconciles}`);
    return 0;
  } finally {
    stopServer?.();
    rmSync(tmpOut, { force: true });
  }
}

if (process.argv[1]?.endsWith('sync-cameras.mjs') || process.argv[1]?.endsWith('sync-cameras.ts')) {
  void main().then(code => process.exit(code)).catch(error => {
    console.error('[sync] failed:', error);
    process.exit(1);
  });
}
