// First-camera assist tests: the offer is only ever as good as the id it
// hands the globe — a malformed showcase entry must degrade to "no
// suggestion", never to a broken open. These pin the sanitizer, the pick,
// and the event contract the homepage listener depends on.
import { describe, it, expect, vi, afterEach } from "vitest";
import {
  OPEN_CAMERA_EVENT,
  parseShowcaseCameras,
  pickFirstCamera,
  firstCameraPlace,
  dispatchOpenCamera,
  fetchFirstCamera,
} from "./first-camera";

describe("parseShowcaseCameras", () => {
  it("keeps well-formed showcase entries in order", () => {
    const out = parseShowcaseCameras({
      category: "featured",
      cameras: [
        { id: "occ-1", name: "Shibuya Crossing", city: "Tokyo", country: "Japan" },
        { id: "faa-22", name: "Birchwood", city: "Anchorage", country: "United States" },
      ],
    });
    expect(out).toEqual([
      { id: "occ-1", name: "Shibuya Crossing", city: "Tokyo", country: "Japan", media: null },
      { id: "faa-22", name: "Birchwood", city: "Anchorage", country: "United States", media: null },
    ]);
  });

  it("coerces numeric ids to strings and blanks to null", () => {
    const out = parseShowcaseCameras({
      cameras: [{ id: 42, name: "  ", city: "", country: undefined }],
    });
    expect(out).toEqual([{ id: "42", name: null, city: null, country: null, media: null }]);
  });

  it("drops entries without a usable id and non-object rows", () => {
    const out = parseShowcaseCameras({
      cameras: [{ name: "No id" }, { id: "   " }, null, "nope", { id: "ok-1" }],
    });
    expect(out).toEqual([{ id: "ok-1", name: null, city: null, country: null, media: null }]);
  });

  it("keeps well-formed media and nulls malformed media", () => {
    const out = parseShowcaseCameras({
      cameras: [
        { id: "m-1", media: { kind: "jpg", url: "https://cam.example.com/a.jpg" } },
        { id: "m-2", media: { kind: "MP4", url: "https://cam.example.com/b.mp4" } },
        { id: "m-3", media: { kind: "webm", url: "https://cam.example.com/c.webm" } },
        { id: "m-4", media: { kind: "jpg", url: "  " } },
        { id: "m-5", media: "https://cam.example.com/e.jpg" },
      ],
    });
    expect(out.map((c) => c.media)).toEqual([
      { kind: "jpg", url: "https://cam.example.com/a.jpg" },
      { kind: "mp4", url: "https://cam.example.com/b.mp4" },
      null,
      null,
      null,
    ]);
  });

  it("returns [] for non-showcase payloads", () => {
    expect(parseShowcaseCameras(null)).toEqual([]);
    expect(parseShowcaseCameras({})).toEqual([]);
    expect(parseShowcaseCameras({ cameras: "nope" })).toEqual([]);
    expect(parseShowcaseCameras([])).toEqual([]);
  });
});

describe("pickFirstCamera / firstCameraPlace", () => {
  it("picks the first entry — the curated order is the ranking", () => {
    const cams = parseShowcaseCameras({
      cameras: [
        { id: "a", city: "Tokyo" },
        { id: "b", city: "Oslo" },
      ],
    });
    expect(pickFirstCamera(cams)?.id).toBe("a");
    expect(pickFirstCamera([])).toBeNull();
  });

  it("labels the place by city, falling back to the camera name", () => {
    expect(firstCameraPlace({ id: "a", name: "Harbor Cam", city: "Oslo", country: null, media: null })).toBe("Oslo");
    expect(firstCameraPlace({ id: "a", name: "Harbor Cam", city: null, country: null, media: null })).toBe("Harbor Cam");
    expect(firstCameraPlace({ id: "a", name: null, city: null, country: null, media: null })).toBeNull();
    expect(firstCameraPlace(null)).toBeNull();
  });
});

describe("dispatchOpenCamera", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns false with no window (SSR / node)", () => {
    expect(dispatchOpenCamera("occ-1")).toBe(false);
    expect(dispatchOpenCamera("")).toBe(false);
  });

  it("dispatches the contracted event with the id in detail", () => {
    const seen: unknown[] = [];
    vi.stubGlobal("window", {
      dispatchEvent: (e: unknown) => {
        seen.push(e);
        return true;
      },
    });
    expect(dispatchOpenCamera("occ-9")).toBe(true);
    expect(seen).toHaveLength(1);
    const ev = seen[0] as CustomEvent;
    expect(ev.type).toBe(OPEN_CAMERA_EVENT);
    expect(ev.detail).toEqual({ id: "occ-9" });
  });
});

describe("fetchFirstCamera", () => {
  it("resolves the first sanitized camera from a good payload", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({ cameras: [{ id: "occ-1", name: "A", city: "Tokyo", country: "Japan" }] }),
    }));
    await expect(fetchFirstCamera(fetchImpl)).resolves.toEqual({
      id: "occ-1",
      name: "A",
      city: "Tokyo",
      country: "Japan",
      media: null,
    });
    expect(fetchImpl).toHaveBeenCalledWith("/api/cctv/showcase");
  });

  it("resolves null on HTTP failure, network failure, and empty showcases", async () => {
    await expect(
      fetchFirstCamera(async () => ({ ok: false, json: async () => ({}) })),
    ).resolves.toBeNull();
    await expect(
      fetchFirstCamera(async () => {
        throw new Error("offline");
      }),
    ).resolves.toBeNull();
    await expect(
      fetchFirstCamera(async () => ({ ok: true, json: async () => ({ cameras: [] }) })),
    ).resolves.toBeNull();
  });
});
