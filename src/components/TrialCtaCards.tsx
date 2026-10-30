"use client";

// The TrialCtaSection plan cards (client half): three TIER cards —
// Lite / Pro / Ultra — each carrying its three period rows from the
// billing config (TIER_PLAN_OPTIONS: names, prices, per-day figures,
// trial notes and labels, never restated here), a period radio choice
// per card, and the owner's trial-artwork button (TrialButton) for
// the card's selected period, opening the embedded Stripe checkout IN
// PLACE for that plan (CheckoutSheet) — no /pricing detour and, per
// the owner's order, no hosted payment-link option on these surfaces
// (hideHostedOption).
//
// Phase D (Pricing Redesign, 2026-10-30): the cards used to be the
// three Pro periods only; they are now the same 3×3 grid /pricing and
// the shared picker sell, so a content page's end-of-article offer can
// no longer drift from the real plans. Every option's facts render in
// its row; the CTA always names the selected option's own trial
// (weekly selections say 3 days — never a hard-coded 10).
import { useEffect, useRef, useState } from "react";
import {
  TIER_PLAN_OPTIONS,
  gridCheckoutPlan,
  type CheckoutPlanId,
  type PlanTier,
  type TrialPlan,
} from "@/lib/billing/trial-checkout";
import {
  trackPickerOpened,
  trackPlanSelected,
} from "@/lib/billing/picker-analytics";
import CheckoutSheet from "./CheckoutSheet";
import { preloadStripeJs } from "@/lib/billing/stripe-preload";
import TrialButton from "./TrialButton";

/** Per-tier accents — the same colours as /pricing's grid. */
const TIER_ACCENTS: Record<PlanTier, { text: string; border: string }> = {
  lite: { text: "text-[#00E5FF]", border: "border-[#00E5FF]/40" },
  pro: { text: "text-[#D4AF37]", border: "border-[#D4AF37]/50" },
  ultra: { text: "text-[#a78bfa]", border: "border-[#a78bfa]/40" },
};

const TIER_LABELS: Record<PlanTier, string> = {
  lite: "Lite",
  pro: "Pro",
  ultra: "Ultra",
};

function TierCard({ tier }: { tier: PlanTier }) {
  const options = TIER_PLAN_OPTIONS[tier];
  const [period, setPeriod] = useState<TrialPlan>("annual");
  const [sheetPlan, setSheetPlan] = useState<CheckoutPlanId | null>(null);
  const selected = options.find((o) => o.period === period) ?? options[0];
  const accent = TIER_ACCENTS[tier];

  function choosePeriod(next: TrialPlan) {
    // Phase E funnel: the card's selection state is exact, so the
    // event carries the resulting plan of this tier × period.
    if (next !== period) trackPlanSelected("cta", gridCheckoutPlan(tier, next));
    setPeriod(next);
  }

  return (
    <div
      className={`flex flex-col rounded-3xl border bg-white/[0.02] p-6 ${accent.border}`}
    >
      <p className={`text-xs font-semibold tracking-[0.25em] ${accent.text}`}>
        {selected.trialLabel.toUpperCase()}
      </p>
      <p className="font-display mt-3 text-xl font-semibold">{TIER_LABELS[tier]}</p>

      <div className="mt-4 flex flex-col gap-1.5" role="radiogroup" aria-label={`Choose a ${TIER_LABELS[tier]} plan`}>
        {options.map((o) => {
          const active = o.period === period;
          return (
            <button
              key={o.plan}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => choosePeriod(o.period)}
              className={`rounded-xl border px-3 py-2 text-left transition ${
                active
                  ? "border-white/35 bg-white/[0.05]"
                  : "border-white/10 bg-white/[0.02] hover:border-white/25"
              }`}
            >
              <span className="flex items-baseline gap-2">
                <span className="font-mono text-lg font-bold">
                  {o.price}
                  <span className="text-xs text-white/50 font-medium">{o.per}</span>
                </span>
                <span className="text-[10px] font-mono uppercase tracking-wider text-white/50">
                  {o.name}
                </span>
                <span className="ml-auto text-[9px] font-bold uppercase tracking-wide text-emerald-300">
                  {o.trialLabel.toUpperCase()}
                </span>
              </span>
              <span className="mt-0.5 block text-[11px] leading-relaxed text-white/45">
                {o.note}
              </span>
            </button>
          );
        })}
      </div>

      <p className="mt-3 text-center text-xs text-white/40">
        about {selected.perDay} a day
      </p>
      <div className="mt-auto pt-4">
        <TrialButton
          label={selected.cta}
          days={selected.trialDays === 3 ? 3 : 10}
          onClick={() => setSheetPlan(gridCheckoutPlan(tier, period))}
          className="w-full"
        />
      </div>
      <CheckoutSheet
        plan={sheetPlan}
        onClose={() => setSheetPlan(null)}
        hideHostedOption
        analyticsSurface="cta"
      />
    </div>
  );
}

export default function TrialCtaCards() {
  // Phase E funnel: one picker_opened when the section is actually
  // seen (IntersectionObserver, the EmailCaptureCard impression
  // pattern) — the headline plan is the middle card's default,
  // Pro annual. Fires immediately where IO doesn't exist.
  const sectionRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      trackPickerOpened("cta", "annual");
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          trackPickerOpened("cta", "annual");
          io.disconnect();
        }
      },
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={sectionRef}
      className="mt-8 grid gap-4 sm:grid-cols-3"
      onPointerEnter={() => preloadStripeJs()}
      onFocus={() => preloadStripeJs()}
    >
      {(Object.keys(TIER_PLAN_OPTIONS) as PlanTier[]).map((tier) => (
        <TierCard key={tier} tier={tier} />
      ))}
    </div>
  );
}
