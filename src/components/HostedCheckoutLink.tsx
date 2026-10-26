"use client";

/**
 * The hosted-checkout option, offered everywhere the embedded form is
 * (Jameson: "keep an option to use main stripe checkout too"): a quiet
 * text link that runs the HOSTED flow — POST /api/checkout without ui,
 * navigate to Stripe's page, return via the session URLs afterwards
 * (lib/billing/trial-checkout's startHostedCheckout). The caption says
 * plainly that it leaves worldeye.app, so nobody taps it expecting to
 * stay on this page.
 */
import { useState } from "react";
import Link from "next/link";
import { startHostedCheckout } from "@/lib/billing/trial-checkout";
import {
  toCheckoutError,
  type CheckoutError,
} from "@/lib/billing/checkout-error";
import type { BillingPlan } from "@/lib/billing/trials";

export const HOSTED_CHECKOUT_LABEL = "Continue on Stripe instead →";
export const HOSTED_CHECKOUT_CAPTION =
  "Opens Stripe's hosted checkout page — you come back here when you're done.";

export default function HostedCheckoutLink({
  plan,
  className = "",
  caption = true,
}: {
  plan: BillingPlan;
  className?: string;
  caption?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<CheckoutError | null>(null);

  async function open() {
    setBusy(true);
    setError(null);
    try {
      await startHostedCheckout(plan);
      // Navigation to Stripe is under way; stay busy so a second tap
      // can't start a second session.
    } catch (e) {
      setError(toCheckoutError(e));
      setBusy(false);
    }
  }

  return (
    <span className={`inline-block ${className}`}>
      <button
        type="button"
        onClick={open}
        disabled={busy}
        className="text-xs text-white/40 underline decoration-white/25 underline-offset-4 hover:text-white/75 transition disabled:opacity-50"
      >
        {busy ? "Opening Stripe…" : HOSTED_CHECKOUT_LABEL}
      </button>
      {caption && !error && (
        <span className="block mt-1 text-[11px] leading-snug text-white/30">
          {HOSTED_CHECKOUT_CAPTION}
        </span>
      )}
      {error && (
        <span className="block mt-1 text-[11px] leading-snug text-red-400">
          {error.message}
          {error.alreadySubscribed && (
            <>
              {" "}
              <Link
                href={error.managePath}
                className="underline decoration-red-400/50 underline-offset-2 hover:text-red-300"
              >
                Manage subscription
              </Link>
            </>
          )}
        </span>
      )}
    </span>
  );
}
