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

  it("every city clears the stated threshold", () => {
    for (const c of cities) {
      expect(c.count, c.slug).toBeGreaterThanOrEqual(cityPages.threshold);
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
      expect(c.samples.length, c.slug).toBeGreaterThanOrEqual(6);
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
