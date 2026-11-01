"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { motion, MotionConfig } from "framer-motion";
import {
  Bell,
  CalendarClock,
  Camera,
  Car,
  Check,
  ChevronDown,
  CloudSnow,
  Coins,
  History,
  Mail,
  Mountain,
  Scale,
  SlidersHorizontal,
  Snowflake,
  Sunrise,
  Truck,
  Trophy,
  X,
} from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { getChromeCopy } from "@/i18n/dictionaries";
import CheckoutSheet from "@/components/CheckoutSheet";
import { CHECKOUT_PLAN_SUMMARIES } from "@/lib/billing/trial-checkout";
import { POWDER_FAQS } from "./powder-faqs";

/**
 * /powder-pass — the Powder Pass membership's own page (Pricing v3,
 * 2026-11-01). Until now the pass was sold only by the promo card on
 * the ski pages; this page gives it the full pricing-family
 * treatment with a ski identity of its own.
 *
 * Checkout is the promo's exact path: the same CheckoutSheet with
 * plan "ski", and price / trial wording read from the billing
 * module's own plan summary (CHECKOUT_PLAN_SUMMARIES.ski) — the
 * same source the promo, /checkout and the pricing JSON-LD read, so
 * this page can never drift from what is actually charged.
 *
 * Copy discipline mirrors the promo's (see PowderPassPromo): every
 * feature listed is live and audited (plan-section-powder audit,
 * 2026-10-31/11-01); snowfall is modelled and labelled modelled;
 * road-condition coverage is stated per state as it stands; the
 * things Powder Pass does NOT have (vertical tracker, patroller
 * tools, plow / stake alerts, live lift counts, avalanche) are
 * stated in their own section instead of being implied.
 */

const GOLD = "#D4AF37";

/** Scroll-reveal wrapper — same treatment as /pricing (Pricing v3):
 *  sections rise in once in the viewport; MotionConfig
 *  reducedMotion="user" disables the transform for reduced-motion
 *  visitors. */
function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** The shipped member feature set — the promo card's audited list
 *  (PowderPassPromo POWDER_FEATURES), each with its icon. Keep in
 *  step with the code: a feature that is not live does not belong
 *  here. */
const MEMBER_FEATURES: { icon: typeof Mail; title: string; desc: string }[] = [
  {
    icon: Mail,
    title: "Dawn-patrol snow alerts",
    desc: "A morning email when a resort you follow picked up 10 cm or more of modelled snow in the last 24 hours.",
  },
  {
    icon: CloudSnow,
    title: "Thursday powder digest",
    desc: "The weekend's forecast snow for your followed resorts, ranked wettest first.",
  },
  {
    icon: Mountain,
    title: "Storm Watch",
    desc: "Modelled snowfall for the next five days across a whole pass, a region, or just your resorts.",
  },
  {
    icon: Snowflake,
    title: "Resort follows + My Powder",
    desc: "Follow your resorts and get your own member pages, briefs and planners for them.",
  },
  {
    icon: Sunrise,
    title: "First-chair planner",
    desc: "Say when you want first lift — it works out when to leave, drive time and sunrise included.",
  },
  {
    icon: Car,
    title: "Drive-up brief",
    desc: "Your saved route with live weather along the way and the cameras on it.",
  },
  {
    icon: Camera,
    title: "Snow-stake nights",
    desc: "Operator-labelled stake cameras, plus an overnight frame replay so you can watch the snow pile up.",
  },
  {
    icon: Coins,
    title: "Pass-value tracker",
    desc: "Log your ski days against what you paid for your pass and watch it pay for itself.",
  },
  {
    icon: History,
    title: "Season in review",
    desc: "Your logged days and the season's modelled snowfall for your resorts, recapped.",
  },
  {
    icon: CalendarClock,
    title: "Trip reminders",
    desc: "Book-ahead emails 45 and 14 days before a trip you save.",
  },
  {
    icon: Bell,
    title: "Canyon road watch",
    desc: "The Little Cottonwood access-road cameras for Alta and Snowbird, watched as a road, not a lot.",
  },
  {
    icon: Trophy,
    title: "Powder Day Score rankings",
    desc: "The digest and Storm Watch rank your resorts by modelled snowfall, wettest first — a ranking of real forecasts, not a made-up score.",
  },
];

