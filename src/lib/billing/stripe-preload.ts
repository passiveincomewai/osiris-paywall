/**
 * Warm Stripe.js before the click that needs it.
 *
 * The embedded flow (lib/billing/embedded-checkout) already starts
 * loadStripe() in parallel with the session POST once a checkout
 * surface mounts — but on the sheet surfaces (/pricing's plan cards,
 * the TrialCtaSection cards) the mount happens ON the click, so a
 * slow Stripe.js fetch still gates the form even when the POST wins
 * the race. Calling this on page mount (/pricing) or on first intent
 * (pointer/focus over a trial card elsewhere) puts the script in
 * cache ahead of the click; @stripe/stripe-js memoizes the load, so
 * the flow's own call then resolves instantly. Fire-and-forget: a
 * failed preload just leaves the flow exactly as it was.
 */
import { loadStripe } from "@stripe/stripe-js";
import { isUsablePublishableKey } from "./embedded-checkout";

let started = false;

export function preloadStripeJs(
  publishableKey: string | undefined = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
): void {
  if (started || !isUsablePublishableKey(publishableKey)) return;
  started = true;
  void loadStripe(publishableKey.trim()).catch(() => {
    // Allow a later intent to retry — the flow itself still loads
    // Stripe.js on demand either way.
    started = false;
  });
}
