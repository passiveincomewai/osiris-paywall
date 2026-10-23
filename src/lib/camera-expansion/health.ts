import type { SourceObservation } from '../sourceCache';

/**
 * Camera source health (expansion Stage E).
 *
 * Until now a camera source could die quietly: the catalogue caches
 * stale-on-error by design, so the only symptom of a dead upstream was
 * cameras missing from the map. This module turns what the source cache
 * has observed (lib/sourceCache's registry), what the catalogue currently
 * holds, and what the saved catalogue held into a per-source verdict.
 *
 * The rule that matters most is the silent-absence rule: a source whose
 * upstream is known to publish cameras (a saved catalogue or this
 * process's own high-water mark says so) but which currently serves ZERO
 * is DOWN — never "healthy at zero". DriveBC spent months in exactly
 * that state (its sub-source URL redirected to a 404 while every other
 * Canadian source kept the region green) before the Stage B2 audit
 * found it by hand.
 *
 * Everything here is a pure function of its inputs so the classification
 * is testable without a network; the runtime collector lives in
 * dashboard.ts and reads the live cache.
 */

export type SourceHealthStatus = 'healthy' | 'degraded' | 'down' | 'unknown' | 'gated';

export interface SourceHealth {
  /** Stable id: the region key, `alert-cameras`, or `label:<source label>`. */
  id: string;
  label: string;
  kind: 'region' | 'alert' | 'subsource' | 'occ-shard';
  status: SourceHealthStatus;
  /** Cameras this source contributes right now. */
  served: number;
  /** Cameras expected from the baseline (saved catalogue / high-water). */
  expected: number | null;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  lastError: string | null;
  /** One human sentence explaining the verdict. */
  reason: string;
}

export interface HealthRollup {
  healthy: number;
  degraded: number;
  down: number;
  unknown: number;
  gated: number;
  total: number;
}

/**
 * Sources intentionally switched off, with the reason on record. A gated
 * source is reported as `gated`, never as down: its absence is a decision,
 * not a failure. Keep this list honest — an entry here is a claim that a
 * human verified the source should stay off.
 */
export const GATED_SOURCES: Record<string, string> = {
  'label:WSDOT':
    'Direct fetcher gated off 2026-10-18 (Stage E): data.wsdot.wa.gov/log/public/cameras.json ' +
    'returns 404 (endpoint retired; verified from the sandbox and production). Washington ' +
    'coverage is carried by the OpenCCTV harvest wsdot family (1,174 probe-verified cameras). ' +
    'Re-enable with OSIRIS_CCTV_WSDOT=on if WSDOT republishes an endpoint.',
  'label:NYC DOT':
    'Direct module (nycdot.ts) landed 2026-10-22 but gated off: webcams.nyctmc.org is ' +
    'unreachable from this environment — the connection is dropped after the TLS handshake ' +
    'for the camera list and every image, reproducing the OpenCCTV pass\u2019s 946/946-dead probe. ' +
    'The upstream is alive (official list fetched off-sandbox 2026-10-22: 893 cameras, sampled ' +
    'stills live), but unverifiable from the serving pipeline, so it is not presented as serving. ' +
    'Re-enable with OSIRIS_CCTV_NYCDOT=on only after list + image probes pass from the serving environment.',
};

const iso = (ms: number | null | undefined): string | null =>
  ms ? new Date(ms).toISOString() : null;

/** A region/alert source whose fetch behaviour the cache has observed. */
export function classifyObservedSource(input: {
  id: string;
  label: string;
  kind: 'region' | 'alert';
  served: number;
  /** Baseline expectation: saved-catalogue count for this source, if known. */
  baseline: number | null;
  obs: SourceObservation | null;
}): SourceHealth {
  const { id, label, kind, served, baseline, obs } = input;
  const expected = Math.max(baseline ?? 0, obs?.highWaterCount ?? 0) || null;
  const base: Omit<SourceHealth, 'status' | 'reason'> = {
    id, label, kind, served, expected,
    lastSuccessAt: iso(obs?.lastSuccessAt),
    lastFailureAt: iso(obs?.lastFailureAt),
    lastError: obs?.lastError ?? null,
  };

  if (served > 0) {
    const lastOutcomeFailed =
      obs != null && obs.lastFailureAt != null &&
      (obs.lastSuccessAt == null || obs.lastFailureAt > obs.lastSuccessAt);
    if (lastOutcomeFailed) {
      return { ...base, status: 'degraded', reason: `Serving ${served} cached cameras; the latest refresh failed${obs?.lastError ? ` (${obs.lastError})` : ''} and stale data is being served.` };
    }
    if (expected != null && served < expected * 0.6) {
      return { ...base, status: 'degraded', reason: `Serving ${served} cameras against a baseline of ${expected} — a drop this large usually means a sub-source inside the region has gone quiet.` };
    }
    return {
      ...base, status: 'healthy',
      reason: obs && obs.attempts > 0
        ? `Serving ${served} cameras; fetches are succeeding.`
        : `Serving ${served} cameras restored from the saved catalogue; no fetch observed yet on this instance.`,
    };
  }

  /* served === 0 from here. */
  if (expected != null && expected > 0) {
    return { ...base, status: 'down', reason: `Silent absence: the baseline holds ${expected} cameras for this source and it currently serves 0. Zero is a failure here, not a healthy empty.` };
  }
  if (obs && obs.failures > 0 && obs.lastFailureAt != null &&
      (obs.lastSuccessAt == null || obs.lastFailureAt >= obs.lastSuccessAt)) {
    return { ...base, status: 'down', reason: `Fetch is failing and nothing is cached to fall back on${obs.lastError ? ` (${obs.lastError})` : ''}.` };
  }
  if (obs && obs.empties > 0) {
    return { ...base, status: 'degraded', reason: 'The upstream answered but returned zero cameras, and no baseline exists yet to prove it should have more.' };
  }
  return { ...base, status: 'unknown', reason: 'Not loaded yet on this instance — no fetch observed and nothing restored.' };
}

