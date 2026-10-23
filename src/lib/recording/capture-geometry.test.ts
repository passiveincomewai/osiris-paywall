import { describe, expect, it } from "vitest";
import {
  RECORDING_MAX_HEIGHT,
  RECORDING_MAX_WIDTH,
  RECORDING_PUMP_FPS,
  fitWithin,
} from "./capture-geometry";

describe("fitWithin", () => {
  it("caps a 1080p frame at 720p, preserving aspect", () => {
    expect(fitWithin(1920, 1080)).toEqual({ width: 1280, height: 720 });
  });

  it("caps a 4K frame at the same box", () => {
    expect(fitWithin(3840, 2160)).toEqual({ width: 1280, height: 720 });
  });

  it("never upscales a smaller frame", () => {
    expect(fitWithin(640, 360)).toEqual({ width: 640, height: 360 });
  });

  it("fits a portrait frame by height", () => {
    const s = fitWithin(720, 1280);
    expect(s.height).toBe(720);
    expect(s.width).toBe(405);
  });

  it("fits a wide-but-short frame by width", () => {
    const s = fitWithin(2560, 720);
    expect(s.width).toBe(1280);
    expect(s.height).toBe(360);
  });

  it("falls back to the cap box for unknown dimensions", () => {
    expect(fitWithin(0, 0)).toEqual({ width: RECORDING_MAX_WIDTH, height: RECORDING_MAX_HEIGHT });
    expect(fitWithin(Number.NaN, 100)).toEqual({
      width: RECORDING_MAX_WIDTH,
      height: RECORDING_MAX_HEIGHT,
    });
  });

  it("honours explicit caps (the stills path shares the box)", () => {
    expect(fitWithin(1920, 1080, 1280, 720)).toEqual({ width: 1280, height: 720 });
  });
});

describe("recording shape constants", () => {
  it("states the sampled shape recordings actually have", () => {
    expect(RECORDING_MAX_WIDTH).toBe(1280);
    expect(RECORDING_MAX_HEIGHT).toBe(720);
    expect(RECORDING_PUMP_FPS).toBe(10);
  });
});
