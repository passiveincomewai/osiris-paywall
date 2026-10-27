import { describe, expect, it } from "vitest";
import {
  classificationLabel,
  compassDirection,
  findStormGroup,
  groupStormFeatures,
  ktToMph,
  pastPointTimeIso,
  saffirSimpsonCategory,
  stormChangeSummary,
  stormDisplayCategory,
  STORM_SIZE_MEANING,
} from "./hurricanes";

function currentFeature(overrides: Record<string, any> = {}): any {
  return {
    type: "Feature",
    geometry: { type: "Point", coordinates: [-75.5, 24.2] },
    properties: {
      kind: "current",
      stormId: "al142026",
      name: "Melissa",
      classification: "HU",
      intensityKt: 100,
      pressureMb: 960,
      movementDir: 45,
      movementSpeedKt: 9,
      lastUpdate: "2026-10-22T03:00:00Z",
      ...overrides,
    },
  };
}

function gisFeature(kind: string, overrides: Record<string, any> = {}): any {
  return {
    type: "Feature",
    geometry: { type: "Point", coordinates: [-75.0, 24.5] },
    properties: {
      kind,
      name: "Melissa",
      stormType: "HU",
      basin: "AL",
      advisory: "12",
      fcstHrs: 0,
      maxWindKt: 100,
      gustKt: 120,
      pressureMb: 960,
      category: 3,
      validLabel: "Thu 03Z",
      ...overrides,
    },
  };
}

describe("groupStormFeatures", () => {
  it("groups GIS features onto their storm by name", () => {
    const groups = groupStormFeatures([
      gisFeature("cone"),
      currentFeature(),
      gisFeature("point", { fcstHrs: 24, category: 2 }),
      gisFeature("point", { fcstHrs: 0, category: 3 }),
      gisFeature("track"),
    ]);
    expect(groups).toHaveLength(1);
    const g = groups[0];
    expect(g.current.stormId).toBe("al142026");
    expect(g.current.lat).toBeCloseTo(24.2);
    expect(g.current.lng).toBeCloseTo(-75.5);
    expect(g.hasCone).toBe(true);
    expect(g.hasTrack).toBe(true);
    expect(g.hasPastTrack).toBe(false);
    // Forecast points sorted by forecast hour regardless of feed order.
    expect(g.points.map((p) => p.fcstHrs)).toEqual([0, 24]);
  });

  it("ignores GIS features for storms that are not active", () => {
    const groups = groupStormFeatures([gisFeature("point")]);
    expect(groups).toEqual([]);
  });

  it("finds a storm by id case-insensitively", () => {
    const groups = groupStormFeatures([currentFeature()]);
    expect(findStormGroup(groups, "AL142026")?.current.name).toBe("Melissa");
    expect(findStormGroup(groups, "al992026")).toBeNull();
  });
});

describe("stormDisplayCategory", () => {
  it("prefers NHC's own analysis-point category", () => {
    const groups = groupStormFeatures([
      currentFeature({ intensityKt: 85 }),
      gisFeature("point", { fcstHrs: 0, category: 3 }),
    ]);
    expect(stormDisplayCategory(groups[0])).toBe(3);
  });

  it("derives from sustained winds for a hurricane without GIS points", () => {
    const groups = groupStormFeatures([currentFeature({ intensityKt: 100 })]);
    expect(stormDisplayCategory(groups[0])).toBe(3);
  });

  it("is null for a tropical storm (no Saffir–Simpson category)", () => {
    const groups = groupStormFeatures([
      currentFeature({ classification: "TS", intensityKt: 50 }),
    ]);
    expect(stormDisplayCategory(groups[0])).toBeNull();
  });
});

