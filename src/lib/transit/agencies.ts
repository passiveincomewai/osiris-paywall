/**
 * OSIRIS — Live Transit agency config (GTFS-Realtime vehicle positions).
 *
 * v1 includes ONLY feeds verified keyless from their official source /
 * the Mobility Database catalog (auth type 0), and re-verified live while
 * building this layer. Adding an agency is a one-line entry here.
 *
 * Dropped from v1 (need keys or were unreachable at build time — future
 * adds once a key/flow exists):
 *   • OC Transpo (Ottawa) — Mobility Database lists an API key (auth 1).
 *   • HSL / Digitransit (Helsinki) — realtime endpoints moved behind
 *     Digitransit's subscription key.
 *   • TTC (Toronto) + Grand River Transit (Waterloo) — catalog says
 *     keyless, but both hosts refused connections from the build
 *     sandbox; enable after a production-side reachability check.
 *
 * Mode colors come from `defaultMode` + `routeModeRules` (first match on
 * route_id wins). Rules are grounded in each feed's observed route ids.
 * Where a feed's ids carry no mode signal at all (OVapi NL), the mode is
 * 'transit' — a neutral color that claims nothing more specific.
 *
 * UTA (added 2026-10-18): UTA publishes NO GTFS-RT in the Mobility
 * Database catalog and its legacy SIRI API (api.rideuta.com) is retired —
 * but it does publish keyless GTFS-RT at apps.rideuta.com/tms/gtfs/*
 * (registered in the Transitland Atlas DMFR, feed f-9x0-uta~rt, no auth).
 * Quirk: the vehicle feed omits routeId entirely — only tripId. The
 * route therefore joins the agency's static GTFS (see `staticGtfsUrl`
 * + lib/transit/staticGtfs): trip → internal route_id → route_short_name
 * (the public number) with the mode taken from route_type exactly.
 *
 * Expansion (2026-10-18): King County Metro, Community Transit and RTD
 * Denver verified keyless (MDB auth 0) and live. Excluded after checks:
 *   • Valley Metro (Phoenix) — endpoint 401s without an apiKey; the key
 *     circulating in public catalogs is the vendor's, not ours to use.
 *   • SFMTA/Muni + BART — GTFS-RT only via 511.org (API key).
 *   • Sound Transit — OneBusAway API requires a key.
 *   • WMATA (DC) — api.wmata.com requires a subscription key.
 *   • Miami-Dade — realtime served via Swiftly (goswift.ly, keyed).
 *   • SEPTA — cataloged GTFS-RT is Swiftly-hosted (keyed); SEPTA's own
 *     legacy realtime APIs are not GTFS-RT vehicle positions.
 *   • LA Metro — realtime is a Swiftly pass-through (WebSocket/JSON);
 *     no keyless GTFS-RT protobuf endpoint is published.
 *   • DART (Dallas), NJ Transit, CTA (Chicago) — no keyless GTFS-RT
 *     vehicle-positions feed (NJ Transit/CTA/Metra need developer
 *     tokens for their realtime APIs).
 */

export type TransitMode = 'bus' | 'tram' | 'metro' | 'train' | 'ferry' | 'transit';

export interface TransitAgency {
  id: string;
  name: string;
  region: string;
  /** [lat, lng] service-area center — viewport relevance for the client. */
  center: [number, number];
  /**
   * [south, west, north, east] service-area extent — the client's
   * viewport-relevance test (lib/transit/relevance). Fetch relevance
   * MUST be based on this box, not the center point: a center-point
   * test with zoom-scaled padding evicts the agency as the user zooms
   * in anywhere away from the nominal center, and its vehicle dots
   * vanish at street level. The box only gates which feeds the client
   * pulls; it is never displayed as a claim about coverage.
   */
  bounds: [number, number, number, number];
  feedUrl: string;
  /** GTFS-RT TripUpdates feed, when the agency publishes a keyless one. */
  tripUpdatesUrl?: string;
  /** GTFS-RT Service Alerts feed, when the agency publishes a keyless one. */
  alertsUrl?: string;
  /**
   * IANA timezone the agency's static GTFS times are expressed in
   * (GTFS times are agency-local). Required for the routes/stops/
   * schedule network build (lib/transit/network); only agencies with
   * `staticGtfsUrl` get a network in v1.
   */
  timezone?: string;
  /**
   * Static GTFS zip used to resolve tripId → route/mode for feeds whose
   * vehicle positions omit routeId (UTA). See lib/transit/staticGtfs.
   */
  staticGtfsUrl?: string;
  headers?: Record<string, string>;
  defaultMode: TransitMode;
  routeModeRules?: Array<{ match: RegExp; mode: TransitMode }>;
  attribution: string;
  /** Mobility Database source id (provenance). */
  mdb?: number;
}

