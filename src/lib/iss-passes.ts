/**
 * OSIRIS — ISS passes over a city: registry + SGP4 pass prediction.
 *
 * The site already tracks the station honestly: /api/satellites fetches
 * CelesTrak TLEs and propagates them with satellite.js SGP4 (lib/orbit).
 * This module answers the per-city question — when does the ISS next
 * pass over X, and could you actually see it — with the same maths:
 * propagate the station's real TLE forward and convert to look angles
 * for the city's coordinates. Nothing here is a schedule scraped from
 * anywhere, and nothing is approximated beyond SGP4 itself.
 *
 * Honesty rules, pinned in iss-passes.test.ts:
 *  - A "pass" means the station rises above 10° elevation — the
 *    standard threshold for a realistic sighting. Rise/set times are
 *    bisected to the second, not read off the sampling grid.
 *  - A pass is labelled "visible" only when the observer is in
 *    darkness (sun more than 6° below the horizon at peak) AND the
 *    station is out of Earth's shadow (satellite.js's own shadow
 *    fraction). Daylight passes and eclipsed passes are labelled as
 *    exactly what they are.
 *  - A city qualifies only with a real /city-webcams page behind it
 *    and |latitude| ≤ 51.6° — the station's orbital inclination, so
 *    it can genuinely pass high over the city. Stockholm (59.3°N) is
 *    the measured exclusion: 349 cameras, and the ISS never rises
 *    high there, so there is no page.
 *  - Camera counts quoted are catalogue records within 25 km of the
 *    city anchor, computed from the same country chunks the city
 *    pages serve — and recomputed from the raw chunks in the tests.
 */

import {
  twoline2satrec,
  propagate,
  gstime,
  jday,
  eciToEcf,
  ecfToLookAngles,
  degreesToRadians,
  radiansToDegrees,
  sunPos,
  shadowFraction,
} from "satellite.js";

/* ------------------------------------------------------------------ */
/* Registry                                                            */
/* ------------------------------------------------------------------ */

export interface IssCity {
  slug: string;
  name: string;
  /** Display country. */
  country: string;
  /** Catalogue/country-page slug (/cameras/countries/<slug>). */
  countrySlug: string;
  /** Country chunk the camera count and wall are drawn from. */
  chunk: string;
  lat: number;
  lng: number;
  /** IANA time zone the pass times are printed in. */
  timeZone: string;
}

/** The station's orbital inclination — a city poleward of this never
 *  gets a high pass, so it gets no page. */
export const ISS_INCLINATION_DEG = 51.6;

/** The camera-count radius every page in the family states. */
export const ISS_CITY_RADIUS_KM = 25;

export const ISS_CITIES: IssCity[] = [
  { slug: "new-york-city", name: "New York City", country: "United States", countrySlug: "united-states", chunk: "united-states", lat: 40.7128, lng: -74.006, timeZone: "America/New_York" },
  { slug: "los-angeles", name: "Los Angeles", country: "United States", countrySlug: "united-states", chunk: "united-states", lat: 34.0522, lng: -118.2437, timeZone: "America/Los_Angeles" },
  { slug: "chicago", name: "Chicago", country: "United States", countrySlug: "united-states", chunk: "united-states", lat: 41.8781, lng: -87.6298, timeZone: "America/Chicago" },
  { slug: "phoenix", name: "Phoenix", country: "United States", countrySlug: "united-states", chunk: "united-states", lat: 33.4484, lng: -112.074, timeZone: "America/Phoenix" },
  { slug: "seattle", name: "Seattle", country: "United States", countrySlug: "united-states", chunk: "united-states", lat: 47.6062, lng: -122.3321, timeZone: "America/Los_Angeles" },
  { slug: "austin", name: "Austin", country: "United States", countrySlug: "united-states", chunk: "united-states", lat: 30.2672, lng: -97.7431, timeZone: "America/Chicago" },
  { slug: "denver", name: "Denver", country: "United States", countrySlug: "united-states", chunk: "united-states", lat: 39.7392, lng: -104.9903, timeZone: "America/Denver" },
  { slug: "washington-dc", name: "Washington DC", country: "United States", countrySlug: "united-states", chunk: "united-states", lat: 38.9072, lng: -77.0369, timeZone: "America/New_York" },
  { slug: "san-diego", name: "San Diego", country: "United States", countrySlug: "united-states", chunk: "united-states", lat: 32.7157, lng: -117.1611, timeZone: "America/Los_Angeles" },
  { slug: "nashville", name: "Nashville", country: "United States", countrySlug: "united-states", chunk: "united-states", lat: 36.1627, lng: -86.7744, timeZone: "America/Chicago" },
  { slug: "philadelphia", name: "Philadelphia", country: "United States", countrySlug: "united-states", chunk: "united-states", lat: 39.9526, lng: -75.1652, timeZone: "America/New_York" },
  { slug: "busan", name: "Busan", country: "South Korea", countrySlug: "south-korea", chunk: "south-korea", lat: 35.1796, lng: 129.0756, timeZone: "Asia/Seoul" },
  { slug: "incheon", name: "Incheon", country: "South Korea", countrySlug: "south-korea", chunk: "south-korea", lat: 37.4563, lng: 126.7052, timeZone: "Asia/Seoul" },
  { slug: "istanbul", name: "Istanbul", country: "Turkey", countrySlug: "turkey", chunk: "turkey", lat: 41.0082, lng: 28.9784, timeZone: "Europe/Istanbul" },
  { slug: "calgary", name: "Calgary", country: "Canada", countrySlug: "canada", chunk: "canada", lat: 51.0447, lng: -114.0719, timeZone: "America/Edmonton" },
  { slug: "montreal", name: "Montreal", country: "Canada", countrySlug: "canada", chunk: "canada", lat: 45.5017, lng: -73.5673, timeZone: "America/Toronto" },
  { slug: "osaka", name: "Osaka", country: "Japan", countrySlug: "japan", chunk: "japan", lat: 34.6937, lng: 135.5023, timeZone: "Asia/Tokyo" },
  { slug: "sapporo", name: "Sapporo", country: "Japan", countrySlug: "japan", chunk: "japan", lat: 43.0618, lng: 141.3545, timeZone: "Asia/Tokyo" },
  { slug: "taipei", name: "Taipei", country: "Taiwan", countrySlug: "taiwan", chunk: "taiwan", lat: 25.033, lng: 121.5654, timeZone: "Asia/Taipei" },
  { slug: "valencia", name: "Valencia", country: "Spain", countrySlug: "spain", chunk: "spain", lat: 39.4699, lng: -0.3763, timeZone: "Europe/Madrid" },
];

