// Trial-checkout tests: the Pro locks now start checkout through this
// module instead of bouncing to /pricing, so these pin (a) the plan →
// checkout-call mapping every lock relies on, (b) the signed-out routing
// decision, and (c) the /pricing copy the picker is allowed to show — a
// drift in any of them would either break checkout or put words in
// pricing's mouth.
import { describe, it, expect, vi } from "vitest";
import {
  TRIAL_PLAN_OPTIONS,
  checkoutRequestBody,
  startPlanCheckout,
  trialEntryDecision,
} from "./trial-checkout";

describe("TRIAL_PLAN_OPTIONS", () => {
  it("offers exactly the three trial plans, in pricing order", () => {
    expect(TRIAL_PLAN_OPTIONS.map((o) => o.plan)).toEqual([
      "weekly",
      "monthly",
      "annual",
    ]);
  });

  it("never offers enterprise (it has no trial)", () => {
    expect(TRIAL_PLAN_OPTIONS.some((o) => (o.plan as string) === "enterprise")).toBe(false);
  });

  it("carries the trial lengths from the shared trial config", () => {
    const days = Object.fromEntries(TRIAL_PLAN_OPTIONS.map((o) => [o.plan, o.trialDays]));
    expect(days).toEqual({ weekly: 1, monthly: 1, annual: 3 });
  });

  it("mirrors /pricing's plan copy word for word", () => {
    const byPlan = Object.fromEntries(TRIAL_PLAN_OPTIONS.map((o) => [o.plan, o]));
    expect(byPlan.weekly).toMatchObject({
      price: "$3.99",
      per: "/week",
      note: "1 day free, then billed weekly · cancel anytime",
      cta: "Start 1-Day Free Trial",
      trialLabel: "1 day free",
    });
    expect(byPlan.monthly).toMatchObject({
      price: "$9.99",
      per: "/month",
      note: "1 day free, then billed monthly · cancel anytime",
      cta: "Start 1-Day Free Trial",
      trialLabel: "1 day free",
    });
    expect(byPlan.annual).toMatchObject({
      price: "$59.99",
      per: "/year",
      note: "3 days free, then billed annually · cancel anytime",
      cta: "Start 3-Day Free Trial",
      trialLabel: "3 days free",
    });
  });
});

describe("checkoutRequestBody", () => {
  it("maps each plan to the body /api/checkout expects", () => {
    for (const plan of ["weekly", "monthly", "annual", "enterprise"] as const) {
      expect(checkoutRequestBody(plan)).toEqual({ plan });
    }
  });
});

describe("trialEntryDecision", () => {
  it("sends signed-out users straight to checkout (guest checkout, like /pricing)", () => {
    expect(trialEntryDecision(false)).toEqual({ kind: "checkout", guest: true });
  });

  it("sends signed-in users to the same checkout", () => {
    expect(trialEntryDecision(true)).toEqual({ kind: "checkout", guest: false });
  });
});

describe("startPlanCheckout", () => {
  it("POSTs the plan to /api/checkout and resolves to the Stripe URL", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({ url: "https://checkout.stripe.com/c/pay/cs_123" }),
    }));
    const url = await startPlanCheckout("monthly", fetchImpl);
    expect(url).toBe("https://checkout.stripe.com/c/pay/cs_123");
    expect(fetchImpl).toHaveBeenCalledWith("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: "monthly" }),
    });
  });

  it("surfaces the server's error message on a failed checkout", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: false,
      json: async () => ({ error: "STRIPE_WEEKLY_PRICE_ID is not set" }),
    }));
    await expect(startPlanCheckout("weekly", fetchImpl)).rejects.toThrow(
      "STRIPE_WEEKLY_PRICE_ID is not set",
    );
  });

  it("throws the generic failure when the response carries no URL", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({}),
    }));
    await expect(startPlanCheckout("annual", fetchImpl)).rejects.toThrow("Checkout failed");
  });
});