export const TRANSIT_AGENCIES: TransitAgency[] = [
  {
    id: 'uta',
    name: 'UTA',
    region: 'Salt Lake City, UT',
    center: [40.7608, -111.891],
    bounds: [39.95, -112.75, 41.45, -111.25],
    feedUrl: 'https://apps.rideuta.com/tms/gtfs/Vehicle',
    tripUpdatesUrl: 'https://apps.rideuta.com/tms/gtfs/TripUpdate',
    // Verified keyless live 2026-10-20: /tms/gtfs/Alert answers 200 with
    // a real GTFS-RT protobuf (101 active alerts at check time, every
    // one carrying routeId informed entities — the internal route ids
    // the static feed resolves to public numbers).
    alertsUrl: 'https://apps.rideuta.com/tms/gtfs/Alert',
    staticGtfsUrl: 'https://gtfsfeed.rideuta.com/GTFS.zip',
    timezone: 'America/Denver',
    // The static join normally supplies route + mode (route_type-exact).
    // defaultMode is the honest fallback if that join is unavailable;
    // the rules below fire on resolved short names (published UTA
    // numbering: TRAX 701/703/704, S-Line streetcar 720, FrontRunner 750).
    defaultMode: 'transit',
    routeModeRules: [
      { match: /^70[134]$/, mode: 'tram' },
      { match: /^720$/, mode: 'tram' },
      { match: /^750$/, mode: 'train' },
    ],
    attribution: 'Utah Transit Authority',
  },
  {
    id: 'king-county-metro',
    name: 'King County Metro',
    region: 'Seattle, WA',
    center: [47.6062, -122.3321],
    bounds: [47.05, -122.55, 47.8, -121.05],
    feedUrl: 'https://s3.amazonaws.com/kcm-alerts-realtime-prod/vehiclepositions.pb',
    tripUpdatesUrl: 'https://s3.amazonaws.com/kcm-alerts-realtime-prod/tripupdates.pb',
    // Static wired 2026-10-27 (batch 2): feed FAL26-161.2 (2026-09-28 →
    // 2027-03-26), parser-measured 142 routes / 6,265 stops / 32,635
    // trips. The zip is multi-operator (agency.txt: Metro Transit,
    // City of Seattle, Sound Transit, Solid Ground) — Seattle streetcar
    // + Sound Transit routes ride along under this entry, as served.
    // http on purpose: the https endpoint fails (adjudication §5).
    staticGtfsUrl: 'http://metro.kingcounty.gov/GTFS/google_transit.zip',
    timezone: 'America/Los_Angeles',
    // All Metro service is bus/trolleybus; route ids in this feed are
    // internal numeric ids with no mode signal. (Link light rail is
    // Sound Transit, whose feed needs a OneBusAway key — excluded.)
    defaultMode: 'bus',
    attribution: 'King County Metro',
    mdb: 1542,
  },
  {
    id: 'community-transit',
    name: 'Community Transit',
    region: 'Snohomish County, WA',
    center: [47.979, -122.2015],
    bounds: [47.7, -122.5, 48.35, -121.6],
    feedUrl: 'https://s3.amazonaws.com/commtrans-realtime-prod/vehiclepositions.pb',
    tripUpdatesUrl: 'https://s3.amazonaws.com/commtrans-realtime-prod/tripupdates.pb',
    // Static wired 2026-10-27 (batch 2): feed 20261002-20261211,
    // parser-measured 39 routes / 1,768 stops / 9,832 trips (the zip
    // also carries Sound Transit's Snohomish County routes).
    staticGtfsUrl: 'https://www.communitytransit.org/docs/default-source/open-data/gtfs/current.zip',
    timezone: 'America/Los_Angeles',
    defaultMode: 'bus',
    attribution: 'Community Transit',
    mdb: 1448,
  },
  {
    id: 'rtd-denver',
    name: 'RTD',
    region: 'Denver, CO',
    center: [39.7392, -104.9903],
    bounds: [39.3, -105.4, 40.3, -104.5],
    feedUrl: 'https://www.rtd-denver.com/files/gtfs-rt/VehiclePosition.pb',
    tripUpdatesUrl: 'https://www.rtd-denver.com/files/gtfs-rt/TripUpdate.pb',
    // Static wired 2026-10-27 (batch 2): feed
    // Sep26-37303-16-17-20261023-150015 (2026-09-27 → 2027-01-02),
    // parser-measured 130 routes / 8,162 stops / 21,814 trips.
    staticGtfsUrl: 'https://www.rtd-denver.com/files/gtfs/google_transit.zip',
    timezone: 'America/Denver',
    defaultMode: 'bus',
    routeModeRules: [
      // RTD's letter routes are the rail lines: A/B/G/N are commuter
      // rail; C/D/E/F/H/L/R/W are light rail. Everything else is bus.
      // (Many RTD position records carry no route id at all — those
      // stay bus, the network's dominant mode.)
      { match: /^[ABGN]$/, mode: 'train' },
      { match: /^[CDEFHLRW]$/, mode: 'tram' },
    ],
    attribution: 'Regional Transportation District (RTD)',
    mdb: 1678,
  },
  {
    id: 'mbta',
    name: 'MBTA',
    region: 'Boston, MA',
    center: [42.3601, -71.0589],
    bounds: [41.85, -71.75, 42.95, -70.45],
    feedUrl: 'https://cdn.mbta.com/realtime/VehiclePositions.pb',
    tripUpdatesUrl: 'https://cdn.mbta.com/realtime/TripUpdates.pb',
    // Static wired 2026-10-27 (batch 2): feed "Fall 2026, version D"
    // (2026-10-14 → 2026-12-12), parser-measured 404 routes / 10,292
    // stops / 105,295 trips — incl. commuter rail, ferries and the
    // Cape Cod Regional Transit Authority routes inside the same zip;
    // 373 of 404 routes carry trips in this vintage.
    staticGtfsUrl: 'https://cdn.mbta.com/MBTA_GTFS.zip',
    timezone: 'America/New_York',
    defaultMode: 'bus',
    routeModeRules: [
      { match: /^CR-/, mode: 'train' },
      { match: /^Boat-/, mode: 'ferry' },
      { match: /^(Red|Orange|Blue)$/, mode: 'metro' },
      { match: /^Green-/, mode: 'tram' },
    ],
    attribution: 'MBTA',
    mdb: 1602,
  },
  {
    id: 'capmetro',
    name: 'CapMetro',
    region: 'Austin, TX',
    center: [30.2672, -97.7431],
    bounds: [29.95, -98.1, 30.7, -97.35],
    feedUrl: 'https://data.texas.gov/download/eiei-9rpf/application%2Foctet-stream',
    // Static wired 2026-10-27 (batch 2): feed 261007_1345 (2026-10-07
    // → 2027-01-09), parser-measured 70 routes / 2,346 stops / 24,830
    // trips. This is the r4v4-vz24 Socrata dataset — NOT the eiei-9rpf
    // realtime dataset above (adjudication §5: do not conflate).
    staticGtfsUrl: 'https://data.texas.gov/download/r4v4-vz24/application/zip',
    timezone: 'America/Chicago',
    defaultMode: 'bus',
    routeModeRules: [
      // Route 550 is the MetroRail Red Line; every other CapMetro route is bus.
      { match: /^550$/, mode: 'train' },
    ],
    attribution: 'CapMetro',
    mdb: 1427,
  },
  {
    id: 'metrotransit-mn',
    name: 'Metro Transit',
    region: 'Minneapolis–Saint Paul, MN',
    center: [44.9778, -93.265],
    bounds: [44.7, -93.8, 45.3, -92.75],
    feedUrl: 'https://svc.metrotransit.org/mtgtfs/vehiclepositions.pb',
    // Static wired 2026-10-27 (batch 2): feed 1792595470 (2026-10-24 →
    // 2026-12-11), parser-measured 126 routes / 8,328 stops / 38,641
    // trips. Multi-operator zip (agency.txt also carries Maple Grove,
    // Plymouth, SouthWest Transit, U of M and MAC airport services).
    staticGtfsUrl: 'https://svc.metrotransit.org/mtgtfs/gtfs.zip',
    timezone: 'America/Chicago',
    defaultMode: 'bus',
    routeModeRules: [
      // 901 Blue Line / 902 Green Line are light rail; 92x/90x BRT lines are buses.
      { match: /^90[12]$/, mode: 'tram' },
    ],
    attribution: 'Metro Transit',
    mdb: 1683,
  },
  {
    id: 'ovapi-nl',
    name: 'OVapi',
    region: 'Netherlands',
    center: [52.1326, 5.2913],
    bounds: [50.65, 3.2, 53.65, 7.35],
    feedUrl: 'http://gtfs.ovapi.nl/nl/vehiclePositions.pb',
    tripUpdatesUrl: 'http://gtfs.ovapi.nl/nl/tripUpdates.pb',
    // Route ids are opaque network numbers — no mode signal in the feed.
    defaultMode: 'transit',
    attribution: 'OVapi / Dutch operators',
    mdb: 1646,
  },
  {
    id: 'entur-no',
    name: 'Entur',
    region: 'Norway',
    center: [60.472, 8.4689],
    bounds: [57.85, 4.4, 71.25, 31.3],
    feedUrl: 'https://api.entur.io/realtime/v1/gtfs-rt/vehicle-positions',
    tripUpdatesUrl: 'https://api.entur.io/realtime/v1/gtfs-rt/trip-updates',
    // Entur's terms ask API clients to identify themselves (not a key).
    headers: { 'ET-Client-Name': 'worldeye.app' },
    // County authorities are bus networks; national rail operators are not.
    // RUT (Oslo) mixes bus/tram/metro/ferry under one authority → neutral.
    defaultMode: 'bus',
    routeModeRules: [
      { match: /^(VYG|FLT|GOA|SJN):/, mode: 'train' },
      { match: /^RUT:/, mode: 'transit' },
    ],
    attribution: 'Entur / Norwegian operators',
  },
  {
    id: 'translink-seq',
    name: 'TransLink',
    region: 'South East Queensland, AU',
    center: [-27.4705, 153.026],
    bounds: [-28.35, 152.25, -26.25, 153.65],
    feedUrl: 'https://gtfsrt.api.translink.com.au/api/realtime/SEQ/VehiclePositions',
    tripUpdatesUrl: 'https://gtfsrt.api.translink.com.au/api/realtime/SEQ/TripUpdates',
    defaultMode: 'bus',
    routeModeRules: [
      // Route ids are "<route>-<operator>": 4055 Brisbane Ferries,
      // 5203 Queensland Rail, 5029 Gold Coast light rail (G:link).
      { match: /-4055$/, mode: 'ferry' },
      { match: /-5203$/, mode: 'train' },
      { match: /-5029$/, mode: 'tram' },
    ],
    attribution: 'TransLink Queensland',
    mdb: 1700,
  },
  {
    id: 'hsr-hamilton',
    name: 'Hamilton Street Railway',
    region: 'Hamilton, ON',
    center: [43.2557, -79.8711],
    bounds: [43.1, -80.2, 43.45, -79.55],
    feedUrl: 'https://opendata.hamilton.ca/GTFS-RT/GTFS_VehiclePositions.pb',
    // Static wired 2026-10-27 (batch 2): feed "2026 Fall_20261001"
    // (2026-09-06 → 2026-12-26), parser-measured 41 routes / 2,353
    // stops / 14,205 trips.
    staticGtfsUrl: 'https://opendata.hamilton.ca/GTFS-Static/google_transit.zip',
    timezone: 'America/Toronto',
    defaultMode: 'bus',
    attribution: 'City of Hamilton',
    mdb: 1458,
  },
  {
    id: 'drt-durham',
    name: 'Durham Region Transit',
    region: 'Durham Region, ON',
    center: [43.9, -78.86],
    bounds: [43.65, -79.2, 44.2, -78.45],
    feedUrl: 'https://drtonline.durhamregiontransit.com/gtfsrealtime/VehiclePositions',
    // Static wired 2026-10-27 (batch 2) at the CURRENT host — the old
    // drtonline path 403s (adjudication §5). The zip carries no
    // feed_info.txt, so there is no feed version to cite; parser-
    // measured 38 routes / 1,906 stops / 4,120 trips.
    staticGtfsUrl: 'https://maps.durham.ca/OpenDataGTFS/GTFS_Durham_TXT.zip',
    timezone: 'America/Toronto',
    defaultMode: 'bus',
    attribution: 'Durham Region Transit',
    mdb: 1466,
  },
  {
    id: 'ltc-london',
    name: 'London Transit',
    region: 'London, ON',
    center: [42.9849, -81.2453],
    bounds: [42.8, -81.5, 43.15, -80.95],
    feedUrl: 'http://gtfs.ltconline.ca/Vehicle/VehiclePositions.pb',
    // Static wired 2026-10-27 (batch 2): feed "2026 September
    // (D)_20261021" (2026-10-19 → 2026-11-28), parser-measured
    // 38 routes / 1,955 stops / 8,705 trips.
    staticGtfsUrl: 'http://www.londontransit.ca/gtfsfeed/google_transit.zip',
    timezone: 'America/Toronto',
    defaultMode: 'bus',
    attribution: 'London Transit Commission',
    mdb: 1561,
  },
  {
    id: 'miway',
    name: 'MiWay',
    region: 'Mississauga, ON',
    center: [43.589, -79.6441],
    bounds: [43.4, -79.9, 43.8, -79.45],
    feedUrl: 'https://www.miapp.ca/GTFS_RT/Vehicle/VehiclePositions.pb',
    // Static wired 2026-10-27 (batch 2) after the terms read-through
    // the adjudication required: the City of Mississauga Terms of Use
    // (linked from its MiWay developer-download page) grant a
    // worldwide royalty-free licence to use/modify/distribute; credit
    // is encouraged, not required — the attribution below is the
    // credit. No City logos, no implied endorsement. Feed version "2"
    // (2026-09-22 → 2026-12-20), parser-measured 67 routes / 4,079
    // stops / 26,293 trips.
    staticGtfsUrl: 'https://www.miapp.ca/GTFS/google_transit.zip',
    timezone: 'America/Toronto',
    defaultMode: 'bus',
    attribution: 'MiWay / City of Mississauga',
    mdb: 1612,
  },
  {
    id: 'yrt-york',
    name: 'York Region Transit',
    region: 'York Region, ON',
    center: [43.8828, -79.4403],
    bounds: [43.65, -79.8, 44.4, -79.05],
    feedUrl: 'http://rtu.york.ca/gtfsrealtime/VehiclePositions',
    // Static wired 2026-10-27 (batch 2): feed
    // 2026.09.06_September_20260810 (2026-09-06 → 2026-10-31),
    // parser-measured 125 routes / 4,825 stops / 13,006 trips.
    staticGtfsUrl: 'https://www.yrt.ca/google/google_transit.zip',
    timezone: 'America/Toronto',
    defaultMode: 'bus',
    attribution: 'York Region Transit',
    mdb: 1750,
  },
];

export function agencyById(id: string | null): TransitAgency | null {
  return TRANSIT_AGENCIES.find(a => a.id === id) ?? null;
}

export function resolveMode(agency: TransitAgency, routeId: string): TransitMode {
  if (routeId && agency.routeModeRules) {
    for (const rule of agency.routeModeRules) {
      if (rule.match.test(routeId)) return rule.mode;
    }
  }
  return agency.defaultMode;
}
