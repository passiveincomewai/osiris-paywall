"use client";

/**
 * The central plan picker every upgrade surface offers instead of a
 * bare bounce to /pricing (Pricing Redesign Phase D): the full 3×3
 * grid — Lite / Pro / Ultra × Weekly / Monthly / Annual — rendered
 * from the one option table (lib/billing's GRID_PLAN_OPTIONS), as tier
 * tabs over the selected tier's three period rows. Before Phase D this
 * picker sold only the three Pro plans and every other surface
 * hard-wired its own single plan; now a surface's only choices are
 * which tier to open on and which plan to emphasize.
 *
 * Copy rule: plan notes, CTAs and trial badges are /pricing's, verbatim
 * (pinned by trial-checkout.test.ts). This component adds no promises
 * of its own; the only new words are the heading and the trust line,
 * which pairs /pricing's Stripe line with the 7-day first-charge
 * money-back guarantee /pricing states under its plan card (pinned by
 * TrialPicker.test.ts). Trial wording always comes from the SELECTED
 * option — a weekly selection says 3 days, never a hard-coded 10.
 *
 * Two ways a pick proceeds, by mount:
 *  - mode "navigate" (default — inline expansions: layer flyout, follow
 *    HUD, timelapse popover, full-screen upgrade screens, the /pricing
 *    cancel-recovery strip): startPlanCheckout lands the buyer on
 *    /checkout, which mounts the embedded form there.
 *  - mode "embedded" (dialog mounts — TrialPickerDialog, the
 *    camera-limit popup): the popup swaps its plan list IN PLACE for
 *    the embedded Stripe form (components/EmbeddedCheckoutBody — the
 *    same body /pricing's sheet hosts) — Stripe's card form. A back
 *    control returns to the plan list; leaving either view unmounts
 *    the body, which destroys the session (controller semantics), and
 *    reopening starts fresh. The failure fallback is unchanged — the
 *    body's flow drops to the hosted redirect on any embedded failure.
 *
 * Each plan row's CTA is the owner's glowing trial artwork as a
 * real button (components/TrialButton), variant-matched to the plan's
 * trial length.
 */
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Lock, X, Zap } from "lucide-react";
import {
  TIER_PLAN_OPTIONS,
  gridCheckoutPlan,
  startPlanCheckout,
  tierForCheckoutPlan,
  type CheckoutPlanId,
  type GridPlanOption,
  type PlanTier,
} from "@/lib/billing/trial-checkout";
import {
  trackPickerOpened,
  trackPlanSelected,
  type PickerSurface,
} from "@/lib/billing/picker-analytics";
import EmbeddedCheckoutBody from "./EmbeddedCheckoutBody";
import TrialButton from "./TrialButton";

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
  /** The tier the picker opens on (default: the emphasized/default
   *  plan's tier, else Pro — the tier most locks sell). */
  defaultTier?: PlanTier;
  /** A plan to open on: selects its tier's tab (the rows still show
   *  all three of that tier's periods). */
  defaultPlan?: CheckoutPlanId;
  /** Visually lifts one plan as THE pick — VIP-only locks (timelapse,
   *  intel) pass "ultra_annual" so the Ultra annual option is the
   *  obvious path; its tier's tab opens selected. */
  emphasizePlan?: CheckoutPlanId;
  /** Phase E funnel attribution (lib/billing/picker-analytics): the
   *  surface this mount reports as. Inline mounts keep the default
   *  "picker"; TrialPickerDialog passes "dialog". */
  analyticsSurface?: PickerSurface;
}

/** Tier tab accents — the same per-tier colours as /pricing's grid
 *  (Lite cyan, Pro gold, Ultra violet). */
const TIER_TAB_ACCENTS: Record<PlanTier, { text: string; activeClasses: string }> = {
  lite: {
    text: "text-[#00E5FF]",
    activeClasses: "border-[#00E5FF]/60 bg-[#00E5FF]/[0.08] text-white",
  },
  pro: {
    text: "text-[#D4AF37]",
    activeClasses: "border-[#D4AF37]/60 bg-[#D4AF37]/[0.08] text-white",
  },
  ultra: {
    text: "text-[#a78bfa]",
    activeClasses: "border-[#a78bfa]/60 bg-[#a78bfa]/[0.08] text-white",
  },
};

