import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
// The build tool's pure helpers, exercised directly: importing the
// module must not run the build (it is main-guarded).
import {
  PLACE_RADIUS_KM,
  GAZETTEER_MIN_POPULATION,
  haversineKm,
  buildPlaceGrid,
  nearestPlace,
  placesWithin,
  assignPlace,
  isStateNameLabel,
} from "../../tools/build-us-states.mjs";
import {
  placeForCamera,
  derivedCityForCamera,
  withDerivedCities,
  getStateDerivedAreas,
  derivedPlaceCount,
} from "./us-places";
import { getStateBySlug } from "./us-states";
import type { CountryCamera } from "./country-cameras";

/**
 * The state-label fix, pinned. DOT feeds file cameras under the state
 * name (2,084 Utah cameras with city "Utah"), so Ogden — with dozens
 * of cameras physically in it — was unfindable. tools/build-us-states
 * derives a real GeoNames place per state-labelled camera into
 * src/data/us-camera-places.json; the tests below pin the assignment
 * rules on synthetic places and the committed data on the real
 * catalogue (Ogden's count is an end-to-end assertion, not a fixture).
 */

const place = (name: string, state: string, lat: number, lng: number, population: number) => ({
  name,
  state,
  lat,
  lng,
  population,
});

/* A synthetic Wasatch-Front-like strip: the dominant city (85k), a
   small suburb (9k) 5 km south of it, and a near-peer city (74k)
   20 km south. Plus a tiny village (pop 120) far from everything. */
const BIG = place("Bigton", "UT", 41.0, -112.0, 85_000);
const SUBURB = place("Smallville", "UT", 40.955, -112.0, 9_000); // ~5 km south of Bigton
const PEER = place("Peerton", "UT", 40.82, -112.0, 74_000); // ~20 km south of Bigton
const VILLAGE = place("Tinyham", "UT", 39.0, -110.0, 120);
const ALL = [BIG, SUBURB, PEER, VILLAGE];
const mainGrid = buildPlaceGrid(ALL.filter((p) => p.population >= GAZETTEER_MIN_POPULATION));
const allGrid = buildPlaceGrid(ALL);

describe("haversineKm", () => {
  it("measures a degree of latitude at ~111 km", () => {
    expect(haversineKm(40, -112, 41, -112)).toBeGreaterThan(110);
    expect(haversineKm(40, -112, 41, -112)).toBeLessThan(112);
  });
  it("is zero for the same point", () => {
    expect(haversineKm(41.2, -111.9, 41.2, -111.9)).toBe(0);
  });
});

describe("nearestPlace / placesWithin", () => {
  it("finds the closest place", () => {
    const hit = nearestPlace(allGrid, 40.956, -112.0);
    expect(hit?.place.name).toBe("Smallville");
  });
  it("respects the radius cutoff", () => {
    // ~56 km north of Bigton: nothing within 30 km.
    expect(nearestPlace(allGrid, 41.5, -112.0)).toBeNull();
    expect(placesWithin(allGrid, 41.5, -112.0, PLACE_RADIUS_KM)).toHaveLength(0);
  });
  it("never crosses a state line when a state is given", () => {
    const wy = buildPlaceGrid([place("Border Town", "WY", 41.0, -111.0, 2_000)]);
    // The point is in "Utah" for this query; the only place is in WY.
    expect(nearestPlace(wy, 41.0, -111.05, { state: "UT" })).toBeNull();
    expect(nearestPlace(wy, 41.0, -111.05, { state: "WY" })?.place.name).toBe("Border Town");
  });
});

describe("assignPlace", () => {
  it("assigns the nearest town when no dominant city is in play", () => {
    // Right next to Peerton, far from everything else.
    const hit = assignPlace(mainGrid, allGrid, 40.821, -112.0, { state: "UT" });
    expect(hit?.place.name).toBe("Peerton");
    expect(hit?.via).toBe("nearest");
  });
  it("files a suburb camera under the dominant city", () => {
    // In Smallville (9k), but Bigton (85k, > 3x) is ~5 km away.
    const hit = assignPlace(mainGrid, allGrid, 40.956, -112.0, { state: "UT" });
    expect(hit?.place.name).toBe("Bigton");
    expect(hit?.via).toBe("dominant");
  });
  it("never lets a near-peer absorb — the peer keeps its own cameras", () => {
    // On Peerton's doorstep: Bigton is > 10 km away and not 3x Peerton
    // anyway; the camera is Peerton's regardless.
    const hit = assignPlace(mainGrid, allGrid, 40.83, -112.0, { state: "UT" });
    expect(hit?.place.name).toBe("Peerton");
  });
  it("falls back to a smaller place when no town is in range", () => {
    const hit = assignPlace(mainGrid, allGrid, 39.001, -110.0, { state: "UT" });
    expect(hit?.place.name).toBe("Tinyham");
    expect(hit?.via).toBe("fallback");
  });
  it("returns null when nothing is within the radius", () => {
    expect(assignPlace(mainGrid, allGrid, 41.6, -112.0, { state: "UT" })).toBeNull();
  });
});

