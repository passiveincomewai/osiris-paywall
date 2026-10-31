// ── Dated-event lifecycle ────────────────────────────────────────────
// Pages built around a dated event (a series, a festival, a launch
// window) go stale the day the event ends: present-tense copy like
// "Game 3 tonight" keeps asserting itself long after it stops being
// true. This helper gives those pages one shared, testable definition
// of where "now" sits relative to the event so they can switch to a
// past-event state (see components/EventEndedBanner.tsx and the
// world-series-2026 page for the first adopter).
//
// TIMEZONE CHOICE: all comparisons are by UTC calendar date. The end
// date is a date, not a moment — an event listed as ending on
// 2026-11-01 is "past" from 2026-11-02 everywhere on Earth, and still
// current through the whole of its final UTC day. Using UTC (rather
// than America/New_York or the reader's local zone) keeps the rendered
// phase identical for every visitor and every server, and matches how
// the site's other dated content (earthquakes, hurricanes) reasons
// about days. The one-day slack this can add for US-evening events is
// absorbed by choosing the end date conservatively (last possible
// scheduled day, plus buffer where a page's schedule allows it).

export type EventPhase = "upcoming" | "live" | "past";

/** Milliseconds in a day; UTC date arithmetic has no DST gaps. */
const DAY_MS = 86_400_000;

/**
 * The UTC calendar-day number for a Date (days since the epoch,
 * discarding time-of-day).
 */
function utcDayNumber(d: Date): number {
  return Math.floor(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / DAY_MS,
  );
}

/**
 * Parse an ISO date ("2026-11-01") or datetime ("2026-11-01T19:00:00Z")
 * into a UTC calendar-day number. A date-only string is read as that
 * UTC date; a datetime contributes its UTC date. Anything else throws —
 * a silently mis-parsed end date would pin a page in the wrong phase
 * forever, so fail loudly at render/test time instead.
 */
function parseUtcDayNumber(iso: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso.trim());
  if (m) {
    const year = Number(m[1]);
    const month = Number(m[2]);
    const day = Number(m[3]);
    const ms = Date.UTC(year, month - 1, day);
    const check = new Date(ms);
    if (
      check.getUTCFullYear() === year &&
      check.getUTCMonth() === month - 1 &&
      check.getUTCDate() === day
    ) {
      return Math.floor(ms / DAY_MS);
    }
  }
  throw new TypeError(
    `eventPhase: expected an ISO date like "2026-11-01", got ${JSON.stringify(iso)}`,
  );
}

/**
 * Where `now` sits relative to a dated event.
 *
 * - "past":     now's UTC date is AFTER the end date. The end date
 *               itself is the event's last day, never "past".
 * - "live":     now's UTC date is ON the end date — or, when a start
 *               date is supplied, anywhere from the start date through
 *               the end date inclusive.
 * - "upcoming": now's UTC date is before the event. With only an end
 *               date known, every day before the final day reads
 *               "upcoming"; pass `startDateISO` when a page knows its
 *               event's first day and wants the in-window days to read
 *               "live" instead.
 *
 * Pure: same inputs, same answer, no clock or environment reads.
 */
export function eventPhase(
  endDateISO: string,
  now: Date,
  startDateISO?: string,
): EventPhase {
  const today = utcDayNumber(now);
  const end = parseUtcDayNumber(endDateISO);
  if (today > end) return "past";
  if (startDateISO !== undefined) {
    const start = parseUtcDayNumber(startDateISO);
    return today >= start ? "live" : "upcoming";
  }
  return today === end ? "live" : "upcoming";
}
