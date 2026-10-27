import { describe, it, expect } from "vitest";
import { cameraMatchesMood, preferUrbanNight, type MoodCamera } from "./moods";
import { isNightAt, sunElevationDeg } from "./solar";

const cam = (over: Partial<MoodCamera>): MoodCamera => ({
  name: "Camera",
  city: "",
  country: "",
  source: "",
  ...over,
});

describe("sunElevationDeg / isNightAt", () => {
  it("puts London in daylight at midday UTC in June", () => {
    const noon = new Date("2026-06-21T12:00:00Z");
    expect(sunElevationDeg(51.5, -0.12, noon)).toBeGreaterThan(40);
    expect(isNightAt(51.5, -0.12, noon)).toBe(false);
  });

  it("puts London in darkness at 01:00 UTC in June", () => {
    const night = new Date("2026-06-21T01:00:00Z");
    expect(isNightAt(51.5, -0.12, night)).toBe(true);
  });

  it("is opposite across the planet at the same instant", () => {
    const t = new Date("2026-10-26T00:00:00Z");
    // 09:00 in Tokyo (daylight), 19:00 in Chicago (after sunset).
    expect(isNightAt(35.7, 139.7, t)).toBe(false);
    expect(isNightAt(41.9, -87.6, t)).toBe(true);
  });
});

describe("cameraMatchesMood — rainy-cities", () => {
  it("matches cameras in curated rainy cities", () => {
    expect(cameraMatchesMood(cam({ city: "Seattle" }), "rainy-cities")).toBe(true);
    expect(cameraMatchesMood(cam({ city: "Bergen" }), "rainy-cities")).toBe(true);
  });

  it("matches rain words in the name anywhere", () => {
    expect(
      cameraMatchesMood(cam({ name: "Rainier Avenue S", city: "Somewhere" }), "rainy-cities"),
    ).toBe(false); // "Rainier" is not the word "rain"
    expect(
      cameraMatchesMood(cam({ name: "Storm drain cam", city: "Somewhere" }), "rainy-cities"),
    ).toBe(true);
  });

  it("does not match a dry-city plaza", () => {
    expect(cameraMatchesMood(cam({ city: "Phoenix", name: "Central Plaza" }), "rainy-cities")).toBe(false);
  });
});

describe("cameraMatchesMood — snowy-mountains", () => {
  it("matches ski and mountain words", () => {
    expect(cameraMatchesMood(cam({ name: "Alpine Ski Lift 2" }), "snowy-mountains")).toBe(true);
    expect(cameraMatchesMood(cam({ name: "Summit Pass Highway" }), "snowy-mountains")).toBe(true);
  });

  it("matches ski towns from the injected context", () => {
    const ctx = { skiTowns: new Set(["obertauern"]) };
    expect(
      cameraMatchesMood(cam({ name: "Ring Road", city: "Obertauern" }), "snowy-mountains", ctx),
    ).toBe(true);
    expect(
      cameraMatchesMood(cam({ name: "Ring Road", city: "Obertauern" }), "snowy-mountains"),
    ).toBe(false);
  });
});

describe("cameraMatchesMood — tropical-beaches", () => {
  it("matches beach scenes inside the tropical band", () => {
    expect(
      cameraMatchesMood(cam({ name: "Sunny Beach Pier", lat: 20.9, lng: -156.4 }), "tropical-beaches"),
    ).toBe(true);
  });

  it("rejects beach scenes outside the band", () => {
    expect(
      cameraMatchesMood(cam({ name: "North Beach", lat: 58.9, lng: 5.7 }), "tropical-beaches"),
    ).toBe(false);
  });

  it("rejects inland cameras even in the tropics", () => {
    expect(
      cameraMatchesMood(cam({ name: "Downtown Intersection", lat: 13.7, lng: 100.5 }), "tropical-beaches"),
    ).toBe(false);
  });
});

describe("cameraMatchesMood — night-views", () => {
  const instant = new Date("2026-10-26T00:00:00Z");
  it("requires coordinates, then the sun does the work", () => {
    expect(
      cameraMatchesMood(cam({ name: "Anywhere" }), "night-views", { now: instant }),
    ).toBe(false); // no coords → unverifiable
    expect(
      cameraMatchesMood(cam({ lat: 41.9, lng: -87.6 }), "night-views", { now: instant }),
    ).toBe(true); // Chicago at 00:00 UTC is in the night
    expect(
      cameraMatchesMood(cam({ lat: 35.7, lng: 139.7 }), "night-views", { now: instant }),
    ).toBe(false); // Tokyo is in morning daylight
  });
});

describe("preferUrbanNight", () => {
  it("returns the urban subset when it can fill the order", () => {
    const pool = [
      cam({ name: "Downtown skyline" }),
      cam({ name: "City bridge" }),
      cam({ name: "Fjord road mile 4" }),
    ];
    expect(preferUrbanNight(pool, 2)).toHaveLength(2);
  });

  it("falls back to the whole pool when urban runs short", () => {
    const pool = [cam({ name: "Downtown skyline" }), cam({ name: "Fjord road" })];
    expect(preferUrbanNight(pool, 5)).toHaveLength(2);
  });
});
