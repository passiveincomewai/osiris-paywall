/**
 * Powder Pass — saved ski drive-up routes (browser-local store).
 *
 * There is no server-side saved-route store: routes the driver plans
 * with the resort-page route tool (SkiRouteTool) are saved in THIS
 * browser under one shared localStorage key, and the drive-up brief
 * (/ski-webcams/my/brief) reads the same key in the same browser.
 * Nothing here touches the network or the DB — a route saved on one
 * device simply does not exist on another, and the brief page says so.
 *
 * The module is pure data + validation so the parse/upsert rules are
 * unit-testable without a DOM; the two tiny localStorage wrappers are
 * the only impure part and fail soft (private mode / blocked storage
 * reads as "no saved routes", never a throw).
 */

export const SAVED_ROUTES_KEY = "we_ski_saved_routes_v1";

/** At most this many saved routes are kept (newest first). */
export const MAX_SAVED_ROUTES = 10;

/** Route geometry is downsampled to at most this many [lng, lat]
 *  points before storage — plenty for the corridor camera / POI
 *  lookups (both APIs re-measure along the polyline), and small
 *  enough that ten routes stay far under the localStorage quota. */
export const MAX_STORED_ROUTE_POINTS = 400;

export interface SavedRoutePlace {
  label: string;
  lat: number;
  lng: number;
}

export interface SavedSkiRoute {
  /** `${resortSlug}|${start.lat},${start.lng}|${dest.lat},${dest.lng}` */
  id: string;
  resortSlug: string;
  /** Country catalogue chunk the destination resort's cameras live in. */
  countrySlug: string;
  start: SavedRoutePlace;
  dest: SavedRoutePlace;
  /** Downsampled driving geometry as [lng, lat] pairs. */
  route: [number, number][];
  distanceKm: number;
  durationMin: number;
  /** ISO timestamp of when the driver saved the route. */
  savedAt: string;
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function parsePlace(v: unknown): SavedRoutePlace | null {
  if (typeof v !== "object" || v === null) return null;
  const p = v as Record<string, unknown>;
  if (
    typeof p.label !== "string" ||
    p.label.length === 0 ||
    !isFiniteNumber(p.lat) ||
    !isFiniteNumber(p.lng) ||
    p.lat < -90 ||
    p.lat > 90 ||
    p.lng < -180 ||
    p.lng > 180
  ) {
    return null;
  }
  return { label: p.label, lat: p.lat, lng: p.lng };
}

function isRoutePoint(p: unknown): p is [number, number] {
  return (
    Array.isArray(p) &&
    p.length === 2 &&
    isFiniteNumber(p[0]) &&
    isFiniteNumber(p[1]) &&
    p[1] >= -90 &&
    p[1] <= 90 &&
    p[0] >= -180 &&
    p[0] <= 180
  );
}

/** Validate one untrusted record; null = not a usable saved route. */
export function parseSavedRoute(v: unknown): SavedSkiRoute | null {
  if (typeof v !== "object" || v === null) return null;
  const r = v as Record<string, unknown>;
  const start = parsePlace(r.start);
  const dest = parsePlace(r.dest);
  if (
    typeof r.id !== "string" ||
    r.id.length === 0 ||
    typeof r.resortSlug !== "string" ||
    r.resortSlug.length === 0 ||
    typeof r.countrySlug !== "string" ||
    r.countrySlug.length === 0 ||
    !start ||
    !dest ||
    !Array.isArray(r.route) ||
    r.route.length < 2 ||
    !r.route.every(isRoutePoint) ||
    !isFiniteNumber(r.distanceKm) ||
    r.distanceKm < 0 ||
    !isFiniteNumber(r.durationMin) ||
    r.durationMin < 0 ||
    typeof r.savedAt !== "string" ||
    r.savedAt.length === 0
  ) {
    return null;
  }
  return {
    id: r.id,
    resortSlug: r.resortSlug,
    countrySlug: r.countrySlug,
    start,
    dest,
    route: r.route as [number, number][],
    distanceKm: r.distanceKm,
    durationMin: r.durationMin,
    savedAt: r.savedAt,
  };
}

/**
 * Parse the raw localStorage value into valid saved routes. Anything
 * malformed (old shapes, hand-edited storage, a non-array) degrades to
 * the valid subset or an empty list — never a throw, never an invented
 * route. Newest first, capped at MAX_SAVED_ROUTES, deduped by id.
 */
export function parseSavedRoutes(raw: unknown): SavedSkiRoute[] {
  let value: unknown = raw;
  if (typeof raw === "string") {
    try {
      value = JSON.parse(raw) as unknown;
    } catch {
      return [];
    }
  }
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const out: SavedSkiRoute[] = [];
  for (const item of value) {
    const route = parseSavedRoute(item);
    if (!route || seen.has(route.id)) continue;
    seen.add(route.id);
    out.push(route);
  }
  out.sort((a, b) => (a.savedAt < b.savedAt ? 1 : a.savedAt > b.savedAt ? -1 : 0));
  return out.slice(0, MAX_SAVED_ROUTES);
}

/** Stable identity for a route: same resort + same endpoints = same route. */
export function savedRouteId(
  resortSlug: string,
  start: { lat: number; lng: number },
  dest: { lat: number; lng: number },
): string {
  const f = (n: number) => n.toFixed(5);
  return `${resortSlug}|${f(start.lat)},${f(start.lng)}|${f(dest.lat)},${f(dest.lng)}`;
}

/** Evenly thin a route polyline to at most `max` points, keeping the
 *  first and last points exactly. Short routes pass through unchanged. */
export function downsampleRoute(
  route: readonly [number, number][],
  max: number = MAX_STORED_ROUTE_POINTS,
): [number, number][] {
  if (route.length <= max) return route.map((p) => [p[0], p[1]] as [number, number]);
  const out: [number, number][] = [];
  const step = (route.length - 1) / (max - 1);
  for (let i = 0; i < max; i++) {
    const p = route[Math.round(i * step)];
    out.push([p[0], p[1]]);
  }
  return out;
}

/** Insert or refresh a saved route (same id replaces), newest first. */
export function upsertSavedRoute(
  list: readonly SavedSkiRoute[],
  route: SavedSkiRoute,
): SavedSkiRoute[] {
  return [route, ...list.filter((r) => r.id !== route.id)].slice(0, MAX_SAVED_ROUTES);
}

/** Remove one saved route by id; unknown ids are a no-op. */
export function removeSavedRoute(
  list: readonly SavedSkiRoute[],
  id: string,
): SavedSkiRoute[] {
  return list.filter((r) => r.id !== id);
}

/* ---- localStorage wrappers (browser only, fail-soft) ---- */

export function loadSavedRoutes(): SavedSkiRoute[] {
  try {
    return parseSavedRoutes(window.localStorage.getItem(SAVED_ROUTES_KEY));
  } catch {
    return [];
  }
}

export function storeSavedRoutes(routes: readonly SavedSkiRoute[]): void {
  try {
    window.localStorage.setItem(SAVED_ROUTES_KEY, JSON.stringify(routes));
  } catch {
    /* storage blocked / full — saving is best-effort, never fatal */
  }
}
