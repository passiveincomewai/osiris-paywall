// Pins for the in-house subscription management assembly + switch terms
// (scope G). Prices must come from PLAN_COPY (TRIAL_PLAN_OPTIONS) and
// plan resolution from the env price ids — never restated figures.
import { describe, it, expect } from "vitest";
import {
  assembleManageView,
  switchTerms,
  MANAGEABLE_PLANS,
  priceIdForPlan,
  invoicePaymentIntentId,
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

  it("relations: VIP Pro is THE upgrade from Weekly/Monthly; from VIP the others are downgrades", () => {
    const fromWeekly = assembleManageView({ dbSub: dbSub(), stripeSub: null, env: ENV });
    expect(fromWeekly.current?.planName).toBe("Weekly");
    expect(fromWeekly.options.find((o) => o.plan === "annual")?.name).toBe("VIP Pro");
    expect(fromWeekly.options.find((o) => o.plan === "annual")?.relation).toBe("upgrade");
    expect(fromWeekly.options.find((o) => o.plan === "monthly")?.relation).toBe("switch");

    const fromVip = assembleManageView({
      dbSub: dbSub({ stripePriceId: "price_annual" }),
      stripeSub: null,
      env: ENV,
    });
    expect(fromVip.current?.planName).toBe("VIP Pro");
    expect(fromVip.options.find((o) => o.plan === "weekly")?.relation).toBe("downgrade");
    expect(fromVip.options.find((o) => o.plan === "monthly")?.relation).toBe("downgrade");
    expect(fromVip.options.find((o) => o.plan === "annual")?.relation).toBe("current");
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

  it("Phase A: lite_*/ultra_* plan keys resolve; MANAGEABLE_PLANS stays the current 3", () => {
    const env = {
      STRIPE_LITE_WEEKLY_PRICE_ID: "price_lite_w",
      STRIPE_LITE_MONTHLY_PRICE_ID: "price_lite_m",
      STRIPE_LITE_ANNUAL_PRICE_ID: "price_lite_a",
      STRIPE_ULTRA_WEEKLY_PRICE_ID: "price_ultra_w",
      STRIPE_ULTRA_MONTHLY_PRICE_ID: "price_ultra_m",
      STRIPE_ULTRA_ANNUAL_PRICE_ID: "price_ultra_a",
    };
    expect(priceIdForPlan("lite_weekly", env)).toBe("price_lite_w");
    expect(priceIdForPlan("lite_monthly", env)).toBe("price_lite_m");
    expect(priceIdForPlan("lite_annual", env)).toBe("price_lite_a");
    expect(priceIdForPlan("ultra_weekly", env)).toBe("price_ultra_w");
    expect(priceIdForPlan("ultra_monthly", env)).toBe("price_ultra_m");
    expect(priceIdForPlan("ultra_annual", env)).toBe("price_ultra_a");
    expect(priceIdForPlan("lite_weekly", {})).toBeNull();
    expect(MANAGEABLE_PLANS).toEqual(["weekly", "monthly", "annual"]);
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

  it("active, no quote: the difference is due TODAY if the card can't be assumed — never 'next invoice'", () => {
    const v = assembleManageView({ dbSub: dbSub(), stripeSub: { status: "active", trial_end: null }, env: ENV });
    const terms = switchTerms(v.current!, annual);
    expect(terms.moneyLine).toContain("credits the unused part");
    expect(terms.moneyLine).not.toContain("next invoice");
    expect(terms.moneyLine).toContain("card on file");
    expect(terms.moneyLine).toContain("stays fully active");
    expect(terms.nextChargeLine).toContain("$74.99/year");
    expect(terms.effectiveLine).toContain("immediately");
  });

  it("active with a due-today quote: the exact amount is named, and the current plan survives a failed card", () => {
    const v = assembleManageView({ dbSub: dbSub(), stripeSub: { status: "active", trial_end: null }, env: ENV });
    const terms = switchTerms(v.current!, annual, 6162);
    expect(terms.moneyLine).toContain("Due today: $61.62");
    expect(terms.moneyLine).toContain("stays fully active");
    expect(terms.effectiveLine).toContain("as soon as");
  });

  it("active with a zero due-today quote: no charge today", () => {
    const v = assembleManageView({ dbSub: dbSub(), stripeSub: { status: "active", trial_end: null }, env: ENV });
    const terms = switchTerms(v.current!, annual, 0);
    expect(terms.moneyLine).toContain("No charge today");
  });

  it("dueTodayByPlan lands on the options (and only where quoted)", () => {
    const v = assembleManageView({
      dbSub: dbSub(),
      stripeSub: { status: "active", trial_end: null },
      env: ENV,
      dueTodayByPlan: { annual: 6162 },
    });
    expect(v.options.find((o) => o.plan === "annual")?.dueTodayCents).toBe(6162);
    expect(v.options.find((o) => o.plan === "monthly")?.dueTodayCents).toBeNull();
  });

  it("a pending switch (unpaid prorated invoice) surfaces with its target resolved from the price id", () => {
    const v = assembleManageView({
      dbSub: dbSub(),
      stripeSub: {
        status: "active",
        trial_end: null,
        pendingInvoice: {
          id: "in_1",
          amountDue: 6162,
          currency: "usd",
          clientSecret: "pi_1_secret_x",
          hostedUrl: "https://invoice.stripe.com/i/x",
          newPriceId: "price_annual",
        },
      },
      env: ENV,
    });
    expect(v.pendingSwitch).toEqual({
      targetPlan: "annual",
      targetName: "VIP Pro",
      amountDue: 6162,
      currency: "usd",
      clientSecret: "pi_1_secret_x",
      hostedUrl: "https://invoice.stripe.com/i/x",
    });
    // The member's CURRENT plan is untouched while the switch pends.
    expect(v.current?.plan).toBe("weekly");
    expect(v.current?.pastDue).toBe(false);
  });

  it("no pending invoice → pendingSwitch is null", () => {
    const v = assembleManageView({ dbSub: dbSub(), stripeSub: { status: "active", trial_end: null }, env: ENV });
    expect(v.pendingSwitch).toBeNull();
  });
});

describe("invoicePaymentIntentId", () => {
  it("reads the legacy invoice.payment_intent (string or expanded)", () => {
    expect(invoicePaymentIntentId({ payment_intent: "pi_a" })).toBe("pi_a");
    expect(invoicePaymentIntentId({ payment_intent: { id: "pi_b" } })).toBe("pi_b");
  });

  it("reads the current invoice.payments shape", () => {
    expect(
      invoicePaymentIntentId({ payments: { data: [{ payment: { payment_intent: "pi_c" } }] } }),
    ).toBe("pi_c");
    expect(
      invoicePaymentIntentId({ payments: { data: [{ payment: { payment_intent: { id: "pi_d" } } }] } }),
    ).toBe("pi_d");
  });

  it("null when the invoice carries no payment intent", () => {
    expect(invoicePaymentIntentId({})).toBeNull();
    expect(invoicePaymentIntentId(null)).toBeNull();
    expect(invoicePaymentIntentId({ payments: { data: [] } })).toBeNull();
  });
});
