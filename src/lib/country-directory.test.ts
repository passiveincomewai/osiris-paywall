import { describe, it, expect } from "vitest";
import data from "@/data/camera-countries.json";
import {
  COUNTRY_REGIONS,
  DIRECTORY_REGION_BY_SLUG,
  applyCountryDirectoryQuery,
  countryMatchesSearch,
  countryRegionCounts,
  filterCountries,
  regionForCountry,
  sortCountries,
  type CountryDirectoryEntry,
} from "@/lib/country-directory";

/* The real generated catalogue — the coverage test below is the
   guard that keeps the derived region lookup (COUNTRY_REGION, the
   site's canonical country→region map) honest every time the
   catalogue is regenerated. */
const ENTRIES = (data as { countries: CountryDirectoryEntry[] }).countries;

describe("DIRECTORY_REGION_BY_SLUG coverage", () => {
  it("maps exactly the slugs present in camera-countries.json — no missing, no extras", () => {
    const dataSlugs = ENTRIES.map((c) => c.slug).sort();
    const mapSlugs = Object.keys(DIRECTORY_REGION_BY_SLUG).sort();
    expect(mapSlugs).toEqual(dataSlugs);
    expect(mapSlugs.length).toBe(ENTRIES.length);
  });

  it("uses only the six directory regions, each at least once", () => {
    const valid = new Set(COUNTRY_REGIONS.map((r) => r.key));
    const used = new Set(Object.values(DIRECTORY_REGION_BY_SLUG));
    for (const key of used) expect(valid.has(key)).toBe(true);
    expect(used.size).toBe(COUNTRY_REGIONS.length);
  });

  it("pins the site's canonical transcontinental assignments (COUNTRY_REGION)", () => {
    expect(regionForCountry("russia")).toBe("europe");
    expect(regionForCountry("turkey")).toBe("europe");
    expect(regionForCountry("cyprus")).toBe("europe");
    expect(regionForCountry("georgia")).toBe("europe");
    expect(regionForCountry("azerbaijan")).toBe("europe");
    expect(regionForCountry("armenia")).toBe("europe");
    expect(regionForCountry("egypt")).toBe("africa");
    expect(regionForCountry("kazakhstan")).toBe("asia");
    expect(regionForCountry("christmas-island")).toBe("oceania");
  });

  it("region counts follow the canonical map", () => {
    const byKey = Object.fromEntries(
      countryRegionCounts(ENTRIES).map(({ region, count }) => [
        region.key,
        count,
      ]),
    );
    expect(byKey).toEqual({
      africa: 8,
      asia: 25,
      europe: 46,
      "north-america": 19,
      "south-america": 8,
      oceania: 3,
    });
  });
});

describe("countryMatchesSearch", () => {
  const japan = ENTRIES.find((c) => c.slug === "japan")!;

  it("matches the country name, case-insensitively", () => {
    expect(countryMatchesSearch(japan, "japan")).toBe(true);
    expect(countryMatchesSearch(japan, "JAPAN")).toBe(true);
    expect(countryMatchesSearch(japan, "JaPaN")).toBe(true);
  });

  it("matches top city names, case-insensitively — Tokyo finds Japan", () => {
    // The fixture fact the feature promises: Tokyo is a listed top city.
    expect(japan.topCities.some((c) => c.name === "Tokyo")).toBe(true);
    expect(countryMatchesSearch(japan, "tokyo")).toBe(true);
    expect(countryMatchesSearch(japan, "TOKYO")).toBe(true);
    expect(countryMatchesSearch(japan, "osaka")).toBe(true);
  });

  it("folds diacritics — curacao finds Curaçao", () => {
    const curacao = ENTRIES.find((c) => c.slug === "curacao")!;
    expect(countryMatchesSearch(curacao, "curacao")).toBe(true);
    expect(countryMatchesSearch(curacao, "CURACAO")).toBe(true);
  });

  it("empty search matches everything; unknown text matches nothing", () => {
    expect(countryMatchesSearch(japan, "")).toBe(true);
    expect(countryMatchesSearch(japan, "   ")).toBe(true);
    expect(countryMatchesSearch(japan, "zzzz-not-a-place")).toBe(false);
  });
});

