"use client";

/**
 * The mini plan-picker every Pro lock now offers instead of a bare bounce
 * to /pricing: the three trial plans with /pricing's own words, each
 * starting checkout through the shared machinery (lib/billing).
 * A plan button always names its plan — there is no anonymous "start
 * trial" that silently picks one.
 *
 * Copy rule: plan notes, CTAs and trial badges are /pricing's, verbatim
 * (pinned by trial-checkout.test.ts). This component adds no promises of
 * its own; the only new words are the heading and the trust line, which
 * pairs /pricing's Stripe line with the 7-day first-charge money-back
 * guarantee /pricing states under its plan card (pinned by TrialPicker.test.ts).
 *
 * Two ways a pick proceeds, by mount:
 *  - mode "navigate" (default — inline expansions: layer flyout, follow
 *    HUD, timelapse popover, full-screen upgrade screens, the /pricing
 *    cancel-recovery strip): startPlanCheckout lands the buyer on
 *    /checkout, which mounts the embedded form there.
 *  - mode "embedded" (dialog mounts — TrialPickerDialog, the
 *    camera-limit popup): the popup swaps its plan list IN PLACE for
 *    the embedded Stripe form (components/EmbeddedCheckoutBody — the
 *    same body /pricing's sheet hosts), Apple Pay/Link leading. A back
 *    control returns to the plan list; leaving either view unmounts
 *    the body, which destroys the session (controller semantics), and
 *    reopening starts fresh. The failure fallback is unchanged — the
 *    body's flow drops to the hosted redirect on any embedded failure.
 *
 * Each plan card's CTA is a real filled button (gold, full-width,
 * ≥48px) — it used to be a text-styled line inside a card-wide button,
 * which read as a link and nested-button markup was never an option.
 */
import { useEffect, useState } from "react";
import { ArrowLeft, Lock, X, Zap } from "lucide-react";
import {
  TRIAL_PLAN_OPTIONS,
  startPlanCheckout,
  type TrialPlan,
  type TrialPlanOption,
} from "@/lib/billing/trial-checkout";
import EmbeddedCheckoutBody from "./EmbeddedCheckoutBody";

interface TrialPickerProps {
  /** Tighter paddings/type for the layer flyout and the follow HUD. */
  variant?: "default" | "compact";
  /** Renders a close affordance for surfaces that host the picker behind
   *  a toggle (choosing a plan needs no callback — it leaves for checkout). */
  onClose?: () => void;
  /** How a pick proceeds — see the module comment. Dialog mounts pass
   *  "embedded"; every other mount keeps the default navigation. */
  mode?: "navigate" | "embedded";
  /** Embedded mode only: fires when the picker swaps between its plan
   *  list and the in-place checkout, so a host can widen its frame. */
  onCheckoutViewChange?: (inCheckout: boolean) => void;
}

function PlanRow({
  option,
  compact,
  busy,
  onPick,
}: {
  option: TrialPlanOption;
  compact: boolean;
  busy: boolean;
  onPick: (o: TrialPlanOption) => void;
}) {
  return (
    <div
      className={`w-full rounded-xl border border-white/10 bg-white/[0.03] hover:border-[#D4AF37]/50 hover:bg-[#D4AF37]/[0.06] transition ${compact ? "px-2.5 py-2" : "px-3.5 py-3"}`}
    >
      <span className="flex items-baseline gap-2">
        <span className={`font-bold text-white ${compact ? "text-[13px]" : "text-[15px]"}`}>
          {option.price}
          <span className="text-white/45 font-medium">{option.per}</span>
        </span>
        <span className={`font-mono uppercase tracking-wider text-white/50 ${compact ? "text-[9px]" : "text-[10px]"}`}>
          {option.name}
        </span>
        <span className={`ml-auto inline-flex items-center gap-1 font-bold uppercase tracking-wide rounded-full bg-emerald-400/15 text-emerald-300 border border-emerald-400/30 ${compact ? "text-[8px] px-1.5 py-0.5" : "text-[9px] px-2 py-0.5"}`}>
          <Zap className={compact ? "w-2.5 h-2.5" : "w-3 h-3"} /> {option.trialLabel}
        </span>
      </span>
      <span className={`block text-white/45 ${compact ? "mt-0.5 text-[9.5px]" : "mt-1 text-[11px]"}`}>
        {option.note}
      </span>
      {/* The CTA: a real button, not a text line — solid gold like every
          primary CTA on the site, full-width in the card, tall enough
          to land a thumb on. */}
      <button
        type="button"
        onClick={() => onPick(option)}
        disabled={busy}
        aria-label={`${option.cta} — ${option.name} ${option.price}${option.per}`}
        className={`flex w-full min-h-[48px] items-center justify-center rounded-xl bg-[#D4AF37] px-4 font-bold text-black transition hover:brightness-110 active:brightness-95 disabled:opacity-60 ${compact ? "mt-2 text-xs" : "mt-3 text-sm"}`}
      >
        {busy ? "Opening secure checkout…" : option.cta}
      </button>
    </div>
  );
}

