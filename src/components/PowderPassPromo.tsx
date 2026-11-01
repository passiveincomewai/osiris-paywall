"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Snowflake } from "lucide-react";
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
 * (Pricing v3, 2026-11-01: the card now also links to /powder-pass,
 * the pass's own page — still never to /pricing.)
 *
 * Copy discipline: the card states the membership's price, trial and
 * tier facts (VIP includes it, Pro does not — lib/ski/access) and
 * lists the ski tools that are actually live (below). Road-condition
 * coverage is stated per feed as it stands: the keyless California /
 * Montana feeds and the keyed Washington / Oregon feeds are live,
 * Idaho is work-zones-only, and states whose DOT key has not landed
 * (Utah, Arizona) are NOT claimed. Nothing not shipped is listed.
 */

/** The full shipped Powder Pass feature set (audited against
 *  lib/ski + the ski pages, 2026-10-31). Every entry is a live,
 *  ski-access-gated member feature; keep this list in step with the
 *  code — a feature that is not live does not belong here. */
const POWDER_FEATURES: { title: string; desc: string }[] = [
  {
    title: "Dawn-patrol snow alerts",
    desc: "A morning email when a resort you follow picked up 10 cm or more of modelled snow in the last 24 hours.",
  },
  {
    title: "Thursday powder digest",
    desc: "The weekend's forecast snow for your followed resorts, ranked wettest first.",
  },
  {
    title: "Storm Watch",
    desc: "Modelled snowfall for the next five days across a whole pass, a region, or just your resorts.",
  },
  {
    title: "Resort follows + My Powder",
    desc: "Follow your resorts and get your own member pages, briefs and planners for them.",
  },
  {
    title: "First-chair planner",
    desc: "Say when you want first lift — it works out when to leave, drive time and sunrise included.",
  },
  {
    title: "Drive-up brief",
    desc: "Your saved route with live weather along the way and the cameras on it.",
  },
  {
    title: "Road conditions & chain controls",
    desc: "Live state DOT reports — California, Montana, Washington and Oregon today, plus Idaho work zones; more states as their DOT keys land.",
  },
  {
    title: "Snow-stake nights",
    desc: "Operator-labelled stake cameras, plus an overnight frame replay so you can watch the snow pile up.",
  },
  {
    title: "Pass-value tracker",
    desc: "Log your ski days against what you paid for your pass and watch it pay for itself.",
  },
  {
    title: "Season in review",
    desc: "Your logged days and the season's modelled snowfall for your resorts, recapped.",
  },
  {
    title: "Trip reminders",
    desc: "Book-ahead emails 45 and 14 days before a trip you save.",
  },
  {
    title: "Canyon road watch",
    desc: "The Little Cottonwood access-road cameras for Alta and Snowbird, watched as a road, not a lot.",
  },
];

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

      {/* The full member feature set (owner order, 2026-10-31: the
          sales surface must show all of it, not a subset). */}
      <h3 className="mt-8 text-xs font-bold tracking-[0.25em] text-[#D4AF37]">
        EVERYTHING IN POWDER PASS
      </h3>
      <ul className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2">
        {POWDER_FEATURES.map((f) => (
          <li key={f.title} className="flex items-start gap-2.5">
            <span className="mt-0.5 w-5 h-5 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center shrink-0">
              <Check className="w-3 h-3 text-[#D4AF37]" />
            </span>
            <p className="text-sm text-white/85">
              <span className="font-medium">{f.title}</span>
              <span className="text-white/40"> — {f.desc}</span>
            </p>
          </li>
        ))}
      </ul>
      <p className="text-xs text-white/40 mt-5 leading-relaxed">
        The resort pages, cameras, route tool and compare stay free for everyone —
        Powder Pass is the member layer on top of them.
      </p>
      <p className="mt-3">
        <Link
          href="/powder-pass"
          className="text-sm font-semibold text-[#D4AF37] hover:underline"
        >
          See everything in Powder Pass →
        </Link>
      </p>

      <CheckoutSheet
        plan={sheetOpen ? "ski" : null}
        onClose={() => setSheetOpen(false)}
      />
    </section>
  );
}
