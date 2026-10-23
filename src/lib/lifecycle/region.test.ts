// Region-interest tests: the whole point is that attribution is honest
// (only country-explorer activity counts, globe opens attribute to
// nothing) and the "heavy time" bar is concrete — every threshold in
// config.ts is pinned at its edge.
import { describe, it, expect } from "vitest";
import {
  aggregateRegionStats,
  countrySlugFromPath,
  summarizeRegionInterest,
  type RegionRow,
} from "./region";

const rows = (slug: string, opens: number, views: number, dwellEach = 60): RegionRow[] => [
  ...Array.from({ length: opens }, () => ({
    path: `/cameras/countries/${slug}`,
    event: "camera_open",
    durationSec: null,
  })),
  ...Array.from({ length: views }, () => ({
    path: `/cameras/countries/${slug}`,
    event: null,
    durationSec: dwellEach,
  })),
];

describe("countrySlugFromPath", () => {
  it("extracts the slug from explorer paths only", () => {
    expect(countrySlugFromPath("/cameras/countries/japan")).toBe("japan");
    expect(countrySlugFromPath("/cameras/countries/united-states?x=1")).toBe("united-states");
    expect(countrySlugFromPath("/")).toBeNull();
    expect(countrySlugFromPath("/pricing")).toBeNull();
    expect(countrySlugFromPath("/cameras/countries/")).toBeNull();
  });
});

describe("aggregateRegionStats", () => {
  it("counts opens, views and dwell per country; ignores other rows", () => {
    const stats = aggregateRegionStats([
      ...rows("japan", 3, 2, 45),
      { path: "/", event: "camera_open", durationSec: null }, // globe open: no country
      { path: "/cameras/countries/japan", event: "globe_reached", durationSec: null },
      { path: "/cameras/countries/france", event: null, durationSec: null },
    ]);
    const japan = stats.find((s) => s.slug === "japan");
    expect(japan).toEqual({ slug: "japan", opens: 3, views: 2, dwellSec: 90 });
    const france = stats.find((s) => s.slug === "france");
    expect(france).toEqual({ slug: "france", opens: 0, views: 1, dwellSec: 0 });
  });
});

describe("summarizeRegionInterest", () => {
  it("returns the dominant country when every threshold is met", () => {
    const r = summarizeRegionInterest(aggregateRegionStats([...rows("japan", 9, 4), ...rows("france", 2, 1)]));
    expect(r?.slug).toBe("japan");
    expect(r?.opens).toBe(9);
    expect(r?.share).toBeCloseTo(9 / 11);
  });

  it("is null below the opens bar, the touches bar, or the dwell bar", () => {
    expect(summarizeRegionInterest(aggregateRegionStats(rows("japan", 7, 10)))).toBeNull(); // opens 7 < 8
    expect(summarizeRegionInterest(aggregateRegionStats(rows("japan", 8, 0)))).toBeNull(); // touches 8 < 12
    expect(summarizeRegionInterest(aggregateRegionStats(rows("japan", 8, 4, 10)))).toBeNull(); // dwell 40 < 180
  });

  it("is null for a world tour — no country holds half the opens", () => {
    const stats = aggregateRegionStats([
      ...rows("japan", 8, 4),
      ...rows("france", 8, 4),
      ...rows("brazil", 8, 4),
    ]);
    expect(summarizeRegionInterest(stats)).toBeNull();
  });

  it("is null with no attributed opens at all", () => {
    expect(summarizeRegionInterest([])).toBeNull();
    expect(summarizeRegionInterest(aggregateRegionStats(rows("japan", 0, 20)))).toBeNull();
  });
});
