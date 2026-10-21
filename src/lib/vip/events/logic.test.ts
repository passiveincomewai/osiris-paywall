import { describe, it, expect } from "vitest";
import {
  computePasses,
  elevationDeg,
  haversineKm,
  issEvent,
  launchEvent,
  launchWindowsEntered,
  nextAlertablePass,
  quakeEvent,
  quakeMatches,
  validateEventConfig,
  type LaunchInput,
  type Propagator,
  type QuakeInput,
} from "./logic";
import type { SatPosition } from "@/lib/orbit";

describe("haversineKm", () => {
  it("is zero for the same point and sane for known distances", () => {
    expect(haversineKm({ lat: 41.2, lng: -112 }, { lat: 41.2, lng: -112 })).toBe(0);
    // Ogden UT → Salt Lake City UT ≈ 60 km
    const d = haversineKm({ lat: 41.223, lng: -111.974 }, { lat: 40.76, lng: -111.89 });
    expect(d).toBeGreaterThan(45);
    expect(d).toBeLessThan(75);
  });
});

describe("validateEventConfig", () => {
  it("accepts and normalises each kind", () => {
    expect(validateEventConfig("quake", { minMag: 5 })).toEqual({
      ok: true,
      kind: "quake",
      config: { minMag: 5 },
    });
    expect(validateEventConfig("launch", { leadHours: [24, 24, 1, 999] })).toEqual({
      ok: true,
      kind: "launch",
      config: { leadHours: [24, 1] },
    });
    expect(validateEventConfig("iss", { minElevationDeg: 25, leadHours: 12 })).toEqual({
      ok: true,
      kind: "iss",
      config: { minElevationDeg: 25, leadHours: 12 },
    });
  });
  it("rejects bad kinds and out-of-range thresholds", () => {
    expect(validateEventConfig("meteor", {})).toEqual({ ok: false, error: "kind_invalid" });
    expect(validateEventConfig("quake", { minMag: 2 })).toEqual({ ok: false, error: "min_mag_invalid" });
    expect(validateEventConfig("quake", {})).toEqual({ ok: false, error: "min_mag_invalid" });
    expect(validateEventConfig("launch", { leadHours: [3] })).toEqual({ ok: false, error: "lead_hours_invalid" });
    expect(validateEventConfig("iss", { minElevationDeg: 5, leadHours: 12 })).toEqual({
      ok: false,
      error: "min_elevation_invalid",
    });
    expect(validateEventConfig("iss", { minElevationDeg: 25, leadHours: 0 })).toEqual({
      ok: false,
      error: "lead_hours_invalid",
    });
  });
});

const quake: QuakeInput = {
  id: "us7000test",
  mag: 5.4,
  place: "10km S of Somewhere",
  timeMs: 1_760_000_000_000,
  lat: 41.3,
  lng: -111.9,
  depthKm: 8,
  url: "https://earthquake.usgs.gov/earthquakes/eventpage/us7000test",
};

describe("quakeMatches", () => {
  it("matches on magnitude for worldwide rules", () => {
    expect(quakeMatches({ minMag: 5 }, quake, null)).toBe(true);
    expect(quakeMatches({ minMag: 6 }, quake, null)).toBe(false);
  });
  it("applies the place radius", () => {
    const place = { lat: 41.223, lng: -111.974, radiusKm: 250 };
    expect(quakeMatches({ minMag: 5 }, quake, place)).toBe(true);
    expect(quakeMatches({ minMag: 5 }, quake, { ...place, radiusKm: 5 })).toBe(false);
  });
});

describe("launchWindowsEntered", () => {
  const launch: LaunchInput = {
    id: "ll2-1",
    name: "Falcon 9 | Test",
    netMs: 1_760_100_000_000,
    statusName: "Go for Launch",
    providerName: "SpaceX",
    padLocation: "Cape Canaveral",
  };
  it("enters windows as the NET approaches, never after liftoff", () => {
    const H = 3_600_000;
    expect(launchWindowsEntered({ leadHours: [24, 1] }, launch, launch.netMs! - 30 * H)).toEqual([]);
    expect(launchWindowsEntered({ leadHours: [24, 1] }, launch, launch.netMs! - 12 * H)).toEqual([24]);
    expect(launchWindowsEntered({ leadHours: [24, 1] }, launch, launch.netMs! - 30 * 60_000)).toEqual([24, 1]);
    expect(launchWindowsEntered({ leadHours: [24, 1] }, launch, launch.netMs! + 1)).toEqual([]);
    expect(launchWindowsEntered({ leadHours: [24] }, { ...launch, netMs: null }, 0)).toEqual([]);
  });
  it("shapes a dedupe key per launch + window", () => {
    expect(launchEvent(launch, 24).dedupeKey).toBe("launch:ll2-1:24h");
    expect(quakeEvent(quake, null).dedupeKey).toBe("quake:us7000test");
  });
});

describe("elevationDeg", () => {
  const obs = { lat: 41.2, lng: -112 };
  it("is ~90 for a satellite directly overhead and negative at the antipode", () => {
    expect(elevationDeg({ lat: 41.2, lng: -112, altKm: 420 }, obs)).toBeCloseTo(90, 0);
    expect(elevationDeg({ lat: -41.2, lng: 68, altKm: 420 }, obs)).toBeLessThan(0);
  });
  it("is near the horizon for a satellite far along the surface", () => {
    const e = elevationDeg({ lat: 41.2, lng: -112 + 35, altKm: 420 }, obs);
    expect(e).toBeLessThan(5);
  });
});

describe("computePasses + nextAlertablePass", () => {
  const obs = { lat: 41.2, lng: -112 };
  const T0 = 1_760_000_000_000;
  // Fake orbit: overhead for exactly [T0+10min, T0+16min], else antipodal.
  const fake: Propagator = (when: Date): SatPosition | null => {
    const t = when.getTime();
    if (t >= T0 + 600_000 && t <= T0 + 960_000) return { lat: 41.2, lng: -112, altKm: 420 };
    return { lat: -41.2, lng: 68, altKm: 420 };
  };
  it("finds the pass with a ~90° peak", () => {
    const passes = computePasses(fake, obs, T0, T0 + 3_600_000, 10, 30_000);
    expect(passes).toHaveLength(1);
    expect(passes[0].startMs).toBe(T0 + 600_000);
    expect(passes[0].peakElevationDeg).toBeCloseTo(90, 0);
  });
  it("returns nothing when the satellite never rises", () => {
    const never: Propagator = () => ({ lat: -41.2, lng: 68, altKm: 420 });
    expect(computePasses(never, obs, T0, T0 + 3_600_000, 10)).toEqual([]);
  });
  it("nextAlertablePass respects the lead window", () => {
    const passes = computePasses(fake, obs, T0, T0 + 3_600_000, 10, 30_000);
    expect(nextAlertablePass(passes, T0, 1)).not.toBeNull();
    expect(nextAlertablePass(passes, T0 - 7_200_000, 1)).toBeNull();
    expect(nextAlertablePass([], T0, 24)).toBeNull();
  });
  it("iss dedupe key is hour-bucketed so TLE jitter can't double-fire", () => {
    const a = issEvent({ startMs: T0 + 61_000, endMs: T0 + 400_000, peakMs: T0 + 200_000, peakElevationDeg: 42 }, "Home");
    const b = issEvent({ startMs: T0 + 99_000, endMs: T0 + 400_000, peakMs: T0 + 200_000, peakElevationDeg: 42 }, "Home");
    expect(a.dedupeKey).toBe(b.dedupeKey);
  });
});
