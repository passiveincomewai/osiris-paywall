import { describe, expect, it } from "vitest";
import {
  isDemoPlayable,
  selectLiveWallDemoCameras,
  LIVE_WALL_DEMO_LIMIT,
  type DemoCatalogCamera,
} from "./live-wall-demo";

const hls = (id: string, extra: Partial<DemoCatalogCamera> = {}): DemoCatalogCamera => ({
  id,
  name: `Cam ${id}`,
  city: "Gdańsk",
  country: "Poland",
  source: "test-source",
  stream_url: `https://streams.example/${id}.m3u8`,
  stream_type: "hls",
  ...extra,
});

describe("isDemoPlayable", () => {
  it("accepts HLS and MP4 video records", () => {
    expect(isDemoPlayable(hls("a"))).toBe(true);
    expect(
      isDemoPlayable(hls("b", { stream_type: "mp4", stream_url: "https://x.example/clip.mp4" })),
    ).toBe(true);
  });

  it("rejects snapshot feeds, embeds and YouTube records", () => {
    expect(
      isDemoPlayable(hls("c", { stream_type: "jpg", stream_url: undefined, feed_url: "https://x.example/snap.jpg" })),
    ).toBe(false);
    expect(
      isDemoPlayable(hls("d", { stream_type: "iframe", stream_url: undefined, external_url: "https://operator.example/cam" })),
    ).toBe(false);
    expect(
      isDemoPlayable(hls("e", { stream_url: "https://www.youtube.com/watch?v=abc", external_url: "https://www.youtube.com/watch?v=abc" })),
    ).toBe(false);
  });

  it("rejects a video record with no stream URL", () => {
    expect(isDemoPlayable(hls("f", { stream_url: undefined }))).toBe(false);
    expect(isDemoPlayable(hls("g", { stream_url: "  " }))).toBe(false);
  });
});

describe("selectLiveWallDemoCameras", () => {
  it("puts the curated preferred picks first, in curated order", () => {
    const catalogue = [
      hls("zz-other"),
      hls("pl-nadm-32"),
      hls("pl-nadm-3"),
      hls("pl-nadm-2"),
    ];
    const picked = selectLiveWallDemoCameras(catalogue, 3);
    expect(picked.map((c) => c.id)).toEqual(["pl-nadm-3", "pl-nadm-32", "pl-nadm-2"]);
  });

  it("drops a preferred pick that has rotated out or gone unplayable", () => {
    const catalogue = [
      hls("pl-nadm-3", { stream_type: "jpg", stream_url: undefined, feed_url: "https://x.example/s.jpg" }),
      hls("pl-nadm-32"),
      hls("filler-1"),
    ];
    const picked = selectLiveWallDemoCameras(catalogue, 2);
    expect(picked.map((c) => c.id)).toEqual(["pl-nadm-32", "filler-1"]);
  });

  it("tops up one per source before repeating a source", () => {
    const catalogue = [
      hls("a1", { source: "dot-a" }),
      hls("a2", { source: "dot-a" }),
      hls("b1", { source: "dot-b" }),
      hls("c1", { source: "dot-c" }),
    ];
    const picked = selectLiveWallDemoCameras(catalogue, 3);
    expect(picked.map((c) => c.id)).toEqual(["a1", "b1", "c1"]);
  });

  it("never exceeds the limit and never returns unplayable cameras", () => {
    const catalogue = [
      ...Array.from({ length: 12 }, (_, i) => hls(`cam-${i}`, { source: `s-${i}` })),
      hls("snap", { stream_type: "jpg", stream_url: undefined, feed_url: "https://x.example/s.jpg" }),
    ];
    const picked = selectLiveWallDemoCameras(catalogue);
    expect(picked).toHaveLength(LIVE_WALL_DEMO_LIMIT);
    expect(picked.every((c) => isDemoPlayable(c.cameraData))).toBe(true);
    expect(picked.map((c) => c.id)).not.toContain("snap");
  });

  it("shapes picks as wall tiles with a place group", () => {
    const [tile] = selectLiveWallDemoCameras([hls("pl-nadm-3")], 1);
    expect(tile.name).toBe("Cam pl-nadm-3");
    expect(tile.group).toBe("Gdańsk, Poland");
    expect(tile.cameraData.stream_url).toContain(".m3u8");
  });

  it("returns an empty wall for an empty catalogue", () => {
    expect(selectLiveWallDemoCameras([])).toEqual([]);
  });
});
