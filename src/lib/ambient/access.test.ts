import { describe, it, expect } from "vitest";
import {
  ambientAccessForRow,
  ambientPriceId,
  sessionHasAmbientAccess,
} from "./access";
import { planTierForPriceId } from "@/lib/plan-tier";

const AMBIENT = "price_1UUxUnGfHuTnzrlHH0pNYhJU";
const env = {
  STRIPE_WEEKLY_PRICE_ID: "price_weekly",
  STRIPE_MONTHLY_PRICE_ID: "price_monthly",
  STRIPE_ANNUAL_PRICE_ID: "price_annual",
  STRIPE_ENTERPRISE_PRICE_ID: "price_enterprise",
};
const future = new Date(Date.now() + 86_400_000);
const past = new Date(Date.now() - 86_400_000);

const row = (over: Partial<{ status: string; currentPeriodEnd: Date; stripePriceId: string }>) => ({
  status: "active",
  currentPeriodEnd: future,
  stripePriceId: AMBIENT,
  ...over,
});

describe("ambientPriceId", () => {
  it("falls back to the owner's live price id", () => {
    expect(ambientPriceId({})).toBe(AMBIENT);
  });
  it("lets the env var win", () => {
    expect(ambientPriceId({ STRIPE_AMBIENT_PRICE_ID: "price_test" })).toBe("price_test");
  });
});

describe("planTierForPriceId — the Ambient price is not a tier", () => {
  it("maps the Ambient price to free, never pro", () => {
    expect(planTierForPriceId(AMBIENT, env)).toBe("free");
  });
  it("still maps the tier prices as before", () => {
    expect(planTierForPriceId("price_monthly", env)).toBe("pro");
    expect(planTierForPriceId("price_annual", env)).toBe("vip");
    expect(planTierForPriceId("price_enterprise", env)).toBe("vip");
  });
});

describe("ambientAccessForRow", () => {
  it("grants access for an active Ambient subscription", () => {
    expect(ambientAccessForRow(row({}), env)).toBe(true);
    expect(ambientAccessForRow(row({ status: "trialing" }), env)).toBe(true);
  });

  it("grants access for any Pro/VIP price (Pro bypasses)", () => {
    expect(ambientAccessForRow(row({ stripePriceId: "price_monthly" }), env)).toBe(true);
    expect(ambientAccessForRow(row({ stripePriceId: "price_annual" }), env)).toBe(true);
    expect(ambientAccessForRow(row({ stripePriceId: "price_weekly" }), env)).toBe(true);
  });

  it("denies ended trials, cancelled, past-due and absent rows", () => {
    // A trialing row whose period has run out folds away from
    // "active" (lib/subscription-status) — the trial is over.
    expect(
      ambientAccessForRow(row({ status: "trialing", currentPeriodEnd: past }), env),
    ).toBe(false);
    expect(ambientAccessForRow(row({ status: "canceled" }), env)).toBe(false);
    expect(ambientAccessForRow(row({ status: "past_due" }), env)).toBe(false);
    expect(ambientAccessForRow(null, env)).toBe(false);
    expect(ambientAccessForRow(undefined, env)).toBe(false);
  });
});

describe("sessionHasAmbientAccess", () => {
  it("reads the explicit claim first", () => {
    expect(sessionHasAmbientAccess({ user: { ambientAccess: true } })).toBe(true);
  });
  it("falls back to tier, then to active status, for older sessions", () => {
    expect(sessionHasAmbientAccess({ user: { planTier: "vip" } })).toBe(true);
    expect(sessionHasAmbientAccess({ user: { planTier: "pro" } })).toBe(true);
    expect(sessionHasAmbientAccess({ user: { subscriptionStatus: "active" } })).toBe(true);
  });
  it("denies anonymous and free sessions", () => {
    expect(sessionHasAmbientAccess(null)).toBe(false);
    expect(sessionHasAmbientAccess({ user: { planTier: "free", subscriptionStatus: "none" } })).toBe(false);
  });
});
