import { describe, it, expect } from "vitest";
import {
  archiveSnowfallUrl,
  forecastSnowfallUrl,
  monthlyBreakdown,
  rankStormRows,
  seasonWindow,
  summariseSnowfall,
} from "./openmeteo";

const FORECAST_FIXTURE = {
  daily: {
    time: ["2026-10-30", "2026-10-31", "2026-11-01", "2026-11-02", "2026-11-03"],
    snowfall_sum: [2.5, 0, 7.25, null, 1],
  },
};

describe("summariseSnowfall", () => {
  it("totals the days that carry a figure and finds the wettest day", () => {
    const s = summariseSnowfall(FORECAST_FIXTURE);
    expect(s.days).toHaveLength(5);
    expect(s.totalCm).toBeCloseTo(10.75);
    expect(s.wettest).toEqual({ date: "2026-11-01", snowfallCm: 7.25 });
  });
  it("returns null totals for an empty / malformed payload", () => {
    expect(summariseSnowfall(null).totalCm).toBeNull();
    expect(summariseSnowfall({}).days).toEqual([]);
    expect(
      summariseSnowfall({ daily: { time: ["2026-01-01"], snowfall_sum: [null] } })
        .totalCm,
    ).toBeNull();
  });
});

describe("urls", () => {
  it("builds a 5-day forecast snowfall URL", () => {
    const u = forecastSnowfallUrl(40.5884, -111.637);
    expect(u).toContain("api.open-meteo.com/v1/forecast");
    expect(u).toContain("snowfall_sum");
    expect(u).toContain("forecast_days=5");
  });
  it("builds an archive URL with the window", () => {
    const u = archiveSnowfallUrl(-45.03, 168.66, "2026-04-01", "2026-10-30");
    expect(u).toContain("archive-api.open-meteo.com/v1/archive");
    expect(u).toContain("start_date=2026-04-01");
    expect(u).toContain("end_date=2026-10-30");
  });
});

describe("seasonWindow", () => {
  it("northern: after Oct 1 the season started this Oct 1", () => {
    const w = seasonWindow(40.5, new Date(Date.UTC(2026, 9, 30)));
    expect(w.startDate).toBe("2026-10-01");
    expect(w.endDate).toBe("2026-10-30");
  });
  it("northern: before Oct 1 the season started the previous Oct 1", () => {
    const w = seasonWindow(40.5, new Date(Date.UTC(2026, 5, 15)));
    expect(w.startDate).toBe("2025-10-01");
    expect(w.endDate).toBe("2026-06-15");
  });
  it("southern: inside Apr–Oct the season runs Apr 1 to today", () => {
    const w = seasonWindow(-45, new Date(Date.UTC(2026, 6, 20)));
    expect(w.startDate).toBe("2026-04-01");
    expect(w.endDate).toBe("2026-07-20");
  });
  it("southern: after Oct 31 the completed season is shown", () => {
    const w = seasonWindow(-45, new Date(Date.UTC(2026, 10, 15)));
    expect(w.startDate).toBe("2026-04-01");
    expect(w.endDate).toBe("2026-10-31");
  });
  it("southern: before Apr 1 the previous completed season is shown", () => {
    const w = seasonWindow(-45, new Date(Date.UTC(2026, 1, 10)));
    expect(w.startDate).toBe("2025-04-01");
    expect(w.endDate).toBe("2025-10-31");
  });
});

describe("monthlyBreakdown", () => {
  it("groups by calendar month in order", () => {
    const months = monthlyBreakdown([
      { date: "2026-10-15", snowfallCm: 3 },
      { date: "2026-10-20", snowfallCm: 2 },
      { date: "2026-11-02", snowfallCm: 5 },
      { date: "2026-11-03", snowfallCm: null },
    ]);
    expect(months).toEqual([
      { month: "2026-10", label: "Oct 2026", totalCm: 5 },
      { month: "2026-11", label: "Nov 2026", totalCm: 5 },
    ]);
  });
});

describe("rankStormRows", () => {
  it("ranks by total desc and sinks unavailable resorts last", () => {
    const rows = rankStormRows([
      { resort: "a", summary: { days: [], totalCm: 4, wettest: null } },
      { resort: "b", summary: null },
      { resort: "c", summary: { days: [], totalCm: 12, wettest: null } },
    ]);
    expect(rows.map((r) => r.resort)).toEqual(["c", "a", "b"]);
  });
});
