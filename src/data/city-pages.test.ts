import { describe, expect, it } from "vitest";
import cityPages from "./city-pages.json";

// The generated /city-webcams tier is only honest if the committed data
// keeps the promises tools/build-city-pages.mjs makes: a real threshold,
// unique slugs that never shadow the hand-written editorial pages, and
// samples that carry catalogue ids the globe's share links can open.

const CURATED_SLUGS = [
  "london", "ottawa", "toronto", "madrid", "houston",
  "dallas", "tokyo", "sydney", "auckland", "fort-worth",
];

type City = (typeof cityPages.cities)[number];

describe("city-pages.json", () => {
  const cities = cityPages.cities as City[];

  it("has a substantial generated tier", () => {
    expect(cities.length).toBeGreaterThanOrEqual(40);
    expect(cityPages.assembledTotal).toBeGreaterThan(50000);
  });

  // The stated threshold is the page-creation bar, judged since the
  // city-scale wave (2026-10-27) on the group's OWNED set — its
  // dominant place (tools/build-city-pages.mjs). A page's count
  // describes that dominant place, which can hold fewer cameras than
  // the merged name group that first earned the page at the old
  // 50-camera tier (Marysville: 52 merged, 48 in Marysville WA).
  // The six pages created under that tier whose owned counts sit
  // below it are pinned here: they clear the current 25 bar, but a
  // regen that moved one of them across the 50 line in either
  // direction, or dropped any city under the stated threshold,
  // means a regen mis-owned a cluster.
  const BELOW_50_AFTER_OWNERSHIP = [
    "albany", "cleveland", "marysville", "riverside", "san-bernardino", "yoakum",
  ];

  // Editorial inclusions (tools/build-city-pages.mjs
  // EDITORIAL_INCLUSIONS): pages admitted below the threshold on
  // purpose, pinned here so a regen can neither silently drop one
  // nor quietly admit another. McAlester is the named test case
  // completing Oklahoma's city tier — one catalogue camera
  // ("US-69 & C Tree NE"), admitted at a count of 1.
  const EDITORIAL_INCLUSIONS = ["mcalester"];

  it("every city clears the stated threshold, bar the pinned ownership cases", () => {
    for (const c of cities) {
      if (EDITORIAL_INCLUSIONS.includes(c.slug)) {
        expect(c.count, c.slug).toBeLessThan(cityPages.threshold);
      } else if (BELOW_50_AFTER_OWNERSHIP.includes(c.slug)) {
        expect(c.count, c.slug).toBeLessThan(50);
        expect(c.count, c.slug).toBeGreaterThanOrEqual(cityPages.threshold);
      } else {
        expect(c.count, c.slug).toBeGreaterThanOrEqual(cityPages.threshold);
      }
      expect(c.countryTotal, c.slug).toBeGreaterThanOrEqual(c.count);
    }
  });

  it("slugs are unique, URL-safe and never shadow an editorial page", () => {
    const slugs = cities.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const s of slugs) {
      expect(s).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(CURATED_SLUGS).not.toContain(s);
    }
  });

  it("still/stream split adds up to the count", () => {
    for (const c of cities) {
      expect(c.stills + c.streams, c.slug).toBe(c.count);
    }
  });

  it("sources are real, ordered and within the count", () => {
    for (const c of cities) {
      expect(c.sources.length, c.slug).toBeGreaterThanOrEqual(1);
      expect(c.sourceCount, c.slug).toBeGreaterThanOrEqual(c.sources.length);
      const counts = c.sources.map((s) => s.count);
      expect(counts).toEqual([...counts].sort((a, b) => b - a));
      for (const s of c.sources) expect(s.count, c.slug).toBeLessThanOrEqual(c.count);
    }
  });

  it("samples carry deep-linkable catalogue ids", () => {
    for (const c of cities) {
      // An editorial inclusion's sample list is its whole owned set
      // (McAlester: the one camera) — the >= 6 rule is the threshold
      // tier's promise, not an inclusion's.
      expect(c.samples.length, c.slug).toBeGreaterThanOrEqual(
        EDITORIAL_INCLUSIONS.includes(c.slug) ? 1 : 6,
      );
      const ids = c.samples.map((s) => s.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const s of c.samples) {
        expect(s.id.length, c.slug).toBeGreaterThan(0);
        expect(s.name.length, c.slug).toBeGreaterThanOrEqual(8);
      }
    }
  });

  it("cities are sorted by count descending", () => {
    const counts = cities.map((c) => c.count);
    expect(counts).toEqual([...counts].sort((a, b) => b - a));
  });
});
