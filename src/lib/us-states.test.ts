import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import {
  getStateBySlug,
  getUsStatesIndex,
  stateForPoint,
  US_STATE_META,
} from "./us-states";

/**
 * The state-filter fix, pinned. Camera records carry no state field —
 * the only sub-country location key is `city`, which holds real cities
 * for most states (Texas cameras are filed under Houston, Dallas, …), so
 * filtering by state name returned 0 for them. State is now derived
 * from coordinates (stateForPoint) and precomputed into
 * src/data/us-states.json by tools/build-us-states.mjs. These tests pin
 * the derivation on anchor cities, the states that reported 0 before,
 * and the generated index's reconciliation against the served US data.
 */

describe("stateForPoint", () => {
  const anchors: Array<[string, number, number, string]> = [
    ["Atlanta", 33.749, -84.388, "georgia"],
    ["Houston", 29.76, -95.37, "texas"],
    ["Dallas", 32.777, -96.797, "texas"],
    ["Miami", 25.79, -80.22, "florida"],
    // Key West sits beyond the simplified mainland polygon — the
    // nearest-state fallback must still resolve it to Florida.
    ["Key West", 24.555, -81.78, "florida"],
    // Rodanthe, on the Outer Banks, is clipped by simplified boundaries.
    ["Rodanthe", 35.596, -75.47, "north-carolina"],
    ["Seattle", 47.606, -122.332, "washington"],
    ["Salt Lake City", 40.761, -111.891, "utah"],
    ["Las Vegas", 36.17, -115.14, "nevada"],
    ["Indianapolis", 39.768, -86.158, "indiana"],
    ["Phoenix", 33.448, -112.074, "arizona"],
    ["Chicago", 41.878, -87.63, "illinois"],
    ["Kansas City (MO side)", 39.099, -94.578, "missouri"],
    ["Portland, Oregon", 45.515, -122.679, "oregon"],
    ["Portland, Maine", 43.659, -70.257, "maine"],
    ["Washington, DC", 38.907, -77.037, "district-of-columbia"],
    ["Anchorage", 61.218, -149.9, "alaska"],
    ["Honolulu", 21.307, -157.858, "hawaii"],
    ["Providence", 41.824, -71.413, "rhode-island"],
  ];
  for (const [label, lat, lng, slug] of anchors) {
    it(`places ${label} in ${slug}`, () => {
      expect(stateForPoint(lat, lng)?.slug).toBe(slug);
    });
  }

  it("returns null far offshore", () => {
    expect(stateForPoint(20, -90)).toBeNull(); // Gulf of Mexico
    expect(stateForPoint(35, -65)).toBeNull(); // Atlantic
    expect(stateForPoint(0, 0)).toBeNull();
  });

  it("covers all 50 states plus DC, with unique slugs", () => {
    expect(US_STATE_META).toHaveLength(51);
    expect(new Set(US_STATE_META.map((s) => s.slug)).size).toBe(51);
    expect(new Set(US_STATE_META.map((s) => s.usps)).size).toBe(51);
  });
});

describe("generated us-states index", () => {
  const index = getUsStatesIndex();

  it("reconciles with the served US catalogue", () => {
    const usRecords = JSON.parse(
      readFileSync(
        join(process.cwd(), "src", "data", "countries", "united-states.json"),
        "utf8"
      )
    ) as unknown[];
    expect(index.sourceTotal).toBe(usRecords.length);
    expect(index.assignedTotal + index.unassigned).toBe(index.sourceTotal);
    expect(index.assignedTotal).toBe(
      index.states.reduce((n, s) => n + s.count, 0)
    );
  });

  it("has a page-worthy entry for every state that serves cameras", () => {
    // Every state has cameras in the served data — the smallest is
    // Rhode Island with a single feed. No state may silently sit at 0.
    expect(index.states).toHaveLength(51);
    for (const s of index.states) {
      expect(s.count, s.slug).toBeGreaterThan(0);
      expect(s.samples.length, s.slug).toBeGreaterThan(0);
      expect(s.samples.length).toBeLessThanOrEqual(Math.min(6, s.count));
      expect(s.areas.length, s.slug).toBeGreaterThan(0);
      for (const a of s.areas) expect(a.count).toBeLessThanOrEqual(s.count);
    }
  });

  it("counts the states that used to filter to 0 by their real totals", () => {
    // Under the old city-key filter these matched nothing at all
    // (city=Texas returned 0; the stale directory claimed 2,492 for
    // Texas and 1,435 for Florida).
    expect(getStateBySlug("texas")?.count).toBeGreaterThan(4000);
    expect(getStateBySlug("florida")?.count).toBeGreaterThan(4000);
    expect(getStateBySlug("california")?.count).toBeGreaterThan(3000);
    // The states whose DOT feeds file under the state name still agree
    // with their city-key totals (GDOT's city=Georgia bucket is 4,284).
    expect(getStateBySlug("georgia")?.count).toBeGreaterThan(4200);
    expect(getStateBySlug("utah")?.count).toBeGreaterThan(2000);
  });

  it("is sorted by count descending and carries only known states", () => {
    const counts = index.states.map((s) => s.count);
    expect(counts).toEqual([...counts].sort((a, b) => b - a));
    const known = new Set(US_STATE_META.map((s) => s.slug));
    for (const s of index.states) expect(known.has(s.slug)).toBe(true);
  });
});
