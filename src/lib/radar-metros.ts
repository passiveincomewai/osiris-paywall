/**
 * OSIRIS — the per-metro weather radar registry (Menu #2 Wave C part 2,
 * Oct 2026). One row per US metro with a page under /weather-radar.
 *
 * The radar itself is NOT a WorldEye feed: every frame is the NOAA/NWS
 * nowCOAST NEXRAD base-reflectivity mosaic — the exact WMS service the
 * globe's radar layer serves (src/lib/noaa-radar.ts) — requested here
 * as a single GetMap snapshot for the metro's window instead of tiles.
 * NOAA nowCOAST is US public domain and keyless; credit is
 * "Radar © NOAA/NWS nowCOAST", as on the globe. The mosaic covers
 * CONUS, Alaska, Hawaii, the Caribbean and Guam, so this family is
 * US metros only.
 *
 * Admission rule (uniform, stated on the hub): a metro qualifies when
 * at least 250 catalogue cameras stand within 30 km of the metro
 * camera cluster's centre. The centre is measured, not gazetteered:
 * the centroid of the catalogue records within 30 km of the metro's
 * seed point, recomputed once (two-pass). Yields were measured over
 * the committed US chunk (src/data/countries/united-states.json) on
 * 2026-10-28 with the repo's own scope code; radar-metros.test.ts
 * reconciles every wall against the raw chunk with its own haversine
 * and pins the rejected candidates under the line.
 *
 * Why the audit runs on radius yields, not city names: the catalogue
 * files cameras under whatever place name the publisher used, so
 * exact-name sets mislead in both directions — Atlanta (the country's
 * largest cluster, 1,864 within 30 km) has NO exact-name city set at
 * all (its cameras are filed under suburb names), Dallas and Houston
 * have no city pages yet hold 700-strong clusters, while "Arlington"
 * resolves to a 3-record dominant set in Tennessee and Tuscaloosa's
 * directory count describes records filed at other places (1 record
 * within 35 km of Tuscaloosa itself). A radius around a measured
 * centre is the only rule that means the same thing for every metro.
 *
 * Measured headroom: 41 metros clear 100 cameras at 30 km; the family
 * ships the 21 that clear 250. (St. Louis measured 249 from its seed
 * point and 257 from its committed cluster centre — the centre is
 * the rule's point, so it qualifies; the episode is a reminder that
 * the audit measures at the committed centre, never the seed.)
 * Rejected at the line (30 km yields at their cluster centres,
 * Oct 2026, all pinned in the tests): Chicago 220,
 * El Paso 225, Austin 223, Boise 219, San Diego 219, Pittsburgh 213,
 * Indianapolis 196, Hartford 184, Raleigh 183, Charlotte 179,
 * Milwaukee 177, Rochester (NY) 163, Baltimore 160, Nashville 156,
 * Columbia (SC) 153, Sacramento 151, Honolulu 128, Reno 121,
 * Memphis 112, Buffalo 110, Richmond 105 — and under 100: Oklahoma
 * City 89, Grand Rapids 93, Baton Rouge 93, Knoxville 87,
 * Albuquerque 89, Greenville (SC) 88, Charleston (SC) 78, Spokane 71,
 * Omaha 68, Beaumont 68, Anchorage 61, Fresno 58, Fargo 56,
 * Eugene 53, New Orleans 47, Tulsa 48, Corpus Christi 46,
 * Colorado Springs 44, Bend 42, Tucson 35. Rejected on place
 * evidence at any radius: Arlington (name resolves to Tennessee),
 * Columbus (11 records, split places), Des Moines (1 record in the
 * chunk), Tuscaloosa 1, Lexington 1, Wichita 5, Little Rock 0,
 * Birmingham 0, Mobile 0.
 */

import { radarFrameIso } from "./noaa-radar";

