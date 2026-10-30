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
