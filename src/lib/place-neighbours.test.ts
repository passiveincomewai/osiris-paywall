import { describe, expect, it } from "vitest";
import {
  bboxRadiusM,
  hasFullNeighbourSet,
  haversineKm,
  neighbourAnchor,
  neighbourLinks,
  nearestCityNeighbours,
  possessive,
  type CityPoint,
} from "@/lib/place-neighbours";

/* Synthetic points on a simple grid: 1° of latitude ≈ 111.19 km, so
   distances are easy to reason about exactly. */
const pt = (
  slug: string,
  lat: number,
  lng: number,
  extra?: Partial<CityPoint>,
): CityPoint => ({
  slug,
  name: slug,
  countrySlug: "united-states",
  region: null,
  lat,
  lng,
  ...extra,
});

const SELF = pt("self", 47.6, -122.3, { name: "Self", region: "Washington" });

describe("haversineKm", () => {
  it("is zero for the same point and ~111.19 km for 1° of latitude", () => {
    expect(haversineKm(47.6, -122.3, 47.6, -122.3)).toBe(0);
    expect(haversineKm(47.6, -122.3, 48.6, -122.3)).toBeCloseTo(111.19, 1);
  });
});

describe("nearestCityNeighbours", () => {
  it("returns nearest first", () => {
    const points = [
      SELF,
      pt("far", 49.6, -122.3, { region: "Washington" }), // ~222 km
      pt("near", 47.9, -122.3, { region: "Washington" }), // ~33 km
      pt("mid", 48.6, -122.3, { region: "Washington" }), // ~111 km
    ];
    const out = nearestCityNeighbours(SELF, points);
    expect(out.map((n) => n.slug)).toEqual(["near", "mid", "far"]);
    expect(out[0].distanceKm).toBeCloseTo(33.4, 0);
    expect(out[2].distanceKm).toBeGreaterThan(out[0].distanceKm);
  });

  it("excludes the page itself, even at distance zero", () => {
    const points = [SELF, pt("self", 47.6, -122.3), pt("other", 47.9, -122.3)];
    const out = nearestCityNeighbours(SELF, points);
    expect(out.map((n) => n.slug)).toEqual(["other"]);
  });

  it("only offers same-country pages, however near the foreign one is", () => {
    const points = [
      SELF,
      pt("abroad", 47.65, -122.3, { countrySlug: "canada" }), // ~6 km, wrong country
      pt("home", 48.6, -122.3),
    ];
    const out = nearestCityNeighbours(SELF, points);
    expect(out.map((n) => n.slug)).toEqual(["home"]);
  });

  it("enforces the radius gate, and honours a wider explicit radius", () => {
    const beyond = pt("beyond", 53.6, -122.3); // ~667 km north
    expect(nearestCityNeighbours(SELF, [SELF, beyond])).toEqual([]);
    const wide = nearestCityNeighbours(SELF, [SELF, beyond], {
      maxDistanceKm: 750,
    });
    expect(wide.map((n) => n.slug)).toEqual(["beyond"]);
  });

  it("prefers the same region when filling the set, displays nearest-first", () => {
    const points = [
      SELF,
      pt("region-far", 49.6, -122.3, { region: "Washington" }), // ~222 km, same region
      pt("region-mid", 48.6, -122.3, { region: "Washington" }), // ~111 km, same region
      pt("other-near", 47.9, -122.3, { region: "Oregon" }), // ~33 km, other region
      pt("other-mid", 48.1, -122.3, { region: "Oregon" }), // ~56 km, other region
    ];
    const out = nearestCityNeighbours(SELF, points);
    /* Both Washington pages are selected ahead of the second Oregon
       page even though it is nearer; display order is by distance. */
    expect(out.map((n) => n.slug)).toEqual([
      "other-near",
      "region-mid",
      "region-far",
    ]);
  });

  it("respects the limit", () => {
    const points = [
      SELF,
      ...[0.3, 0.6, 0.9, 1.2, 1.5].map((d, i) => pt(`c${i}`, 47.6 + d, -122.3)),
    ];
    expect(nearestCityNeighbours(SELF, points)).toHaveLength(3);
    expect(nearestCityNeighbours(SELF, points, { limit: 2 })).toHaveLength(2);
  });

  it("degrades gracefully below the data threshold — fewer, never padded", () => {
    const points = [SELF, pt("only", 47.9, -122.3), pt("two", 48.2, -122.3)];
    const out = nearestCityNeighbours(SELF, points);
    expect(out).toHaveLength(2);
    expect(hasFullNeighbourSet(out)).toBe(false);
    expect(hasFullNeighbourSet([...out, out[0]])).toBe(true);
  });

  it("skips candidates without usable coordinates; an unplaced self gets none", () => {
    const points = [
      SELF,
      pt("nan", Number.NaN, -122.3),
      pt("off-globe", 147.9, -122.3),
      pt("real", 47.9, -122.3),
    ];
    expect(nearestCityNeighbours(SELF, points).map((n) => n.slug)).toEqual([
      "real",
    ]);
    expect(nearestCityNeighbours(pt("lost", Number.NaN, 0), points)).toEqual(
      [],
    );
  });
});

describe("anchors", () => {
  it("rotates through the three sanctioned shapes by position", () => {
    expect(neighbourAnchor("Seattle", 0)).toBe("Seattle webcams");
    expect(neighbourAnchor("Seattle", 1)).toBe("live cameras in Seattle");
    expect(neighbourAnchor("Seattle", 2)).toBe("Seattle's camera index");
    expect(neighbourAnchor("Seattle", 3)).toBe("Seattle webcams");
  });

  it("forms the possessive without a doubled s", () => {
    expect(possessive("Las Vegas")).toBe("Las Vegas'");
    expect(neighbourAnchor("Las Vegas", 2)).toBe("Las Vegas' camera index");
  });

  it("builds links with the distance fact attached", () => {
    const links = neighbourLinks([
      { ...pt("near", 47.9, -122.3), distanceKm: 33.4 },
      { ...pt("mid", 48.6, -122.3), distanceKm: 111.2 },
    ]);
    expect(links).toEqual([
      { label: "near webcams", href: "/city-webcams/near", distanceKm: 33.4 },
      {
        label: "live cameras in mid",
        href: "/city-webcams/mid",
        distanceKm: 111.2,
      },
    ]);
  });
});

describe("bboxRadiusM", () => {
  it("floors a single-point box at the geo format's minimum radius", () => {
    expect(
      bboxRadiusM({ minLat: 47.6, maxLat: 47.6, minLng: -122.3, maxLng: -122.3 }),
    ).toBe(250);
  });

  it("frames a city-sized box at half its diagonal", () => {
    /* ~0.35° × ~0.55° around Seattle: diagonal ≈ 57 km → ≈28.5 km. */
    const r = bboxRadiusM({
      minLat: 47.45,
      maxLat: 47.8,
      minLng: -122.55,
      maxLng: -122.0,
    });
    expect(r).toBeGreaterThan(20_000);
    expect(r).toBeLessThan(35_000);
  });

  it("caps a continent-sized box at the geo format's maximum radius", () => {
    expect(
      bboxRadiusM({ minLat: 25, maxLat: 49, minLng: -125, maxLng: -66 }),
    ).toBe(100_000);
  });

  it("falls back to the floor on a malformed box", () => {
    expect(
      bboxRadiusM({
        minLat: Number.NaN,
        maxLat: 1,
        minLng: 0,
        maxLng: 1,
      }),
    ).toBe(250);
  });
});
