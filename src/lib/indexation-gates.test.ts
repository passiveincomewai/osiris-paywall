/**
 * C10 indexation gates (§4.5) — pins for src/lib/indexation-gates.ts:
 * the derived enforcement sets, the traffic-gate exclusion, the
 * scoped city count gate, the state block rule, the ski fold set,
 * and the literal redirect table next.config.ts must carry.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  CITY_COUNT_GATE_ENFORCED_SLUGS,
  CONSOLIDATED_COUNTRIES,
  CONSOLIDATED_COUNTRY_SLUGS,
  COUNTRY_CONSOLIDATION_REDIRECTS,
  COUNTRY_PAGE_COUNT,
  COUNTRY_TRAFFIC_GATE_EXCLUSIONS,
  FOLDED_RESORT_SLUGS,
  RESORT_PAGE_COUNT,
  SKI_FOLD_REDIRECTS,
  cityFailsCountGate,
  cityInElementBand,
  countCityElements,
  isConsolidatedCountry,
  isFoldedResort,
  stateBelowLine,
  stateBlocksBuildable,
} from "@/lib/indexation-gates";
import { DIRECTORY_COUNTRY_COUNT } from "@/lib/site-stats";
import { getSkiResortFacts } from "@/lib/ski-resort-facts";
import {
  NOINDEX_UNIVERSITY_SLUGS,
  UNIVERSITY_CAMERA_COUNTS,
  WALL_MIN_CAMERAS,
  beachSpokeNoindex,
  interstateCorridorNoindex,
  isNoindexUniversity,
  parkSpokeNoindex,
  surfSpokeNoindex,
  trainSpokeNoindex,
  volcanoSpokeNoindex,
  wallSpokeBelowLine,
} from "@/lib/indexation-gates";
import { EXPLORE_SCOPES, countForDef, loadCountryChunk } from "@/lib/explore-data";
import { BEACH_SPOTS, SURF_SPOTS } from "@/lib/surf-spots";
import { RAIL_PLACES } from "@/lib/railfan-places";
import { VOLCANOES } from "@/lib/volcanoes";
import { NATIONAL_PARKS } from "@/lib/national-parks";
import { UNIVERSITIES } from "@/lib/universities";
import { CORRIDORS, buildCorridor } from "@/lib/corridors";

const nextConfig = readFileSync(join(process.cwd(), "next.config.ts"), "utf8");

describe("C10 countries — hub consolidation set", () => {
  it("derives exactly the re-measured below-line set (35)", () => {
    expect([...CONSOLIDATED_COUNTRY_SLUGS].sort()).toEqual([
      "albania",
      "armenia",
      "azerbaijan",
      "barbados",
      "bermuda",
      "bolivia",
      "bonaire",
      "christmas-island",
      "curacao",
      "czechia",
      "denmark",
      "egypt",
      "faroe-islands",
      "grenada",
      "guadeloupe",
      "honduras",
      "jordan",
      "lebanon",
      "madagascar",
      "martinique",
      "morocco",
      "north-macedonia",
      "oman",
      "san-marino",
      "saudi-arabia",
      "senegal",
      "serbia",
      "singapore",
      "sint-maarten",
      "slovakia",
      "sri-lanka",
      "uruguay",
      "vatican-city",
      "venezuela",
      "yemen",
    ]);
    for (const c of CONSOLIDATED_COUNTRIES) {
      expect(c.count, c.slug).toBeLessThan(25);
      expect(c.areas, c.slug).toBeLessThan(3);
      expect(c.samples.length, c.slug).toBeGreaterThan(0);
    }
  });

  it("keeps Iran's page under the traffic gate, and only Iran", () => {
    expect(Object.keys(COUNTRY_TRAFFIC_GATE_EXCLUSIONS)).toEqual(["iran"]);
    expect(isConsolidatedCountry("iran")).toBe(false);
    const iran = CONSOLIDATED_COUNTRIES.find((c) => c.slug === "iran");
    expect(iran).toBeUndefined();
  });

  it("points every consolidated country at an anchored row", () => {
    for (const c of CONSOLIDATED_COUNTRIES) {
      if (c.hubHref) {
        expect(c.redirectTarget, c.slug).toBe(`${c.hubHref}#${c.slug}`);
      } else {
        // Africa has no regional hub yet — the directory row anchors.
        expect(c.region, c.slug).toBe("africa");
        expect(c.redirectTarget, c.slug).toBe(`/cameras/countries#${c.slug}`);
      }
    }
    expect(isConsolidatedCountry("singapore")).toBe(true);
    expect(isConsolidatedCountry("japan")).toBe(false);
  });

  it("site-stats' directory country count matches the derived page count", () => {
    expect(COUNTRY_PAGE_COUNT).toBe(74);
    expect(DIRECTORY_COUNTRY_COUNT).toBe(COUNTRY_PAGE_COUNT);
  });

  it("next.config.ts carries the derived country redirects verbatim", () => {
    for (const r of COUNTRY_CONSOLIDATION_REDIRECTS) {
      expect(nextConfig).toContain(
        `{ source: '${r.source}', destination: '${r.destination}', permanent: true }`,
      );
    }
    // …and no country-page redirect exists outside the derived set.
    const inConfig = [
      ...nextConfig.matchAll(
        /\{ source: '(\/cameras\/countries\/[a-z0-9-]+)', destination: '([^']+)', permanent: true \}/g,
      ),
    ].map((m) => ({ source: m[1], destination: m[2] }));
    expect(inConfig.sort((a, b) => (a.source < b.source ? -1 : 1))).toEqual(
      [...COUNTRY_CONSOLIDATION_REDIRECTS].sort((a, b) =>
        a.source < b.source ? -1 : 1,
      ),
    );
  });
});

describe("C10 cities — noindex gates", () => {
  it("the scoped count gate fails exactly the approved measured six", () => {
    expect([...CITY_COUNT_GATE_ENFORCED_SLUGS].sort()).toEqual([
      "albany",
      "cleveland",
      "marysville",
      "riverside",
      "san-bernardino",
      "yoakum",
    ]);
    for (const slug of CITY_COUNT_GATE_ENFORCED_SLUGS) {
      expect(cityFailsCountGate(slug), slug).toBe(true);
    }
    // City-scale wave cities under 50 cameras are deliberately NOT
    // failed by the count gate (owner's newer ≥25 admission rule —
    // see the gates module's scoping note).
    for (const slug of ["tacoma", "chicago", "paris", "barcelona", "everett"]) {
      expect(cityFailsCountGate(slug), slug).toBe(false);
    }
    expect(cityFailsCountGate("seattle")).toBe(false);
    expect(cityFailsCountGate("not-a-city")).toBe(false);
  });

  it("the element band covers 50–70 and nothing outside it", () => {
    expect(cityInElementBand("birmingham")).toBe(true); // 69
    expect(cityInElementBand("tatsuno-city")).toBe(true); // 50
    expect(cityInElementBand("seattle")).toBe(false);
    expect(cityInElementBand("san-bernardino")).toBe(false); // 49
  });

  it("counts elements exactly as the measurement did", () => {
    expect(countCityElements({ sources: 1, corridors: 0, mixKinds: 1 })).toBe(0);
    expect(countCityElements({ sources: 3, corridors: 1, mixKinds: 1 })).toBe(1);
    expect(countCityElements({ sources: 1, corridors: 6, mixKinds: 1 })).toBe(1);
    expect(countCityElements({ sources: 1, corridors: 0, mixKinds: 5 })).toBe(1);
    expect(countCityElements({ sources: 2, corridors: 0, mixKinds: 4 })).toBe(2);
    expect(countCityElements({ sources: 2, corridors: 6, mixKinds: 3 })).toBe(3);
    // Null breakdown: corridors/mix marked unavailable with -1.
    expect(countCityElements({ sources: 3, corridors: -1, mixKinds: -1 })).toBe(1);
    expect(countCityElements({ sources: 1, corridors: -1, mixKinds: -1 })).toBe(0);
  });
});

describe("C10 states — below-line block rule", () => {
  it("flags exactly DC, Mississippi and Rhode Island as below the line", () => {
    expect(stateBelowLine("district-of-columbia")).toBe(true);
    expect(stateBelowLine("mississippi")).toBe(true);
    expect(stateBelowLine("rhode-island")).toBe(true);
    expect(stateBelowLine("texas")).toBe(false);
    expect(stateBelowLine("vermont")).toBe(false);
  });

  it("keeps a below-line state indexable when either §4.2 block builds", () => {
    // DC's measured inputs: both blocks build → stays.
    expect(
      stateBlocksBuildable({ breakdownTotal: 33, corridors: 3, operatorRows: 2 })
        .any,
    ).toBe(true);
    // Mississippi / Rhode Island measured inputs: neither builds.
    expect(
      stateBlocksBuildable({ breakdownTotal: 11, corridors: 0, operatorRows: 1 })
        .any,
    ).toBe(false);
    expect(
      stateBlocksBuildable({ breakdownTotal: 1, corridors: 0, operatorRows: 1 })
        .any,
    ).toBe(false);
    // The corridor gate needs the ≥25 total as well as ≥2 corridors.
    expect(
      stateBlocksBuildable({ breakdownTotal: 24, corridors: 5, operatorRows: 0 })
        .corridor,
    ).toBe(false);
    expect(
      stateBlocksBuildable({ breakdownTotal: null, corridors: 0, operatorRows: 0 })
        .any,
    ).toBe(false);
  });
});

describe("C10 ski — facts sourcing and the fold set", () => {
  it("the five camera-rich resorts now carry sourced facts rows", () => {
    for (const slug of [
      "grouse-mountain",
      "myoko-kogen",
      "diamond-peak",
      "tomamu",
      "voss",
    ]) {
      expect(getSkiResortFacts(slug), slug).not.toBeNull();
      expect(isFoldedResort(slug), slug).toBe(false);
    }
    const diamond = getSkiResortFacts("diamond-peak");
    expect(diamond?.summitElevationM).toBe(2603);
    expect(diamond?.verticalM).toBe(561);
    const tomamu = getSkiResortFacts("tomamu");
    expect(tomamu?.baseElevationM).toBe(586);
    expect(tomamu?.summitElevationM).toBe(1171);
  });

  it("folds exactly the two remaining gate failures into the hub", () => {
    expect([...FOLDED_RESORT_SLUGS].sort()).toEqual([
      "gudauri",
      "high1-resort",
    ]);
    expect(RESORT_PAGE_COUNT).toBe(119);
  });

  it("the 2026-10-29 sourcing wave carries facts for the new and unfolded resorts", () => {
    for (const slug of [
      "alta",
      "deer-valley",
      "angel-fire",
      "red-river",
      "blue-mountain-ontario",
      "hoodoo",
      "june-mountain",
      "oppdal",
      "pyha",
    ]) {
      expect(getSkiResortFacts(slug), slug).not.toBeNull();
      expect(isFoldedResort(slug), slug).toBe(false);
    }
    const alta = getSkiResortFacts("alta");
    expect(alta?.summitElevationM).toBe(3374);
    expect(alta?.verticalM).toBe(774);
    const brighton = getSkiResortFacts("brighton");
    expect(brighton?.verticalM).toBe(533);
  });

  it("next.config.ts carries the derived ski fold redirects verbatim", () => {
    for (const r of SKI_FOLD_REDIRECTS) {
      expect(nextConfig).toContain(
        `{ source: '${r.source}', destination: '${r.destination}', permanent: true }`,
      );
    }
    const inConfig = [
      ...nextConfig.matchAll(
        /\{ source: '(\/ski-webcams\/[a-z0-9-]+)', destination: '([^']+)', permanent: true \}/g,
      ),
    ].map((m) => ({ source: m[1], destination: m[2] }));
    expect(inConfig.sort((a, b) => (a.source < b.source ? -1 : 1))).toEqual(
      [...SKI_FOLD_REDIRECTS].sort((a, b) => (a.source < b.source ? -1 : 1)),
    );
  });
});

describe("R38 wall families — noindex tiering", () => {
  it("the line is 5 cameras and every per-family predicate applies it", () => {
    expect(WALL_MIN_CAMERAS).toBe(5);
    expect(wallSpokeBelowLine(4)).toBe(true);
    expect(wallSpokeBelowLine(5)).toBe(false);
    for (const pred of [
      surfSpokeNoindex,
      beachSpokeNoindex,
      trainSpokeNoindex,
      volcanoSpokeNoindex,
      parkSpokeNoindex,
      interstateCorridorNoindex,
    ]) {
      expect(pred(1)).toBe(true);
      expect(pred(4)).toBe(true);
      expect(pred(5)).toBe(false);
      expect(pred(250)).toBe(false);
    }
  });

  it("derives the university set from the registry ids — all 25 spokes", () => {
    expect(UNIVERSITIES).toHaveLength(25);
    expect(NOINDEX_UNIVERSITY_SLUGS.size).toBe(25);
    for (const u of UNIVERSITIES) {
      expect(isNoindexUniversity(u.slug), u.slug).toBe(true);
      expect(UNIVERSITY_CAMERA_COUNTS.get(u.slug), u.slug).toBe(u.ids.length);
    }
    // The richest spokes in the family, pinned.
    expect(UNIVERSITY_CAMERA_COUNTS.get("uc-santa-barbara")).toBe(4);
    expect(UNIVERSITY_CAMERA_COUNTS.get("university-of-twente")).toBe(2);
    expect(UNIVERSITY_CAMERA_COUNTS.get("yonsei-university")).toBe(2);
    expect(UNIVERSITY_CAMERA_COUNTS.get("vanderbilt-university")).toBe(1);
    expect(isNoindexUniversity("not-a-university")).toBe(false);
  });

  it("served counts through the shared predicates give exactly the measured thin sets", async () => {
    const thin = async <T extends { slug: string; scopeKey: string }>(
      rows: readonly T[],
      pred: (n: number) => boolean,
    ): Promise<string[]> => {
      const out: string[] = [];
      for (const r of rows) {
        if (pred(await countForDef(EXPLORE_SCOPES[r.scopeKey]))) out.push(r.slug);
      }
      return out.sort();
    };
    await expect(thin(SURF_SPOTS, surfSpokeNoindex)).resolves.toEqual([]);
    await expect(thin(BEACH_SPOTS, beachSpokeNoindex)).resolves.toEqual([]);
    await expect(thin(RAIL_PLACES, trainSpokeNoindex)).resolves.toEqual([]);
    await expect(thin(VOLCANOES, volcanoSpokeNoindex)).resolves.toEqual([
      "bromo",
      "etna",
      "ruapehu",
    ]);
    await expect(thin(NATIONAL_PARKS, parkSpokeNoindex)).resolves.toEqual([
      "black-canyon-of-the-gunnison",
      "grand-canyon",
      "grand-teton",
      "isle-royale",
      "kenai-fjords",
      "olympic",
    ]);
    const us = await loadCountryChunk("united-states");
    const thinCorridors = CORRIDORS.filter((c) =>
      interstateCorridorNoindex(buildCorridor(c, us).total),
    ).map((c) => c.slug);
    expect(thinCorridors).toEqual([]);
  }, 300_000);
});
