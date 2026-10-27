/**
 * OSIRIS — server-side record loading for the directory explorers.
 *
 * The country endpoint loads one country's chunk per request; the
 * region / category / traffic hubs and the city pages need unions and
 * theme-filtered sets over the same generated catalogue
 * (src/data/countries/*.json, indexed by camera-countries.json). This
 * module is the one loader for those scopes: chunks are imported
 * lazily, cached per instance, and every scope's filtered record set
 * is computed once and reused — pages read counts and search options
 * from the same sets the /api/cctv/explore endpoint slices, so a page
 * can never quote a number its own grid disagrees with.
 *
 * Scopes are a fixed registry (below), not arbitrary client input: a
 * key names a page family, and the page and the endpoint resolve the
 * same key to the same records. City scopes arrive as country+city
 * params instead (46+ generated cities are data, not registry rows),
 * validated against the country index.
 */

import index from '@/data/camera-countries.json';
import { cameraAreas, type CameraArea, type CountryCamera } from './country-cameras';
import { COUNTRY_REGION, type RegionKey } from './country-page-content';
import {
  applyScope,
  sortForExplore,
  type ExploreGroupBy,
  type ExploreScope,
  type ExploreThemeKey,
  type GeoScope,
} from './explore-scopes';

export interface CountryIndexEntry {
  slug: string;
  name: string;
  count: number;
  topCities: Array<{ name: string; count: number }>;
  cityCount: number;
}

export const COUNTRY_INDEX = (
  index as unknown as { countries: CountryIndexEntry[] }
).countries;
export const CATALOGUE_GENERATED_AT = (index as unknown as { generatedAt: string })
  .generatedAt;
const BY_SLUG = new Map(COUNTRY_INDEX.map((c) => [c.slug, c]));

export function countryEntry(slug: string): CountryIndexEntry | null {
  return BY_SLUG.get(slug) ?? null;
}

/* ------------------------------------------------------------------ */
/* Chunk loading (the country route's lazy pattern, shared)            */
/* ------------------------------------------------------------------ */

const chunkCache = new Map<string, Promise<CountryCamera[]>>();

export function loadCountryChunk(slug: string): Promise<CountryCamera[]> {
  let pending = chunkCache.get(slug);
  if (!pending) {
    pending = import(`@/data/countries/${slug}.json`).then(
      (mod) => ((mod as { default?: unknown }).default ?? mod) as CountryCamera[],
    );
    chunkCache.set(slug, pending);
  }
  return pending;
}

let allRecords: Promise<CountryCamera[]> | null = null;

export function loadAllRecords(): Promise<CountryCamera[]> {
  if (!allRecords) {
    allRecords = Promise.all(COUNTRY_INDEX.map((c) => loadCountryChunk(c.slug))).then(
      (chunks) => chunks.flat(),
    );
  }
  return allRecords;
}

async function loadUnion(slugs: readonly string[]): Promise<CountryCamera[]> {
  const chunks = await Promise.all(slugs.map((s) => loadCountryChunk(s)));
  return chunks.flat();
}

/* ------------------------------------------------------------------ */
/* Scope registry                                                      */
/* ------------------------------------------------------------------ */

export interface ExploreScopeDef {
  /** Human label, used in count lines and section headings. */
  label: string;
  slugs: string[] | 'all';
  theme?: ExploreThemeKey;
  city?: string;
  /** Radius scope (event pages): records within the radius, nearest first. */
  geo?: GeoScope;
  groupBy: ExploreGroupBy;
}

function regionSlugs(region: RegionKey): string[] {
  return Object.entries(COUNTRY_REGION)
    .filter(([, r]) => r === region)
    .map(([slug]) => slug)
    .filter((slug) => BY_SLUG.has(slug));
}

function trafficCountry(slug: string, label: string): ExploreScopeDef {
  return { label, slugs: [slug], theme: 'traffic', groupBy: 'city' };
}

