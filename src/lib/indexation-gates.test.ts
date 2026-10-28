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

  it("folds exactly the five remaining gate failures into the hub", () => {
    expect([...FOLDED_RESORT_SLUGS].sort()).toEqual([
      "blue-mountain-ontario",
      "hoodoo",
      "june-mountain",
      "oppdal",
      "pyha",
    ]);
    expect(RESORT_PAGE_COUNT).toBe(107);
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