export function issCityBySlug(slug: string): IssCity | null {
  return ISS_CITIES.find((c) => c.slug === slug) ?? null;
}

/* ------------------------------------------------------------------ */
/* Pass prediction                                                     */
/* ------------------------------------------------------------------ */

export interface Observer {
  lat: number;
  lng: number;
  /** Height above the ellipsoid, km. Sea level is fine at this scale. */
  heightKm?: number;
}

export type PassVisibility = "visible" | "twilight" | "daylight" | "eclipsed";

export interface IssPass {
  /** Rise above the threshold elevation. */
  start: Date;
  /** Highest point of the pass. */
  peak: Date;
  /** Fall below the threshold elevation. */
  end: Date;
  maxElevationDeg: number;
  visibility: PassVisibility;
}

/** The sighting threshold: below ~10° the station is lost in haze,
 *  rooftops and city glow for most observers. */
export const PASS_MIN_ELEVATION_DEG = 10;

const STEP_MS = 20_000;

interface SatrecLike {
  error?: number;
}

function buildSatrec(line1: string, line2: string) {
  try {
    const rec = twoline2satrec(line1, line2);
    if (!rec || (rec as SatrecLike).error) return null;
    return rec;
  } catch {
    return null;
  }
}

/** ECI position (km) at a moment, or null when SGP4 declines. */
function eciAt(satrec: ReturnType<typeof twoline2satrec>, when: Date) {
  try {
    const pv = propagate(satrec, when);
    const position = pv?.position;
    if (!position || typeof position === "boolean") return null;
    return position as { x: number; y: number; z: number };
  } catch {
    return null;
  }
}

/** Elevation of the station above the observer's horizon, degrees. */
export function elevationDegAt(
  satrec: ReturnType<typeof twoline2satrec>,
  observer: Observer,
  when: Date,
): number | null {
  const eci = eciAt(satrec, when);
  if (!eci) return null;
  const gmst = gstime(when);
  const ecf = eciToEcf(eci, gmst);
  const look = ecfToLookAngles(
    {
      longitude: degreesToRadians(observer.lng),
      latitude: degreesToRadians(observer.lat),
      height: observer.heightKm ?? 0,
    },
    ecf,
  );
  return radiansToDegrees(look.elevation);
}

/** The sun's elevation above the observer's horizon, degrees —
 *  from satellite.js's sun position (declination + right ascension,
 *  which sunPos takes a Julian date for) and the standard
 *  hour-angle formula. */
export function sunElevationDegAt(observer: Observer, when: Date): number {
  const { decl, rtasc } = sunPos(jday(when));
  const hourAngle = gstime(when) + degreesToRadians(observer.lng) - rtasc;
  const phi = degreesToRadians(observer.lat);
  const sinAlt =
    Math.sin(phi) * Math.sin(decl) +
    Math.cos(phi) * Math.cos(decl) * Math.cos(hourAngle);
  return radiansToDegrees(Math.asin(Math.max(-1, Math.min(1, sinAlt))));
}

/** Is the station in sunlight? satellite.js's own shadow fraction:
 *  1 means the Earth's disc fully covers the sun (umbra); anything
 *  less and the station is catching sun. */
export function stationSunlitAt(
  satrec: ReturnType<typeof twoline2satrec>,
  when: Date,
): boolean | null {
  const eci = eciAt(satrec, when);
  if (!eci) return null;
  const { rsun } = sunPos(jday(when));
  return shadowFraction(rsun, eci) < 1;
}

