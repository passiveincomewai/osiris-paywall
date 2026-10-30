/**
 * OSIRIS — "get to this route" maths for the transit pages' stop
 * planner (owner feature, 2026-10-29): given a geocoded starting
 * address, find the nearest stop ON THIS ROUTE from the route's own
 * GTFS stop lists, and slice the ride geometry — the direction's
 * shape from that stop through to its terminus — so the corridor
 * camera search can run over the whole trip the visitor is about
 * to make (the walk, then the ride).
 *
 * Pure and pinned by test: the planner component wires these to
 * the site's existing services (/api/geosearch for the address,
 * /api/directions for the walking route, /api/cctv/route-cameras
 * for the corridor) and invents nothing of its own. Every stop and
 * every shape vertex comes from the agency's published GTFS.
 *
 * The destination side lives here too: given where the visitor is
 * going, alightingStop names the stop to GET OFF at — the nearest
 * stop to the destination that the ride actually passes AFTER the
 * boarding stop — and rideLineBetween slices the ride to end
 * there instead of at the terminus.
 */

export interface PlannerStop {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export interface PlannerDirection {
  dir: number;
  headsign: string;
  /** Stops in travel order for this direction. */
  stops: PlannerStop[];
  /**
   * [lng, lat] polyline for this direction — the GTFS shape on the
   * route pages; the ordered stop-to-stop line on the agency hub,
   * whose route API carries stops but no shape.
   */
  line: [number, number][];
}

export interface LatLng {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_M = 6_371_000;
const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance in metres between two lat/lng points. */
export function haversineM(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(s)));
}

/**
 * Every stop the route serves, deduped by id (a stop served by
 * both directions appears once), in first-served order.
 */
export function routeStops(directions: readonly PlannerDirection[]): PlannerStop[] {
  const byId = new Map<string, PlannerStop>();
  for (const d of directions) {
    for (const s of d.stops) {
      if (!byId.has(s.id)) byId.set(s.id, s);
    }
  }
  return [...byId.values()];
}

/**
 * The stop nearest a point, with its straight-line distance.
 * Null when the route publishes no stop coordinates — the planner
 * must say so rather than guess.
 */
export function nearestStop(
  stops: readonly PlannerStop[],
  at: LatLng,
): { stop: PlannerStop; distanceM: number } | null {
  let best: PlannerStop | null = null;
  let bestM = Number.POSITIVE_INFINITY;
  for (const s of stops) {
    if (!Number.isFinite(s.lat) || !Number.isFinite(s.lng)) continue;
    const m = haversineM(at, s);
    if (m < bestM) {
      bestM = m;
      best = s;
    }
  }
  return best ? { stop: best, distanceM: bestM } : null;
}

/** Indexes of the directions whose stop list contains the stop. */
export function directionsServing(
  directions: readonly PlannerDirection[],
  stopId: string,
): number[] {
  const out: number[] = [];
  directions.forEach((d, i) => {
    if (d.stops.some((s) => s.id === stopId)) out.push(i);
  });
  return out;
}

/**
 * The ride line from a stop to the end of a direction's shape: the
 * polyline from the shape vertex nearest the stop through the
 * final vertex, with the stop itself prepended so the geometry is
 * continuous from the stop. A shape with fewer than two points, or
 * a stop nearest the terminus itself, yields just the stop point —
 * the corridor search then honestly covers the walk alone.
 */
export function rideLineFrom(
  line: readonly [number, number][],
  stop: LatLng,
): [number, number][] {
  const stopPt: [number, number] = [stop.lng, stop.lat];
  if (line.length < 2) return [stopPt];
  let nearest = 0;
  let bestM = Number.POSITIVE_INFINITY;
  line.forEach(([lng, lat], i) => {
    const m = haversineM(stop, { lat, lng });
    if (m < bestM) {
      bestM = m;
      nearest = i;
    }
  });
  const rest = line.slice(nearest);
  const first = rest[0];
  if (first && first[0] === stopPt[0] && first[1] === stopPt[1]) return [...rest];
  return [stopPt, ...rest];
}

export interface AlightingHit {
  stop: PlannerStop;
  /** Straight-line distance from the destination to the stop. */
  distanceM: number;
  /** Stops ridden from the boarding stop to this one (1 = next stop). */
  stopsRidden: number;
}

