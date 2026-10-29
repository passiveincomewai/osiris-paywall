"use client";

/**
 * The premium upgrade embed that replaced the Layers panel's intel
 * section (owner's order, 2026-10-20): compact, panel-width, no new
 * promises. One line of pitch, the premium layers as chips (what the
 * panel's locks actually gate — derived from LAYER_GROUPS by the
 * panel and passed in, so the pitch can never drift from the locks),
 * a plan mini-choice in /pricing's own words (TRIAL_PLAN_OPTIONS),
 * and a primary upgrade button whose CTA is the selected plan's own.
 *
 * The button opens the SAME embedded checkout sheet /pricing uses
 * (components/CheckoutSheet) — the form whose first controls are the
 * Apple Pay / Link wallet buttons. There is deliberately no fake
 * Apple Pay-branded button here: a wallet-only purchase button would
 * bypass the Checkout-Session machinery (trials, account claim,
 * affiliate attribution), so the honest fast path is this button →
 * the sheet → the wallet button at its top. The hosted option
 * ("Continue on Stripe instead") sits under the CTA, as on every
 * other checkout surface.
 *
 * The sheet is portaled to <body>: the desktop panel's flyouts live
 * under transformed/framer-motion ancestors, which would otherwise
 * re-anchor the sheet's fixed overlay to the flyout instead of the
 * viewport.
 *
 * Pro users never see this — the panel gates on the same subscription
 * signal as its locks (isPremiumUser) and simply doesn't render it.
 */
import { useState } from "react";
import { createPortal } from "react-dom";
import { Crown, Lock, Zap } from "lucide-react";
import {
  TRIAL_PLAN_OPTIONS,
  type TrialPlan,
} from "@/lib/billing/trial-checkout";
import CheckoutSheet from "./CheckoutSheet";
import HostedCheckoutLink from "./HostedCheckoutLink";
import TrialButton from "./TrialButton";

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
  const [plan, setPlan] = useState<TrialPlan>("annual");
  const [sheetPlan, setSheetPlan] = useState<TrialPlan | null>(null);
  const selected =
    TRIAL_PLAN_OPTIONS.find((o) => o.plan === plan) ?? TRIAL_PLAN_OPTIONS[0];

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

      <div className="mt-2.5 flex flex-col gap-1" role="radiogroup" aria-label="Choose a plan">
        {TRIAL_PLAN_OPTIONS.map((o) => {
          const active = o.plan === plan;
          return (
            <button
              key={o.plan}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setPlan(o.plan)}
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
          setSheetPlan(plan);
          onSheetOpen?.();
        }}
        className="mt-2.5 w-full"
      />
      <p className="mt-1.5 text-center text-[9px] leading-snug text-white/35">
        Apple Pay &amp; Link lead the checkout form.
      </p>
      <div className="mt-1 text-center">
        <HostedCheckoutLink plan={plan} caption={false} />
      </div>

      {sheetPlan &&
        createPortal(
          <CheckoutSheet plan={sheetPlan} onClose={() => setSheetPlan(null)} />,
          document.body,
        )}
    </div>
  );
}
