// Service pins — the rights gate is the product:
//  - a camera whose source is NOT redistribution-cleared (Windy) does
//    not exist for the public API: not in search, not in near, and a
//    direct getCamera is null;
//  - a cleared camera with nothing playable is likewise out;
//  - the public shape carries metadata + snapshot + the globe deep
//    link ONLY — the catalogue's raw stream URL never appears.
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { CatalogueRecord } from "@/lib/enterprise/payload";

const mocks = vi.hoisted(() => ({
  catalogue: vi.fn(async () => null as Map<string, CatalogueRecord> | null),
}));

vi.mock("@/lib/enterprise/catalogue", () => ({
  enterpriseCatalogueById: mocks.catalogue,
}));

import {
  eligibleEntries,
  getCamera,
  latestEarthquakes,
  nearEntries,
  resetEligibleCache,
  searchEntries,
  toPublicCamera,
} from "./service";

const ORIGIN = "https://worldeye.app";

const UDOT_STILL: CatalogueRecord = {
  id: "udot-still-1",
  name: "I-15 @ 900 S",
  city: "Salt Lake City",
  country: "United States",
  source: "UDOT",
  lat: 40.75,
  lng: -111.89,
  feed_url: "https://agency.example/still-1.jpg",
  stream_type: "jpg",
};

const UDOT_STREAM: CatalogueRecord = {
  id: "udot-stream-1",
  name: "I-80 @ Parleys Summit",
  city: "Salt Lake City",
  country: "United States",
  source: "UDOT",
  lat: 40.71,
  lng: -111.85,
  stream_url: "https://agency.example/live-1.m3u8",
  stream_type: "hls",
};

const WINDY_CAM: CatalogueRecord = {
  id: "windy-1",
  name: "South Beach",
  city: "Miami",
  country: "United States",
  source: "Windy Webcams",
  lat: 25.79,
  lng: -80.13,
  feed_url: "https://windy.example/still.jpg",
  stream_type: "jpg",
};

const DEAD_CAM: CatalogueRecord = {
  id: "udot-dead-1",
  name: "No feeds at all",
  city: "Provo",
  country: "United States",
  source: "UDOT",
  lat: 40.23,
  lng: -111.66,
};

function fixtureCatalogue() {
  return new Map([
    [UDOT_STILL.id, UDOT_STILL],
    [UDOT_STREAM.id, UDOT_STREAM],
    [WINDY_CAM.id, WINDY_CAM],
    [DEAD_CAM.id, DEAD_CAM],
  ]);
}

beforeEach(() => {
  vi.clearAllMocks();
  resetEligibleCache();
  mocks.catalogue.mockResolvedValue(fixtureCatalogue());
});

describe("eligibleEntries — the rights-eligible subset", () => {
  it("keeps cleared+playable cameras only: Windy and feed-less records are out", async () => {
    const entries = await eligibleEntries();
    expect(entries).not.toBeNull();
    const ids = entries!.map((e) => e.raw.id).sort();
    expect(ids).toEqual(["udot-still-1", "udot-stream-1"]);
  });

  it("answers null (doors 503) when the catalogue itself is unavailable", async () => {
    mocks.catalogue.mockResolvedValue(null);
    await expect(eligibleEntries()).resolves.toBeNull();
  });
});

describe("getCamera", () => {
  it("returns the cleared camera", async () => {
    const cam = await getCamera("udot-still-1", ORIGIN);
    expect(cam?.id).toBe("udot-still-1");
  });

  it("returns null for a non-cleared camera — it does not exist here", async () => {
    await expect(getCamera("windy-1", ORIGIN)).resolves.toBeNull();
  });

  it("returns null for an unknown id", async () => {
    await expect(getCamera("nope", ORIGIN)).resolves.toBeNull();
  });
});

describe("the public shape", () => {
  it("carries metadata + snapshot + watch deep link, and NO stream URL", () => {
    const cam = toPublicCamera(UDOT_STREAM, ORIGIN);
    expect(cam.snapshotUrl).toBeNull(); // stream-only: no still
    expect(cam.watchUrl).toBe(`${ORIGIN}/?camera=${UDOT_STREAM.id}`);
    expect(cam.attribution).toContain("via WorldEye");
    const serialized = JSON.stringify(cam);
    expect(serialized).not.toContain("live-1.m3u8");
    expect(serialized).not.toContain("agency.example");
    expect(cam).not.toHaveProperty("streamUrl");
    expect(cam).not.toHaveProperty("streamType");
  });

  it("gives a snapshot camera the WorldEye frame-route URL", () => {
    const cam = toPublicCamera(UDOT_STILL, ORIGIN);
    expect(cam.snapshotUrl).toBe(`${ORIGIN}/api/cctv/frame?id=${UDOT_STILL.id}`);
  });
});

describe("latestEarthquakes — USGS shaping", () => {
  it("answers null on upstream failure (doors 502, never invent)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("nope", { status: 500 })));
    await expect(latestEarthquakes()).resolves.toBeNull();
    vi.unstubAllGlobals();
  });

  it("shapes GeoJSON features into the API earthquake objects", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          features: [
            {
              id: "us7000test",
              geometry: { coordinates: [-122.5, 37.7, 8.2] },
              properties: {
                mag: 4.6,
                place: "10km S of Somewhere",
                time: 1793400000000,
                url: "https://earthquake.usgs.gov/earthquakes/eventpage/us7000test",
                tsunami: 0,
                type: "earthquake",
                felt: 12,
                alert: null,
              },
            },
          ],
        }),
      ),
    );
    const result = await latestEarthquakes();
    expect(result?.total).toBe(1);
    expect(result?.earthquakes[0]).toMatchObject({
      id: "us7000test",
      lat: 37.7,
      lng: -122.5,
      depth: 8.2,
      magnitude: 4.6,
      time: 1793400000000,
    });
    vi.unstubAllGlobals();
  });
});

describe("searchEntries / nearEntries over the eligible subset", () => {
  it("search never surfaces the excluded camera", async () => {
    const entries = (await eligibleEntries())!;
    const all = searchEntries(entries, { limit: 20, offset: 0 }, ORIGIN);
    expect(all.total).toBe(2);
    expect(all.cameras.map((c) => c.id)).not.toContain("windy-1");
    const beach = searchEntries(entries, { q: "Beach", limit: 20, offset: 0 }, ORIGIN);
    expect(beach.total).toBe(0);
  });

  it("near returns eligible cameras nearest-first with distances", async () => {
    const entries = (await eligibleEntries())!;
    const result = nearEntries(entries, { lat: 40.75, lng: -111.89 }, 50, 20, ORIGIN);
    expect(result.total).toBe(2);
    expect(result.cameras[0].id).toBe("udot-still-1");
    expect(result.cameras[0].distanceKm).toBe(0);
    expect(result.cameras[1].distanceKm).toBeGreaterThan(0);
  });
});
