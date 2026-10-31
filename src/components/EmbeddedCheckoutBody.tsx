"use client";

/**
 * The embedded Stripe checkout, as a self-contained body: plan strip,
 * the reserved-height form mount, guarantee line, hosted option. One
 * mount = one Checkout Session, owned by a CheckoutSessionController
 * (lib/billing/embedded-checkout): mounting starts a fresh session,
 * unmounting destroys the form, so no surface that hosts this body can
 * leak a live Stripe iframe or resurrect a stale session.
 *
 * Hosts: /pricing's CheckoutSheet (dialog chrome around this body) and
 * TrialPicker's embedded mode (the lock popups, where the picker swaps
 * its plan list for this body in place). /checkout the page keeps its
 * own inline flow — same lib, same fallbacks, page-shaped chrome.
 *
 * Completion is the session's return_url, exactly as everywhere else:
 * /welcome for guests, the app for members, the webhook does the rest.
 * Any embedded failure resolves through the controller's flow to the
 * hosted redirect; a refusal reaches the error state below as a
 * structured CheckoutError (lib/billing/checkout-error) and renders
 * through components/CheckoutErrorState — the server's own message,
 * a Manage-subscription action for members who already hold a plan
 * (never a futile retry), retry + the hosted route for the rest.
 */
import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import { checkoutPlanSummary, type CheckoutPlanId } from "@/lib/billing/trial-checkout";
import {
  trackCheckoutStarted,
  type PickerSurface,
} from "@/lib/billing/picker-analytics";
import {
  createCheckoutSessionController,
  type StripeJsLike,
} from "@/lib/billing/embedded-checkout";
import { CheckoutGuaranteeNote, CheckoutPlanStrip } from "./CheckoutPlanStrip";
import CancelReassurance from "./CancelReassurance";
import CheckoutErrorState from "./CheckoutErrorState";
import HostedCheckoutLink from "./HostedCheckoutLink";
import {
  toCheckoutError,
  type CheckoutError,
} from "@/lib/billing/checkout-error";

// Next inlines this literal access into the browser bundle at build time.
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

type Phase = "starting" | "mounted" | "redirecting" | "error";

export default function EmbeddedCheckoutBody({
  plan,
  stripClassName,
  hideHostedOption = false,
  analyticsSurface,
}: {
  plan: CheckoutPlanId;
  /** Surfaces the owner wants embedded-only (TrialCtaSection cards)
   *  pass this: no hosted payment-link option under the form. */
  hideHostedOption?: boolean;
  /** Extra classes on the plan-strip wrapper (a host whose close
   *  button overlays the strip's corner passes clearance here). */
  stripClassName?: string;
  /** Phase E funnel attribution (lib/billing/picker-analytics): the
   *  surface whose initiation this session creation belongs to.
   *  Hosts that name none record "sheet". */
  analyticsSurface?: PickerSurface;
}) {
  const summary = checkoutPlanSummary(plan);
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [phase, setPhase] = useState<Phase>("starting");
  const [error, setError] = useState<CheckoutError | null>(null);
  const [attempt, setAttempt] = useState(0);

  // A fresh controller (hence a fresh Checkout Session) per mount and
  // per retry; unmounting closes it, destroying the form.
  useEffect(() => {
    if (!summary) return;
    // Phase E: one checkout_started per session creation (a retry is
    // a new session and fires again — see picker-analytics).
    trackCheckoutStarted(analyticsSurface ?? "sheet", plan);
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
        setError(toCheckoutError(e));
        setPhase("error");
      });
    return () => {
      live = false;
      controller.close();
    };
    // summary is a module-constant record per plan — identity-stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan, attempt]);

  if (!summary) return null;

  return (
    <>
      <div className={stripClassName}>
        <CheckoutPlanStrip summary={summary} />
      </div>

      {/* The form. min-h reserves the space Stripe's form will occupy,
          so the loading state never pushes the layout around when the
          form mounts; the wallet buttons sit at the form's top. */}
      <div className="relative mt-3 rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden min-h-[480px]">
        <div ref={mountRef} />
        {phase === "starting" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
            <Loader2 className="w-7 h-7 animate-spin text-[#D4AF37]" aria-hidden />
            <p role="status" className="text-sm text-white/45">
              Loading secure checkout…
            </p>
          </div>
        )}
        {phase === "redirecting" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
            <Loader2 className="w-7 h-7 animate-spin text-[#D4AF37]" aria-hidden />
            <p role="status" className="text-sm text-white/45">
              Taking you to secure checkout…
            </p>
          </div>
        )}
        {phase === "error" && error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
            <CheckoutErrorState
              plan={plan}
              error={error}
              onRetry={() => setAttempt((a) => a + 1)}
              onError={setError}
              surface={analyticsSurface}
            />
          </div>
        )}
      </div>

      <CheckoutGuaranteeNote summary={summary} />
      <CancelReassurance compact guarantee={Boolean(summary?.trialLabel)} />
      {!hideHostedOption && (
        <div className="mt-3 text-center">
          <HostedCheckoutLink plan={plan} surface={analyticsSurface} />
        </div>
      )}
    </>
  );
}
