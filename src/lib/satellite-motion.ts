import type { SatelliteRow } from './satellite-payload';

/**
 * OSIRIS — satellite motion between polls
 *
 * /api/satellites propagates every satellite twice: once for the body's
 * `timestamp` epoch (the row's lat/lng) and once for `timestamp_next`,
 * ten minutes later (lat2/lng2). This walks each marker along that vector
 * by wall clock, so the sky advances every few seconds instead of sitting
 * frozen between polls and jumping when a fresh body lands.
 *
 * The freeze this replaces was structural, not a missed refresh: positions
 * exist only as per-build snapshots, and what a polling client actually
 * receives is mediated by two caches — the route's own 120 s payload
 * cache per server instance and the CDN's s-maxage=120 /
 * stale-while-revalidate=300. Observed live over eight one-minute-apart
 * requests: the same epoch served three minutes apart, epochs arriving
 * out of order (06:17 followed by 06:13), the catalogue total flipping
 * between partial and full builds. A poll-only client can therefore sit
 * on one epoch for minutes at a time no matter how healthy its interval
 * is. Anchoring motion to the body's own absolute epochs makes the
 * display true to the clock regardless of which cached body arrived.
 *
 * A straight line is not SGP4, but over one span it does not need to be:
 * at globe scale the divergence is far below a marker's width. Past the
 * lookahead epoch the same vector is extrapolated, capped at
 * MAX_EXTRAPOLATION_SPANS spans — far beyond the two-minute poll cadence,
 * so the cap only bites when refreshes have stopped entirely, and a
 * slowly drifting marker still beats a frozen one.
 */
export const MAX_EXTRAPOLATION_SPANS = 3;

/** Longitudes wrap at the antimeridian; always walk the short way round. */
function lngDelta(from: number, to: number): number {
  let d = to - from;
  if (d > 180) d -= 360;
  else if (d < -180) d += 360;
  return d;
}

function normalizeLng(lng: number): number {
  return ((lng + 540) % 360) - 180;
}

/**
 * The catalogue as it should read at `nowMs`, given rows propagated for
 * [epochMs, nextEpochMs]. Rows without a lookahead pair (older bodies, a
 * failed lookahead propagation) pass through untouched, as does the whole
 * set when the epochs are unusable — and the input array itself is
 * returned whenever nothing can move, so callers can identity-check
 * whether a repaint is even needed. Input rows are never mutated.
 */
export function interpolateSatelliteRows(
  rows: SatelliteRow[],
  epochMs: number,
  nextEpochMs: number,
  nowMs: number,
): SatelliteRow[] {
  if (!rows.length) return rows;
  if (!Number.isFinite(epochMs) || !Number.isFinite(nextEpochMs) || !Number.isFinite(nowMs)) return rows;
  const span = nextEpochMs - epochMs;
  if (span <= 0) return rows;
  const frac = Math.min(Math.max((nowMs - epochMs) / span, 0), MAX_EXTRAPOLATION_SPANS);
  if (frac === 0) return rows;

  let moved = false;
  const out = rows.map((r) => {
    if (typeof r.lat2 !== 'number' || typeof r.lng2 !== 'number') return r;
    moved = true;
    return {
      ...r,
      lat: Math.min(90, Math.max(-90, r.lat + (r.lat2 - r.lat) * frac)),
      lng: normalizeLng(r.lng + lngDelta(r.lng, r.lng2) * frac),
    };
  });
  return moved ? out : rows;
}
