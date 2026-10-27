import { describe, expect, it } from "vitest";
import {
  bboxRadiusM,
  dominantPlaceRecords,
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

describe("dominantPlaceRecords", () => {
  const rec = (lat: number, lng: number) => ({ lat, lng });

  it("returns an empty or single record untouched", () => {
    expect(dominantPlaceRecords([])).toEqual([]);
    const one = [rec(47.6, -122.3)];
    expect(dominantPlaceRecords(one)).toEqual(one);
  });

  it("returns a single compact place whole and in input order", () => {
    /* A Seattle-sized spread: ~35 km diagonal, no empty band. */
    const pts = [
      rec(47.45, -122.45),
      rec(47.75, -122.15),
      rec(47.6, -122.3),
      rec(47.55, -122.35),
    ];
    const out = dominantPlaceRecords(pts);
    expect(out).toHaveLength(4);
    expect(out).toEqual(pts);
  });

  it("never cuts a wide but continuous place (corridor with no 40 km band)", () => {
    /* 200 km chain of records every ~20 km — diagonal is far past the
       split threshold, but no empty band exists, so it stays whole. */
    const pts = Array.from({ length: 11 }, (_, i) =>
      rec(47 + i * 0.18, -122),
    );
    expect(dominantPlaceRecords(pts)).toHaveLength(11);
  });

  it("splits two same-name places and keeps the dominant one, in input order", () => {
    /* Marysville-shaped: a WA cluster around (48.09, -122.20) and a
       CA cluster around (39.18, -121.55), interleaved in input order. */
    const wa = [rec(48.05, -122.16), rec(48.12, -122.24), rec(48.1, -122.2)];
    const ca = [rec(39.18, -121.55), rec(39.15, -121.5)];
    const pts = [wa[0], ca[0], wa[1], ca[1], wa[2]];
    const out = dominantPlaceRecords(pts);
    expect(out).toEqual(wa);
  });

  it("drops a lone far-flung outlier record (bad coordinate) from the point set", () => {
    const home = [rec(39.47, -0.38), rec(39.45, -0.4), rec(39.49, -0.36)];
    const pts = [...home, rec(-39.34, -0.43)];
    expect(dominantPlaceRecords(pts)).toEqual(home);
  });

  it("splits along longitude too (two places at the same latitude)", () => {
    const west = [rec(40, -122), rec(40.05, -122.05), rec(39.95, -121.95)];
    const east = [rec(40, -74), rec(40.02, -74.03)];
    const out = dominantPlaceRecords([...east, ...west]);
    expect(out).toEqual(west);
  });

  it("breaks a size tie deterministically (cluster nearest the group mean wins)", () => {
    /* Two 2-record clusters ~1100 km apart; the group mean sits
       between them, so the tie falls to the next rule and the result
       must be stable across calls. */
    const a = [rec(48, -122), rec(48.02, -122.02)];
    const b = [rec(39, -121.5), rec(39.02, -121.52)];
    const out1 = dominantPlaceRecords([...a, ...b]);
    const out2 = dominantPlaceRecords([...b, ...a]);
    expect(out1).toHaveLength(2);
    expect(out2).toHaveLength(2);
    const mean = (pts: { lat: number; lng: number }[]) =>
      pts.reduce((s, p) => s + p.lat, 0) / pts.length;
    expect(mean(out1)).toBe(mean(out2));
  });
});