/**
 * Indexes of the directions that can carry a single ride from the
 * boarding stop to the alighting stop: both stops on the list, the
 * alighting stop strictly after the boarding stop in travel order.
 * Empty when no direction orders the pair that way — the route
 * cannot make that trip in one ride, and the planner must say so.
 */
export function directionsServingJourney(
  directions: readonly PlannerDirection[],
  boardStopId: string,
  alightStopId: string,
): number[] {
  const out: number[] = [];
  directions.forEach((d, i) => {
    const b = d.stops.findIndex((s) => s.id === boardStopId);
    const a = d.stops.findIndex((s) => s.id === alightStopId);
    if (b >= 0 && a > b) out.push(i);
  });
  return out;
}

/**
 * The stop to get OFF at for a destination: the stop nearest the
 * destination among the stops that come AFTER the boarding stop in
 * this direction's travel order — the ride has to actually pass it
 * after you board. Null when the boarding stop isn't on this
 * direction, or when no later stop exists (the destination is
 * reachable only by riding the other way, or the boarding stop is
 * the terminus).
 */
export function alightingStop(
  direction: PlannerDirection,
  boardStopId: string,
  at: LatLng,
): AlightingHit | null {
  const boardIdx = direction.stops.findIndex((s) => s.id === boardStopId);
  if (boardIdx < 0) return null;
  let best: AlightingHit | null = null;
  for (let i = boardIdx + 1; i < direction.stops.length; i++) {
    const s = direction.stops[i];
    if (!Number.isFinite(s.lat) || !Number.isFinite(s.lng)) continue;
    const m = haversineM(at, s);
    if (!best || m < best.distanceM) {
      best = { stop: s, distanceM: m, stopsRidden: i - boardIdx };
    }
  }
  return best;
}

/**
 * The ride line between two stops on one direction's polyline:
 * the shape vertices from the boarding stop's nearest vertex
 * through the alighting stop's nearest vertex, bracketed by the
 * stops themselves so the geometry is continuous stop to stop.
 * When the shape's vertices don't order the same way the stops do
 * (sparse or noisy shape data), the honest fallback is the
 * straight stop-to-stop segment — never a line that runs
 * backwards along the route.
 */
export function rideLineBetween(
  line: readonly [number, number][],
  fromStop: LatLng,
  toStop: LatLng,
): [number, number][] {
  const fromPt: [number, number] = [fromStop.lng, fromStop.lat];
  const toPt: [number, number] = [toStop.lng, toStop.lat];
  if (fromPt[0] === toPt[0] && fromPt[1] === toPt[1]) return [fromPt];
  if (line.length < 2) return [fromPt, toPt];
  const nearestIdx = (stop: LatLng) => {
    let idx = 0;
    let bestM = Number.POSITIVE_INFINITY;
    line.forEach(([lng, lat], i) => {
      const m = haversineM(stop, { lat, lng });
      if (m < bestM) {
        bestM = m;
        idx = i;
      }
    });
    return idx;
  };
  const a = nearestIdx(fromStop);
  const b = nearestIdx(toStop);
  if (b < a) return [fromPt, toPt];
  const out: [number, number][] = [];
  const push = (p: [number, number]) => {
    const last = out[out.length - 1];
    if (last && last[0] === p[0] && last[1] === p[1]) return;
    out.push(p);
  };
  push(fromPt);
  for (const [lng, lat] of line.slice(a, b + 1)) push([lng, lat]);
  push(toPt);
  return out;
}

/**
 * Walk + ride joined into the single geometry the corridor camera
 * search consumes. The joint point (walk end = ride start = the
 * stop) is never duplicated; either side may be empty.
 */
export function journeyGeometry(
  walk: readonly [number, number][],
  ride: readonly [number, number][],
): [number, number][] {
  const out: [number, number][] = walk.map(([lng, lat]) => [lng, lat] as [number, number]);
  for (const [lng, lat] of ride) {
    const last = out[out.length - 1];
    if (last && Math.abs(last[0] - lng) < 1e-9 && Math.abs(last[1] - lat) < 1e-9) continue;
    out.push([lng, lat]);
  }
  return out;
}
