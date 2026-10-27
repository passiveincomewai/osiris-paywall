import { describe, expect, it } from "vitest";
import type { CatalogueRecord } from "@/lib/enterprise/payload";
import {
  buildEmbedSnippet,
  embedSizePreset,
  embedSourceSummaries,
  filterEmbedCameras,
  publicEmbedUrl,
  toPublicEmbedCamera,
  watchOnWorldEyeUrl,
  type PublicEmbedCamera,
} from "./public";

const ORIGIN = "https://worldeye.app";

/** A snapshot camera record in the cctv catalogue's shape. */
function record(over: Partial<CatalogueRecord>): CatalogueRecord {
  return {
    id: "cam-1",
    name: "I-80 at Parleys Summit",
    city: "Park City",
    country: "United States",
    source: "UDOT",
    lat: 40.6,
    lng: -111.5,
    feed_url: "https://udot.example/cam1.jpg",
    stream_type: "jpg",
    ...over,
  };
}

describe("public embed eligibility (the rights registry decides)", () => {
  it("a direct-cleared agency camera with a snapshot is embeddable", () => {
    const cam = toPublicEmbedCamera(record({}), ORIGIN);
    expect(cam).not.toBeNull();
    expect(cam!.snapshotUrl).toBe(`${ORIGIN}/api/cctv/frame?id=cam-1`);
    expect(cam!.attribution).toBe(
      "Utah Department of Transportation via WorldEye",
    );
    expect(cam!.basis).toContain("CLEAR");
  });

  it("a cleared OpenCCTV family camera is embeddable", () => {
    const cam = toPublicEmbedCamera(
      record({ source: "OpenCCTV / alberta" }),
      ORIGIN,
    );
    expect(cam).not.toBeNull();
    expect(cam!.attribution).toContain("Alberta 511");
  });

  it("a cleared camera with only an HLS stream is embeddable", () => {
    const cam = toPublicEmbedCamera(
      record({
        feed_url: undefined,
        stream_url: "https://udot.example/cam1.m3u8",
        stream_type: "hls",
      }),
      ORIGIN,
    );
    expect(cam).not.toBeNull();
    expect(cam!.streamUrl).toBe("https://udot.example/cam1.m3u8");
    expect(cam!.snapshotUrl).toBeNull();
  });

  it("Windy is never embeddable, under any label", () => {
    expect(
      toPublicEmbedCamera(record({ source: "OpenCCTV / windy" }), ORIGIN),
    ).toBeNull();
    expect(
      toPublicEmbedCamera(record({ source: "Windy Webcams" }), ORIGIN),
    ).toBeNull();
  });

  it("YouTube broadcasts are never embeddable", () => {
    expect(toPublicEmbedCamera(record({ source: "YouTube" }), ORIGIN)).toBeNull();
    expect(
      toPublicEmbedCamera(record({ source: "YouTube Live" }), ORIGIN),
    ).toBeNull();
  });

  it("a conditional OpenCCTV family is held by default", () => {
    expect(
      toPublicEmbedCamera(record({ source: "OpenCCTV / twipcam" }), ORIGIN),
    ).toBeNull();
  });

  it("an excluded aggregator is not embeddable", () => {
    expect(
      toPublicEmbedCamera(record({ source: "SkylineWebcams" }), ORIGIN),
    ).toBeNull();
  });

  it("an unreviewed source is excluded by default", () => {
    expect(
      toPublicEmbedCamera(record({ source: "Some Random Webcam Blog" }), ORIGIN),
    ).toBeNull();
    expect(toPublicEmbedCamera(record({ source: undefined }), ORIGIN)).toBeNull();
  });

  it("a cleared source with nothing playable is not embeddable", () => {
    const cam = toPublicEmbedCamera(
      record({
        feed_url: undefined,
        stream_url: undefined,
        stream_type: undefined,
        external_url: "https://example.com/watch-cam",
      }),
      ORIGIN,
    );
    expect(cam).toBeNull();
  });
});

describe("embed URLs", () => {
  it("point at the production origin and encode the id", () => {
    expect(publicEmbedUrl("a/b c")).toBe(
      "https://worldeye.app/embed/camera/a%2Fb%20c",
    );
    expect(watchOnWorldEyeUrl("cam-1")).toBe(
      "https://worldeye.app/?camera=cam-1",
    );
  });
});

