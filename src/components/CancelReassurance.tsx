/**
 * Wave 2 F16 — one-click downgrade/cancel reassurance for the trial and
 * checkout surfaces.
 *
 * Every sentence is pinned to the REAL mechanism, verified in code at
 * 8d20fce (see the wave REPORT):
 *  - Management lives at /settings/subscription. Its cancel button (the
 *    one exit to Stripe the page keeps) opens the Stripe billing
 *    portal via POST /api/billing/portal.
 *  - Cancellation there is at period end — the settings UI's own words
 *    are "cancels at period end" and "Pro stays on until then" — so
 *    this copy promises access until period end, never an instant
 *    cut-off, and never proration or refunds the mechanism doesn't do.
 *  - Cancelling during a free trial means no charge: the trial simply
 *    ends at the trial/period end instead of converting.
 *  - When a plan ends the account returns to the free tier; the free
 *    globe/cameras/tracking stay open (the product's standing rule).
 *  - The money-back line is the canonical guarantee sentence, imported
 *    from TrialCtaSection so the wording can never drift. The full
 *    variant honours guarantee={false} like the compact one since
 *    2026-11-01 (Pricing Redesign v2): /pricing carries the sentence
 *    once under its plan grid and passes guarantee={false} here.
 */
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { TRIAL_CTA_GUARANTEE } from "./TrialCtaSection";

export default function CancelReassurance({
  compact = false,
  guarantee = true,
}: {
  compact?: boolean;
  /** Whether the money-back guarantee sentence may be appended. The
   *  guarantee does not cover the enterprise plan — the same rule
   *  CheckoutGuaranteeNote pins (CheckoutPlanStrip) — so hosts
   *  rendering for a plan without a trial pass guarantee={false}. */
  guarantee?: boolean;
}) {
  if (compact) {
    return (
      <p className="text-[11px] leading-relaxed text-white/45">
        Cancel anytime from Settings → Subscription — one click opens Stripe&apos;s secure billing
        portal, cancellation takes effect at the end of the current period, and cancelling during a
        free trial means you are never charged.{guarantee ? <> {TRIAL_CTA_GUARANTEE}</> : null}
      </p>
    );
  }
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <p className="flex items-center gap-2 text-sm font-semibold text-white/90">
        <ShieldCheck className="h-4 w-4 shrink-0 text-[#D4AF37]" />
        No lock-in — leaving is one click from Settings
      </p>
      <p className="mt-2 text-sm leading-relaxed text-white/55">
        Cancel anytime in{" "}
        <Link href="/settings/subscription" className="text-[#D4AF37] underline-offset-2 hover:underline">
          Settings → Subscription
        </Link>
        : the cancel button opens Stripe&apos;s secure billing portal, and cancellation takes effect
        at the end of the current period — you keep your plan until then. Cancel during a free trial
        and you are never charged. When a plan ends, your account simply returns to the free tier:
        the globe, cameras and tracking stay open.
      </p>
      {guarantee ? (
        <p className="mt-2 text-xs leading-relaxed text-white/40">{TRIAL_CTA_GUARANTEE}</p>
      ) : null}
    </div>
  );
}
