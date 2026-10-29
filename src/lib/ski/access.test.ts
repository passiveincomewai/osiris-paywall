import { describe, it, expect } from "vitest";
import {
  powderPassEnabled,
  powderPassPriceId,
  skiAccessForRow,
  sessionHasSkiAccess,
} from "./access";
import { planTierForPriceId } from "@/lib/plan-tier";

const SKI = "price_ski_test";
const AMBIENT = "price_1UUxUnGfHuTnzrlHH0pNYhJU";
const env = {
  POWDER_PASS_ENABLED: "1",
  POWDER_PASS_PRICE_ID: SKI,
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
  stripePriceId: SKI,
  ...over,
});

describe("powderPassEnabled — the dark-launch switch", () => {
  it("is OFF by default and for anything but an explicit affirmative", () => {
    expect(powderPassEnabled({})).toBe(false);
    expect(powderPassEnabled({ POWDER_PASS_ENABLED: "0" })).toBe(false);
    expect(powderPassEnabled({ POWDER_PASS_ENABLED: "false" })).toBe(false);
    expect(powderPassEnabled({ POWDER_PASS_ENABLED: "" })).toBe(false);
  });
  it("turns on for 1/true/on/yes (case-insensitive)", () => {
    for (const v of ["1", "true", "TRUE", "on", "yes"]) {
      expect(powderPassEnabled({ POWDER_PASS_ENABLED: v })).toBe(true);
    }
  });
});

describe("powderPassPriceId", () => {
  it("reads the env var and has NO fallback constant", () => {
    expect(powderPassPriceId({ POWDER_PASS_PRICE_ID: SKI })).toBe(SKI);
    expect(powderPassPriceId({})).toBeUndefined();
    expect(powderPassPriceId({ POWDER_PASS_PRICE_ID: "" })).toBeUndefined();
  });
});

describe("planTierForPriceId — the Powder Pass price is not a tier", () => {
  it("maps the Powder Pass price to free, never pro", () => {
    expect(planTierForPriceId(SKI, env)).toBe("free");
  });
  it("still maps the tier prices as before", () => {
    expect(planTierForPriceId("price_monthly", env)).toBe("pro");
    expect(planTierForPriceId("price_annual", env)).toBe("vip");
    expect(planTierForPriceId("price_enterprise", env)).toBe("vip");
  });
  it("cannot recognise the ski price while POWDER_PASS_PRICE_ID is unset (no invented id)", () => {
    const { POWDER_PASS_PRICE_ID: _unset, ...noSkiEnv } = env;
    expect(planTierForPriceId(SKI, noSkiEnv)).toBe("pro"); // the unknown-price default
  });
});

describe("skiAccessForRow", () => {
  it("grants access for an active Powder Pass subscription", () => {
    expect(skiAccessForRow(row({}), env)).toBe(true);
    expect(skiAccessForRow(row({ status: "trialing" }), env)).toBe(true);
  });

  it("grants access for VIP prices (VIP includes Powder Pass)", () => {
    expect(skiAccessForRow(row({ stripePriceId: "price_annual" }), env)).toBe(true);
    expect(skiAccessForRow(row({ stripePriceId: "price_enterprise" }), env)).toBe(true);
  });

  it("grants access for a comp row (comps per the existing pattern)", () => {
    expect(skiAccessForRow(row({ stripePriceId: "comp_free_pro" }), env)).toBe(true);
  });

  it("denies Pro prices — Pro does NOT include Powder Pass", () => {
    expect(skiAccessForRow(row({ stripePriceId: "price_monthly" }), env)).toBe(false);
    expect(skiAccessForRow(row({ stripePriceId: "price_weekly" }), env)).toBe(false);
  });

  it("denies an Ambient row — a different standalone product", () => {
    expect(skiAccessForRow(row({ stripePriceId: AMBIENT }), env)).toBe(false);
  });

  it("denies ended trials, cancelled, past-due and absent rows", () => {
    expect(
      skiAccessForRow(row({ status: "trialing", currentPeriodEnd: past }), env),
    ).toBe(false);
    expect(skiAccessForRow(row({ status: "canceled" }), env)).toBe(false);
    expect(skiAccessForRow(row({ status: "past_due" }), env)).toBe(false);
    expect(skiAccessForRow(null, env)).toBe(false);
    expect(skiAccessForRow(undefined, env)).toBe(false);
  });

  it("is dark with the flag off — even a Powder Pass row grants nothing", () => {
    const { POWDER_PASS_ENABLED: _off, ...darkEnv } = env;
    expect(skiAccessForRow(row({}), darkEnv)).toBe(false);
    expect(skiAccessForRow(row({ stripePriceId: "price_annual" }), darkEnv)).toBe(false);
    expect(skiAccessForRow(row({}), { ...env, POWDER_PASS_ENABLED: "0" })).toBe(false);
  });
});

describe("sessionHasSkiAccess", () => {
  it("reads the explicit claim first", () => {
    expect(sessionHasSkiAccess({ user: { skiAccess: true } })).toBe(true);
  });
  it("falls back to vip only for older sessions — never to pro or bare active", () => {
    expect(sessionHasSkiAccess({ user: { planTier: "vip" } })).toBe(true);
    expect(sessionHasSkiAccess({ user: { planTier: "pro" } })).toBe(false);
    expect(sessionHasSkiAccess({ user: { subscriptionStatus: "active" } })).toBe(false);
  });
  it("denies anonymous and free sessions", () => {
    expect(sessionHasSkiAccess(null)).toBe(false);
    expect(sessionHasSkiAccess({ user: { planTier: "free", subscriptionStatus: "none" } })).toBe(false);
  });
});
