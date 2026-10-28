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

export type ExploreThemeKey = 'traffic' | 'coast' | 'airport' | 'rail' | 'animals';

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

/** Rail is named in the record itself, the same discipline as
 *  airports — there is no rail field in the catalogue, so the rail
 *  scope is exactly the cameras whose name says railway: a line, a
 *  station, a bridge, a depot, a named operator. Two traps shaped the
 *  guards, both measured over the raw catalogue (2026-10-27):
 *  - "Station" alone is not rail. Japan's river networks name their
 *    gauging sites "…Water Level Station" / "…Pumping Station" /
 *    "…Disaster Prevention Station" (and Taiwan's are pumping
 *    stations too); ski areas have lift and gondola stations; plots
 *    and depots serve buses, ambulances and home-improvement stores.
 *    A station name carrying one of those utility words is rejected
 *    unless a hard rail pattern also matches.
 *  - In rivergojp names "Hanshin" is the expressway company, not the
 *    railway, so it is absent from the operator list (Hankyu is the
 *    railway). "Tram Rd" and "Depot Dr" are street names, not scenes.
 *  The yield over the catalogue generated 2026-10-20 is 393 records —
 *  pinned, with every page wall's count, in
 *  lib/railfan-page-scopes.test.ts. */
export const RAIL_NAME_PATTERN =
  /shinkansen|railway|railroad|rail\s?cam|train\s?cam|live trains|\b(bnsf|amtrak|csx|fec|cpkc|kcs)\b|norfolk southern|union pacific|train station|hauptbahnhof|\bbahnhof\b|light rail|\bmtr\b|high[- ]speed rail/i;

/** Japanese private railways and JR name their bridges and lines in
 *  the river-camera networks: "JR Kansai Main Line … Bridge",
 *  "Yodo River at Hankyu Kyoto Line", "Keio Sagamihara Line …". */
export const RAIL_OPERATOR_LINE_PATTERN =
  /\b(JR|Kintetsu|Meitetsu|Hankyu|Keio|Odakyu|Tobu|Seibu|Tokyu|Sotetsu|Keisei)\b[^,]*\b(bridge|line|station|concourse)\b/i;

const RAIL_STATION_PATTERN = /\bstation\b/i;
const RAIL_STATION_REJECT =
  /river|water|pump|drainage|air quality|observation|alert|disaster|monitor|gaug|weather|\bgas\b|police|bus|charging|power|sewage|recycl|weigh|inspect|ranger|research|\blift\b|fire|relay|forest|meadow|pasture|gondola/i;
const RAIL_STATION_STREET =
  /station\s+(st|ave|rd|blvd|dr|street|avenue|road|ln|ct|hwy)\b/i;
const RAIL_TRAM_ROAD = /\btram\s+(rd|road)\b/i;
const RAIL_DEPOT_REJECT =
  /home depot|bus depot|ambulance|depot\s+(road|rd|dr|drive|street|st)\b/i;

/** Does this record's own name place it in the rail world? The one
 *  matcher behind the 'rail' theme, the worldwide rail wall and every
 *  rail-named count the /train-webcams pages quote. */
export function matchesRailName(name: string): boolean {
  const n = name ?? '';
  const hard = RAIL_NAME_PATTERN.test(n) || RAIL_OPERATOR_LINE_PATTERN.test(n);
  /* A utility "station" (water, pumping, fire, research…) is not a
     railway station, however the name is dressed — unless a hard
     rail pattern says otherwise ("Busan Station Railway Pier"). */
  if (RAIL_STATION_PATTERN.test(n) && RAIL_STATION_REJECT.test(n) && !hard) {
    return false;
  }
  if (hard) return true;
  if (/station concourse|station area/i.test(n)) return true;
  if (/\btram\b/i.test(n) && !RAIL_TRAM_ROAD.test(n)) return true;
  if (/\bdepot\b/i.test(n) && !RAIL_DEPOT_REJECT.test(n)) return true;
  if (RAIL_STATION_PATTERN.test(n) && !RAIL_STATION_STREET.test(n)) return true;
  return false;
}

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

