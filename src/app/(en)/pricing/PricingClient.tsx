"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import LanguageHeaderControl from "@/components/translate/LanguageHeaderControl";
import Link from "next/link";
import SiteFooter from "@/components/SiteFooter";
import JsonLd from "@/components/JsonLd";
import CheckoutSheet from "@/components/CheckoutSheet";
import TeamSection from "./TeamSection";
import CancelReassurance from "@/components/CancelReassurance";
import HostedCheckoutLink from "@/components/HostedCheckoutLink";
import {
  ENTERPRISE_OFFER_FEATURES as ENTERPRISE_FEATURES,
  ENTERPRISE_SUPPORT_LINE,
} from "@/lib/enterprise/offer";
import { recordLastViewedPlan } from "@/lib/billing/trial-prompt";
import { trackPlanSelected } from "@/lib/billing/picker-analytics";
import { preloadStripeJs } from "@/lib/billing/stripe-preload";
import type { CheckoutPlanId } from "@/lib/billing/trial-checkout";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import {
  ArrowLeft, Check, ChevronDown, Minus, Info, ShieldCheck, BadgeCheck,
  Bell, Lock, EyeOff, Zap,
} from "lucide-react";
import { localizedPath, type LocaleCode } from "@/i18n/config";
import { localizedUrl } from "@/lib/i18n-seo";
import { enPricing, type PricingCopy, type PricingPlanCopy } from "@/i18n/dictionaries/en/pricing";
import { getChromeCopy } from "@/i18n/dictionaries";

/**
 * The pricing page client (Pricing Redesign v3, 2026-11-09 — the
 * owner's v3 spec). All copy comes from the pricing dictionary
 * (src/i18n/dictionaries/<locale>/pricing.ts) via props — the English
 * route passes the English dictionary, the /es route the Spanish one.
 * Checkout behavior is identical in every locale: same plans, same
 * Stripe machinery, USD prices.
 *
 * What v3 changed (presentation/layout/copy only — the owner's price
 * lock: NO price, plan-key or checkout-amount changes):
 *  - The billing toggle sells two periods only, Yearly (default) and
 *    Monthly. Weekly survives as one small text link under the cards
 *    ("Get a 7-day pass") that opens the same checkout sheet on the
 *    Pro weekly plan. The toggle state is therefore monthly|annual.
 *  - Yearly cards show the monthly EQUIVALENT big ($3.75/$6.25/$12.50
 *    — display strings in the dictionary's v3 block), with the real
 *    billed-yearly total underneath and the monthly price struck
 *    through. The amounts Stripe charges never come from those
 *    strings: checkout keys are the same tier×period keys as before.
 *  - No "VIP"/"VIP PRO" labels are rendered anywhere on this page.
 *    (The dictionary's canonical plan name for the annual Pro plan
 *    stays "VIP Pro" for the OTHER surfaces that name it — the
 *    TrialPicker and checkout strip — per the vip-rename pins; this
 *    page renders tiers[].name = Lite/Pro/Ultra only.)
 *  - The two big stat boxes are gone (owner's v3 call, overriding
 *    the Nov 6 trust band): the hero carries the owner's stats-band
 *    graphic instead of the 4 feature chips.
 *  - Card bullets are the v3 block's short lines with the long
 *    explanation in a tooltip. The canonical liteFeatures /
 *    proFeatures / vipFeatures blocks are unchanged — they remain
 *    the mirrored source for the in-app Premium panel
 *    (lib/billing/premium-features) and the vip-rename pins; the
 *    Ultra-only comparison rows below carry the vipFeatures
 *    descriptions as their tooltips.
 *  - Comparison table regrouped (globe / any paid / Pro and up /
 *    Ultra only) with a bold values row for camera opens on top and
 *    the free globe features collapsed behind a toggle.
 *
 * NOT localized in this tranche (they keep their own copy and render
 * in English on the Spanish page too — see the build REPORT):
 * TeamSection, CancelReassurance, HostedCheckoutLink, CheckoutSheet.
 */

/** The two periods the v3 toggle sells. */
type DisplayPeriod = "monthly" | "annual";
type Period = DisplayPeriod | "weekly";
type TierKey = "lite" | "pro" | "ultra";

// Comparison-table checkmarks stay in code, in dictionary row order
// (25 rows, regrouped for v3). Columns are the FREE tier and the
// three paid tiers. Mirrors src/lib/billing/plans.ts
// entitlementsFor — keep the two in step. Group ranges:
//   0–12  "The globe" (free features; free column all true)
//   13–16 unlock with any paid plan
//   17–19 Pro and up
//   20–24 Ultra only
// One deliberate exception to the entitlement mirror: the "Satellite
// imagery view" row is ✓ for Free — the satellite basemap view is
// free for everyone by the owner's 2026-10-26 order and is the
// default view (src/lib/basemap-mode.ts). Satellite TRACKING is the
// separate row near the top and follows the layer gates.
const COMPARE_BOOLEANS: { free: boolean; lite: boolean; pro: boolean; ultra: boolean }[] = [
  { free: true, lite: true, pro: true, ultra: true },
  { free: true, lite: true, pro: true, ultra: true },
  { free: true, lite: true, pro: true, ultra: true },
  { free: true, lite: true, pro: true, ultra: true },
  { free: true, lite: true, pro: true, ultra: true },
  { free: true, lite: true, pro: true, ultra: true },
  { free: true, lite: true, pro: true, ultra: true },
  { free: true, lite: true, pro: true, ultra: true },
  { free: true, lite: true, pro: true, ultra: true },
  { free: true, lite: true, pro: true, ultra: true },
  { free: true, lite: true, pro: true, ultra: true },
  { free: true, lite: true, pro: true, ultra: true },
  { free: true, lite: true, pro: true, ultra: true },
  { free: false, lite: true, pro: true, ultra: true },
  { free: false, lite: true, pro: true, ultra: true },
  { free: false, lite: true, pro: true, ultra: true },
  { free: false, lite: true, pro: true, ultra: true },
  { free: false, lite: false, pro: true, ultra: true },
  { free: false, lite: false, pro: true, ultra: true },
  { free: false, lite: false, pro: true, ultra: true },
  { free: false, lite: false, pro: false, ultra: true },
  { free: false, lite: false, pro: false, ultra: true },
  { free: false, lite: false, pro: false, ultra: true },
  { free: false, lite: false, pro: false, ultra: true },
  { free: false, lite: false, pro: false, ultra: true },
];

