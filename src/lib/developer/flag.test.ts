// Flag pins: the public API is dark unless PUBLIC_API_ENABLED carries
// an explicit affirmative value, and a dark platform contributes no
// public paths (sitemap isolation, mirroring the Fraud Radar rule).
import { describe, it, expect } from "vitest";
import { developerPublicPaths, publicApiEnabled } from "./flag";

describe("publicApiEnabled", () => {
  it("is off when unset or empty", () => {
    expect(publicApiEnabled({})).toBe(false);
    expect(publicApiEnabled({ PUBLIC_API_ENABLED: "" })).toBe(false);
    expect(publicApiEnabled({ PUBLIC_API_ENABLED: "  " })).toBe(false);
  });

  it("is off for non-affirmative values", () => {
    for (const v of ["0", "false", "off", "no", "enabled", "2"]) {
      expect(publicApiEnabled({ PUBLIC_API_ENABLED: v })).toBe(false);
    }
  });

  it("is on for explicit affirmative values, case/space-insensitive", () => {
    for (const v of ["1", "true", "on", "yes", " TRUE ", "Yes"]) {
      expect(publicApiEnabled({ PUBLIC_API_ENABLED: v })).toBe(true);
    }
  });
});

describe("developerPublicPaths", () => {
  it("contributes nothing while dark", () => {
    expect(developerPublicPaths({})).toEqual([]);
    expect(developerPublicPaths({ PUBLIC_API_ENABLED: "0" })).toEqual([]);
  });

  it("contributes exactly /developers when enabled", () => {
    expect(developerPublicPaths({ PUBLIC_API_ENABLED: "1" })).toEqual(["/developers"]);
  });
});
