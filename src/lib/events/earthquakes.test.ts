import { describe, expect, it } from "vitest";
import {
  SIGNIFICANT_MAGNITUDE,
  dedupeQuakes,
  filterSignificant,
  formatQuakeTimeUtc,
  parseUsgsFeature,
  quakeHeadline,
  quakeLocalTimeLabel,
  sortNewestFirst,
  type QuakeEvent,
} from "./earthquakes";

function feature(overrides: Record<string, any> = {}): any {
  return {
    id: "us6000u417",
    geometry: { coordinates: [152.2467, -5.1295, 57.317] },
    properties: {
      mag: 4.8,
      place: "86 km S of Kokopo, Papua New Guinea",
      time: 1792646639562,
      updated: 1792647000000,
      tsunami: 0,
      felt: null,
      cdi: null,
      mmi: null,
      alert: null,
      sig: 354,
      status: "reviewed",
      type: "earthquake",
      url: "https://earthquake.usgs.gov/earthquakes/eventpage/us6000u417",
      tz: null,
      ...overrides,
    },
  };
}

function quake(overrides: Partial<QuakeEvent> = {}): QuakeEvent {
  return {
    id: "x1",
    magnitude: 5,
    place: "Somewhere",
    time: 1000,
    updated: 1000,
    lat: 1,
    lng: 2,
    depthKm: 10,
    tsunami: false,
    felt: null,
    cdi: null,
    mmi: null,
    alert: null,
    sig: null,
    status: null,
    type: "earthquake",
    url: null,
    tzOffsetMinutes: null,
    ...overrides,
  };
}

describe("parseUsgsFeature", () => {
  it("maps the USGS GeoJSON shape (lng/lat/depth coordinate order)", () => {
    const q = parseUsgsFeature(feature());
    expect(q).not.toBeNull();
    expect(q!.id).toBe("us6000u417");
    expect(q!.lat).toBeCloseTo(-5.1295);
    expect(q!.lng).toBeCloseTo(152.2467);
    expect(q!.depthKm).toBeCloseTo(57.317);
    expect(q!.magnitude).toBe(4.8);
    expect(q!.tsunami).toBe(false);
    expect(q!.status).toBe("reviewed");
  });

  it("keeps felt/DYFI fields when the feed provides them", () => {
    const q = parseUsgsFeature(feature({ felt: 412, cdi: 5.4, mmi: 4.9, tsunami: 1, tz: 600 }));
    expect(q!.felt).toBe(412);
    expect(q!.cdi).toBe(5.4);
    expect(q!.mmi).toBe(4.9);
    expect(q!.tsunami).toBe(true);
    expect(q!.tzOffsetMinutes).toBe(600);
  });

  it("rejects features without the id/coordinate/time spine", () => {
    expect(parseUsgsFeature(null)).toBeNull();
    expect(parseUsgsFeature({ properties: {} })).toBeNull();
    expect(parseUsgsFeature(feature({ time: undefined }))).toBeNull();
    const noGeom = feature();
    delete noGeom.geometry;
    expect(parseUsgsFeature(noGeom)).toBeNull();
  });
});

describe("filterSignificant", () => {
  it("uses the named M4.5 threshold, inclusively", () => {
    expect(SIGNIFICANT_MAGNITUDE).toBe(4.5);
    const list = [
      quake({ id: "a", magnitude: 4.5 }),
      quake({ id: "b", magnitude: 4.4 }),
      quake({ id: "c", magnitude: 7.1 }),
      quake({ id: "d", magnitude: null }),
    ];
    expect(filterSignificant(list).map((q) => q.id)).toEqual(["a", "c"]);
  });

  it("accepts a custom threshold", () => {
    const list = [quake({ magnitude: 5.5 }), quake({ magnitude: 6.5 })];
    expect(filterSignificant(list, 6).map((q) => q.magnitude)).toEqual([6.5]);
  });
});

describe("dedupeQuakes / sortNewestFirst", () => {
  it("keeps the newest revision per id", () => {
    const old = quake({ id: "a", magnitude: 5.0, updated: 100 });
    const revised = quake({ id: "a", magnitude: 5.3, updated: 200 });
    const out = dedupeQuakes([old, revised, quake({ id: "b" })]);
    expect(out).toHaveLength(2);
    expect(out.find((q) => q.id === "a")!.magnitude).toBe(5.3);
  });

  it("sorts newest first", () => {
    const out = sortNewestFirst([
      quake({ id: "a", time: 100 }),
      quake({ id: "b", time: 300 }),
      quake({ id: "c", time: 200 }),
    ]);
    expect(out.map((q) => q.id)).toEqual(["b", "c", "a"]);
  });
});

describe("labels", () => {
  it("builds the search-style headline from the verbatim USGS place", () => {
    expect(quakeHeadline(parseUsgsFeature(feature())!)).toBe(
      "M4.8 Earthquake near 86 km S of Kokopo, Papua New Guinea",
    );
  });

  it("formats UTC time plainly", () => {
    expect(formatQuakeTimeUtc(Date.UTC(2026, 9, 22, 4, 23))).toContain("UTC");
    expect(formatQuakeTimeUtc(Date.UTC(2026, 9, 22, 4, 23))).toContain("2026");
  });

  it("derives local epicenter time only when USGS published an offset", () => {
    const withTz = quake({ time: Date.UTC(2026, 9, 22, 4, 23), tzOffsetMinutes: 600 });
    expect(quakeLocalTimeLabel(withTz)).toContain("UTC+10:00");
    expect(quakeLocalTimeLabel(quake({ tzOffsetMinutes: null }))).toBeNull();
    const west = quake({ time: Date.UTC(2026, 9, 22, 4, 23), tzOffsetMinutes: -420 });
    expect(quakeLocalTimeLabel(west)).toContain("UTC-07:00");
  });
});
