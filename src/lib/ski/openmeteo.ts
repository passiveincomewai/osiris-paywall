/**
 * Powder Pass — Open-Meteo helpers (forecast + archive).
 *
 * Open-Meteo is a keyless weather MODEL: every figure it returns is
 * modelled, never measured. Callers must label figures "modelled"
 * and show the fetch time — this module never presents a number as
 * an observation. A failed fetch resolves to null (an honest
 * "unavailable" state at the call site), never a fabricated total.
 *
 * Pure parsing / season / aggregation helpers live alongside the
 * fetchers so fixture tests can pin them without any network.
 */

export interface SnowDay {
  date: string;
  snowfallCm: number | null;
}

export interface SnowfallSummary {
  days: SnowDay[];
  /** Sum of the days that carried a figure; null when none did. */
  totalCm: number | null;
  /** The single snowiest day, or null when no day carried a figure. */
  wettest: SnowDay | null;
}

interface OpenMeteoDailyJson {
  daily?: {
    time?: string[];
    snowfall_sum?: (number | null)[];
  };
}

/** Summarise an Open-Meteo daily snowfall payload (forecast or archive). */
export function summariseSnowfall(json: unknown): SnowfallSummary {
  const daily = (json as OpenMeteoDailyJson | null)?.daily;
  const times = daily?.time ?? [];
  const sums = daily?.snowfall_sum ?? [];
  const days: SnowDay[] = times.map((date, i) => ({
    date,
    snowfallCm: typeof sums[i] === "number" ? sums[i] : null,
  }));
  let totalCm: number | null = null;
  let wettest: SnowDay | null = null;
  for (const d of days) {
    if (d.snowfallCm == null) continue;
    totalCm = (totalCm ?? 0) + d.snowfallCm;
    if (!wettest || d.snowfallCm > (wettest.snowfallCm ?? -Infinity)) wettest = d;
  }
  return { days, totalCm, wettest };
}

export function forecastSnowfallUrl(lat: number, lng: number, days = 5): string {
  const qs = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lng),
    daily: "snowfall_sum",
    forecast_days: String(days),
    timezone: "auto",
  });
  return `https://api.open-meteo.com/v1/forecast?${qs.toString()}`;
}

export function archiveSnowfallUrl(
  lat: number,
  lng: number,
  startDate: string,
  endDate: string,
): string {
  const qs = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lng),
    start_date: startDate,
    end_date: endDate,
    daily: "snowfall_sum",
    timezone: "auto",
  });
  return `https://archive-api.open-meteo.com/v1/archive?${qs.toString()}`;
}

async function fetchJsonWithTimeout(
  url: string,
  timeoutMs: number,
  revalidateSeconds: number,
): Promise<unknown | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      next: { revalidate: revalidateSeconds },
    });
    if (!res.ok) return null;
    return (await res.json()) as unknown;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Next-N-days forecast snowfall for one resort. Null = unavailable. */
export async function fetchForecastSnowfall(
  lat: number,
  lng: number,
  opts: { days?: number; timeoutMs?: number } = {},
): Promise<SnowfallSummary | null> {
  const json = await fetchJsonWithTimeout(
    forecastSnowfallUrl(lat, lng, opts.days ?? 5),
    opts.timeoutMs ?? 8000,
    1800,
  );
  if (!json) return null;
  const summary = summariseSnowfall(json);
  return summary.days.length > 0 ? summary : null;
}

/** Archive (ERA5 reanalysis) snowfall over a window. Null = unavailable. */
export async function fetchArchiveSnowfall(
  lat: number,
  lng: number,
  startDate: string,
  endDate: string,
  opts: { timeoutMs?: number } = {},
): Promise<SnowfallSummary | null> {
  const json = await fetchJsonWithTimeout(
    archiveSnowfallUrl(lat, lng, startDate, endDate),
    opts.timeoutMs ?? 15000,
    86400,
  );
  if (!json) return null;
  const summary = summariseSnowfall(json);
  return summary.days.length > 0 ? summary : null;
}

