"use client";

// The TrialCtaSection plan cards (client half): plan facts come from the
// billing config — TRIAL_PLAN_OPTIONS carries names, prices, per-day
// figures and trial notes, never restated here. Each card's button is the
// owner's trial artwork (TrialButton) and opens the embedded Stripe
// checkout IN PLACE for that plan (CheckoutSheet) — no /pricing detour
// and, per the owner's order, no hosted payment-link option on these
// surfaces (hideHostedOption).
import { useState } from "react";
import { TRIAL_PLAN_OPTIONS } from "@/lib/billing/trial-checkout";
import type { BillingPlan } from "@/lib/billing/trials";
import CheckoutSheet from "./CheckoutSheet";
import { preloadStripeJs } from "@/lib/billing/stripe-preload";
import TrialButton from "./TrialButton";

export default function TrialCtaCards() {
  const [sheetPlan, setSheetPlan] = useState<BillingPlan | null>(null);
  return (
    <>
      <div
        className="mt-8 grid gap-4 sm:grid-cols-3"
        onPointerEnter={() => preloadStripeJs()}
        onFocus={() => preloadStripeJs()}
      >
        {TRIAL_PLAN_OPTIONS.map((p) => (
          <div
            key={p.plan}
            className="flex flex-col rounded-3xl border border-white/10 bg-white/[0.02] p-6 text-center"
          >
            <p className="text-xs font-semibold tracking-[0.25em] text-[#00E5FF]">
              {p.trialLabel.toUpperCase()}
            </p>
            <p className="font-display mt-3 text-xl font-semibold">{p.name}</p>
            <p className="mt-2">
              <span className="font-mono text-3xl font-bold">{p.price}</span>
              <span className="text-sm text-white/50">{p.per}</span>
            </p>
            <p className="mt-1 text-xs text-white/40">about {p.perDay} a day</p>
            <p className="mt-3 text-xs leading-relaxed text-white/50">{p.note}</p>
            <div className="mt-auto pt-5">
              <TrialButton
                label={p.cta}
                days={p.trialDays === 3 ? 3 : 10}
                onClick={() => setSheetPlan(p.plan)}
                className="w-full"
              />
            </div>
          </div>
        ))}
      </div>
      <CheckoutSheet
        plan={sheetPlan}
        onClose={() => setSheetPlan(null)}
        hideHostedOption
      />
    </>
  );
}
