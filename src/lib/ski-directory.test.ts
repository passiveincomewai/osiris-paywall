import { describe, it, expect } from "vitest";
import type { SkiResort } from "./ski-resorts";
import {
  applySkiDirectoryQuery,
  filterSkiResorts,
  groupSkiResortsByCountry,
  isSkiDirectoryFiltering,
  resortFamilyInfo,
  resortInitials,
  resortMatchesSearch,
  skiCountryCounts,
  skiFamilyCounts,
  sortSkiResorts,
  totalCameras,
  BEGINNER_TERRAIN_MIN_EASIEST_PCT,
  DEFAULT_SKI_DIRECTORY_QUERY,
  SKI_FAMILY_FILTER_LABELS,
  type SkiFamilyFilter,
} from "./ski-directory";
import { getSkiResortFacts } from "./ski-resort-facts";

function resort(partial: Partial<SkiResort> & { slug: string; name: string }): SkiResort {
  return {
    town: partial.name,
    region: "Somewhere",
    country: "United States",
    countrySlug: "united-states",
    lat: 40,
    lng: -111,
    resortCameraCount: 1,
    nearbyCameraCount: 1,
    ...partial,
  };
}

const SNOWBIRD = resort({
  slug: "snowbird",
  name: "Snowbird",
  town: "Snowbird",
  region: "Utah",
  resortCameraCount: 5,
  nearbyCameraCount: 20,
});
const BRIGHTON = resort({
  slug: "brighton",
  name: "Brighton",
  town: "Brighton",
  region: "Utah",
  resortCameraCount: 3,
  nearbyCameraCount: 10,
});
const ALTA = resort({
  slug: "alta",
  name: "Alta",
  town: "Alta",
  region: "Utah",
  resortCameraCount: 4,
  nearbyCameraCount: 6,
});
const ARE = resort({
  slug: "are",
  name: "Åre",
  town: "Åre",
  region: "Jämtland",
  country: "Sweden",
  countrySlug: "sweden",
  resortCameraCount: 2,
  nearbyCameraCount: 8,
});
const HLIDARFJALL = resort({
  slug: "hlidarfjall",
  name: "Hlíðarfjall",
  town: "Akureyri",
  region: "Norðurland",
  country: "Iceland",
  countrySlug: "iceland",
  resortCameraCount: 1,
  nearbyCameraCount: 4,
});
const ZERMATT = resort({
  slug: "zermatt",
  name: "Zermatt",
  town: "Zermatt",
  region: "Valais",
  country: "Switzerland",
  countrySlug: "switzerland",
  resortCameraCount: 4,
  nearbyCameraCount: 30,
});
const WHISTLER = resort({
  slug: "whistler-blackcomb",
  name: "Whistler Blackcomb",
  town: "Whistler",
  region: "British Columbia",
  country: "Canada",
  countrySlug: "canada",
  resortCameraCount: 6,
  nearbyCameraCount: 40,
});
const DEER_VALLEY = resort({
  slug: "deer-valley",
  name: "Deer Valley",
  town: "Park City",
  region: "Utah",
  resortCameraCount: 4,
  nearbyCameraCount: 12,
});

const ALL = [SNOWBIRD, BRIGHTON, ALTA, ARE, HLIDARFJALL, ZERMATT, WHISTLER];
const names = (rs: SkiResort[]) => rs.map((r) => r.name);

describe("totalCameras", () => {
  it("sums resort and nearby counts", () => {
    expect(totalCameras(SNOWBIRD)).toBe(25);
    expect(totalCameras(HLIDARFJALL)).toBe(5);
  });
});

describe("resortMatchesSearch", () => {
  it("matches the name, case-insensitively, ignoring surrounding space", () => {
    expect(resortMatchesSearch(SNOWBIRD, "  SNOW ")).toBe(true);
    expect(resortMatchesSearch(SNOWBIRD, "snowbird")).toBe(true);
  });

  it("matches town, region and country, not just the name", () => {
    expect(resortMatchesSearch(HLIDARFJALL, "akureyri")).toBe(true);
    expect(resortMatchesSearch(BRIGHTON, "utah")).toBe(true);
    expect(resortMatchesSearch(ARE, "sweden")).toBe(true);
    expect(resortMatchesSearch(WHISTLER, "british columbia")).toBe(true);
  });

  it("folds diacritics on both sides", () => {
    expect(resortMatchesSearch(HLIDARFJALL, "hlidarfjall")).toBe(true);
    expect(resortMatchesSearch(ARE, "are")).toBe(true);
    expect(resortMatchesSearch(ARE, "åre")).toBe(true);
    expect(resortMatchesSearch(HLIDARFJALL, "nordurland")).toBe(true);
  });

  it("treats an empty search as a match and rejects misses", () => {
    expect(resortMatchesSearch(SNOWBIRD, "")).toBe(true);
    expect(resortMatchesSearch(SNOWBIRD, "   ")).toBe(true);
    expect(resortMatchesSearch(SNOWBIRD, "zermatt")).toBe(false);
  });
});

