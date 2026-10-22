import { describe, expect, it } from "vitest";
import {
  classificationLabel,
  compassDirection,
  findStormGroup,
  groupStormFeatures,
  ktToMph,
  saffirSimpsonCategory,
  stormDisplayCategory,
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