export function classifyPass(
  satrec: ReturnType<typeof twoline2satrec>,
  observer: Observer,
  peak: Date,
): PassVisibility {
  const lit = stationSunlitAt(satrec, peak);
  if (lit === false) return "eclipsed";
  const sun = sunElevationDegAt(observer, peak);
  if (sun <= -6) return "visible";
  if (sun >= 0) return "daylight";
  return "twilight";
}

export const VISIBILITY_LABELS: Record<PassVisibility, string> = {
  visible: "Visible — dark sky, station in sunlight",
  twilight: "Twilight — station lit, sky not fully dark",
  daylight: "Daylight pass — station lit but the sky is bright",
  eclipsed: "In Earth's shadow at peak — not visible",
};

/** Bisect the threshold crossing between a below and an above sample. */
function crossing(
  satrec: ReturnType<typeof twoline2satrec>,
  observer: Observer,
  lo: Date,
  hi: Date,
  threshold: number,
): Date {
  let a = lo.getTime();
  let b = hi.getTime();
  const aBelow = (elevationDegAt(satrec, observer, new Date(a)) ?? -90) < threshold;
  for (let i = 0; i < 24 && b - a > 500; i++) {
    const mid = Math.round((a + b) / 2);
    const e = elevationDegAt(satrec, observer, new Date(mid)) ?? -90;
    if ((e < threshold) === aBelow) a = mid;
    else b = mid;
  }
  return new Date(Math.round((a + b) / 2));
}

/** Golden-section peak inside a bracket — the grid's best sample is
 *  at most one step from the true peak. */
function refinePeak(
  satrec: ReturnType<typeof twoline2satrec>,
  observer: Observer,
  loMs: number,
  hiMs: number,
): { at: Date; elevation: number } {
  const invPhi = (Math.sqrt(5) - 1) / 2;
  let a = loMs;
  let b = hiMs;
  let c = b - invPhi * (b - a);
  let d = a + invPhi * (b - a);
  const ev = (t: number) => elevationDegAt(satrec, observer, new Date(t)) ?? -90;
  let fc = ev(c);
  let fd = ev(d);
  for (let i = 0; i < 28 && b - a > 250; i++) {
    if (fc < fd) {
      a = c;
      c = d;
      fc = fd;
      d = a + invPhi * (b - a);
      fd = ev(d);
    } else {
      b = d;
      d = c;
      fd = fc;
      c = b - invPhi * (b - a);
      fc = ev(c);
    }
  }
  const at = Math.round((a + b) / 2);
  return { at: new Date(at), elevation: ev(at) };
}

/**
 * Every pass of the ISS over `observer` rising above
 * `minElevationDeg` within the window starting at `from`.
 * Deterministic for a fixed TLE and start — the tests pin it against
 * an independent fine-grid scan.
 */
export function findPasses(
  line1: string,
  line2: string,
  observer: Observer,
  from: Date,
  hoursAhead = 72,
  minElevationDeg: number = PASS_MIN_ELEVATION_DEG,
  limit = 60,
): IssPass[] {
  const satrec = buildSatrec(line1, line2);
  if (!satrec) return [];
  const endMs = from.getTime() + hoursAhead * 3_600_000;
  const passes: IssPass[] = [];

  let prevT = from.getTime();
  let prevE = elevationDegAt(satrec, observer, from) ?? -90;
  let open: { start: Date; bestT: number; bestE: number } | null =
    prevE >= minElevationDeg
      ? { start: new Date(prevT), bestT: prevT, bestE: prevE }
      : null;

  for (let t = prevT + STEP_MS; t <= endMs; t += STEP_MS) {
    const e = elevationDegAt(satrec, observer, new Date(t)) ?? -90;
    if (open === null && e >= minElevationDeg) {
      const start = crossing(satrec, observer, new Date(prevT), new Date(t), minElevationDeg);
      open = { start, bestT: t, bestE: e };
    } else if (open !== null && e < minElevationDeg) {
      const end = crossing(satrec, observer, new Date(prevT), new Date(t), minElevationDeg);
      const peak = refinePeak(
        satrec,
        observer,
        Math.max(open.start.getTime(), open.bestT - STEP_MS),
        Math.min(end.getTime(), open.bestT + STEP_MS),
      );
      passes.push({
        start: open.start,
        peak: peak.at,
        end,
        maxElevationDeg: peak.elevation,
        visibility: classifyPass(satrec, observer, peak.at),
      });
      open = null;
      if (passes.length >= limit) break;
    } else if (open !== null && e > open.bestE) {
      open.bestT = t;
      open.bestE = e;
    }
    prevT = t;
    prevE = e;
  }
  return passes;
}

/* ------------------------------------------------------------------ */
/* Formatting                                                          */
/* ------------------------------------------------------------------ */

/** "Tue, Oct 27, 7:42 PM" in the city's own time zone. */
export function formatPassTime(d: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  }).format(d);
}

/** "6 min" / "45 sec" for a pass's above-threshold duration. */
export function formatDuration(start: Date, end: Date): string {
  const sec = Math.round((end.getTime() - start.getTime()) / 1000);
  if (sec < 90) return `${sec} sec`;
  return `${Math.round(sec / 60)} min`;
}
