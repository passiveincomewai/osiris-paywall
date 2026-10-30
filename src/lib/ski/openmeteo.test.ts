import { describe, it, expect } from "vitest";
import {
  archiveSnowfallUrl,
  forecastSnowfallUrl,
  monthlyBreakdown,
  rankStormRows,
  seasonWindow,
  summariseSnowfall,
  parseDailySnowfall,
  parseHourlySnowfall,
  trailing24hSnowfallCm,
  upcomingWeekendSnowfall,
  localDateKey,
  formatCm,
  type HourlySnowfall,
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
/* Fixture-shaped Open-Meteo payloads (trimmed real response shapes). */
const DAILY_FIXTURE = {
  utc_offset_seconds: -25200,
  timezone: "America/Denver",
  daily: {
    time: ["2026-10-28", "2026-10-29", "2026-10-30", "2026-10-31", "2026-11-01"],
    snowfall_sum: [0.0, 4.2, 11.5, 3.0, null],
  },
};

function hourlySeries(startIso: string, values: (number | null)[]): HourlySnowfall[] {
  const start = new Date(`${startIso}:00Z`).getTime();
  return values.map((v, i) => {
    const t = new Date(start + i * 3600_000);
    const iso = t.toISOString().slice(0, 16);
    return { time: iso, snowfallCm: v };
  });
}

describe("parseDailySnowfall", () => {
  it("parses dates + snowfall_sum, keeping nulls as null", () => {
    const rows = parseDailySnowfall(DAILY_FIXTURE);
    expect(rows).toHaveLength(5);
    expect(rows[2]).toEqual({ date: "2026-10-30", snowfallCm: 11.5 });
    expect(rows[4]).toEqual({ date: "2026-11-01", snowfallCm: null });
  });
  it("returns [] on malformed payloads", () => {
    expect(parseDailySnowfall(null)).toEqual([]);
    expect(parseDailySnowfall({ daily: { time: "nope" } })).toEqual([]);
    expect(parseDailySnowfall({})).toEqual([]);
  });
});

describe("parseHourlySnowfall", () => {
  it("parses hourly snowfall entries", () => {
    const rows = parseHourlySnowfall({
      hourly: { time: ["2026-10-30T05:00", "2026-10-30T06:00"], snowfall: [1.5, null] },
    });
    expect(rows).toEqual([
      { time: "2026-10-30T05:00", snowfallCm: 1.5 },
      { time: "2026-10-30T06:00", snowfallCm: null },
    ]);
  });
});

describe("trailing24hSnowfallCm", () => {
  // Resort offset UTC-7. Run at 2026-10-30T12:20Z = 05:20 local, so the
  // 24 complete hours are local 2026-10-29T05:00 .. 2026-10-30T04:00.
  const now = new Date("2026-10-30T12:20:00Z");
  it("sums exactly the 24 complete hours before the current local hour", () => {
    const series = hourlySeries("2026-10-28T00:00", Array(80).fill(0));
    // Snow only inside the window: local 2026-10-29T10:00 (= index from
    // 2026-10-28T00:00 -> 34h) and 2026-10-30T04:00 (52h).
    const vals = Array(80).fill(0);
    vals[34] = 7.5;
    vals[52] = 4.0;
    vals[53] = 99; // current in-progress hour — must NOT count
    vals[28] = 99; // one hour before the window opens — must NOT count
    const withSnow = hourlySeries("2026-10-28T00:00", vals);
    expect(series).toHaveLength(80);
    expect(trailing24hSnowfallCm(withSnow, now, -25200)).toBeCloseTo(11.5);
  });
  it("returns null without an offset or a full 24h of complete hours", () => {
    const short = hourlySeries("2026-10-30T00:00", Array(10).fill(1));
    expect(trailing24hSnowfallCm(short, now, -25200)).toBeNull();
    const long = hourlySeries("2026-10-28T00:00", Array(80).fill(1));
    expect(trailing24hSnowfallCm(long, now, null)).toBeNull();
  });
  it("returns null when the whole window is null (no data, not zero snow)", () => {
    const nulls = hourlySeries("2026-10-28T00:00", Array(80).fill(null));
    expect(trailing24hSnowfallCm(nulls, now, -25200)).toBeNull();
  });
});

describe("upcomingWeekendSnowfall", () => {
  it("sums Fri+Sat+Sun after the reference date (Thu run)", () => {
    // 2026-10-29 is a Thursday; weekend = Oct 30 (Fri), 31 (Sat), Nov 1 (Sun).
    const daily = parseDailySnowfall(DAILY_FIXTURE);
    const wk = upcomingWeekendSnowfall(daily, "2026-10-29");
    expect(wk?.days.map(d => d.date)).toEqual(["2026-10-30", "2026-10-31", "2026-11-01"]);
    expect(wk?.totalCm).toBeCloseTo(14.5); // 11.5 + 3.0 + null(0)
  });
  it("returns null when no full Fri-Sun set exists after the reference date", () => {
    const daily = parseDailySnowfall(DAILY_FIXTURE);
    expect(upcomingWeekendSnowfall(daily, "2026-10-31")).toBeNull();
  });
});

describe("localDateKey + formatCm", () => {
  it("derives the resort-local date from the offset", () => {
    expect(localDateKey(new Date("2026-10-30T02:00:00Z"), -25200)).toBe("2026-10-29");
    expect(localDateKey(new Date("2026-10-30T12:00:00Z"), -25200)).toBe("2026-10-30");
  });
  it("formats cm with one decimal", () => {
    expect(formatCm(11.54)).toBe("11.5 cm");
    expect(formatCm(0)).toBe("0.0 cm");
  });
});
