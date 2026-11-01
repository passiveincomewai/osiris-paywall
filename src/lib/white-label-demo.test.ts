import { describe, it, expect } from "vitest";
import {
  haversineKm,
  selectPreviewCameras,
  buildDemoLocations,
  searchDemoLocations,
  resolvePreviewCameras,
  makePreviewSlug,
  parsePreviewOrgName,
  PREVIEW_CAMERA_LIMIT,
} from "./white-label-demo";
import type { PublicEmbedCamera } from "@/lib/embed/public";

function cam(partial: Partial<PublicEmbedCamera> & { id: string }): PublicEmbedCamera {
  return {
    name: partial.id,
    city: "Park City",
    country: "United States",
    lat: 40.6461,
    lng: -111.498,
    streamUrl: null,
    streamType: null,
    snapshotUrl: `https://worldeye.app/api/cctv/frame?id=${partial.id}`,
    attribution: "Utah Department of Transportation via WorldEye",
    source: "UDOT",
    basis: "test",
    ...partial,
  };
}

// Park City, UT ≈ (40.6461, -111.4980); Salt Lake City ≈ (40.7608, -111.8910) ~35 km west.
const PC = { lat: 40.6461, lng: -111.498 };

describe("haversineKm", () => {
  it("is zero for the same point and sane for Park City → Salt Lake City", () => {
    expect(haversineKm(PC, PC)).toBe(0);
    const d = haversineKm(PC, { lat: 40.7608, lng: -111.891 });
    expect(d).toBeGreaterThan(30);
    expect(d).toBeLessThan(40);
  });
});

describe("selectPreviewCameras", () => {
  it("keeps only cameras inside the radius, nearest first, capped", () => {
    const cams = [
      cam({ id: "far", lat: 41.6461, lng: -111.498 }), // ~111 km north — out
      cam({ id: "near", lat: 40.65, lng: -111.5 }),
      cam({ id: "mid", lat: 40.7608, lng: -111.891 }), // ~35 km — in
      cam({ id: "noloc", lat: 0, lng: 0 }), // no real coordinates — never shown
    ];
    const picked = selectPreviewCameras(cams, PC.lat, PC.lng);
    expect(picked.map((c) => c.id)).toEqual(["near", "mid"]);
  });

  it("caps at PREVIEW_CAMERA_LIMIT", () => {
    const cams = Array.from({ length: 20 }, (_, i) =>
      cam({ id: `c${i}`, lat: 40.6461 + i * 0.001, lng: -111.498 }),
    );
    expect(selectPreviewCameras(cams, PC.lat, PC.lng)).toHaveLength(PREVIEW_CAMERA_LIMIT);
  });
});

describe("buildDemoLocations + searchDemoLocations", () => {
  const cams = [
    cam({ id: "pc1" }),
    cam({ id: "pc2", lat: 40.65, lng: -111.49 }),
    cam({ id: "slc1", city: "Salt Lake City", lat: 40.7608, lng: -111.891 }),
    cam({ id: "ghost", city: "", lat: 41, lng: -112 }), // no city — not a location
  ];

  it("groups cities from the eligible set with real counts", () => {
    const locs = buildDemoLocations(cams);
    const pc = locs.find((l) => l.label === "Park City");
    expect(pc?.kind).toBe("city");
    expect(pc?.detail).toBe("United States");
    // 50 km radius around the Park City centroid also reaches the SLC camera.
    expect(pc?.cameraCount).toBe(3);
    expect(locs.some((l) => l.label === "")).toBe(false);
  });

  it("searches by label prefix before detail, and finds nothing for junk", () => {
    const locs = buildDemoLocations(cams);
    expect(searchDemoLocations(locs, "park")[0]?.label).toBe("Park City");
    expect(searchDemoLocations(locs, "united")[0]?.label).toBeDefined();
    expect(searchDemoLocations(locs, "zzzz")).toEqual([]);
    expect(searchDemoLocations(locs, "  ")).toEqual([]);
  });
});

describe("resolvePreviewCameras", () => {
  it("preserves stored order and drops ids no longer eligible", () => {
    const eligible = [cam({ id: "a" }), cam({ id: "b" }), cam({ id: "c" })];
    const resolved = resolvePreviewCameras(eligible, ["c", "gone", "a"]);
    expect(resolved.map((c) => c.id)).toEqual(["c", "a"]);
  });
});

describe("makePreviewSlug + parsePreviewOrgName", () => {
  it("makes 16-char slugs from the unambiguous alphabet, unique per call", () => {
    const a = makePreviewSlug();
    const b = makePreviewSlug();
    expect(a).toMatch(/^[a-z2-9]{16}$/);
    expect(a).not.toBe(b);
  });

  it("normalizes whitespace and bounds the org name", () => {
    expect(parsePreviewOrgName("  Example   Resorts ")).toBe("Example Resorts");
    expect(parsePreviewOrgName("x")).toBeNull();
    expect(parsePreviewOrgName("")).toBeNull();
    expect(parsePreviewOrgName("y".repeat(81))).toBeNull();
    expect(parsePreviewOrgName(null)).toBeNull();
  });
});
