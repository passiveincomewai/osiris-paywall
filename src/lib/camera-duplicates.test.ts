// Duplicate-detection pins:
//  - URL equality survives the cosmetic differences real feeds carry
//    (scheme, www, trailing slash, tracking params) and nothing else;
//  - a name match needs a place signal (close coords or same city) —
//    identical names on different continents are different cameras;
//  - haversine agrees with an independently computed known pair.
import { describe, it, expect } from "vitest";
import {
  normalizeFeedUrl,
  normalizeCameraName,
  nameSimilarity,
  haversineMeters,
  findCatalogueDuplicates,
  type CatalogueEntry,
} from "./camera-duplicates";

const ENTRIES: CatalogueEntry[] = [
  {
    id: "pier39",
    name: "Pier 39 Sea Lions",
    city: "San Francisco",
    country: "United States",
    lat: 37.8087,
    lng: -122.4098,
    urls: ["https://cams.example.com/pier39/playlist.m3u8"],
  },
  {
    id: "mainst-reno",
    name: "Main Street Cam",
    city: "Reno",
    country: "United States",
    lat: 39.5296,
    lng: -119.8138,
    urls: ["https://feeds.example.org/reno/main.jpg"],
  },
  {
    id: "mainst-perth",
    name: "Main Street Cam",
    city: "Perth",
    country: "Australia",
    lat: -31.9505,
    lng: 115.8605,
    urls: ["https://feeds.example.net/perth/main.jpg"],
  },
];

const sub = (over: Partial<Parameters<typeof findCatalogueDuplicates>[1]>) => ({
  name: "Harbor Entrance Cam",
  url: "https://new.example.com/harbor.m3u8",
  city: "Friday Harbor",
  country: "United States",
  lat: null,
  lng: null,
  ...over,
});

describe("normalizeFeedUrl", () => {
  it("treats scheme, www, trailing slash, case and tracking params as cosmetic", () => {
    const a = normalizeFeedUrl("http://www.Cams.Example.com/pier39/playlist.m3u8/");
    const b = normalizeFeedUrl("https://cams.example.com/pier39/playlist.m3u8?utm_source=x#frag");
    expect(a).toBe(b);
    expect(a).toBe("cams.example.com/pier39/playlist.m3u8");
  });

  it("keeps meaningful differences: host, path, port, real query params", () => {
    expect(normalizeFeedUrl("https://a.example.com/x.m3u8")).not.toBe(
      normalizeFeedUrl("https://b.example.com/x.m3u8"),
    );
    expect(normalizeFeedUrl("https://a.example.com/x.m3u8")).not.toBe(
      normalizeFeedUrl("https://a.example.com/y.m3u8"),
    );
    expect(normalizeFeedUrl("https://a.example.com:8443/x.m3u8")).not.toBe(
      normalizeFeedUrl("https://a.example.com/x.m3u8"),
    );
    expect(normalizeFeedUrl("https://a.example.com/x?cam=1")).not.toBe(
      normalizeFeedUrl("https://a.example.com/x?cam=2"),
    );
  });

  it("returns null for unparseable input", () => {
    expect(normalizeFeedUrl("not a url")).toBeNull();
    expect(normalizeFeedUrl("")).toBeNull();
  });
});

describe("names + distance", () => {
  it("normalizes case, punctuation and accents", () => {
    expect(normalizeCameraName("  Pier 39 — Sea Lions! ")).toBe("pier 39 sea lions");
    expect(normalizeCameraName("Café Caméra")).toBe("cafe camera");
  });

  it("scores identical token sets 1 and disjoint sets 0", () => {
    expect(nameSimilarity("pier 39 sea lions", "sea lions pier 39")).toBe(1);
    expect(nameSimilarity("harbor cam", "mountain cam")).toBeCloseTo(1 / 3);
    expect(nameSimilarity("alpha", "beta")).toBe(0);
  });

  it("haversine matches an independently computed known pair", () => {
    // San Francisco (37.8087,-122.4098) → Oakland (37.8044,-122.2712):
    // ≈ 12.17 km by external great-circle calculators.
    const d = haversineMeters(37.8087, -122.4098, 37.8044, -122.2712);
    expect(d).toBeGreaterThan(12000);
    expect(d).toBeLessThan(12400);
    expect(haversineMeters(37.8087, -122.4098, 37.8087, -122.4098)).toBe(0);
  });
});

describe("findCatalogueDuplicates", () => {
  it("exact: same feed address under cosmetic differences", () => {
    const r = findCatalogueDuplicates(
      ENTRIES,
      sub({ url: "http://www.cams.example.com/pier39/playlist.m3u8/?utm_medium=web" }),
    );
    expect(r.verdict).toBe("exact");
    expect(r.matches[0].id).toBe("pier39");
  });

  it("possible: same name ~55 m away", () => {
    const r = findCatalogueDuplicates(
      ENTRIES,
      sub({
        name: "Pier 39 Sea Lions",
        city: "San Francisco",
        lat: 37.8092, // ≈55 m north of the catalogue pin
        lng: -122.4098,
      }),
    );
    expect(r.verdict).toBe("possible");
    expect(r.matches[0].id).toBe("pier39");
    expect(r.matches[0].reason).toContain("m apart");
  });

  it("possible: same name and same city, no coordinates on either side of the check", () => {
    const r = findCatalogueDuplicates(
      ENTRIES,
      sub({ name: "Main Street Cam", city: "reno" }),
    );
    expect(r.verdict).toBe("possible");
    expect(r.matches.map((m) => m.id)).toEqual(["mainst-reno"]);
  });

  it("none: same name, different continent, far coordinates", () => {
    const r = findCatalogueDuplicates(
      ENTRIES,
      sub({
        name: "Main Street Cam",
        city: "Auckland",
        country: "New Zealand",
        lat: -36.8485,
        lng: 174.7633,
      }),
    );
    expect(r.verdict).toBe("none");
  });

  it("none: a genuinely new camera", () => {
    expect(findCatalogueDuplicates(ENTRIES, sub({})).verdict).toBe("none");
  });

  it("exact beats possible when both would match", () => {
    const r = findCatalogueDuplicates(
      ENTRIES,
      sub({
        name: "Pier 39 Sea Lions",
        url: "https://cams.example.com/pier39/playlist.m3u8",
        city: "San Francisco",
        lat: 37.8087,
        lng: -122.4098,
      }),
    );
    expect(r.verdict).toBe("exact");
  });
});
