// ── Region interest (pure) ───────────────────────────────────────────
// Derives a signed-in user's dominant country interest from the
// PageView rows the site already records. Attribution is deliberately
// narrow and honest: only activity on the country explorer pages
// (/cameras/countries/<slug>) can be tied to a country today — plain
// page views there count as views, `camera_open` events fired on those
// pages count as opens, and view durationSec sums to dwell. Globe
// camera opens carry no country in their rows, so they attribute to
// nothing rather than being guessed at. (Follow-up in REPORT.md: the
// analytics ingest already supports an `event:detail` token — firing
// camera_open with the country code from the open handlers would make
// globe opens attributable too.)

import {
  REGION_MIN_DWELL_SEC,
  REGION_MIN_OPENS,
  REGION_MIN_SHARE,
  REGION_MIN_TOUCHES,
} from "./config";

export const COUNTRY_PATH_PREFIX = "/cameras/countries/";

/** Country slug from an explorer path, or null for any other path. */
export function countrySlugFromPath(path: string): string | null {
  if (!path.startsWith(COUNTRY_PATH_PREFIX)) return null;
  const rest = path.slice(COUNTRY_PATH_PREFIX.length).split(/[/?#]/)[0];
  return rest ? rest.toLowerCase() : null;
}

export interface RegionStat {
  slug: string;
  opens: number;
  views: number;
  dwellSec: number;
}

export interface RegionRow {
  path: string;
  event: string | null;
  durationSec: number | null;
}

/** Aggregate one user's window rows into per-country stats. */
export function aggregateRegionStats(rows: RegionRow[]): RegionStat[] {
  const bySlug = new Map<string, RegionStat>();
  for (const row of rows) {
    const slug = countrySlugFromPath(row.path);
    if (!slug) continue;
    const stat = bySlug.get(slug) ?? { slug, opens: 0, views: 0, dwellSec: 0 };
    if (row.event === "camera_open") {
      stat.opens += 1;
    } else if (row.event === null) {
      stat.views += 1;
      stat.dwellSec += row.durationSec ?? 0;
    }
    bySlug.set(slug, stat);
  }
  return [...bySlug.values()];
}

export interface RegionInterest {
  slug: string;
  opens: number;
  views: number;
  dwellSec: number;
  /** Top country's share of all region-attributed opens (0–1). */
  share: number;
}

/**
 * The user's dominant region, or null when the "heavy time" bar is not
 * met. Every threshold in config.ts must hold for the top country.
 */
export function summarizeRegionInterest(stats: RegionStat[]): RegionInterest | null {
  const totalOpens = stats.reduce((sum, s) => sum + s.opens, 0);
  if (totalOpens === 0) return null;
  const top = [...stats].sort(
    (a, b) => b.opens - a.opens || b.dwellSec - a.dwellSec || b.views - a.views,
  )[0];
  const share = top.opens / totalOpens;
  if (top.opens < REGION_MIN_OPENS) return null;
  if (top.opens + top.views < REGION_MIN_TOUCHES) return null;
  if (top.dwellSec < REGION_MIN_DWELL_SEC) return null;
  if (share < REGION_MIN_SHARE) return null;
  return { slug: top.slug, opens: top.opens, views: top.views, dwellSec: top.dwellSec, share };
}
