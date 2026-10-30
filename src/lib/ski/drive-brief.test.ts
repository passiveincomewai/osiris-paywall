import { describe, expect, it } from "vitest";
import type { CountryCamera } from "@/lib/country-cameras";
import {
  briefWeatherPoints,
  distanceKm,
  followedNearDestination,
  playableCameraCount,
  type BriefResort,
} from "./drive-brief";
import type { SavedSkiRoute } from "./saved-routes";

const savedRoute: SavedSkiRoute = {
  id: "park-city|40.76000,-111.89000|40.64600,-111.49800",
  resortSlug: "park-city",
  countrySlug: "united-states",
  start: { label: "Salt Lake City, UT", lat: 40.76, lng: -111.89 },
  dest: { label: "Park City, Utah, United States", lat: 40.646, lng: -111.498 },
  route: [
    [-111.89, 40.76],
    [-111.8, 40.72],
    [-111.65, 40.68],
    [-111.55, 40.66],
    [-111.498, 40.646],
  ],
  distanceKm: 51.2,
  durationMin: 44,
  savedAt: "2026-10-30T12:00:00.000Z",
};

describe("briefWeatherPoints", () => {
  it("returns start, polyline midpoint and destination", () => {
    const pts = briefWeatherPoints(savedRoute);
    expect(pts.map((p) => p.label)).toEqual(["Start", "Midway", "Park City"]);
    expect(pts[0]).toMatchObject({ lat: 40.76, lng: -111.89 });
    // route[2] is [-111.65, 40.68] as [lng, lat]
    expect(pts[1]).toMatchObject({ lat: 40.68, lng: -111.65 });
    expect(pts[2]).toMatchObject({ lat: 40.646, lng: -111.498 });
  });
});

describe("distanceKm", () => {
  it("is zero for the same point and sane for a known pair", () => {
    expect(distanceKm(40.646, -111.498, 40.646, -111.498)).toBe(0);
    // Park City -> Salt Lake City is roughly 51 km great-circle-ish road corridor; straight line ~43 km
    const d = distanceKm(40.646, -111.498, 40.76, -111.89);
    expect(d).toBeGreaterThan(30);
    expect(d).toBeLessThan(60);
  });
});

describe("followedNearDestination", () => {
  const followed: BriefResort[] = [
    { slug: "deer-valley", name: "Deer Valley", lat: 40.637, lng: -111.478 },
    { slug: "brighton", name: "Brighton", lat: 40.598, lng: -111.583 },
    { slug: "aspen", name: "Aspen", lat: 39.191, lng: -106.817 },
  ];

  it("keeps only resorts within the radius, closest first", () => {
    const out = followedNearDestination(followed, savedRoute);
    expect(out.map((r) => r.slug)).toEqual(["deer-valley", "brighton"]);
  });

  it("returns [] when nothing followed is near (section omitted)", () => {
    expect(followedNearDestination([followed[2]], savedRoute)).toEqual([]);
    expect(followedNearDestination([], savedRoute)).toEqual([]);
  });

  it("respects a custom radius", () => {
    const out = followedNearDestination(followed, savedRoute, 3);
    expect(out.map((r) => r.slug)).toEqual(["deer-valley"]);
  });
});

describe("playableCameraCount", () => {
  it("counts only tier-0 (directly playable) cameras", () => {
    const cams: CountryCamera[] = [
      { id: "a", name: "A", feed_url: "https://example.com/a.jpg" },
      { id: "b", name: "B", stream_url: "https://example.com/b.m3u8", stream_type: "hls" },
      { id: "c", name: "C", external_url: "https://example.com/c" },
      { id: "d", name: "D" },
    ];
    const n = playableCameraCount(cams);
    expect(n).toBeGreaterThanOrEqual(1);
    expect(n).toBeLessThan(cams.length);
  });

  it("is zero for an empty list", () => {
    expect(playableCameraCount([])).toBe(0);
  });
});
