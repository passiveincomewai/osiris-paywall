import { describe, it, expect } from "vitest";
import { buildViewUrl, parseGlobeUrl, sanitizeLayers } from "./views";

describe("sanitizeLayers", () => {
  it("keeps known keys, dedupes, drops unknown keys", () => {
    expect(sanitizeLayers(["fires", "bogus_layer", "fires", "cctv"])).toEqual(["fires", "cctv"]);
    expect(sanitizeLayers("earthquakes, hurricanes ,nope")).toEqual(["earthquakes", "hurricanes"]);
    expect(sanitizeLayers(undefined)).toEqual([]);
    expect(sanitizeLayers(42)).toEqual([]);
  });
});

describe("buildViewUrl", () => {
  it("builds the globe's own URL contract", () => {
    expect(buildViewUrl({ layers: "fires,hurricanes" })).toBe("/?layers=fires%2Churricanes");
    expect(buildViewUrl({ layers: "cctv", cameraId: "occ-123" })).toBe(
      "/?layers=cctv&camera=occ-123",
    );
    expect(buildViewUrl({ layers: "", cameraId: "faa-9" })).toBe("/?camera=faa-9");
    expect(buildViewUrl({ layers: "" })).toBe("/");
  });
  it("round-trips through parseGlobeUrl", () => {
    const url = buildViewUrl({ layers: "fires,weather", cameraId: "occ-7" });
    expect(parseGlobeUrl(`https://worldeye.app${url}`)).toEqual({
      layers: ["fires", "weather"],
      cameraId: "occ-7",
    });
  });
});

describe("parseGlobeUrl", () => {
  it("reads layers + camera out of a full URL or a bare query string", () => {
    expect(parseGlobeUrl("https://worldeye.app/?layers=cctv,flights&camera=abc")).toEqual({
      layers: ["cctv", "flights"],
      cameraId: "abc",
    });
    expect(parseGlobeUrl("?layers=earthquakes")).toEqual({ layers: ["earthquakes"], cameraId: null });
    expect(parseGlobeUrl("layers=fires")).toEqual({ layers: ["fires"], cameraId: null });
  });
  it("returns null when there is nothing restorable", () => {
    expect(parseGlobeUrl("https://worldeye.app/")).toBeNull();
    expect(parseGlobeUrl("https://worldeye.app/?utm_source=x")).toBeNull();
    expect(parseGlobeUrl("")).toBeNull();
    expect(parseGlobeUrl("not a url at all :::")).toBeNull();
  });
  it("filters unknown layer keys out of a pasted URL", () => {
    expect(parseGlobeUrl("https://worldeye.app/?layers=fires,evil_key")).toEqual({
      layers: ["fires"],
      cameraId: null,
    });
  });
});