/* ------------------------------------------------------------------ */
/* Season window (for the season snowfall tracker)                     */
/* ------------------------------------------------------------------ */

export interface SeasonWindow {
  startDate: string;
  endDate: string;
  /** e.g. "2026–27 season (from Oct 1, 2026)" — hemisphere aware. */
  label: string;
}

function iso(y: number, m: number, d: number): string {
  const mm = String(m).padStart(2, "0");
  const dd = String(d).padStart(2, "0");
  return `${y}-${mm}-${dd}`;
}

function todayIso(today: Date): string {
  return iso(today.getUTCFullYear(), today.getUTCMonth() + 1, today.getUTCDate());
}

/**
 * The current snow season for a resort, by hemisphere (lat sign):
 * northern = Oct 1 → today (before Oct 1, the season that started
 * the previous Oct 1); southern = Apr 1 → Oct 31 (outside that
 * window, the most recent completed Apr 1 → Oct 31 season).
 */
export function seasonWindow(lat: number, today: Date = new Date()): SeasonWindow {
  const y = today.getUTCFullYear();
  const m = today.getUTCMonth() + 1;
  if (lat >= 0) {
    const startYear = m >= 10 ? y : y - 1;
    return {
      startDate: iso(startYear, 10, 1),
      endDate: todayIso(today),
      label: `${startYear}–${String(startYear + 1).slice(2)} season (from Oct 1, ${startYear})`,
    };
  }
  if (m >= 4 && m <= 10) {
    return {
      startDate: iso(y, 4, 1),
      endDate: todayIso(today),
      label: `${y} season (Apr 1 – Oct 31, ${y})`,
    };
  }
  const seasonYear = m > 10 ? y : y - 1;
  return {
    startDate: iso(seasonYear, 4, 1),
    endDate: iso(seasonYear, 10, 31),
    label: `${seasonYear} season (Apr 1 – Oct 31, ${seasonYear})`,
  };
}

/* ------------------------------------------------------------------ */
/* Monthly breakdown                                                   */
/* ------------------------------------------------------------------ */

