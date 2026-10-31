// Ladder pins: the API tier resolves off the owner's real Subscription
// row through the product's own resolvers (plans.ts + plan-tier.ts), so
// the API can never invent a tier the rest of the product wouldn't.
import { describe, it, expect } from "vitest";
import { apiTierForSubscription } from "./limits";

const ENV = {
  STRIPE_ENTERPRISE_PRICE_ID: "price_ent",
  STRIPE_LITE_WEEKLY_PRICE_ID: "price_lite_w",
  STRIPE_LITE_MONTHLY_PRICE_ID: "price_lite_m",
  STRIPE_LITE_ANNUAL_PRICE_ID: "price_lite_a",
  STRIPE_WEEKLY_PRICE_ID: "price_pro_w",
  STRIPE_MONTHLY_PRICE_ID: "price_pro_m",
  STRIPE_ANNUAL_PRICE_ID: "price_pro_a",
  STRIPE_ULTRA_WEEKLY_PRICE_ID: "price_ultra_w",
  STRIPE_ULTRA_MONTHLY_PRICE_ID: "price_ultra_m",
  STRIPE_ULTRA_ANNUAL_PRICE_ID: "price_ultra_a",
  STRIPE_AMBIENT_PRICE_ID: "price_ambient",
  POWDER_PASS_PRICE_ID: "price_ski",
};

const future = () => new Date(Date.now() + 30 * 24 * 3600 * 1000);
const past = () => new Date(Date.now() - 1000);

function sub(stripePriceId: string, extra: Record<string, unknown> = {}) {
  return { status: "active", currentPeriodEnd: future(), stripePriceId, ...extra };
}

describe("apiTierForSubscription", () => {
  it("is free with no subscription", () => {
    expect(apiTierForSubscription(null, ENV)).toBe("free");
    expect(apiTierForSubscription(undefined, ENV)).toBe("free");
  });

  it("is free when the subscription is not live", () => {
    expect(apiTierForSubscription(sub("price_pro_m", { status: "canceled" }), ENV)).toBe("free");
    expect(apiTierForSubscription(sub("price_pro_m", { status: "past_due" }), ENV)).toBe("free");
    expect(apiTierForSubscription(sub("price_pro_m", { currentPeriodEnd: past(), status: "canceled" }), ENV)).toBe("free");
    // Canonical-contract note: subscriptionStatusFromRow (the helper the
    // whole product tiers off) folds on the row's status; a row still
    // marked "active" counts as live even past its period end, exactly
    // as planTierForRow treats it everywhere else.
    expect(apiTierForSubscription(sub("price_pro_m", { currentPeriodEnd: past() }), ENV)).toBe("pro");
  });

  it("maps Lite (any period) to lite", () => {
    expect(apiTierForSubscription(sub("price_lite_w"), ENV)).toBe("lite");
    expect(apiTierForSubscription(sub("price_lite_m"), ENV)).toBe("lite");
    expect(apiTierForSubscription(sub("price_lite_a"), ENV)).toBe("lite");
  });

  it("maps Pro weekly/monthly to pro", () => {
    expect(apiTierForSubscription(sub("price_pro_w"), ENV)).toBe("pro");
    expect(apiTierForSubscription(sub("price_pro_m"), ENV)).toBe("pro");
  });

  it("maps Ultra (any period) to ultra", () => {
    expect(apiTierForSubscription(sub("price_ultra_w"), ENV)).toBe("ultra");
    expect(apiTierForSubscription(sub("price_ultra_m"), ENV)).toBe("ultra");
    expect(apiTierForSubscription(sub("price_ultra_a"), ENV)).toBe("ultra");
  });

  it("maps the Enterprise price to enterprise", () => {
    expect(apiTierForSubscription(sub("price_ent"), ENV)).toBe("enterprise");
  });

  it("gives standalone products (Ambient, Powder Pass) no API tier", () => {
    expect(apiTierForSubscription(sub("price_ambient"), ENV)).toBe("free");
    expect(apiTierForSubscription(sub("price_ski"), ENV)).toBe("free");
  });

  it("ranks Pro Annual by the legacy-VIP cutoff, like the product does", () => {
    // Legacy holder (created before 2026-10-30): the product ranks the
    // annual price "vip" → the ultra rung.
    expect(
      apiTierForSubscription(sub("price_pro_a", { createdAt: new Date("2026-10-01T00:00:00Z") }), ENV),
    ).toBe("ultra");
    // Post-cutoff annual buyer: Pro limits with VIP branding → pro rung.
    expect(
      apiTierForSubscription(sub("price_pro_a", { createdAt: new Date("2026-10-30T12:00:00Z") }), ENV),
    ).toBe("pro");
  });

  it("never strips an unrecognized paying price below pro", () => {
    expect(apiTierForSubscription(sub("price_something_new"), ENV)).toBe("pro");
  });
});
