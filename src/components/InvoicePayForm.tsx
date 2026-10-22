"use client";

/**
 * Pays ONE specific Stripe invoice on-site — the prorated difference for
 * a plan switch that is pending payment (see /api/billing/switch's
 * payment_behavior "pending_if_incomplete" flow). Renders Stripe's
 * Payment Element bound to the invoice's own PaymentIntent, so the card
 * is entered into Stripe's iframe, never our page, and paying the
 * invoice is what makes Stripe apply the pending plan change.
 *
 * Fallbacks, in the codebase's usual order: no publishable key or no
 * client secret → a button to Stripe's hosted invoice page instead.
 */
import { useEffect, useRef, useState } from "react";
import { loadStripe, type Stripe, type StripeElements } from "@stripe/stripe-js";
import { Loader2 } from "lucide-react";

// Next inlines this literal access into the browser bundle at build time.
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

export default function InvoicePayForm({
  clientSecret,
  hostedUrl,
  amountLabel,
  onPaid,
}: {
  clientSecret: string | null;
  hostedUrl: string | null;
  /** e.g. "$61.62" — the exact amount this form charges. */
  amountLabel: string;
  /** Fires when Stripe reports the payment succeeded/processing — the
   *  host polls the subscription state until the new plan shows. */
  onPaid: () => void;
}) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const stripeRef = useRef<Stripe | null>(null);
  const elementsRef = useRef<StripeElements | null>(null);
  const [ready, setReady] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canEmbed = Boolean(PUBLISHABLE_KEY && clientSecret);

  useEffect(() => {
    if (!canEmbed || !clientSecret) return;
    let live = true;
    (async () => {
      const stripe = await loadStripe(PUBLISHABLE_KEY!);
      if (!live || !stripe || !mountRef.current) return;
      const elements = stripe.elements({
        clientSecret,
        appearance: { theme: "night", labels: "floating" },
      });
      const payment = elements.create("payment");
      payment.on("ready", () => live && setReady(true));
      payment.mount(mountRef.current);
      stripeRef.current = stripe;
      elementsRef.current = elements;
    })();
    return () => {
      live = false;
    };
  }, [canEmbed, clientSecret]);

  async function pay() {
    const stripe = stripeRef.current;
    const elements = elementsRef.current;
    if (!stripe || !elements) return;
    setPaying(true);
    setError(null);
    try {
      const { error: submitError } = await elements.submit();
      if (submitError) {
        setError(submitError.message ?? "Check your payment details and try again.");
        return;
      }
      const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: "if_required",
        confirmParams: { return_url: window.location.href },
      });
      if (confirmError) {
        setError(confirmError.message ?? "The payment didn't go through — nothing was charged.");
        return;
      }
      if (
        paymentIntent &&
        (paymentIntent.status === "succeeded" || paymentIntent.status === "processing")
      ) {
        onPaid();
      }
    } catch {
      setError("The payment didn't go through — nothing was charged.");
    } finally {
      setPaying(false);
    }
  }

  if (!canEmbed) {
    // Hosted fallback: Stripe's own invoice page collects the payment.
    return hostedUrl ? (
      <a
        href={hostedUrl}
        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black text-sm font-bold hover:brightness-110 transition"
      >
        Pay {amountLabel} on Stripe&rsquo;s secure page
      </a>
    ) : (
      <p className="text-sm text-red-400">
        We couldn&rsquo;t load the payment form. Refresh the page to try again.
      </p>
    );
  }

  return (
    <div>
      <div ref={mountRef} />
      {error && (
        <p role="alert" className="text-sm text-red-400 mt-3">
          {error}
        </p>
      )}
      <button
        onClick={pay}
        disabled={!ready || paying}
        className="mt-4 w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black text-sm font-bold hover:brightness-110 transition disabled:opacity-60"
      >
        {paying ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" /> Paying…
          </>
        ) : (
          `Pay ${amountLabel}`
        )}
      </button>
      <p className="text-xs text-white/35 mt-2">
        Card details go straight to Stripe — WorldEye never sees or stores them.
      </p>
    </div>
  );
}