describe("scales and labels", () => {
  it("maps wind thresholds to Saffir–Simpson categories", () => {
    expect(saffirSimpsonCategory(null)).toBeNull();
    expect(saffirSimpsonCategory(63)).toBe(0);
    expect(saffirSimpsonCategory(64)).toBe(1);
    expect(saffirSimpsonCategory(82)).toBe(1);
    expect(saffirSimpsonCategory(83)).toBe(2);
    expect(saffirSimpsonCategory(95)).toBe(2);
    expect(saffirSimpsonCategory(96)).toBe(3);
    expect(saffirSimpsonCategory(112)).toBe(3);
    expect(saffirSimpsonCategory(113)).toBe(4);
    expect(saffirSimpsonCategory(136)).toBe(4);
    expect(saffirSimpsonCategory(137)).toBe(5);
  });

  it("labels NHC classification codes", () => {
    expect(classificationLabel("HU")).toBe("Hurricane");
    expect(classificationLabel("ts")).toBe("Tropical Storm");
    expect(classificationLabel("")).toBe("Tropical Cyclone");
    expect(classificationLabel("ZZ")).toBe("ZZ");
  });

  it("converts direction and speed", () => {
    expect(compassDirection(0)).toBe("N");
    expect(compassDirection(90)).toBe("E");
    expect(compassDirection(350)).toBe("N");
    expect(compassDirection(null)).toBeNull();
    expect(ktToMph(100)).toBe(115);
    expect(ktToMph(null)).toBeNull();
  });
});

function pastPointFeature(overrides: Record<string, any> = {}): any {
  return {
    type: "Feature",
    geometry: { type: "Point", coordinates: [-61.5, 13.5] },
    properties: {
      kind: "pastpoint",
      name: "Melissa",
      stormType: "TD",
      basin: "AL",
      intensityKt: 30,
      pressureMb: 1006,
      category: null,
      timeIso: "2026-10-22T00:00:00Z",
      ...overrides,
    },
  };
}

function radiiFeature(overrides: Record<string, any> = {}): any {
  return {
    type: "Feature",
    geometry: null,
    properties: {
      kind: "windradii",
      // GIS spells the id uppercase; CurrentStorms uses lowercase.
      stormId: "AL142026",
      radiiKt: 34,
      neNm: 60,
      seNm: 50,
      swNm: 40,
      nwNm: 45,
      advNum: 5,
      synopTime: "202610220000",
      ...overrides,
    },
  };
}

describe("past points + wind radii grouping", () => {
  it("sorts best-track history oldest first regardless of feed order", () => {
    const groups = groupStormFeatures([
      currentFeature(),
      pastPointFeature({ timeIso: "2026-10-23T00:00:00Z", intensityKt: 55 }),
      pastPointFeature({ timeIso: "2026-10-22T00:00:00Z", intensityKt: 30 }),
    ]);
    const g = groups[0];
    expect(g.history.map((h) => h.intensityKt)).toEqual([30, 55]);
    expect(g.history[0].lat).toBeCloseTo(13.5);
  });

  it("picks earliest/latest 34 kt radii by advisory number, ignoring other thresholds", () => {
    const groups = groupStormFeatures([
      currentFeature(),
      radiiFeature({ advNum: 20, synopTime: "202610240000", neNm: 150, seNm: 120, swNm: 100, nwNm: 130 }),
      radiiFeature({ advNum: 5 }),
      radiiFeature({ advNum: 30, radiiKt: 64, neNm: 40, seNm: 40, swNm: 40, nwNm: 40 }),
      radiiFeature({ stormId: "AL992026", advNum: 1, neNm: 999 }),
    ]);
    const g = groups[0];
    expect(g.size34?.first.maxNm).toBe(60);
    expect(g.size34?.latest.maxNm).toBe(150);
    expect(g.size34?.latest.advNum).toBe(20);
  });

  it("orders radii by synoptime — the live feed stamps the CURRENT advNum on every row", () => {
    const groups = groupStormFeatures([
      currentFeature(),
      // Feed order is scrambled and advNum is identical (23) on both,
      // exactly as the live MapServer returns them.
      radiiFeature({ advNum: 23, synopTime: "2026102400", neNm: 180, seNm: 180, swNm: 50, nwNm: 120 }),
      radiiFeature({ advNum: 23, synopTime: "2026102200", neNm: 60, seNm: 0, swNm: 0, nwNm: 60 }),
    ]);
    const g = groups[0];
    expect(g.size34?.first.maxNm).toBe(60);
    expect(g.size34?.latest.maxNm).toBe(180);
  });
});