describe("filterSkiResorts", () => {
  it("filters by country exactly", () => {
    expect(names(filterSkiResorts(ALL, { search: "", country: "United States" }))).toEqual([
      "Snowbird",
      "Brighton",
      "Alta",
    ]);
    expect(filterSkiResorts(ALL, { search: "", country: "France" })).toEqual([]);
  });

  it("combines search and country", () => {
    expect(names(filterSkiResorts(ALL, { search: "utah", country: "United States" }))).toEqual([
      "Snowbird",
      "Brighton",
      "Alta",
    ]);
    expect(filterSkiResorts(ALL, { search: "utah", country: "Canada" })).toEqual([]);
  });

  it("returns an empty list when nothing matches", () => {
    expect(filterSkiResorts(ALL, { search: "zzzz-not-a-place", country: null })).toEqual([]);
  });
});

describe("sortSkiResorts", () => {
  it("sorts by name A–Z with diacritics folded", () => {
    expect(names(sortSkiResorts(ALL, "name-asc"))).toEqual([
      "Alta",
      "Åre",
      "Brighton",
      "Hlíðarfjall",
      "Snowbird",
      "Whistler Blackcomb",
      "Zermatt",
    ]);
  });

  it("sorts by name Z–A as the exact reverse", () => {
    expect(names(sortSkiResorts(ALL, "name-desc"))).toEqual(
      names(sortSkiResorts(ALL, "name-asc")).reverse(),
    );
  });

  it("sorts by most cameras, breaking ties by name A–Z", () => {
    /* Åre (2+8) and Alta (4+6) both total 10 — Alta wins the tie. */
    expect(names(sortSkiResorts(ALL, "cameras"))).toEqual([
      "Whistler Blackcomb",
      "Zermatt",
      "Snowbird",
      "Brighton",
      "Alta",
      "Åre",
      "Hlíðarfjall",
    ]);
  });

  it("does not mutate its input", () => {
    const input = [ZERMATT, ALTA];
    sortSkiResorts(input, "name-asc");
    expect(names(input)).toEqual(["Zermatt", "Alta"]);
  });
});

describe("groupSkiResortsByCountry / skiCountryCounts", () => {
  it("groups in first-appearance country order", () => {
    const groups = groupSkiResortsByCountry([SNOWBIRD, ARE, BRIGHTON, ZERMATT]);
    expect(groups.map((g) => g.country)).toEqual(["United States", "Sweden", "Switzerland"]);
    expect(names(groups[0].resorts)).toEqual(["Snowbird", "Brighton"]);
  });

  it("counts resorts per country", () => {
    expect(skiCountryCounts(ALL)).toEqual([
      { country: "United States", count: 3 },
      { country: "Sweden", count: 1 },
      { country: "Iceland", count: 1 },
      { country: "Switzerland", count: 1 },
      { country: "Canada", count: 1 },
    ]);
  });
});

