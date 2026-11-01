import type { SatelliteRow } from './satellite-payload';

/**
 * OSIRIS — satellite motion between polls
 *
 * /api/satellites propagates every satellite at three epochs: the body's
 * `timestamp` (the row's lat/lng), the span's midpoint (latM/lngM), and
 * `timestamp_next`, ten minutes later (lat2/lng2, with the altitude there
 * in alt2). This walks each marker along those points by wall clock, so
 * the sky advances continuously instead of jumping whenever a fresh body
 * happens to land — or freezing when a poll is handed a cached body,
 * which the route's 120 s cache and the CDN's SWR window make the common
 * case. Anchoring motion to the body's own absolute epochs makes the
 * display true to the clock regardless of which cached body arrived.
 *
 * Why three points, not two: a straight chord between the endpoints is
 * not the orbit. An inclined LEO satellite's latitude is sinusoidal, so
 * over a ten-minute span the chord cuts the corner by up to ~3°
 * (ISS-class inclination) mid-span, runs at uniform speed where the real
 * ground track does not, and — in the original two-point payload, which
 * dropped the lookahead altitude — held altitude frozen while the real
 * orbit breathed. That is what read as "not real time, not realistic"
 * (owner, 2026-10-31). The quadratic Bézier through the three SGP4
 * points (see arcPoint) tracks the true arc to ~0.1–0.3° over the span
 * and carries the orbit's speed profile; altitude interpolates across
 * the span on the same fraction.
 *
 * Rows without the midpoint set (bodies built before the arc fix, a
 * failed midpoint propagation) keep the original chord walk between the
 * two endpoints, byte for byte.
 *
 * Past the lookahead epoch the walk extrapolates — along the arc's end
 * tangent when a midpoint exists (the whole-span chord direction is
 * stale by up to half the span's turn), along the chord otherwise —
 * capped at MAX_EXTRAPOLATION_SPANS spans. That cap is far beyond the
 * two-minute poll cadence, so it only bites when refreshes have stopped
 * entirely, and a slowly drifting marker still beats a frozen one.
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
 * Quadratic Bézier through three points sampled at t = 0, 0.5, 1: the
 * parabola's control point is c = 2·pm − (p0 + p1)/2, and evaluating
 * (1−t)²·p0 + 2(1−t)t·c + t²·p1 passes through all three samples.
 * Longitudes are evaluated in unwrapped delta space by the caller, so
 * the antimeridian never splits an arc.
 */
function arcPoint(p0: number, pm: number, p1: number, t: number): number {
  const c = 2 * pm - (p0 + p1) / 2;
  const u = 1 - t;
  return u * u * p0 + 2 * u * t * c + t * t * p1;
}

/**
 * The catalogue as it should read at `nowMs`, given rows propagated for
 * [epochMs, nextEpochMs]. Rows without a lookahead pair (older bodies, a
 * failed lookahead propagation) pass through untouched, as does the
 * whole set when the epochs are unusable — and the input array itself is
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
    const dLat = r.lat2 - r.lat;
    const dLng = lngDelta(r.lng, r.lng2);
    const hasArc =
      typeof r.latM === 'number' && typeof r.lngM === 'number' && typeof r.alt2 === 'number';

    if (frac <= 1) {
      if (!hasArc) {
        return {
          ...r,
          lat: Math.min(90, Math.max(-90, r.lat + dLat * frac)),
          lng: normalizeLng(r.lng + dLng * frac),
        };
      }
      const dLngM = lngDelta(r.lng, r.lngM!);
      return {
        ...r,
        lat: Math.min(90, Math.max(-90, arcPoint(r.lat, r.latM!, r.lat2, frac))),
        lng: normalizeLng(r.lng + arcPoint(0, dLngM, dLng, frac)),
        alt: r.alt + (r.alt2! - r.alt) * frac,
      };
    }

    // Extrapolation past the lookahead epoch, from the exact endpoint.
    // Tangent (per unit frac) at t = 1 of the arc through (p0, pm, p1)
    // is 2·(p1 − c) = p0 + 3·p1 − 4·pm; in delta space for longitude.
    const past = frac - 1;
    const tanLat = hasArc ? r.lat + 3 * r.lat2 - 4 * r.latM! : dLat;
    const tanLng = hasArc ? 3 * dLng - 4 * lngDelta(r.lng, r.lngM!) : dLng;
    return {
      ...r,
      lat: Math.min(90, Math.max(-90, r.lat2 + tanLat * past)),
      lng: normalizeLng(r.lng2 + tanLng * past),
      ...(hasArc ? { alt: r.alt2! } : {}),
    };
  });
  return moved ? out : rows;
}
