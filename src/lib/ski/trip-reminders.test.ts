import { describe, expect, it } from "vitest";
import {
  daysUntilTrip,
  denverToday,
  dueReminderKind,
  formatTripDate,
  isValidTripDate,
  skiResortPageUrl,
  skiTripUnsubscribeUrl,
  tripDateError,
} from "./trip-reminders";

// A fixed "now": Fri Oct 30 2026, 12:00 UTC = 06:00 MDT in Denver.
const NOW = new Date("2026-10-30T12:00:00Z");

describe("isValidTripDate", () => {
  it("accepts real dates", () => {
    expect(isValidTripDate("2026-12-19")).toBe(true);
    expect(isValidTripDate("2028-02-29")).toBe(true); // leap year
  });
  it("rejects impossible and misshapen dates", () => {
    expect(isValidTripDate("2026-02-29")).toBe(false); // 2026 not leap
    expect(isValidTripDate("2026-13-01")).toBe(false);
    expect(isValidTripDate("2026-12-32")).toBe(false);
    expect(isValidTripDate("12/19/2026")).toBe(false);
    expect(isValidTripDate("2026-12-19T00:00:00Z")).toBe(false);
    expect(isValidTripDate("")).toBe(false);
    expect(isValidTripDate(null)).toBe(false);
    expect(isValidTripDate(20261219)).toBe(false);
  });
});

describe("denverToday / daysUntilTrip", () => {
  it("Denver is a day behind UTC in the small hours", () => {
    // Oct 30 05:30 UTC is still Oct 29, 23:30 MDT in Denver.
    expect(denverToday(new Date("2026-10-30T05:30:00Z"))).toBe("2026-10-29");
    expect(denverToday(NOW)).toBe("2026-10-30");
  });
  it("counts calendar days from Denver today", () => {
    expect(daysUntilTrip("2026-10-30", NOW)).toBe(0);
    expect(daysUntilTrip("2026-10-29", NOW)).toBe(-1);
    expect(daysUntilTrip("2026-11-13", NOW)).toBe(14);
    expect(daysUntilTrip("2026-12-14", NOW)).toBe(45);
    expect(daysUntilTrip("2026-12-15", NOW)).toBe(46);
  });
});

describe("dueReminderKind", () => {
  it("nothing is due far out or after the trip", () => {
    expect(dueReminderKind({ daysUntil: 46, sent45: false, sent14: false })).toBeNull();
    expect(dueReminderKind({ daysUntil: -1, sent45: false, sent14: false })).toBeNull();
  });
  it("T-45 is due across its whole window until stamped", () => {
    expect(dueReminderKind({ daysUntil: 45, sent45: false, sent14: false })).toBe("t45");
    expect(dueReminderKind({ daysUntil: 15, sent45: false, sent14: false })).toBe("t45");
    expect(dueReminderKind({ daysUntil: 45, sent45: true, sent14: false })).toBeNull();
  });
  it("T-14 takes over inside 14 days, even if T-45 never sent", () => {
    expect(dueReminderKind({ daysUntil: 14, sent45: false, sent14: false })).toBe("t14");
    expect(dueReminderKind({ daysUntil: 0, sent45: true, sent14: false })).toBe("t14");
    expect(dueReminderKind({ daysUntil: 3, sent45: false, sent14: true })).toBeNull();
  });
});

describe("tripDateError", () => {
  it("accepts a normal future trip", () => {
    expect(
      tripDateError({ tripStart: "2026-12-19", tripEnd: "2026-12-22", now: NOW }),
    ).toBeNull();
    expect(tripDateError({ tripStart: "2026-10-30", now: NOW })).toBeNull(); // today
  });
  it("rejects past dates with a plain message", () => {
    expect(tripDateError({ tripStart: "2026-10-29", now: NOW })).toMatch(/past/);
  });
  it("rejects a departure before arrival", () => {
    expect(
      tripDateError({ tripStart: "2026-12-19", tripEnd: "2026-12-18", now: NOW }),
    ).toMatch(/before arrival/);
  });
  it("rejects garbage and far-future dates", () => {
    expect(tripDateError({ tripStart: "soon", now: NOW })).toMatch(/real calendar date/);
    expect(tripDateError({ tripStart: "2028-06-01", now: NOW })).toMatch(/18 months/);
  });
});

describe("formatting + URLs", () => {
  it("formats a trip date", () => {
    expect(formatTripDate("2026-12-19")).toBe("Sat, Dec 19, 2026");
  });
  it("builds site URLs", () => {
    expect(skiResortPageUrl("park-city")).toBe("https://worldeye.app/ski-webcams/park-city");
    expect(skiTripUnsubscribeUrl("tok123")).toBe(
      "https://worldeye.app/api/ski/trip-reminders/unsubscribe?token=tok123",
    );
  });
});
