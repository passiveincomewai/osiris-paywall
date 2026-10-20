/**
 * OSIRIS — Premium flight path: planned route + session flown trail.
 *
 * When a Pro user follows an aircraft, the globe draws the flight's WHOLE
 * path, as two honestly-distinguished lines:
 *
 *   ROUTE — PLANNED   the great-circle arc between the origin and
 *                     destination airports the flight is scheduled
 *                     between (from /api/flight-route, which resolves
 *                     the callsign against adsbdb/hexdb/airplanes.live).
 *                     It is the plan, not the path flown — the label
 *                     says so, the line is dashed, and when no route
 *                     resolves, NO line is drawn and the HUD says the
 *                     route is unavailable rather than inventing one.
 *
 *   FLOWN — LIVE TRACK  the aircraft's own reported positions since the
 *                     follow began, sampled from the raw /api/flights
 *                     snapshots (never the interpolated render output),
 *                     so every vertex is a position the feed actually
 *                     reported during this session.
 *
 * The gate mirrors the app's own premium check (the globe's isPremiumUser
 * and lib/timelapse's timelapseAccess): the session JWT carries
 * subscriptionStatus, and "active" there already counts a live trial as
 * full Pro access (see resolveSubscriptionStatus in src/auth.ts). Follow
 * itself stays free — only this path display is premium.
 *
 * Team Access (Workstream H): subscriptionStatus stays the member's
 * OWN billing status, so a team member whose access comes from their
 * organization's owner reads not-active there; the session's planTier
 * is the EFFECTIVE tier (own or org-granted, resolved in the jwt in
 * src/auth.ts), so the gate also passes when that tier satisfies "pro"
 * via lib/plan-tier. Legacy sessions without planTier fall back to the
 * status check alone (planTierOf's own fallback), exactly as before.
 * Fail-soft: any error reading the tier falls back to the status-only
 * result — it never throws the gate open or closed.
 *
 * This module is the pure core: route parsing, trail accumulation, the
 * progress projection and the GeoJSON assembly are unit-testable without
 * a map; OsirisMap owns the fetch, the layers and the HUD wiring.
 */

import { planTierOf, tierSatisfies } from '../plan-tier';

/** The planned-route line's permanent label. */
export const FLIGHT_PATH_ROUTE_LABEL = 'ROUTE — PLANNED';
/** The session trail's permanent label. */
export const FLIGHT_PATH_FLOWN_LABEL = 'FLOWN — LIVE TRACK';
/** Shown when no scheduled route resolves for the followed flight. */
export const FLIGHT_PATH_ROUTE_UNAVAILABLE =
  'SCHEDULED ROUTE UNAVAILABLE — SHOWING LIVE TRACK ONLY';
/** The lock label free users see in place of the path. */
export const FLIGHT_PATH_LOCK_LABEL = 'FLIGHT PATH — PRO';

// ── Gate ──────────────────────────────────────────────────────────────

/** Who may see the flight path, from the caller's session. */
export type FlightPathAccess = 'unknown' | 'pro' | 'free' | 'signed-out';

/**
 * The gate, mirroring timelapseAccess() and the globe's own premium
 * check: the session JWT carries subscriptionStatus, and "active" there
 * already counts a live trial as full Pro access. Team-granted members
 * (own status not active) pass on the session's effective planTier.
 */
export function flightPathAccess(session: unknown): FlightPathAccess {
  if (!session || typeof session !== 'object') return 'unknown';
  const user = (session as { user?: unknown }).user;
  if (!user || typeof user !== 'object') return 'signed-out';
  // Own billing status first (unchanged for own subscribers), then the
  // effective tier the jwt now carries for team-granted members.
  if ((user as { subscriptionStatus?: unknown }).subscriptionStatus === 'active') return 'pro';
  try {
    return tierSatisfies(
      planTierOf(session as { user?: { planTier?: unknown; subscriptionStatus?: unknown } }),
      'pro',
    )
      ? 'pro'
      : 'free';
  } catch {
    return 'free';
  }
}

// ── Route (planned) ───────────────────────────────────────────────────

export interface PathAirport {
  iata: string;
  icao: string;
  city: string;
  lat: number;
  lng: number;
}

