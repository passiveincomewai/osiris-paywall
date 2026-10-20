// The /checkout page's decision tree, proven with fakes: embedded when a
// publishable key is configured, the hosted redirect for ANY embedded
// failure — no key, server error, Stripe.js unavailable, mount throwing.
// The buy path must never hard-break because the nicer presentation did.
import { describe, it, expect, vi } from "vitest";
import {
  checkoutPlanFromParam,
  isUsablePublishableKey,
  runCheckoutFlow,
  stripePublishableKey,
  type CheckoutFlowDeps,
  type EmbeddedCheckoutHandle,
} from "./embedded-checkout";

describe("checkoutPlanFromParam", () => {
  it("accepts exactly the four billing plans", () => {
    for (const p of ["weekly", "monthly", "annual", "enterprise"] as const) {
      expect(checkoutPlanFromParam(p)).toBe(p);
    }
  });

  it("rejects anything else, including missing and miscased values", () => {
    for (const raw of [null, undefined, "", "daily", "WEEKLY", "pro"]) {
      expect(checkoutPlanFromParam(raw)).toBeNull();
    }
  });
});

describe("stripePublishableKey / isUsablePublishableKey", () => {
  it("reads NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY from the env only", () => {
    expect(stripePublishableKey({ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_live_abc" })).toBe("pk_live_abc");
    expect(stripePublishableKey({})).toBeUndefined();
  });

  it("treats only pk_live_/pk_test_ values as usable", () => {
    expect(isUsablePublishableKey("pk_live_abc")).toBe(true);
    expect(isUsablePublishableKey("pk_test_abc")).toBe(true);
    expect(isUsablePublishableKey("sk_live_abc")).toBe(false);
    expect(isUsablePublishableKey("")).toBe(false);
    expect(isUsablePublishableKey(undefined)).toBe(false);
  });
});

interface Step { ok: boolean; body: any }

function fakeDeps(steps: Step[], overrides: Partial<CheckoutFlowDeps> = {}) {
  const queue = [...steps];
  const calls: { url: string; body: any }[] = [];
  const handle: EmbeddedCheckoutHandle = {
    mount: vi.fn(),
    destroy: vi.fn(),
  };
  const stripeJs = {
    initEmbeddedCheckout: vi.fn(async () => handle),
  };
  const deps: CheckoutFlowDeps = {
    fetchImpl: vi.fn(async (input: string, init: RequestInit) => {
      const step = queue.shift() ?? { ok: false, body: { error: "unexpected fetch" } };
      calls.push({ url: input, body: JSON.parse(String(init.body)) });
      return { ok: step.ok, json: async () => step.body };
    }),
    loadStripeImpl: vi.fn(async () => stripeJs),
    navigate: vi.fn(),
    mountTarget: { id: "mount" },
    ...overrides,
  };
  return { deps, calls, handle, stripeJs };
}

const HOSTED_URL = "https://checkout.stripe.com/c/pay/cs_test_123";

describe("runCheckoutFlow", () => {
  it("without a publishable key, goes straight to the hosted redirect (old behavior)", async () => {
    const { deps, calls } = fakeDeps([{ ok: true, body: { url: HOSTED_URL } }]);
    const outcome = await runCheckoutFlow("monthly", undefined, deps);
    expect(outcome).toEqual({ kind: "navigated", url: HOSTED_URL });
    expect(calls).toEqual([{ url: "/api/checkout", body: { plan: "monthly" } }]);
    expect(deps.loadStripeImpl).not.toHaveBeenCalled();
    expect(deps.navigate).toHaveBeenCalledWith(HOSTED_URL);
  });

  it("with a key, mounts the embedded form from the returned clientSecret", async () => {
    const { deps, calls, handle, stripeJs } = fakeDeps([
      { ok: true, body: { clientSecret: "cs_test_123_secret_xyz" } },
    ]);
    const outcome = await runCheckoutFlow("annual", "pk_live_abc", deps);
    expect(outcome.kind).toBe("mounted");
    expect(calls).toEqual([
      { url: "/api/checkout", body: { plan: "annual", ui: "embedded" } },
    ]);
    expect(deps.loadStripeImpl).toHaveBeenCalledWith("pk_live_abc");
    expect(stripeJs.initEmbeddedCheckout).toHaveBeenCalledWith({
      clientSecret: "cs_test_123_secret_xyz",
    });
    expect(handle.mount).toHaveBeenCalledWith(deps.mountTarget);
    expect(deps.navigate).not.toHaveBeenCalled();
    // The outcome's destroy tears the mounted form down.
    if (outcome.kind === "mounted") outcome.destroy();
    expect(handle.destroy).toHaveBeenCalledTimes(1);
  });

  it("honors a {url} answer to an embedded request (already-active member)", async () => {
    const { deps } = fakeDeps([{ ok: true, body: { url: "/dashboard" } }]);
    const outcome = await runCheckoutFlow("weekly", "pk_live_abc", deps);
    expect(outcome).toEqual({ kind: "navigated", url: "/dashboard" });
    expect(deps.loadStripeImpl).not.toHaveBeenCalled();
    expect(deps.navigate).toHaveBeenCalledWith("/dashboard");
  });

  it("falls back to hosted when initEmbeddedCheckout throws", async () => {
    const { deps, calls } = fakeDeps(
      [
        { ok: true, body: { clientSecret: "cs_test_123_secret_xyz" } },
        { ok: true, body: { url: HOSTED_URL } },
      ],
      {
        loadStripeImpl: vi.fn(async () => ({
          initEmbeddedCheckout: vi.fn(async () => {
            throw new Error("mount blew up");
          }),
        })),
      },
    );
    const outcome = await runCheckoutFlow("weekly", "pk_live_abc", deps);
    expect(outcome).toEqual({ kind: "navigated", url: HOSTED_URL });
    expect(calls.map((c) => c.body)).toEqual([
      { plan: "weekly", ui: "embedded" },
      { plan: "weekly" },
    ]);
  });

  it("falls back to hosted when Stripe.js fails to load (null)", async () => {
    const { deps } = fakeDeps(
      [
        { ok: true, body: { clientSecret: "cs_test_123_secret_xyz" } },
        { ok: true, body: { url: HOSTED_URL } },
      ],
      { loadStripeImpl: vi.fn(async () => null) },
    );
    const outcome = await runCheckoutFlow("weekly", "pk_test_abc", deps);
    expect(outcome).toEqual({ kind: "navigated", url: HOSTED_URL });
  });

  it("falls back to hosted when the embedded POST itself fails", async () => {
    const { deps, calls } = fakeDeps([
      { ok: false, body: { error: "embedded unavailable" } },
      { ok: true, body: { url: HOSTED_URL } },
    ]);
    const outcome = await runCheckoutFlow("enterprise", "pk_live_abc", deps);
    expect(outcome).toEqual({ kind: "navigated", url: HOSTED_URL });
    expect(calls).toHaveLength(2);
    expect(deps.loadStripeImpl).not.toHaveBeenCalled();
  });

  it("surfaces the server's error when even the hosted fallback fails", async () => {
    const { deps } = fakeDeps([
      { ok: false, body: { error: "embedded unavailable" } },
      { ok: false, body: { error: "STRIPE_WEEKLY_PRICE_ID is not set" } },
    ]);
    await expect(runCheckoutFlow("weekly", "pk_live_abc", deps)).rejects.toThrow(
      "STRIPE_WEEKLY_PRICE_ID is not set",
    );
  });

  it("throws the generic failure when the hosted answer carries no URL", async () => {
    const { deps } = fakeDeps([{ ok: true, body: {} }]);
    await expect(runCheckoutFlow("annual", undefined, deps)).rejects.toThrow("Checkout failed");
  });
});
