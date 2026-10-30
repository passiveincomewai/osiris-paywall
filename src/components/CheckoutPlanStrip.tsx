"use client";

/**
 * The compact plan strip that now leads both checkout surfaces (the
 * /checkout page and /pricing's checkout sheet) — built from the plan
 * summary record (PLAN_COPY via lib/billing/trial-checkout), so it can
 * never drift from /pricing's words.
 *
 * It deliberately does NOT restate the trial terms in prose ("10 days
 * free, then billed weekly…"): Stripe's own summary inside the form
 * states them, and the old tall card saying them twice pushed the form
 * — wallet buttons first — below the fold on phones (Jameson's
 * screenshot, 2026-10-20). What our framing keeps is the plan, the
 * price, the trial chip and our per-day framing. Nothing else stands
 * between the visitor and the form.
 */
import { Lock, ShieldCheck, Zap } from "lucide-react";
import type { CheckoutPlanSummary } from "@/lib/billing/trial-checkout";

/** The money-back line exactly as /pricing states it under its plan card. */
export const GUARANTEE_LINE =
  "Covered by a 7-day money-back guarantee on your first charge — email us within 7 days of the charge for a full refund, no questions asked.";

export function CheckoutPlanStrip({ summary }: { summary: CheckoutPlanSummary }) {
  return (
    <div className="rounded-2xl border border-[#D4AF37]/25 bg-white/[0.04] px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-white/90">
          {summary.name}
          {/* The bare period names are the Pro grid's ("Weekly" →
              "Weekly Pro"; "VIP Pro" already carries it — never render
              "VIP Pro Pro"). The Lite/Ultra grid names already carry
              their tier ("Lite Weekly") and must never gain a " Pro"
              they didn't buy. */}
          {(summary.plan === "weekly" || summary.plan === "monthly") && " Pro"}
          {" — "}
          {summary.price}
          <span className="text-white/45 font-normal">{summary.per}</span>
        </p>
        {summary.trialLabel && (
          <span className="inline-flex shrink-0 items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full bg-emerald-400/15 text-emerald-300 border border-emerald-400/30">
            <Zap className="w-3 h-3" /> {summary.trialLabel}
          </span>
        )}
      </div>
      <p className="text-xs text-[#D4AF37] font-semibold mt-1">
        Just {summary.perDay} a day
      </p>
    </div>
  );
}

/**
 * The single small trust line under the form: the canonical guarantee
 * sentence for the trial plans (smaller type, one line of copy), and
 * Stripe's name for enterprise, which the guarantee doesn't cover —
 * /pricing draws the same line under its own cards.
 */
export function CheckoutGuaranteeNote({ summary }: { summary: CheckoutPlanSummary }) {
  if (!summary.trialLabel) {
    return (
      <p className="flex items-center justify-center gap-1.5 text-[11px] text-white/35 mt-3">
        <Lock className="w-3 h-3" /> Secured by Stripe
      </p>
    );
  }
  return (
    <p className="flex items-start justify-center gap-1.5 text-[11px] leading-snug text-white/45 mt-3">
      <ShieldCheck className="w-3.5 h-3.5 text-[#D4AF37]/80 shrink-0 mt-px" />
      <span>{GUARANTEE_LINE}</span>
    </p>
  );
}
