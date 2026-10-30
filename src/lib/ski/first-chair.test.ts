import { describe, expect, it } from "vitest";
import {
  clampBufferMin,
  computeLeaveBy,
  formatDurationMin,
  minutesToClock,
  parseSunrises,
  shiftDate,
  sunriseForDate,
  timeToMinutes,
  DEFAULT_BUFFER_MIN,
} from "./first-chair";

describe("computeLeaveBy", () => {
  it("subtracts drive + buffer from the target", () => {
    const plan = computeLeaveBy({
      targetDate: "2026-10-31",
      targetMinutes: 7 * 60 + 15, // 7:15 AM sunrise
      driveDurationMin: 95,
      bufferMin: 30,
    });
    expect(plan).not.toBeNull();
    expect(plan!.leaveClock).toBe("5:10 AM");
    expect(plan!.leaveDate).toBe("2026-10-31");
    expect(plan!.isPreviousDay).toBe(false);
    expect(plan!.totalSubtractMin).toBe(125);
  });

  it("honours a zero buffer", () => {
    const plan = computeLeaveBy({
      targetDate: "2026-10-31",
      targetMinutes: 8 * 60,
      driveDurationMin: 60,
      bufferMin: 0,
    });
    expect(plan!.leaveClock).toBe("7:00 AM");
    expect(plan!.bufferMin).toBe(0);
  });

  it("clamps a negative buffer to zero instead of adding time", () => {
    const plan = computeLeaveBy({
      targetDate: "2026-10-31",
      targetMinutes: 8 * 60,
      driveDurationMin: 60,
      bufferMin: -45,
    });
    expect(plan!.bufferMin).toBe(0);
    expect(plan!.leaveClock).toBe("7:00 AM");
  });

  it("returns null when the drive duration is missing or zero", () => {
    const base = { targetDate: "2026-10-31", targetMinutes: 480, bufferMin: 30 };
    expect(computeLeaveBy({ ...base, driveDurationMin: null })).toBeNull();
    expect(computeLeaveBy({ ...base, driveDurationMin: undefined })).toBeNull();
    expect(computeLeaveBy({ ...base, driveDurationMin: 0 })).toBeNull();
    expect(computeLeaveBy({ ...base, driveDurationMin: NaN })).toBeNull();
  });

  it("flags a leave-by before midnight as the previous evening", () => {
    const plan = computeLeaveBy({
      targetDate: "2026-10-31",
      targetMinutes: 60, // 1:00 AM target
      driveDurationMin: 120,
      bufferMin: 30,
    });
    expect(plan!.isPreviousDay).toBe(true);
    expect(plan!.daysBack).toBe(1);
    expect(plan!.leaveDate).toBe("2026-10-30");
    expect(plan!.leaveClock).toBe("10:30 PM");
  });

  it("handles a drive long enough to cross two midnights", () => {
    const plan = computeLeaveBy({
      targetDate: "2026-10-31",
      targetMinutes: 30,
      driveDurationMin: 1500,
      bufferMin: 30,
    });
    expect(plan!.daysBack).toBe(2);
    expect(plan!.leaveDate).toBe("2026-10-29");
  });
});

describe("clampBufferMin", () => {
  it("defaults on non-finite input and caps large values", () => {
    expect(clampBufferMin(NaN)).toBe(DEFAULT_BUFFER_MIN);
    expect(clampBufferMin(9999)).toBe(480);
    expect(clampBufferMin(12.6)).toBe(13);
  });
});

describe("sunrise parsing", () => {
  const payload = {
    daily: {
      time: ["2026-10-31", "2026-11-01"],
      sunrise: ["2026-10-31T07:12", null],
    },
  };
  it("parses dates and sunrises, keeping nulls honest", () => {
    expect(parseSunrises(payload)).toEqual([
      { date: "2026-10-31", sunrise: "2026-10-31T07:12" },
      { date: "2026-11-01", sunrise: null },
    ]);
    expect(sunriseForDate(payload, "2026-10-31")).toBe("2026-10-31T07:12");
    expect(sunriseForDate(payload, "2026-11-01")).toBeNull();
    expect(sunriseForDate(payload, "2026-12-25")).toBeNull();
  });
  it("degrades malformed payloads to empty / null", () => {
    expect(parseSunrises(null)).toEqual([]);
    expect(parseSunrises({ daily: { time: "x" } })).toEqual([]);
    expect(sunriseForDate(undefined, "2026-10-31")).toBeNull();
  });
});

describe("formatting + time helpers", () => {
  it("formats minutes of day as a 12-hour clock", () => {
    expect(minutesToClock(0)).toBe("12:00 AM");
    expect(minutesToClock(7 * 60 + 5)).toBe("7:05 AM");
    expect(minutesToClock(12 * 60)).toBe("12:00 PM");
    expect(minutesToClock(13 * 60 + 30)).toBe("1:30 PM");
    expect(minutesToClock(23 * 60 + 59)).toBe("11:59 PM");
  });
  it("formats durations", () => {
    expect(formatDurationMin(0)).toBe("0 min");
    expect(formatDurationMin(45)).toBe("45 min");
    expect(formatDurationMin(120)).toBe("2 h");
    expect(formatDurationMin(150)).toBe("2 h 30 min");
  });
  it("parses clock and sunrise-ISO times to minutes", () => {
    expect(timeToMinutes("07:05")).toBe(425);
    expect(timeToMinutes("2026-10-31T07:12")).toBe(432);
    expect(timeToMinutes("24:00")).toBeNull();
    expect(timeToMinutes("nope")).toBeNull();
  });
  it("shifts dates across month boundaries", () => {
    expect(shiftDate("2026-11-01", -1)).toBe("2026-10-31");
    expect(shiftDate("2026-10-31", 1)).toBe("2026-11-01");
  });
});
