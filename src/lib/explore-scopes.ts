/**
 * OSIRIS — directory explorer scopes: which cameras a non-country
 * directory page (region hub, category hub, traffic hub, city page)
 * shows, decided from the same generated catalogue the country pages
 * serve (src/data/countries/*.json, indexed by camera-countries.json).
 *
 * This module is the pure part: theme classification, scope filtering,
 * page ordering and the route-camera selection. The server-side record
 * loading lives in lib/explore-data.ts; the HTTP surface is
 * /api/cctv/explore (browsing) and /api/cctv/route-cameras (routes).
 *
 * Honesty rules, shared with the country pages:
 *  - A scope is a defined, testable rule over real records — never a
 *    hand-written list of cameras. Counts quoted on a page are the
 *    rule's actual yield over the catalogue, computed, not asserted.
 *  - Theme membership comes from what the record itself says: its
 *    name (the patterns lib/country-page-content already uses to
 *    describe a country's mix) and, for traffic, its source network.
 */

import {
  sliceCountryCameras,
  type CountrySlice,
  type CountrySliceRequest,
} from './country-slices';
import { clean, sortForCountryPage, type CountryCamera } from './country-cameras';
import { haversineKm } from './ski-resorts';
import { THEME_DEFS } from './country-page-content';
import { findRouteCameras, ROUTE_CAMERA_CORRIDOR_M } from './route-cameras';

export type { CountrySlice, CountrySliceRequest };

/* ------------------------------------------------------------------ */
/* Themes                                                              */
/* ------------------------------------------------------------------ */

export type ExploreThemeKey = 'traffic' | 'coast' | 'airport';

function themeNamePattern(key: string): RegExp {
  const def = THEME_DEFS.find((d) => d.key === key);
  if (!def) throw new Error(`No theme pattern for "${key}"`);
  return def.pattern;
}

/** Airports are named in the record itself — there is no airport field
 *  and no airport entity list in the catalogue, so the airport scope
 *  is exactly the cameras whose name says airport, airfield or runway.
 *  (THEME_DEFS' broader "transport" pattern also matches stations and
 *  railways, which are not airports; it is not used here.) */
export const AIRPORT_NAME_PATTERN = /\b(airport|airfield|runway)\b/i;

/**
 * Road and traffic authorities publish under source labels that say
 * what they are — state DOTs, 511 services, national road agencies.
 * A camera whose source is one of these is a road camera even when its
 * name is only a place (the Scandinavian networks name cameras by the
 * place they watch, not the road). Matched against the full source
 * string, so the aggregator prefix ("OpenCCTV / wsdot") is harmless.
 * Every token below names a road/traffic body whose feeds are in the
 * catalogue under that label — the set was enumerated from the
 * catalogue's own distinct sources, not from memory.
 */
export const ROAD_SOURCE_PATTERN =
  /dot|511|caltrans|dgt|asfinag|fintraffic|trafikverket|vegvesen|vegagerðin|drivebc|tripcheck|midrive|ohgo|cotrip|traffic|highway|autostrade|road-info|bayerninfo|nmroads|netravel|travelmidwest|newengland|qldtraffic|trafficwales|via lietuva|tii-ireland|ontario|alberta|mdchart|nzta|transport dept/i;

export function matchesTheme(cam: CountryCamera, theme: ExploreThemeKey): boolean {
  if (theme === 'airport') return AIRPORT_NAME_PATTERN.test(cam.name ?? '');
  if (theme === 'coast') return themeNamePattern('coast').test(cam.name ?? '');
  /* traffic: the name says road/traffic, or the source is a road
     authority (see ROAD_SOURCE_PATTERN). */
  return (
    themeNamePattern('traffic').test(cam.name ?? '') ||
    ROAD_SOURCE_PATTERN.test(cam.source ?? '')
  );
}

/* ------------------------------------------------------------------ */
/* Scopes                                                              */
/* ------------------------------------------------------------------ */

/** A radius around a point — the event pages' scope shape: every
 *  record within `radiusKm` of the centre, nearest first. The centre
 *  and radius are part of the scope's definition (a stadium, a coastal
 *  city, a resort), so the set a page quotes is exactly the set its
 *  grid serves. */
export interface GeoScope {
  lat: number;
  lng: number;
  radiusKm: number;
}

/** A scope over records already loaded from the catalogue chunks. The
 *  country selection itself (which chunks) happens in explore-data;
 *  everything after that is this filter. */
export interface ExploreScope {
  theme?: ExploreThemeKey;
  /** Exact city (the record's own city value, whitespace-normalised). */
  city?: string;
  /** Radius filter; also switches the scope's order to nearest-first. */
  geo?: GeoScope;
}

export function applyScope(
  records: readonly CountryCamera[],
  scope: ExploreScope,
): CountryCamera[] {
  let out = records as CountryCamera[];
  if (scope.theme) out = out.filter((cam) => matchesTheme(cam, scope.theme as ExploreThemeKey));
  if (scope.city) {
    const wanted = clean(scope.city);
    out = out.filter((cam) => clean(cam.city) === wanted);
  }
  if (scope.geo) {
    const { lat, lng, radiusKm } = scope.geo;
    out = out
      .filter((cam) => typeof cam.lat === 'number' && typeof cam.lng === 'number')
      .map((cam) => ({
        cam,
        d: haversineKm(lat, lng, cam.lat as number, cam.lng as number),
      }))
      .filter((x) => x.d <= radiusKm)
      .sort((a, b) => a.d - b.d)
      .map((x) => x.cam);
  }
  return out;
}

