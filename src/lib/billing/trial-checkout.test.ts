// Trial-checkout tests: the Pro locks now start checkout through this
// module instead of bouncing to /pricing, so these pin (a) the plan →
// checkout-call mapping every lock relies on, (b) the signed-out routing
// decision, and (c) the /pricing copy the picker is allowed to show — a
// drift in any of them would either break checkout or put words in
// pricing's mouth.
import { describe, it, expect, vi } from "vitest";
import {
  CHECKOUT_PLAN_SUMMARIES,
  TRIAL_PLAN_OPTIONS,
  checkoutPagePath,
  checkoutPlanSummary,
  checkoutRequestBody,
  startHostedCheckout,
  startPlanCheckout,
  trialEntryDecision,
} from "./trial-checkout";
import { CheckoutError } from "./checkout-error";
import { ALREADY_SUBSCRIBED_MESSAGE } from "./checkout-guard";

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
    expect(days).toEqual({ weekly: 10, monthly: 10, annual: 10 });
  });

  it("mirrors /pricing's plan copy word for word", () => {
    const byPlan = Object.fromEntries(TRIAL_PLAN_OPTIONS.map((o) => [o.plan, o]));
    expect(byPlan.weekly).toMatchObject({
      price: "$7.99",
      per: "/week",
      note: "10 days free, then billed weekly · cancel anytime",
      cta: "Start 10-Day Free Trial",
      trialLabel: "10 days free",
    });
    expect(byPlan.monthly).toMatchObject({
      price: "$13.99",
      per: "/month",
      note: "10 days free, then billed monthly · cancel anytime",
      cta: "Start 10-Day Free Trial",
      trialLabel: "10 days free",
    });
    expect(byPlan.annual).toMatchObject({
      price: "$74.99",
      per: "/year",
      note: "10 days free, then billed annually · cancel anytime",
      cta: "Start 10-Day Free Trial",
      trialLabel: "10 days free",
    });
  });
});

describe("checkoutRequestBody", () => {
  it("maps each plan to the body /api/checkout expects", () => {
    for (const plan of ["weekly", "monthly", "annual", "enterprise"] as const) {
      expect(checkoutRequestBody(plan)).toEqual({ plan });
    }
  });

  it("adds ui:'embedded' only when the embedded presentation is asked for", () => {
    for (const plan of ["weekly", "monthly", "annual", "enterprise"] as const) {
      expect(checkoutRequestBody(plan, "embedded")).toEqual({ plan, ui: "embedded" });
    }
  });
});

