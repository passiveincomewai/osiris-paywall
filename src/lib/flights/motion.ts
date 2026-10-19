/**
 * OSIRIS — Flight motion: dead reckoning + snapshot blending.
 *
 * ADS-B snapshots arrive seconds-to-minutes apart (WorldEye's client polls
 * /api/flights; the server itself caches and re-snapshots on a budget).
 * Drawing each snapshot raw makes aircraft teleport between polls. The
 * reference implementation (God's Eye View, src/layers/flights/motion.js)
 * solves this by rendering one poll interval behind real time and
 * interpolating between the two bracketing fixes, dead-reckoning along a
 * fix's own velocity/track when no newer fix brackets the render time.
 *
 * These are the pure pieces of that pattern for WorldEye's flight records
 * ({ lat, lng, heading, speed_knots, alt, grounded, icao24, ... } as built
 * by classifyFlight in /api/flights). The map layer owns the clock; this
 * module owns the maths, so it is unit-testable without a map.
 */

export interface FlightLike {
  lat: number;
  lng: number;
  heading?: number | null;
  speed_knots?: number | null;
  alt?: number | null;
  grounded?: boolean;
  icao24?: string;
  [key: string]: unknown;
}

const EARTH_RADIUS_M = 6_371_000;
const KNOT_TO_MS = 0.514444;

/** Normalise a longitude to [-180, 180). */
export function wrapLng(lng: number): number {
  return ((((lng + 180) % 360) + 360) % 360) - 180;
}

/** Great-circle destination from a start point, bearing and distance. */
export function destinationPoint(
  lat: number,
  lng: number,
  bearingDeg: number,
  distanceM: number,
): { lat: number; lng: number } {
  const delta = distanceM / EARTH_RADIUS_M;
  const theta = (bearingDeg * Math.PI) / 180;
  const phi1 = (lat * Math.PI) / 180;
  const lambda1 = (lng * Math.PI) / 180;
  const sinPhi2 =
    Math.sin(phi1) * Math.cos(delta) + Math.cos(phi1) * Math.sin(delta) * Math.cos(theta);
  const phi2 = Math.asin(Math.max(-1, Math.min(1, sinPhi2)));
  const lambda2 =
    lambda1 +
    Math.atan2(
      Math.sin(theta) * Math.sin(delta) * Math.cos(phi1),
      Math.cos(delta) - Math.sin(phi1) * Math.sin(phi2),
    );
  return { lat: (phi2 * 180) / Math.PI, lng: wrapLng((lambda2 * 180) / Math.PI) };
}

/**
 * Advance one flight along its own track at its own ground speed by
 * `dtSeconds` — dead reckoning between snapshots. Grounded aircraft, and
 * aircraft with no usable speed/track, hold their reported position.
 * dt is clamped to [0, 300]s: beyond that a stale fix should be dropped by
 * the caller, not extrapolated across a continent.
 */
export function advanceFlight<T extends FlightLike>(flight: T, dtSeconds: number): T {
  const dt = Math.max(0, Math.min(300, dtSeconds));
  if (
    dt === 0 ||
    flight.grounded ||
    typeof flight.speed_knots !== 'number' ||
    !(flight.speed_knots > 0) ||
    typeof flight.heading !== 'number' ||
    !Number.isFinite(flight.lat) ||
    !Number.isFinite(flight.lng)
  ) {
    return flight;
  }
  const next = destinationPoint(
    flight.lat,
    flight.lng,
    flight.heading,
    flight.speed_knots * KNOT_TO_MS * dt,
  );
  return {
    ...flight,
    lat: Math.round(next.lat * 100000) / 100000,
    lng: Math.round(next.lng * 100000) / 100000,
  };
}

/** Advance a whole snapshot. Returns a new array; inputs are not mutated. */
export function advanceFlights<T extends FlightLike>(flights: T[], dtSeconds: number): T[] {
  return flights.map((f) => advanceFlight(f, dtSeconds));
}

/** Shortest-arc interpolation between two headings, in degrees. */
export function lerpAngleDeg(from: number, to: number, t: number): number {
  const delta = ((to - from + 540) % 360) - 180;
  return (((from + delta * t) % 360) + 360) % 360;
}

/**
 * Blend two snapshots of the same airspace: for aircraft present in both
 * (matched on icao24), interpolate position (shortest arc across the
 * antimeridian), heading (shortest angular arc) and altitude between the
 * fixes. Aircraft only in `next` pass through at their reported fix —
 * they have no earlier fix to blend from. Aircraft only in `prev` are
 * dropped: the newest snapshot defines the rendered set.
 *
 * Render pattern (GEV): keep the last two snapshots; render at
 * wall-clock minus one poll interval, alpha = elapsed/interval, so markers
 * move continuously and never extrapolate past a known fix.
 */
export function blendSnapshots<T extends FlightLike>(prev: T[], next: T[], alpha: number): T[] {
  const t = Math.max(0, Math.min(1, alpha));
  if (t === 0) return [...next];
  const prevByHex = new Map<string, T>();
  for (const f of prev || []) {
    if (f.icao24) prevByHex.set(f.icao24, f);
  }
  return (next || []).map((f) => {
    const p = f.icao24 ? prevByHex.get(f.icao24) : undefined;
    if (!p) return f;
    // Shortest arc across the antimeridian: a fix pair at +179.9 / -179.9 is
    // 0.2° apart, not 359.8°.
    const lngDelta = ((f.lng - p.lng + 540) % 360) - 180;
    return {
      ...f,
      lat: p.lat + (f.lat - p.lat) * t,
      lng: wrapLng(p.lng + lngDelta * t),
      heading:
        typeof p.heading === 'number' && typeof f.heading === 'number'
          ? lerpAngleDeg(p.heading, f.heading, t)
          : f.heading,
      alt:
        typeof p.alt === 'number' && typeof f.alt === 'number'
          ? Math.round(p.alt + (f.alt - p.alt) * t)
          : f.alt,
    };
  });
}
