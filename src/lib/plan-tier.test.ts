// Tier-contract pins (scope H1): every price id → tier, trial-on-annual
// = vip, comp = pro, and the session helper's conservative fallback for
// tokens minted before planTier existed.
import { describe, it, expect } from "vitest";
import {
  planTierOf,
  planTierForPriceId,
  planTierForRow,
  tierSatisfies,
} from "./plan-tier";

const ENV = {
  STRIPE_WEEKLY_PRICE_ID: "price_weekly",
  STRIPE_MONTHLY_PRICE_ID: "price_monthly",
  STRIPE_ANNUAL_PRICE_ID: "price_annual",
  STRIPE_ENTERPRISE_PRICE_ID: "price_enterprise",
};

const NOW = new Date("2026-10-20T12:00:00.000Z");
const future = new Date("2026-10-27T12:00:00.000Z");
const past = new Date("2026-10-13T12:00:00.000Z");
const row = (status: string, stripePriceId: string, end: Date = future) => ({
  status,
  stripePriceId,
  currentPeriodEnd: end,
});

describe("planTierForPriceId", () => {
  it("annual → vip; weekly/monthly → pro; enterprise → vip; comp → pro", () => {
    expect(planTierForPriceId("price_annual", ENV)).toBe("vip");
    expect(planTierForPriceId("price_weekly", ENV)).toBe("pro");
    expect(planTierForPriceId("price_monthly", ENV)).toBe("pro");
    expect(planTierForPriceId("price_enterprise", ENV)).toBe("vip");
    expect(planTierForPriceId("comp_free_pro", ENV)).toBe("pro");
  });

  it("unknown / missing price id on an assumed-active sub → pro, never vip", () => {
    expect(planTierForPriceId("price_legacy_unknown", ENV)).toBe("pro");
    expect(planTierForPriceId(null, ENV)).toBe("free");
    expect(planTierForPriceId(undefined, ENV)).toBe("free");
  });

  it("the Ambient price → free: a standalone product, never a tier", () => {
    // Via the env var…
    expect(
      planTierForPriceId("price_ambient", { ...ENV, STRIPE_AMBIENT_PRICE_ID: "price_ambient" }),
    ).toBe("free");
    // …and via the live fallback id when the env var is unset.
    expect(planTierForPriceId("price_1UUxUnGfHuTnzrlHH0pNYhJU", ENV)).toBe("free");
  });

  it("the Powder Pass price → free: a standalone product, never a tier", () => {
    // Env var only — Powder Pass has no fallback id (not yet created).
    expect(
      planTierForPriceId("price_ski", { ...ENV, POWDER_PASS_PRICE_ID: "price_ski" }),
    ).toBe("free");
  });
});

describe("planTierForRow", () => {
  it("active annual → vip; TRIALING annual → vip (trial on annual is VIP from day one)", () => {
    expect(planTierForRow(row("active", "price_annual"), ENV, NOW)).toBe("vip");
    expect(planTierForRow(row("trialing", "price_annual"), ENV, NOW)).toBe("vip");
  });

  it("active/trialing weekly + monthly → pro", () => {
    expect(planTierForRow(row("active", "price_weekly"), ENV, NOW)).toBe("pro");
    expect(planTierForRow(row("trialing", "price_monthly"), ENV, NOW)).toBe("pro");
  });

  it("comp row → pro", () => {
    expect(planTierForRow(row("active", "comp_free_pro"), ENV, NOW)).toBe("pro");
  });

  it("not-active rows → free whatever the price", () => {
    expect(planTierForRow(row("past_due", "price_annual"), ENV, NOW)).toBe("free");
    expect(planTierForRow(row("canceled", "price_annual"), ENV, NOW)).toBe("free");
    expect(planTierForRow(row("trialing", "price_annual", past), ENV, NOW)).toBe("free");
    expect(planTierForRow(null, ENV, NOW)).toBe("free");
  });
});

describe("planTierOf (the session contract)", () => {
  it("reads session.user.planTier when present", () => {
    expect(planTierOf({ user: { planTier: "vip", subscriptionStatus: "active" } })).toBe("vip");
    expect(planTierOf({ user: { planTier: "pro", subscriptionStatus: "active" } })).toBe("pro");
    expect(planTierOf({ user: { planTier: "free", subscriptionStatus: "none" } })).toBe("free");
  });

  it("legacy tokens without planTier: active → pro (never vip), anything else → free", () => {
    expect(planTierOf({ user: { subscriptionStatus: "active" } })).toBe("pro");
    expect(planTierOf({ user: { subscriptionStatus: "none" } })).toBe("free");
    expect(planTierOf({ user: {} })).toBe("free");
    expect(planTierOf(null)).toBe("free");
    expect(planTierOf(undefined)).toBe("free");
    expect(planTierOf({})).toBe("free");
  });

  it("an invalid planTier value falls back to the status derivation", () => {
    expect(planTierOf({ user: { planTier: "gold", subscriptionStatus: "active" } })).toBe("pro");
  });
});

