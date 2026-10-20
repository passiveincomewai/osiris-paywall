"use client";

/**
 * On-site checkout: Stripe's form, mounted on worldeye.app.
 *
 * Every buy surface (pricing, the Pro-lock TrialPickers) lands here via
 * startPlanCheckout with ?plan=. This page asks POST /api/checkout for an
 * embedded session and mounts it with Stripe.js; ANY failure along that
 * path — above all the publishable key not being configured yet — falls
 * back to the hosted redirect, so checkout works exactly as it did
 * before this page existed until the key is published (the flow and its
 * fallbacks live in lib/billing/embedded-checkout and are proven there).
 *
 * Completion is unchanged: the session's return_url brings the buyer to
 * /welcome (guests) or the app (members), where the existing claim flow
 * and the webhook do their work. Backing out goes to
 * /pricing?checkout=cancelled — the same return Stripe's cancel_url used
 * — so the cancel-recovery strip still meets the visitor there.
 */
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import { ArrowLeft, Lock, ShieldCheck, Zap } from "lucide-react";
import {
  checkoutPlanSummary,
  type CheckoutPlanSummary,
} from "@/lib/billing/trial-checkout";
import {
  checkoutPlanFromParam,
  runCheckoutFlow,
  type StripeJsLike,
} from "@/lib/billing/embedded-checkout";

// Next inlines this literal access into the browser bundle at build time.
// Unset until Jameson publishes the key in Vercel — while it's unset the
// flow below takes the hosted fallback for every checkout.
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

/** The money-back line exactly as /pricing states it under its plan card. */
const GUARANTEE_LINE =
  "Covered by a 7-day money-back guarantee on your first charge — email us within 7 days of the charge for a full refund, no questions asked.";

/**
 * The plan being bought, in /pricing's own words (the summary record is
 * built from PLAN_COPY / pricing's enterprise entry — see trial-checkout).
 * Purely presentational so the render tests can pin it.
 */
export function CheckoutPlanSummaryCard({ summary }: { summary: CheckoutPlanSummary }) {
  return (
    <div className="rounded-3xl border border-[#D4AF37]/30 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-5 md:p-6">
      <p className="text-sm font-semibold tracking-[0.2em] text-[#D4AF37]">
        {summary.plan === "enterprise" ? "ENTERPRISE" : "PRO"}
      </p>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="text-5xl font-bold tracking-tight">{summary.price}</span>
        <span className="text-white/45 text-lg">{summary.per}</span>
      </div>
      <p className="text-sm text-white/45 mt-2">{summary.note}</p>
      <p className="text-sm text-[#D4AF37] font-semibold mt-1.5">
        Just {summary.perDay} a day
      </p>
      {summary.trialLabel && (
        <p className="mt-3">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide px-3 py-1.5 rounded-full bg-emerald-400/15 text-emerald-300 border border-emerald-400/30">
            <Zap className="w-3.5 h-3.5" /> {summary.trialLabel} — card not charged yet
          </span>
        </p>
      )}
      {summary.plan === "enterprise" ? (
        <p className="flex items-center gap-2 text-xs text-white/35 mt-4">
          <Lock className="w-3.5 h-3.5" /> Secured by Stripe
        </p>
      ) : (
        <>
          <p className="flex items-center gap-2 text-xs text-white/35 mt-4">
            <Lock className="w-3.5 h-3.5" /> Secured by Stripe · Cancel anytime · 1-click cancellation
          </p>
          <p className="flex items-center gap-2 text-xs text-white/50 mt-2">
            <ShieldCheck className="w-3.5 h-3.5 text-[#D4AF37]/80 shrink-0" /> {GUARANTEE_LINE}
          </p>
        </>
      )}
    </div>
  );
}

type Phase = "starting" | "mounted" | "redirecting" | "error";

