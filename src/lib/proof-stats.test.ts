import { describe, expect, it } from "vitest";
import {
  catalogueCoverage,
  denverDayStartUtc,
  distinctSessionCount,
} from "./proof-stats";

describe("distinctSessionCount", () => {
  it("counts each session once and ignores blanks", () => {
    expect(
      distinctSessionCount([
        { sessionId: "a" },
        { sessionId: "a" },
        { sessionId: "b" },
        { sessionId: "" },
        { sessionId: 42 },
        {},
      ]),
    ).toBe(2);
  });
});

describe("catalogueCoverage", () => {
  it("counts distinct trimmed countries and sources", () => {
    const cov = catalogueCoverage([
      { country: "US", source: "UDOT" },
      { country: " US ", source: "UDOT" },
      { country: "JP", source: "river.go.jp" },
      { country: "", source: null },
      {},
    ]);
    expect(cov).toEqual({ countries: 2, sources: 2, records: 5 });
  });
});

describe("denverDayStartUtc", () => {
  it("resolves Denver midnight during MDT (UTC-6)", () => {
    // Fri 2026-10-23 12:00 UTC = 06:00 MDT. Denver midnight was 06:00 UTC.
    expect(denverDayStartUtc(new Date("2026-10-23T12:00:00Z")).toISOString()).toBe(
      "2026-10-23T06:00:00.000Z",
    );
  });

  it("resolves Denver midnight during MST (UTC-7)", () => {
    // 2026-01-15 12:00 UTC = 05:00 MST. Denver midnight was 07:00 UTC.
    expect(denverDayStartUtc(new Date("2026-01-15T12:00:00Z")).toISOString()).toBe(
      "2026-01-15T07:00:00.000Z",
    );
  });

  it("an instant just after Denver midnight starts that same day", () => {
    // 2026-10-23T06:30:00Z = 00:30 MDT on Oct 23.
    expect(denverDayStartUtc(new Date("2026-10-23T06:30:00Z")).toISOString()).toBe(
      "2026-10-23T06:00:00.000Z",
    );
  });
});
