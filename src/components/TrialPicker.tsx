"use client";

/**
 * The mini plan-picker every Pro lock now offers instead of a bare bounce
 * to /pricing: the three trial plans with /pricing's own words, each
 * starting checkout through the shared call (lib/billing/trial-checkout).
 * A plan button always names its plan — there is no anonymous "start
 * trial" that silently picks one.
 *
 * Copy rule: plan notes, CTAs and trial badges are /pricing's, verbatim
 * (pinned by trial-checkout.test.ts). This component adds no promises of
 * its own; the only new words are the heading and the Stripe trust line
 * /pricing itself shows under its checkout button.
 */
import { useState } from "react";
import { Lock, X, Zap } from "lucide-react";
import {
  TRIAL_PLAN_OPTIONS,
  startPlanCheckout,
  type TrialPlanOption,
} from "@/lib/billing/trial-checkout";

interface TrialPickerProps {
  /** Tighter paddings/type for the layer flyout and the follow HUD. */
  variant?: "default" | "compact";
  /** Renders a close affordance for surfaces that host the picker behind
   *  a toggle (choosing a plan needs no callback — it leaves for Stripe). */
  onClose?: () => void;
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
    <button
      type="button"
      onClick={() => onPick(option)}
      disabled={busy}
      aria-label={`${option.cta} — ${option.name} ${option.price}${option.per}`}
      className={`w-full text-left rounded-xl border border-white/10 bg-white/[0.03] hover:border-[#D4AF37]/50 hover:bg-[#D4AF37]/[0.06] transition disabled:opacity-60 ${compact ? "px-2.5 py-2" : "px-3.5 py-3"}`}
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
      <span className={`block font-bold text-[#D4AF37] ${compact ? "mt-1 text-[10.5px]" : "mt-1.5 text-xs"}`}>
        {busy ? "Opening secure checkout…" : option.cta}
      </span>
    </button>
  );
}

export default function TrialPicker({ variant = "default", onClose }: TrialPickerProps) {
  const compact = variant === "compact";
  const [busyPlan, setBusyPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function pick(option: TrialPlanOption) {
    setBusyPlan(option.plan);
    setError(null);
    try {
      window.location.href = await startPlanCheckout(option.plan);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout failed");
      setBusyPlan(null);
    }
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
      {error && (
        <p className={`text-red-400 ${compact ? "mt-1.5 text-[9.5px]" : "mt-2 text-[11px]"}`}>{error}</p>
      )}
      <p className={`flex items-center gap-1.5 text-white/35 ${compact ? "mt-2 text-[8.5px]" : "mt-3 text-[10px]"}`}>
        <Lock className="w-3 h-3" /> Secured by Stripe · Cancel anytime
      </p>
    </div>
  );
}

/**
 * Modal host for lock surfaces that are a lone button (the OI dock/tab):
 * the button opens this, the picker lives inside. Backdrop click and the
 * close button dismiss it; choosing a plan leaves for Stripe checkout.
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
        className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#0a0e17] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-bold tracking-tight text-white">Start your free trial</h2>
        {feature && (
          <p className="text-[13px] text-white/55 mt-1 mb-4">
            {feature} is a Pro feature — a free trial unlocks it right now, no charge until the trial ends.
          </p>
        )}
        {!feature && <div className="mb-4" />}
        <TrialPicker onClose={onClose} />
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