/** A resolved scheduled route, as drawn: endpoints + great-circle arc. */
export interface FlightRouteData {
  origin: PathAirport;
  destination: PathAirport;
  /** Great-circle arc, [lng, lat] pairs from origin to destination. */
  arc: [number, number][];
  totalDistanceKm: number;
}

function validLatLng(lat: unknown, lng: unknown): boolean {
  return (
    typeof lat === 'number' && Number.isFinite(lat) && lat >= -90 && lat <= 90 &&
    typeof lng === 'number' && Number.isFinite(lng) && lng >= -180 && lng <= 180
  );
}

function parseAirport(raw: unknown): PathAirport | null {
  if (!raw || typeof raw !== 'object') return null;
  const a = raw as Record<string, unknown>;
  if (!validLatLng(a.lat, a.lng)) return null;
  return {
    iata: typeof a.iata === 'string' ? a.iata : '',
    icao: typeof a.icao === 'string' ? a.icao : '',
    city: typeof a.city === 'string' ? a.city : '',
    lat: a.lat as number,
    lng: a.lng as number,
  };
}

/**
 * Validate a /api/flight-route response into drawable route data, or
 * null when the flight has no resolvable scheduled route. Null is the
 * honest outcome — the caller draws the flown trail only and says so.
 */
export function parseFlightRouteResponse(json: unknown): FlightRouteData | null {
  if (!json || typeof json !== 'object') return null;
  const d = json as Record<string, unknown>;
  if (d.found !== true) return null;
  const origin = parseAirport(d.origin);
  const destination = parseAirport(d.destination);
  if (!origin || !destination) return null;
  const arcRaw = Array.isArray(d.arc) ? d.arc : [];
  const arc: [number, number][] = [];
  for (const pt of arcRaw) {
    if (Array.isArray(pt) && validLatLng(pt[1], pt[0])) arc.push([pt[0], pt[1]]);
  }
  // Without a usable arc, fall back to the two endpoints — the projection
  // math degrades to endpoint distances rather than no route at all.
  const usableArc: [number, number][] = arc.length >= 2
    ? arc
    : [[origin.lng, origin.lat], [destination.lng, destination.lat]];
  const totalDistanceKm = typeof d.totalDistanceKm === 'number' && d.totalDistanceKm > 0
    ? d.totalDistanceKm
    : haversineKm(origin.lat, origin.lng, destination.lat, destination.lng);
  return { origin, destination, arc: usableArc, totalDistanceKm };
}

/** The short code a map label shows for an airport: IATA, else ICAO. */
export function airportCode(a: PathAirport): string {
  return a.iata || a.icao || '';
}

// ── Distance math ─────────────────────────────────────────────────────

const EARTH_RADIUS_KM = 6371;

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export interface RouteProgress {
  /** 0 at the origin, 1 at the destination. */
  fraction: number;
  /** The point on the route arc nearest the aircraft's position. */
  point: [number, number];
  /** Distance along the route to that point, km. */
  alongKm: number;
  /** Route distance still ahead of that point, km. */
  remainingKm: number;
  /** Whole route length, km (sum of the arc's segments). */
  totalKm: number;
}

/**
 * Project a position onto the route arc: the nearest point on the
 * polyline, and how far along the route it sits. All distances are real
 * haversine sums over the arc's segments — nothing is estimated from
 * time or assumed from the schedule.
 */
export function routeProgress(
  route: FlightRouteData,
  lng: number,
  lat: number,
): RouteProgress | null {
  if (!validLatLng(lat, lng) || route.arc.length < 2) return null;
  const arc = route.arc;
  const segLens: number[] = [];
  let totalKm = 0;
  for (let i = 0; i < arc.length - 1; i++) {
    const len = haversineKm(arc[i][1], arc[i][0], arc[i + 1][1], arc[i + 1][0]);
    segLens.push(len);
    totalKm += len;
  }
  if (totalKm <= 0) return null;

  // Local tangent-plane projection per segment (equirectangular around
  // the segment), clamped to the segment, scored by true haversine
  // distance from the aircraft to the projected point.
  let best: { distKm: number; alongKm: number; point: [number, number] } | null = null;
  let cumKm = 0;
  for (let i = 0; i < arc.length - 1; i++) {
    const [x1, y1] = arc[i];
    const [x2, y2] = arc[i + 1];
    const meanLatRad = (((y1 + y2) / 2) * Math.PI) / 180;
    const kx = EARTH_RADIUS_KM * Math.cos(meanLatRad) * (Math.PI / 180); // km per lng degree
    const ky = EARTH_RADIUS_KM * (Math.PI / 180); // km per lat degree
    const ax = (lng - x1) * kx;
    const ay = (lat - y1) * ky;
    const bx = (x2 - x1) * kx;
    const by = (y2 - y1) * ky;
    const denom = bx * bx + by * by;
    const t = denom > 0 ? Math.max(0, Math.min(1, (ax * bx + ay * by) / denom)) : 0;
    const px = x1 + (x2 - x1) * t;
    const py = y1 + (y2 - y1) * t;
    const distKm = haversineKm(lat, lng, py, px);
    if (!best || distKm < best.distKm) {
      best = { distKm, alongKm: cumKm + segLens[i] * t, point: [px, py] };
    }
    cumKm += segLens[i];
  }
  if (!best) return null;
  return {
    fraction: Math.max(0, Math.min(1, best.alongKm / totalKm)),
    point: best.point,
    alongKm: best.alongKm,
    remainingKm: Math.max(0, totalKm - best.alongKm),
    totalKm,
  };
}

