// Trial-config tests: these pin the pricing decision that guards real
// money — which plans grant a free trial at Stripe checkout and for how
// long. The checkout route builds `trial_period_days` from this config,
// so a regression here would silently start (or stop) charging trials.
import { describe, it, expect } from "vitest";
import { TRIAL_DAYS, trialDaysForPlan } from "./trials";

describe("TRIAL_DAYS", () => {
  it("grants the monthly plan a 10-day free trial", () => {
    expect(TRIAL_DAYS.monthly).toBe(10);
    expect(trialDaysForPlan("monthly")).toBe(10);
  });

  it("grants the weekly plan 3 days and keeps annual at 10 days", () => {
    expect(trialDaysForPlan("weekly")).toBe(3);
    expect(trialDaysForPlan("annual")).toBe(10);
  });

  it("gives enterprise no trial", () => {
    expect(trialDaysForPlan("enterprise")).toBe(0);
  });

  it("grants the ambient plan a 10-day free trial", () => {
    expect(TRIAL_DAYS.ambient).toBe(10);
    expect(trialDaysForPlan("ambient")).toBe(10);
  });

  it("grants the ski plan (Powder Pass) a 10-day free trial, like its $4.99 sibling Ambient", () => {
    expect(TRIAL_DAYS.ski).toBe(10);
    expect(trialDaysForPlan("ski")).toBe(10);
  });

  it("gives unknown plans no trial", () => {
    expect(trialDaysForPlan("bogus")).toBe(0);
    expect(trialDaysForPlan("")).toBe(0);
  });

  it("covers exactly the six sellable plans", () => {
    expect(Object.keys(TRIAL_DAYS).sort()).toEqual([
      "ambient",
      "annual",
      "enterprise",
      "monthly",
      "ski",
      "weekly",
    ]);
  });
});