/** An event wall: every US catalogue record within `radiusKm` of a
 *  named centre (a ballpark, a coastal city, a resort), nearest
 *  first. The centre is part of the page's stated rule, so the count
 *  a page quotes is the count its own grid serves. */
function eventGeo(
  label: string,
  lat: number,
  lng: number,
  radiusKm: number,
): ExploreScopeDef {
  return { label, slugs: ['united-states'], geo: { lat, lng, radiusKm }, groupBy: 'city' };
}

/** Same radius scope over an explicit country chunk — the
 *  non-US event walls (European markets, volcanoes abroad). */
function eventGeoIn(
  label: string,
  slug: string,
  lat: number,
  lng: number,
  radiusKm: number,
): ExploreScopeDef {
  return { label, slugs: [slug], geo: { lat, lng, radiusKm }, groupBy: 'city' };
}

export const EXPLORE_SCOPES: Record<string, ExploreScopeDef> = {
  /* Region hubs — the country pages' own continental grouping
     (lib/country-page-content COUNTRY_REGION). */
  asia: { label: 'Asia', slugs: regionSlugs('asia'), groupBy: 'country' },
  europe: { label: 'Europe', slugs: regionSlugs('europe'), groupBy: 'country' },
  /* The whole catalogue, for the /live-webcams hub. */
  all: { label: 'the world', slugs: 'all', groupBy: 'country' },
  /* Category hubs — theme rules over the whole catalogue. */
  beach: { label: 'beaches & coasts', slugs: 'all', theme: 'coast', groupBy: 'country' },
  airport: { label: 'airports', slugs: 'all', theme: 'airport', groupBy: 'country' },
  /* Traffic family. */
  traffic: { label: 'traffic & roads', slugs: 'all', theme: 'traffic', groupBy: 'country' },
  'traffic-us': {
    label: 'United States traffic',
    slugs: ['united-states'],
    theme: 'traffic',
    groupBy: 'city',
  },
  'traffic-japan': trafficCountry('japan', 'Japan traffic'),
  'traffic-canada': trafficCountry('canada', 'Canada traffic'),
  'traffic-spain': trafficCountry('spain', 'Spain traffic'),
  'traffic-south-korea': trafficCountry('south-korea', 'South Korea traffic'),
  'traffic-sweden': trafficCountry('sweden', 'Sweden traffic'),
  'traffic-norway': trafficCountry('norway', 'Norway traffic'),
  'traffic-germany': trafficCountry('germany', 'Germany traffic'),
  /* Event walls (Oct 2026) — radius scopes for the trending-event
     pages. Each centre is the place the page names: Tropicana Field
     for the World Series' Florida games, downtown Milwaukee for the
     Wisconsin games, the coastal city centres for the king-tide page,
     and the resorts' own coordinates for opening week. */
  'event-world-series-st-petersburg': eventGeo('St. Petersburg & Tampa Bay', 27.7683, -82.6534, 25),
  'event-world-series-milwaukee': eventGeo('Milwaukee', 43.0389, -87.9065, 25),
  'event-ca-flood-san-francisco': eventGeo('San Francisco Bay Area', 37.7749, -122.4194, 30),
  'event-ca-flood-los-angeles': eventGeo('the Los Angeles coast', 34.0195, -118.4912, 30),
  'event-ca-flood-orange-county': eventGeo('Orange County', 33.6189, -117.9298, 25),
  'event-ca-flood-san-diego': eventGeo('San Diego', 32.7157, -117.1611, 30),
  'event-ca-flood-miami': eventGeo('Miami & South Florida', 25.7617, -80.1918, 30),
  'event-ca-flood-charleston': eventGeo('Charleston', 32.7765, -79.9311, 30),
  'event-first-snow-black-hills': eventGeo('Rapid City & the Black Hills', 44.0805, -103.231, 40),
  'event-first-snow-alaska': eventGeo('Anchorage & Southcentral Alaska', 61.2181, -149.9003, 50),
  'event-first-snow-colorado': eventGeo('Denver & the I-70 corridor', 39.7392, -104.9903, 40),
  'event-ski-opening-arapahoe-basin': eventGeo('Arapahoe Basin', 39.6425, -105.8717, 30),
  'event-ski-opening-winter-park': eventGeo('Winter Park', 39.8917, -105.7631, 30),
  'event-ski-opening-keystone': eventGeo('Keystone', 39.6069, -105.9437, 30),
  /* Trending batch C (Oct 2026) — the season-long West Coast storm
     watch. The three California coastal walls reuse the king-tide
     scopes above; these are the northern and inland additions. */
  'event-ar-seattle': eventGeo('Seattle & Puget Sound', 47.6062, -122.3321, 30),
  'event-ar-portland': eventGeo('Portland & the Columbia', 45.5152, -122.6784, 30),
  'event-ar-eureka': eventGeo('Eureka & the North Coast', 40.8021, -124.1637, 40),
  'event-ar-sacramento': eventGeo('Sacramento & the Central Valley', 38.5816, -121.4944, 30),
  'event-ar-sierra': eventGeo('the Sierra Nevada passes', 39.328, -120.183, 40),
  /* Four Corners flood watch (Oct 2026) — honestly thin country:
     wide radii around the corridor towns are the page's stated rule,
     and Farmington (0 within 40 km) has no wall at all. */
  'event-fc-shiprock': eventGeo('Shiprock & the San Juan River', 36.7855, -108.6986, 80),
  'event-fc-durango': eventGeo('Durango', 37.2753, -107.8801, 40),
  'event-fc-cortez': eventGeo('Cortez', 37.3487, -108.5859, 40),
  'event-fc-moab': eventGeo('Moab', 38.5733, -109.5498, 50),
  /* Christmas markets (Nov–Dec 2026) — Austria's catalogue carries
     the page; the German walls are Bavarian and thin, and Cologne
     and Dresden have no catalogue cameras at all (see the page). */
  'event-cm-vienna': eventGeoIn('Vienna', 'austria', 48.2082, 16.3738, 20),
  'event-cm-salzburg': eventGeoIn('Salzburg', 'austria', 47.8095, 13.055, 20),
  'event-cm-graz': eventGeoIn('Graz', 'austria', 47.0707, 15.4395, 20),
  'event-cm-innsbruck': eventGeoIn('Innsbruck', 'austria', 47.2692, 11.4041, 20),
  'event-cm-munich': eventGeoIn('Munich', 'germany', 48.1374, 11.5755, 20),
  'event-cm-nuremberg': eventGeoIn('Nuremberg', 'germany', 49.4521, 11.0767, 20),
  'event-cm-berlin': eventGeoIn('Berlin', 'germany', 52.52, 13.405, 20),
  /* Leonids / night-sky week (Nov 2026) — dark-country anchors plus
     the New York skyline wall for the Nov 24 Beaver Supermoon. */
  'event-le-fairbanks': eventGeo('Fairbanks', 64.8378, -147.7164, 60),
  'event-le-reykjavik': eventGeoIn('Reykjavík', 'iceland', 64.1466, -21.9426, 30),
  'event-le-flagstaff': eventGeo('Flagstaff', 35.1983, -111.6513, 40),
  'event-le-moab': eventGeo('Moab', 38.5733, -109.5498, 50),
  'event-le-joshua-tree': eventGeo('Joshua Tree', 34.011, -116.011, 40),
  'event-le-nyc': eventGeo('New York City', 40.758, -73.985, 25),
  /* Volcano walls — one radius scope per volcano the strengthened
     /volcano-webcams page sections. Etna's yield is a single
     dedicated volcano camera; that is the count its section states. */
  'event-vo-kilauea': eventGeo('Kīlauea', 19.4069, -155.2834, 50),
  'event-vo-reykjanes': eventGeoIn('the Reykjanes Peninsula', 'iceland', 63.8424, -22.4338, 30),
  'event-vo-katla': eventGeoIn('Katla & Vík', 'iceland', 63.4044, -19.0459, 40),
  'event-vo-etna': eventGeoIn('Mount Etna', 'italy', 37.751, 14.9934, 30),
  'event-vo-vesuvius': eventGeoIn('Vesuvius & Naples', 'italy', 40.8217, 14.4267, 25),
  'event-vo-sakurajima': eventGeoIn('Sakurajima & Kagoshima', 'japan', 31.5936, 130.6572, 20),
  'event-vo-merapi': eventGeoIn('Mount Merapi', 'indonesia', -7.5407, 110.4457, 30),
  'event-vo-ruapehu': eventGeoIn('Mount Ruapehu', 'new-zealand', -39.28, 175.57, 50),
  /* SEO page set #37 (Oct 2026) — the aurora hub, the New York City
     flagship, the Japan hub and the port hub. Country walls are the
     country's full chunk (the count a page quotes is the index's own
     country count); city and port walls are radius scopes whose centre
     and radius are part of each page's stated rule. The Fairbanks
     aurora wall reuses 'event-le-fairbanks' above. Every yield is
     reconciled against the raw chunks in
     src/lib/seo-page-scopes.test.ts. */
  'aurora-finland': { label: 'Finland', slugs: ['finland'], groupBy: 'city' },
  'aurora-iceland': { label: 'Iceland', slugs: ['iceland'], groupBy: 'city' },
  'aurora-norway': { label: 'Norway', slugs: ['norway'], groupBy: 'city' },
  'nyc': eventGeo('New York City', 40.758, -73.9855, 25),
  'nyc-manhattan': eventGeo('Manhattan', 40.7831, -73.9712, 6),
  'nyc-brooklyn': eventGeo('Brooklyn', 40.6782, -73.9442, 8),
  'nyc-queens': eventGeo('Queens', 40.7282, -73.7949, 10),
  'nyc-bronx': eventGeo('Bronx', 40.8448, -73.8648, 7),
  'nyc-staten-island': eventGeo('Staten Island', 40.5795, -74.1502, 8),
  'japan': { label: 'Japan', slugs: ['japan'], groupBy: 'city' },
  'japan-tokyo': eventGeoIn('Tokyo', 'japan', 35.6812, 139.7671, 20),
  'japan-fuji': eventGeoIn('Mt. Fuji & the Five Lakes district', 'japan', 35.3606, 138.7274, 25),
  'port-hong-kong': eventGeoIn('Victoria Harbour, Hong Kong', 'hong-kong', 22.293, 114.1693, 6),
  'port-tampa': eventGeo('Tampa Bay, Florida', 27.94, -82.45, 10),
  'port-busan': eventGeoIn('Busan, South Korea', 'south-korea', 35.1, 129.04, 10),
  'port-seattle': eventGeo('Seattle & Elliott Bay', 47.583, -122.335, 6),
  'port-vancouver': eventGeoIn('Vancouver, British Columbia', 'canada', 49.29, -123.09, 6),
  'port-fort-lauderdale': eventGeo('Fort Lauderdale & Port Everglades', 26.09, -80.11, 8),
  'port-norfolk': eventGeo('Norfolk & Hampton Roads, Virginia', 36.9, -76.33, 10),
  'port-miami': eventGeo('Miami & PortMiami', 25.77, -80.18, 10),
  'port-honolulu': eventGeo('Honolulu Harbor, Hawaii', 21.31, -157.87, 8),
  'port-sydney': eventGeoIn('Sydney Harbour, Australia', 'australia', -33.86, 151.26, 10),
  'port-new-york': eventGeo('New York Harbor', 40.68, -74.02, 10),
  'port-long-beach': eventGeo('Long Beach & Los Angeles, California', 33.73, -118.26, 12),
  'port-rotterdam': eventGeoIn('Rotterdam, Netherlands', 'netherlands', 51.95, 4.14, 15),
};

