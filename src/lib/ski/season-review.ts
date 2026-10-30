/**
 * Powder Pass — season-in-review aggregation (feature #14).
 *
 * Pure aggregation over data the user already owns: their logged
 * ski days (SkiPassDay rows, via lib/ski/pass-value) and the
 * modelled Open-Meteo archive snowfall for the resorts they follow
 * (via lib/ski/openmeteo). Nothing here invents a figure: logged-day
 * counts come straight from the rows, snow figures pass through from
 * the caller's summaries (null stays null = unavailable), and there
 * is deliberately no comparison against other users — no such data
 * exists.
 */
import type { MonthTotal } from "./openmeteo";

/* ── Logged days (user's own pass-value data) ───────────────────── */

export interface LoggedDaysSummary {
  daysLogged: number;
  /** Distinct non-null resort slugs among the logged days. */
  distinctResortSlugs: string[];
  distinctResorts: number;
}

export function summariseLoggedDays(
  days: readonly { resortSlug: string | null }[],
): LoggedDaysSummary {
  const slugs = new Set<string>();
  for (const d of days) if (d.resortSlug) slugs.add(d.resortSlug);
  const distinctResortSlugs = [...slugs].sort();
  return {
    daysLogged: days.length,
    distinctResortSlugs,
    distinctResorts: distinctResortSlugs.length,
  };
}

/* ── Modelled snow highlights (Open-Meteo archive) ──────────────── */

export interface ResortSeasonSnow {
  slug: string;
  name: string;
  /** Modelled season total; null = archive unavailable. */
  totalCm: number | null;
  months: MonthTotal[];
}

export interface BiggestMonth {
  slug: string;
  name: string;
  month: string;
  label: string;
  totalCm: number;
}

/** The followed resort with the highest modelled season total. */
export function snowiestResort(
  entries: readonly ResortSeasonSnow[],
): ResortSeasonSnow | null {
  let best: ResortSeasonSnow | null = null;
  for (const e of entries) {
    if (e.totalCm == null) continue;
    if (!best || e.totalCm > (best.totalCm ?? -Infinity)) best = e;
  }
  return best;
}

/** The single biggest modelled snowfall month across followed resorts. */
export function biggestMonth(
  entries: readonly ResortSeasonSnow[],
): BiggestMonth | null {
  let best: BiggestMonth | null = null;
  for (const e of entries) {
    for (const m of e.months) {
      if (m.totalCm == null) continue;
      if (!best || m.totalCm > best.totalCm) {
        best = {
          slug: e.slug,
          name: e.name,
          month: m.month,
          label: m.label,
          totalCm: m.totalCm,
        };
      }
    }
  }
  return best;
}
