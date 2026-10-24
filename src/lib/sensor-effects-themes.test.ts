import { describe, expect, it } from "vitest";
import {
  ACCOUNT_GATED_SENSOR_MODES,
  normalizeSensorEffect,
  sensorFilterCss,
  sensorModeNeedsAccount,
  SENSOR_EFFECT_OPTIONS,
} from "./sensor-effects";

/**
 * Wave 2 F15 — the exclusive themes ride the existing sensor-effect
 * plumbing: "Night Vision" is the pre-existing night-vision mode and
 * "Tactical Dark" is the new tactical-dark mode. Both are free-account
 * features; every other mode stays open to everyone.
 */
describe("exclusive map themes (F15)", () => {
  it("offers Tactical Dark and Night Vision in the options list", () => {
    const modes = SENSOR_EFFECT_OPTIONS.map((o) => o.mode);
    expect(modes).toContain("tactical-dark");
    expect(modes).toContain("night-vision");
    expect(SENSOR_EFFECT_OPTIONS.find((o) => o.mode === "tactical-dark")?.label).toBe("Tactical Dark");
    expect(SENSOR_EFFECT_OPTIONS.find((o) => o.mode === "night-vision")?.label).toBe("Night Vision");
  });

  it("gates exactly the two exclusive themes", () => {
    expect([...ACCOUNT_GATED_SENSOR_MODES].sort()).toEqual(["night-vision", "tactical-dark"]);
    expect(sensorModeNeedsAccount("tactical-dark")).toBe(true);
    expect(sensorModeNeedsAccount("night-vision")).toBe(true);
    expect(sensorModeNeedsAccount("off")).toBe(false);
    expect(sensorModeNeedsAccount("thermal")).toBe(false);
    expect(sensorModeNeedsAccount("cinematic-dark")).toBe(false);
  });

  it("tactical-dark produces a real (non-empty) filter that is a no-op at intensity 0", () => {
    const css = sensorFilterCss({ mode: "tactical-dark", intensity: 1 });
    expect(css.length).toBeGreaterThan(0);
    expect(css).toContain("brightness(0.88)");
    const zero = sensorFilterCss({ mode: "tactical-dark", intensity: 0 });
    expect(zero).toContain("brightness(1)");
    expect(zero).toContain("saturate(1)");
  });

  it("a persisted tactical-dark state survives normalization (so the page can gate it)", () => {
    expect(normalizeSensorEffect({ mode: "tactical-dark", intensity: 0.7 })).toEqual({
      mode: "tactical-dark",
      intensity: 0.7,
    });
  });
});