describe("new-price bridge (Pricing Phase A — central config, old contract kept)", () => {
  const BRIDGE_ENV = {
    ...ENV,
    STRIPE_LITE_WEEKLY_PRICE_ID: "price_lite_weekly",
    STRIPE_LITE_MONTHLY_PRICE_ID: "price_lite_monthly",
    STRIPE_LITE_ANNUAL_PRICE_ID: "price_lite_annual",
    STRIPE_ULTRA_WEEKLY_PRICE_ID: "price_ultra_weekly",
    STRIPE_ULTRA_MONTHLY_PRICE_ID: "price_ultra_monthly",
    STRIPE_ULTRA_ANNUAL_PRICE_ID: "price_ultra_annual",
  };
  const BEFORE_CUTOFF = new Date("2026-10-29T12:00:00.000Z");
  const AFTER_CUTOFF = new Date("2026-11-15T12:00:00.000Z");
  // ENV.STRIPE_ANNUAL_PRICE_ID is "price_annual" here, not the real
  // annual id — use an env whose annual slot holds the real one.
  const REAL_ANNUAL_ENV = { ...BRIDGE_ENV, STRIPE_ANNUAL_PRICE_ID: "price_1USW5HGfHuTnzrlHveoTpmwd" };

  it("lite prices → free-equivalent in the old contract (no Pro leak)", () => {
    expect(planTierForPriceId("price_lite_weekly", BRIDGE_ENV)).toBe("free");
    expect(planTierForPriceId("price_lite_monthly", BRIDGE_ENV)).toBe("free");
    expect(planTierForPriceId("price_lite_annual", BRIDGE_ENV)).toBe("free");
  });

  it("ultra prices → vip", () => {
    expect(planTierForPriceId("price_ultra_weekly", BRIDGE_ENV)).toBe("vip");
    expect(planTierForPriceId("price_ultra_monthly", BRIDGE_ENV)).toBe("vip");
    expect(planTierForPriceId("price_ultra_annual", BRIDGE_ENV)).toBe("vip");
  });

  it("Pro annual: pre-cutoff subscriptions are vip (legacy), post-cutoff are pro", () => {
    expect(planTierForPriceId("price_1USW5HGfHuTnzrlHveoTpmwd", REAL_ANNUAL_ENV, BEFORE_CUTOFF)).toBe("vip");
    expect(planTierForPriceId("price_1USW5HGfHuTnzrlHveoTpmwd", REAL_ANNUAL_ENV, AFTER_CUTOFF)).toBe("pro");
    // No date → the legacy reading (annual ⇒ vip), exactly as pre-Phase A.
    expect(planTierForPriceId("price_1USW5HGfHuTnzrlHveoTpmwd", REAL_ANNUAL_ENV)).toBe("vip");
    // The row path carries the subscription's createdAt through.
    expect(
      planTierForRow(
        { status: "active", stripePriceId: "price_1USW5HGfHuTnzrlHveoTpmwd", currentPeriodEnd: future, createdAt: BEFORE_CUTOFF },
        REAL_ANNUAL_ENV,
        NOW,
      ),
    ).toBe("vip");
    expect(
      planTierForRow(
        { status: "active", stripePriceId: "price_1USW5HGfHuTnzrlHveoTpmwd", currentPeriodEnd: future, createdAt: AFTER_CUTOFF },
        REAL_ANNUAL_ENV,
        NOW,
      ),
    ).toBe("pro");
  });

  it("grandfathered + dead legacy prices resolve as they always have", () => {
    expect(planTierForPriceId("price_1UPH6KGfHuTnzrlHDBzDHobj", BRIDGE_ENV)).toBe("pro"); // GF weekly
    expect(planTierForPriceId("price_1UPGwjGfHuTnzrlHwwU5k4WO", BRIDGE_ENV)).toBe("pro"); // GF monthly
    expect(planTierForPriceId("price_1UPH7MGfHuTnzrlHxbGXji4K", BRIDGE_ENV)).toBe("vip"); // GF annual keeps VIP extras
    expect(planTierForPriceId("price_1UPGxdGfHuTnzrlHpaLBMFv5", BRIDGE_ENV)).toBe("pro"); // dead legacy
  });
});

describe("tierSatisfies (vip ⊃ pro)", () => {
  it("vip satisfies both gates; pro satisfies only pro; free neither", () => {
    expect(tierSatisfies("vip", "vip")).toBe(true);
    expect(tierSatisfies("vip", "pro")).toBe(true);
    expect(tierSatisfies("pro", "pro")).toBe(true);
    expect(tierSatisfies("pro", "vip")).toBe(false);
    expect(tierSatisfies("free", "pro")).toBe(false);
  });
});
