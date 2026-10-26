/**
 * Event pages — catalogue selections (server-side).
 *
 * The dated event hubs (/nyc-marathon-2026, /starship-flight-15, …) draw
 * their camera walls from the same country chunks as every other
 * directory page — no second camera database, no hand-picked IDs that
 * can silently rot. A selection is a geographic rule stated on the page
 * itself (a radius around a named place, a corridor along a route), so
 * the counts printed in the copy are computed from the very records
 * rendered below them and can never drift apart.
 */
import {
  dedupeCountryCameras,
  sortWorkingFeedsFirst,
  type CountryCamera,
} from "./country-cameras";
import {
  haversineKm,
  selectRouteCameras,
  type RouteCamera,
} from "./ski-resorts";

export interface GeoAnchor {
  lat: number;
  lng: number;
}

function hasCoords(cam: CountryCamera): boolean {
  return typeof cam.lat === "number" && typeof cam.lng === "number";
}

/** Distance in km from an anchor, or Infinity for coord-less records. */
export function distanceKm(cam: CountryCamera, anchor: GeoAnchor): number {
  if (!hasCoords(cam)) return Infinity;
  return haversineKm(cam.lat as number, cam.lng as number, anchor.lat, anchor.lng);
}

/**
 * Every catalogue record within `km` of an anchor — deduped, nearest
 * first inside each playability tier (working feeds ahead of embeds
 * ahead of listings, the directory-wide rule).
 */
export function camerasWithinKm(
  records: readonly CountryCamera[],
  anchor: GeoAnchor,
  km: number,
): CountryCamera[] {
  const hits = dedupeCountryCameras(records.filter(hasCoords))
    .map((cam) => ({ cam, d: distanceKm(cam, anchor) }))
    .filter((h) => h.d <= km)
    .sort((a, b) => a.d - b.d);
  return sortWorkingFeedsFirst(hits.map((h) => h.cam));
}

/** Count only — for the context figures quoted in page copy. */
export function countWithinKm(
  records: readonly CountryCamera[],
  anchor: GeoAnchor,
  km: number,
): number {
  let n = 0;
  for (const cam of dedupeCountryCameras(records.filter(hasCoords))) {
    if (distanceKm(cam, anchor) <= km) n++;
  }
  return n;
}

/**
 * Cameras within a corridor of a route polyline ([lng, lat] pairs),
 * ordered by progress along the route — the ski route tool's selection,
 * reused for race courses and parade routes.
 */
export function camerasAlongRoute(
  records: readonly CountryCamera[],
  route: readonly (readonly [number, number])[],
  corridorKm: number,
): RouteCamera[] {
  /* Along-route order is the story on a course page, so — exactly like
     the ski route tool — this selection keeps it rather than applying
     the working-feeds-first sort. */
  return selectRouteCameras(records, route, corridorKm);
}

/** Union of radius selections, deduped, in the order the anchors were given. */
export function camerasNearAnchors(
  records: readonly CountryCamera[],
  anchors: readonly { anchor: GeoAnchor; km: number }[],
): CountryCamera[] {
  const seen = new Set<string>();
  const out: CountryCamera[] = [];
  for (const { anchor, km } of anchors) {
    for (const cam of camerasWithinKm(records, anchor, km)) {
      if (!seen.has(cam.id)) {
        seen.add(cam.id);
        out.push(cam);
      }
    }
  }
  return out;
}