const TIER_LABELS: Record<PlanTier, string> = {
  lite: "Lite",
  pro: "Pro",
  ultra: "Ultra",
};

function PlanRow({
  option,
  compact,
  busy,
  emphasized,
  onPick,
}: {
  option: GridPlanOption;
  compact: boolean;
  busy: boolean;
  emphasized?: boolean;
  onPick: (o: GridPlanOption) => void;
}) {
  return (
    <div
      className={`w-full rounded-xl border bg-white/[0.03] hover:border-[#D4AF37]/50 hover:bg-[#D4AF37]/[0.06] transition ${compact ? "px-2.5 py-2" : "px-3.5 py-3"} ${
        emphasized ? "border-[#D4AF37]/70 ring-1 ring-[#D4AF37]/50" : "border-white/10"
      }`}
    >
      <span className="flex items-baseline gap-2">
        <span className={`font-bold text-white ${compact ? "text-[13px]" : "text-[15px]"}`}>
          {option.price}
          <span className="text-white/45 font-medium">{option.per}</span>
        </span>
        <span className={`font-mono uppercase tracking-wider text-white/50 ${compact ? "text-[9px]" : "text-[10px]"}`}>
          {option.name}
        </span>
        {emphasized && option.period === "annual" && (
          <span className="inline-flex items-center font-bold uppercase tracking-wide rounded-full bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/50 text-[8px] px-1.5 py-0.5">
            VIP pick
          </span>
        )}
        <span className={`ml-auto inline-flex items-center gap-1 font-bold uppercase tracking-wide rounded-full bg-emerald-400/15 text-emerald-300 border border-emerald-400/30 ${compact ? "text-[8px] px-1.5 py-0.5" : "text-[9px] px-2 py-0.5"}`}>
          <Zap className={compact ? "w-2.5 h-2.5" : "w-3 h-3"} /> {option.trialLabel}
        </span>
      </span>
      <span className={`block text-white/45 ${compact ? "mt-0.5 text-[9.5px]" : "mt-1 text-[11px]"}`}>
        {option.note}
      </span>
      {/* The CTA: the owner's glowing trial artwork as a real button
          (components/TrialButton), variant-matched to this plan's trial
          length — the same button /pricing's plan card carries. While
          a pick is in flight the artwork dims and a status line names
          what is happening. */}
      {busy ? (
        <p
          role="status"
          className={`flex w-full min-h-[48px] items-center justify-center px-4 text-center font-semibold text-white/55 ${compact ? "mt-2 text-xs" : "mt-3 text-sm"}`}
        >
          Opening secure checkout…
        </p>
      ) : (
        <TrialButton
          label={`${option.cta} — ${option.name} ${option.price}${option.per}`}
          days={option.trialDays === 3 ? 3 : 10}
          onClick={() => onPick(option)}
          className={`w-full ${compact ? "mt-2" : "mt-3"}`}
        />
      )}
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
  analyticsSurface = "picker",
}: {
  plan: CheckoutPlanId;
  onBack: () => void;
  /** Phase E funnel attribution for the session this body creates. */
  analyticsSurface?: PickerSurface;
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
      <EmbeddedCheckoutBody plan={plan} analyticsSurface={analyticsSurface} />
    </div>
  );
}

