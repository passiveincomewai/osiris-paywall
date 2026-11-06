/**
 * Snow report view model for the resort pages (Wave 2 item 8,
 * 2026-11-06).
 *
 * Everything here is a pure reshape of `fetchResortSnow` output
 * (lib/ski/openmeteo). Open-Meteo is a weather MODEL: every figure
 * this module produces is modelled, never measured, and the page
 * labels it that way and shows the fetch time — that labelling is
 * inherited from openmeteo's module contract. A figure the model did
 * not provide stays null and renders as absent; nothing is zero-filled
 * or carried over from another resort. Base depth has no source in
 * this codebase and is never produced here.
 */
import {
  localDateKey,
  trailing24hSnowfallCm,
  type ResortSnowData,
} from "./openmeteo";

export interface SnowReportDay {
  /** Resort-local calendar date, "YYYY-MM-DD". */
  date: string;
  /** e.g. "Saturday, November 8" — display arithmetic on the date. */
  label: string;
  snowfallCm: number | null;
}

export interface SnowReportView {
  /** Modelled snowfall over the 24 complete hours before the fetch. */
  last24hCm: number | null;
  /** The resort-local "today" row of the daily model run. */
  today: SnowReportDay | null;
  /** The next three resort-local days after today, in order. */
  upcoming: SnowReportDay[];
  /** Sum of the upcoming days that carried a figure; null when none did. */
  upcomingTotalCm: number | null;
  /** ISO timestamp the model data was fetched (openmeteo's fetchedAt). */
  fetchedAtIso: string;
  /** IANA timezone the model resolved for the resort point, when given. */
  timezone: string | null;
}

const DAY_LABEL = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  timeZone: "UTC",
});

function dayLabel(date: string): string {
  // The date is a resort-local calendar date; label it as a bare
  // calendar date (parsed as UTC midnight) so the weekday can never
  // shift with the runtime's own timezone.
  return DAY_LABEL.format(new Date(`${date}T00:00:00Z`));
}

/**
 * Build the page's snow-report view from one resort's model data.
 * Returns null when the data cannot be oriented in the resort's own
 * timezone (no UTC offset → "today" would be a guess) — the page then
 * omits the modelled block rather than mislabel a day.
 */
export function buildSnowReportView(
  data: ResortSnowData,
  now: Date,
): SnowReportView | null {
  if (data.utcOffsetSeconds == null) return null;
  const todayKey = localDateKey(now, data.utcOffsetSeconds);
  const byDate = new Map(data.daily.map(d => [d.date, d.snowfallCm]));

  const today: SnowReportDay | null = byDate.has(todayKey)
    ? {
        date: todayKey,
        label: dayLabel(todayKey),
        snowfallCm: byDate.get(todayKey) ?? null,
      }
    : null;

  const upcoming: SnowReportDay[] = data.daily
    .filter(d => d.date > todayKey)
    .slice(0, 3)
    .map(d => ({ date: d.date, label: dayLabel(d.date), snowfallCm: d.snowfallCm }));

  let upcomingTotalCm: number | null = null;
  for (const d of upcoming) {
    if (d.snowfallCm == null) continue;
    upcomingTotalCm = (upcomingTotalCm ?? 0) + d.snowfallCm;
  }

  return {
    last24hCm: trailing24hSnowfallCm(data.hourly, now, data.utcOffsetSeconds),
    today,
    upcoming,
    upcomingTotalCm,
    fetchedAtIso: data.fetchedAt.toISOString(),
    timezone: data.timezone,
  };
}

/** True when the view carries at least one modelled figure worth printing. */
export function snowReportHasFigures(view: SnowReportView): boolean {
  return (
    view.last24hCm != null ||
    view.today?.snowfallCm != null ||
    view.upcomingTotalCm != null
  );
}

/** "12.3 cm (4.8 in)" — metric primary, imperial computed (site convention). */
export function formatSnowfall(cm: number): string {
  const inches = cm / 2.54;
  return `${cm.toFixed(1)} cm (${inches.toFixed(1)} in)`;
}
