"use client";

/**
 * Step 4 of the upgrade popup: the order summary (left) and Stripe's
 * Embedded Checkout mounted in the right column. The session comes
 * from the existing POST /api/checkout (see lib/billing/upgrade-
 * checkout for the flow and its one additive ui_context flag); the
 * hosted-checkout fallback below is the same startHostedCheckout every
 * other surface offers. The popup never unlocks anything itself —
 * completion is reported to the host, and access arrives through the
 * existing Stripe webhooks.
 */

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Lock } from "lucide-react";
import {
  UPGRADE_PLANS,
  upgradeCheckoutPlan,
  type UpgradeSelection,
} from "@/lib/upgrade-popup";
import {
  createUpgradeCheckoutController,
  type UpgradeCheckoutPhase,
} from "@/lib/billing/upgrade-checkout";
import { startHostedCheckout } from "@/lib/billing/trial-checkout";
import type { CheckoutError } from "@/lib/billing/checkout-error";
import { trackAnalyticsEvent } from "../AnalyticsTracker";

export function UpgradeCheckoutStep({
  selection,
  onBack,
  onComplete,
}: {
  selection: UpgradeSelection;
  onBack: () => void;
  onComplete: () => void;
}) {
  const facts = UPGRADE_PLANS[selection.plan];
  const yearly = selection.interval === "annual";
  const planKey = upgradeCheckoutPlan(selection.plan, selection.interval);
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [phase, setPhase] = useState<UpgradeCheckoutPhase>("idle");
  const [error, setError] = useState<CheckoutError | null>(null);
  const [attempt, setAttempt] = useState(0);
  const startedRef = useRef(false);

  useEffect(() => {
    const controller = createUpgradeCheckoutController({
      onPhase: (p, e) => {
        setPhase(p);
        setError(e ?? null);
      },
      onComplete,
    });
    if (!startedRef.current) {
      startedRef.current = true;
      trackAnalyticsEvent("upgrade_checkout_started", `${selection.plan}_${selection.interval}`);
    }
    void controller.start(planKey, mountRef.current);
    return () => controller.close();
    // planKey derives from the selection; attempt is the retry lever.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planKey, attempt]);

  const price = yearly ? facts.yearlyTotal : facts.monthlyPrice;
  const periodWord = yearly ? "year" : "month";

  return (
    <div className="px-5 pb-6 pt-5 sm:px-7">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm font-semibold text-white/70 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Change plan
        </button>
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/40">
          Step 2 of 2
        </span>
      </div>

      <h3 className="mt-4 text-[24px] font-extrabold tracking-tight text-white">
        Start your free trial
      </h3>

      <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-[300px_1fr]">
        {/* Order summary */}
        <div
          className="h-fit rounded-2xl border p-5"
          style={{
            borderColor: `${facts.color}66`,
            background: `linear-gradient(180deg, ${facts.color}14, rgba(255,255,255,0.02))`,
          }}
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[19px] font-extrabold text-white">{facts.name}</span>
            {facts.popular && (
              <span className="rounded-md bg-gradient-to-b from-[#F6D77A] to-[#E4B93F] px-2 py-0.5 text-[10px] font-extrabold tracking-[0.08em] text-black">
                MOST POPULAR
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[13px] text-white/50">
            {facts.tagline} · billed {yearly ? "yearly" : "monthly"}
          </p>
          <dl className="mt-4 space-y-2 text-[13.5px]">
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-white/55">Plan price</dt>
              <dd className="font-semibold text-white">
                {price}
                <span className="text-white/45"> / {periodWord}</span>
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-white/55">Free trial</dt>
              <dd className="font-semibold text-white">10 days</dd>
            </div>
            <div className="flex items-baseline justify-between gap-3 border-t border-dashed border-white/12 pt-2.5">
              <dt className="text-white/70">Due today</dt>
              <dd className="text-[20px] font-extrabold text-[#34D399]">$0.00</dd>
            </div>
          </dl>
          <p className="mt-3 text-[12.5px] leading-relaxed text-white/50">
            Then {price} per {periodWord} after your trial. Cancel anytime before and pay
            nothing.
          </p>
          {/* 3-dot timeline */}
          <ol className="mt-4 space-y-0">
            {[
              `Today: full ${facts.name} access`,
              "Before day 10: reminder email",
              "Day 10: first charge",
            ].map((label, i, arr) => (
              <li key={label} className="relative flex gap-3 pb-4 last:pb-0">
                {i < arr.length - 1 && (
                  <span className="absolute left-[5px] top-3.5 h-[calc(100%-12px)] w-px bg-white/15" />
                )}
                <span
                  className="mt-1 h-[11px] w-[11px] shrink-0 rounded-full border-2"
                  style={{
                    borderColor: facts.color,
                    background: i === 0 ? facts.color : "transparent",
                  }}
                />
                <span className="text-[12.5px] leading-snug text-white/70">{label}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Stripe mount / states */}
        <div>
          <div className="relative min-h-[320px] overflow-hidden rounded-2xl bg-white">
            <div ref={mountRef} className={phase === "mounted" ? undefined : "hidden"} />
            {phase === "loading" || phase === "idle" ? (
              <div className="absolute inset-0 animate-pulse p-5" aria-label="Loading checkout">
                <div className="h-9 rounded-lg bg-zinc-200" />
                <div className="mt-3 h-9 rounded-lg bg-zinc-200" />
                <div className="mt-3 h-9 w-2/3 rounded-lg bg-zinc-200" />
                <div className="mt-6 h-11 rounded-lg bg-zinc-300" />
              </div>
            ) : null}
            {phase === "error" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#15171C] p-6 text-center">
                <p className="text-sm font-semibold text-white">
                  {error?.alreadySubscribed
                    ? error.serverMessage ?? "You already have a plan"
                    : "Couldn't load checkout. Try again"}
                </p>
                {error?.alreadySubscribed ? (
                  <a
                    href={error.managePath}
                    className="rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15"
                  >
                    Manage subscription
                  </a>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setAttempt((a) => a + 1)}
                      className="rounded-xl px-4 py-2.5 text-sm font-bold text-black transition hover:brightness-110"
                      style={{ background: `linear-gradient(180deg, ${facts.color}, ${facts.color}CC)` }}
                    >
                      Try again
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        void startHostedCheckout(planKey, { surface: "hosted" }).catch(() => {
                          setError(null);
                          setPhase("error");
                        });
                      }}
                      className="text-[13px] font-medium text-white/60 underline underline-offset-2 transition hover:text-white"
                    >
                      Continue on Stripe's secure checkout instead
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
          <p className="mt-2.5 flex items-center justify-center gap-1.5 text-[12px] text-white/40">
            <Lock className="h-3.5 w-3.5" />
            Payments handled securely by Stripe
          </p>
        </div>
      </div>
    </div>
  );
}
