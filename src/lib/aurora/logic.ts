/**
 * Aurora alerts — pure logic. No I/O, no Date.now(): every function
 * takes its inputs (including "now") as arguments so the whole module
 * is unit-testable against fixtures.
 *
 * Data source (fetched in lib/aurora/noaa.ts): NOAA Space Weather
 * Prediction Center's public Kp products —
 *   /products/noaa-planetary-k-index.json          (observed, 3-hourly)
 *   /products/noaa-planetary-k-index-forecast.json (observed + estimated
 *                                                   + predicted, 3-hourly)
 * Both are arrays of flat objects; older SWPC payloads use an
 * array-of-arrays shape with a header row. The parser accepts both and
 * never trusts either — a malformed feed parses to an empty series and
 * every consumer degrades to "forecast unavailable", never to a
 * fabricated reading.
 */

export type KpFlag = "observed" | "estimated" | "predicted";

export interface KpPoint {
  /** Period start, UTC ISO string (each point covers [time, time+3h)). */
  time: string;
  kp: number;
  flag: KpFlag;
}

const KP_PERIOD_MS = 3 * 60 * 60 * 1000;

/* ─────────────────────────── Feed parsing ─────────────────────────── */

function toKpPoint(timeRaw: unknown, kpRaw: unknown, flagRaw: unknown): KpPoint | null {
  if (typeof timeRaw !== "string" || timeRaw.length < 10) return null;
  const time = new Date(timeRaw.endsWith("Z") ? timeRaw : `${timeRaw}Z`);
  if (Number.isNaN(time.getTime())) return null;
  const kp = typeof kpRaw === "number" ? kpRaw : Number(kpRaw);
  if (!Number.isFinite(kp) || kp < 0 || kp > 9) return null;
  const flag: KpFlag =
    flagRaw === "predicted" ? "predicted" : flagRaw === "estimated" ? "estimated" : "observed";
  return { time: time.toISOString(), kp, flag };
}

/**
 * Normalise either SWPC product into a clean ascending series.
 * Object rows: { time_tag, Kp | kp, observed? } — array rows:
 * ["time_tag", kp, observed?, ...] with or without a header row.
 */
export function parseKpProduct(raw: unknown): KpPoint[] {
  if (!Array.isArray(raw)) return [];
  const out: KpPoint[] = [];
  for (const row of raw) {
    if (Array.isArray(row)) {
      // Header rows carry the literal column names — skip anything
      // whose first cell isn't a date.
      out.push(...[toKpPoint(row[0], row[1], row[2])].filter((p): p is KpPoint => p !== null));
    } else if (row && typeof row === "object") {
      const r = row as Record<string, unknown>;
      const p = toKpPoint(r.time_tag, r.Kp ?? r.kp, r.observed);
      if (p) out.push(p);
    }
  }
  out.sort((a, b) => a.time.localeCompare(b.time));
  // The products never repeat a period; if a merged payload did, the
  // later (fresher-flagged) row wins.
  return out.filter((p, i) => i === out.length - 1 || out[i + 1].time !== p.time);
}

/** The latest measured (not predicted) reading, or null. */
export function currentKp(points: KpPoint[]): { kp: number; time: string } | null {
  for (let i = points.length - 1; i >= 0; i--) {
    if (points[i].flag !== "predicted") return { kp: points[i].kp, time: points[i].time };
  }
  return points.length ? { kp: points[points.length - 1].kp, time: points[points.length - 1].time } : null;
}

/* ───────────────────── Geomagnetics (dipole model) ────────────────── */

/**
 * The centred-dipole approximation of the geomagnetic pole (epoch
 * ~2025). Good to ~1° of magnetic latitude for populated places —
 * plenty for a Kp threshold band, and every threshold here is a band,
 * not a point estimate.
 */
export const MAGNETIC_POLE = { lat: 80.65, lng: -72.68 } as const;

const rad = (deg: number) => (deg * Math.PI) / 180;