// ── Flown trail (this session's reported fixes) ───────────────────────

/**
 * Polls land every ~30 s; a 6-hour follow is 720 fixes. Past the cap the
 * oldest fixes drop — the trail is a session artifact, not a recording.
 */
export const TRAIL_MAX_POINTS = 720;
/** Fixes closer than this to the last kept point are the same report
 *  re-delivered (server cache) or ground jitter — never stored twice. */
export const TRAIL_MIN_STEP_M = 30;
/** A jump implying faster than this is a feed glitch or a re-acquired
 *  target, not motion: the trail restarts at the new position instead of
 *  drawing a line across the map. */
export const TRAIL_MAX_PLAUSIBLE_KMH = 1800;

export interface TrailPoint {
  lng: number;
  lat: number;
  /** When the feed generated the fix (the snapshot's own timestamp). */
  at: number;
}

/**
 * Append one reported fix to the trail. Returns the SAME array when the
 * fix adds nothing (duplicate / too close / invalid), so callers can
 * cheaply detect "no change"; a new array otherwise.
 */
export function pushTrailPoint(
  trail: TrailPoint[],
  fix: { lat: unknown; lng: unknown },
  at: number,
): TrailPoint[] {
  if (!validLatLng(fix?.lat, fix?.lng)) return trail;
  const lat = fix.lat as number;
  const lng = fix.lng as number;
  const last = trail[trail.length - 1];
  if (last) {
    const stepKm = haversineKm(last.lat, last.lng, lat, lng);
    if (stepKm * 1000 < TRAIL_MIN_STEP_M) return trail;
    const dtH = (at - last.at) / 3_600_000;
    if (dtH > 0 && stepKm / dtH > TRAIL_MAX_PLAUSIBLE_KMH) {
      return [{ lng, lat, at }];
    }
  }
  const next = [...trail, { lng, lat, at }];
  return next.length > TRAIL_MAX_POINTS
    ? next.slice(next.length - TRAIL_MAX_POINTS)
    : next;
}

// ── Path state ────────────────────────────────────────────────────────

export type FlightPathRouteStatus = 'idle' | 'loading' | 'found' | 'unavailable';

export interface FlightPathState {
  icao24: string;
  callsign: string;
  routeStatus: FlightPathRouteStatus;
  route: FlightRouteData | null;
  trail: TrailPoint[];
}

export function createFlightPath(icao24: string, callsign: string): FlightPathState {
  return { icao24, callsign, routeStatus: 'idle', route: null, trail: [] };
}

/** idle → loading. Any other status means a fetch is done or in flight. */
export function beginRouteFetch(state: FlightPathState): FlightPathState {
  if (state.routeStatus !== 'idle') return state;
  return { ...state, routeStatus: 'loading' };
}

/** Settle the fetch: a parsed route, or null for an honest unavailable. */
export function resolveFlightPathRoute(
  state: FlightPathState,
  route: FlightRouteData | null,
): FlightPathState {
  return route
    ? { ...state, routeStatus: 'found', route }
    : { ...state, routeStatus: 'unavailable', route: null };
}