/** Animal subjects are named in the record itself, the same discipline
 *  as airports and rail — there is no animal field in the catalogue, so
 *  the animal scope is exactly the cameras whose NAME carries an animal
 *  subject: a zoo, a nest, a safari or wildlife lodge, an underwater
 *  reef. The terms are multilingual because the catalogue's genuine
 *  nest-cam clusters are Dutch (ooievaar = white stork, slechtvalk =
 *  peregrine falcon), Polish (gniazdo = nest) and Swedish (storkar =
 *  storks). Three traps shaped the guards, all measured over the raw
 *  catalogue (2026-10-27, 76,575 records):
 *  - Highway networks name interchanges and bridges FOR zoos ("I-40 @
 *    Knoxville Zoo", "Zoo Bridge") — a road-authority source
 *    (ROAD_SOURCE_PATTERN) disqualifies a record outright, and a
 *    street-scene word in the name (bridge, junction, @…) disqualifies
 *    it too, unless a hard zoo anchor says the zoo itself is the
 *    subject.
 *  - River-monitoring networks name their gauges for the nearest
 *    landmark: rivergojp's "Marine Pia Niigata Aquarium" is a river
 *    camera at the aquarium, not an aquarium cam — that source is
 *    rejected by name.
 *  - Loose animal words match inside place names: "otter" hides in
 *    Pottery Rd and Ottertail, "eagle" is a town in a dozen states.
 *    The loose terms carry word boundaries, and bare "eagle"/"bear"/
 *    "deer" are not subjects at all — only nest/cam constructions are.
 *  The famous absences are real: there is NO Brooks Falls / Katmai
 *  bear cam (the only Katmai record is an FAA weather camera at a
 *  lodge airstrip), no eagle nest cam, no panda, osprey, puffin or
 *  penguin cam anywhere in the catalogue. The yield over the catalogue
 *  generated 2026-10-20 is 43 records — pinned, with the full audited
 *  ID list, in lib/animal-cams.test.ts. */
export const ANIMAL_SUBJECT_PATTERN =
  /giraffe|elephant park|monkey cent|animal shelter|animal paradise|deer farm|bird feeder|barn owl|peregrine|slechtvalk|ooievaar|stork|gniazdo|bird cam|nature reserve|wildlife lodge|coral reef|underwater|vogel informatiecentrum|\bzoo\b|\baquarium\b|masai mara|nkorho|olifants|falcon nest|owl nest|eagle nest|eagle cam|\bosprey\b|\bpuffin\b|\bpenguin\b|panda cam|bear cam|\bflamingo\b|\botter\b|\bkoala\b/i;

const ANIMAL_HARD_ANCHOR = /san diego zoo|gaia zoo|belize zoo|kumamoto|giraffe/i;
const ANIMAL_STREET_SCENE = /bridge|roundabout|junction|interchange|intersection|exit\b|@/i;
const ANIMAL_LANDMARK_SOURCE = /rivergojp/i;

/** Does this record's own name make an animal its subject? The one
 *  matcher behind the 'animals' theme and the /animal-webcams hub. */
export function matchesAnimalCam(cam: CountryCamera): boolean {
  const name = cam.name ?? '';
  if (!ANIMAL_SUBJECT_PATTERN.test(name)) return false;
  if (ROAD_SOURCE_PATTERN.test(cam.source ?? '')) return false;
  if (ANIMAL_LANDMARK_SOURCE.test(cam.source ?? '')) return false;
  if (ANIMAL_STREET_SCENE.test(name) && !ANIMAL_HARD_ANCHOR.test(name)) return false;
  return true;
}

export function matchesTheme(cam: CountryCamera, theme: ExploreThemeKey): boolean {
  if (theme === 'airport') return AIRPORT_NAME_PATTERN.test(cam.name ?? '');
  if (theme === 'rail') return matchesRailName(cam.name ?? '');
  if (theme === 'animals') return matchesAnimalCam(cam);
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
  /** A name rule over the record itself — the place-shaped sibling
   *  of the themes (which are name patterns too): the scope is
   *  exactly the records whose own name matches, e.g. the cameras
   *  whose name is a street. Composes with `geo` when the name alone
   *  is ambiguous (a name shared by several places). Yields are
   *  pinned against the raw chunks by the owning family's tests. */
  namePattern?: RegExp;
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
  if (scope.namePattern) {
    const pattern = scope.namePattern;
    out = out.filter((cam) => pattern.test(cam.name ?? ''));
  }
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
