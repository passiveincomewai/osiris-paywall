import { describe, it, expect } from "vitest";
import {
  previewKind,
  snapshotUrl,
  catalogueIdOf,
  globeHref,
  mergeWallSelection,
  MULTI_SELECTION_KEY,
} from "./dashboard";

describe("previewKind", () => {
  it("classifies jpg snapshot feeds as snapshots", () => {
    expect(previewKind({ stream_type: "jpg", feed_url: "https://cam.example/snap.jpg" })).toBe("snapshot");
    expect(previewKind({ stream_type: "jpg", stream_url: "https://cam.example/snap.jpg" })).toBe("snapshot");
  });

  it("classifies HLS and video streams as streams", () => {
    expect(previewKind({ stream_type: "hls", stream_url: "https://cam.example/live.m3u8" })).toBe("stream");
    expect(previewKind({ stream_url: "https://cam.example/live.m3u8" })).toBe("stream");
    expect(previewKind({ stream_type: "mp4", stream_url: "https://cam.example/v.mp4" })).toBe("stream");
  });

  it("never treats YouTube embeds as recordable streams", () => {
    expect(previewKind({ stream_url: "https://www.youtube.com/embed/abc" })).toBe("none");
    expect(previewKind({ external_url: "https://youtu.be/abc", stream_url: "https://x.example/v.mp4", stream_type: "mp4" })).toBe("none");
  });

  it("falls back to a still when only a feed image exists", () => {
    expect(previewKind({ feed_url: "https://cam.example/still.jpg" })).toBe("snapshot");
  });

  it("returns none for empty or info-only data", () => {
    expect(previewKind(null)).toBe("none");
    expect(previewKind({})).toBe("none");
    expect(previewKind({ name: "Somewhere" })).toBe("none");
  });
});

describe("snapshotUrl", () => {
  it("prefers feed_url, then stream_url", () => {
    expect(snapshotUrl({ feed_url: "https://a/f.jpg", stream_url: "https://a/s.jpg" })).toBe("https://a/f.jpg");
    expect(snapshotUrl({ stream_url: "https://a/s.jpg" })).toBe("https://a/s.jpg");
    expect(snapshotUrl({})).toBeNull();
  });
});

describe("globeHref / catalogueIdOf", () => {
  it("deep-links cameras that carry a catalogue id", () => {
    expect(catalogueIdOf({ id: "cam-42" })).toBe("cam-42");
    expect(catalogueIdOf({ id: 42 })).toBe("42");
    expect(globeHref({ id: "cam 42/x" })).toBe("/?camera=cam%2042%2Fx");
  });

  it("opens the plain globe when no id was snapshotted", () => {
    expect(catalogueIdOf({ lat: 40.7, lng: -111.9 })).toBeNull();
    expect(globeHref({ lat: 40.7, lng: -111.9 })).toBe("/");
    expect(globeHref(null)).toBe("/");
  });
});

describe("mergeWallSelection", () => {
  it("puts the chosen camera first and de-duplicates", () => {
    expect(mergeWallSelection(["a", "b"], "c")).toEqual(["c", "a", "b"]);
    expect(mergeWallSelection(["a", "b"], "b")).toEqual(["b", "a"]);
  });

  it("tolerates missing or corrupt stored values", () => {
    expect(mergeWallSelection(null, "x")).toEqual(["x"]);
    expect(mergeWallSelection("junk", "x")).toEqual(["x"]);
    expect(mergeWallSelection([1, null, "a", ""], "x")).toEqual(["x", "a"]);
  });

  it("uses the multi-record wall's own storage key", () => {
    expect(MULTI_SELECTION_KEY).toBe("we_rec_multi_sel");
  });
});