describe("CHECKOUT_PLAN_SUMMARIES", () => {
  it("covers all four plans, enterprise included", () => {
    expect(Object.keys(CHECKOUT_PLAN_SUMMARIES).sort()).toEqual([
      "annual",
      "enterprise",
      "monthly",
      "weekly",
    ]);
  });

  it("reuses the trial plans' pricing copy untouched", () => {
    for (const option of TRIAL_PLAN_OPTIONS) {
      const s = CHECKOUT_PLAN_SUMMARIES[option.plan];
      expect(s).toMatchObject({
        name: option.name,
        price: option.price,
        per: option.per,
        perDay: option.perDay,
        note: option.note,
        trialLabel: option.trialLabel,
        trialDays: option.trialDays,
      });
    }
  });

  it("mirrors /pricing's enterprise words verbatim, with no trial", () => {
    expect(CHECKOUT_PLAN_SUMMARIES.enterprise).toEqual({
      plan: "enterprise",
      name: "Enterprise",
      price: "$999",
      per: "/year",
      perDay: "$2.74",
      note: "Billed annually · cancel anytime",
      trialLabel: null,
      trialDays: 0,
    });
  });

  it("checkoutPlanSummary resolves known plans and rejects the rest", () => {
    expect(checkoutPlanSummary("annual")?.price).toBe("$74.99");
    expect(checkoutPlanSummary("enterprise")?.name).toBe("Enterprise");
    expect(checkoutPlanSummary("daily")).toBeNull();
    expect(checkoutPlanSummary(null)).toBeNull();
    expect(checkoutPlanSummary(undefined)).toBeNull();
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
  // New contract (on-site checkout): the shared entry point no longer
  // POSTs and redirects to Stripe itself — it lands the buyer on our
  // /checkout page for the chosen plan, and that page owns the embedded
  // mount + hosted fallback (lib/billing/embedded-checkout). The old
  // POST-and-redirect tests were replaced by these navigation pins.
  it("navigates to the on-site checkout page for the plan", () => {
    const navigate = vi.fn();
    const path = startPlanCheckout("monthly", navigate);
    expect(path).toBe("/checkout?plan=monthly");
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith("/checkout?plan=monthly");
  });

  it("routes every plan — enterprise included — through the same page", () => {
    for (const plan of ["weekly", "monthly", "annual", "enterprise"] as const) {
      const navigate = vi.fn();
      expect(startPlanCheckout(plan, navigate)).toBe(`/checkout?plan=${plan}`);
      expect(navigate).toHaveBeenCalledWith(`/checkout?plan=${plan}`);
    }
  });

  it("checkoutPagePath builds the same destination", () => {
    expect(checkoutPagePath("annual")).toBe("/checkout?plan=annual");
    expect(checkoutPagePath("enterprise")).toBe("/checkout?plan=enterprise");
  });
});

describe("startHostedCheckout", () => {
  // The deliberate hosted option (the pricing sheet's / /checkout page's
  // "Continue on Stripe instead" link): POSTs WITHOUT ui — the route's
  // hosted answer — and navigates to Stripe's page. Distinct from
  // lib/billing/embedded-checkout's automatic fallback only in that the
  // buyer chose it.
  const HOSTED_URL = "https://checkout.stripe.com/c/pay/cs_test_123";

  function fakeFetch(step: { ok: boolean; body: any }) {
    const calls: { url: string; body: any }[] = [];
    const fetchImpl = vi.fn(async (input: string, init: RequestInit) => {
      calls.push({ url: input, body: JSON.parse(String(init.body)) });
      return { ok: step.ok, json: async () => step.body };
    });
    return { fetchImpl, calls };
  }

  it("POSTs the plan without ui and navigates to the hosted URL", async () => {
    const { fetchImpl, calls } = fakeFetch({ ok: true, body: { url: HOSTED_URL } });
    const navigate = vi.fn();
    const url = await startHostedCheckout("annual", { fetchImpl, navigate });
    expect(url).toBe(HOSTED_URL);
    expect(calls).toEqual([{ url: "/api/checkout", body: { plan: "annual" } }]);
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith(HOSTED_URL);
  });

  it("routes every plan — enterprise included — through the hosted flow", async () => {
    for (const plan of ["weekly", "monthly", "annual", "enterprise"] as const) {
      const { fetchImpl, calls } = fakeFetch({ ok: true, body: { url: HOSTED_URL } });
      await startHostedCheckout(plan, { fetchImpl, navigate: vi.fn() });
      expect(calls[0].body).toEqual({ plan });
    }
  });

  it("throws the server's error message when the POST fails", async () => {
    const { fetchImpl } = fakeFetch({
      ok: false,
      body: { error: "STRIPE_WEEKLY_PRICE_ID is not set" },
    });
    await expect(
      startHostedCheckout("weekly", { fetchImpl, navigate: vi.fn() }),
    ).rejects.toThrow("STRIPE_WEEKLY_PRICE_ID is not set");
  });

  it("throws the generic failure when the answer carries no URL", async () => {
    const { fetchImpl } = fakeFetch({ ok: true, body: {} });
    await expect(
      startHostedCheckout("monthly", { fetchImpl, navigate: vi.fn() }),
    ).rejects.toThrow("Checkout failed");
  });

  it("throws a structured CheckoutError for an already-subscribed refusal", async () => {
    const { fetchImpl } = fakeFetch({
      ok: false,
      body: {
        error: ALREADY_SUBSCRIBED_MESSAGE,
        code: "already_subscribed",
        manageUrl: "/settings/subscription",
      },
    });
    const err = await startHostedCheckout("annual", {
      fetchImpl,
      navigate: vi.fn(),
    }).catch((e) => e);
    expect(err).toBeInstanceOf(CheckoutError);
    expect(err.message).toBe(ALREADY_SUBSCRIBED_MESSAGE);
    expect(err.code).toBe("already_subscribed");
    expect(err.alreadySubscribed).toBe(true);
    expect(err.managePath).toBe("/settings/subscription");
  });

  it("throws the generic CheckoutError when the failure carries no message", async () => {
    // A message-less failure (e.g. a 500 whose body isn't JSON — the
    // fake's null body is what postCheckout-equivalent parsing yields).
    const { fetchImpl } = fakeFetch({ ok: false, body: null });
    const err = await startHostedCheckout("weekly", {
      fetchImpl,
      navigate: vi.fn(),
    }).catch((e) => e);
    expect(err).toBeInstanceOf(CheckoutError);
    expect(err.message).toBe("Checkout failed");
    expect(err.serverMessage).toBeNull();
    expect(err.code).toBeNull();
  });
});