/**
 * A feed label inside composite regions (DriveBC inside `canada`, WSDOT
 * inside `us-west`). Labels have no fetch of their own to observe; their
 * health is the comparison between what the catalogue holds now and what
 * the saved catalogue held.
 */
export function classifyLabelSource(input: {
  label: string;
  current: number;
  baseline: number | null;
}): SourceHealth {
  const { label, current, baseline } = input;
  const id = `label:${label}`;
  const base: Omit<SourceHealth, 'status' | 'reason'> = {
    id, label, kind: 'subsource', served: current, expected: baseline,
    lastSuccessAt: null, lastFailureAt: null, lastError: null,
  };
  const gated = GATED_SOURCES[id];
  if (gated) return { ...base, status: 'gated', reason: gated };
  if (baseline != null && baseline > 0 && current === 0) {
    return { ...base, status: 'down', reason: `Silent absence: the saved catalogue holds ${baseline} "${label}" cameras and the current catalogue holds none. This is the DriveBC failure shape — the parent region stays green while one feed inside it is gone.` };
  }
  if (baseline != null && baseline > 0 && current < baseline * 0.5) {
    return { ...base, status: 'degraded', reason: `Holding ${current} "${label}" cameras against a saved baseline of ${baseline}.` };
  }
  if (baseline == null && current === 0) {
    return { ...base, status: 'unknown', reason: 'Absent from the current catalogue and no saved baseline to compare against.' };
  }
  return { ...base, status: 'healthy', reason: `Holding ${current} cameras${baseline != null ? ` (saved baseline ${baseline})` : ''}.` };
}

/* ── Harvest per-camera verification staleness ───────────────────────── */

/** A harvest camera's verification age, in days, buckets at these edges. */
export const HARVEST_FRESH_DAYS = 7;
export const HARVEST_STALE_DAYS = 30;

export interface HarvestStaleness {
  total: number;
  /** Cameras whose feed URL has a recorded probe verdict. */
  withVerdict: number;
  aliveAtVerification: number;
  fresh: number;
  aging: number;
  stale: number;
  unknownAge: number;
  oldestProbedAt: string | null;
  newestProbedAt: string | null;
}

/**
 * Bucket per-camera probe timestamps (epoch seconds, one per camera, null
 * where no verdict was recorded) into verification-age bands. A generated
 * harvest is only as trustworthy as its last verification; this is the
 * number that says when a re-sync is due.
 */
export function harvestStaleness(
  probedAtEpochSec: readonly (number | null)[],
  alive: readonly boolean[],
  nowMs: number,
): HarvestStaleness {
  let fresh = 0, aging = 0, stale = 0, unknownAge = 0, aliveCount = 0;
  let oldest: number | null = null, newest: number | null = null;
  probedAtEpochSec.forEach((sec, i) => {
    if (alive[i]) aliveCount += 1;
    if (sec == null) { unknownAge += 1; return; }
    const ageDays = (nowMs - sec * 1000) / 86_400_000;
    if (ageDays <= HARVEST_FRESH_DAYS) fresh += 1;
    else if (ageDays <= HARVEST_STALE_DAYS) aging += 1;
    else stale += 1;
    if (oldest == null || sec < oldest) oldest = sec;
    if (newest == null || sec > newest) newest = sec;
  });
  return {
    total: probedAtEpochSec.length,
    withVerdict: probedAtEpochSec.length - unknownAge,
    aliveAtVerification: aliveCount,
    fresh, aging, stale, unknownAge,
    oldestProbedAt: oldest != null ? new Date(oldest * 1000).toISOString() : null,
    newestProbedAt: newest != null ? new Date(newest * 1000).toISOString() : null,
  };
}

/** Health of one static harvest shard, from its cameras' verification age. */
export function classifyHarvestShard(input: {
  shard: string;
  staleness: HarvestStaleness;
}): SourceHealth {
  const { shard, staleness } = input;
  const base: Omit<SourceHealth, 'status' | 'reason'> = {
    id: `occ:${shard}`, label: `OpenCCTV harvest — ${shard}`, kind: 'occ-shard',
    served: staleness.total, expected: null,
    lastSuccessAt: staleness.newestProbedAt, lastFailureAt: null, lastError: null,
  };
  if (staleness.total === 0) {
    return { ...base, status: 'unknown', reason: 'The shard is empty in the current generation.' };
  }
  const staleShare = staleness.stale / staleness.total;
  if (staleShare > 0.1) {
    return { ...base, status: 'degraded', reason: `${staleness.stale} of ${staleness.total} cameras were last probe-verified over ${HARVEST_STALE_DAYS} days ago — a sync is overdue.` };
  }
  if (staleness.aging + staleness.stale > 0) {
    return { ...base, status: 'healthy', reason: `${staleness.total} probe-verified cameras; verification ages: ${staleness.fresh} fresh (≤${HARVEST_FRESH_DAYS}d), ${staleness.aging} aging, ${staleness.stale} stale.` };
  }
  return { ...base, status: 'healthy', reason: `All ${staleness.total} cameras probe-verified within ${HARVEST_FRESH_DAYS} days.` };
}

export function rollup(sources: readonly SourceHealth[]): HealthRollup {
  const out: HealthRollup = { healthy: 0, degraded: 0, down: 0, unknown: 0, gated: 0, total: sources.length };
  for (const s of sources) out[s.status] += 1;
  return out;
}
