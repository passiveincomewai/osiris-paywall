// Pins for the in-house subscription management assembly + switch terms
// (scope G). Prices must come from PLAN_COPY (TRIAL_PLAN_OPTIONS) and
// plan resolution from the env price ids — never restated figures.
import { describe, it, expect } from "vitest";
import {
  assembleManageView,
  switchTerms,
  priceIdForPlan,
  type ManageDbSub,
} from "./manage";
import { TRIAL_PLAN_OPTIONS } from "./trial-checkout";

const ENV = {
  STRIPE_WEEKLY_PRICE_ID: "price_weekly",
  STRIPE_MONTHLY_PRICE_ID: "price_monthly",
  STRIPE_ANNUAL_PRICE_ID: "price_annual",
  STRIPE_ENTERPRISE_PRICE_ID: "price_enterprise",
};

const dbSub = (over: Partial<ManageDbSub> = {}): ManageDbSub => ({
  stripePriceId: "price_weekly",
  stripeSubscriptionId: "sub_123",
  status: "active",
  currentPeriodEnd: new Date("2026-10-27T12:00:00.000Z"),
  cancelAtPeriodEnd: false,
  ...over,
});

describe("assembleManageView", () => {
  it("no subscription → kind 'none' with the three plans as the subscribe path", () => {
    const v = assembleManageView({ dbSub: null, stripeSub: null, env: ENV });
    expect(v.kind).toBe("none");
    expect(v.current).toBeNull();
    expect(v.options.map((o) => o.plan)).toEqual(["weekly", "monthly", "annual"]);
  });

  it("active weekly: current card figures from PLAN_COPY; current plan flagged in options", () => {
    const v = assembleManageView({ dbSub: dbSub(), stripeSub: { status: "active", trial_end: null }, env: ENV });
    expect(v.kind).toBe("self-serve");
    expect(v.current?.plan).toBe("weekly");
    expect(v.current?.planName).toBe("Weekly");
    expect(v.current?.priceLabel).toBe("$7.99/week");
    expect(v.current?.periodEnd).toBe("2026-10-27T12:00:00.000Z");
    expect(v.options.find((o) => o.plan === "weekly")?.current).toBe(true);
    expect(v.options.find((o) => o.plan === "annual")?.current).toBe(false);
  });

  it("trialing: trial end comes from the live Stripe subscription", () => {
    const trialEnd = Math.floor(new Date("2026-10-23T12:00:00.000Z").getTime() / 1000);
    const v = assembleManageView({
      dbSub: dbSub({ status: "trialing", stripePriceId: "price_annual" }),
      stripeSub: { status: "trialing", trial_end: trialEnd },
      env: ENV,
    });
    expect(v.current?.trialing).toBe(true);
    expect(v.current?.trialEndsAt).toBe("2026-10-23T12:00:00.000Z");
    expect(v.current?.priceLabel).toBe("$74.99/year");
  });

  it("past_due is flagged honestly", () => {
    const v = assembleManageView({ dbSub: dbSub({ status: "past_due" }), stripeSub: null, env: ENV });
    expect(v.current?.pastDue).toBe(true);
    expect(v.kind).toBe("self-serve");
  });

  it("enterprise: no self-serve options, support contact instead", () => {
    const v = assembleManageView({
      dbSub: dbSub({ stripePriceId: "price_enterprise" }),
      stripeSub: { status: "active", trial_end: null },
      env: ENV,
      currentPriceLabel: "$999/year",
    });
    expect(v.kind).toBe("enterprise");
    expect(v.options).toEqual([]);
    expect(v.supportEmail).toBe("passiveincomewai@gmail.com");
    expect(v.current?.priceLabel).toBe("$999/year");
  });

  it("comp rows (comp_ ids) are never self-serve", () => {
    const v = assembleManageView({
      dbSub: dbSub({ stripeSubscriptionId: "comp_creator_user1" }),
      stripeSub: null,
      env: ENV,
    });
    expect(v.kind).toBe("comp");
    expect(v.options).toEqual([]);
  });
});

describe("priceIdForPlan", () => {
  it("resolves through the env price ids", () => {
    expect(priceIdForPlan("annual", ENV)).toBe("price_annual");
    expect(priceIdForPlan("weekly", {})).toBeNull();
    expect(priceIdForPlan("bogus", ENV)).toBeNull();
  });
});

describe("switchTerms", () => {
  const annual = TRIAL_PLAN_OPTIONS.find((o) => o.plan === "annual")!;

  it("trialing: trial end preserved in words, first charge is the NEW price", () => {
    const v = assembleManageView({
      dbSub: dbSub({ status: "trialing" }),
      stripeSub: { status: "trialing", trial_end: Math.floor(new Date("2026-10-23T12:00:00.000Z").getTime() / 1000) },
      env: ENV,
    });
    const terms = switchTerms(v.current!, annual);
    expect(terms.moneyLine).toContain("No charge now");
    expect(terms.moneyLine).toContain("October 23, 2026");
    expect(terms.nextChargeLine).toContain("$74.99/year");
    expect(terms.nextChargeLine).toContain("the new plan's price");
  });

  it("active: standard proration in plain terms + the next full charge date/price", () => {
    const v = assembleManageView({ dbSub: dbSub(), stripeSub: { status: "active", trial_end: null }, env: ENV });
    const terms = switchTerms(v.current!, annual);
    expect(terms.moneyLine).toContain("credits the unused part");
    expect(terms.moneyLine).toContain("next invoice");
    expect(terms.nextChargeLine).toContain("October 27, 2026");
    expect(terms.nextChargeLine).toContain("$74.99/year");
    expect(terms.effectiveLine).toContain("immediately");
  });
});