describe("buildEmbedSnippet", () => {
  const url = "https://worldeye.app/embed/camera/cam-1";

  it("defaults to the medium 640×360 iframe", () => {
    const s = buildEmbedSnippet({ embedUrl: url, name: "Parleys Summit" });
    expect(s).toContain(`src="${url}"`);
    expect(s).toContain('width="640"');
    expect(s).toContain('height="360"');
    expect(s).toContain("allowfullscreen");
    expect(s).toContain('loading="lazy"');
    expect(s).toContain('title="Parleys Summit — live camera via WorldEye"');
  });

  it("honours the size presets", () => {
    expect(buildEmbedSnippet({ embedUrl: url, name: "X", sizeId: "large" })).toContain('width="800"');
    expect(buildEmbedSnippet({ embedUrl: url, name: "X", sizeId: "large" })).toContain('height="450"');
    expect(buildEmbedSnippet({ embedUrl: url, name: "X", sizeId: "small" })).toContain('width="480"');
    expect(buildEmbedSnippet({ embedUrl: url, name: "X", sizeId: "compact" })).toContain('height="225"');
    const responsive = buildEmbedSnippet({ embedUrl: url, name: "X", sizeId: "responsive" });
    expect(responsive).toContain('width="100%"');
    expect(responsive).toContain("aspect-ratio:16/9");
    expect(responsive).not.toContain("height=");
  });

  it("an unknown size id falls back to the default preset", () => {
    expect(embedSizePreset("nope").id).toBe("medium");
    expect(buildEmbedSnippet({ embedUrl: url, name: "X", sizeId: "nope" })).toContain('width="640"');
  });

  it("escapes the camera name in the title attribute", () => {
    const s = buildEmbedSnippet({ embedUrl: url, name: 'A "quoted" & <bold> cam' });
    expect(s).toContain('title="A &quot;quoted&quot; &amp; &lt;bold&gt; cam — live camera via WorldEye"');
    expect(s).not.toContain('"quoted"');
  });
});

function cam(over: Partial<PublicEmbedCamera>): PublicEmbedCamera {
  return {
    id: "x",
    name: "Cam",
    city: "Park City",
    country: "United States",
    lat: 40.6,
    lng: -111.5,
    source: "UDOT",
    streamUrl: null,
    streamType: null,
    snapshotUrl: "https://worldeye.app/api/cctv/frame?id=x",
    attribution: "Utah Department of Transportation via WorldEye",
    basis: "agency (source directory)",
    ...over,
  };
}

const CAMERAS: PublicEmbedCamera[] = [
  cam({ id: "a", name: "I-80 at Parleys Summit", source: "UDOT" }),
  cam({ id: "b", name: "Daytona Beach", city: "Daytona Beach", source: "FDOT", attribution: "Florida Department of Transportation via WorldEye" }),
  cam({ id: "c", name: "SR-210 at Alta", city: "Alta", source: "UDOT" }),
];

describe("filterEmbedCameras", () => {
  it("matches free text across name/city/country/source, case-insensitive", () => {
    expect(filterEmbedCameras(CAMERAS, "alta", "").map((c) => c.id)).toEqual(["c"]);
    expect(filterEmbedCameras(CAMERAS, "FDOT", "").map((c) => c.id)).toEqual(["b"]);
    expect(filterEmbedCameras(CAMERAS, "park city", "").map((c) => c.id)).toEqual(["a"]);
  });

  it("filters by exact source label", () => {
    expect(filterEmbedCameras(CAMERAS, "", "UDOT").map((c) => c.id)).toEqual(["a", "c"]);
    expect(filterEmbedCameras(CAMERAS, "alta", "FDOT")).toEqual([]);
  });

  it("empty query + empty source returns everything", () => {
    expect(filterEmbedCameras(CAMERAS, "  ", "")).toHaveLength(3);
  });
});

describe("embedSourceSummaries", () => {
  it("groups by source, counts, and strips the WorldEye suffix from upstream", () => {
    expect(embedSourceSummaries(CAMERAS)).toEqual([
      { source: "UDOT", upstream: "Utah Department of Transportation", count: 2 },
      { source: "FDOT", upstream: "Florida Department of Transportation", count: 1 },
    ]);
  });
});