/** Signed geomagnetic latitude (negative in the southern hemisphere). */
export function geomagneticLatitude(lat: number, lng: number): number {
  const sinM =
    Math.sin(rad(lat)) * Math.sin(rad(MAGNETIC_POLE.lat)) +
    Math.cos(rad(lat)) * Math.cos(rad(MAGNETIC_POLE.lat)) * Math.cos(rad(lng - MAGNETIC_POLE.lng));
  return (Math.asin(Math.max(-1, Math.min(1, sinM))) * 180) / Math.PI;
}

/**
 * The Kp a place needs for a display worth emailing about, from its
 * geomagnetic latitude. Bands, tuned to the guidance the northern-
 * lights page already publishes (Kp 2–3 under the oval; Kp 5 reaches
 * Scotland and the far-northern US) and to NOAA's viewing-line maps:
 * the oval's equatorward edge moves ~2–3° of magnetic latitude per Kp.
 * This is a heuristic with ±1 Kp of honest slop — the UI copy says
 * "about Kp N", never a promise.
 */
export function requiredKpForMagLat(magLat: number): number {
  const m = Math.abs(magLat);
  if (m >= 67) return 2;
  if (m >= 64) return 3;
  if (m >= 61) return 4;
  if (m >= 58) return 5;
  if (m >= 55) return 6;
  if (m >= 52) return 7;
  if (m >= 49) return 8;
  return 9;
}

/** NOAA's G-scale for a Kp value (Kp 5 = G1 … Kp 9 = G5); null below storm level. */
export function kpToGScale(kp: number): string | null {
  const k = Math.floor(kp);
  if (k >= 9) return "G5";
  if (k === 8) return "G4";
  if (k === 7) return "G3";
  if (k === 6) return "G2";
  if (k === 5) return "G1";
  return null;
}

/** Plain-language activity band for display. */
export function kpBandLabel(kp: number): string {
  const g = kpToGScale(kp);
  if (g) return `Geomagnetic storm (${g})`;
  if (kp >= 4) return "Active";
  if (kp >= 3) return "Unsettled";
  if (kp >= 2) return "Low";
  return "Quiet";
}

/** Kp for humans: 5, 4.7, 3.3 — never 4.67 or 5.0. */
export function formatKp(kp: number): string {
  const r = Math.round(kp * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}

/* ─────────────────────── Local-night arithmetic ───────────────────── */

/** A "watching night" runs 20:00 → 04:00 local at the place. */
export const NIGHT_START_HOUR = 20;
export const NIGHT_END_HOUR = 4;

interface LocalParts {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
}

function localParts(timeZone: string, instant: Date): LocalParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(instant);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? NaN);
  return { year: get("year"), month: get("month"), day: get("day"), hour: get("hour") % 24, minute: get("minute") };
}

/** The zone's UTC offset (ms) at an instant, derived from Intl. */
function zoneOffsetMs(timeZone: string, instant: Date): number {
  const p = localParts(timeZone, instant);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
  return asUtc - Math.floor(instant.getTime() / 60000) * 60000;
}

/** A wall-clock time in a zone → the UTC instant it occurs (offset fixed-point, 3 passes). */
export function zonedTimeToUtc(
  timeZone: string,
  year: number,
  month: number,
  day: number,
  hour: number,
  minute = 0,
): Date {
  let guess = Date.UTC(year, month - 1, day, hour, minute);
  for (let i = 0; i < 3; i++) {
    guess = Date.UTC(year, month - 1, day, hour, minute) - zoneOffsetMs(timeZone, new Date(guess));
  }
  return new Date(guess);
}

