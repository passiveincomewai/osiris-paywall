// Trial-checkout tests: the Pro locks now start checkout through this
// module instead of bouncing to /pricing, so these pin (a) the plan →
// checkout-call mapping every lock relies on, (b) the signed-out routing
// decision, and (c) the /pricing copy the picker is allowed to show — a
// drift in any of them would either break checkout or put words in
// pricing's mouth.
import { describe, it, expect, vi, beforeEach } from "vitest";

// Phase E: the start functions fire the funnel's checkout_started
// through lib/billing/picker-analytics → trackAnalyticsEvent. Mock
// the tracker so these tests pin the emitted (event, detail) pairs
// without a network.
const trackMock = vi.hoisted(() => vi.fn());
vi.mock("@/components/AnalyticsTracker", () => ({
  trackAnalyticsEvent: trackMock,
}));

import {
  CHECKOUT_PLAN_SUMMARIES,
  GRID_PLAN_OPTIONS,
  GRID_PLAN_SUMMARIES,
  TIER_PLAN_OPTIONS,
  TRIAL_PLAN_OPTIONS,
  checkoutPagePath,
  checkoutPlanSummary,
  checkoutRequestBody,
  gridCheckoutPlan,
  gridPlanOption,
  startHostedCheckout,
  startPlanCheckout,
  tierForCheckoutPlan,
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
    expect(days).toEqual({ weekly: 3, monthly: 10, annual: 10 });
  });

  it("mirrors /pricing's plan copy word for word", () => {
    const byPlan = Object.fromEntries(TRIAL_PLAN_OPTIONS.map((o) => [o.plan, o]));
    expect(byPlan.weekly).toMatchObject({
      price: "$7.99",
      per: "/week",
      note: "3 days free, then billed weekly · cancel anytime",
      cta: "Start 3-Day Free Trial",
      trialLabel: "3 days free",
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
  it("covers all six plans, enterprise, ambient and ski included", () => {
    expect(Object.keys(CHECKOUT_PLAN_SUMMARIES).sort()).toEqual([
      "ambient",
      "annual",
      "enterprise",
      "monthly",
      "ski",
      "weekly",
    ]);
  });

  it("describes the ambient plan with its trial", () => {
    expect(CHECKOUT_PLAN_SUMMARIES.ambient).toEqual({
      plan: "ambient",
      name: "WorldEye Ambient",
      price: "$4.99",
      per: "/month",
      perDay: "$0.17",
      note: "10 days free, then billed monthly · cancel anytime",
      trialLabel: "10 days free",
      trialDays: 10,
    });
    expect(checkoutPlanSummary("ambient")?.plan).toBe("ambient");
  });

  it("describes the ski plan (Powder Pass) with its trial — summary only, never a picker row", () => {
    expect(CHECKOUT_PLAN_SUMMARIES.ski).toEqual({
      plan: "ski",
      name: "Powder Pass",
      price: "$4.99",
      per: "/month",
      perDay: "$0.17",
      note: "10 days free, then billed monthly · cancel anytime",
      trialLabel: "10 days free",
      trialDays: 10,
    });
    expect(checkoutPlanSummary("ski")?.plan).toBe("ski");
    expect(TRIAL_PLAN_OPTIONS.some((o) => (o.plan as string) === "ski")).toBe(false);
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

describe("GRID_PLAN_SUMMARIES (Pricing Redesign Phase C)", () => {
  it("covers exactly the six Lite/Ultra grid keys", () => {
    expect(Object.keys(GRID_PLAN_SUMMARIES).sort()).toEqual([
      "lite_annual",
      "lite_monthly",
      "lite_weekly",
      "ultra_annual",
      "ultra_monthly",
      "ultra_weekly",
    ]);
  });

  it("carries the verified Stripe prices and plan-config names", () => {
    expect(GRID_PLAN_SUMMARIES.lite_weekly).toMatchObject({ name: "Lite Weekly", price: "$4.99", per: "/week" });
    expect(GRID_PLAN_SUMMARIES.lite_monthly).toMatchObject({ name: "Lite Monthly", price: "$8.99", per: "/month" });
    expect(GRID_PLAN_SUMMARIES.lite_annual).toMatchObject({ name: "Lite Annual", price: "$44.99", per: "/year" });
    expect(GRID_PLAN_SUMMARIES.ultra_weekly).toMatchObject({ name: "Ultra Weekly", price: "$12.99", per: "/week" });
    expect(GRID_PLAN_SUMMARIES.ultra_monthly).toMatchObject({ name: "Ultra Monthly", price: "$24.99", per: "/month" });
    expect(GRID_PLAN_SUMMARIES.ultra_annual).toMatchObject({ name: "Ultra Annual", price: "$149.99", per: "/year" });
  });

  it("derives each grid plan's trial from its PERIOD (weekly 3, monthly/annual 10)", () => {
    for (const key of ["lite_weekly", "ultra_weekly"] as const) {
      expect(GRID_PLAN_SUMMARIES[key].trialDays).toBe(3);
      expect(GRID_PLAN_SUMMARIES[key].trialLabel).toBe("3 days free");
    }
    for (const key of ["lite_monthly", "lite_annual", "ultra_monthly", "ultra_annual"] as const) {
      expect(GRID_PLAN_SUMMARIES[key].trialDays).toBe(10);
      expect(GRID_PLAN_SUMMARIES[key].trialLabel).toBe("10 days free");
    }
  });

  it("resolves through checkoutPlanSummary and the request body", () => {
    expect(checkoutPlanSummary("lite_monthly")?.price).toBe("$8.99");
    expect(checkoutPlanSummary("ultra_annual")?.name).toBe("Ultra Annual");
    expect(checkoutPlanSummary("pro_weekly")).toBeNull();
    expect(checkoutRequestBody("lite_weekly")).toEqual({ plan: "lite_weekly" });
    expect(checkoutRequestBody("ultra_monthly", "embedded")).toEqual({ plan: "ultra_monthly", ui: "embedded" });
    expect(checkoutPagePath("lite_annual")).toBe("/checkout?plan=lite_annual");
  });

  it("never enters the trial picker (the picker is Phase D's 9-option rewrite)", () => {
    for (const key of Object.keys(GRID_PLAN_SUMMARIES)) {
      expect(TRIAL_PLAN_OPTIONS.some((o) => (o.plan as string) === key)).toBe(false);
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

  describe("Phase E funnel event", () => {
    beforeEach(() => trackMock.mockClear());

    it("fires checkout_started as 'direct' when no surface is named", () => {
      startPlanCheckout("monthly", vi.fn());
      expect(trackMock).toHaveBeenCalledTimes(1);
      expect(trackMock).toHaveBeenCalledWith("checkout_started", "direct_monthly");
    });

    it("fires checkout_started with the initiating surface + plan", () => {
      startPlanCheckout("ultra_annual", vi.fn(), "picker");
      expect(trackMock).toHaveBeenCalledWith("checkout_started", "picker_ultra_annual");
    });

    it("fires before navigating (the event must survive the page unload)", () => {
      const order: string[] = [];
      trackMock.mockImplementation(() => void order.push("event"));
      startPlanCheckout("annual", () => void order.push("navigate"));
      expect(order).toEqual(["event", "navigate"]);
    });
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

  describe("Phase E funnel event", () => {
    beforeEach(() => trackMock.mockClear());

    it("fires checkout_started as 'hosted' on success when no surface is named", async () => {
      const { fetchImpl } = fakeFetch({ ok: true, body: { url: HOSTED_URL } });
      await startHostedCheckout("lite_monthly", { fetchImpl, navigate: vi.fn() });
      expect(trackMock).toHaveBeenCalledTimes(1);
      expect(trackMock).toHaveBeenCalledWith("checkout_started", "hosted_lite_monthly");
    });

    it("fires checkout_started with the initiating surface on success", async () => {
      const { fetchImpl } = fakeFetch({ ok: true, body: { url: HOSTED_URL } });
      await startHostedCheckout("annual", {
        fetchImpl,
        navigate: vi.fn(),
        surface: "embed",
      });
      expect(trackMock).toHaveBeenCalledWith("checkout_started", "embed_annual");
    });

    it("fires nothing when the POST is refused — no session was created", async () => {
      const { fetchImpl } = fakeFetch({
        ok: false,
        body: { error: "STRIPE_WEEKLY_PRICE_ID is not set" },
      });
      await expect(
        startHostedCheckout("weekly", { fetchImpl, navigate: vi.fn() }),
      ).rejects.toThrow("STRIPE_WEEKLY_PRICE_ID is not set");
      expect(trackMock).not.toHaveBeenCalled();
    });
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

describe("GRID_PLAN_OPTIONS (Pricing Redesign Phase D — the shared 3×3)", () => {
  it("offers exactly the nine grid plans, tier-major then period", () => {
    expect(GRID_PLAN_OPTIONS.map((o) => o.plan)).toEqual([
      "lite_weekly",
      "lite_monthly",
      "lite_annual",
      "weekly",
      "monthly",
      "annual",
      "ultra_weekly",
      "ultra_monthly",
      "ultra_annual",
    ]);
  });

  it("never includes the standalone plans (enterprise / ambient / ski)", () => {
    for (const o of GRID_PLAN_OPTIONS) {
      expect(["enterprise", "ambient", "ski"]).not.toContain(o.plan);
    }
    expect(gridPlanOption("enterprise")).toBeNull();
    expect(gridPlanOption("ambient")).toBeNull();
    expect(gridPlanOption("ski")).toBeNull();
    expect(tierForCheckoutPlan("enterprise")).toBeNull();
    expect(tierForCheckoutPlan("ambient")).toBeNull();
    expect(tierForCheckoutPlan("ski")).toBeNull();
  });

  it("derives every option's facts from its plan summary — nothing restated", () => {
    for (const o of GRID_PLAN_OPTIONS) {
      const s = checkoutPlanSummary(o.plan);
      expect(s).not.toBeNull();
      expect(o.name).toBe(s!.name);
      expect(o.price).toBe(s!.price);
      expect(o.per).toBe(s!.per);
      expect(o.perDay).toBe(s!.perDay);
      expect(o.note).toBe(s!.note);
      expect(o.trialLabel).toBe(s!.trialLabel);
      expect(o.trialDays).toBe(s!.trialDays);
    }
  });

  it("trial length follows the PERIOD for every tier (weekly 3d, monthly/annual 10d)", () => {
    for (const o of GRID_PLAN_OPTIONS) {
      expect(o.trialDays).toBe(o.period === "weekly" ? 3 : 10);
      // The CTA is the period's own /pricing wording.
      const pro = TRIAL_PLAN_OPTIONS.find((p) => p.plan === o.period)!;
      expect(o.cta).toBe(pro.cta);
      expect(o.note).toBe(pro.note);
      expect(o.trialLabel).toBe(pro.trialLabel);
    }
  });

  it("groups by tier for the picker's tabs, periods in pricing order", () => {
    for (const tier of ["lite", "pro", "ultra"] as const) {
      expect(TIER_PLAN_OPTIONS[tier].map((o) => o.period)).toEqual([
        "weekly",
        "monthly",
        "annual",
      ]);
      expect(TIER_PLAN_OPTIONS[tier].every((o) => o.tier === tier)).toBe(true);
    }
  });

  it("maps tier × period to the route's checkout keys", () => {
    expect(gridCheckoutPlan("pro", "weekly")).toBe("weekly");
    expect(gridCheckoutPlan("pro", "annual")).toBe("annual");
    expect(gridCheckoutPlan("lite", "monthly")).toBe("lite_monthly");
    expect(gridCheckoutPlan("ultra", "annual")).toBe("ultra_annual");
    expect(tierForCheckoutPlan("weekly")).toBe("pro");
    expect(tierForCheckoutPlan("annual")).toBe("pro");
    expect(tierForCheckoutPlan("lite_weekly")).toBe("lite");
    expect(tierForCheckoutPlan("ultra_monthly")).toBe("ultra");
    expect(gridPlanOption("lite_annual")?.name).toBe("Lite Annual");
    expect(gridPlanOption("annual")?.name).toBe("VIP Pro");
  });
});
