import { describe, it, expect } from "vitest";
import {
  generateShareSlug,
  isShareSlug,
  shareStorageConfigured,
  isOwnShareBlobUrl,
  catalogueIdOf,
  defaultShareTitle,
  MAX_SHARE_FILE_BYTES,
} from "./core";
import { shareVideoPathname, sharePosterPathname, extForMime } from "./paths";

describe("generateShareSlug", () => {
  it("produces url-safe slugs that pass the slug check", () => {
    for (let i = 0; i < 50; i++) {
      const slug = generateShareSlug();
      expect(isShareSlug(slug)).toBe(true);
      expect(slug).not.toMatch(/[/+=]/);
    }
  });

  it("does not repeat", () => {
    const seen = new Set(Array.from({ length: 200 }, () => generateShareSlug()));
    expect(seen.size).toBe(200);
  });
});

describe("shareStorageConfigured", () => {
  it("requires the blob token", () => {
    expect(shareStorageConfigured({})).toBe(false);
    expect(shareStorageConfigured({ BLOB_READ_WRITE_TOKEN: "  " })).toBe(false);
    expect(shareStorageConfigured({ BLOB_READ_WRITE_TOKEN: "vercel_blob_rw_x" })).toBe(true);
  });
});

describe("isOwnShareBlobUrl", () => {
  const good = "https://abc123.public.blob.vercel-storage.com/clip-shares/clip-1/video.webm";
  it("accepts our storage under the clip's own prefix", () => {
    expect(isOwnShareBlobUrl(good, "clip-1")).toBe(true);
    expect(isOwnShareBlobUrl("https://abc123.public.blob.vercel-storage.com/clip-shares/clip-1/poster.jpg", "clip-1")).toBe(true);
  });
  it("rejects other clips, other hosts, and non-urls", () => {
    expect(isOwnShareBlobUrl(good, "clip-2")).toBe(false);
    expect(isOwnShareBlobUrl("https://evil.example.com/clip-shares/clip-1/video.webm", "clip-1")).toBe(false);
    expect(isOwnShareBlobUrl("https://abc123.public.blob.vercel-storage.com/other/clip-1/video.webm", "clip-1")).toBe(false);
    expect(isOwnShareBlobUrl("http://abc123.public.blob.vercel-storage.com/clip-shares/clip-1/video.webm", "clip-1")).toBe(false);
    expect(isOwnShareBlobUrl("not a url", "clip-1")).toBe(false);
    expect(isOwnShareBlobUrl(null, "clip-1")).toBe(false);
    expect(isOwnShareBlobUrl(undefined, "clip-1")).toBe(false);
  });
});

describe("pathnames + ext", () => {
  it("builds the canonical upload paths", () => {
    expect(shareVideoPathname("clip-1", "MP4")).toBe("clip-shares/clip-1/video.mp4");
    expect(shareVideoPathname("clip-1", "weird!!")).toBe("clip-shares/clip-1/video.webm");
    expect(sharePosterPathname("clip-1")).toBe("clip-shares/clip-1/poster.jpg");
  });
  it("maps mime types to extensions", () => {
    expect(extForMime("video/mp4;codecs=avc1")).toBe("mp4");
    expect(extForMime("video/quicktime")).toBe("mov");
    expect(extForMime("video/webm")).toBe("webm");
    expect(extForMime(null)).toBe("webm");
  });
  it("caps hosted shares at 200 MB", () => {
    expect(MAX_SHARE_FILE_BYTES).toBe(200_000_000);
  });
});

describe("catalogueIdOf / defaultShareTitle", () => {
  it("reads the catalogue id out of a saved-camera snapshot", () => {
    expect(catalogueIdOf({ id: "cam-9", name: "X" })).toBe("cam-9");
    expect(catalogueIdOf({ name: "X" })).toBe(null);
    expect(catalogueIdOf(null)).toBe(null);
    expect(catalogueIdOf("nope")).toBe(null);
  });
  it("titles from camera name + date", () => {
    expect(defaultShareTitle("Beach Cam", new Date("2026-10-21T12:00:00Z"))).toContain("Beach Cam");
  });
});