function shiftDay(year: number, month: number, day: number, delta: number): { year: number; month: number; day: number } {
  const d = new Date(Date.UTC(year, month - 1, day + delta));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

const pad2 = (n: number) => String(n).padStart(2, "0");
export const nightKeyOf = (y: number, m: number, d: number) => `${y}-${pad2(m)}-${pad2(d)}`;

export interface NightWindow {
  /** Place-local date (YYYY-MM-DD) of the evening the night begins — the dedupe key. */
  nightKey: string;
  start: Date;
  end: Date;
  /** True when `now` falls inside the window. */
  inProgress: boolean;
}

/**
 * The watching night relevant at `now` for a place:
 *  - before 20:00 local → tonight (starts this evening);
 *  - 20:00–24:00 → tonight, in progress;
 *  - 00:00–04:00 → the night that began yesterday evening, in progress.
 */
export function localNightWindow(timeZone: string, now: Date): NightWindow {
  const p = localParts(timeZone, now);
  let evening = { year: p.year, month: p.month, day: p.day };
  let inProgress = false;
  if (p.hour >= NIGHT_START_HOUR) {
    inProgress = true;
  } else if (p.hour < NIGHT_END_HOUR) {
    evening = shiftDay(p.year, p.month, p.day, -1);
    inProgress = true;
  }
  const start = zonedTimeToUtc(timeZone, evening.year, evening.month, evening.day, NIGHT_START_HOUR);
  const morning = shiftDay(evening.year, evening.month, evening.day, 1);
  const end = zonedTimeToUtc(timeZone, morning.year, morning.month, morning.day, NIGHT_END_HOUR);
  return { nightKey: nightKeyOf(evening.year, evening.month, evening.day), start, end, inProgress };
}

/* ─────────────────────── Outlook + alert decision ─────────────────── */

/** Highest Kp among periods overlapping [start, end); null if none cover it. */
export function maxKpOverlapping(points: KpPoint[], start: Date, end: Date): number | null {
  let max: number | null = null;
  for (const p of points) {
    const t = new Date(p.time).getTime();
    if (t < end.getTime() && t + KP_PERIOD_MS > start.getTime()) {
      if (max === null || p.kp > max) max = p.kp;
    }
  }
  return max;
}

export interface PlaceOutlook {
  night: NightWindow;
  /** Highest forecast Kp during the place's night; null when NOAA has no coverage. */
  maxKp: number | null;
  requiredKp: number;
  /** Forecast reaches the level this place needs. */
  meets: boolean;
}

/** Everything the page, the API and the alert runner need about one place tonight. */
export function outlookFor(
  place: { lat: number; lng: number; timeZone: string },
  requiredKp: number,
  points: KpPoint[],
  now: Date,
): PlaceOutlook {
  const night = localNightWindow(place.timeZone, now);
  const maxKp = maxKpOverlapping(points, night.start, night.end);
  return { night, maxKp, requiredKp, meets: maxKp !== null && maxKp >= requiredKp };
}

/** Don't email about a night that's still most of a day away — forecasts firm up. */
export const MAX_HOURS_BEFORE_NIGHT = 10;

export interface AuroraDecision {
  send: boolean;
  reason:
    | "threshold-met"
    | "inactive"
    | "opted-out"
    | "no-email"
    | "no-forecast"
    | "below-threshold"
    | "already-sent"
    | "too-early";
}

export function decideAuroraAlert(input: {
  active: boolean;
  emailOptOut: boolean;
  hasEmail: boolean;
  tonightMaxKp: number | null;
  requiredKp: number;
  nightKey: string;
  lastAlertNight: string | null;
  hoursUntilNightStart: number;
}): AuroraDecision {
  if (!input.active) return { send: false, reason: "inactive" };
  if (input.emailOptOut) return { send: false, reason: "opted-out" };
  if (!input.hasEmail) return { send: false, reason: "no-email" };
  if (input.tonightMaxKp === null) return { send: false, reason: "no-forecast" };
  if (input.tonightMaxKp < input.requiredKp) return { send: false, reason: "below-threshold" };
  if (input.lastAlertNight === input.nightKey) return { send: false, reason: "already-sent" };
  if (input.hoursUntilNightStart > MAX_HOURS_BEFORE_NIGHT) return { send: false, reason: "too-early" };
  return { send: true, reason: "threshold-met" };
}
