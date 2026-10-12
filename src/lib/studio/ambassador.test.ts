// Ambassador application validation tests: the pure input matrix only.
// Submission / decision DB paths are exercised against staging; these
// tests pin what a valid application is.
import { describe, it, expect } from "vitest";
import { validateApplicationInput, AMBASSADOR_PLATFORMS } from "./ambassador";

function validInput(patch: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    platform: "instagram",
    handle: "@worldeye_fan",
    profileUrl: "https://instagram.com/worldeye_fan",
    audience: 42000,
    pitch: "I post live-globe clips weekly.",
    ...patch,
  };
}

describe("validateApplicationInput", () => {
  it("accepts a fully valid application and trims strings", () => {
    const r = validateApplicationInput(validInput({ handle: "  @creator  " }));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.platform).toBe("instagram");
      expect(r.data.handle).toBe("@creator");
      expect(r.data.profileUrl).toBe("https://instagram.com/worldeye_fan");
      expect(r.data.audience).toBe(42000);
      expect(r.data.pitch).toBe("I post live-globe clips weekly.");
    }
  });

  it("accepts every supported platform", () => {
    for (const platform of AMBASSADOR_PLATFORMS) {
      expect(validateApplicationInput(validInput({ platform })).ok).toBe(true);
    }
  });

  it("treats pitch as optional (missing / null / empty → null)", () => {
    const noPitch = validInput();
    delete noPitch.pitch;
    const r1 = validateApplicationInput(noPitch);
    expect(r1.ok).toBe(true);
    if (r1.ok) expect(r1.data.pitch).toBeNull();
    const r2 = validateApplicationInput(validInput({ pitch: null }));
    expect(r2.ok).toBe(true);
    if (r2.ok) expect(r2.data.pitch).toBeNull();
    const r3 = validateApplicationInput(validInput({ pitch: "   " }));
    expect(r3.ok).toBe(true);
    if (r3.ok) expect(r3.data.pitch).toBeNull();
  });

  it("rejects unknown platforms", () => {
    for (const platform of ["facebook", "IG", "", 42, undefined]) {
      const r = validateApplicationInput(validInput({ platform }));
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.errors.join(" ")).toContain("platform");
    }
  });

  it("rejects handles outside 1-100 characters", () => {
    expect(validateApplicationInput(validInput({ handle: "" })).ok).toBe(false);
    expect(validateApplicationInput(validInput({ handle: "   " })).ok).toBe(false);
    expect(validateApplicationInput(validInput({ handle: "x".repeat(101) })).ok).toBe(false);
    expect(validateApplicationInput(validInput({ handle: 42 })).ok).toBe(false);
    expect(validateApplicationInput(validInput({ handle: "x".repeat(100) })).ok).toBe(true);
    expect(validateApplicationInput(validInput({ handle: "x" })).ok).toBe(true);
  });

  it("rejects non-http(s) or malformed profile URLs", () => {
    for (const profileUrl of ["", "not a url", "instagram.com/me", "ftp://example.com/me", 42, undefined]) {
      const r = validateApplicationInput(validInput({ profileUrl }));
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.errors.join(" ")).toContain("profileUrl");
    }
    expect(validateApplicationInput(validInput({ profileUrl: "http://example.com/me" })).ok).toBe(true);
  });

  it("rejects audiences that are not integers in 0..1e9", () => {
    for (const audience of [-1, 1_000_000_001, 1.5, Number.NaN, "42000", undefined, null]) {
      expect(validateApplicationInput(validInput({ audience })).ok).toBe(false);
    }
    expect(validateApplicationInput(validInput({ audience: 0 })).ok).toBe(true);
    expect(validateApplicationInput(validInput({ audience: 1_000_000_000 })).ok).toBe(true);
  });

  it("rejects a pitch over 1000 characters or a non-string pitch", () => {
    expect(validateApplicationInput(validInput({ pitch: "x".repeat(1001) })).ok).toBe(false);
    expect(validateApplicationInput(validInput({ pitch: "x".repeat(1000) })).ok).toBe(true);
    expect(validateApplicationInput(validInput({ pitch: 42 })).ok).toBe(false);
  });

  it("collects multiple errors at once and rejects non-object input", () => {
    const r = validateApplicationInput({ platform: "nope", handle: "", profileUrl: "nope", audience: -5 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.length).toBeGreaterThanOrEqual(4);
    expect(validateApplicationInput(null).ok).toBe(false);
    expect(validateApplicationInput(undefined).ok).toBe(false);
    expect(validateApplicationInput("string").ok).toBe(false);
  });
});
