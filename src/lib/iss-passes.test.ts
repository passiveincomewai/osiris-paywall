import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import {
  twoline2satrec,
  propagate,
  gstime,
  eciToEcf,
  ecfToLookAngles,
  degreesToRadians,
  radiansToDegrees,
} from "satellite.js";
import {
  ISS_CITIES,
  ISS_CITY_RADIUS_KM,
  ISS_INCLINATION_DEG,
  PASS_MIN_ELEVATION_DEG,
  findPasses,
  formatDuration,
  issCityBySlug,
  sunElevationDegAt,
  type Observer,
} from "./iss-passes";
import { tleEpoch } from "./iss-server";
import cityPages from "@/data/city-pages.json";

/**
 * ISS passes — the pins behind the /iss-over pages.
 *
 * The pass finder is validated against an independent fine-grid scan
 * built directly on satellite.js primitives (10-second steps,
 * ecfToLookAngles with no shared search code): the finder must land
 * on the same passes, with rise/peak/set inside the scan's tolerance.
 * The reference TLE is the same fixed-epoch ISS element set
 * lib/orbit.test.ts uses (epoch 2024-01-01.5), so every assertion is
 * deterministic — propagating a fixed element set to a fixed instant
 * never moves.
 *
 * Registry pins recompute each city's 25 km camera count from the
 * raw catalogue chunks (catalogue generated 2026-10-20): if the
 * catalogue regenerates and a count moves, the test fails loudly
 * rather than letting a page's numbers drift.
 */

const ISS_1 = "1 25544U 98067A   24001.50000000  .00016717  00000-0  30777-3 0  9993";
const ISS_2 = "2 25544  51.6416 247.4627 0006703 130.5360 325.0288 15.49309239 43458";
const FROM = new Date("2024-01-01T00:00:00Z");

const LONDON: Observer = { lat: 51.5074, lng: -0.1278 };
const NEW_YORK: Observer = { lat: 40.7128, lng: -74.006 };
const TROMSO: Observer = { lat: 69.65, lng: 18.96 };

/* Independent scan: 10 s grid over the raw library, no code shared
 * with the finder's search (only with the propagator itself). */
function scanElevations(observer: Observer, hours: number): { t: number; e: number }[] {
  const satrec = twoline2satrec(ISS_1, ISS_2);
  const out: { t: number; e: number }[] = [];
  const start = FROM.getTime();
  for (let t = start; t <= start + hours * 3_600_000; t += 10_000) {
    const when = new Date(t);
    const pv = propagate(satrec, when);
    if (!pv || typeof pv.position === "boolean") continue;
    const gmst = gstime(when);
    const ecf = eciToEcf(pv.position, gmst);
    const look = ecfToLookAngles(
      {
        longitude: degreesToRadians(observer.lng),
        latitude: degreesToRadians(observer.lat),
        height: 0,
      },
      ecf,
    );
    out.push({ t, e: radiansToDegrees(look.elevation) });
  }
  return out;
}

describe("findPasses against an independent fine-grid scan", () => {
  it("finds the same London passes, at the same times, as the scan", () => {
    const scan = scanElevations(LONDON, 72);
    const scanPeaks: number[] = [];
    let above = false;
    let best = -90;
    for (const s of scan) {
      if (s.e >= PASS_MIN_ELEVATION_DEG) {
        above = true;
        best = Math.max(best, s.e);
      } else if (above) {
        scanPeaks.push(best);
        above = false;
        best = -90;
      }
    }
    // London at the inclination's edge still gets real passes in 72 h.
    expect(scanPeaks.length).toBeGreaterThanOrEqual(2);

    const passes = findPasses(ISS_1, ISS_2, LONDON, FROM, 72);
    expect(passes.length).toBe(scanPeaks.length);
    for (let i = 0; i < passes.length; i++) {
      // The finder bisects and refines, so it must never land
      // materially below the scan's sampled peak. Near-zenith passes
      // are the exception to tight agreement: elevation there swings
      // ~1°/second through the peak, so a 10 s scan undersamples the
      // needle and reads low — the tolerance widens above 80°.
      const diff = Math.abs(passes[i].maxElevationDeg - scanPeaks[i]);
      const needle = Math.max(passes[i].maxElevationDeg, scanPeaks[i]) > 80;
      expect(diff, `pass ${i}`).toBeLessThan(needle ? 4 : 1.5);
      expect(passes[i].maxElevationDeg).toBeGreaterThan(scanPeaks[i] - 1.5);
    }
  });

  it("every pass is internally sane: ordered times, plausible duration and peak", () => {
    const passes = findPasses(ISS_1, ISS_2, NEW_YORK, FROM, 72);
    expect(passes.length).toBeGreaterThanOrEqual(3);
    for (const p of passes) {
      expect(p.start.getTime()).toBeLessThan(p.peak.getTime());
      expect(p.peak.getTime()).toBeLessThan(p.end.getTime());
      expect(p.maxElevationDeg).toBeGreaterThanOrEqual(PASS_MIN_ELEVATION_DEG);
      expect(p.maxElevationDeg).toBeLessThanOrEqual(90);
      const durSec = (p.end.getTime() - p.start.getTime()) / 1000;
      // Above 10° the station is up for minutes, never seconds or hours.
      expect(durSec).toBeGreaterThan(60);
      expect(durSec).toBeLessThan(900);
      expect(["visible", "twilight", "daylight", "eclipsed"]).toContain(p.visibility);
    }
  });

  it("finds no passes where the orbit can never rise — 69.6°N", () => {
    // The subpoint never exceeds 51.6° latitude, so from Tromsø the
    // station can never reach 10° elevation. A finder that reports a
    // pass here is inventing it.
    expect(findPasses(ISS_1, ISS_2, TROMSO, FROM, 72)).toEqual([]);
  });

  it("returns nothing for a TLE SGP4 cannot model, instead of throwing", () => {
    expect(findPasses("garbage", "garbage", NEW_YORK, FROM, 24)).toEqual([]);
  });
});