/** Row-index ranges per comparison group (dictionary row order). */
const COMPARE_GROUPS = [
  { key: "globe", start: 0, end: 13 },
  { key: "paid", start: 13, end: 17 },
  { key: "proUp", start: 17, end: 20 },
  { key: "ultraOnly", start: 20, end: 25 },
] as const;

/** Ultra-only comparison rows carry the canonical vipFeatures
 *  descriptions as tooltips: row index → vipFeatures index
 *  (intel feeds, timelapse, event alerts, personal brief, saved
 *  views). */
const ULTRA_ROW_VIP_TIP: Record<number, number> = {
  20: 0,
  21: 1,
  22: 3,
  23: 4,
  24: 5,
};

/** Per-tier accent treatment (v3 spec colors: Lite cyan #22D3EE,
 *  Pro gold #E4B93F → #F6D77A, Ultra violet #A78BFA). Literal
 *  classes only. */
const TIER_ACCENTS: Record<
  TierKey,
  { text: string; border: string; chipBg: string; chipBorder: string; glow: string; btn: string }
> = {
  lite: {
    text: "text-[#22D3EE]",
    border: "border-[#22D3EE]/30",
    chipBg: "bg-[#22D3EE]/15",
    chipBorder: "border-[#22D3EE]/30",
    glow: "shadow-[0_24px_80px_rgba(34,211,238,0.08)]",
    btn: "bg-gradient-to-b from-[#67e8f9] to-[#0891b2] text-black shadow-[0_8px_32px_rgba(34,211,238,0.30)]",
  },
  pro: {
    text: "text-[#E4B93F]",
    border: "border-[#E4B93F]/50",
    chipBg: "bg-[#E4B93F]/15",
    chipBorder: "border-[#E4B93F]/30",
    glow: "shadow-[0_24px_90px_rgba(228,185,63,0.22)]",
    btn: "bg-gradient-to-b from-[#F6D77A] to-[#E4B93F] text-black shadow-[0_8px_32px_rgba(228,185,63,0.35)]",
  },
  ultra: {
    text: "text-[#A78BFA]",
    border: "border-[#A78BFA]/30",
    chipBg: "bg-[#A78BFA]/15",
    chipBorder: "border-[#A78BFA]/30",
    glow: "shadow-[0_24px_80px_rgba(167,139,250,0.10)]",
    btn: "bg-gradient-to-b from-[#c4b0ff] to-[#7c5cd6] text-white shadow-[0_8px_32px_rgba(167,139,250,0.30)]",
  },
};

/** The checkout plan key for a tier × period (route contract: the
 *  Pro grid keeps its historical bare period names, Lite/Ultra name
 *  themselves). Unchanged from before v3. */
function checkoutKeyFor(tier: TierKey, period: Period): CheckoutPlanId {
  return tier === "pro" ? period : (`${tier}_${period}` as CheckoutPlanId);
}

/** The dictionary plan copy for a tier × period. */
function planCopyFor(copy: PricingCopy, tier: TierKey, period: Period): PricingPlanCopy {
  if (tier === "pro") return copy.plans[period];
  return copy.plansGrid[`${tier}_${period}` as keyof PricingCopy["plansGrid"]];
}

function buildFaqJsonLd(copy: PricingCopy, locale: LocaleCode) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    url: localizedUrl("pricing", locale),
    mainEntity: copy.faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

/** Scroll-reveal wrapper: a section rises in once as it enters the
 *  viewport. The page wraps everything in MotionConfig
 *  reducedMotion="user", so for reduced-motion visitors the
 *  transform is disabled and the section simply sits in place —
 *  content is never gated on the animation. */
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

function CheckoutButton({
  plan,
  label,
  tier,
  onCheckout,
}: {
  plan: CheckoutPlanId;
  label: string;
  tier: TierKey | "enterprise";
  onCheckout: (plan: CheckoutPlanId) => void;
}) {
  // HTML gradient buttons in the reference design's language:
  // full-width, tier-accent gradient (gold for the featured Pro);
  // Enterprise gets the reference's blue outline treatment. Same
  // onCheckout → CheckoutSheet contract as every other surface.
  const cls =
    tier === "enterprise"
      ? "border border-[#38bdf8]/70 text-[#7dd3fc] bg-black/30 backdrop-blur hover:bg-[#38bdf8]/10 shadow-[0_8px_32px_rgba(56,189,248,0.20)]"
      : TIER_ACCENTS[tier].btn;
  return (
    <button
      onClick={() => onCheckout(plan)}
      className={`w-full py-4 rounded-2xl font-bold text-lg tracking-wide hover:brightness-110 active:scale-[0.99] transition ${cls}`}
    >
      {label}
    </button>
  );
}

/** The under-button trust line (owner's exact v3 copy, one line per
 *  card): green checks + the three short facts. */
function CardTrustLine({ items }: { items: string[] }) {
  return (
    <p className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-white/50">
      {items.map((item) => (
        <span key={item} className="inline-flex items-center gap-1">
          <Check className="w-3.5 h-3.5 text-[#34D399]" strokeWidth={3} /> {item}
        </span>
      ))}
    </p>
  );
}

/** One short card bullet with its long explanation in a tooltip
 *  (hover on desktop, focus on tap/keyboard). */
