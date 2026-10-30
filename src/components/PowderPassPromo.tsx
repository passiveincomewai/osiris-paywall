"use client";

import { useState } from "react";
import { Snowflake } from "lucide-react";
import { CHECKOUT_PLAN_SUMMARIES } from "@/lib/billing/trial-checkout";
import CheckoutSheet from "@/components/CheckoutSheet";

/**
 * Powder Pass launch promo for the ski pages (hub + resort pages).
 *
 * Rendered ONLY behind POWDER_PASS_ENABLED: callers gate on
 * powderPassEnabled(process.env) from lib/ski/access, so while the
 * flag is off no ski surface references Powder Pass at all (the dark
 * launch rule the foundation shipped under). Price, period and trial
 * wording come from the billing module's own plan summary — the same
 * source /checkout and the pricing JSON-LD read — so this card can
 * never drift from what is actually charged.
 *
 * The CTA opens the embedded checkout sheet IN PLACE with plan "ski"
 * (the same CheckoutSheet machinery as the /pricing CTAs). It never
 * links to /pricing: the owner ruled Powder Pass off the pricing page
 * entirely (2026-10-29), so the ski pages sell the pass themselves.
 *
 * Copy discipline: the card states the membership's price, trial and
 * tier facts (VIP includes it, Pro does not — lib/ski/access) and
 * names the ski directory it is the membership for. It does not list
 * ski-tool features that are not live yet.
 */
export default function PowderPassPromo({ className = "mt-12" }: { className?: string } = {}) {
  const ski = CHECKOUT_PLAN_SUMMARIES.ski;
  const [sheetOpen, setSheetOpen] = useState(false);
  return (
    <section className={`${className} rounded-3xl border border-[#D4AF37]/30 bg-gradient-to-b from-[#D4AF37]/[0.07] to-white/[0.02] p-6 md:p-8`}>
      <div className="flex flex-col md:flex-row md:items-center gap-6">
        <div className="flex-1">
          <p className="flex items-center gap-2 text-xs font-bold tracking-[0.25em] text-[#D4AF37]">
            <Snowflake className="w-4 h-4" /> NEW — SKI MEMBERSHIP
          </p>
          <h2 className="text-xl md:text-2xl font-bold mt-2">Powder Pass</h2>
          <p className="text-sm text-white/55 mt-2 leading-relaxed max-w-2xl">
            Powder Pass is WorldEye&apos;s ski-only membership — the pass built for
            this directory: the resort pages, live slope and access-road cameras,
            the drive-up route tool and resort compare. One ski membership
            instead of the full Pro plan.
          </p>
          <p className="text-sm text-white/55 mt-2 leading-relaxed">
            VIP Pro annual already includes Powder Pass at no extra cost.
            Weekly and Monthly Pro do not include it.
          </p>
        </div>
        <div className="shrink-0">
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-bold tracking-tight">{ski.price}</span>
            <span className="text-white/45">{ski.per}</span>
          </div>
          <p className="text-sm text-white/45 mt-1">{ski.note}</p>
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black text-sm font-bold hover:brightness-110 transition"
          >
            Start 10-Day Free Trial
          </button>
        </div>
      </div>
      <CheckoutSheet
        plan={sheetOpen ? "ski" : null}
        onClose={() => setSheetOpen(false)}
      />
    </section>
  );
}
