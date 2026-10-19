// Trial-config tests: these pin the pricing decision that guards real
// money — which plans grant a free trial at Stripe checkout and for how
// long. The checkout route builds `trial_period_days` from this config,
// so a regression here would silently start (or stop) charging trials.
import { describe, it, expect } from "vitest";
import { TRIAL_DAYS, trialDaysForPlan } from "./trials";

describe("TRIAL_DAYS", () => {
  it("grants the monthly plan a 1-day free trial", () => {
    expect(TRIAL_DAYS.monthly).toBe(1);
    expect(trialDaysForPlan("monthly")).toBe(1);
  });

  it("keeps the weekly plan at 1 day and annual at 3 days", () => {
    expect(trialDaysForPlan("weekly")).toBe(1);
    expect(trialDaysForPlan("annual")).toBe(3);
  });

  it("gives enterprise no trial", () => {
    expect(trialDaysForPlan("enterprise")).toBe(0);
  });

  it("gives unknown plans no trial", () => {
    expect(trialDaysForPlan("bogus")).toBe(0);
    expect(trialDaysForPlan("")).toBe(0);
  });

  it("covers exactly the four sellable plans", () => {
    expect(Object.keys(TRIAL_DAYS).sort()).toEqual([
      "annual",
      "enterprise",
      "monthly",
      "weekly",
    ]);
  });
});