describe("stormChangeSummary", () => {
  it("computes wind, category and size change since formation from real fields", () => {
    const groups = groupStormFeatures([
      currentFeature({ intensityKt: 100 }),
      gisFeature("point", { fcstHrs: 0, category: 3 }),
      pastPointFeature({ intensityKt: 35, timeIso: "2026-10-22T00:00:00Z" }),
      pastPointFeature({ intensityKt: 70, timeIso: "2026-10-23T00:00:00Z" }),
      radiiFeature({ advNum: 5, neNm: 60, seNm: 50, swNm: 40, nwNm: 45 }),
      radiiFeature({ advNum: 20, synopTime: "202610240000", neNm: 140, seNm: 110, swNm: 90, nwNm: 120 }),
    ]);
    const s = stormChangeSummary(groups[0]);
    expect(s.genesis).toEqual({ lat: 13.5, lng: -61.5, timeIso: "2026-10-22T00:00:00Z" });
    expect(s.historyPoints).toBe(2);
    expect(s.windThenKt).toBe(35);
    expect(s.windNowKt).toBe(100);
    expect(s.windDeltaKt).toBe(65);
    expect(s.catThen).toBe(0); // 35 kt derives to below Category 1
    expect(s.catNow).toBe(3);
    expect(s.sizeThenNm).toBe(60);
    expect(s.sizeNowNm).toBe(140);
    expect(s.sizeDeltaNm).toBe(80);
    expect(STORM_SIZE_MEANING).toContain("wind field");
  });

  it("falls back to the past-track line's first vertex for genesis", () => {
    const pastLine: any = {
      type: "Feature",
      geometry: { type: "LineString", coordinates: [[-60.0, 12.0], [-65.0, 15.0]] },
      properties: { kind: "past", name: "Melissa" },
    };
    const groups = groupStormFeatures([currentFeature(), pastLine]);
    const s = stormChangeSummary(groups[0]);
    expect(s.genesis).toEqual({ lat: 12.0, lng: -60.0, timeIso: null });
    expect(s.historyPoints).toBe(0);
    expect(s.windDeltaKt).toBeNull();
  });

  it("leaves every change field null when the feed carries no history or radii", () => {
    const groups = groupStormFeatures([currentFeature()]);
    const s = stormChangeSummary(groups[0]);
    expect(s.genesis).toBeNull();
    expect(s.windThenKt).toBeNull();
    expect(s.windDeltaKt).toBeNull();
    expect(s.sizeThenNm).toBeNull();
    expect(s.sizeNowNm).toBeNull();
    expect(s.sizeDeltaNm).toBeNull();
  });
});

describe("pastPointTimeIso", () => {
  it("parses the dtg date-time-group as UTC", () => {
    expect(pastPointTimeIso({ dtg: 202510260600 })).toBe("2025-10-26T06:00:00Z");
    expect(pastPointTimeIso({ dtg: "202510261200" })).toBe("2025-10-26T12:00:00Z");
    // Live feed shape: dtg arrives as a double like 2026101818.0 (YYYYMMDDHH).
    expect(pastPointTimeIso({ dtg: 2026101818.0 })).toBe("2026-10-18T18:00:00Z");
  });

  it("falls back to year/month/day/hhmm, month as a name or a number", () => {
    expect(pastPointTimeIso({ year: 2026, month: "Oct", day: 26, hhmm: "1800" }))
      .toBe("2026-10-26T18:00:00Z");
    expect(pastPointTimeIso({ year: 2026, month: 10, day: 26, hhmm: "0600" }))
      .toBe("2026-10-26T06:00:00Z");
  });

  it("returns null rather than guessing at garbage", () => {
    expect(pastPointTimeIso({})).toBeNull();
    expect(pastPointTimeIso({ dtg: "soon" })).toBeNull();
    expect(pastPointTimeIso({ year: 2026, month: "Smarch", day: 1, hhmm: "0000" })).toBeNull();
  });
});
