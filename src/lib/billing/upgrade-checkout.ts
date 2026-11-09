/**
 * Step 4 of the upgrade popup: mount Stripe's Embedded Checkout inside
 * the popup for one plan, with an in-popup completion (no top-page
 * redirect for the common case).
 *
 * This rides the EXISTING buy path — POST /api/checkout, the same
 * endpoint /checkout, /pricing's sheet and every lock surface use, so
 * price resolution, trials, the already-subscribed guard, affiliate
 * attribution and the webhook claim flow are shared, never forked.
 * The one addition is the request's `ui_context: "upgrade_popup"`,
 * which the route answers with redirect_on_completion "if_required"
 * (instead of the sheet/page flow's "always") and a return_url of
 * /checkout/return — the fallback landing for payment methods that do
 * need a redirect (3-D Secure and friends). Everything else about the
 * session is the route's standard embedded session.
 *
 * Lifecycle mirrors lib/billing/embedded-checkout's controller (the
 * /checkout page's rules): every start creates a FRESH session and
 * destroys the previous form first; close() destroys the mounted form;
 * a start that resolves after close (or after a newer start) has its
 * form destroyed on arrival — a generation counter.
 *
 * The popup never unlocks anything itself: completion only reports
 * back; access arrives through the existing Stripe webhooks.
 */
import { loadStripe } from "@stripe/stripe-js";
import {
  isUsablePublishableKey,
  stripePublishableKey,
  type EmbeddedCheckoutHandle,
} from "./embedded-checkout";
import { checkoutErrorFromData, CheckoutError } from "./checkout-error";
import { trackMetaEvent } from "@/lib/meta-track";
import type { CheckoutPlanId } from "./trial-checkout";

/** The slice of Stripe.js step 4 uses (@stripe/stripe-js v7 satisfies
 *  it; onComplete is part of the embedded-checkout options). */
interface UpgradeStripeJs {
  initEmbeddedCheckout: (options: {
    clientSecret: string;
    onComplete?: () => void;
  }) => Promise<EmbeddedCheckoutHandle>;
}

export type UpgradeCheckoutPhase =
  | "idle"
  | "loading"
  | "mounted"
  | "completed"
  | "error";

export interface UpgradeCheckoutCallbacks {
  onPhase: (phase: UpgradeCheckoutPhase, error?: CheckoutError) => void;
  /** The session completed inside the popup (no redirect needed). */
  onComplete: () => void;
}

export interface UpgradeCheckoutController {
  /** Mount checkout for a plan, tearing down any form mounted before. */
  start: (plan: CheckoutPlanId, mountTarget: HTMLElement | null) => Promise<void>;
  /** Destroy the mounted form (if any) and invalidate in-flight starts. */
  close: () => void;
  isActive: () => boolean;
}

export function createUpgradeCheckoutController(
  callbacks: UpgradeCheckoutCallbacks,
): UpgradeCheckoutController {
  let generation = 0;
  let liveDestroy: (() => void) | null = null;

  function teardown() {
    const destroy = liveDestroy;
    liveDestroy = null;
    try {
      destroy?.();
    } catch {
      // A Stripe teardown failure must never break the popup.
    }
  }

  return {
    async start(plan, mountTarget) {
      const gen = ++generation;
      teardown();
      const publishableKey = stripePublishableKey();
      if (!isUsablePublishableKey(publishableKey)) {
        // Embedded cannot run without the publishable key (the same
        // condition the /checkout page falls back on) — the popup
        // shows its error state with the hosted-checkout fallback.
        callbacks.onPhase("error", new CheckoutError({ serverMessage: "Couldn't load checkout. Try again" }));
        return;
      }
      callbacks.onPhase("loading");
      try {
        const stripePromise: Promise<UpgradeStripeJs | null> = Promise.resolve()
          .then(() => loadStripe(publishableKey.trim()) as Promise<UpgradeStripeJs | null>)
          .catch(() => null);
        const res = await fetch("/api/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan, ui: "embedded", ui_context: "upgrade_popup" }),
        });
        const data = (await res.json().catch(() => null)) as {
          clientSecret?: string;
          url?: string;
          metaEventId?: string;
        } | null;
        if (gen !== generation) return; // closed or superseded in flight
        if (!res.ok) throw checkoutErrorFromData(data);
        if (typeof data?.url === "string" && typeof data?.clientSecret !== "string") {
          // The route answered "go here instead" — the hosted page is
          // the checkout (the standard fallback answer).
          window.location.href = data.url;
          return;
        }
        if (typeof data?.clientSecret !== "string") {
          throw new CheckoutError({ serverMessage: "Couldn't load checkout. Try again" });
        }
        if (typeof data?.metaEventId === "string") {
          trackMetaEvent("InitiateCheckout", {}, data.metaEventId);
        }
        const stripeJs = await stripePromise;
        if (gen !== generation) return;
        if (!stripeJs || !mountTarget) {
          throw new CheckoutError({ serverMessage: "Couldn't load checkout. Try again" });
        }
        const handle = await stripeJs.initEmbeddedCheckout({
          clientSecret: data.clientSecret,
          onComplete: () => {
            if (gen !== generation) return;
            callbacks.onPhase("completed");
            callbacks.onComplete();
          },
        });
        if (gen !== generation) {
          handle.destroy();
          return;
        }
        handle.mount(mountTarget);
        liveDestroy = () => handle.destroy();
        callbacks.onPhase("mounted");
      } catch (e) {
        if (gen !== generation) return;
        callbacks.onPhase(
          "error",
          e instanceof CheckoutError ? e : new CheckoutError({ serverMessage: "Couldn't load checkout. Try again" }),
        );
      }
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