export default function TrialPicker({
  variant = "default",
  onClose,
  mode = "navigate",
  onCheckoutViewChange,
  defaultTier,
  defaultPlan,
  emphasizePlan,
  analyticsSurface = "picker",
}: TrialPickerProps) {
  const compact = variant === "compact";
  const [busyPlan, setBusyPlan] = useState<string | null>(null);
  const [checkoutPlan, setCheckoutPlan] = useState<CheckoutPlanId | null>(null);
  // Open on the emphasized plan's tier, else the caller's tier/plan,
  // else Pro — the tier most lock surfaces sell.
  const [tier, setTier] = useState<PlanTier>(
    () =>
      (emphasizePlan ? tierForCheckoutPlan(emphasizePlan) : null) ??
      defaultTier ??
      (defaultPlan ? tierForCheckoutPlan(defaultPlan) : null) ??
      "pro",
  );

  // Phase E funnel (lib/billing/picker-analytics): this picker holds
  // no single selected-plan state — its period rows are independent
  // CTAs — so opened/selected events carry the HEADLINE plan of the
  // tier in view: the emphasized plan when it belongs to that tier,
  // else the tier's annual (the redesign's default emphasis).
  const headlineForTier = (t: PlanTier): CheckoutPlanId =>
    emphasizePlan && tierForCheckoutPlan(emphasizePlan) === t
      ? emphasizePlan
      : gridCheckoutPlan(t, "annual");
  const openedRef = useRef(false);
  useEffect(() => {
    if (openedRef.current) return;
    openedRef.current = true;
    trackPickerOpened(analyticsSurface, headlineForTier(tier));
    // Mount-only: the headline is the opening view's, by definition.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function chooseTier(t: PlanTier) {
    if (t !== tier) trackPlanSelected(analyticsSurface, headlineForTier(t));
    setTier(t);
  }

  function pick(option: GridPlanOption) {
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
    startPlanCheckout(option.plan, undefined, analyticsSurface);
  }

  function back() {
    // Unmounting the checkout view destroys the mounted session; the
    // next pick starts a fresh one.
    setCheckoutPlan(null);
    onCheckoutViewChange?.(false);
  }

  if (mode === "embedded" && checkoutPlan) {
    return (
      <TrialPickerCheckout
        plan={checkoutPlan}
        onBack={back}
        analyticsSurface={analyticsSurface}
      />
    );
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
      {/* The tier tabs: one grid, three tiers — the rows below are the
          selected tier's periods. */}
      <div
        className={`flex gap-1 ${compact ? "mt-2" : "mt-2.5"}`}
        role="tablist"
        aria-label="Choose a tier"
      >
        {(Object.keys(TIER_PLAN_OPTIONS) as PlanTier[]).map((t) => {
          const active = t === tier;
          return (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => chooseTier(t)}
              className={`flex-1 rounded-lg border font-bold uppercase tracking-wider transition ${compact ? "px-2 py-1 text-[9px]" : "px-2 py-1.5 text-[10px]"} ${
                active
                  ? TIER_TAB_ACCENTS[t].activeClasses
                  : "border-white/10 bg-white/[0.02] text-white/50 hover:border-white/25 hover:text-white"
              }`}
            >
              <span className={active ? TIER_TAB_ACCENTS[t].text : undefined}>
                {TIER_LABELS[t]}
              </span>
            </button>
          );
        })}
      </div>
      <div className={`flex flex-col ${compact ? "gap-1.5 mt-2" : "gap-2 mt-2.5"}`}>
        {TIER_PLAN_OPTIONS[tier].map((o) => (
          <PlanRow
            key={o.plan}
            option={o}
            compact={compact}
            busy={busyPlan === o.plan}
            emphasized={emphasizePlan === o.plan}
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
 * Modal host for lock surfaces that are a lone button (the OI dock/tab,
 * the trial prompt): the button opens this, the picker lives inside.
 * Backdrop click and the close button dismiss it; choosing a plan
 * swaps the dialog in place to the embedded checkout (the dialog
 * widens for the form — the picker's onCheckoutViewChange drives
 * that), and dismissing from either view destroys any mounted session
 * with the unmount.
 */
export function TrialPickerDialog({
  open,
  onClose,
  feature,
  defaultTier,
  defaultPlan,
}: {
  open: boolean;
  onClose: () => void;
  /** What the user was trying to open, e.g. "OI — the AI assistant". */
  feature?: string;
  /** The tier the picker opens on (see TrialPicker). */
  defaultTier?: PlanTier;
  /** A plan whose tier the picker opens on (see TrialPicker). */
  defaultPlan?: CheckoutPlanId;
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
        <TrialPicker
          mode="embedded"
          onClose={onClose}
          onCheckoutViewChange={setInCheckout}
          defaultTier={defaultTier}
          defaultPlan={defaultPlan}
          analyticsSurface="dialog"
        />
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
