import { describe, it, expect } from "vitest";
import {
  biggestMonth,
  snowiestResort,
  summariseLoggedDays,
  type ResortSeasonSnow,
} from "./season-review";

describe("summariseLoggedDays", () => {
  it("counts days and distinct non-null resorts", () => {
    const s = summariseLoggedDays([
      { resortSlug: "alta" },
      { resortSlug: "alta" },
      { resortSlug: "brighton" },
      { resortSlug: null },
    ]);
    expect(s.daysLogged).toBe(4);
    expect(s.distinctResorts).toBe(2);
    expect(s.distinctResortSlugs).toEqual(["alta", "brighton"]);
  });
  it("is honestly zero for no logged days", () => {
    expect(summariseLoggedDays([])).toEqual({
      daysLogged: 0,
      distinctResortSlugs: [],
      distinctResorts: 0,
    });
  });
});

const entry = (
  slug: string,
  totalCm: number | null,
  months: ResortSeasonSnow["months"] = [],
): ResortSeasonSnow => ({ slug, name: slug, totalCm, months });

describe("snowiestResort", () => {
  it("picks the highest modelled total and skips unavailable", () => {
    const best = snowiestResort([
      entry("a", 50),
      entry("b", null),
      entry("c", 120),
    ]);
    expect(best?.slug).toBe("c");
  });
  it("returns null when every fetch was unavailable or list is empty", () => {
    expect(snowiestResort([entry("a", null)])).toBeNull();
    expect(snowiestResort([])).toBeNull();
  });
});

describe("biggestMonth", () => {
  it("finds the biggest single month across resorts", () => {
    const best = biggestMonth([
      entry("a", 80, [
        { month: "2026-10", label: "Oct 2026", totalCm: 30 },
        { month: "2026-11", label: "Nov 2026", totalCm: 50 },
      ]),
      entry("b", 90, [
        { month: "2026-10", label: "Oct 2026", totalCm: null },
        { month: "2026-12", label: "Dec 2026", totalCm: 65 },
      ]),
    ]);
    expect(best).toEqual({
      slug: "b",
      name: "b",
      month: "2026-12",
      label: "Dec 2026",
      totalCm: 65,
    });
  });
  it("returns null when no month carries a figure", () => {
    expect(
      biggestMonth([
        entry("a", null, [{ month: "2026-10", label: "Oct 2026", totalCm: null }]),
      ]),
    ).toBeNull();
    expect(biggestMonth([])).toBeNull();
  });
});
