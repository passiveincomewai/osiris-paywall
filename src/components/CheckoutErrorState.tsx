"use client";

/**
 * The failure state shared by every embedded-checkout surface
 * (components/EmbeddedCheckoutBody — /pricing's sheet and TrialPicker's
 * popups — and /checkout's CheckoutClient). One component so the three
 * can never drift back into divergent dead ends.
 *
 * What the buyer gets depends on WHY checkout refused
 * (lib/billing/checkout-error):
 *  - already subscribed (the guard's definitive 409): the server's own
 *    message and a primary "Manage subscription" action to
 *    /settings/subscription. NO "Try again" — the identical retry is
 *    guaranteed to be refused identically; that button was the dead
 *    end in the owner's screenshot.
 *  - anything else (a server refusal with its own words, or a genuine
 *    transient failure): the message (verbatim when the server sent
 *    one), "Try again" for a fresh session, AND the hosted route —
 *    "Continue to secure checkout" runs the deliberate hosted flow
 *    (trial-checkout's startHostedCheckout) so no failure state strands
 *    the buyer on this form. If the hosted attempt is itself refused,
 *    its refusal replaces this one (an already-subscribed answer there
 *    flips this state into the manage variant above).
 */
import { useState } from "react";
import Link from "next/link";
import { startHostedCheckout } from "@/lib/billing/trial-checkout";
import {
  toCheckoutError,
  type CheckoutError,
} from "@/lib/billing/checkout-error";
import type { CheckoutPlanId } from "@/lib/billing/trial-checkout";
import type { PickerSurface } from "@/lib/billing/picker-analytics";

export const CHECKOUT_RETRY_LABEL = "Try again";
export const HOSTED_FALLBACK_LABEL = "Continue to secure checkout";
export const MANAGE_SUBSCRIPTION_LABEL = "Manage subscription";

export default function CheckoutErrorState({
  plan,
  error,
  onRetry,
  onError,
  surface,
}: {
  plan: CheckoutPlanId;
  error: CheckoutError;
  /** Start a brand-new embedded session. */
  onRetry: () => void;
  /** Replace the current refusal with a newer one (hosted attempt's). */
  onError: (next: CheckoutError) => void;
  /** Phase E funnel attribution for the hosted fallback, inherited
   *  from the hosting checkout body (lib/billing/picker-analytics);
   *  "hosted" when unnamed. */
  surface?: PickerSurface;
}) {
  const [hostedBusy, setHostedBusy] = useState(false);

  async function openHosted() {
    setHostedBusy(true);
    try {
      await startHostedCheckout(plan, { surface });
      // Navigation to Stripe is under way; stay busy so a second tap
      // can't start a second session.
    } catch (e) {
      setHostedBusy(false);
      onError(toCheckoutError(e));
    }
  }

  return (
    <>
      <p className="text-red-400 text-sm">{error.message}</p>
      {error.alreadySubscribed ? (
        <Link
          href={error.managePath}
          className="mt-4 px-6 py-2.5 rounded-2xl bg-[#D4AF37] text-black font-bold text-sm hover:brightness-110 transition"
        >
          {MANAGE_SUBSCRIPTION_LABEL}
        </Link>
      ) : (
        <div className="mt-4 flex flex-col items-center gap-2.5">
          <button
            type="button"
            onClick={onRetry}
            className="px-6 py-2.5 rounded-2xl bg-[#D4AF37] text-black font-bold text-sm hover:brightness-110 transition"
          >
            {CHECKOUT_RETRY_LABEL}
          </button>
          <button
            type="button"
            onClick={openHosted}
            disabled={hostedBusy}
            className="text-xs text-white/50 underline decoration-white/25 underline-offset-4 hover:text-white/80 transition disabled:opacity-50"
          >
            {hostedBusy ? "Opening secure checkout…" : HOSTED_FALLBACK_LABEL}
          </button>
        </div>
      )}
    </>
  );
}