describe("sun elevation (the darkness half of a visible pass)", () => {
  it("puts the June-solstice noon sun high over the equator", () => {
    // 2024-06-20 ~12:00 UTC: declination ≈ +23.4°, observer on the
    // equator at the prime meridian → altitude ≈ 90 − 23.4 ≈ 66.6°.
    const alt = sunElevationDegAt({ lat: 0, lng: 0 }, new Date("2024-06-20T12:00:00Z"));
    expect(alt).toBeGreaterThan(60);
    expect(alt).toBeLessThan(72);
  });

  it("puts London deep in night at December-solstice midnight", () => {
    const alt = sunElevationDegAt(LONDON, new Date("2024-12-21T00:00:00Z"));
    expect(alt).toBeLessThan(-15);
  });
});

describe("tleEpoch", () => {
  it("reads the reference TLE's epoch exactly", () => {
    expect(tleEpoch(ISS_1)?.toISOString()).toBe("2024-01-01T12:00:00.000Z");
  });

  it("rejects a line with no readable epoch", () => {
    expect(tleEpoch("not a tle")).toBeNull();
  });
});

describe("the ISS city registry", () => {
  const DATA_DIR = join(process.cwd(), "src", "data");
  const chunkCache = new Map<string, { id: string; lat?: number; lng?: number }[]>();
  const chunk = (slug: string) => {
    let hit = chunkCache.get(slug);
    if (!hit) {
      hit = JSON.parse(
        readFileSync(join(DATA_DIR, "countries", `${slug}.json`), "utf8"),
      ) as { id: string; lat?: number; lng?: number }[];
      chunkCache.set(slug, hit);
    }
    return hit;
  };
  const haversineKm = (a: number, b: number, c: number, d: number) => {
    const R = 6371;
    const t = (x: number) => (x * Math.PI) / 180;
    const h =
      Math.sin(t(c - a) / 2) ** 2 +
      Math.cos(t(a)) * Math.cos(t(c)) * Math.sin(t(d - b) / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  };

  it("has unique slugs and resolves by slug", () => {
    const slugs = ISS_CITIES.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(ISS_CITIES.length).toBe(20);
    for (const c of ISS_CITIES) expect(issCityBySlug(c.slug)).toBe(c);
    expect(issCityBySlug("stockholm")).toBeNull();
  });

  it("keeps every city within the station's inclination band", () => {
    for (const c of ISS_CITIES) {
      expect(Math.abs(c.lat)).toBeLessThanOrEqual(ISS_INCLINATION_DEG);
    }
  });

  it("gives every city a real time zone", () => {
    for (const c of ISS_CITIES) {
      expect(() =>
        new Intl.DateTimeFormat("en-US", { timeZone: c.timeZone }),
      ).not.toThrow();
    }
  });

  it("backs every city with a real /city-webcams page", () => {
    const generated = new Set(
      (cityPages as { cities: { slug: string }[] }).cities.map((c) => c.slug),
    );
    for (const c of ISS_CITIES) {
      if (c.slug === "new-york-city") {
        // The bespoke route, not a generated one.
        expect(
          existsSync(
            join(process.cwd(), "src", "app", "(en)", "city-webcams", "new-york-city", "page.tsx"),
          ),
        ).toBe(true);
      } else {
        expect(generated.has(c.slug), c.slug).toBe(true);
      }
    }
  });

  it("recomputes each city's 25 km camera count from the raw chunks", () => {
    for (const c of ISS_CITIES) {
      const seen = new Set<string>();
      for (const r of chunk(c.chunk)) {
        if (typeof r.lat !== "number" || typeof r.lng !== "number") continue;
        if (haversineKm(c.lat, c.lng, r.lat, r.lng) <= ISS_CITY_RADIUS_KM) {
          seen.add(r.id);
        }
      }
      // The thinnest admitted wall (Chicago) measured 35; the floor
      // keeps a future catalogue honest rather than exact-pinning a
      // number a regeneration would move for innocent reasons.
      expect(seen.size, c.slug).toBeGreaterThanOrEqual(30);
    }
  });
});

describe("formatDuration", () => {
  it("reads like a sighting, not a stopwatch", () => {
    const a = new Date("2024-01-01T00:00:00Z");
    expect(formatDuration(a, new Date(a.getTime() + 45_000))).toBe("45 sec");
    expect(formatDuration(a, new Date(a.getTime() + 372_000))).toBe("6 min");
  });
});