export interface RadarMetro {
  slug: string;
  /** Display name, e.g. "Dallas–Fort Worth". */
  name: string;
  /** State display, e.g. "Texas". */
  state: string;
  /** Camera-cluster centre — measured, see the header. */
  lat: number;
  lng: number;
  /** The wall's radius: every catalogue camera within this of the centre. */
  radiusKm: 30;
  /** IANA timezone of the metro. */
  tz: string;
  /** EXPLORE_SCOPES key of this metro's wall. */
  scopeKey: string;
  /** City-page links that verifiably exist (checked against
   *  src/data/city-pages.json at audit time); empty where the metro
   *  has no city page (Atlanta, Dallas, Houston, Las Vegas,
   *  Salt Lake City, Minneapolis, Orlando, Portland, Tampa,
   *  Kansas City, Jacksonville — their clusters live under suburb
   *  and corridor names, which is why they had no city page). */
  cityLinks: Array<{ label: string; href: string }>;
  /** One grounded sentence about watching this metro's weather. */
  note: string;
}

const M = (
  slug: string,
  name: string,
  state: string,
  lat: number,
  lng: number,
  tz: string,
  cityLinks: Array<{ label: string; href: string }>,
  note: string,
): RadarMetro => ({
  slug,
  name,
  state,
  lat,
  lng,
  radiusKm: 30,
  tz,
  scopeKey: `radar-${slug}`,
  cityLinks,
  note,
});

const city = (label: string, slug: string) => ({
  label,
  href: `/city-webcams/${slug}`,
});