/**
 * The embedded-mode checkout view: a back control over the shared
 * checkout body. Mounting starts the session; unmounting — back,
 * dialog close, any host teardown — destroys it (the body's
 * controller cleanup), so this view never leaks a live form.
 */
export function TrialPickerCheckout({
  plan,
  onBack,
}: {
  plan: TrialPlan;
  onBack: () => void;
}) {
  return (
    <div data-trial-picker-checkout>
      <button
        type="button"
        onClick={onBack}
        className="mb-3 inline-flex min-h-[32px] items-center gap-1.5 text-xs text-white/50 hover:text-white transition"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to plans
      </button>
      <EmbeddedCheckoutBody plan={plan} />
    </div>
  );
}

export default function TrialPicker({
  variant = "default",
  onClose,
  mode = "navigate",
  onCheckoutViewChange,
}: TrialPickerProps) {
  const compact = variant === "compact";
  const [busyPlan, setBusyPlan] = useState<string | null>(null);
  const [checkoutPlan, setCheckoutPlan] = useState<TrialPlan | null>(null);

  function pick(option: TrialPlanOption) {
    if (mode === "embedded") {
      // Swap the popup to the checkout in place — the session starts
      // when the body mounts, not before.
      setCheckoutPlan(option.plan);
      onCheckoutViewChange?.(true);
      return;
    }
    setBusyPlan(option.plan);
    // Lands on /checkout, which mounts the embedded form or falls back to
    // the hosted redirect; any failure is surfaced on that page, so there
    // is no error path to render here — the busy state rides out the
    // navigation.
    startPlanCheckout(option.plan);
  }

  function back() {
    // Unmounting the checkout view destroys the mounted session; the
    // next pick starts a fresh one.
    setCheckoutPlan(null);
    onCheckoutViewChange?.(false);
  }

  if (mode === "embedded" && checkoutPlan) {
    return <TrialPickerCheckout plan={checkoutPlan} onBack={back} />;
  }

  return (
    <div data-trial-picker>
      <div className="flex items-center gap-2">
        <span className={`font-mono font-bold tracking-[0.2em] text-[#D4AF37] ${compact ? "text-[9px]" : "text-[10px]"}`}>
          WORLDEYE PRO — TRY IT FREE
        </span>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close trial plans"
            className="ml-auto p-1 rounded text-white/40 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <div className={`flex flex-col ${compact ? "gap-1.5 mt-2" : "gap-2 mt-2.5"}`}>
        {TRIAL_PLAN_OPTIONS.map((o) => (
          <PlanRow
            key={o.plan}
            option={o}
            compact={compact}
            busy={busyPlan === o.plan}
            onPick={pick}
          />
        ))}
      </div>
      <p className={`flex items-center gap-1.5 text-white/35 ${compact ? "mt-2 text-[8.5px]" : "mt-3 text-[10px]"}`}>
        <Lock className="w-3 h-3" /> Secured by Stripe · Cancel anytime · 7-day money-back guarantee on your first charge
      </p>
    </div>
  );
}

/**
 * Modal host for lock surfaces that are a lone button (the OI dock/tab):
 * the button opens this, the picker lives inside. Backdrop click and the
 * close button dismiss it; choosing a plan swaps the dialog in place to
 * the embedded checkout (the dialog widens for the form — the picker's
 * onCheckoutViewChange drives that), and dismissing from either view
 * destroys any mounted session with the unmount.
 */
export function TrialPickerDialog({
  open,
  onClose,
  feature,
}: {
  open: boolean;
  onClose: () => void;
  /** What the user was trying to open, e.g. "OI — the AI assistant". */
  feature?: string;
}) {
  const [inCheckout, setInCheckout] = useState(false);
  // A reopened dialog starts on the plan list, never on a stale form.
  useEffect(() => {
    if (!open) setInCheckout(false);
  }, [open ]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[1200] flex items-center justify-center px-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Start a free trial"
    >
      <div
        className={`w-full rounded-3xl border border-white/10 bg-[#0a0e17] p-6 shadow-2xl max-h-[92dvh] overflow-y-auto transition-[max-width] duration-200 ${inCheckout ? "max-w-lg" : "max-w-sm"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-bold tracking-tight text-white">Start your free trial</h2>
        {feature && !inCheckout && (
          <p className="text-[13px] text-white/55 mt-1 mb-4">
            {feature} is a Pro feature — a free trial unlocks it right now, no charge until the trial ends.
          </p>
        )}
        {!feature && !inCheckout && <div className="mb-4" />}
        {inCheckout && <div className="mb-4" />}
        <TrialPicker mode="embedded" onClose={onClose} onCheckoutViewChange={setInCheckout} />
        <button
          onClick={onClose}
          className="mt-4 w-full text-center text-xs text-white/35 hover:text-white/60 transition"
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}
