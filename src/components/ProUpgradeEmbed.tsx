"use client";

/**
 * The premium upgrade embed that replaced the Layers panel's intel
 * section (owner's order, 2026-10-20): compact, panel-width, no new
 * promises. One line of pitch, the premium layers as chips (what the
 * panel's locks actually gate — derived from LAYER_GROUPS by the
 * panel and passed in, so the pitch can never drift from the locks),
 * a plan mini-choice in /pricing's own words, and a primary upgrade
 * button whose CTA is the selected plan's own.
 *
 * Phase D (Pricing Redesign, 2026-10-30): the mini-choice is the full
 * 3×3 grid — tier tabs (Lite / Pro / Ultra) over the selected tier's
 * three period rows, all from lib/billing's TIER_PLAN_OPTIONS — so the
 * embed sells the same nine plans as /pricing and the shared picker,
 * opening on Pro annual as it always has. Nothing here restates a
 * price, a trial length or a plan name.
 *
 * The button opens the SAME embedded checkout sheet /pricing uses
 * (components/CheckoutSheet) — Stripe's own card form: live checkout
 * sessions present card as the only payment method, and Link is
 * disabled on the Stripe account, so no wallet or Link path is ever
 * advertised here. The hosted option ("Continue on Stripe instead")
 * sits under the CTA, as on every other checkout surface.
 *
 * The sheet is portaled to <body>: the desktop panel's flyouts live
 * under transformed/framer-motion ancestors, which would otherwise
 * re-anchor the sheet's fixed overlay to the flyout instead of the
 * viewport.
 *
 * Pro users never see this — the panel gates on the same subscription
 * signal as its locks (isPremiumUser) and simply doesn't render it.
 */
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Crown, Lock, Zap } from "lucide-react";
import {
  TIER_PLAN_OPTIONS,
  gridCheckoutPlan,
  type CheckoutPlanId,
  type PlanTier,
} from "@/lib/billing/trial-checkout";
import CheckoutSheet from "./CheckoutSheet";
import HostedCheckoutLink from "./HostedCheckoutLink";
import { preloadStripeJs } from "@/lib/billing/stripe-preload";
import {
  trackPickerOpened,
  trackPlanSelected,
} from "@/lib/billing/picker-analytics";
import TrialButton from "./TrialButton";

/** Tier tab accents — the same per-tier colours as /pricing's grid. */
const TIER_TAB_ACCENTS: Record<PlanTier, string> = {
  lite: "border-[#00E5FF]/60 bg-[#00E5FF]/[0.08] text-[#00E5FF]",
  pro: "border-[#D4AF37]/60 bg-[#D4AF37]/[0.08] text-[#D4AF37]",
  ultra: "border-[#a78bfa]/60 bg-[#a78bfa]/[0.08] text-[#a78bfa]",
};

const TIER_LABELS: Record<PlanTier, string> = {
  lite: "Lite",
  pro: "Pro",
  ultra: "Ultra",
};