export const RADAR_METROS: RadarMetro[] = [
  M("atlanta", "Atlanta", "Georgia", 33.7983, -84.3656, "America/New_York", [],
    "Atlanta's camera field is the densest in the catalogue — over eighteen hundred feeds filed under the metro's suburb names — and its weather is the Southeast's crossroads: Gulf moisture, Appalachian outflow and summer pop-up storms over a sprawling freeway web."),
  M("dallas", "Dallas–Fort Worth", "Texas", 32.8116, -96.8578, "America/Chicago", [],
    "The wall's centre sits in the mid-cities between the two downtowns, which is where the Metroplex's camera field actually balances. North Texas weather turns fast — supercells and flash flooding are the radar's regular subjects here."),
  M("salt-lake-city", "Salt Lake City", "Utah", 40.6621, -111.9113, "America/Denver", [],
    "The Wasatch Front's cameras run the length of the valley floor under the range. Lake-effect snow bands off the Great Salt Lake are the local radar speciality — narrow, intense and visible on the mosaic long before they reach a given neighbourhood."),
  M("houston", "Houston", "Texas", 29.7792, -95.419, "America/Chicago", [],
    "Houston's cluster is a Gulf Coast network: bayou flooding is the city's defining weather risk, and the radar's slow-moving summer storm cells over the Ship Channel and the bayous are the frames that matter."),
  M("minneapolis", "Minneapolis–Saint Paul", "Minnesota", 44.9621, -93.2426, "America/Chicago", [],
    "The Twin Cities' camera field balances between the two downtowns across the Mississippi. Its radar year runs from spring severe lines to the clipper systems and river-valley snow bands of a long winter."),
  M("orlando", "Orlando", "Florida", 28.5247, -81.4085, "America/New_York", [],
    "Central Florida is the lightning capital's home turf: sea-breeze collisions from both coasts meet over the peninsula interior, and the daily summer cell outbreak is visible on this frame most afternoons of the season."),
  M("portland", "Portland", "Oregon", 45.4995, -122.6681, "America/Los_Angeles", [],
    "Portland's cameras line the Willamette where it meets the Columbia. The radar's local story is the Pacific storm train — long frontal rain bands — and, in winter, the gorge outflow events that ice the east side first."),
  M("seattle", "Seattle", "Washington", 47.62, -122.253, "America/Los_Angeles",
    [city("Seattle city webcams", "seattle")],
    "Puget Sound's convergence zone parks rain bands over one half of the metro while the other stays dry — the radar frame shows the line, and the wall shows which side of it each camera is standing in."),
  M("tampa", "Tampa", "Florida", 27.9738, -82.4826, "America/New_York", [],
    "Tampa Bay's wall circles the bay the metro is named for. Gulf sea-breeze storms are the daily summer show, and the tropical frames — feeder bands arriving ahead of a Gulf system — are the ones the whole coast watches."),
  M("washington-dc", "Washington, DC", "District of Columbia", 38.886, -77.1659, "America/New_York",
    [city("Washington, DC city webcams", "washington-dc")],
    "The capital's wall reaches across the District line into the Maryland and Virginia suburbs its cameras actually stand in — the same circle the afternoon thunderstorm cells cross on their way down the Potomac."),
  M("new-york-city", "New York City", "New York", 40.7591, -73.7688, "America/New_York",
    [city("Queens webcams", "queens"), city("Bronx webcams", "bronx"), city("Staten Island webcams", "staten-island")],
    "The five boroughs' cameras sit inside one 30 km circle centred on the East River side of the city. Sea-breeze fronts, nor'easters and summer cell trains all read clearly at this scale."),
  M("denver", "Denver", "Colorado", 39.7139, -105.029, "America/Denver",
    [city("Denver city webcams", "denver")],
    "Denver's wall runs from the foothills across the plains edge. The metro's signature radar picture is the afternoon thunderstorm line building over the Front Range and rolling east — and in winter, the upslope snow band against the hills."),
  M("philadelphia", "Philadelphia", "Pennsylvania", 40.0522, -75.2195, "America/New_York",
    [city("Philadelphia city webcams", "philadelphia")],
    "Philadelphia's circle takes in the Delaware River corridor both ways. Tropical remnants tracking up the coast and summer cells drifting off the Poconos are its recurring radar stories."),
  M("las-vegas", "Las Vegas", "Nevada", 36.1213, -115.1698, "America/Los_Angeles", [],
    "A desert valley ringed by ranges: most days the mosaic is empty sky, which is exactly why the monsoon-season frames matter — flash-flood cells over the valley floor show up here while the Strip is still dry."),
  M("los-angeles", "Los Angeles", "California", 34.0037, -118.2236, "America/Los_Angeles",
    [city("Los Angeles city webcams", "los-angeles")],
    "Los Angeles radar is a winter subject: Pacific storm trains and atmospheric rivers crossing the basin. The wall's centre sits over the basin's camera balance point, with the coastal and valley networks inside one frame."),
  M("kansas-city", "Kansas City", "Missouri & Kansas", 39.0485, -94.6138, "America/Chicago", [],
    "Two states, one camera field, centred where the Missouri and Kansas rivers meet. Kansas City sits in the severe-weather corridor — the supercell lines that cross this frame are the Plains' headline weather."),
  M("norfolk-virginia-beach", "Norfolk–Virginia Beach", "Virginia", 36.867, -76.2905, "America/New_York",
    [city("Virginia Beach city webcams", "virginia-beach"), city("Norfolk city webcams", "norfolk")],
    "Hampton Roads' cameras guard the harbour mouths and the bridge-tunnels. Coastal storms and nor'easters arrive off the Atlantic over this frame — and the wall shows the crossings they close."),
  M("phoenix", "Phoenix", "Arizona", 33.4741, -112.0221, "America/Phoenix",
    [city("Phoenix city webcams", "phoenix")],
    "The Valley of the Sun's radar year has two seasons: long clear stretches, then monsoon outflows — dust walls and cell clusters that the mosaic catches forming over the surrounding desert before they cross the suburbs."),
  M("san-antonio", "San Antonio", "Texas", 29.4792, -98.5024, "America/Chicago",
    [city("San Antonio city webcams", "san-antonio")],
    "San Antonio sits at the edge of Flash Flood Alley, where Hill Country creeks drain through the city. Slow Gulf cells stalling over the Balcones Escarpment are the frames to watch."),
  M("jacksonville", "Jacksonville", "Florida", 30.2943, -81.6743, "America/New_York", [],
    "Jacksonville's wall spans the St. Johns River where it bends toward the sea. Sea-breeze storms are the summer routine; the tropical frames, when a system rides the coast, are watched by the whole First Coast."),
  M("st-louis", "St. Louis", "Missouri", 38.6573, -90.3524, "America/Chicago",
    [city("St. Louis city webcams", "st-louis")],
    "St. Louis made the family by seven cameras — the tightest margin in the set, measured at its cluster centre north of downtown. Midwestern storm lines arrive off the Missouri plains, and the winter pattern to learn is the rain–snow line stalling over the metro."),
];