export default function CheckoutClient() {
  const params = useSearchParams();
  const plan = checkoutPlanFromParam(params.get("plan"));
  const summary = checkoutPlanSummary(plan);
  const mountRef = useRef<HTMLDivElement | null>(null);
  const destroyRef = useRef<(() => void) | null>(null);
  const [phase, setPhase] = useState<Phase>("starting");
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!plan) return;
    let cancelled = false;
    setPhase("starting");
    setError(null);
    (async () => {
      try {
        const outcome = await runCheckoutFlow(plan, PUBLISHABLE_KEY, {
          fetchImpl: fetch as never,
          loadStripeImpl: async (pk) =>
            (await loadStripe(pk)) as unknown as StripeJsLike | null,
          navigate: (url) => {
            window.location.href = url;
          },
          mountTarget: mountRef.current,
        });
        if (cancelled) {
          if (outcome.kind === "mounted") outcome.destroy();
          return;
        }
        if (outcome.kind === "mounted") {
          destroyRef.current = outcome.destroy;
          setPhase("mounted");
        } else {
          setPhase("redirecting");
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Checkout failed");
          setPhase("error");
        }
      }
    })();
    return () => {
      cancelled = true;
      destroyRef.current?.();
      destroyRef.current = null;
    };
  }, [plan, attempt]);

  return (
    <main className="min-h-screen bg-[#050508] text-zinc-100 relative overflow-x-clip">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full opacity-20 blur-[120px] bg-[#D4AF37]" />
      </div>

      <div className="relative max-w-xl mx-auto px-6 py-6 md:py-8">
        <div className="flex items-center justify-between mb-6">
          {/* Same return Stripe's cancel_url produced: the pricing page's
              cancel-recovery strip keys off ?checkout=cancelled. */}
          <Link
            href="/pricing?checkout=cancelled"
            className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" /> Back to pricing
          </Link>
          <span className="text-[11px] font-mono tracking-[0.3em] text-[#D4AF37]">
            WORLDEYE PRO
          </span>
        </div>

        <div className="text-center mb-6">
          <img
            src="/worldeye-eye.png"
            alt="WorldEye"
            width={600}
            height={432}
            className="h-10 w-auto mx-auto mb-3"
            style={{ filter: "drop-shadow(0 0 18px rgba(0,150,255,0.45))" }}
          />
          <h1 className="text-2xl font-bold tracking-tight">Secure checkout</h1>
        </div>

        {!summary ? (
          <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 text-center">
            <p className="text-white/70">
              That checkout link doesn&rsquo;t name a plan.
            </p>
            <Link
              href="/pricing"
              className="inline-block mt-4 px-6 py-2.5 rounded-2xl bg-[#D4AF37] text-black font-bold text-sm hover:brightness-110 transition"
            >
              See the plans
            </Link>
          </div>
        ) : (
          <>
            <CheckoutPlanSummaryCard summary={summary} />
            <div className="mt-5 rounded-3xl border border-white/10 bg-white/[0.02] overflow-hidden">
              {/* Stripe mounts its form here. The node stays mounted across
                  phases so the flow's mount target is stable. */}
              <div ref={mountRef} />
              {phase === "starting" && (
                <p className="px-6 py-10 text-center text-sm text-white/45">
                  Loading secure checkout…
                </p>
              )}
              {phase === "redirecting" && (
                <p className="px-6 py-10 text-center text-sm text-white/45">
                  Taking you to secure checkout…
                </p>
              )}
              {phase === "error" && (
                <div className="px-6 py-8 text-center">
                  <p className="text-red-400 text-sm">{error ?? "Checkout failed"}</p>
                  <button
                    type="button"
                    onClick={() => setAttempt((a) => a + 1)}
                    className="mt-4 px-6 py-2.5 rounded-2xl bg-[#D4AF37] text-black font-bold text-sm hover:brightness-110 transition"
                  >
                    Try again
                  </button>
                  <p className="mt-3 text-xs text-white/35">
                    Still stuck? Head back to pricing and pick the plan there.
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
