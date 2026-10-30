"use client";

/**
 * /pricing's in-place checkout: the embedded Stripe form opens in a
 * sheet (bottom sheet on mobile, centered dialog on desktop) instead of
 * navigating to /checkout — the visitor keeps their place on the page
 * and the form's express wallet buttons lead with zero scroll.
 *
 * This component is only the sheet's chrome (backdrop, entrance,
 * scroll lock, close). The checkout itself — plan strip, form mount,
 * guarantee, hosted option, and the whole session lifecycle owned by a
 * CheckoutSessionController — is components/EmbeddedCheckoutBody,
 * shared with TrialPicker's embedded mode so the two surfaces can
 * never drift. Everything behind it is the same Checkout-Session
 * machinery as /checkout — webhook account claim, affiliate metadata,
 * abandoned-cart recovery, /welcome completion — nothing forks.
 *
 * Closing is NOT a Stripe cancel: the sheet closes locally and returns
 * the visitor to exactly where they were on /pricing. No navigation, no
 * ?checkout=cancelled (that param is reserved for Stripe's cancel_url,
 * which the cancel-recovery strip keys off), and the /checkout back-link
 * path fires no analytics event, so there is nothing to mirror.
 */
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { checkoutPlanSummary, type CheckoutPlanId } from "@/lib/billing/trial-checkout";
import type { PickerSurface } from "@/lib/billing/picker-analytics";
import EmbeddedCheckoutBody from "./EmbeddedCheckoutBody";

export default function CheckoutSheet({
  plan,
  onClose,
  hideHostedOption = false,
  analyticsSurface,
}: {
  plan: CheckoutPlanId | null;
  onClose: () => void;
  hideHostedOption?: boolean;
  /** Phase E funnel attribution, passed through to the checkout
   *  body (lib/billing/picker-analytics). Hosts that name none
   *  record "sheet". */
  analyticsSurface?: PickerSurface;
}) {
  // A fresh SheetContent per open (keyed by an incrementing sequence),
  // so a reopened sheet never inherits the previous session's state —
  // its mount effect, scroll lock and controller all start clean.
  const [seq, setSeq] = useState(0);
  const [prevPlan, setPrevPlan] = useState(plan);
  if (plan !== prevPlan) {
    setPrevPlan(plan);
    if (plan) setSeq((s) => s + 1);
  }
  if (!plan) return null;
  return <SheetContent key={`${seq}:${plan}`} plan={plan} onClose={onClose} hideHostedOption={hideHostedOption} analyticsSurface={analyticsSurface} />;
}

function SheetContent({
  plan,
  onClose,
  hideHostedOption = false,
  analyticsSurface,
}: {
  plan: CheckoutPlanId;
  onClose: () => void;
  hideHostedOption?: boolean;
  analyticsSurface?: PickerSurface;
}) {
  const summary = checkoutPlanSummary(plan);
  const [entered, setEntered] = useState(false);

  // Entrance transition (slide up on mobile, fade/zoom on desktop).
  useEffect(() => {
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  // Page scroll lock + Escape-to-close while the sheet is open.
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  if (!summary) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end md:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={`Checkout — ${summary.name} plan`}
    >
      <div
        className={`absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-200 ${
          entered ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />
      <div
        className={`relative w-full md:max-w-lg max-h-[92dvh] overflow-y-auto rounded-t-3xl md:rounded-3xl border border-white/10 bg-[#0a0a10] p-4 md:p-5 shadow-2xl transition-all duration-200 ${
          entered
            ? "translate-y-0 opacity-100"
            : "translate-y-6 md:translate-y-2 opacity-0"
        }`}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close checkout"
          className="absolute right-3 top-3 z-10 w-8 h-8 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center text-white/60 hover:text-white transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* pr-9: clearance for the close button overlaying the strip. */}
        <EmbeddedCheckoutBody plan={plan} stripClassName="pr-9" hideHostedOption={hideHostedOption} analyticsSurface={analyticsSurface} />
      </div>
    </div>
  );
}
