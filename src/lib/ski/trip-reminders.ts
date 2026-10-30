/**
 * Ski trip booking reminders — the shared decision logic.
 *
 * A signed-in user picks a resort from the live ski directory, trip
 * dates and an email address; the cron runner
 * (~/workspace/goals/worldeye-organic-growth-engine/hidden_files/
 * ski-reminders/runner.py) emails two book-ahead nudges: one 45 days
 * before the trip ("book flights + lodging") and a final one 14 days
 * before. Reminders only — there is no booking engine, no affiliate
 * link and no price anywhere in this flow.
 *
 * This module is the canonical, pure implementation of the date and
 * dedupe rules (unit-tested in trip-reminders.test.ts); the runner
 * mirrors them exactly:
 *   — "days until" counts CALENDAR days in America/Denver (the site's
 *     home timezone) between today and the arrival date, so a reminder
 *     fires on the same local morning for every subscriber;
 *   — the T-45 email is due while 14 < daysUntil <= 45 and sent45At
 *     is unset; the T-14 email is due while 0 <= daysUntil <= 14 and
 *     sent14At is unset. A reminder created inside a window gets that
 *     window's email on the next runner pass (catch-up), never both
 *     in one pass — inside 14 days only the final nudge is relevant;
 *   — the sent45At/sent14At stamps are the dedupe: once stamped, that
 *     email never goes out again for that reminder.
 */

export const SKI_REMINDERS_SITE = "https://worldeye.app";

/** Lead days for the two reminder emails. */
export const REMINDER_T45_DAYS = 45;
export const REMINDER_T14_DAYS = 14;

/** Trips further out than this are refused (a sanity bound, ~18 months). */
export const MAX_TRIP_DAYS_OUT = 548;

const DATE_SHAPE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Strict YYYY-MM-DD that names a real calendar date. */
export function isValidTripDate(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const m = DATE_SHAPE.exec(value);
  if (!m) return false;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return false;
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === mo - 1 &&
    dt.getUTCDate() === d
  );
}

/** Today's date (YYYY-MM-DD) in America/Denver for an instant. */
export function denverToday(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Denver",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function utcMidnight(dateStr: string): number {
  const m = DATE_SHAPE.exec(dateStr);
  if (!m) return Number.NaN;
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/**
 * Whole calendar days from Denver-today to the trip's arrival date.
 * 0 = the trip starts today; negative = the date has passed.
 */
export function daysUntilTrip(tripStart: string, now: Date): number {
  return Math.round(
    (utcMidnight(tripStart) - utcMidnight(denverToday(now))) / 86_400_000,
  );
}

export type ReminderKind = "t45" | "t14";

/**
 * Which reminder email (if any) is due for a reminder in this state.
 * The T-14 window takes over inside 14 days: a reminder created late
 * never receives a stale T-45 after its final nudge window opens.
 */
export function dueReminderKind(input: {
  daysUntil: number;
  sent45: boolean;
  sent14: boolean;
}): ReminderKind | null {
  if (input.daysUntil < 0) return null;
  if (input.daysUntil <= REMINDER_T14_DAYS) {
    return input.sent14 ? null : "t14";
  }
  if (input.daysUntil <= REMINDER_T45_DAYS) {
    return input.sent45 ? null : "t45";
  }
  return null;
}

/**
 * Plain-language rejection for unusable trip dates, or null when the
 * dates are acceptable. Past dates are refused — a reminder for a
 * trip that already started can only ever be noise.
 */
export function tripDateError(input: {
  tripStart: unknown;
  tripEnd?: unknown;
  now: Date;
}): string | null {
  if (!isValidTripDate(input.tripStart)) {
    return "Pick the day you arrive — a real calendar date.";
  }
  if (input.tripEnd !== undefined && input.tripEnd !== null && input.tripEnd !== "") {
    if (!isValidTripDate(input.tripEnd)) {
      return "The departure day needs to be a real calendar date.";
    }
    if (utcMidnight(input.tripEnd) < utcMidnight(input.tripStart)) {
      return "Departure day is before arrival day — check the dates.";
    }
  }
  const days = daysUntilTrip(input.tripStart, input.now);
  if (days < 0) {
    return "That arrival date is in the past — pick a date that's still coming up.";
  }
  if (days > MAX_TRIP_DAYS_OUT) {
    return "That trip is more than 18 months away — reminders open closer to the date.";
  }
  return null;
}

/** "Fri, Dec 19, 2026" for a YYYY-MM-DD trip date. */
export function formatTripDate(tripStart: string): string {
  const m = DATE_SHAPE.exec(tripStart);
  if (!m) return tripStart;
  const dt = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(dt);
}

// ── URLs (shared by the API routes, the form, and the runner) ──────

export function skiResortPageUrl(resortSlug: string): string {
  return `${SKI_REMINDERS_SITE}/ski-webcams/${resortSlug}`;
}

export function skiTripUnsubscribeUrl(unsubToken: string): string {
  return `${SKI_REMINDERS_SITE}/api/ski/trip-reminders/unsubscribe?token=${unsubToken}`;
}
