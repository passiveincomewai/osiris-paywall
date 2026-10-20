import { describe, it, expect, vi } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn(async () => null) }));
vi.mock("@/lib/db", () => ({ db: { subscription: { findUnique: vi.fn() } } }));

import { tierFromSubscription } from "./tier";

describe("tierFromSubscription — annual is VIP", () => {
  const env = {
    STRIPE_WEEKLY_PRICE_ID: "price_weekly",
    STRIPE_MONTHLY_PRICE_ID: "price_monthly",
    STRIPE_ANNUAL_PRICE_ID: "price_annual",
    STRIPE_ENTERPRISE_PRICE_ID: "price_ent",
  };
  const now = new Date("2026-10-20T12:00:00Z");
  const future = new Date("2026-11-20T12:00:00Z");
  const past = new Date("2026-10-01T12:00:00Z");
  const sub = (over: Partial<{ status: string; currentPeriodEnd: Date; stripePriceId: string }>) => ({
    status: "active",
    currentPeriodEnd: future,
    stripePriceId: "price_monthly",
    ...over,
  });

  it("no subscription, dead status or an ended period is free", () => {
    expect(tierFromSubscription(null, env, now)).toBe("free");
    expect(tierFromSubscription(sub({ status: "canceled" }), env, now)).toBe("free");
    expect(tierFromSubscription(sub({ status: "past_due" }), env, now)).toBe("free");
    expect(tierFromSubscription(sub({ currentPeriodEnd: past }), env, now)).toBe("free");
  });
  it("weekly, monthly and trialing members are pro", () => {
    expect(tierFromSubscription(sub({ stripePriceId: "price_weekly" }), env, now)).toBe("pro");
    expect(tierFromSubscription(sub({ status: "trialing", stripePriceId: "price_monthly" }), env, now)).toBe("pro");
    expect(tierFromSubscription(sub({ stripePriceId: "price_ent" }), env, now)).toBe("pro");
    // A comp row carries no Stripe price the env knows — still Pro, never VIP.
    expect(tierFromSubscription(sub({ stripePriceId: "comp-internal" }), env, now)).toBe("pro");
  });
  it("the annual price is vip — paid or trialing", () => {
    expect(tierFromSubscription(sub({ stripePriceId: "price_annual" }), env, now)).toBe("vip");
    expect(tierFromSubscription(sub({ status: "trialing", stripePriceId: "price_annual" }), env, now)).toBe("vip");
  });
});
