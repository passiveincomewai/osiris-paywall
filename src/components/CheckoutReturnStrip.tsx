"use client";

/**
 * Checkout-cancel recovery strip (see lib/billing/checkout-return.ts for
 * the rules). Stripe's cancel_url has always returned abandoners to
 * /pricing?checkout=cancelled; until now that param was ignored and the
 * visitor landed on the full pricing page with no acknowledgement that
 * they'd just been mid-checkout. This strip meets them there: the trial
 * is still waiting, nothing was charged, and the picker below is the
 * same one every Pro lock uses — /pricing's own words, the same
 * startPlanCheckout call, current prices read from the plan config.
 * Shown once per session; the X retires it for the session.
 */

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import TrialPicker from "./TrialPicker";
import EmailCaptureCard from "./EmailCaptureCard";
import {
  CHECKOUT_RETURN_DISMISSED_KEY,
  shouldShowCheckoutReturn,
} from "@/lib/billing/checkout-return";

export default function CheckoutReturnStrip() {
  const params = useSearchParams();
  // null = session storage not read yet (first paint / SSR): render
  // nothing rather than flash the strip at visitors it isn't for.
  const [dismissed, setDismissed] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      setDismissed(sessionStorage.getItem(CHECKOUT_RETURN_DISMISSED_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  if (dismissed === null) return null;
  if (!shouldShowCheckoutReturn(params.get("checkout"), dismissed)) return null;

  const dismiss = () => {
    try {
      sessionStorage.setItem(CHECKOUT_RETURN_DISMISSED_KEY, "1");
    } catch {
      /* storage blocked — the state below still hides it for this view */
    }
    setDismissed(true);
  };

  return (
    <div className="bg-[#050508] text-zinc-100">
      <section
        aria-label="Your free trial is still waiting"
        className="relative mx-auto max-w-5xl px-6 pt-6"
      >
        <div className="relative rounded-3xl border border-[#D4AF37]/35 bg-gradient-to-b from-[#D4AF37]/[0.08] to-white/[0.02] p-5 md:p-6">
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss"
            className="absolute right-2 top-2 rounded-full p-3 text-white/40 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
          <h2 className="pr-10 text-lg font-bold tracking-tight text-white">
            Your free trial is still waiting
          </h2>
          <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-white/55">
            You left checkout before finishing — nothing was charged and no trial was
            started. Pick a plan to start your free trial now; you won&rsquo;t be
            charged until the trial ends.
          </p>
          <div className="mt-4 max-w-md">
            <TrialPicker />
          </div>
          {/* Email capture inside the same flow (not a second element):
              for the abandoner who isn't converting today, one honest
              ask — retired on this device by either answer
              (lib/newsletter/capture). */}
          <div className="mt-5 max-w-md border-t border-white/10 pt-4">
            <EmailCaptureCard placement="pricing" variant="inline" />
          </div>
        </div>
      </section>
    </div>
  );
}
