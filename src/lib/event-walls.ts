/**
 * Live event walls — status logic.
 *
 * A wall is honest about its moment: inside its annual window (or
 * always, for an evergreen wall) it is "live"; outside, it is
 * "off-season" and names the date the window next opens. The state is
 * computed from the schedule in src/data/event-walls.ts and the
 * current date — pages revalidate hourly, so the line never goes
 * stale by more than that.
 *
 * Window math is month/day in UTC: deterministic in tests, and close
 * enough for season-scale windows (the events here span days to
 * months, never hours).
 */

import type { EventWall } from "@/data/event-walls";

export type WallState = "live" | "off-season";

export interface WallStatus {
  state: WallState;
  /** Annual walls only, when off-season: the next date the window
   *  opens (UTC midnight of that day). Null when live or evergreen. */
  nextStart: Date | null;
}

const md = (month: number, day: number) => month * 100 + day;

function utcDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

/** The wall's state at `now`, and when it next opens if it's shut. */
export function wallStatusAt(wall: EventWall, now: Date): WallStatus {
  const sched = wall.schedule;
  if (sched.kind === "evergreen") return { state: "live", nextStart: null };

  const cur = md(now.getUTCMonth() + 1, now.getUTCDate());
  const start = md(sched.start.month, sched.start.day);
  const end = md(sched.end.month, sched.end.day);
  const year = now.getUTCFullYear();

  if (start <= end) {
    // Window inside one calendar year (hurricane: Jun 1 – Nov 30).
    if (cur >= start && cur <= end) return { state: "live", nextStart: null };
    const next =
      cur < start
        ? utcDate(year, sched.start.month, sched.start.day)
        : utcDate(year + 1, sched.start.month, sched.start.day);
    return { state: "off-season", nextStart: next };
  }

  // Wrapping window (aurora: Sep 1 – Mar 31; New Year: Dec 30 – Jan 2).
  if (cur >= start || cur <= end) return { state: "live", nextStart: null };
  return {
    state: "off-season",
    nextStart: utcDate(year, sched.start.month, sched.start.day),
  };
}

/** Short state label for pills and cards. */
export function wallStateLabel(wall: EventWall, status: WallStatus): string {
  if (status.state === "live") {
    return wall.schedule.kind === "evergreen" ? "Always live" : "In season now";
  }
  return "Off-season";
}

/** "December 30, 2026" — for next-window lines. */
export function formatWallDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    timeZone: "UTC",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * The one-line status for a wall at `now`: the state label plus, when
 * off-season, the date the window next opens. Used by the hub cards
 * and the wall page banner so both say the same thing.
 */
export function wallStatusLine(wall: EventWall, now: Date): string {
  const status = wallStatusAt(wall, now);
  const label = wallStateLabel(wall, status);
  if (status.state === "live") return `${label} — ${wall.eventLabel}`;
  if (status.nextStart) {
    return `${label} — ${wall.eventLabel} returns ${formatWallDate(status.nextStart)}`;
  }
  return label;
}
