"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

export interface GiftPlanOption {
  key: string;
  displayName: string;
  displayPrice: string;
  period: "weekly" | "monthly" | "annual";
}

const TERM_LABEL: Record<GiftPlanOption["period"], string> = {
  weekly: "one week",
  monthly: "one month",
  annual: "one year",
};

/**
 * The gift purchase form: plan choice + recipient email (+ buyer
 * email for guests; signed-in buyers gift from their account email).
 * Submitting creates the gift and hands off to Stripe's hosted
 * checkout — fulfilment and the recipient email happen in the
 * webhook, so this form never claims a gift was delivered, only that
 * payment started.
 */
export default function GiftClient({
  plans,
  buyerEmail,
}: {
  plans: GiftPlanOption[];
  buyerEmail: string | null;
}) {
  const searchParams = useSearchParams();
  const cancelled = searchParams.get("checkout") === "cancelled";
  const [planKey, setPlanKey] = useState<string>(
    plans.find((p) => p.key === "pro_annual")?.key ?? plans[0]?.key ?? "",
  );
  const [recipientEmail, setRecipientEmail] = useState("");
  const [guestBuyerEmail, setGuestBuyerEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/gift/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          planKey,
          recipientEmail,
          ...(buyerEmail ? {} : { buyerEmail: guestBuyerEmail }),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        url?: string;
        error?: string;
      };
      if (!res.ok || !data.url) {
        throw new Error(data.error ?? "Checkout could not be started. Please try again.");
      }
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setBusy(false);
    }
  }

  if (plans.length === 0) {
    return (
      <p className="mt-8 rounded-2xl border border-white/10 bg-white/[0.02] p-5 text-white/70">
        Gift plans aren&apos;t available right now. Please check back soon.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="mt-8">
      {cancelled && (
        <p className="mb-5 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/70">
          Checkout was cancelled — no charge was made. Pick a plan and try
          again whenever you&apos;re ready.
        </p>
      )}

      <fieldset>
        <legend className="text-sm font-bold text-white/85">Choose the plan</legend>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {plans.map((plan) => (
            <label
              key={plan.key}
              className={`cursor-pointer rounded-2xl border p-4 transition ${
                planKey === plan.key
                  ? "border-[#D4AF37] bg-[#D4AF37]/10"
                  : "border-white/10 bg-white/[0.02] hover:border-white/25"
              }`}
            >
              <input
                type="radio"
                name="gift-plan"
                value={plan.key}
                checked={planKey === plan.key}
                onChange={() => setPlanKey(plan.key)}
                className="sr-only"
              />
              <span className="block text-sm font-black text-white">{plan.displayName}</span>
              <span className="mt-1 block text-2xl font-black text-white">
                {plan.displayPrice}
              </span>
              <span className="mt-1 block text-xs text-white/55">
                for {TERM_LABEL[plan.period]}, prepaid
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-6 space-y-4">
        <div>
          <label htmlFor="gift-recipient" className="text-sm font-bold text-white/85">
            Recipient&apos;s email
          </label>
          <input
            id="gift-recipient"
            type="email"
            required
            value={recipientEmail}
            onChange={(e) => setRecipientEmail(e.target.value)}
            placeholder="friend@example.com"
            className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white placeholder:text-white/30 focus:border-[#D4AF37] focus:outline-none"
          />
          <p className="mt-2 text-xs text-white/45">
            The gift is redeemed with an account signed in under this exact
            address — double-check it.
          </p>
        </div>
        {!buyerEmail && (
          <div>
            <label htmlFor="gift-buyer" className="text-sm font-bold text-white/85">
              Your email
            </label>
            <input
              id="gift-buyer"
              type="email"
              required
              value={guestBuyerEmail}
              onChange={(e) => setGuestBuyerEmail(e.target.value)}
              placeholder="you@example.com"
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white placeholder:text-white/30 focus:border-[#D4AF37] focus:outline-none"
            />
            <p className="mt-2 text-xs text-white/45">
              For your receipt — and so the recipient knows who sent it.
            </p>
          </div>
        )}
      </div>

      {error && (
        <p className="mt-5 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="mt-6 w-full rounded-xl bg-[#D4AF37] px-6 py-3.5 text-base font-black text-black transition hover:bg-[#e5c558] disabled:cursor-wait disabled:opacity-60 sm:w-auto"
      >
        {busy ? "Starting secure checkout…" : "Continue to payment"}
      </button>
      <p className="mt-3 text-xs text-white/45">
        One prepaid term. No auto-renewal, no charges after today.
      </p>
    </form>
  );
}