const BY_SLUG = new Map(RADAR_METROS.map((m) => [m.slug, m]));

export function radarMetroBySlug(slug: string): RadarMetro | null {
  return BY_SLUG.get(slug) ?? null;
}

/* ------------------------------------------------------------------ */
/* NOAA nowCOAST snapshot (the globe layer's WMS, one frame)           */
/* ------------------------------------------------------------------ */

/** The WMS endpoint + layer the globe's tiles use (lib/noaa-radar). */
export const RADAR_WMS_ENDPOINT =
  "https://nowcoast.noaa.gov/geoserver/observations/weather_radar/ows";
export const RADAR_WMS_LAYER = "base_reflectivity_mosaic";
/** Credit line rendered wherever a snapshot appears. */
export const RADAR_CREDIT = "Radar © NOAA/NWS nowCOAST";

/** Snapshot image size (4:3) for metro pages and the hub's CONUS frame. */
export const RADAR_SNAPSHOT_WIDTH = 1200;
export const RADAR_SNAPSHOT_HEIGHT = 900;

/** Vertical half-extent of a metro frame: the wall's 30 km radius,
 *  so the circle the count comes from is inscribed in the frame. */
export const RADAR_FRAME_HALF_HEIGHT_KM = 30;

const WEB_MERCATOR_R = 6378137;

export function toWebMercator(lat: number, lng: number): { x: number; y: number } {
  const rad = (d: number) => (d * Math.PI) / 180;
  return {
    x: WEB_MERCATOR_R * rad(lng),
    y: WEB_MERCATOR_R * Math.log(Math.tan(Math.PI / 4 + rad(lat) / 2)),
  };
}

/**
 * A single-frame WMS GetMap URL for the nowCOAST mosaic over a
 * centre point — the same service, layer, time discipline (frame
 * floored to the 5-minute step) and transparency as the globe's tile
 * URLs in lib/noaa-radar, with a fixed EPSG:3857 bbox instead of a
 * tile bbox. `halfHeightKm` sets the vertical half-extent; the
 * horizontal extent follows the image aspect.
 */
export function radarSnapshotUrl(opts: {
  lat: number;
  lng: number;
  halfHeightKm?: number;
  width?: number;
  height?: number;
  frameIso?: string;
}): string {
  const width = opts.width ?? RADAR_SNAPSHOT_WIDTH;
  const height = opts.height ?? RADAR_SNAPSHOT_HEIGHT;
  const halfH = (opts.halfHeightKm ?? RADAR_FRAME_HALF_HEIGHT_KM) * 1000;
  const halfW = halfH * (width / height);
  const { x, y } = toWebMercator(opts.lat, opts.lng);
  const bbox = [x - halfW, y - halfH, x + halfW, y + halfH]
    .map((v) => Math.round(v * 10) / 10)
    .join(",");
  const frame = opts.frameIso ?? radarFrameIso();
  return (
    `${RADAR_WMS_ENDPOINT}?service=WMS&version=1.3.0&request=GetMap` +
    `&layers=${RADAR_WMS_LAYER}&styles=&format=image/png&transparent=true` +
    `&width=${width}&height=${height}&crs=EPSG:3857&time=${frame}&bbox=${bbox}`
  );
}

/** The hub's continental frame: CONUS centre, wide half-height. */
export const CONUS_FRAME = { lat: 39.5, lng: -98.35, halfHeightKm: 1450 };
