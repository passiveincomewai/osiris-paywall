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
import { dominantPlaceRecords } from './place-neighbours';
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
  /** Name rule over the records (see ExploreScope.namePattern) —
   *  the named-place scopes (a crossing, a street) are defined by
   *  the names the cameras themselves carry. */
  namePattern?: RegExp;
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

/** A border-crossing wall: every catalogue record within `radiusKm`
 *  of the crossing point, across the chunks on both sides of the line
 *  (the Mexican chunk holds only a handful of tourist feeds, so the
 *  southern walls are honestly US-side sets; the rule states the
 *  radius, not a side). Centres and radii mirror
 *  lib/border/crossings exactly — border-pages.test.ts pins them. */
function borderGeo(
  label: string,
  foreignSlug: string,
  lat: number,
  lng: number,
  radiusKm: number,
): ExploreScopeDef {
  return {
    label,
    slugs: ['united-states', foreignSlug],
    geo: { lat, lng, radiusKm },
    groupBy: 'city',
  };
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
  /* Menu #2 Wave B (2026-10-27): the animal-cams hub wall — the
     'animals' theme rule in lib/explore-scopes (matchesAnimalCam). */
  animals: { label: 'animal webcams', slugs: 'all', theme: 'animals', groupBy: 'country' },
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
  /* Per-volcano pages (Menu #2 Wave A, Oct 2026) — the two walls the
     hub does not carry but the per-volcano registry
     (src/lib/volcanoes.ts) qualifies: Fuji (80 in range, incl. a feed
     registered at the summit point) and Bromo (a single dedicated
     volcano camera). The other candidates were measured and rejected
     — Stromboli, Popocatépetl, Colima, Taal, Mayon, Villarrica,
     Arenal, Cotopaxi and Whakaari hold ZERO catalogue cameras, and
     Hekla's only in-range records are one road junction 38.8 km out;
     the rejection pins live in src/lib/volcanoes.test.ts. */
  'event-vo-fuji': eventGeoIn('Mount Fuji', 'japan', 35.3606, 138.7274, 30),
  'event-vo-bromo': eventGeoIn('Mount Bromo', 'indonesia', -7.9425, 112.953, 30),
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
  /* Per-place aurora pages (Menu #2 Wave A, Oct 2026) — radius walls
     for the registry in src/lib/aurora-places.ts. Fairbanks and
     Reykjavík reuse the 'event-le-*' scopes above (the aurora hub
     already serves the Fairbanks wall). Measured and rejected:
     Yellowknife (0 within 40 km — the aurora hub's FAQ already
     publishes the absence), Whitehorse (2), Kiruna (2) and
     Saariselkä (2); the rejection pins live in
     src/lib/aurora-places.test.ts. */
  'aurora-anchorage': eventGeo('Anchorage', 61.2181, -149.9003, 50),
  'aurora-duluth': eventGeo('Duluth', 46.7867, -92.1005, 50),
  'aurora-marquette': eventGeo('Marquette', 46.5436, -87.3954, 50),
  'aurora-churchill': eventGeoIn('Churchill', 'canada', 58.7684, -94.165, 50),
  'aurora-akureyri': eventGeoIn('Akureyri', 'iceland', 65.6835, -18.0878, 30),
  'aurora-tromso': eventGeoIn('Tromsø', 'norway', 69.6492, 18.956, 40),
  'aurora-alta': eventGeoIn('Alta', 'norway', 69.9689, 23.2717, 40),
  'aurora-lofoten': eventGeoIn('Lofoten', 'norway', 68.2343, 14.5682, 40),
  'aurora-rovaniemi': eventGeoIn('Rovaniemi', 'finland', 66.5039, 25.7294, 40),
  'aurora-levi': eventGeoIn('Levi & Kittilä', 'finland', 67.8, 24.8, 40),
  'aurora-abisko': eventGeoIn('the Abisko corridor', 'sweden', 68.35, 18.82, 30),
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
  /* Per-airport pages (keyword wave A, Oct 2026) — one radius scope
     per airport in lib/airport-pages: every catalogue record
     within 15 km of the airport's coordinates (25 km for Denver,
     whose field sits far out on the plains — the exception is
     stated on its page). Yields are pinned in
     src/lib/airport-pages.test.ts. */
  'airport-atl': eventGeo('Atlanta airport (ATL)', 33.6367, -84.4281, 15),
  'airport-tpa': eventGeo('Tampa airport (TPA)', 27.9755, -82.5332, 15),
  'airport-yow': eventGeoIn('Ottawa airport (YOW)', 'canada', 45.3225, -75.6692, 15),
  'airport-dal': eventGeo('Dallas airport (DAL)', 32.8471, -96.8518, 15),
  'airport-pdx': eventGeo('Portland airport (PDX)', 45.5887, -122.5975, 15),
  'airport-msp': eventGeo('Minneapolis airport (MSP)', 44.8848, -93.2223, 15),
  'airport-fll': eventGeo('Fort Lauderdale airport (FLL)', 26.0726, -80.1527, 15),
  'airport-sgn': eventGeoIn('Ho Chi Minh City airport (SGN)', 'vietnam', 10.8188, 106.652, 15),
  'airport-slc': eventGeo('Salt Lake City airport (SLC)', 40.7884, -111.9778, 15),
  'airport-mia': eventGeo('Miami airport (MIA)', 25.7959, -80.287, 15),
  'airport-las': eventGeo('Las Vegas airport (LAS)', 36.084, -115.1537, 15),
  'airport-mco': eventGeo('Orlando airport (MCO)', 28.4312, -81.3081, 15),
  'airport-pus': eventGeoIn('Busan airport (PUS)', 'south-korea', 35.1796, 128.9382, 15),
  'airport-dfw': eventGeo('Dallas airport (DFW)', 32.8998, -97.0403, 15),
  'airport-lga': eventGeo('New York airport (LGA)', 40.7769, -73.874, 15),
  'airport-hkg': eventGeoIn('Hong Kong airport (HKG)', 'hong-kong', 22.3089, 113.9144, 15),
  'airport-tsa': eventGeoIn('Taipei airport (TSA)', 'taiwan', 25.0694, 121.5517, 15),
  'airport-sea': eventGeo('Seattle airport (SEA)', 47.4502, -122.3088, 15),
  'airport-yqb': eventGeoIn('Québec City airport (YQB)', 'canada', 46.7911, -71.3933, 15),
  'airport-yyc': eventGeoIn('Calgary airport (YYC)', 'canada', 51.1215, -114.0076, 15),
  'airport-yyz': eventGeoIn('Toronto airport (YYZ)', 'canada', 43.6777, -79.6248, 15),
  'airport-sat': eventGeo('San Antonio airport (SAT)', 29.5337, -98.4698, 15),
  'airport-dca': eventGeo('Washington airport (DCA)', 38.8521, -77.0377, 15),
  'airport-yvr': eventGeoIn('Vancouver airport (YVR)', 'canada', 49.1947, -123.179, 15),
  'airport-hou': eventGeo('Houston airport (HOU)', 29.6454, -95.2789, 15),
  'airport-ncl': eventGeoIn('Newcastle airport (NCL)', 'united-kingdom', 55.0375, -1.6917, 15),
  'airport-gmp': eventGeoIn('Seoul airport (GMP)', 'south-korea', 37.5586, 126.7906, 15),
  'airport-orf': eventGeo('Norfolk airport (ORF)', 36.8946, -76.2012, 15),
  'airport-iah': eventGeo('Houston airport (IAH)', 29.9902, -95.3368, 15),
  'airport-sna': eventGeo('Orange County airport (SNA)', 33.6757, -117.8682, 15),
  'airport-itm': eventGeoIn('Osaka airport (ITM)', 'japan', 34.7855, 135.438, 15),
  'airport-oak': eventGeo('Oakland airport (OAK)', 37.7213, -122.2208, 15),
  'airport-phx': eventGeo('Phoenix airport (PHX)', 33.4373, -112.0078, 15),
  'airport-yul': eventGeoIn('Montréal airport (YUL)', 'canada', 45.4706, -73.7408, 15),
  'airport-ont': eventGeo('Ontario airport (ONT)', 34.056, -117.6012, 15),
  'airport-jfk': eventGeo('New York airport (JFK)', 40.6399, -73.7787, 15),
  'airport-sjc': eventGeo('San José airport (SJC)', 37.3626, -121.9291, 15),
  'airport-mad': eventGeoIn('Madrid airport (MAD)', 'spain', 40.4936, -3.5668, 15),
  'airport-stl': eventGeo('St Louis airport (STL)', 38.7487, -90.37, 15),
  'airport-bna': eventGeo('Nashville airport (BNA)', 36.1263, -86.6774, 15),
  'airport-syd': eventGeoIn('Sydney airport (SYD)', 'australia', -33.9399, 151.1753, 15),
  'airport-san': eventGeo('San Diego airport (SAN)', 32.7336, -117.1897, 15),
  'airport-mke': eventGeo('Milwaukee airport (MKE)', 42.9472, -87.8966, 15),
  'airport-hnl': eventGeo('Honolulu airport (HNL)', 21.3187, -157.9225, 15),
  'airport-ind': eventGeo('Indianapolis airport (IND)', 39.7173, -86.2944, 15),
  'airport-aus': eventGeo('Austin airport (AUS)', 30.1945, -97.6699, 15),
  'airport-lax': eventGeo('Los Angeles airport (LAX)', 33.9425, -118.4081, 15),
  'airport-buf': eventGeo('Buffalo airport (BUF)', 42.9405, -78.7322, 15),
  'airport-lhr': eventGeoIn('London airport (LHR)', 'united-kingdom', 51.47, -0.4543, 15),
  'airport-rno': eventGeo('Reno airport (RNO)', 39.4991, -119.7681, 15),
  'airport-den': eventGeo('Denver airport (DEN)', 39.8561, -104.6737, 25),
  /* National park walls (Oct 2026) — one radius wall per US national
     park the catalogue can honestly back. Registry, copy, counts
     reconciliation and the gap list live in src/lib/national-parks.ts
     (+ .test.ts). Each centre is the point the park page names: the
     park's own ground, its entrance, or its gateway settlement. */
  'park-yellowstone': eventGeo('Yellowstone National Park', 44.73, -110.55, 55),
  'park-grand-canyon': eventGeo('Grand Canyon National Park', 36.0619, -112.1077, 25),
  'park-yosemite': eventGeo('Yosemite National Park', 37.7459, -119.5932, 15),
  'park-rocky-mountain': eventGeo('Rocky Mountain National Park', 40.3428, -105.6881, 15),
  'park-redwood': eventGeo('Redwood National and State Parks', 41.4, -124.03, 45),
  'park-haleakala': eventGeo('Haleakalā National Park', 20.701, -156.173, 15),
  'park-acadia': eventGeo('Acadia National Park', 44.3386, -68.2733, 15),
  'park-denali': eventGeo('Denali National Park entrance district', 63.728, -148.887, 25),
  'park-glacier-bay': eventGeo('Gustavus, Glacier Bay gateway', 58.413, -135.727, 10),
  'park-isle-royale': eventGeo('Isle Royale National Park', 48.12, -88.55, 15),
  'park-crater-lake': eventGeo('Crater Lake National Park', 42.9446, -122.109, 25),
  'park-mount-rainier': eventGeo('Mount Rainier National Park', 46.786, -121.735, 25),
  'park-grand-teton': eventGeo('Grand Teton National Park', 43.6073, -110.7374, 15),
  'park-kenai-fjords': eventGeo('Seward, Kenai Fjords gateway', 60.104, -149.442, 15),
  'park-virgin-islands': eventGeoIn('Virgin Islands National Park', 'us-virgin-islands', 18.342, -64.768, 15),
  'park-hawaii-volcanoes': eventGeo('Hawaiʻi Volcanoes National Park', 19.4069, -155.2834, 30),
  'park-zion': eventGeo('Zion National Park', 37.2982, -113.0263, 25),
  'park-arches': eventGeo('Arches National Park', 38.7331, -109.5925, 25),
  'park-bryce-canyon': eventGeo('Bryce Canyon National Park', 37.6284, -112.1676, 25),
  'park-black-canyon': eventGeo('Black Canyon of the Gunnison National Park', 38.5746, -107.7416, 25),
  'park-shenandoah': eventGeo('Shenandoah National Park', 38.473, -78.452, 40),
  'park-olympic': eventGeo('Olympic National Park', 47.9694, -123.4968, 25),

  /* Border crossings (2026-10-27) — one wall per /border-crossings
     page. Centre + radius are the crossing registry's own numbers
     (lib/border/crossings); the page quotes countForDef over the
     same rule its grid serves. */
  'border-san-ysidro': borderGeo('San Ysidro crossing, San Diego', 'mexico', 32.542, -117.03, 10),
  'border-otay-mesa': borderGeo('Otay Mesa crossing, San Diego', 'mexico', 32.5503, -116.9728, 10),
  'border-calexico': borderGeo('Calexico crossing, California', 'mexico', 32.6649, -115.4955, 15),
  'border-nogales': borderGeo('Nogales crossing, Arizona', 'mexico', 31.3334, -110.9457, 10),
  'border-el-paso': borderGeo('El Paso crossings, Texas', 'mexico', 31.7577, -106.4889, 12),
  'border-del-rio': borderGeo('Del Rio crossing, Texas', 'mexico', 29.357, -100.92, 10),
  'border-eagle-pass': borderGeo('Eagle Pass crossings, Texas', 'mexico', 28.707, -100.51, 10),
  'border-laredo': borderGeo('Laredo crossings, Texas', 'mexico', 27.4966, -99.509, 12),
  'border-hidalgo-pharr': borderGeo('Hidalgo & Pharr crossings, Texas', 'mexico', 26.0947, -98.2668, 15),
  'border-progreso': borderGeo('Progreso crossing, Texas', 'mexico', 26.087, -97.955, 15),
  'border-brownsville': borderGeo('Brownsville crossings, Texas', 'mexico', 25.899, -97.499, 15),
  'border-blaine': borderGeo('Blaine crossings, Washington', 'canada', 49.0022, -122.7567, 12),
  'border-lynden': borderGeo('Lynden crossing, Washington', 'canada', 49.0, -122.485, 12),
  'border-sumas': borderGeo('Sumas crossing, Washington', 'canada', 49.0023, -122.2657, 12),
  'border-pembina': borderGeo('Pembina crossing, North Dakota', 'canada', 49.0, -97.237, 10),
  'border-international-falls': borderGeo('International Falls crossing, Minnesota', 'canada', 48.6, -93.41, 12),
  'border-sault-ste-marie': borderGeo('Sault Ste. Marie crossing, Michigan', 'canada', 46.5067, -84.36, 25),
  'border-port-huron': borderGeo('Port Huron crossing, Michigan', 'canada', 42.9987, -82.4235, 12),
  'border-detroit': borderGeo('Detroit–Windsor crossings, Michigan', 'canada', 42.3119, -83.0739, 12),
  'border-buffalo': borderGeo('Peace Bridge crossing, Buffalo', 'canada', 42.9069, -78.9056, 12),
  'border-niagara-falls': borderGeo('Niagara Falls crossings, New York', 'canada', 43.09, -79.07, 12),
  'border-alexandria-bay': borderGeo('Thousand Islands crossing, New York', 'canada', 44.3474, -75.9887, 10),
  'border-champlain': borderGeo('Champlain crossing, New York', 'canada', 45.0, -73.45, 10),
  'border-derby-line': borderGeo('Derby Line crossing, Vermont', 'canada', 45.0055, -72.11, 10),
  'border-houlton': borderGeo('Houlton crossing, Maine', 'canada', 47.12, -67.79, 15),

  /* Surf & beach spot walls (keyword wave B, Oct 2026) — one 12 km
     radius scope per spot in lib/surf-spots, the stated rule of the
     /surf-webcams hub, the /surf-webcams/[spot] pages and the
     /beach-webcams/[spot] pages. A wall is the surf town on camera —
     beach-named feeds where the catalogue has them, the town's road
     and corridor feeds where it does not; the pages describe the
     actual mix and never present a wall as a surf forecast. Yields
     reconciled against the raw chunks in lib/surf-page-scopes.test
     (Haeundae 184 is the family's fullest wall; the thinnest,
     Santa Cruz, states its 15 as it is). */
  'surf-haeundae': eventGeoIn('Haeundae, Busan', 'south-korea', 35.1631, 129.1636, 12),
  'surf-waikiki': eventGeoIn('Waikiki & Honolulu', 'united-states', 21.2793, -157.8385, 12),
  'surf-bondi': eventGeoIn('Bondi Beach, Sydney', 'australia', -33.8915, 151.2767, 12),
  'surf-encinitas': eventGeoIn('Encinitas & Cardiff', 'united-states', 33.037, -117.292, 12),
  'surf-kamakura': eventGeoIn('Kamakura & Shonan', 'japan', 35.3192, 139.5469, 12),
  'surf-manly': eventGeoIn('Manly, Sydney', 'australia', -33.7969, 151.2869, 12),
  'surf-new-smyrna-beach': eventGeoIn('New Smyrna Beach', 'united-states', 29.0258, -80.9274, 12),
  'surf-huntington-beach': eventGeoIn('Huntington Beach', 'united-states', 33.6595, -117.9988, 12),
  'surf-la-jolla': eventGeoIn('La Jolla', 'united-states', 32.8328, -117.2713, 12),
  'surf-san-clemente': eventGeoIn('San Clemente', 'united-states', 33.4274, -117.612, 12),
  'surf-ichinomiya': eventGeoIn('Ichinomiya & the Chiba coast', 'japan', 35.373, 140.385, 12),
  'surf-surfers-paradise': eventGeoIn('Surfers Paradise & the Gold Coast', 'australia', -28.0023, 153.4294, 12),
  'surf-santa-cruz': eventGeoIn('Santa Cruz', 'united-states', 36.9517, -122.026, 12),
  'beach-laguna-beach': eventGeoIn('Laguna Beach', 'united-states', 33.5427, -117.7854, 12),
  'beach-miami-beach': eventGeoIn('Miami Beach', 'united-states', 25.7907, -80.13, 12),
  'beach-newport-beach': eventGeoIn('Newport Beach', 'united-states', 33.6189, -117.9298, 12),
  'beach-daytona-beach': eventGeoIn('Daytona Beach', 'united-states', 29.2108, -81.0228, 12),
  'beach-virginia-beach': eventGeoIn('Virginia Beach', 'united-states', 36.8529, -75.978, 12),
  'beach-galveston': eventGeoIn('Galveston', 'united-states', 29.3013, -94.7977, 12),
  'beach-myrtle-beach': eventGeoIn('Myrtle Beach', 'united-states', 33.6959, -78.88, 12),
  'beach-palma': eventGeoIn('Palma & Mallorca’s south coast', 'spain', 39.5696, 2.6502, 12),
  'beach-santa-monica': eventGeoIn('Santa Monica', 'united-states', 34.0095, -118.4912, 12),

  /* Railfan walls (keyword wave B, Oct 2026) — the /train-webcams
     family in lib/railfan-places. Two scope shapes:
     - 'rail-named': the worldwide wall — every catalogue record whose
       own name says railway (the 'rail' theme in lib/explore-scopes,
       guards included). 393 records over the 2026-10-20 catalogue.
     - 'rail-<slug>': one 15 km radius wall per place in the registry,
       the stated rule of every place page — every camera in range,
       with the page counting how many of them name a railway.
     A place earns a wall only with a genuine cluster behind it
     (total ≥ 15 within 15 km AND rail-named ≥ 2, or a dedicated rail
     anchor camera): the famous rail towns the catalogue cannot back
     (Tehachapi 4, Rochelle 0, Folkston 3 at this radius) have no page
     and the hub names them as gaps. Yields are reconciled against the
     raw chunks in lib/railfan-page-scopes.test.ts. */
  'rail-named': { label: 'cameras that name a railway', slugs: 'all', theme: 'rail', groupBy: 'country' },
  'rail-tokyo': eventGeoIn('Tokyo Station & the city stations', 'japan', 35.6812, 139.7671, 15),
  'rail-osaka': eventGeoIn('Shin-Osaka & the Tōkaidō Shinkansen', 'japan', 34.7335, 135.5003, 15),
  'rail-nagoya': eventGeoIn('Nagoya Station & the Shōnai River bridges', 'japan', 35.1709, 136.8815, 15),
  'rail-hiroshima': eventGeoIn('Hiroshima Station', 'japan', 34.3976, 132.4756, 15),
  'rail-sapporo': eventGeoIn('Sapporo Station', 'japan', 43.0686, 141.3508, 15),
  'rail-ichikawa': eventGeoIn('Ichikawa Station', 'japan', 35.7321, 139.9086, 15),
  'rail-tsu': eventGeoIn('Tsu & the Nakamura River crossings', 'japan', 34.639, 136.476, 15),
  'rail-ise': eventGeoIn('Ise & the Miyagawa bridges', 'japan', 34.502, 136.684, 15),
  'rail-anjo': eventGeoIn('Anjō & the Tōkaidō corridor', 'japan', 34.9197, 137.1079, 15),
  'rail-busan': eventGeoIn('Busan Station', 'south-korea', 35.1151, 129.0414, 15),
  'rail-incheon': eventGeoIn('Incheon’s station junctions', 'south-korea', 37.4767, 126.6326, 15),
  'rail-yuen-long': eventGeoIn('Yuen Long & the Light Rail', 'hong-kong', 22.4456, 114.0349, 15),
  'rail-ershui': eventGeoIn('Ershui & the Zhuoshui River bridges', 'taiwan', 23.8133, 120.6178, 15),
  'rail-lincoln': eventGeo('Lincoln, Nebraska — BNSF', 40.8136, -96.7026, 15),

  /* Iconic places (Menu #2 Wave A part 2, Oct 2026) — the
   * /iconic-places family in lib/iconic-places. A famous crossing or
   * street earns a scope only where a camera's own name or its
   * position ON the place frames it; a camera merely in the same
   * city never qualifies. The sets are therefore NAME rules, not
   * radius walls: exactly the records whose own name is the place,
   * with a geo bound only where the name is shared (Duval is a
   * street name in several states; Las Vegas Blvd runs far past the
   * Strip). Yields reconciled against the raw chunks in
   * lib/iconic-places.test.ts: Shibuya 2, the Strip 26, Duval 1,
   * Kalākaua 6. Measured and rejected (zero qualifying cameras):
   * Times Square, Abbey Road, Bourbon Street, Ocean Drive, Pier 39,
   * Rodeo Drive, Lombard Street — the hub page names them. */
  'iconic-shibuya-crossing': {
    label: 'Shibuya Scramble Crossing, Tokyo',
    slugs: ['japan'],
    namePattern: /shibuya scramble crossing/i,
    groupBy: 'city',
  },
  'iconic-las-vegas-strip': {
    label: 'the Las Vegas Strip',
    slugs: ['united-states'],
    namePattern: /las vegas blvd/i,
    geo: { lat: 36.1123, lng: -115.17, radiusKm: 3.8 },
    groupBy: 'city',
  },
  'iconic-duval-street': {
    label: 'Duval Street, Key West',
    slugs: ['united-states'],
    namePattern: /\bduval\b/i,
    geo: { lat: 24.5511, lng: -81.7992, radiusKm: 0.35 },
    groupBy: 'city',
  },
  'iconic-kalakaua-avenue': {
    label: 'Kalākaua Avenue, Waikiki',
    slugs: ['united-states'],
    namePattern: /kalakaua/i,
    groupBy: 'city',
  },

  /* Launch sites (Menu #2 Wave A part 2, Oct 2026) — the
   * /launch-sites family in lib/launch-sites. One wall qualifies:
   * the Space Coast's road network within 25 km of the Banana River
   * midpoint between Kennedy Space Center and Cape Canaveral SFS
   * (27 FDOT cameras — SR-528 Beachline, SR-405, SR-520, I-95; the
   * nearest stands 13.1 km from the centre, because the pads are
   * closed federal ground and no catalogue camera stands on either
   * centre). The page pairs the wall with the live Launch Library 2
   * board filtered to the site's pads. Measured and rejected:
   * Starbase (no camera names it; one SH 100 highway cam 9.9 km
   * away), Vandenberg (0 within 10 km), Wallops (0 within 10 km,
   * 1 junction cam within 25 km) — the rejection pins live in
   * lib/launch-sites.test.ts. */
  'launch-kennedy': eventGeo('Kennedy Space Center & Cape Canaveral', 28.52, -80.5955, 25),
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
      if (params.theme !== 'traffic' && params.theme !== 'coast' && params.theme !== 'airport' && params.theme !== 'rail' && params.theme !== 'animals') {
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
  return `${slugs}|${def.theme ?? ''}|${def.namePattern?.source ?? ''}|${def.city ?? ''}|${geo}|${def.groupBy}`;
}

/**
 * The dominant place's records within one exact city-name group — the
 * set a city page owns (owner decision, 2026-10-27). A name can be
 * filed by publishers for two real places (Marysville WA + Marysville
 * CA); the page's grid, quoted count, breakdowns and featured lists all
 * follow the dominant cluster (see dominantPlaceRecords in
 * place-neighbours.ts for the split rule). Records without coordinates
 * cannot be assigned to either place and are kept — dropping data we
 * cannot judge would be worse than keeping it. Returns the input array
 * itself when the name describes a single place, so unsplit pages are
 * untouched (same records, same order).
 */
export function dominantCitySet(records: CountryCamera[]): CountryCamera[] {
  const placed = records.filter(
    (r): r is CountryCamera & { lat: number; lng: number } =>
      typeof r.lat === 'number' && typeof r.lng === 'number',
  );
  if (placed.length < 2) return records;
  const owned = new Set<CountryCamera>(dominantPlaceRecords(placed));
  if (owned.size === placed.length) return records;
  return records.filter(
    (r) => typeof r.lat !== 'number' || typeof r.lng !== 'number' || owned.has(r),
  );
}

/** The scope's records, theme/city-filtered and in page order. */
export function recordsForDef(def: ExploreScopeDef): Promise<CountryCamera[]> {
  const key = defKey(def);
  let pending = defCache.get(key);
  if (!pending) {
    pending = (async () => {
      const base =
        def.slugs === 'all' ? await loadAllRecords() : await loadUnion(def.slugs);
      const scope: ExploreScope = {
        theme: def.theme,
        namePattern: def.namePattern,
        city: def.city,
        geo: def.geo,
      };
      /* City defs own their dominant place: reduce the exact-name
         group to its dominant cluster BEFORE the theme filter, so
         every consumer of a city def (grid, counts, breakdowns) sees
         the same owned set. City defs never carry a geo scope. */
      const cityBase = def.city
        ? dominantCitySet(applyScope(base, { city: def.city }))
        : base;
      const scoped = applyScope(cityBase, scope);
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
  /* The records are already the dominant place's set (recordsForDef
     reduces city defs), so the count and the grid describe the same
     cameras. The centroid re-applies dominantPlaceRecords to that
     owned set — a no-op safeguard that keeps the point on the place
     even if the set reduction above ever changes. Unsplit names are
     untouched. */
  const placed = dominantPlaceRecords(
    records.filter(
      (r): r is CountryCamera & { lat: number; lng: number } =>
        typeof r.lat === 'number' && typeof r.lng === 'number',
    ),
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
