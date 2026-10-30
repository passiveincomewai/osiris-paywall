"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { CHECKOUT_PLAN_SUMMARIES } from "@/lib/billing/trial-checkout";
import CheckoutSheet from "@/components/CheckoutSheet";

type AccessState = "unknown" | "yes" | "no" | "error";

/**
 * Ambient purchase block for the Ambient marketing surfaces — the
 * embedded-checkout counterpart of PowderPassPromo on the ski pages.
 *
 * The block asks the player's own access endpoint
 * (GET /api/ambient/access — session claim, healed against the DB)
 * and renders NOTHING for entitled users (Ambient subscribers and
 * every Pro/VIP tier, per lib/ambient/access) or while the answer is
 * unresolved, so a member never sees a buy pitch flash. A failed
 * access fetch still shows the block: the checkout route itself
 * refuses a double subscription, so the worst case is a redundant
 * offer, never a double charge.
 *
 * Price, period and trial wording come from the billing module's own
 * plan summary — the same source /checkout reads — so this card can
 * never drift from what is actually charged (Ambient: $4.99/mo,
 * 10-day trial from lib/billing/trials). The CTA opens the embedded
 * checkout sheet IN PLACE with plan "ambient"; Ambient is not a
 * pricing-page card and this block never links there.
 */
export default function AmbientPassPromo() {
  const ambient = CHECKOUT_PLAN_SUMMARIES.ambient;
  const [access, setAccess] = useState<AccessState>("unknown");
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const r = await fetch("/api/ambient/access", { cache: "no-store" });
        if (!r.ok) throw new Error(String(r.status));
        const j = (await r.json()) as { access?: boolean };
        if (!cancelled) setAccess(j.access ? "yes" : "no");
      } catch {
        if (!cancelled) setAccess("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (access === "unknown" || access === "yes") return null;

  return (
    <section className="mt-8 rounded-3xl border border-[#0096FF]/30 bg-gradient-to-b from-[#0096FF]/[0.07] to-white/[0.02] p-6 md:p-8">
      <div className="flex flex-col gap-6 md:flex-row md:items-center">
        <div className="flex-1">
          <p className="flex items-center gap-2 text-xs font-bold tracking-[0.25em] text-[#7cc4ff]">
            <Sparkles className="h-4 w-4" /> WORLDEYE AMBIENT
          </p>
          <h3 className="mt-2 text-xl font-bold md:text-2xl">
            Unlimited Slow TV, no demo timer
          </h3>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/55">
            Ambient members stream every mood for as long as they like, on
            as many screens as they like — and Stream to YouTube is
            included. Already on WorldEye Pro or VIP? You own Ambient
            already; just sign in and press play.
          </p>
        </div>
        <div className="shrink-0">
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-bold tracking-tight">{ambient.price}</span>
            <span className="text-white/45">{ambient.per}</span>
          </div>
          <p className="mt-1 text-sm text-white/45">{ambient.note}</p>
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] px-5 py-2.5 text-sm font-bold text-black transition hover:brightness-110"
          >
            Start {ambient.trialDays}-Day Free Trial
          </button>
        </div>
      </div>
      <CheckoutSheet
        plan={sheetOpen ? "ambient" : null}
        onClose={() => setSheetOpen(false)}
      />
    </section>
  );
}