function Bullet({
  title,
  tip,
  accent,
}: {
  title: string;
  tip: string;
  accent: (typeof TIER_ACCENTS)["pro"];
}) {
  return (
    <li className="flex items-center gap-2.5">
      <span
        className={`w-5 h-5 rounded-full ${accent.chipBg} border ${accent.chipBorder} flex items-center justify-center shrink-0`}
      >
        <Check className={`w-3 h-3 ${accent.text}`} strokeWidth={3} />
      </span>
      <span className="text-sm text-white/85 font-medium">{title}</span>
      <span className="group/tip relative inline-flex shrink-0" tabIndex={0}>
        <Info className="w-3.5 h-3.5 text-white/30 group-hover/tip:text-white/70 transition" />
        <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-56 max-w-[70vw] rounded-xl border border-white/15 bg-[#171a20] px-3 py-2 text-xs font-normal leading-relaxed text-white/75 opacity-0 group-hover/tip:opacity-100 group-focus-within/tip:opacity-100 transition z-30 shadow-xl">
          {tip}
        </span>
      </span>
    </li>
  );
}

function TierCard({
  copy,
  tier,
  period,
  orderClass,
  onCheckout,
}: {
  copy: PricingCopy;
  tier: TierKey;
  period: DisplayPeriod;
  orderClass: string;
  onCheckout: (plan: CheckoutPlanId) => void;
}) {
  const accent = TIER_ACCENTS[tier];
  const tierCopy = copy.tiers[tier];
  const detail = copy.planDetails[tier];
  const v3card = copy.v3.card;
  const annualTotal = planCopyFor(copy, tier, "annual").price;
  const monthlyPrice = planCopyFor(copy, tier, "monthly").price;
  const plan = checkoutKeyFor(tier, period);
  const belowTier: TierKey | null = tier === "pro" ? "lite" : tier === "ultra" ? "pro" : null;
  return (
    <motion.div
      id={`${tier}-card`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.35 }}
      className={`relative flex flex-col rounded-[22px] border ${accent.border} bg-[#111317] ${accent.glow} scroll-mt-6 ${orderClass}`}
    >
      {tier === "pro" && (
        <img
          src="/pricing-v3/badge-most-popular.png"
          alt={copy.v3.badgeAlt}
          width={476}
          height={162}
          className="absolute -top-6 left-1/2 -translate-x-1/2 z-10 h-11 w-auto"
        />
      )}
      {/* Image header — a real capture of the tier's headline surface;
          the whole header links through to the plan's detail page. */}
      <Link
        href={`/pricing/${tier}`}
        aria-label={`${copy.card.detailsBefore}${tierCopy.name}`}
        className="relative block group"
      >
        <img
          src={detail.heroImage.src}
          alt={detail.heroImage.alt}
          width={1200}
          height={675}
          loading="lazy"
          className="w-full h-36 md:h-40 object-cover rounded-t-[calc(22px-1px)]"
        />
        <span className="absolute inset-0 bg-gradient-to-t from-[#111317]/90 via-transparent to-transparent rounded-t-[calc(22px-1px)]" />
      </Link>
      <div className="flex flex-col p-5 md:p-6">
        <p className={`text-sm font-semibold tracking-[0.2em] ${accent.text}`}>
          {tierCopy.name.toUpperCase()}
        </p>
        <p className="text-sm text-white/45 mt-1">{tierCopy.tagline}</p>

        {period === "annual" ? (
          <>
            <div className="mt-3 flex items-baseline gap-1">
              <AnimatePresence mode="popLayout">
                <motion.span
                  key="annual-eq"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="text-5xl font-bold tracking-tight"
                >
                  {v3card.eqPrices[tier]}
                </motion.span>
              </AnimatePresence>
              <span className="text-white/45 text-lg">{v3card.eqPer}</span>
              <span className="ml-auto text-sm text-white/35 line-through">{monthlyPrice}</span>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#34D399]/10 text-[#34D399] border border-[#34D399]/40 whitespace-nowrap">
                {v3card.savePills[tier]}
              </span>
            </div>
            <p className="text-sm text-white/45 mt-2">
              {v3card.billedBefore}
              {annualTotal}
              {v3card.billedAfter}
            </p>
          </>
        ) : (
          <>
            <div className="mt-3 flex items-baseline gap-1">
              <AnimatePresence mode="popLayout">
                <motion.span
                  key="monthly"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="text-5xl font-bold tracking-tight"
                >
                  {monthlyPrice}
                </motion.span>
              </AnimatePresence>
              <span className="text-white/45 text-lg">{v3card.eqPer}</span>
            </div>
            <p className="text-sm text-white/45 mt-2">{v3card.monthlyLine}</p>
          </>
        )}

        <div className="my-4 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

        <div>
          {belowTier && (
            <p className="mb-2 text-sm text-white/45">
              {v3card.everythingBefore}
              {copy.tiers[belowTier].name}
              {v3card.everythingAfter}
            </p>
          )}
          <ul className="space-y-2">
            {copy.v3.bullets[tier].map((b) => (
              <Bullet key={b.title} title={b.title} tip={b.tip} accent={accent} />
            ))}
          </ul>
        </div>

        <div className="mt-5">
          <CheckoutButton plan={plan} label={v3card.ctas[tier]} tier={tier} onCheckout={onCheckout} />
        </div>
        <CardTrustLine items={v3card.trustLine} />
        <p className="mt-3 text-center">
          <Link href={`/pricing/${tier}`} className={`text-sm font-semibold ${accent.text} hover:underline`}>
            {copy.card.detailsBefore}
            {tierCopy.name}
            {copy.card.detailsAfter}
          </Link>
        </p>
      </div>
    </motion.div>
  );
}

/** Sticky mobile bar (appears after 700px of scroll): the featured
 *  Pro plan at the visitor's selected period — the v3 format
 *  ("Pro · $6.25/mo yearly"). Its button starts the Pro checkout in
 *  the sheet, the same one tap the card's CTA makes. */
