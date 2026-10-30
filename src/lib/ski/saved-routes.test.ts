import { describe, expect, it } from "vitest";
import {
  MAX_SAVED_ROUTES,
  downsampleRoute,
  parseSavedRoutes,
  removeSavedRoute,
  savedRouteId,
  upsertSavedRoute,
  type SavedSkiRoute,
} from "./saved-routes";

function route(id: string, savedAt = "2026-10-30T12:00:00.000Z"): SavedSkiRoute {
  return {
    id,
    resortSlug: "park-city",
    countrySlug: "united-states",
    start: { label: "Salt Lake City, UT", lat: 40.76, lng: -111.89 },
    dest: { label: "Park City, UT", lat: 40.646, lng: -111.498 },
    route: [
      [-111.89, 40.76],
      [-111.7, 40.7],
      [-111.498, 40.646],
    ],
    distanceKm: 51.2,
    durationMin: 44,
    savedAt,
  };
}

describe("parseSavedRoutes", () => {
  it("parses a JSON string of valid routes", () => {
    const out = parseSavedRoutes(JSON.stringify([route("a")]));
    expect(out).toHaveLength(1);
    expect(out[0].dest.label).toBe("Park City, UT");
  });

  it("returns [] for garbage, non-arrays and null", () => {
    expect(parseSavedRoutes("not json")).toEqual([]);
    expect(parseSavedRoutes("{}")).toEqual([]);
    expect(parseSavedRoutes(null)).toEqual([]);
    expect(parseSavedRoutes(42)).toEqual([]);
  });

  it("drops invalid records and keeps the valid ones", () => {
    const bad = { ...route("bad"), route: [[0, 999]] };
    const noStart = { ...route("bad2"), start: { label: "", lat: 1, lng: 2 } };
    const out = parseSavedRoutes([route("good"), bad, noStart, "junk"]);
    expect(out.map((r) => r.id)).toEqual(["good"]);
  });

  it("dedupes by id, sorts newest first and caps the list", () => {
    const many = Array.from({ length: MAX_SAVED_ROUTES + 3 }, (_, i) =>
      route(`r${i}`, `2026-10-${String(10 + i).padStart(2, "0")}T00:00:00.000Z`),
    );
    const out = parseSavedRoutes([...many, route("r0")]);
    expect(out).toHaveLength(MAX_SAVED_ROUTES);
    expect(out[0].savedAt >= out[out.length - 1].savedAt).toBe(true);
    expect(new Set(out.map((r) => r.id)).size).toBe(out.length);
  });
});

describe("savedRouteId / upsert / remove", () => {
  it("builds a stable id from resort + endpoints", () => {
    const r = route("x");
    expect(savedRouteId(r.resortSlug, r.start, r.dest)).toBe(
      "park-city|40.76000,-111.89000|40.64600,-111.49800",
    );
  });

  it("upsert replaces the same id and puts it first", () => {
    const a = route("a", "2026-10-01T00:00:00.000Z");
    const b = route("b", "2026-10-02T00:00:00.000Z");
    const refreshed = { ...a, savedAt: "2026-10-03T00:00:00.000Z" };
    const out = upsertSavedRoute([b, a], refreshed);
    expect(out.map((r) => r.id)).toEqual(["a", "b"]);
  });

  it("remove drops only the named route", () => {
    const out = removeSavedRoute([route("a"), route("b")], "a");
    expect(out.map((r) => r.id)).toEqual(["b"]);
    expect(removeSavedRoute([route("a")], "nope")).toHaveLength(1);
  });
});

describe("downsampleRoute", () => {
  it("passes short routes through as a copy", () => {
    const input: [number, number][] = [
      [0, 0],
      [1, 1],
    ];
    const out = downsampleRoute(input, 400);
    expect(out).toEqual(input);
    expect(out).not.toBe(input);
  });

  it("thins long routes, keeping first and last points", () => {
    const input = Array.from({ length: 1001 }, (_, i) => [i, i] as [number, number]);
    const out = downsampleRoute(input, 101);
    expect(out).toHaveLength(101);
    expect(out[0]).toEqual([0, 0]);
    expect(out[out.length - 1]).toEqual([1000, 1000]);
  });
});