/** A scope definition from request params: either a registry key, or
 *  a country with an optional exact city and/or theme (the city pages'
 *  shape). Null when the params name nothing real. */
export function resolveExploreDef(params: {
  scope?: string | null;
  country?: string | null;
  city?: string | null;
  theme?: string | null;
}): ExploreScopeDef | null {
  if (params.scope) {
    return EXPLORE_SCOPES[params.scope] ?? null;
  }
  if (params.country) {
    const entry = BY_SLUG.get(params.country);
    if (!entry) return null;
    let theme: ExploreThemeKey | undefined;
    if (params.theme) {
      if (params.theme !== 'traffic' && params.theme !== 'coast' && params.theme !== 'airport') {
        return null;
      }
      theme = params.theme;
    }
    const city = params.city?.trim() ? params.city : undefined;
    return {
      label: city ? `${city}, ${entry.name}` : entry.name,
      slugs: [entry.slug],
      theme,
      city,
      groupBy: 'city',
    };
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Resolved record sets (computed once per instance)                   */
/* ------------------------------------------------------------------ */

const defCache = new Map<string, Promise<CountryCamera[]>>();

function defKey(def: ExploreScopeDef): string {
  const slugs = def.slugs === 'all' ? 'all' : [...def.slugs].sort().join(',');
  const geo = def.geo ? `${def.geo.lat},${def.geo.lng},${def.geo.radiusKm}` : '';
  return `${slugs}|${def.theme ?? ''}|${def.city ?? ''}|${geo}|${def.groupBy}`;
}

/** The scope's records, theme/city-filtered and in page order. */
export function recordsForDef(def: ExploreScopeDef): Promise<CountryCamera[]> {
  const key = defKey(def);
  let pending = defCache.get(key);
  if (!pending) {
    pending = (async () => {
      const base =
        def.slugs === 'all' ? await loadAllRecords() : await loadUnion(def.slugs);
      const scope: ExploreScope = { theme: def.theme, city: def.city, geo: def.geo };
      const scoped = applyScope(base, scope);
      /* Geo scopes keep applyScope's nearest-first order; the grouped
         orders are for browsing a catalogue, not a radius. */
      return def.geo ? scoped : sortForExplore(scoped, def.groupBy);
    })();
    defCache.set(key, pending);
  }
  return pending;
}

export async function countForDef(def: ExploreScopeDef): Promise<number> {
  return (await recordsForDef(def)).length;
}

/** The scope's areas (the records' own city values) with counts —
 *  what the top-of-page search offers and the explorer chips show. */
export async function areasForDef(
  def: ExploreScopeDef,
  limit?: number,
): Promise<CameraArea[]> {
  const areas = cameraAreas(await recordsForDef(def));
  return typeof limit === 'number' ? areas.slice(0, limit) : areas;
}

/** One city's records inside one country chunk, with their centroid —
 *  what the city pages use to decide whether the full explorer + route
 *  finder belong on the page, and where the route finder should aim.
 *  Null when the country isn't in the index. */
export async function cityChunkStats(
  countrySlug: string,
  cityName: string,
): Promise<{ count: number; centroid: { lat: number; lng: number } | null } | null> {
  const def = resolveExploreDef({ country: countrySlug, city: cityName });
  if (!def) return null;
  const records = await recordsForDef(def);
  const placed = records.filter(
    (r) => typeof r.lat === 'number' && typeof r.lng === 'number',
  );
  if (placed.length === 0) return { count: records.length, centroid: null };
  let lat = 0;
  let lng = 0;
  for (const r of placed) {
    lat += r.lat as number;
    lng += r.lng as number;
  }
  return {
    count: records.length,
    centroid: {
      lat: Math.round((lat / placed.length) * 10000) / 10000,
      lng: Math.round((lng / placed.length) * 10000) / 10000,
    },
  };
}