export interface MonthTotal {
  /** "2026-10" */
  month: string;
  /** "Oct 2026" */
  label: string;
  totalCm: number | null;
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** Group daily snowfall into calendar months, chronological order. */
export function monthlyBreakdown(days: readonly SnowDay[]): MonthTotal[] {
  const byMonth = new Map<string, MonthTotal>();
  for (const d of days) {
    const month = d.date.slice(0, 7);
    if (month.length !== 7) continue;
    const entry =
      byMonth.get(month) ??
      {
        month,
        label: `${MONTH_NAMES[Number(month.slice(5, 7)) - 1] ?? month.slice(5, 7)} ${month.slice(0, 4)}`,
        totalCm: null as number | null,
      };
    if (d.snowfallCm != null) entry.totalCm = (entry.totalCm ?? 0) + d.snowfallCm;
    byMonth.set(month, entry);
  }
  return [...byMonth.values()].sort((a, b) => (a.month < b.month ? -1 : 1));
}

/* ------------------------------------------------------------------ */
/* Storm-watch ranking                                                 */
/* ------------------------------------------------------------------ */

export interface StormRow<T> {
  resort: T;
  summary: SnowfallSummary | null;
}

/**
 * Rank storm rows by modelled total, wettest first. Resorts whose
 * fetch failed (null summary / null total) sink to the bottom in
 * their original order — unavailable is shown, never hidden.
 */
export function rankStormRows<T>(rows: readonly StormRow<T>[]): StormRow<T>[] {
  return [...rows].sort((a, b) => {
    const at = a.summary?.totalCm;
    const bt = b.summary?.totalCm;
    if (at == null && bt == null) return 0;
    if (at == null) return 1;
    if (bt == null) return -1;
    return bt - at;
  });
}

/** Storm-watch group cap: passes can be large; say so when truncated. */
export const STORM_WATCH_CAP = 40;
/**
 * Powder Pass — shared Open-Meteo snow data for the ski email features
 * (dawn-patrol alerts + Thursday powder digest).
 *
 * Open-Meteo is a keyless MODELLED weather source: its snowfall figures
 * are model output at the resort's coordinates, never a measurement on
 * the mountain. Every consumer of this module labels the numbers as
 * modelled and shows the fetch time — that labelling is part of this
 * module's contract, not a nicety.
 *
 * Two shapes are used, on purpose:
 *   • Dawn patrol needs a true trailing-24h total. Daily buckets
 *     straddle the overnight window (yesterday's bucket includes
 *     yesterday daytime), so dawn sums HOURLY snowfall over the 24
 *     complete hours before the check.
 *   • The Thursday digest ranks a weekend, which is exactly what DAILY
 *     snowfall_sum buckets describe, so it uses those.
 *
 * Everything here is fail-soft: a failed fetch returns null, the pure
 * parsers return empty/null on malformed payloads, and one resort's
 * failure never propagates to the caller.
 */
export interface DailySnowfall {
  /** Resort-local calendar date, "YYYY-MM-DD". */
  date: string;
  snowfallCm: number | null;
}

export interface HourlySnowfall {
  /** Resort-local hour start, "YYYY-MM-DDTHH:00" (Open-Meteo local ISO). */
  time: string;
  snowfallCm: number | null;
}

export interface ResortSnowData {
  daily: DailySnowfall[];
  hourly: HourlySnowfall[];
  /** Seconds east of UTC for the resort's local timezone (API-reported). */
  utcOffsetSeconds: number | null;
  timezone: string | null;
  fetchedAt: Date;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function numOrNull(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/** Parse the `daily` block of an Open-Meteo forecast response. */
export function parseDailySnowfall(json: unknown): DailySnowfall[] {
  if (!isRecord(json) || !isRecord(json.daily)) return [];
  const times = json.daily.time;
  const sums = json.daily.snowfall_sum;
  if (!Array.isArray(times) || !Array.isArray(sums)) return [];
  const out: DailySnowfall[] = [];
  for (let i = 0; i < times.length; i++) {
    const date = times[i];
    if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    out.push({ date, snowfallCm: numOrNull(sums[i]) });
  }
  return out;
}

/** Parse the `hourly` block of an Open-Meteo forecast response. */
export function parseHourlySnowfall(json: unknown): HourlySnowfall[] {
  if (!isRecord(json) || !isRecord(json.hourly)) return [];
  const times = json.hourly.time;
  const vals = json.hourly.snowfall;
  if (!Array.isArray(times) || !Array.isArray(vals)) return [];
  const out: HourlySnowfall[] = [];
  for (let i = 0; i < times.length; i++) {
    const time = times[i];
    if (typeof time !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(time)) continue;
    out.push({ time, snowfallCm: numOrNull(vals[i]) });
  }
  return out;
}

/** "YYYY-MM-DDTHH:00" wall-clock key for an instant in a fixed offset. */
function localHourKey(now: Date, utcOffsetSeconds: number): string {
  const shifted = new Date(now.getTime() + utcOffsetSeconds * 1000);
  const y = shifted.getUTCFullYear();
  const m = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const d = String(shifted.getUTCDate()).padStart(2, "0");
  const h = String(shifted.getUTCHours()).padStart(2, "0");
  return `${y}-${m}-${d}T${h}:00`;
}

/** "YYYY-MM-DD" wall-clock date for an instant in a fixed offset. */
export function localDateKey(now: Date, utcOffsetSeconds: number): string {
  return localHourKey(now, utcOffsetSeconds).slice(0, 10);
}

/**
 * Modelled snowfall (cm) over the 24 complete hours ending just before
 * the current local hour — the dawn-patrol "overnight" window. Returns
 * null when the series does not cover a full 24 complete hours (never
 * a partial sum presented as a 24h total). Null hourly values count as
 * 0 (the model's no-snow encoding in fixture data); a window that is
 * entirely null is treated as no data.
 */
export function trailing24hSnowfallCm(
  hourly: HourlySnowfall[],
  now: Date,
  utcOffsetSeconds: number | null,
): number | null {
  if (utcOffsetSeconds === null || hourly.length < 24) return null;
  const currentHour = localHourKey(now, utcOffsetSeconds);
  // Complete hours are those whose start is strictly before the current
  // (in-progress) hour. Take the last 24 of them.
  const complete = hourly.filter(h => h.time < currentHour);
  if (complete.length < 24) return null;
  const window = complete.slice(-24);
  if (window.every(h => h.snowfallCm === null)) return null;
  return window.reduce((sum, h) => sum + (h.snowfallCm ?? 0), 0);
}

/**
 * The upcoming weekend (Fri + Sat + Sun) after `referenceDate`
 * ("YYYY-MM-DD", resort-local): the first Friday on/after the day after
 * the reference date and its Saturday/Sunday. Returns the summed
 * modelled snowfall and the day rows used, or null when the daily
 * series does not contain a full Fri–Sun set with at least one numeric
 * value.
 */
export function upcomingWeekendSnowfall(
  daily: DailySnowfall[],
  referenceDate: string,
): { totalCm: number; days: DailySnowfall[] } | null {
  const after = daily.filter(d => d.date > referenceDate);
  const friIdx = after.findIndex(
    d => new Date(`${d.date}T00:00:00Z`).getUTCDay() === 5,
  );
  if (friIdx < 0 || friIdx + 2 >= after.length) return null;
  const days = after.slice(friIdx, friIdx + 3);
  const weekdays = days.map(d => new Date(`${d.date}T00:00:00Z`).getUTCDay());
  if (weekdays[0] !== 5 || weekdays[1] !== 6 || weekdays[2] !== 0) return null;
  if (days.every(d => d.snowfallCm === null)) return null;
  return {
    totalCm: days.reduce((sum, d) => sum + (d.snowfallCm ?? 0), 0),
    days,
  };
}

export type SnowFetch = typeof fetch;

/**
 * Fetch daily + hourly snowfall for one resort's coordinates.
 * Never throws — any failure (network, HTTP, malformed body) is null,
 * so a single resort can never fail a whole email run.
 */
export async function fetchResortSnow(
  lat: number,
  lng: number,
  opts: {
    pastDays?: number;
    forecastDays?: number;
    fetchImpl?: SnowFetch;
    timeoutMs?: number;
    now?: Date;
    /**
     * Opt-in Next data-cache lifetime (seconds) for page renders, so a
     * statically generated page can refresh its model figures via ISR.
     * Unset (the email features' behaviour) leaves the fetch uncached.
     */
    revalidateSeconds?: number;
  } = {},
): Promise<ResortSnowData | null> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  try {
    const qs = new URLSearchParams({
      latitude: String(lat),
      longitude: String(lng),
      daily: "snowfall_sum",
      hourly: "snowfall",
      past_days: String(opts.pastDays ?? 2),
      forecast_days: String(opts.forecastDays ?? 4),
      timezone: "auto",
    });
    const res = await fetchImpl(`https://api.open-meteo.com/v1/forecast?${qs.toString()}`, {
      signal: AbortSignal.timeout(opts.timeoutMs ?? 8000),
      headers: { "User-Agent": "WorldEye-PowderPass/1.0" },
      ...(opts.revalidateSeconds != null
        ? { next: { revalidate: opts.revalidateSeconds } }
        : {}),
    });
    if (!res.ok) return null;
    const json: unknown = await res.json();
    if (!isRecord(json)) return null;
    return {
      daily: parseDailySnowfall(json),
      hourly: parseHourlySnowfall(json),
      utcOffsetSeconds: numOrNull(json.utc_offset_seconds),
      timezone: typeof json.timezone === "string" ? json.timezone : null,
      fetchedAt: opts.now ?? new Date(),
    };
  } catch {
    return null;
  }
}

/** One-decimal cm label, e.g. 12.34 -> "12.3 cm". */
export function formatCm(cm: number): string {
  return `${cm.toFixed(1)} cm`;
}