/** How the unfiltered grid groups its cards. 'city' is the country
 *  pages' order (biggest city first); 'country' groups a multi-country
 *  scope by country, biggest first, cities alphabetical inside. */
export type ExploreGroupBy = 'city' | 'country';

export function sortForExplore(
  records: readonly CountryCamera[],
  groupBy: ExploreGroupBy,
): CountryCamera[] {
  if (groupBy === 'city') return sortForCountryPage(records);
  const sizes = new Map<string, number>();
  for (const cam of records) {
    const country = clean(cam.country);
    if (country) sizes.set(country, (sizes.get(country) ?? 0) + 1);
  }
  return [...records].sort((a, b) => {
    const ca = clean(a.country);
    const cb = clean(b.country);
    if (ca !== cb) {
      if (!ca) return 1;
      if (!cb) return -1;
      const bySize = (sizes.get(cb) ?? 0) - (sizes.get(ca) ?? 0);
      if (bySize !== 0) return bySize;
      return ca.localeCompare(cb);
    }
    const cityA = clean(a.city);
    const cityB = clean(b.city);
    if (cityA !== cityB) {
      if (!cityA) return 1;
      if (!cityB) return -1;
      return cityA.localeCompare(cityB);
    }
    return clean(a.name).localeCompare(clean(b.name));
  });
}

/** Filter + slice a scope's records for one explorer response — the
 *  same semantics (and the same code) as the country endpoint, so a
 *  city picked on a hub behaves exactly like a city on a country page. */
export function sliceExplore(
  records: readonly CountryCamera[],
  scope: ExploreScope,
  groupBy: ExploreGroupBy,
  req: CountrySliceRequest,
): CountrySlice {
  const scoped = applyScope(records, scope);
  /* A geo scope's order is nearest-first (applyScope already sorted
     it); the grouped orders are for browsing a whole catalogue, not a
     radius around a point. */
  const ordered = scope.geo ? scoped : sortForExplore(scoped, groupBy);
  return sliceCountryCameras(ordered, req);
}

/* ------------------------------------------------------------------ */
/* Route cameras                                                       */
/* ------------------------------------------------------------------ */

/** Feeds the route finder renders at most — beyond this the list is a
 *  phone book; the full count is still quoted honestly beside it. */
export const ROUTE_FINDER_CAP = 60;

export interface RouteCameraHit extends CountryCamera {
  /** Metres from the route's start to the camera's nearest point. */
  alongRouteM: number;
  /** Perpendicular distance from the route line, metres. */
  distanceFromRouteM: number;
}

export interface RouteCameraResults {
  /** Every previewable camera inside the corridor. */
  total: number;
  cameras: RouteCameraHit[];
  corridorM: number;
}

/** Keep only records anywhere near the route's bounding box before the
 *  corridor maths runs over them — the maths itself is unchanged
 *  (lib/route-cameras); this only spares it the other hemisphere. */
function nearRoute(
  records: readonly CountryCamera[],
  coords: readonly [number, number][],
  corridorM: number,
): CountryCamera[] {
  let minLat = Infinity,
    maxLat = -Infinity,
    minLng = Infinity,
    maxLng = -Infinity;
  for (const [lng, lat] of coords) {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
  }
  const latMargin = corridorM / 111_320;
  const midLat = (minLat + maxLat) / 2;
  const lngMargin = corridorM / (111_320 * Math.max(0.2, Math.cos((midLat * Math.PI) / 180)));
  return records.filter(
    (cam) =>
      typeof cam.lat === 'number' &&
      typeof cam.lng === 'number' &&
      cam.lat >= minLat - latMargin &&
      cam.lat <= maxLat + latMargin &&
      cam.lng >= minLng - lngMargin &&
      cam.lng <= maxLng + lngMargin,
  );
}

/**
 * The cameras a route passes, as full catalogue records (so the page
 * renders the same feed cards as every other directory page), ordered
 * along the route. Only cameras the preview machinery can show count —
 * the same rule the globe's route strip applies.
 */
export function routeCameraResults(
  records: readonly CountryCamera[],
  coords: readonly [number, number][] | undefined | null,
  cap: number = ROUTE_FINDER_CAP,
  corridorM: number = ROUTE_CAMERA_CORRIDOR_M,
): RouteCameraResults {
  if (!coords || coords.length < 2) return { total: 0, cameras: [], corridorM };
  const candidates = nearRoute(records, coords, corridorM);
  const hits = findRouteCameras(candidates, coords as [number, number][], corridorM);
  const byId = new Map(records.map((r) => [r.id, r]));
  const cameras: RouteCameraHit[] = [];
  for (const hit of hits) {
    const record = byId.get(hit.id);
    if (!record) continue;
    cameras.push({
      ...record,
      alongRouteM: hit.alongRouteM,
      distanceFromRouteM: hit.distanceFromRouteM,
    });
    if (cameras.length >= cap) break;
  }
  return { total: hits.length, cameras, corridorM };
}
