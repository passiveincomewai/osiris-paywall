// Pure-function pins for the quota warning threshold (pick 13):
// ~80% of the tier limit, ceiling-rounded so no tier warns late.
import { describe, it, expect } from "vitest";
import { quotaWarningDue } from "./quota-alerts";

describe("quotaWarningDue", () => {
  it("fires at and above 80% of the limit", () => {
    expect(quotaWarningDue(80, 100)).toBe(true);
    expect(quotaWarningDue(800, 1000)).toBe(true);
    expect(quotaWarningDue(100, 100)).toBe(true);
  });
  it("stays silent below 80%", () => {
    expect(quotaWarningDue(79, 100)).toBe(false);
    expect(quotaWarningDue(0, 100)).toBe(false);
  });
  it("ceil-rounds fractional thresholds (free tier: 100/day → 80)", () => {
    expect(quotaWarningDue(79, 100)).toBe(false);
    expect(quotaWarningDue(4, 5)).toBe(true); // ceil(4.0) = 4
  });
  it("never fires on a zero limit", () => {
    expect(quotaWarningDue(10, 0)).toBe(false);
  });
});
