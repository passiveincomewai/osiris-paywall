import { describe, expect, it } from "vitest";
import type { HourlySnowfall, ResortSnowData } from "./openmeteo";
import {
  buildSnowReportView,
  formatSnowfall,
  snowReportHasFigures,
} from "./snow-report";

/* now = Fri 2026-11-06 15:30 UTC; at UTC-7 the resort-local time is
   08:30, so "today" is 2026-11-06 and the current (in-progress) local
   hour is 2026-11-06T08:00. */
const NOW = new Date("2026-11-06T15:30:00Z");
const OFFSET = -25200;

function hourlyWindow(perHour: number | null): HourlySnowfall[] {
  const out: HourlySnowfall[] = [];
  // 30 complete local hours ending at 2026-11-06T07:00, then the
  // in-progress hour (must be excluded from the trailing sum).
  const start = new Date("2026-11-05T01:00:00Z");
  for (let i = 0; i < 30; i++) {
    const t = new Date(start.getTime() + i * 3_600_000);
    const key = t.toISOString().slice(0, 13) + ":00";
    out.push({ time: key, snowfallCm: perHour });
  }
  out.push({ time: "2026-11-06T08:00", snowfallCm: 99 });
  return out;
}

function data(overrides: Partial<ResortSnowData> = {}): ResortSnowData {
  return {
    daily: [
      { date: "2026-11-05", snowfallCm: 4.0 },
      { date: "2026-11-06", snowfallCm: 3.2 },
      { date: "2026-11-07", snowfallCm: 1.0 },
      { date: "2026-11-08", snowfallCm: 2.0 },
      { date: "2026-11-09", snowfallCm: null },
      { date: "2026-11-10", snowfallCm: 5.0 },
    ],
    hourly: hourlyWindow(0.5),
    utcOffsetSeconds: OFFSET,
    timezone: "America/Denver",
    fetchedAt: new Date("2026-11-06T15:30:00Z"),
    ...overrides,
  };
}

describe("buildSnowReportView", () => {
  it("orients today and the next three days in the resort's timezone", () => {
    const view = buildSnowReportView(data(), NOW);
    expect(view).not.toBeNull();
    expect(view!.today).toEqual({
      date: "2026-11-06",
      label: "Friday, November 6",
      snowfallCm: 3.2,
    });
    expect(view!.upcoming.map(d => d.date)).toEqual([
      "2026-11-07",
      "2026-11-08",
      "2026-11-09",
    ]);
    expect(view!.upcomingTotalCm).toBeCloseTo(3.0);
  });

  it("sums the trailing 24 complete hours, never the in-progress hour", () => {
    const view = buildSnowReportView(data(), NOW);
    expect(view!.last24hCm).toBeCloseTo(12.0);
  });

  it("refuses to orient days without a UTC offset", () => {
    expect(buildSnowReportView(data({ utcOffsetSeconds: null }), NOW)).toBeNull();
  });

  it("carries the fetch time and timezone through for labelling", () => {
    const view = buildSnowReportView(data(), NOW);
    expect(view!.fetchedAtIso).toBe("2026-11-06T15:30:00.000Z");
    expect(view!.timezone).toBe("America/Denver");
  });

  it("reports no figures when the model returned only nulls", () => {
    const view = buildSnowReportView(
      data({
        daily: [{ date: "2026-11-06", snowfallCm: null }],
        hourly: hourlyWindow(null),
      }),
      NOW,
    );
    expect(view).not.toBeNull();
    expect(view!.last24hCm).toBeNull();
    expect(snowReportHasFigures(view!)).toBe(false);
  });
});

describe("formatSnowfall", () => {
  it("renders metric primary with the imperial conversion", () => {
    expect(formatSnowfall(12.3)).toBe("12.3 cm (4.8 in)");
    expect(formatSnowfall(0)).toBe("0.0 cm (0.0 in)");
  });
});
