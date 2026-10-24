import { describe, expect, it } from "vitest";
import {
  bucketSeries, buildFunnel, platformFromReferrer, deviceFromUserAgent,
  osFromUserAgent, countBy, rankHistoryFromXpEvents, trackingSlugFromLabel,
  buildTrackedUrl, toCsv, weekKey, type DailyPoint,
} from "./insights";
import { RANKS } from "./ranks";

const days = (rows: [string, number, number][]): DailyPoint[] =>
  rows.map(([date, cents, clicks]) => ({ date, cents, clicks }));

describe("bucketSeries", () => {
  const daily = days([
    ["2026-10-05", 100, 3], ["2026-10-06", 200, 4], ["2026-10-12", 50, 1],
    ["2026-10-31", 700, 9], ["2026-11-01", 300, 2],
  ]);
  it("day granularity is identity", () => {
    expect(bucketSeries(daily, "day")).toEqual(daily);
  });
  it("weeks start on Monday (UTC)", () => {
    const w = bucketSeries(daily, "week");
    // 2026-10-05 is a Monday; 10-06 folds into it; 10-12 is the next Monday;
    // 10-31 (Sat) and 11-01 (Sun) fold into Mon 10-26.
    expect(w).toEqual([
      { date: "2026-10-05", cents: 300, clicks: 7 },
      { date: "2026-10-12", cents: 50, clicks: 1 },
      { date: "2026-10-26", cents: 1000, clicks: 11 },
    ]);
    expect(weekKey("2026-10-22")).toBe("2026-10-19"); // Thursday → Monday
  });
  it("months bucket by calendar month", () => {
    expect(bucketSeries(daily, "month")).toEqual([
      { date: "2026-10-01", cents: 1050, clicks: 17 },
      { date: "2026-11-01", cents: 300, clicks: 2 },
    ]);
  });
});

describe("buildFunnel", () => {
  it("computes step and overall rates", () => {
    const f = buildFunnel([
      { key: "clicks", label: "Clicks", count: 200 },
      { key: "signups", label: "Signups", count: 50 },
      { key: "paying", label: "Paying", count: 10 },
    ]);
    expect(f[0].pctOfPrev).toBeNull();
    expect(f[1]).toMatchObject({ pctOfPrev: 25, pctOfFirst: 25 });
    expect(f[2]).toMatchObject({ pctOfPrev: 20, pctOfFirst: 5 });
  });
  it("zero-safe", () => {
    const f = buildFunnel([{ key: "a", label: "A", count: 0 }, { key: "b", label: "B", count: 0 }]);
    expect(f[1].pctOfPrev).toBe(0);
    expect(f[1].pctOfFirst).toBe(0);
  });
});

describe("source parsing", () => {
  it("platform from referrer host", () => {
    expect(platformFromReferrer("https://www.youtube.com/watch?v=1")).toBe("YouTube");
    expect(platformFromReferrer("https://l.instagram.com/?u=x")).toBe("Instagram");
    expect(platformFromReferrer("https://x.com/post/1")).toBe("X (Twitter)");
    expect(platformFromReferrer("https://worldeye.app/pricing")).toBe("WorldEye (internal)");
    expect(platformFromReferrer(null)).toBe("No referrer (direct / in-app)");
    expect(platformFromReferrer("not a url")).toBe("Other");
  });
  it("device + os from UA", () => {
    const iphone = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148";
    expect(deviceFromUserAgent(iphone)).toBe("Mobile");
    expect(osFromUserAgent(iphone)).toBe("iOS");
    const win = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36";
    expect(deviceFromUserAgent(win)).toBe("Desktop");
    expect(osFromUserAgent(win)).toBe("Windows");
    expect(deviceFromUserAgent(null)).toBe("Not tracked");
  });
  it("countBy sorts desc with shares", () => {
    const out = countBy(["a", "b", "a", "a", "b"], (x) => x);
    expect(out[0]).toEqual({ label: "a", count: 3, pct: 60 });
  });
});

describe("rankHistoryFromXpEvents", () => {
  it("derives transitions from cumulative XP", () => {
    const events = [
      { xp: 100, createdAt: new Date("2026-01-01") },
      { xp: 950, createdAt: new Date("2026-02-01") },
      { xp: 2000, createdAt: new Date("2026-03-01") },
      { xp: 100, createdAt: new Date("2026-03-02") },
    ];
    const h = rankHistoryFromXpEvents(events, RANKS);
    expect(h.map((x) => x.rankKey)).toEqual(["explorer", "scout", "analyst"]);
    expect(h[1].xpTotal).toBe(1050);
  });
  it("empty ledger → no history", () => {
    expect(rankHistoryFromXpEvents([], RANKS)).toEqual([]);
  });
});

describe("tracking links + csv", () => {
  it("slugifies labels into the code alphabet", () => {
    expect(trackingSlugFromLabel("YouTube Description!")).toBe("youtube-description");
    expect(trackingSlugFromLabel("ab")).toBe(""); // too short
  });
  it("buildTrackedUrl sets UTM params", () => {
    const u = buildTrackedUrl("https://worldeye.app/ref/ABC?t=yt", { source: "youtube", medium: "video" });
    expect(u).toContain("utm_source=youtube");
    expect(u).toContain("t=yt");
  });
  it("csv escapes quotes and commas", () => {
    expect(toCsv(["a", "b"], [["x,y", 'he said "hi"']])).toBe('a,b\n"x,y","he said ""hi"""\n');
  });
});