/** Record a reported fix. Returns the same state when nothing changed. */
export function noteFlightPathFix(
  state: FlightPathState,
  fix: { lat: unknown; lng: unknown },
  at: number,
): FlightPathState {
  const trail = pushTrailPoint(state.trail, fix, at);
  return trail === state.trail ? state : { ...state, trail };
}

// ── GeoJSON assembly ──────────────────────────────────────────────────

/**
 * Walk a coordinate list adjusting each longitude by ±360 so consecutive
 * points never jump more than 180° — a line crossing the antimeridian
 * (a transpacific great circle, say) then draws the short way instead of
 * streaking across every world copy.
 */
export function unwrapLngPath(coords: [number, number][]): [number, number][] {
  if (coords.length < 2) return coords.map((c) => [...c] as [number, number]);
  const out: [number, number][] = [[coords[0][0], coords[0][1]]];
  for (let i = 1; i < coords.length; i++) {
    let lng = coords[i][0];
    const prev = out[i - 1][0];
    while (lng - prev > 180) lng -= 360;
    while (lng - prev < -180) lng += 360;
    out.push([lng, coords[i][1]]);
  }
  return out;
}

export type FlightPathFeature = {
  type: 'Feature';
  properties: Record<string, unknown>;
  geometry:
    | { type: 'LineString'; coordinates: [number, number][] }
    | { type: 'Point'; coordinates: [number, number] };
};

/**
 * Everything the map draws for the path, as one feature list for a single
 * GeoJSON source. `current` is the aircraft's latest position (for the
 * on-route progress marker); pass null before the first fix.
 */
export function flightPathFeatures(
  state: FlightPathState,
  current: { lng: number; lat: number } | null,
): FlightPathFeature[] {
  const features: FlightPathFeature[] = [];
  const { route } = state;
  if (state.routeStatus === 'found' && route) {
    features.push({
      type: 'Feature',
      properties: { kind: 'route', label: FLIGHT_PATH_ROUTE_LABEL },
      geometry: { type: 'LineString', coordinates: unwrapLngPath(route.arc) },
    });
  }
  if (state.trail.length >= 2) {
    features.push({
      type: 'Feature',
      properties: { kind: 'flown', label: FLIGHT_PATH_FLOWN_LABEL },
      geometry: {
        type: 'LineString',
        coordinates: unwrapLngPath(state.trail.map((p) => [p.lng, p.lat] as [number, number])),
      },
    });
  }
  if (state.routeStatus === 'found' && route) {
    for (const [kind, ap] of [['origin', route.origin], ['destination', route.destination]] as const) {
      features.push({
        type: 'Feature',
        properties: { kind, label: airportCode(ap), city: ap.city },
        geometry: { type: 'Point', coordinates: [ap.lng, ap.lat] },
      });
    }
    if (current && validLatLng(current.lat, current.lng)) {
      const prog = routeProgress(route, current.lng, current.lat);
      if (prog) {
        features.push({
          type: 'Feature',
          properties: { kind: 'progress', pct: Math.round(prog.fraction * 100) },
          geometry: { type: 'Point', coordinates: prog.point },
        });
      }
    }
  }
  return features;
}

// ── HUD data ──────────────────────────────────────────────────────────

export interface FlightPathHudData {
  access: FlightPathAccess;
  routeStatus: FlightPathRouteStatus;
  originCode: string | null;
  destinationCode: string | null;
  /** Real-math progress along the planned route, 0–100; null when there
   *  is no route or no position to project yet. */
  progressPct: number | null;
  /** Reported fixes recorded since this follow began. */
  trailPoints: number;
}

export function flightPathHudData(
  state: FlightPathState | null,
  access: FlightPathAccess,
  current: { lng: number; lat: number } | null,
): FlightPathHudData {
  if (!state) {
    return {
      access, routeStatus: 'idle',
      originCode: null, destinationCode: null,
      progressPct: null, trailPoints: 0,
    };
  }
  let progressPct: number | null = null;
  if (state.routeStatus === 'found' && state.route && current && validLatLng(current.lat, current.lng)) {
    const prog = routeProgress(state.route, current.lng, current.lat);
    if (prog) progressPct = Math.round(prog.fraction * 100);
  }
  return {
    access,
    routeStatus: state.routeStatus,
    originCode: state.route ? airportCode(state.route.origin) : null,
    destinationCode: state.route ? airportCode(state.route.destination) : null,
    progressPct,
    trailPoints: state.trail.length,
  };
}
