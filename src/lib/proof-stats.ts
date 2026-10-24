/**
 * Wave 2 F8 — proof counters from real data only.
 *
 * The counters on /pricing and near upgrade prompts are computed from
 * the same data the site itself serves:
 *   - watching now / today: distinct analytics sessions (PageView rows —
 *     the first-party analytics the admin dashboards read), never a
 *     hardcoded or estimated audience figure;
 *   - countries / sources: distinct values across the live camera
 *     catalogue records (the payload the /api/cctv route serves).
 *
 * Deliberately NOT here: a camera total. The public camera figure is
 * the owner's standing headline (74,229) and the computed served count
 * differs from it; shipping a second, different camera number beside
 * the headline would contradict the owner's standing decision, so the
 * counter set ships without one (see the wave REPORT).
 *
 * Pure helpers only — the route (app/api/proof) does the I/O.
 */

export const WATCHING_NOW_WINDOW_MS = 15 * 60_000;

/** Distinct non-empty session ids in a set of analytics rows. */
export function distinctSessionCount(rows: readonly { sessionId?: unknown }[]): number {
  const seen = new Set<string>();
  for (const r of rows) {
    if (typeof r.sessionId === "string" && r.sessionId.length > 0) seen.add(r.sessionId);
  }
  return seen.size;
}

export interface CatalogueCoverage {
  /** Distinct country values across the catalogue records. */
  countries: number;
  /** Distinct source/agency values across the catalogue records. */
  sources: number;
  /** Records examined (the served catalogue size at compute time). */
  records: number;
}

export function catalogueCoverage(
  cameras: readonly { country?: unknown; source?: unknown }[],
): CatalogueCoverage {
  const countries = new Set<string>();
  const sources = new Set<string>();
  for (const c of cameras) {
    if (typeof c.country === "string" && c.country.trim()) countries.add(c.country.trim());
    if (typeof c.source === "string" && c.source.trim()) sources.add(c.source.trim());
  }
  return { countries: countries.size, sources: sources.size, records: cameras.length };
}

function denverParts(now: Date): { y: number; m: number; d: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Denver",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? "0");
  return { y: get("year"), m: get("month"), d: get("day") };
}

/** Milliseconds since Denver midnight for an instant, via Intl parts. */
function denverTimeOfDayMs(now: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Denver",
    hourCycle: "h23",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(now);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? "0");
  return ((get("hour") * 60 + get("minute")) * 60 + get("second")) * 1000 + now.getMilliseconds();
}

/** The UTC instant of the current America/Denver day's midnight.
 *  "Today" for the counters is the owner's/audience's day, not UTC's. */
export function denverDayStartUtc(now: Date): Date {
  const { y, m, d } = denverParts(now);
  const utcMidnightOfDenverDate = Date.UTC(y, m - 1, d);
  const tod = denverTimeOfDayMs(new Date(utcMidnightOfDenverDate));
  const start = utcMidnightOfDenverDate + ((86_400_000 - tod) % 86_400_000);
  return new Date(start);
}