describe("isStateNameLabel", () => {
  const names = new Set(["utah", "georgia", "texas"]);
  it("matches state names, case- and space-insensitively", () => {
    expect(isStateNameLabel("Utah", names)).toBe(true);
    expect(isStateNameLabel(" georgia ", names)).toBe(true);
  });
  it("never matches real cities or empty labels", () => {
    expect(isStateNameLabel("Houston", names)).toBe(false);
    expect(isStateNameLabel("Ogden", names)).toBe(false);
    expect(isStateNameLabel("", names)).toBe(false);
    expect(isStateNameLabel(undefined, names)).toBe(false);
  });
});

/* ---- the committed derivation, against the real catalogue ---- */

interface Sidecar {
  assigned: number;
  overrides: Record<string, { place: string; state: string }>;
  stateAreas: Record<string, Array<{ name: string; count: number }>>;
}
const sidecar = JSON.parse(
  readFileSync(join(process.cwd(), "src/data/us-camera-places.json"), "utf8"),
) as Sidecar;

describe("us-camera-places sidecar (real generated data)", () => {
  it("assigns a place to the bulk of state-labelled cameras", () => {
    expect(sidecar.assigned).toBeGreaterThan(8_000);
    expect(derivedPlaceCount()).toBe(sidecar.assigned);
  });

  it("Utah's areas are real places now — the state is not its own top area", () => {
    const utah = getStateBySlug("utah");
    expect(utah).toBeDefined();
    expect(utah!.areas[0].name).toBe("Salt Lake City");
    expect(utah!.areas.some((a) => a.name === "Utah")).toBe(false);
  });

  it("Ogden's true count clears 40 (it was 4 searchable cameras before)", () => {
    const ogden = getStateDerivedAreas("utah")?.find((a) => a.name === "Ogden");
    expect(ogden).toBeDefined();
    expect(ogden!.count).toBeGreaterThan(40);
    // …and the state page's sliced areas agree with the sidecar list.
    const fromIndex = getStateBySlug("utah")!.areas.find((a) => a.name === "Ogden");
    expect(fromIndex?.count).toBe(ogden!.count);
  });

  it("Georgia's areas lead with Atlanta, not 'Georgia'", () => {
    const ga = getStateBySlug("georgia");
    expect(ga!.areas[0].name).toBe("Atlanta");
    expect(ga!.areas.some((a) => a.name === "Georgia")).toBe(false);
  });

  it("states with real city labels are untouched — Texas still leads with Houston", () => {
    const tx = getStateBySlug("texas");
    expect(tx!.areas[0]).toEqual({ name: "Houston", count: 1172 });
  });

  it("placeForCamera resolves a real Ogden camera by id", () => {
    const ogdenId = Object.entries(sidecar.overrides).find(([, o]) => o.place === "Ogden")?.[0];
    expect(ogdenId).toBeDefined();
    expect(placeForCamera({ id: ogdenId })).toEqual({ place: "Ogden", state: "UT" });
    expect(derivedCityForCamera({ id: ogdenId })).toBe("Ogden");
    expect(placeForCamera({ id: "no-such-camera" })).toBeNull();
    expect(placeForCamera({})).toBeNull();
    expect(placeForCamera({ id: null })).toBeNull();
  });

  it("withDerivedCities substitutes only overridden records", () => {
    const ogdenId = Object.entries(sidecar.overrides).find(([, o]) => o.place === "Ogden")![0];
    const records = JSON.parse(
      readFileSync(join(process.cwd(), "src/data/countries/united-states.json"), "utf8"),
    ) as CountryCamera[];
    const byId = new Map(records.map((r) => [r.id, r]));
    const ogdenRec = byId.get(ogdenId)!;
    const houstonRec = records.find((r) => r.city === "Houston")!;
    expect(ogdenRec.city).toBe("Utah"); // the feed label really is the state
    const out = withDerivedCities([ogdenRec, houstonRec]);
    expect(out[0].city).toBe("Ogden");
    expect(out[1]).toBe(houstonRec); // untouched, same object
    expect(ogdenRec.city).toBe("Utah"); // input not mutated
    // A list with no overrides comes back as the same array.
    const plain = [houstonRec];
    expect(withDerivedCities(plain)).toBe(plain);
  });
});
