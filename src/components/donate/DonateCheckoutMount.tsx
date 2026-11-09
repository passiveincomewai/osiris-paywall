"use client";

/**
 * Support WorldEye — step 2's Stripe Embedded Checkout mount.
 *
 * One mount = one donation Checkout Session (POST /api/donate/session),
 * created through fetchClientSecret and destroyed on unmount or when
 * the amount/frequency changes (the popup remounts this component by
 * key). Completion arrives via onComplete (the session is created
 * with redirect_on_completion "if_required", so card payments finish
 * in place; redirect-based methods leave for /support/thanks).
 */
import { useEffect, useRef, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import type { StripeEmbeddedCheckout } from "@stripe/stripe-js";
import type { DonateCopy } from "@/i18n/dictionaries";
import type { DonateFrequency } from "@/lib/donate/config";

// Next inlines this literal access into the browser bundle at build time.
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

export default function DonateCheckoutMount({
  amount,
  frequency,
  source,
  copy,
  onComplete,
}: {
  amount: number;
  frequency: DonateFrequency;
  source: string;
  copy: DonateCopy;
  onComplete: () => void;
}) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const completeRef = useRef(onComplete);
  completeRef.current = onComplete;
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    let checkout: StripeEmbeddedCheckout | null = null;
    setPhase("loading");

    (async () => {
      if (!PUBLISHABLE_KEY) throw new Error("missing publishable key");
      const stripeJs = await loadStripe(PUBLISHABLE_KEY);
      if (!stripeJs) throw new Error("stripe.js failed to load");
      const fetchClientSecret = async (): Promise<string> => {
        const res = await fetch("/api/donate/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount, frequency, source }),
        });
        const data = (await res.json().catch(() => null)) as {
          clientSecret?: string;
        } | null;
        if (!res.ok || !data?.clientSecret) {
          throw new Error("donate session failed");
        }
        return data.clientSecret;
      };
      const embedded = await stripeJs.initEmbeddedCheckout({
        fetchClientSecret,
        onComplete: () => {
          if (live) completeRef.current();
        },
      });
      if (!live) {
        embedded.destroy();
        return;
      }
      checkout = embedded;
      if (mountRef.current) embedded.mount(mountRef.current);
      setPhase("ready");
    })().catch(() => {
      if (live) setPhase("error");
    });

    return () => {
      live = false;
      checkout?.destroy();
    };
  }, [amount, frequency, source, attempt]);

  if (phase === "error") {
    return (
      <div className="grid place-items-center rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-14 text-center">
        <p className="text-sm text-zinc-300">{copy.loadError}</p>
        <button
          type="button"
          onClick={() => setAttempt((a) => a + 1)}
          className="mt-4 rounded-full bg-[linear-gradient(90deg,#8BEAFA,#22D3EE)] px-5 py-2 text-sm font-bold text-[#06202B] transition hover:brightness-105"
        >
          {copy.retry}
        </button>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl bg-white">
      <div ref={mountRef} />
      {phase === "loading" && (
        <div aria-hidden className="absolute inset-0 space-y-3 bg-white px-5 py-6">
          <div className="h-5 w-2/5 animate-pulse rounded bg-zinc-200" />
          <div className="h-11 w-full animate-pulse rounded-lg bg-zinc-200" />
          <div className="h-11 w-full animate-pulse rounded-lg bg-zinc-200" />
          <div className="h-11 w-full animate-pulse rounded-lg bg-zinc-100" />
          <div className="h-11 w-full animate-pulse rounded-lg bg-zinc-200" />
        </div>
      )}
    </div>
  );
}
