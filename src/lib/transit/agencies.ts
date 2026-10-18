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
 */

export type TransitMode = 'bus' | 'tram' | 'metro' | 'train' | 'ferry' | 'transit';

export interface TransitAgency {
  id: string;
  name: string;
  region: string;
  /** [lat, lng] service-area center — viewport relevance for the client. */
  center: [number, number];
  feedUrl: string;
  /** GTFS-RT TripUpdates feed, when the agency publishes a keyless one. */
  tripUpdatesUrl?: string;
  headers?: Record<string, string>;
  defaultMode: TransitMode;
  routeModeRules?: Array<{ match: RegExp; mode: TransitMode }>;
  attribution: string;
  /** Mobility Database source id (provenance). */
  mdb?: number;
}

export const TRANSIT_AGENCIES: TransitAgency[] = [
  {
    id: 'mbta',
    name: 'MBTA',
    region: 'Boston, MA',
    center: [42.3601, -71.0589],
    feedUrl: 'https://cdn.mbta.com/realtime/VehiclePositions.pb',
    tripUpdatesUrl: 'https://cdn.mbta.com/realtime/TripUpdates.pb',
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
    feedUrl: 'https://data.texas.gov/download/eiei-9rpf/application%2Foctet-stream',
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
    feedUrl: 'https://svc.metrotransit.org/mtgtfs/vehiclepositions.pb',
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
    feedUrl: 'https://opendata.hamilton.ca/GTFS-RT/GTFS_VehiclePositions.pb',
    defaultMode: 'bus',
    attribution: 'City of Hamilton',
    mdb: 1458,
  },
  {
    id: 'drt-durham',
    name: 'Durham Region Transit',
    region: 'Durham Region, ON',
    center: [43.9, -78.86],
    feedUrl: 'https://drtonline.durhamregiontransit.com/gtfsrealtime/VehiclePositions',
    defaultMode: 'bus',
    attribution: 'Durham Region Transit',
    mdb: 1466,
  },
  {
    id: 'ltc-london',
    name: 'London Transit',
    region: 'London, ON',
    center: [42.9849, -81.2453],
    feedUrl: 'http://gtfs.ltconline.ca/Vehicle/VehiclePositions.pb',
    defaultMode: 'bus',
    attribution: 'London Transit Commission',
    mdb: 1561,
  },
  {
    id: 'miway',
    name: 'MiWay',
    region: 'Mississauga, ON',
    center: [43.589, -79.6441],
    feedUrl: 'https://www.miapp.ca/GTFS_RT/Vehicle/VehiclePositions.pb',
    defaultMode: 'bus',
    attribution: 'MiWay / City of Mississauga',
    mdb: 1612,
  },
  {
    id: 'yrt-york',
    name: 'York Region Transit',
    region: 'York Region, ON',
    center: [43.8828, -79.4403],
    feedUrl: 'http://rtu.york.ca/gtfsrealtime/VehiclePositions',
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