describe("applySkiDirectoryQuery", () => {
  it("default view: grouped by country, resorts A–Z within group", () => {
    const result = applySkiDirectoryQuery(
      [SNOWBIRD, ARE, BRIGHTON, ZERMATT, ALTA],
      DEFAULT_SKI_DIRECTORY_QUERY,
    );
    expect(result.filtering).toBe(false);
    expect(result.total).toBe(5);
    expect(result.flat).toEqual([]);
    expect(result.groups.map((g) => g.label)).toEqual([
      "United States",
      "Sweden",
      "Switzerland",
    ]);
    expect(names(result.groups[0].resorts)).toEqual(["Alta", "Brighton", "Snowbird"]);
  });

  it("a search switches to a flat, sorted list", () => {
    const result = applySkiDirectoryQuery(ALL, {
      ...DEFAULT_SKI_DIRECTORY_QUERY,
      search: "utah",
    });
    expect(result.filtering).toBe(true);
    expect(result.groups).toEqual([]);
    expect(names(result.flat)).toEqual(["Alta", "Brighton", "Snowbird"]);
    expect(result.total).toBe(3);
  });

  it("a country filter switches to flat and honours the sort", () => {
    const result = applySkiDirectoryQuery(ALL, {
      ...DEFAULT_SKI_DIRECTORY_QUERY,
      country: "United States",
      sort: "cameras",
    });
    expect(result.filtering).toBe(true);
    expect(names(result.flat)).toEqual(["Snowbird", "Brighton", "Alta"]);
  });

  it("an unmatched search yields an empty flat result", () => {
    const result = applySkiDirectoryQuery(ALL, {
      ...DEFAULT_SKI_DIRECTORY_QUERY,
      search: "zzzz",
    });
    expect(result.filtering).toBe(true);
    expect(result.total).toBe(0);
    expect(result.flat).toEqual([]);
  });

  it("sort alone does not switch to flat mode", () => {
    expect(
      isSkiDirectoryFiltering({ ...DEFAULT_SKI_DIRECTORY_QUERY, sort: "cameras" }),
    ).toBe(false);
    const result = applySkiDirectoryQuery(ALL, {
      ...DEFAULT_SKI_DIRECTORY_QUERY,
      sort: "cameras",
    });
    expect(result.filtering).toBe(false);
    expect(names(result.groups[0].resorts)).toEqual(["Snowbird", "Brighton", "Alta"]);
  });
});

describe("pass filter and grouping", () => {
  const FIVE = [SNOWBIRD, BRIGHTON, ALTA, ARE, ZERMATT];

  it("a pass filter switches to flat and keeps only documented affiliates", () => {
    const result = applySkiDirectoryQuery(FIVE, {
      ...DEFAULT_SKI_DIRECTORY_QUERY,
      pass: "Ikon Pass",
    });
    expect(result.filtering).toBe(true);
    expect(names(result.flat)).toEqual(["Alta", "Brighton", "Snowbird", "Zermatt"]);
  });

  it('the "none" pass filter keeps only resorts with no documented pass', () => {
    const result = applySkiDirectoryQuery(FIVE, {
      ...DEFAULT_SKI_DIRECTORY_QUERY,
      pass: "none",
    });
    expect(result.filtering).toBe(true);
    expect(names(result.flat)).toEqual(["Åre"]);
  });

  it("groupBy pass lists each programme, duplicates shared resorts, and closes with the independent group", () => {
    const result = applySkiDirectoryQuery(FIVE, {
      ...DEFAULT_SKI_DIRECTORY_QUERY,
      groupBy: "pass",
    });
    expect(result.filtering).toBe(false);
    expect(result.groups.map((g) => g.label)).toEqual([
      "Ikon Pass",
      "Mountain Collective",
      "Independent — no listed pass",
    ]);
    expect(names(result.groups[0].resorts)).toEqual([
      "Alta",
      "Brighton",
      "Snowbird",
      "Zermatt",
    ]);
    expect(names(result.groups[1].resorts)).toEqual(["Snowbird"]);
    expect(names(result.groups[2].resorts)).toEqual(["Åre"]);
  });

  it("groupBy region groups by state/province in country order", () => {
    const result = applySkiDirectoryQuery(FIVE, {
      ...DEFAULT_SKI_DIRECTORY_QUERY,
      groupBy: "region",
    });
    expect(result.filtering).toBe(false);
    expect(result.groups.map((g) => g.label)).toEqual(["Utah", "Jämtland", "Valais"]);
    expect(names(result.groups[0].resorts)).toEqual(["Alta", "Brighton", "Snowbird"]);
  });
});

