"use client";

// The TrialCtaSection plan cards (client half): three TIER cards —
// Lite / Pro / Ultra — each carrying its three period rows from the
// billing config (TIER_PLAN_OPTIONS: names, prices, per-day figures,
// trial notes and labels, never restated here), a period radio choice
// per card, and a full-width HTML trial button for the card's
// selected period, opening the embedded Stripe checkout IN PLACE for
// that plan (CheckoutSheet) — no /pricing detour and, per the owner's
// order, no hosted payment-link option on these surfaces
// (hideHostedOption).
//
// Phase D (Pricing Redesign, 2026-10-30): the cards used to be the
// three Pro periods only; they are now the same 3×3 grid /pricing and
// the shared picker sell, so a content page's end-of-article offer can
// no longer drift from the real plans. Every option's facts render in
// its row; the CTA always names the selected option's own trial
// (weekly selections say 3 days — never a hard-coded 10).
//
// 2026-10-31 (owner order): the CTA is a real HTML button again and
// the period rows were re-laid-out — the owner's trial artwork
// (TrialButton) rendered as a tiny pill on these cards with
// ~10px-equivalent baked text, and the price/name/trial-badge line
// spilled past the card border at desktop widths. /pricing keeps the
// artwork; this section does not.
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

/** Per-tier accents — the same colours as /pricing's grid. */
const TIER_ACCENTS: Record<PlanTier, { text: string; border: string }> = {
  lite: { text: "text-[#00E5FF]", border: "border-[#00E5FF]/40" },
  pro: { text: "text-[#D4AF37]", border: "border-[#D4AF37]/50" },
  ultra: { text: "text-[#a78bfa]", border: "border-[#a78bfa]/40" },
};

/** CTA gradient per tier — the tier accent as a filled button (the
 *  same colour story as /pricing's grid: Lite cyan, Pro gold, Ultra
 *  violet; Pro's gradient is /pricing's own gold-button gradient). */
const TIER_CTA_GRADIENTS: Record<PlanTier, string> = {
  lite: "from-[#7ef0ff] to-[#00E5FF]",
  pro: "from-[#e8c55a] to-[#D4AF37]",
  ultra: "from-[#cdbffa] to-[#a78bfa]",
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
      className={`flex min-w-0 flex-col rounded-3xl border bg-white/[0.02] p-6 ${accent.border}`}
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
              className={`w-full min-w-0 rounded-xl border px-3 py-2 text-left transition ${
                active
                  ? "border-white/35 bg-white/[0.05]"
                  : "border-white/10 bg-white/[0.02] hover:border-white/25"
              }`}
            >
              {/* Price + trial badge share a line that WRAPS instead of
                  spilling: both spans are nowrap and the badge is
                  shrink-0 inside a flex-wrap row, so at narrow card
                  widths the badge drops below the price instead of
                  past the card border (owner photo, 2026-10-31). The
                  plan name gets its own line for the same reason. */}
              <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span className="whitespace-nowrap font-mono text-lg font-bold">
                  {o.price}
                  <span className="text-xs text-white/50 font-medium">{o.per}</span>
                </span>
                <span className="ml-auto shrink-0 whitespace-nowrap text-[9px] font-bold uppercase tracking-wide text-emerald-300">
                  {o.trialLabel.toUpperCase()}
                </span>
              </span>
              <span className="mt-1 block truncate text-[10px] font-mono uppercase tracking-wider text-white/50">
                {o.name}
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
        {/* A real HTML button, not the trial artwork (owner order,
            2026-10-31): on these cards the 1155×172 artwork rendered
            as a small pill with ~10px-equivalent baked text. This is
            full-width, at least 52px tall, tier-coloured like
            /pricing's CTAs, and its visible label is the selected
            option's own CTA from the billing config — the same words
            the artwork carried ("Start 3-Day Free Trial" weekly,
            "Start 10-Day Free Trial" otherwise). */}
        <button
          type="button"
          onClick={() => setSheetPlan(gridCheckoutPlan(tier, period))}
          aria-label={selected.cta}
          className={`flex min-h-[52px] w-full items-center justify-center rounded-2xl bg-gradient-to-b px-4 text-base font-bold text-black transition hover:brightness-110 active:scale-[0.99] ${TIER_CTA_GRADIENTS[tier]}`}
        >
          {selected.cta}
        </button>
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
