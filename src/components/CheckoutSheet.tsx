"use client";

/**
 * /pricing's in-place checkout: the embedded Stripe form opens in a
 * sheet (bottom sheet on mobile, centered dialog on desktop) instead of
 * navigating to /checkout — the visitor keeps their place on the page
 * and the form's express wallet buttons lead with zero scroll.
 *
 * The session lifecycle is owned by a CheckoutSessionController
 * (lib/billing/embedded-checkout): opening creates a fresh session,
 * closing destroys the mounted form, reopening starts over with a new
 * session. Everything behind it is the same Checkout-Session machinery
 * as /checkout — webhook account claim, affiliate metadata,
 * abandoned-cart recovery, /welcome completion — nothing forks.
 *
 * Closing is NOT a Stripe cancel: the sheet closes locally and returns
 * the visitor to exactly where they were on /pricing. No navigation, no
 * ?checkout=cancelled (that param is reserved for Stripe's cancel_url,
 * which the cancel-recovery strip keys off), and the /checkout back-link
 * path fires no analytics event for this to mirror (inventoried
 * 2026-10-20: there is none).
 */
import { useEffect, useRef, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { X } from "lucide-react";
import { checkoutPlanSummary } from "@/lib/billing/trial-checkout";
import type { BillingPlan } from "@/lib/billing/trials";
import {
  createCheckoutSessionController,
  type StripeJsLike,
} from "@/lib/billing/embedded-checkout";
import { CheckoutGuaranteeNote, CheckoutPlanStrip } from "./CheckoutPlanStrip";
import HostedCheckoutLink from "./HostedCheckoutLink";

// Next inlines this literal access into the browser bundle at build time.
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

type Phase = "starting" | "mounted" | "redirecting" | "error";

export default function CheckoutSheet({
  plan,
  onClose,
}: {
  plan: BillingPlan | null;
  onClose: () => void;
}) {
  // A fresh SheetContent per open (keyed by an incrementing sequence),
  // so a reopened sheet never inherits the previous session's state —
  // its mount effect, scroll lock and controller all start clean.
  const [seq, setSeq] = useState(0);
  const [prevPlan, setPrevPlan] = useState(plan);
  if (plan !== prevPlan) {
    setPrevPlan(plan);
    if (plan) setSeq((s) => s + 1);
  }
  if (!plan) return null;
  return <SheetContent key={`${seq}:${plan}`} plan={plan} onClose={onClose} />;
}

function SheetContent({
  plan,
  onClose,
}: {
  plan: BillingPlan;
  onClose: () => void;
}) {
  const summary = checkoutPlanSummary(plan);
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [phase, setPhase] = useState<Phase>("starting");
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [entered, setEntered] = useState(false);

  // Entrance transition (slide up on mobile, fade/zoom on desktop).
  useEffect(() => {
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  // Page scroll lock + Escape-to-close while the sheet is open.
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  // The session: a fresh controller (hence a fresh Checkout Session)
  // per mount and per retry; unmounting closes it, destroying the form.
  useEffect(() => {
    if (!summary) return;
    const controller = createCheckoutSessionController();
    let live = true;
    setPhase("starting");
    setError(null);
    controller
      .start(plan, PUBLISHABLE_KEY, {
        fetchImpl: fetch as never,
        loadStripeImpl: async (pk) =>
          (await loadStripe(pk)) as unknown as StripeJsLike | null,
        navigate: (url) => {
          window.location.href = url;
        },
        mountTarget: mountRef.current,
      })
      .then((outcome) => {
        if (!live) return;
        setPhase(outcome.kind === "mounted" ? "mounted" : "redirecting");
      })
      .catch((e) => {
        if (!live) return;
        setError(e instanceof Error ? e.message : "Checkout failed");
        setPhase("error");
      });
    return () => {
      live = false;
      controller.close();
    };
  }, [plan, summary, attempt]);

  if (!summary) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end md:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={`Checkout — ${summary.name} plan`}
    >
      <div
        className={`absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-200 ${
          entered ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />
      <div
        className={`relative w-full md:max-w-lg max-h-[92dvh] overflow-y-auto rounded-t-3xl md:rounded-3xl border border-white/10 bg-[#0a0a10] p-4 md:p-5 shadow-2xl transition-all duration-200 ${
          entered
            ? "translate-y-0 opacity-100"
            : "translate-y-6 md:translate-y-2 opacity-0"
        }`}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close checkout"
          className="absolute right-3 top-3 z-10 w-8 h-8 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center text-white/60 hover:text-white transition"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="pr-9">
          <CheckoutPlanStrip summary={summary} />
        </div>

        {/* The form — same reserved-height wrapper as /checkout, so the
            loading state never pushes the layout around. */}
        <div className="relative mt-3 rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden min-h-[480px]">
          <div ref={mountRef} />
          {phase === "starting" && (
            <p className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-white/45">
              Loading secure checkout…
            </p>
          )}
          {phase === "redirecting" && (
            <p className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-white/45">
              Taking you to secure checkout…
            </p>
          )}
          {phase === "error" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
              <p className="text-red-400 text-sm">{error ?? "Checkout failed"}</p>
              <button
                type="button"
                onClick={() => setAttempt((a) => a + 1)}
                className="mt-4 px-6 py-2.5 rounded-2xl bg-[#D4AF37] text-black font-bold text-sm hover:brightness-110 transition"
              >
                Try again
              </button>
            </div>
          )}
        </div>

        <CheckoutGuaranteeNote summary={summary} />
        <div className="mt-3 text-center">
          <HostedCheckoutLink plan={plan} />
        </div>
      </div>
    </div>
  );
}
