// Payload pins: one shape for feed/API/embed; rights filtering happens
// in buildCollectionPayload and excluded picks are reported, not dropped.
import { describe, it, expect } from "vitest";
import { buildCollectionPayload, toFeedCamera, type CatalogueRecord } from "./payload";

const ORIGIN = "https://worldeye.app";

const fdotJpg: CatalogueRecord = {
  id: "fdot-1",
  name: "I-95 @ NW 62nd St",
  city: "Miami",
  country: "US",
  source: "FDOT",
  lat: 25.8,
  lng: -80.2,
  feed_url: "https://fdot.example/cam1.jpg",
  stream_type: "jpg",
};
const txdotHls: CatalogueRecord = {
  id: "txdot-9",
  name: "US-59 @ Loop",
  city: "Houston",
  country: "US",
  source: "TxDOT",
  lat: 29.7,
  lng: -95.4,
  stream_url: "https://txdot.example/live.m3u8",
  stream_type: "hls",
};
const windyCam: CatalogueRecord = {
  id: "occ-windy-1",
  name: "Beach cam",
  city: "Nice",
  country: "FR",
  source: "OpenCCTV / windy",
  lat: 43.7,
  lng: 7.27,
  feed_url: "https://windy.example/x.jpg",
  stream_type: "jpg",
};
const linkOnly: CatalogueRecord = {
  id: "fdot-link",
  name: "Link only",
  city: "Tampa",
  country: "US",
  source: "FDOT",
  lat: 28.0,
  lng: -82.4,
  external_url: "https://fdot.example/page",
};

describe("toFeedCamera", () => {
  it("maps a snapshot camera: frame-route snapshot URL, no stream", () => {
    const cam = toFeedCamera(fdotJpg, ORIGIN);
    expect(cam.snapshotUrl).toBe("https://worldeye.app/api/cctv/frame?id=fdot-1");
    expect(cam.streamUrl).toBeNull();
    expect(cam.attribution).toContain("Florida Department of Transportation");
    expect(cam.source).toBe("FDOT");
  });

  it("maps a stream camera: stream URL + type, no snapshot", () => {
    const cam = toFeedCamera(txdotHls, ORIGIN);
    expect(cam.streamUrl).toBe("https://txdot.example/live.m3u8");
    expect(cam.streamType).toBe("hls");
    expect(cam.snapshotUrl).toBeNull();
  });
});

describe("buildCollectionPayload", () => {
  it("includes cleared cameras and reports excluded ones with reasons", () => {
    const records = new Map<string, CatalogueRecord | undefined>([
      ["fdot-1", fdotJpg],
      ["occ-windy-1", windyCam],
      ["fdot-link", linkOnly],
      ["gone-1", undefined],
    ]);
    const { cameras, excluded } = buildCollectionPayload(
      [{ cameraId: "fdot-1" }, { cameraId: "occ-windy-1" }, { cameraId: "fdot-link" }, { cameraId: "gone-1" }],
      records,
      ORIGIN,
    );
    expect(cameras.map((c) => c.id)).toEqual(["fdot-1"]);
    expect(excluded.map((e) => e.id)).toEqual(["occ-windy-1", "fdot-link", "gone-1"]);
    expect(excluded[0].reason).toContain("Windy");
    expect(excluded[1].reason).toContain("no playable stream");
    expect(excluded[2].reason).toContain("no longer in the WorldEye catalogue");
  });

  it("handles an empty collection", () => {
    expect(buildCollectionPayload([], new Map(), ORIGIN)).toEqual({ cameras: [], excluded: [] });
  });
});
