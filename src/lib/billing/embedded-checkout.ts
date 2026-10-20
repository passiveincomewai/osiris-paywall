/**
 * The /checkout page's flow: mount Stripe's embedded form when that's
 * possible, and fall back to the hosted redirect for ANY reason it isn't —
 * the buy path must never hard-break because the nicer presentation failed.
 *
 * Embedded requires NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY in the environment
 * (the hosted redirect never needed one: the browser only ever saw
 * checkout.stripe.com). Until that key is published, every checkout takes
 * the fallback: POST /api/checkout without ui:"embedded" and navigate to
 * the returned hosted url — byte-for-byte the pre-embedded behavior.
 * The same fallback covers a failed embedded POST, Stripe.js failing to
 * load, and initEmbeddedCheckout throwing.
 *
 * This module is deliberately free of Stripe SDK imports: the page passes
 * loadStripe in as a dependency, so the whole decision tree is testable
 * with fakes (embedded-checkout.test.ts is the fallback proof).
 */
import { checkoutRequestBody } from "./trial-checkout";
import type { BillingPlan } from "./trials";

type FetchLike = (input: string, init: RequestInit) => Promise<{
  ok: boolean;
  json: () => Promise<any>;
}>;

/** The slice of Stripe.js the flow uses — @stripe/stripe-js satisfies it. */
export interface EmbeddedCheckoutHandle {
  mount: (target: unknown) => void;
  destroy: () => void;
}
export interface StripeJsLike {
  initEmbeddedCheckout: (options: {
    clientSecret: string;
  }) => Promise<EmbeddedCheckoutHandle>;
}

export interface CheckoutFlowDeps {
  fetchImpl: FetchLike;
  /** loadStripe from @stripe/stripe-js, or a fake in tests. */
  loadStripeImpl: (publishableKey: string) => Promise<StripeJsLike | null>;
  navigate: (url: string) => void;
  /** The element the embedded form mounts into (opaque to this module). */
  mountTarget: unknown;
}

export type CheckoutFlowOutcome =
  | { kind: "mounted"; destroy: () => void }
  | { kind: "navigated"; url: string };

/**
 * The publishable key the embedded form needs, read from the environment.
 * Code reads it from env ONLY — it is never hardcoded. In the browser
 * bundle Next inlines this literal access at build time.
 */
export function stripePublishableKey(
  env: Record<string, string | undefined> = process.env,
): string | undefined {
  return env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
}

/** A publishable key is usable when it looks like one (pk_live_/pk_test_). */
export function isUsablePublishableKey(key: string | undefined): key is string {
  return typeof key === "string" && /^pk_(live|test)_/.test(key.trim());
}

/** Validate a raw ?plan= value; anything unknown is not a plan. */
export function checkoutPlanFromParam(raw: string | null | undefined): BillingPlan | null {
  return raw === "weekly" || raw === "monthly" || raw === "annual" || raw === "enterprise"
    ? raw
    : null;
}

async function postCheckout(
  fetchImpl: FetchLike,
  plan: BillingPlan,
  ui?: "embedded",
): Promise<{ ok: boolean; data: any }> {
  const res = await fetchImpl("/api/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(checkoutRequestBody(plan, ui)),
  });
  const data = await res.json().catch(() => null);
  return { ok: res.ok, data };
}

/**
 * Run checkout for a plan. Embedded first when a usable publishable key
 * exists; the hosted redirect on any embedded failure. Resolves once the
 * form is mounted or navigation has been issued; throws only when the
 * hosted fallback itself fails (carrying the server's error message).
 *
 * One server answer short-circuits both modes: {url} from an embedded
 * request means "go here instead" — the route returns it for members who
 * already hold an active pass ({url:"/dashboard"}).
 */
export async function runCheckoutFlow(
  plan: BillingPlan,
  publishableKey: string | undefined,
  deps: CheckoutFlowDeps,
): Promise<CheckoutFlowOutcome> {
  if (isUsablePublishableKey(publishableKey)) {
    try {
      const res = await postCheckout(deps.fetchImpl, plan, "embedded");
      if (res.ok && typeof res.data?.clientSecret === "string") {
        const stripeJs = await deps.loadStripeImpl(publishableKey.trim());
        if (stripeJs) {
          const handle = await stripeJs.initEmbeddedCheckout({
            clientSecret: res.data.clientSecret,
          });
          handle.mount(deps.mountTarget);
          return { kind: "mounted", destroy: () => handle.destroy() };
        }
      } else if (res.ok && typeof res.data?.url === "string") {
        deps.navigate(res.data.url);
        return { kind: "navigated", url: res.data.url };
      }
      // Every other embedded outcome falls through to hosted.
    } catch {
      // Embedded failed (network, Stripe.js, mount) — hosted is the net.
    }
  }

  const res = await postCheckout(deps.fetchImpl, plan);
  if (res.ok && typeof res.data?.url === "string") {
    deps.navigate(res.data.url);
    return { kind: "navigated", url: res.data.url };
  }
  throw new Error(res.data?.error || "Checkout failed");
}

export interface CheckoutSessionController {
  /** Run the flow for a plan, tearing down any form mounted before. */
  start: (
    plan: BillingPlan,
    publishableKey: string | undefined,
    deps: CheckoutFlowDeps,
  ) => Promise<CheckoutFlowOutcome>;
  /** Destroy the mounted form (if any) and invalidate in-flight starts. */
  close: () => void;
  /** Whether a form is currently mounted under this controller. */
  isActive: () => boolean;
}

/**
 * Owns one embedded form's lifecycle for surfaces that can open, close
 * and reopen checkout without leaving the page — /pricing's checkout
 * sheet. Guarantees the sheet's rules:
 *  - every start creates a FRESH session (the previous form is destroyed
 *    before the new flow runs);
 *  - close() destroys the mounted form, so a closed sheet leaks no live
 *    Stripe iframe;
 *  - a start that resolves after close() (or after a newer start) has
 *    its form destroyed on arrival instead of being kept — a generation
 *    counter, the same guard /checkout's page effect applies inline.
 */
export function createCheckoutSessionController(): CheckoutSessionController {
  let generation = 0;
  let liveDestroy: (() => void) | null = null;

  function teardown() {
    const destroy = liveDestroy;
    liveDestroy = null;
    destroy?.();
  }

  return {
    async start(plan, publishableKey, deps) {
      const gen = ++generation;
      teardown();
      const outcome = await runCheckoutFlow(plan, publishableKey, deps);
      if (outcome.kind === "mounted") {
        if (gen !== generation) {
          // Closed or superseded while the flow was in flight — tear the
          // late form down rather than keeping a session nobody sees.
          outcome.destroy();
        } else {
          liveDestroy = outcome.destroy;
        }
      }
      return outcome;
    },
    close() {
      generation++;
      teardown();
    },
    isActive() {
      return liveDestroy !== null;
    },
  };
}
