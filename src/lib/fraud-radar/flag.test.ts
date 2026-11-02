import { describe, it, expect } from "vitest";
import { fraudRadarEnabled, fraudRadarPublicPaths } from "./flag";

/**
 * Isolation tests (Phase 0 AUDIT §14.3 / §13.3) — written before the
 * routes they protect. The kill-switch contract: with
 * FRAUD_RADAR_ENABLED off, Fraud Radar contributes nothing anywhere —
 * no public paths for the sitemap to pick up, and every route in the
 * family gates on fraudRadarEnabled() and 404s.
 */
describe("fraudRadarEnabled — the kill switch", () => {
  it("is OFF by default and for anything but an explicit affirmative", () => {
    expect(fraudRadarEnabled({})).toBe(false);
    expect(fraudRadarEnabled({ FRAUD_RADAR_ENABLED: "0" })).toBe(false);
    expect(fraudRadarEnabled({ FRAUD_RADAR_ENABLED: "false" })).toBe(false);
    expect(fraudRadarEnabled({ FRAUD_RADAR_ENABLED: "" })).toBe(false);
    expect(fraudRadarEnabled({ FRAUD_RADAR_ENABLED: "enabled" })).toBe(false);
  });

  it("turns on for 1/true/on/yes (case-insensitive, trimmed)", () => {
    for (const v of ["1", "true", "TRUE", "on", "yes", " 1 "]) {
      expect(fraudRadarEnabled({ FRAUD_RADAR_ENABLED: v })).toBe(true);
    }
  });
});

describe("fraudRadarPublicPaths — sitemap/nav isolation", () => {
  it("contributes NO public paths while the flag is off", () => {
    expect(fraudRadarPublicPaths({})).toEqual([]);
    expect(fraudRadarPublicPaths({ FRAUD_RADAR_ENABLED: "0" })).toEqual([]);
  });

  it("exposes exactly the public shell path once enabled", () => {
    expect(fraudRadarPublicPaths({ FRAUD_RADAR_ENABLED: "1" })).toEqual([
      "/fraud-radar",
      "/fraud-radar/healthcare",
      "/fraud-radar/healthcare/providers",
      "/fraud-radar/healthcare/hcpcs",
      "/fraud-radar/care",
      "/fraud-radar/care/medicare",
      "/fraud-radar/care/hcpcs",
      "/fraud-radar/care/hospice",
      "/fraud-radar/care/home-health",
      "/fraud-radar/grants",
      "/fraud-radar/grants/recipients",
      "/fraud-radar/grants/aln",
      "/fraud-radar/signals",
      "/fraud-radar/signals/methods",
      "/fraud-radar/contracts",
      "/fraud-radar/contracts/naics",
      "/fraud-radar/contracts/psc",
      "/fraud-radar/geo",
    ]);
  });
});
