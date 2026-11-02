"use client";

/**
 * The Wave 2 F3 trial surfaces, mounted once in the root layout:
 *
 *  - the post-signup WELCOME prompt: a one-time modal greeting a new
 *    account with a one-tap start into the plan picker for the
 *    recommended plan (the plan last viewed on /pricing, else
 *    Monthly);
 *  - the dismissible BANNER for signed-in free users who have never
 *    trialed and skipped the welcome — quiet for a week after any
 *    dismissal, never stacked on pricing/checkout/settings/auth.
 *
 * All decisions live in lib/billing/trial-prompt (pinned by its tests);
 * this shell only reads the session once per navigation, renders what
 * the decision says, and records dismissals. The CTA opens the
 * central plan picker (components/TrialPicker, Phase D) pre-set to
 * the recommended plan — choosing there starts the ordinary checkout
 * flow. This component never writes subscription state (the Stripe
 * webhook is the sole write path).
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Crown, X } from "lucide-react";
import { readSessionIdentity } from "@/lib/premium-entitlement";
import TrialButton from "@/components/TrialButton";
import { TrialPickerDialog } from "@/components/TrialPicker";
import {
  TRIAL_PLAN_OPTIONS,
  type TrialPlanOption,
} from "@/lib/billing/trial-checkout";
import {
  clearPendingWelcome,
  decideTrialPromptSurface,
  dismissTrialSurfaces,
  markWelcomed,
  readBannerDismissedAt,
  readLastViewedPlan,
  readPendingWelcome,
  readWelcomed,
  type TrialPromptSurface,
} from "@/lib/billing/trial-prompt";

const TRUST_LINE =
  "Secured by Stripe · Cancel anytime · 7-day money-back guarantee on your first charge";

export default function TrialPrompt() {
  const pathname = usePathname() ?? "/";
  const [surface, setSurface] = useState<TrialPromptSurface>("none");
  const [option, setOption] = useState<TrialPlanOption | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const identity = await readSessionIdentity();
      if (cancelled) return;
      const plan = readLastViewedPlan();
      const next = decideTrialPromptSurface({
        identityState: identity.state,
        subscriptionStatus: identity.user?.subscriptionStatus,
        pathname,
        pendingWelcome: readPendingWelcome(),
        welcomed: readWelcomed(),
        bannerDismissedAt: readBannerDismissedAt(),
        now: Date.now(),
      });
      setOption(
        TRIAL_PLAN_OPTIONS.find((o) => o.plan === plan) ?? TRIAL_PLAN_OPTIONS[1],
      );
      setSurface(next);
      if (next === "welcome") {
        // The greeting has been delivered — it shows once, ever.
        markWelcomed();
        clearPendingWelcome();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  if (!option) return null;

  const dismiss = () => {
    dismissTrialSurfaces(Date.now());
    setSurface("none");
  };

  // Engaging with the CTA dismisses the prompt surface (same
  // cooldown as any dismissal) and opens the central picker,
  // pre-set to the recommended plan this surface named.
  const openPicker = () => {
    setPickerOpen(true);
    dismiss();
  };

  const dialog = (
    <TrialPickerDialog
      open={pickerOpen}
      onClose={() => setPickerOpen(false)}
      defaultPlan={option.plan}
    />
  );

  if (surface === "welcome") {
    return (
      <>
        {dialog}
      <div
        className="fixed inset-0 z-[1200] flex items-center justify-center px-4 bg-black/70 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-label="Welcome to WorldEye"
      >
        <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#0a0e17] p-7 text-center shadow-2xl max-h-[92dvh] overflow-y-auto">
          <button
            onClick={dismiss}
            aria-label="Close"
            className="float-right -mt-2 -mr-2 p-2 rounded-full text-white/40 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="mx-auto w-12 h-12 rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/25 flex items-center justify-center mb-4">
            <Crown className="w-6 h-6 text-[#D4AF37]" />
          </div>
          <h2 className="text-lg font-bold tracking-tight">Welcome to WorldEye</h2>
          <p className="text-sm text-white/55 mt-2 mb-6">
            Your account is ready. Start your free trial of {option.name} —{" "}
            {option.note}. That&apos;s {option.price}
            {option.per} after the trial, just {option.perDay} a day.
          </p>
          <TrialButton
            label={option.cta}
            days={option.trialDays === 3 ? 3 : 10}
            onClick={openPicker}
            className="w-full"
          />
          <p className="text-[11px] text-white/35 mt-3">{TRUST_LINE}</p>
          <div className="mt-5 flex items-center justify-center gap-5 text-sm">
            <Link
              href="/pricing"
              className="text-white/45 hover:text-white transition"
            >
              Compare plans first
            </Link>
            <button
              onClick={dismiss}
              className="text-white/45 hover:text-white transition"
            >
              Maybe later
            </button>
          </div>
        </div>
      </div>
      </>
    );
  }

  if (surface === "none") return dialog;

  return (
    <>
      {dialog}
    <div
      className="fixed bottom-4 inset-x-4 z-[900] mx-auto max-w-xl rounded-2xl border border-[#D4AF37]/30 bg-[#0a0e17]/95 backdrop-blur px-4 py-3 shadow-2xl flex items-center gap-3"
      role="region"
      aria-label="Start your free trial"
      data-trial-prompt-banner=""
    >
      <Crown className="w-5 h-5 text-[#D4AF37] shrink-0 hidden sm:block" />
      <p className="flex-1 text-[13px] leading-snug text-white/70">
        Try Pro free — {option.trialLabel} of {option.name} ({option.price}
        {option.per}), then just {option.perDay} a day.
      </p>
      <TrialButton
        label={option.cta}
        days={option.trialDays === 3 ? 3 : 10}
        onClick={openPicker}
        className="w-36 shrink-0 sm:w-44"
      />
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="shrink-0 p-1.5 rounded-full text-white/40 hover:text-white hover:bg-white/10 transition"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
    </>
  );
}