function StickyMobileCta({
  copy,
  period,
  onCheckout,
}: {
  copy: PricingCopy;
  period: DisplayPeriod;
  onCheckout: (plan: CheckoutPlanId) => void;
}) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 700);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const price =
    period === "annual" ? copy.v3.card.eqPrices.pro : planCopyFor(copy, "pro", "monthly").price;
  const per = period === "annual" ? copy.v3.sticky.perYearly : copy.v3.sticky.perMonthly;
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 90 }}
          animate={{ y: 0 }}
          exit={{ y: 90 }}
          transition={{ type: "spring", stiffness: 320, damping: 30 }}
          className="fixed bottom-0 inset-x-0 z-50 md:hidden px-4 pb-4 pt-8 bg-gradient-to-t from-black via-black/90 to-transparent pointer-events-none"
        >
          <div className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-[#E4B93F]/30 bg-[#0a0a12]/95 backdrop-blur px-4 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.6)]">
            <div className="min-w-0 shrink-0">
              <p className="text-base font-bold leading-tight">
                {copy.tiers.pro.name} · {price}
                <span className="text-white/45 text-xs font-normal"> {per}</span>
              </p>
            </div>
            <button
              onClick={() => onCheckout(checkoutKeyFor("pro", period))}
              className="flex-1 py-3 rounded-xl bg-gradient-to-b from-[#F6D77A] to-[#E4B93F] text-black font-bold text-sm hover:brightness-110 active:scale-[0.99] transition"
            >
              {copy.v3.sticky.cta}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-white/10 rounded-2xl bg-white/[0.02] overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-4 px-4 py-3 text-left"
      >
        <span className="font-medium text-white/90">{q}</span>
        <ChevronDown className={`w-5 h-5 text-[#E4B93F] shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <p className="px-4 pb-4 text-sm text-white/60 leading-relaxed">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** The regrouped comparison table (v3 §10). Mobile: horizontally
 *  scrollable; md+: full width with a sticky header row. The free
 *  "globe" group is collapsed by default behind its toggle. */
function ComparisonTable({
  copy,
  period,
  onCheckout,
}: {
  copy: PricingCopy;
  period: DisplayPeriod;
  onCheckout: (plan: CheckoutPlanId) => void;
}) {
  const [showFree, setShowFree] = useState(false);
  const cv = copy.v3.comparisonV3;
  const freeCount = COMPARE_GROUPS[0].end - COMPARE_GROUPS[0].start;
  const gridCols =
    "grid-cols-[minmax(170px,1fr)_64px_64px_64px_72px] md:grid-cols-[1fr_72px_72px_72px_72px]";
  const renderRow = (i: number) => {
    const feature = copy.comparison.rows[i];
    const r = COMPARE_BOOLEANS[i] ?? { free: false, lite: false, pro: false, ultra: false };
    const cells = [
      { on: r.free, cls: "text-white/35" },
      { on: r.lite, cls: "text-[#22D3EE]/80" },
      { on: r.pro, cls: "text-[#E4B93F]" },
      { on: r.ultra, cls: "text-[#A78BFA]" },
    ];
    const vipTipIdx = ULTRA_ROW_VIP_TIP[i];
    return (
      <div
        key={feature}
        className={`grid ${gridCols} border-b border-white/5 last:border-0 text-[13px] sm:text-sm`}
      >
        <div
          className="px-4 md:px-7 py-2 text-white/75"
          {...(vipTipIdx !== undefined ? { title: copy.vipFeatures[vipTipIdx].desc } : {})}
        >
          {feature}
        </div>
        {cells.map((c, j) => (
          <div
            key={j}
            className={`py-2 flex justify-center items-center ${j === 3 ? "bg-[#A78BFA]/[0.05]" : j === 2 ? "bg-[#E4B93F]/[0.07]" : ""}`}
          >
            {c.on ? (
              <Check className={`w-4 h-4 ${c.cls}`} strokeWidth={3} />
            ) : (
              <Minus className="w-4 h-4 text-white/15" />
            )}
          </div>
        ))}
      </div>
    );
  };
  const groupHeader = (label: string) => (
    <div className={`grid ${gridCols} border-b border-white/10 bg-white/[0.04]`}>
      <div
        className="px-4 md:px-7 py-2 text-[11px] font-bold tracking-[0.18em] text-white/50 uppercase"
        style={{ gridColumn: "1 / -1" }}
      >
        {label}
      </div>
    </div>
  );
  return (
    <div>
      <div className="rounded-[22px] border border-white/10 bg-[#111317] overflow-x-auto md:overflow-visible max-w-3xl mx-auto">
        <div className="min-w-[560px] md:min-w-0">
          <div
            className={`grid ${gridCols} text-[11px] font-bold tracking-[0.15em] text-white/40 border-b border-white/10 bg-[#111317] md:sticky md:top-0 z-10`}
          >
            <div className="px-4 md:px-7 py-2.5">{copy.comparison.featureHeader}</div>
            <div className="py-2.5 text-center">{copy.comparison.freeHeader}</div>
            <div className="py-2.5 text-center text-[#22D3EE]">{copy.comparison.liteHeader}</div>
            <div className="py-2.5 text-center text-[#E4B93F] bg-[#E4B93F]/[0.08]">{copy.comparison.proHeader}</div>
            <div className="py-2.5 text-center text-[#A78BFA]">{copy.comparison.ultraHeader}</div>
          </div>
          {/* First row, bold + highlighted: the opens ladder. */}
          <div className={`grid ${gridCols} border-b border-white/10 bg-[#E4B93F]/[0.10] text-sm font-bold`}>
            <div className="px-4 md:px-7 py-2.5 text-white">{cv.opensLabel}</div>
            <div className="py-2.5 text-center text-white/85">{cv.opensFree}</div>
            {(["lite", "pro", "ultra"] as TierKey[]).map((t) => (
              <div
                key={t}
                className={`py-2.5 text-center ${TIER_ACCENTS[t].text} ${t === "pro" ? "bg-[#E4B93F]/[0.08]" : t === "ultra" ? "bg-[#A78BFA]/[0.05]" : ""}`}
              >
                {cv.opensPaid}
              </div>
            ))}
          </div>
          {/* The globe group: collapsed by default. */}
          <button
            onClick={() => setShowFree(!showFree)}
            className={`grid ${gridCols} w-full border-b border-white/10 bg-white/[0.04] text-left`}
            aria-expanded={showFree}
          >
            <span
              className="px-4 md:px-7 py-2 text-[11px] font-bold tracking-[0.18em] text-white/50 uppercase flex items-center gap-2"
              style={{ gridColumn: "1 / -1" }}
            >
              {showFree
                ? cv.hideFree
                : `${cv.showFreeBefore}${freeCount}${cv.showFreeAfter}`}
              <ChevronDown className={`w-4 h-4 transition-transform ${showFree ? "rotate-180" : ""}`} />
            </span>
          </button>
          {showFree &&
            Array.from({ length: freeCount }, (_, k) => renderRow(COMPARE_GROUPS[0].start + k))}
          {groupHeader(cv.groups.paid)}
          {Array.from({ length: COMPARE_GROUPS[1].end - COMPARE_GROUPS[1].start }, (_, k) =>
            renderRow(COMPARE_GROUPS[1].start + k),
          )}
          {groupHeader(cv.groups.proUp)}
          {Array.from({ length: COMPARE_GROUPS[2].end - COMPARE_GROUPS[2].start }, (_, k) =>
            renderRow(COMPARE_GROUPS[2].start + k),
          )}
          {groupHeader(cv.groups.ultraOnly)}
          {Array.from({ length: COMPARE_GROUPS[3].end - COMPARE_GROUPS[3].start }, (_, k) =>
            renderRow(COMPARE_GROUPS[3].start + k),
          )}
          {/* CTA row: one button per paid column. */}
          <div className={`grid ${gridCols} bg-white/[0.02]`}>
            <div className="px-4 md:px-7 py-3 text-xs text-white/40 flex items-center">{cv.freeForever}</div>
            {(["lite", "pro", "ultra"] as TierKey[]).map((t) => (
              <div key={t} className="py-3 px-1 flex justify-center items-center">
                <button
                  onClick={() => onCheckout(checkoutKeyFor(t, period))}
                  className={`px-2 py-2 rounded-xl text-[11px] font-bold hover:brightness-110 active:scale-[0.99] transition ${TIER_ACCENTS[t].btn}`}
                >
                  {copy.v3.card.ctas[t]}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
      <p className="mt-3 text-center text-xs text-white/40 max-w-xl mx-auto">{cv.footnote}</p>
    </div>
  );
}

const TRUST_STRIP_ICONS = [BadgeCheck, Bell, Zap, ShieldCheck, Lock, EyeOff];

export default function PricingPage({
  copy = enPricing,
  locale = "en",
  giftEnabled = false,
}: {
  copy?: PricingCopy;
  locale?: LocaleCode;
  /** True when gift subscriptions are enabled (GIFT_SUBSCRIPTIONS_ENABLED,
   *  read server-side by the page wrappers and passed in — the flag is
   *  not a NEXT_PUBLIC var, so the client cannot read it itself). */
  giftEnabled?: boolean;
} = {}) {
  const [period, setPeriod] = useState<DisplayPeriod>("annual");
  const faqJsonLd = buildFaqJsonLd(copy, locale);
  const enterpriseFeatures = copy.enterprise.features ?? ENTERPRISE_FEATURES;
  const homeHref = localizedPath("", locale);
  // Checkout opens IN PLACE: the plan CTAs raise the embedded form in a
  // sheet (components/CheckoutSheet — bottom sheet on mobile, dialog on
  // desktop) instead of navigating to /checkout. It is the same
  // Checkout-Session machinery every lock surface reaches via
  // startPlanCheckout → /checkout, so the two presentations can't drift;
  // closing the sheet just returns here, and the hosted Stripe page
  // remains one quiet link away under the plan cards.
  const [sheetPlan, setSheetPlan] = useState<CheckoutPlanId | null>(null);
  const closeSheet = useCallback(() => setSheetPlan(null), []);
  const openCheckout = useCallback((plan: CheckoutPlanId) => setSheetPlan(plan), []);
  // The hero's ambient video loop is decorative motion the
  // MotionConfig below can't gate (it is not a framer transform):
  // hold it for visitors who prefer reduced motion — they keep
  // the static capture as the backdrop.
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduceMotion(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  // Warm Stripe.js while the visitor reads the plans: the sheet's
  // embedded flow starts on the CTA click, and with the script
  // already cached only the session POST gates the form.
  useEffect(() => {
    preloadStripeJs();
  }, []);

  const pickPeriod = (key: DisplayPeriod) => {
    if (key !== period) trackPlanSelected("pricing", key);
    setPeriod(key);
    // Wave 2 F3: remember the period this visitor is looking at so
    // the post-signup trial prompt can preselect it.
    recordLastViewedPlan(key);
  };
  const scrollToCard = (tier: TierKey) =>
    document.getElementById(`${tier}-card`)?.scrollIntoView({ behavior: "smooth", block: "center" });

  return (
    <MotionConfig reducedMotion="user">
    <main className="docs-root min-h-screen bg-[#08090C] text-[#F4F5F7] relative overflow-x-clip">
      <JsonLd data={faqJsonLd} />
      {/* Ambient gold glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full opacity-20 blur-[120px] bg-[#E4B93F]" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[300px] rounded-full opacity-10 blur-[100px] bg-[#22D3EE]" />
      </div>

      <div className="relative max-w-5xl mx-auto px-6 py-6 md:py-8">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-6">
          <Link href={homeHref} className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition">
            <ArrowLeft className="w-4 h-4" /> {copy.backToMap}
          </Link>
          <div className="flex items-center gap-3">
            <Link href={homeHref} aria-label="WorldEye — back to the live globe" className="shrink-0 inline-flex items-center"><img src="/worldeye-header-logo.png" alt="WorldEye" width={1063} height={290} className="h-6 w-auto" /></Link><span className="text-[11px] font-mono tracking-[0.3em] text-[#E4B93F]">{copy.proBadge}</span>
            <LanguageHeaderControl variant="mobile" />
          </div>
        </div>

        {/* Hero — the existing real-capture globe backdrop (the v3
            hero-background artwork did not arrive; the page keeps
            its tip hero treatment), eyebrow, the v3 headline, the
            owner's stats-band graphic in place of the old feature
            chips, and the Yearly/Monthly toggle. */}
        <div className="relative left-1/2 -translate-x-1/2 w-screen overflow-hidden">
          <img
            src="/landing/features-globe.jpg"
            alt=""
            aria-hidden
            className="absolute inset-0 w-full h-full object-cover"
          />
          {!reduceMotion && (
            <video
              className="absolute inset-0 w-full h-full object-cover"
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              poster="/landing/features-globe.jpg"
              aria-hidden
            >
              <source src="/landing/track-flights.webm" type="video/webm" />
              <source src="/landing/track-flights.mp4" type="video/mp4" />
            </video>
          )}
          <div className="absolute inset-0 bg-black/55" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#08090C]/70 via-transparent to-[#08090C]" />
          <div className="relative max-w-3xl mx-auto px-6 pt-12 pb-10 md:pt-16 md:pb-12 text-center">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <p className="text-[11px] md:text-xs font-bold tracking-[0.3em] text-[#E4B93F]">
                {copy.hero.eyebrow}
              </p>
              <h1 className="mt-3 text-4xl md:text-6xl font-bold tracking-tight leading-[1.05]">
                {copy.hero.h1Before}<span className="text-[#E4B93F]">{copy.hero.h1Accent}</span>{copy.hero.h1After}
              </h1>
              <p className="mt-4 text-sm md:text-base text-white/60 leading-relaxed max-w-2xl mx-auto">{copy.hero.sub}</p>
            </motion.div>

            {/* Stats band — the owner's graphic replaces the 4
                feature chips AND the two big stat boxes (v3 §1). */}
            <img
              src="/pricing-v3/stats-band.webp"
              alt={copy.v3.statsBandAlt}
              width={2800}
              height={268}
              className="mt-8 w-full h-auto"
            />

            {/* Billing toggle — Yearly (default, with the green
                savings pill) | Monthly. No Weekly here (v3 §2). */}
            <div className="mt-10 flex sm:inline-flex p-1.5 rounded-2xl bg-black/50 border border-[#E4B93F]/25 backdrop-blur w-full sm:w-auto max-w-full">
              {(["annual", "monthly"] as DisplayPeriod[]).map((key) => (
                <button
                  key={key}
                  onClick={() => pickPeriod(key)}
                  className={`relative flex-1 sm:flex-none px-4 md:px-7 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
                    period === key ? "text-black" : "text-white/55 hover:text-white"
                  }`}
                >
                  {key === "annual" && (
                    <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-[9px] font-bold tracking-[0.12em] bg-[#34D399] text-black px-2 py-0.5 rounded-full whitespace-nowrap">
                      {copy.v3.toggleSavePill}
                    </span>
                  )}
                  {period === key && (
                    <motion.span
                      layoutId="billing-pill"
                      className="absolute inset-0 rounded-xl bg-[#E4B93F]"
                      transition={{ type: "spring", stiffness: 400, damping: 32 }}
                    />
                  )}
                  <span className="relative flex items-center gap-2">
                    {key === "annual" ? copy.v3.toggleYearly : copy.v3.toggleMonthly}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Monthly → yearly nudge (v3 §3): the owner's graphic, shown
            ONLY while Monthly is selected; clicking it switches to
            yearly prices. */}
        {period === "monthly" && (
          <button
            onClick={() => pickPeriod("annual")}
            className="mt-8 block w-full max-w-4xl mx-auto hover:brightness-110 transition"
            aria-label={copy.v3.nudgeAlt}
          >
            <img
              src="/pricing-v3/monthly-to-yearly-nudge.webp"
              alt={copy.v3.nudgeAlt}
              width={2400}
              height={634}
              className="w-full h-auto rounded-[22px] border border-white/10"
            />
          </button>
        )}

        {/* The 3-tier grid. Mobile order: Pro first, then Lite, then
            Ultra (v3 mobile rules) via order classes. */}
        <div id="plans" className="mt-10 grid gap-6 md:grid-cols-3 items-start">
          <TierCard copy={copy} tier="lite" period={period} orderClass="order-2 md:order-1" onCheckout={openCheckout} />
          <TierCard copy={copy} tier="pro" period={period} orderClass="order-1 md:order-2" onCheckout={openCheckout} />
          <TierCard copy={copy} tier="ultra" period={period} orderClass="order-3" onCheckout={openCheckout} />
        </div>

        {/* The page's ONE hosted-checkout link, plus the weekly
            pass link (v3 §2/§3). */}
        <div className="mt-5 flex flex-col items-center gap-2">
          <HostedCheckoutLink plan={checkoutKeyFor("pro", period)} caption={false} surface="pricing" />
          <button
            onClick={() => openCheckout("weekly")}
            className="text-sm text-white/50 hover:text-white transition underline-offset-4 hover:underline"
          >
            {copy.v3.weeklyLink}
          </button>
        </div>

        {/* Trust strip (v3 §4) — built as HTML (the trust-strip
            graphic did not arrive): the 6 named items, then the
            money-back line with the owner's seal. */}
        <Reveal className="mt-10">
          <div className="rounded-[22px] border border-white/10 bg-[#111317] px-5 py-4">
            <div className="flex flex-wrap items-center justify-center gap-x-7 gap-y-2.5 text-sm text-white/70">
              {copy.v3.trustStrip.map((label, i) => {
                const Icon = TRUST_STRIP_ICONS[i] ?? BadgeCheck;
                return (
                  <span key={label} className="inline-flex items-center gap-2">
                    <Icon className="w-4 h-4 text-[#34D399]" /> {label}
                  </span>
                );
              })}
            </div>
          </div>
          <div className="mt-4 flex items-center justify-center gap-4 max-w-2xl mx-auto">
            <img
              src="/pricing-v3/seal-7-day-money-back.png"
              alt={copy.v3.sealAlt}
              width={680}
              height={680}
              loading="lazy"
              className="w-[120px] h-[120px] shrink-0"
            />
            <p className="text-sm text-white/60 leading-relaxed">{copy.v3.moneyBackLine}</p>
          </div>
        </Reveal>

        {/* Why paid? (v3 §5) — HTML value meter (the value-meter
            graphic did not arrive): factual numbers only. */}
        <Reveal className="mt-12 max-w-3xl mx-auto">
          <h2 className="text-xl md:text-2xl font-bold text-center">{copy.v3.whyPaid.heading}</h2>
          <div className="mt-5 rounded-[22px] border border-white/10 bg-[#111317] p-5 space-y-4">
            <div>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="font-semibold text-white/70">{copy.v3.whyPaid.freeLabel}</span>
                <span className="text-white/45">{copy.v3.whyPaid.freeValue}</span>
              </div>
              <div className="mt-2 h-3 rounded-full bg-white/[0.06] overflow-hidden">
                <div className="h-full w-[4%] min-w-[14px] rounded-full bg-white/30" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="font-semibold text-[#E4B93F]">{copy.v3.whyPaid.paidLabel}</span>
                <span className="text-white/60">{copy.v3.whyPaid.paidValue}</span>
              </div>
              <div className="mt-2 h-3 rounded-full bg-white/[0.06] overflow-hidden">
                <div className="h-full w-full rounded-full bg-gradient-to-r from-[#E4B93F] to-[#F6D77A]" />
              </div>
            </div>
          </div>
        </Reveal>

        {/* How the trial works (v3 §6) — HTML 3-step timeline (the
            trial-timeline graphic did not arrive). */}
        <Reveal className="mt-12 max-w-3xl mx-auto">
          <h2 className="text-xl md:text-2xl font-bold text-center">{copy.v3.trialSteps.heading}</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {copy.v3.trialSteps.steps.map((step, i) => (
              <div key={step.title} className="relative rounded-[22px] border border-white/10 bg-[#111317] p-5">
                <span className="w-8 h-8 rounded-full bg-[#34D399]/15 border border-[#34D399]/40 text-[#34D399] flex items-center justify-center text-sm font-bold">
                  {i + 1}
                </span>
                <p className="mt-3 font-bold">{step.title}</p>
                <p className="mt-1 text-sm text-white/55 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </Reveal>

        {/* Which plan is right for you? (v3 §7) — three small cards;
            each scrolls up to its plan card. */}
        <Reveal className="mt-12 max-w-3xl mx-auto">
          <h2 className="text-xl md:text-2xl font-bold text-center">{copy.v3.picker.heading}</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {(["lite", "pro", "ultra"] as TierKey[]).map((tier, i) => (
              <button
                key={tier}
                onClick={() => scrollToCard(tier)}
                className={`rounded-[22px] border ${TIER_ACCENTS[tier].border} bg-[#111317] p-5 text-left hover:brightness-125 transition`}
              >
                <p className={`text-sm font-semibold tracking-[0.2em] ${TIER_ACCENTS[tier].text}`}>
                  {copy.tiers[tier].name.toUpperCase()}
                </p>
                <p className="mt-2 font-semibold text-white/90">{copy.v3.picker.cards[i].text}</p>
              </button>
            ))}
          </div>
        </Reveal>

        {/* What Pro adds (v3) — replaces the old "Why upgrade to
            Pro?" tiles with two HTML panels on real features (the
            explainer graphics did not arrive). */}
        <Reveal className="mt-12 max-w-3xl mx-auto">
          <h2 className="text-xl md:text-2xl font-bold text-center">{copy.v3.proAdds.heading}</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="rounded-[22px] border border-[#E4B93F]/30 bg-[#111317] p-5">
              <p className="flex items-center gap-2 font-bold">
                <Bell className="w-5 h-5 text-[#E4B93F]" /> {copy.v3.proAdds.alertsTitle}
              </p>
              <ol className="mt-3 space-y-2">
                {copy.v3.proAdds.alertsSteps.map((step, i) => (
                  <li key={step} className="flex items-start gap-2.5 text-sm text-white/65 leading-relaxed">
                    <span className="w-5 h-5 rounded-full bg-[#E4B93F]/15 border border-[#E4B93F]/30 text-[#E4B93F] flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
            <div className="rounded-[22px] border border-[#E4B93F]/30 bg-[#111317] p-5">
              <p className="flex items-center gap-2 font-bold">
                <ShieldCheck className="w-5 h-5 text-[#E4B93F]" /> {copy.v3.proAdds.osintTitle}
              </p>
              <p className="mt-3 text-sm text-white/65 leading-relaxed">{copy.v3.proAdds.osintDesc}</p>
            </div>
          </div>
        </Reveal>

        {/* See it live (v3 §9) — the wide real-capture video (the
            owner's feature reel did not arrive; the repo's hazard
            capture stands in), the recording-limits graphic, then
            the grid of real captures matched to the spec captions.
            The traffic-layer tile is dropped: no real traffic
            capture exists in the repo (see NOTES). */}
        <div className="mt-14">
          <h2 className="text-xl md:text-2xl font-bold text-center">{copy.v3.seeLive.heading}</h2>
          <p className="mt-2 text-sm text-white/50 text-center max-w-xl mx-auto leading-relaxed">{copy.v3.seeLive.sub}</p>
          {!reduceMotion ? (
            <video
              className="mt-6 w-full max-w-[1100px] mx-auto rounded-[22px] border border-white/10 block"
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              poster="/landing/hazard-weather.jpg"
              aria-label={copy.v3.seeLive.items[4].alt}
            >
              <source src="/landing/hazard-weather.webm" type="video/webm" />
              <source src="/landing/hazard-weather.mp4" type="video/mp4" />
            </video>
          ) : (
            <img
              src="/landing/hazard-weather.jpg"
              alt={copy.v3.seeLive.items[4].alt}
              width={1200}
              height={624}
              loading="lazy"
              className="mt-6 w-full max-w-[1100px] mx-auto rounded-[22px] border border-white/10 block"
            />
          )}
          <img
            src="/pricing-v3/recording-limits.webp"
            alt={copy.v3.recordingAlt}
            width={2400}
            height={902}
            loading="lazy"
            className="mt-6 w-full max-w-[1100px] mx-auto h-auto"
          />
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {copy.v3.seeLive.items.map((item, i) => (
              <motion.figure
                key={item.src}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.4, delay: (i % 3) * 0.08 }}
                className="group"
              >
                <div className="overflow-hidden rounded-[22px] border border-white/10">
                  <img
                    src={item.src}
                    alt={item.alt}
                    width={1200}
                    height={675}
                    loading="lazy"
                    className="w-full h-44 object-cover transition duration-500 group-hover:scale-[1.04]"
                  />
                </div>
                <figcaption className="mt-2.5 px-1">
                  <p className="text-sm font-semibold text-white/90">{item.title}</p>
                  <p className="mt-0.5 text-xs text-white/50 leading-relaxed">{item.desc}</p>
                </figcaption>
              </motion.figure>
            ))}
          </div>
        </div>

        {/* Comparison (v3 §10) — the owner's plan-ladder graphic
            directly above the regrouped table. */}
        <Reveal className="mt-14">
          <h2 className="text-xl md:text-2xl font-bold text-center">{copy.v3.comparisonV3.heading}</h2>
          <img
            src="/pricing-v3/plan-ladder.webp"
            alt={copy.v3.ladderAlt}
            width={2400}
            height={856}
            loading="lazy"
            className="mt-6 w-full max-w-[1100px] mx-auto h-auto"
          />
          <div className="mt-6">
            <ComparisonTable copy={copy} period={period} onCheckout={openCheckout} />
          </div>
        </Reveal>

        {/* Annual savings (v3 §8) — small HTML block before the FAQ
            with the owner's exact figures. */}
        <Reveal className="mt-12 max-w-2xl mx-auto">
          <h2 className="text-lg md:text-xl font-bold text-center">{copy.v3.savings.heading}</h2>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {copy.v3.savings.rows.map((row) => (
              <div
                key={row.label}
                className={`rounded-[22px] border p-4 text-center ${
                  row.value === "$74.99"
                    ? "border-[#E4B93F]/50 bg-[#E4B93F]/[0.08]"
                    : "border-white/10 bg-[#111317]"
                }`}
              >
                <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-white/45">{row.label}</p>
                <p className={`mt-1 text-xl md:text-2xl font-bold ${row.value === "$74.99" ? "text-[#E4B93F]" : "text-white/85"}`}>
                  {row.value}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-center text-xs text-white/40">{copy.v3.savings.note}</p>
        </Reveal>

        {/* Teams & Enterprise (v3 §11) — side by side. */}
        <div className="mt-10">
          <CancelReassurance guarantee={false} />
        </div>
        <div className="grid gap-8 lg:grid-cols-2 items-start mt-6">
          <div>
            <img
              src="/pricing-v3/team-seat-discounts.webp"
              alt={copy.v3.teamGraphicAlt}
              width={2400}
              height={876}
              loading="lazy"
              className="w-full h-auto rounded-[22px] border border-white/10"
            />
            <TeamSection />
          </div>
          <Reveal className="relative rounded-[22px] border border-[#38bdf8]/30 bg-[#111317] overflow-hidden">
            <div className="p-6 md:p-8">
              <p className="text-xs font-bold tracking-[0.25em] text-[#38bdf8] mb-2">{copy.enterprise.eyebrow}</p>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl md:text-5xl font-bold tracking-tight">{copy.plans.enterprise.price}</span>
                <span className="text-white/45 text-lg">{copy.plans.enterprise.per}</span>
              </div>
              <p className="text-sm text-white/45 mt-2">{copy.plans.enterprise.note}</p>
              <ul className="mt-4 space-y-2">
                {enterpriseFeatures.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-white/85">
                    <span className="w-5 h-5 rounded-full bg-[#38bdf8]/15 border border-[#38bdf8]/30 flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 text-[#38bdf8]" />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                <CheckoutButton plan="enterprise" label={copy.plans.enterprise.cta} tier="enterprise" onCheckout={openCheckout} />
                <p className="flex items-center justify-center gap-2 text-xs text-white/35 mt-3">
                  <Lock className="w-3.5 h-3.5" /> {copy.enterprise.securedByStripe}
                </p>
                <p className="text-xs text-white/40 mt-3">{copy.enterprise.supportLine ?? ENTERPRISE_SUPPORT_LINE}</p>
                <p className="text-xs mt-3">
                  <Link href="/enterprise" className="text-[#38bdf8] hover:underline">
                    {copy.enterprise.dashboardLink}
                  </Link>
                </p>
              </div>
              <img
                src="/pricing-v3/enterprise-embed.webp"
                alt={copy.v3.enterpriseGraphicAlt}
                width={2400}
                height={764}
                loading="lazy"
                className="mt-6 w-full h-auto rounded-2xl border border-white/10"
              />
            </div>
          </Reveal>
        </div>

        {/* FAQ (v3 §12) — the existing questions, reordered in the
            dictionary (trial length, cancel, recordings, tier
            difference first). */}
        <Reveal className="mt-12 max-w-2xl mx-auto">
          <h2 className="text-xl md:text-2xl font-bold text-center mb-4">{copy.faqHeading}</h2>
          <div className="space-y-2">
            {copy.faqs.map((f) => (
              <FaqItem key={f.q} q={f.q} a={f.a} />
            ))}
          </div>
        </Reveal>

        {/* Final CTA band (v3 §13) — the owner's band image; the
            whole band opens the Pro yearly checkout. */}
        <button
          onClick={() => openCheckout(checkoutKeyFor("pro", "annual"))}
          className="mt-12 block w-full rounded-[22px] overflow-hidden border border-[#E4B93F]/30 hover:brightness-110 active:scale-[0.995] transition"
          aria-label={copy.v3.finalCtaAlt}
        >
          <img
            src="/pricing-v3/final-cta-band.webp"
            alt={copy.v3.finalCtaAlt}
            width={3200}
            height={840}
            loading="lazy"
            className="w-full h-auto block"
          />
        </button>

        {/* Gift entry point — rendered only while gift subscriptions
            are enabled (the /gift page 404s while dark, so the link
            must follow the same switch). The gift flow is English-only
            today, so the strip shows on the English pricing page. */}
        {giftEnabled && locale === "en" && (
          <p className="mt-8 text-center text-sm text-white/55">
            Buying for someone else?{" "}
            <Link
              href="/gift"
              className="font-semibold text-[#E4B93F] underline-offset-4 hover:underline"
            >
              Gift a WorldEye plan
            </Link>{" "}
            — one prepaid term of Lite, Pro or Ultra. Gifts never auto-renew.
          </p>
        )}
      </div>
      <StickyMobileCta copy={copy} period={period} onCheckout={openCheckout} />
      <CheckoutSheet plan={sheetPlan} onClose={closeSheet} analyticsSurface="pricing" />
      <SiteFooter copy={getChromeCopy(locale)} locale={locale} slug="pricing" />
    </main>
    </MotionConfig>
  );
}
