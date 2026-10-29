"use client";

/**
 * On-site checkout: Stripe's form, mounted on worldeye.app — form first.
 *
 * Every buy surface EXCEPT /pricing (whose CTAs open the same form in a
 * sheet, components/CheckoutSheet) lands here via startPlanCheckout with
 * ?plan=. This page asks POST /api/checkout for an embedded session and
 * mounts it with Stripe.js; ANY failure along that path — above all the
 * publishable key not being configured yet — falls back to the hosted
 * redirect, so checkout works exactly as it did before this page existed
 * (the flow and its fallbacks live in lib/billing/embedded-checkout and
 * are proven there).
 *
 * Layout (Jameson's mobile fix, 2026-10-20): the first version led with
 * our framing — logo hero, big heading, a tall plan card restating the
 * trial terms — and Stripe's form only began at the bottom edge of a
 * phone screen, its wallet buttons below the fold. Now the DOM order is:
 * slim top bar → compact plan strip (components/CheckoutPlanStrip) →
 * the form → one small guarantee line → the hosted-checkout option. The
 * form wrapper reserves its height while loading, so nothing jumps when
 * Stripe's form (express wallet buttons at its top) mounts.
 *
 * Scroll: the page renders .docs-root, the codebase's marker that
 * releases the globe's global viewport lock (html/body height:100% +
 * overflow:hidden in globals.css). Without it this page could not
 * scroll AT ALL — on a short laptop viewport the mounted form ran
 * past the bottom edge with the pay button, the guarantee line and
 * the hosted option unreachable below it (Jameson's photo,
 * 2026-10-29). Every other long-form page already opts out this way.
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
import { ArrowLeft, Lock } from "lucide-react";
import { checkoutPlanSummary } from "@/lib/billing/trial-checkout";
import {
  checkoutPlanFromParam,
  runCheckoutFlow,
  type StripeJsLike,
} from "@/lib/billing/embedded-checkout";
import {
  CheckoutGuaranteeNote,
  CheckoutPlanStrip,
} from "@/components/CheckoutPlanStrip";
import CheckoutErrorState from "@/components/CheckoutErrorState";
import HostedCheckoutLink from "@/components/HostedCheckoutLink";
import {
  toCheckoutError,
  type CheckoutError,
} from "@/lib/billing/checkout-error";

// Next inlines this literal access into the browser bundle at build time.
// Unset until Jameson publishes the key in Vercel — while it's unset the
// flow below takes the hosted fallback for every checkout.
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

type Phase = "starting" | "mounted" | "redirecting" | "error";

export default function CheckoutClient() {
  const params = useSearchParams();
  const plan = checkoutPlanFromParam(params.get("plan"));
  const summary = checkoutPlanSummary(plan);
  const mountRef = useRef<HTMLDivElement | null>(null);
  const destroyRef = useRef<(() => void) | null>(null);
  const [phase, setPhase] = useState<Phase>("starting");
  const [error, setError] = useState<CheckoutError | null>(null);
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
          setError(toCheckoutError(e));
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
    <main className="docs-root min-h-screen bg-[#050508] text-zinc-100 relative overflow-x-clip">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full opacity-20 blur-[120px] bg-[#D4AF37]" />
      </div>

      <div className="relative max-w-xl mx-auto px-4 md:px-6 py-4 md:py-8">
        {/* Slim top bar: the way back, and what this page is — nothing
            else stands between the visitor and the form. */}
        <div className="flex items-center justify-between mb-4">
          {/* Same return Stripe's cancel_url produced: the pricing page's
              cancel-recovery strip keys off ?checkout=cancelled. */}
          <Link
            href="/pricing?checkout=cancelled"
            className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" /> Back to pricing
          </Link>
          <span className="flex items-center gap-1.5 text-xs text-white/40">
            <Lock className="w-3.5 h-3.5" /> Secure checkout
          </span>
        </div>

        {!summary || !plan ? (
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
            <CheckoutPlanStrip summary={summary} />
            {/* The form. min-h reserves the space Stripe's form will
                occupy, so the loading state never pushes the layout
                around when the form mounts. The node stays mounted
                across phases so the flow's mount target is stable. */}
            <div className="relative mt-3 rounded-3xl border border-white/10 bg-white/[0.02] overflow-hidden min-h-[480px]">
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
              {phase === "error" && error && (
                <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
                  <CheckoutErrorState
                    plan={plan}
                    error={error}
                    onRetry={() => setAttempt((a) => a + 1)}
                    onError={setError}
                  />
                  {!error.alreadySubscribed && (
                    <p className="mt-3 text-xs text-white/35">
                      Still stuck? Head back to pricing and pick the plan there.
                    </p>
                  )}
                </div>
              )}
            </div>
            <CheckoutGuaranteeNote summary={summary} />
            <div className="mt-3 text-center">
              <HostedCheckoutLink plan={plan} />
            </div>
          </>
        )}
      </div>
    </main>
  );
}