/** Road coverage, per state, exactly as it stands (audit). The
 *  states that are not live say so — no coverage is implied. */
const ROAD_STATES: { state: string; status: string; live: boolean }[] = [
  { state: "Washington", status: "Live — state DOT reports", live: true },
  { state: "Oregon", status: "Live — state DOT reports", live: true },
  { state: "California", status: "Live — state DOT reports", live: true },
  { state: "Montana", status: "Live — state DOT reports", live: true },
  { state: "Idaho", status: "Work zones only — labelled as such on every report", live: false },
  { state: "Utah", status: "Not live yet — waiting on UDOT approval", live: false },
  { state: "Arizona", status: "Not live yet", live: false },
  { state: "Colorado", status: "Not covered", live: false },
];

/** Stated plainly, the way the plan detail pages state exclusions. */
const NOT_INCLUDED: { title: string; desc: string }[] = [
  {
    title: "No vertical tracker",
    desc: "Powder Pass does not track your vertical or log runs by GPS. The pass-value tracker works from the ski days you log yourself.",
  },
  {
    title: "No patroller tools",
    desc: "Nothing here is built for ski patrol work — it is a skier's membership.",
  },
  {
    title: "No plow or stake alerts",
    desc: "You can watch plows move and stakes fill — there are no push alerts for either yet.",
  },
  {
    title: "No live lift or run counts",
    desc: "Resort pages carry static lift and run totals with links to the resort's own status page — never a sitewide live count.",
  },
  {
    title: "No avalanche information",
    desc: "WorldEye does not publish avalanche forecasts or danger ratings. Check your regional avalanche centre before heading into the backcountry.",
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left"
      >
        <span className="text-sm font-semibold text-white/90">{q}</span>
        <ChevronDown
          className={`w-4 h-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          style={{ color: GOLD }}
        />
      </button>
      {open && (
        <p className="px-5 pb-4 text-sm text-white/55 leading-relaxed">{a}</p>
      )}
    </div>
  );
}

export default function PowderPassClient() {
  const ski = CHECKOUT_PLAN_SUMMARIES.ski;
  const [sheetOpen, setSheetOpen] = useState(false);

  const cta = (
    <button
      type="button"
      onClick={() => setSheetOpen(true)}
      className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black text-sm font-bold shadow-[0_10px_36px_rgba(212,175,55,0.30)] hover:brightness-110 hover:-translate-y-px transition"
    >
      <Snowflake className="w-4 h-4" />
      Start 10-Day Free Trial
    </button>
  );

  return (
    <MotionConfig reducedMotion="user">
      <main className="docs-root min-h-screen bg-[#050508] text-zinc-100 relative overflow-x-clip">
        <SiteHeader copy={getChromeCopy("en")} locale="en" />
        <div className="relative max-w-5xl mx-auto px-6 py-6 md:py-8">
          {/* Hero — the pass's own identity: gold, snow, no stock
              imagery (no real resort-camera capture exists yet; the
              hero stays typographic rather than fake a mountain). */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="relative text-center rounded-3xl border border-[#D4AF37]/25 bg-gradient-to-b from-[#D4AF37]/[0.08] to-white/[0.02] px-6 py-12 md:py-16 overflow-hidden"
          >
            <Snowflake
              className="absolute -top-8 -right-8 w-44 h-44 text-[#D4AF37]/[0.07] rotate-12 pointer-events-none"
              aria-hidden
            />
            <Snowflake
              className="absolute -bottom-10 -left-10 w-52 h-52 text-[#D4AF37]/[0.05] -rotate-12 pointer-events-none"
              aria-hidden
            />
            <p className="relative flex items-center justify-center gap-2 text-xs font-bold tracking-[0.25em] text-[#D4AF37]">
              <Snowflake className="w-4 h-4" /> SKI-ONLY MEMBERSHIP
            </p>
            <h1 className="relative mt-4 text-4xl md:text-5xl font-black tracking-tight">
              Powder Pass
            </h1>
            <p className="relative mt-4 text-white/60 leading-relaxed max-w-2xl mx-auto">
              WorldEye&apos;s ski-only membership — the pass built for the ski
              directory: the resort pages, live slope and access-road cameras,
              the drive-up route tool and resort compare. One ski membership
              instead of the full Pro plan.
            </p>
            <div className="relative mt-8 flex items-baseline justify-center gap-1">
              <span className="text-5xl font-black tracking-tight">{ski.price}</span>
              <span className="text-white/45">{ski.per}</span>
            </div>
            <p className="relative mt-1.5 text-sm text-white/45">
              {ski.perDay}/day · {ski.note}
            </p>
            <div className="relative mt-6">{cta}</div>
            <p className="relative mt-4 text-xs text-white/40 leading-relaxed">
              VIP Pro annual already includes Powder Pass at no extra cost.
              Weekly and Monthly Pro do not include it.
            </p>
          </motion.div>

          {/* The member feature set */}
          <Reveal className="mt-14">
            <h2 className="text-xs font-bold tracking-[0.25em] text-[#D4AF37] text-center">
              EVERYTHING IN POWDER PASS
            </h2>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {MEMBER_FEATURES.map((f, i) => (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.4, delay: (i % 4) * 0.06 }}
                  className="flex items-start gap-3.5 rounded-2xl border border-white/10 bg-white/[0.02] p-4 hover:border-[#D4AF37]/40 transition"
                >
                  <span className="w-9 h-9 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/25 flex items-center justify-center shrink-0">
                    <f.icon className="w-4 h-4 text-[#D4AF37]" />
                  </span>
                  <p className="text-sm text-white/85 leading-relaxed">
                    <span className="font-semibold">{f.title}</span>
                    <span className="block text-white/45 mt-0.5">{f.desc}</span>
                  </p>
                </motion.div>
              ))}
            </div>
            <figure className="mt-6 group">
              <div className="overflow-hidden rounded-3xl border border-white/10">
                {/* A real stake camera: Alta's snow stake at night,
                    the site's own published frame (the best-ski-
                    webcams guide's header). No stock snow anywhere
                    on this page — where a graphic was needed and no
                    real frame existed, the design stayed typographic. */}
                <img
                  src="/blog/best-ski-webcams.jpg"
                  alt="Alta's snow-stake camera at night, the stake dusted with snow"
                  width={1200}
                  height={630}
                  loading="lazy"
                  className="w-full h-56 md:h-72 object-cover transition duration-500 group-hover:scale-[1.03]"
                />
              </div>
              <figcaption className="mt-2 text-xs text-white/35 text-center">
                Alta&apos;s snow-stake camera at night — a real frame from the
                site&apos;s ski-webcam guide. Snow-stake nights replay frames
                like this so you can watch the snow pile up.
              </figcaption>
            </figure>
            <p className="mt-5 text-xs text-white/40 leading-relaxed text-center max-w-2xl mx-auto">
              Snowfall throughout Powder Pass is modelled from forecast and
              report data and labelled modelled wherever it appears — the
              stake cameras are there so you can watch it against the real
              thing.
            </p>
          </Reveal>

          {/* Roads, honestly */}
          <Reveal className="mt-14">
            <h2 className="text-xl md:text-2xl font-bold text-center">
              Road conditions &amp; chain controls,{" "}
              <span className="text-[#D4AF37]">state by state</span>
            </h2>
            <p className="mt-3 text-sm text-white/50 leading-relaxed text-center max-w-2xl mx-auto">
              Live state DOT reports where the feeds are live — and an honest
              label where they are not. Nothing below is padded: a state joins
              the live list only when its feed is actually running.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <Truck className="w-4 h-4 text-[#D4AF37]" /> Snow-plow tracking
                </p>
                <p className="mt-2 text-sm text-white/50 leading-relaxed">
                  Watch plows work the passes in Iowa, Utah, Vermont, Ontario,
                  Manitoba, Saskatchewan and Alaska — live vehicle positions
                  from each fleet&apos;s own AVL feed. Tracking, not alerts:
                  there are no plow alerts yet.
                </p>
              </div>
              <ul className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 space-y-2.5">
                {ROAD_STATES.map((s) => (
                  <li key={s.state} className="flex items-start gap-2.5 text-sm">
                    <span
                      className={`mt-0.5 w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                        s.live
                          ? "bg-[#D4AF37]/15 border-[#D4AF37]/30"
                          : "bg-white/[0.04] border-white/10"
                      }`}
                    >
                      {s.live ? (
                        <Check className="w-3 h-3 text-[#D4AF37]" />
                      ) : (
                        <X className="w-3 h-3 text-white/35" />
                      )}
                    </span>
                    <p className="text-white/85">
                      <span className="font-medium">{s.state}</span>
                      <span className="text-white/40"> — {s.status}</span>
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>

          {/* Free for everyone */}
          <Reveal className="mt-14 rounded-3xl border border-white/10 bg-white/[0.02] p-6 md:p-8">
            <h2 className="text-lg md:text-xl font-bold">
              The directory underneath stays free
            </h2>
            <p className="mt-2 text-sm text-white/50 leading-relaxed max-w-2xl">
              Powder Pass is the member layer — it never paywalls the directory
              itself. These stay free for everyone, member or not:
            </p>
            <ul className="mt-5 grid gap-x-8 gap-y-3 sm:grid-cols-2">
              {[
                {
                  icon: Mountain,
                  title: "Resort pages & live cameras",
                  desc: "119 resorts and 10,600 resort & road cameras across 20 countries.",
                },
                {
                  icon: Car,
                  title: "Drive-up route tool",
                  desc: "Build the route to any resort and see the cameras along it.",
                },
                {
                  icon: Scale,
                  title: "Resort Compare",
                  desc: "Two resorts side by side — terrain, passes, cameras and snow.",
                },
                {
                  icon: SlidersHorizontal,
                  title: "Pass & beginner filters",
                  desc: "Filter the directory by pass, or by beginner-friendly terrain (25% or more easiest runs).",
                },
              ].map((f) => (
                <li key={f.title} className="flex items-start gap-3">
                  <span className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/10 flex items-center justify-center shrink-0">
                    <f.icon className="w-4 h-4 text-white/70" />
                  </span>
                  <p className="text-sm text-white/85 leading-relaxed">
                    <span className="font-medium">{f.title}</span>
                    <span className="block text-white/45 mt-0.5">{f.desc}</span>
                  </p>
                </li>
              ))}
            </ul>
          </Reveal>

          {/* Not in Powder Pass */}
          <Reveal className="mt-14">
            <h2 className="text-lg md:text-xl font-bold text-white/80">
              What Powder Pass does not do
            </h2>
            <ul className="mt-4 space-y-2.5 max-w-3xl">
              {NOT_INCLUDED.map((f) => (
                <li key={f.title} className="flex items-start gap-2.5">
                  <span className="mt-0.5 w-5 h-5 rounded-full bg-white/[0.04] border border-white/10 flex items-center justify-center shrink-0">
                    <X className="w-3 h-3 text-white/35" />
                  </span>
                  <p className="text-sm text-white/60 leading-relaxed">
                    <span className="font-medium text-white/75">{f.title}</span>
                    <span className="text-white/40"> — {f.desc}</span>
                  </p>
                </li>
              ))}
            </ul>
            <p className="mt-5 text-sm text-white/45 leading-relaxed max-w-3xl">
              Want the whole globe instead — camera recording, alerts, the OI
              assistant and the intel layers? Those live in the main plans:{" "}
              <Link href="/pricing" className="font-semibold text-[#D4AF37] hover:underline">
                compare Lite, Pro and Ultra →
              </Link>
            </p>
          </Reveal>

          {/* FAQ */}
          <Reveal className="mt-14 max-w-2xl mx-auto">
            <h2 className="text-xl md:text-2xl font-bold text-center mb-4">
              Powder Pass questions
            </h2>
            <div className="space-y-2">
              {POWDER_FAQS.map((f) => (
                <FaqItem key={f.q} q={f.q} a={f.a} />
              ))}
            </div>
          </Reveal>

          {/* Bottom CTA */}
          <Reveal className="mt-14 text-center">
            <p className="text-lg font-bold">First chair is better with the brief.</p>
            <div className="mt-4">{cta}</div>
            <p className="mt-3 text-xs text-white/40">{ski.note}</p>
            <p className="mt-6">
              <Link
                href="/ski-webcams"
                className="text-sm font-semibold text-[#D4AF37] hover:underline"
              >
                Browse the ski directory →
              </Link>
            </p>
          </Reveal>
        </div>
        <CheckoutSheet
          plan={sheetOpen ? "ski" : null}
          onClose={() => setSheetOpen(false)}
        />
        <SiteFooter copy={getChromeCopy("en")} locale="en" />
      </main>
    </MotionConfig>
  );
}
