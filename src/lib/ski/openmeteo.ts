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