describe("family planner filters", () => {
  /* Fixtures use real slugs, so these pin the real datasets: links
     (verified official pages) and the sourced terrain splits. */
  const WITH_DV = [...ALL, DEER_VALLEY];
  const fam = (rs: SkiResort[], family: SkiFamilyFilter[]) =>
    names(filterSkiResorts(rs, { search: "", country: null, family }));

  it("terrain splits are sourced, exact, and sum to 100", () => {
    expect(getSkiResortFacts("alta")?.terrainMix).toEqual({
      easiestPct: 15,
      moreDifficultPct: 30,
      mostDifficultPct: 55,
    });
    expect(getSkiResortFacts("deer-valley")?.terrainMix).toEqual({
      easiestPct: 35,
      moreDifficultPct: 44,
      mostDifficultPct: 21,
    });
    expect(getSkiResortFacts("brighton")?.terrainMix).toEqual({
      easiestPct: 21,
      moreDifficultPct: 40,
      mostDifficultPct: 39,
    });
    for (const slug of ["alta", "deer-valley", "brighton"]) {
      const mix = getSkiResortFacts(slug)?.terrainMix;
      expect(mix && mix.easiestPct + mix.moreDifficultPct + mix.mostDifficultPct).toBe(100);
    }
    /* No other resort carries a terrain split yet. */
    expect(getSkiResortFacts("snowbird")?.terrainMix).toBeUndefined();
  });

  it("resortFamilyInfo traces every flag to a data row", () => {
    expect(resortFamilyInfo("brighton")).toEqual({
      lessons: true,
      rentals: false,
      parking: true,
      beginnerTerrainPct: 21,
    });
    expect(resortFamilyInfo("snowbird")).toEqual({
      lessons: true,
      rentals: false,
      parking: true,
      beginnerTerrainPct: null,
    });
    expect(resortFamilyInfo("whistler-blackcomb")).toEqual({
      lessons: false,
      rentals: true,
      parking: false,
      beginnerTerrainPct: null,
    });
    expect(resortFamilyInfo("alta")).toEqual({
      lessons: false,
      rentals: false,
      parking: false,
      beginnerTerrainPct: 15,
    });
    expect(resortFamilyInfo("zermatt")).toEqual({
      lessons: false,
      rentals: false,
      parking: false,
      beginnerTerrainPct: null,
    });
  });

  it("lessons / rentals / parking filters keep only resorts with the verified page", () => {
    expect(fam(ALL, ["lessons"])).toEqual(["Snowbird", "Brighton"]);
    expect(fam(ALL, ["rentals"])).toEqual(["Whistler Blackcomb"]);
    expect(fam(ALL, ["parking"])).toEqual(["Snowbird", "Brighton"]);
  });

  it("family filters AND-combine", () => {
    expect(fam(ALL, ["lessons", "parking"])).toEqual(["Snowbird", "Brighton"]);
    expect(fam(ALL, ["lessons", "rentals"])).toEqual([]);
    expect(fam(ALL, ["rentals", "parking"])).toEqual([]);
  });

  it("beginner terrain ≥ 25% passes Deer Valley only — Alta (15%) and Brighton (21%) do not pass", () => {
    expect(BEGINNER_TERRAIN_MIN_EASIEST_PCT).toBe(25);
    expect(SKI_FAMILY_FILTER_LABELS.beginnerTerrain).toBe("Beginner terrain ≥ 25%");
    expect(fam(WITH_DV, ["beginnerTerrain"])).toEqual(["Deer Valley"]);
    /* Display is not a filter pass: Brighton still reports its true 21%. */
    expect(resortFamilyInfo("brighton").beginnerTerrainPct).toBe(21);
  });

  it("counts match the synced datasets (directory-wide: lessons 7, rentals 6, parking 3, beginner 1)", () => {
    expect(skiFamilyCounts(WITH_DV)).toEqual([
      { filter: "lessons", count: 2 },
      { filter: "rentals", count: 1 },
      { filter: "parking", count: 2 },
      { filter: "beginnerTerrain", count: 1 },
    ]);
  });

  it("a family filter alone switches to flat mode and composes with country", () => {
    const flat = applySkiDirectoryQuery(WITH_DV, {
      ...DEFAULT_SKI_DIRECTORY_QUERY,
      family: ["beginnerTerrain"],
    });
    expect(flat.filtering).toBe(true);
    expect(names(flat.flat)).toEqual(["Deer Valley"]);
    const us = applySkiDirectoryQuery(WITH_DV, {
      ...DEFAULT_SKI_DIRECTORY_QUERY,
      country: "Canada",
      family: ["rentals"],
    });
    expect(names(us.flat)).toEqual(["Whistler Blackcomb"]);
    expect(
      isSkiDirectoryFiltering({ ...DEFAULT_SKI_DIRECTORY_QUERY, family: ["lessons"] }),
    ).toBe(true);
    expect(isSkiDirectoryFiltering(DEFAULT_SKI_DIRECTORY_QUERY)).toBe(false);
  });
});

describe("resortInitials", () => {
  it("takes the first letters of the first two words", () => {
    expect(resortInitials("Whistler Blackcomb")).toBe("WB");
    expect(resortInitials("St. Anton am Arlberg")).toBe("SA");
  });

  it("takes two letters from a single-word name", () => {
    expect(resortInitials("Obertauern")).toBe("OB");
    expect(resortInitials("Åre")).toBe("ÅR");
  });

  it("splits hyphenated names into words", () => {
    expect(resortInitials("Andermatt-Sedrun")).toBe("AS");
    expect(resortInitials("Saalbach-Hinterglemm")).toBe("SH");
  });
});