describe("filterCountries by region", () => {
  it("returns exactly the Oceania set for the Oceania chip", () => {
    const out = filterCountries(ENTRIES, { search: "", region: "oceania" });
    expect(out.map((c) => c.slug).sort()).toEqual([
      "australia",
      "christmas-island",
      "new-zealand",
    ]);
  });

  it("returns only countries of the requested region, for every region", () => {
    for (const { key } of COUNTRY_REGIONS) {
      const out = filterCountries(ENTRIES, { search: "", region: key });
      expect(out.length, key).toBeGreaterThan(0);
      for (const c of out) expect(regionForCountry(c.slug)).toBe(key);
    }
  });

  it("chip counts sum to the catalogue size and keep chip order", () => {
    const counts = countryRegionCounts(ENTRIES);
    expect(counts.reduce((n, r) => n + r.count, 0)).toBe(ENTRIES.length);
    expect(counts.map((r) => r.region.key)).toEqual(
      COUNTRY_REGIONS.map((r) => r.key),
    );
  });
});

describe("sortCountries", () => {
  it("name-asc reproduces the index page's established localeCompare order", () => {
    const expected = [...ENTRIES]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((c) => c.slug);
    expect(sortCountries(ENTRIES, "name-asc").map((c) => c.slug)).toEqual(expected);
  });

  it("cameras-desc orders by count descending with name as the tiebreak", () => {
    const out = sortCountries(ENTRIES, "cameras-desc");
    expect(out[0].count).toBe(Math.max(...ENTRIES.map((c) => c.count)));
    for (let i = 1; i < out.length; i++) {
      expect(out[i - 1].count).toBeGreaterThanOrEqual(out[i].count);
      if (out[i - 1].count === out[i].count) {
        expect(out[i - 1].name.localeCompare(out[i].name)).toBeLessThan(0);
      }
    }
  });

  it("cameras-asc orders by count ascending with name as the tiebreak", () => {
    const out = sortCountries(ENTRIES, "cameras-asc");
    expect(out[0].count).toBe(Math.min(...ENTRIES.map((c) => c.count)));
    for (let i = 1; i < out.length; i++) {
      expect(out[i - 1].count).toBeLessThanOrEqual(out[i].count);
      if (out[i - 1].count === out[i].count) {
        expect(out[i - 1].name.localeCompare(out[i].name)).toBeLessThan(0);
      }
    }
  });

  it("does not mutate its input", () => {
    const input = [...ENTRIES];
    const before = input.map((c) => c.slug);
    sortCountries(input, "cameras-desc");
    filterCountries(input, { search: "tokyo", region: "asia" });
    expect(input.map((c) => c.slug)).toEqual(before);
  });
});

describe("applyCountryDirectoryQuery — search + filter + sort combined", () => {
  it("Tokyo in Asia finds Japan; Tokyo in Europe finds nothing", () => {
    expect(
      applyCountryDirectoryQuery(ENTRIES, {
        search: "tokyo",
        region: "asia",
        sort: "name-asc",
      }).map((c) => c.slug),
    ).toEqual(["japan"]);
    expect(
      applyCountryDirectoryQuery(ENTRIES, {
        search: "tokyo",
        region: "europe",
        sort: "name-asc",
      }),
    ).toEqual([]);
  });

  it("South America by most cameras: only that region, counts descending", () => {
    const out = applyCountryDirectoryQuery(ENTRIES, {
      search: "",
      region: "south-america",
      sort: "cameras-desc",
    });
    expect(out.length).toBeGreaterThan(0);
    expect(out.every((c) => regionForCountry(c.slug) === "south-america")).toBe(
      true,
    );
    const regionMax = Math.max(
      ...ENTRIES.filter(
        (c) => regionForCountry(c.slug) === "south-america",
      ).map((c) => c.count),
    );
    expect(out[0].count).toBe(regionMax);
    for (let i = 1; i < out.length; i++) {
      expect(out[i - 1].count).toBeGreaterThanOrEqual(out[i].count);
    }
  });

  it("the default query returns every country in name order", () => {
    const out = applyCountryDirectoryQuery(ENTRIES, {
      search: "",
      region: null,
      sort: "name-asc",
    });
    expect(out.length).toBe(ENTRIES.length);
    expect(out.map((c) => c.slug)).toEqual(
      sortCountries(ENTRIES, "name-asc").map((c) => c.slug),
    );
  });
});