export default function ProUpgradeEmbed({
  premiumLabels,
  onSheetOpen,
}: {
  /** Top-level premium layer labels — what Pro unlocks on this board. */
  premiumLabels: string[];
  /** Fires when the checkout sheet opens, so a host (the desktop
   *  rail) can hold its flyout open underneath the sheet. */
  onSheetOpen?: () => void;
}) {
  const [tier, setTier] = useState<PlanTier>("pro");
  const [plan, setPlan] = useState<CheckoutPlanId>("annual");
  const [sheetPlan, setSheetPlan] = useState<CheckoutPlanId | null>(null);
  const options = TIER_PLAN_OPTIONS[tier];
  const selected = options.find((o) => o.plan === plan) ?? options[0];

  // Phase E funnel (lib/billing/picker-analytics): this surface
  // holds real selection state, so its events carry exact plans —
  // opened with the initial selection (Pro annual), then every
  // tier/period change with the resulting plan.
  const openedRef = useRef(false);
  useEffect(() => {
    if (openedRef.current) return;
    openedRef.current = true;
    trackPickerOpened("embed", "annual");
  }, []);

  // Warm Stripe.js on mount (lib/billing/stripe-preload): the sheet
  // this embed opens starts its embedded flow on the CTA click, and
  // with the script already cached only the session POST gates the
  // form — the click path no longer pays the js.stripe.com fetch.
  useEffect(() => {
    preloadStripeJs();
  }, []);

  function chooseTier(t: PlanTier) {
    // Switching tiers lands on that tier's annual — the default view
    // everywhere in the redesign (annual carries the VIP branding).
    if (t !== tier) trackPlanSelected("embed", gridCheckoutPlan(t, "annual"));
    setTier(t);
    setPlan(gridCheckoutPlan(t, "annual"));
  }

  function choosePlan(next: CheckoutPlanId) {
    if (next !== plan) trackPlanSelected("embed", next);
    setPlan(next);
  }

  return (
    <div
      data-pro-upgrade-embed
      className="rounded-lg border border-[#D4AF37]/25 bg-black/40 p-3"
    >
      <div className="flex items-center gap-1.5">
        <Crown className="w-3.5 h-3.5 text-[#D4AF37]" />
        <span className="text-[10px] font-mono font-bold tracking-[0.2em] text-[#D4AF37]">
          WORLDEYE PRO
        </span>
      </div>
      <p className="mt-1.5 text-[11px] leading-snug text-white/60">
        One pass unlocks every premium layer on this board.
      </p>

      {premiumLabels.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {premiumLabels.map((label) => (
            <span
              key={label}
              className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[9px] font-mono uppercase tracking-wider text-white/55"
            >
              <Lock className="w-2.5 h-2.5 text-[#D4AF37]/80" />
              {label}
            </span>
          ))}
        </div>
      )}

      {/* The tier tabs: one grid, three tiers — the radio rows below
          are the selected tier's periods. */}
      <div className="mt-2.5 flex gap-1" role="tablist" aria-label="Choose a tier">
        {(Object.keys(TIER_PLAN_OPTIONS) as PlanTier[]).map((t) => {
          const active = t === tier;
          return (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => chooseTier(t)}
              className={`flex-1 rounded-lg border px-2 py-1 text-[9px] font-bold uppercase tracking-wider transition ${
                active
                  ? TIER_TAB_ACCENTS[t]
                  : "border-white/10 bg-white/[0.02] text-white/50 hover:border-white/25 hover:text-white"
              }`}
            >
              {TIER_LABELS[t]}
            </button>
          );
        })}
      </div>

      <div className="mt-2 flex flex-col gap-1" role="radiogroup" aria-label="Choose a plan">
        {options.map((o) => {
          const active = o.plan === selected.plan;
          return (
            <button
              key={o.plan}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => choosePlan(o.plan)}
              className={`flex w-full items-center gap-2 rounded-lg border px-2 py-1.5 text-left transition ${
                active
                  ? "border-[#D4AF37]/60 bg-[#D4AF37]/[0.08]"
                  : "border-white/10 bg-white/[0.02] hover:border-white/25"
              }`}
            >
              <span className={`text-[11px] font-bold ${active ? "text-white" : "text-white/70"}`}>
                {o.price}
                <span className="font-medium text-white/40">{o.per}</span>
              </span>
              <span className="text-[9px] font-mono uppercase tracking-wider text-white/45">
                {o.name}
              </span>
              <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-400/15 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-emerald-300">
                <Zap className="w-2.5 h-2.5" />
                {o.trialLabel}
              </span>
            </button>
          );
        })}
      </div>

      <TrialButton
        label={selected.cta}
        days={selected.trialDays === 3 ? 3 : 10}
        onClick={() => {
          setSheetPlan(selected.plan);
          onSheetOpen?.();
        }}
        className="mt-2.5 w-full"
      />
      <p className="mt-1.5 text-center text-[9px] leading-snug text-white/35">
        Pay by card in the secure Stripe checkout form.
      </p>
      <div className="mt-1 text-center">
        <HostedCheckoutLink plan={selected.plan} caption={false} surface="embed" />
      </div>

      {sheetPlan &&
        createPortal(
          <CheckoutSheet plan={sheetPlan} onClose={() => setSheetPlan(null)} analyticsSurface="embed" />,
          document.body,
        )}
    </div>
  );
}
