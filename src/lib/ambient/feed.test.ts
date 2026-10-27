import { describe, it, expect } from "vitest";
import { selectAmbientScenes, type AmbientFeedCamera } from "./feed";

const cam = (over: Partial<AmbientFeedCamera>): AmbientFeedCamera => ({
  id: "x",
  name: "Cam",
  city: "",
  country: "",
  source: "",
  stream_type: "hls",
  stream_url: "https://example.com/stream.m3u8",
  ...over,
});

// Deterministic rng: always picks the last swap candidate.
const rng = () => 0.999999;

describe("selectAmbientScenes", () => {
  it("returns spec-shaped scenes with the direct source URL", () => {
    const scenes = selectAmbientScenes({
      cameras: [cam({ id: "a", name: "Shibuya Crossing", city: "Tokyo", country: "Japan" })],
      mood: "all",
      count: 10,
      rng,
    });
    expect(scenes).toHaveLength(1);
    expect(scenes[0]).toMatchObject({
      id: "a",
      name: "Shibuya Crossing",
      city: "Tokyo",
      country: "Japan",
      streamUrl: "https://example.com/stream.m3u8",
      streamType: "hls",
      media: { kind: "hls", url: "https://example.com/stream.m3u8" },
    });
  });

  it("dedupes by id and drops cameras the player cannot play", () => {
    const scenes = selectAmbientScenes({
      cameras: [
        cam({ id: "a" }),
        cam({ id: "a" }),
        cam({ id: "yt", stream_type: "iframe", stream_url: "https://youtube.com/embed/x" }),
        cam({ id: "nourl", stream_type: "hls", stream_url: "" }),
      ],
      mood: "all",
      count: 10,
      rng,
    });
    expect(scenes.map((s) => s.id)).toEqual(["a"]);
  });

  it("prefers video kinds over jpg snapshots", () => {
    const scenes = selectAmbientScenes({
      cameras: [
        cam({ id: "jpg1", stream_type: "jpg", stream_url: "", feed_url: "https://example.com/a.jpg" }),
        cam({ id: "hls1" }),
        cam({ id: "jpg2", stream_type: "jpg", stream_url: "", feed_url: "https://example.com/b.jpg" }),
      ],
      mood: "all",
      count: 2,
      rng,
    });
    expect(scenes[0].id).toBe("hls1");
  });

  it("applies the mood filter before sampling", () => {
    const scenes = selectAmbientScenes({
      cameras: [
        cam({ id: "sea", city: "Seattle" }),
        cam({ id: "phx", city: "Phoenix", name: "Plaza" }),
      ],
      mood: "rainy-cities",
      count: 10,
      rng,
    });
    expect(scenes.map((s) => s.id)).toEqual(["sea"]);
  });

  it("videoOnly excludes jpg scenes (relay mode)", () => {
    const scenes = selectAmbientScenes({
      cameras: [
        cam({ id: "jpg1", stream_type: "jpg", stream_url: "", feed_url: "https://example.com/a.jpg" }),
        cam({ id: "hls1" }),
      ],
      mood: "all",
      count: 10,
      rng,
      videoOnly: true,
    });
    expect(scenes.map((s) => s.id)).toEqual(["hls1"]);
  });

  it("respects the count cap", () => {
    const many = Array.from({ length: 30 }, (_, i) => cam({ id: `c${i}` }));
    expect(selectAmbientScenes({ cameras: many, mood: "all", count: 5, rng })).toHaveLength(5);
    expect(selectAmbientScenes({ cameras: many, mood: "all", count: 0, rng })).toHaveLength(0);
  });
});
