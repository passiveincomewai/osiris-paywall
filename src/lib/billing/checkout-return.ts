/**
 * Checkout-cancel recovery — the decision half of the strip that greets
 * a visitor Stripe sends back to /pricing?checkout=cancelled.
 *
 * The rules are deliberately plain: show only to someone who actually
 * abandoned a checkout (the cancel_url the checkout route has always
 * used), and only once per session — dismissing it, or simply having
 * seen it in this session after a dismissal, keeps it gone. No urgency
 * copy, no countdown, no second nag: the trial is simply still there,
 * which is true — abandoning checkout starts nothing and charges
 * nothing, and the same plans remain on offer below.
 */

export const CHECKOUT_RETURN_DISMISSED_KEY = "worldeye.checkoutReturnDismissed";

export function shouldShowCheckoutReturn(
  checkoutParam: string | null | undefined,
  dismissed: boolean,
): boolean {
  return checkoutParam === "cancelled" && !dismissed;
}
