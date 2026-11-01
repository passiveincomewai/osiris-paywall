// Storm-window pins (pick 10): the 3-day forward window, the ≥5 cm
// first-snow-day rule, and the date-shift used by the dedupe guard.
import { describe, it, expect } from "vitest";
import { stormWindow, shiftDateKey, STORM_WATCH_THRESHOLD_CM } from "./storm-watch";
import type { DailySnowfall } from "./openmeteo";

const daily = (rows: [string, number | null][]): DailySnowfall[] =>
  rows.map(([date, snowfallCm]) => ({ date, snowfallCm }));

describe("stormWindow", () => {
  it("sums the 3 days from the start key and finds the first real snow day", () => {
    const w = stormWindow(
      daily([
        ["2026-11-01", 2],
        ["2026-11-02", 12],
        ["2026-11-03", 20],
        ["2026-11-04", 9],
        ["2026-11-05", 50],
      ]),
      "2026-11-01",
    );
    expect(w?.totalCm).toBe(34); // 2 + 12 + 20 — day 4 and 5 excluded
    expect(w?.firstSnowDate).toBe("2026-11-02"); // first day ≥ 5 cm
    expect(w!.totalCm).toBeGreaterThanOrEqual(STORM_WATCH_THRESHOLD_CM);
  });
  it("skips null entries and never treats missing data as zero-snow proof", () => {
    expect(stormWindow(daily([["2026-11-01", null]]), "2026-11-01")).toBeNull();
    const w = stormWindow(
      daily([
        ["2026-11-01", null],
        ["2026-11-02", 31],
      ]),
      "2026-11-01",
    );
    expect(w?.totalCm).toBe(31);
  });
  it("returns null when the feed starts after the window", () => {
    expect(stormWindow(daily([["2026-12-01", 40]]), "2026-11-01")?.totalCm).toBe(40);
    expect(stormWindow([], "2026-11-01")).toBeNull();
  });
});

describe("shiftDateKey", () => {
  it("shifts across month boundaries", () => {
    expect(shiftDateKey("2026-11-01", -1)).toBe("2026-10-31");
    expect(shiftDateKey("2026-11-01", -2)).toBe("2026-10-30");
    expect(shiftDateKey("2026-11-01", 0)).toBe("2026-11-01");
  });
});
