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
import { LIVE_CAMERA_COUNT_LABEL, CAMERA_INDEX_SNAPSHOT } from "@/lib/site-stats";
import { trackPlanSelected } from "@/lib/billing/picker-analytics";
import { preloadStripeJs } from "@/lib/billing/stripe-preload";
import type { CheckoutPlanId } from "@/lib/billing/trial-checkout";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import {
  ArrowLeft, Check, X, Sparkles, BrainCircuit,
  ShieldCheck, Zap, Lock, ChevronDown, BadgeCheck, Minus, Car, Video, Bell,
  Layers, Search, Camera,
} from "lucide-react";
import { localizedPath, type LocaleCode } from "@/i18n/config";
import { localizedUrl } from "@/lib/i18n-seo";
import { enPricing, type PricingCopy, type PricingPlanCopy } from "@/i18n/dictionaries/en/pricing";
import { getChromeCopy } from "@/i18n/dictionaries";

/**
 * The pricing page client (Pricing Redesign Phase C: the 3-tier
 * grid). All copy comes from the pricing dictionary
 * (src/i18n/dictionaries/<locale>/pricing.ts) via props — the English
 * route passes the English dictionary, the /es route the Spanish one.
 * Checkout behavior is identical in every locale: same plans, same
 * Stripe machinery, USD prices.
 *
 * The grid sells three tiers (Lite / Pro / Ultra) × three periods
 * (weekly / monthly / annual). A card's checkout key follows the
 * checkout route's contract: the Pro grid keeps its historical bare
 * period names ("weekly" | "monthly" | "annual" → pro_* in the
 * central plan config), Lite/Ultra name themselves ("lite_weekly" …
 * "ultra_annual"). Trials come from the selected PERIOD only (weekly
 * 3 days, monthly/annual 10 — src/lib/billing/trials.ts), and the
 * annual column carries the VIP branding on every tier (owner
 * ruling). There is deliberately NO "no credit card required" badge:
 * checkout collects a payment method up front for trials.
 *
 * Pricing Redesign v2 (2026-11-01): the page rebuilt in the owner's
 * reference design language — Earth-at-night hero with eyebrow +
 * 4-item feature strip, image-backed tier cards that link through to
 * the per-plan detail pages (/pricing/lite|pro|ultra), HTML gradient
 * CTAs in each tier's accent, a 3-item trust row per card, the
 * why-upgrade icon row, an image-backed Enterprise card, and the
 * money-back sentence exactly once on the page (under the grid).
 * CTAs are HTML buttons now, not the owner's artwork TrialButton:
 * its text is baked into the artwork in English and cannot localise
 * (the Spanish page showed English buttons). TrialButton still
 * serves the other surfaces; checkout behaviour here is unchanged —
 * same plan keys, same CheckoutSheet, same trials.
 *
 * NOT localized in this tranche (they keep their own copy and render
 * in English on the Spanish page too — see the build REPORT):
 * TeamSection, CancelReassurance, ProofCounters, HostedCheckoutLink,
 * CheckoutSheet.
 */

type Period = "weekly" | "monthly" | "annual";
type TierKey = "lite" | "pro" | "ultra";

// Icons stay in code, in dictionary order (dictionaries hold copy only).
const LITE_FEATURE_ICONS = [Video, Layers, BrainCircuit, Search, Camera, Sparkles];
const PRO_FEATURE_ICONS = [BrainCircuit, Car, ShieldCheck, Video, Bell, Sparkles];
const VIP_FEATURE_ICONS = [Zap, Video, Bell, Bell, Sparkles, Layers];
const TRUST_ICONS = [BadgeCheck, ShieldCheck, Lock, X];
const HERO_FEATURE_ICONS = [Camera, Zap, BrainCircuit, Bell];
const WHY_UPGRADE_ICONS = [BrainCircuit, Bell, Video, Zap];
const CARD_TRUST_ICONS = [BadgeCheck, Lock, Check];

// Comparison-table checkmarks stay in code, in dictionary row order.
// Columns are the FREE tier and the three paid tiers. Lite carries
// the binary paid gates (premium layers, OI, search, recording
// studio, satellite view); alerts and OSINT start
// at Pro; intel feeds + timelapse are Ultra-only. Mirrors
// src/lib/billing/plans.ts entitlementsFor — keep the two in step.
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
  { free: false, lite: false, pro: false, ultra: false },
  { free: true, lite: true, pro: true, ultra: true },
  { free: false, lite: true, pro: true, ultra: true },
  { free: false, lite: true, pro: true, ultra: true },
  { free: false, lite: true, pro: true, ultra: true },
  { free: false, lite: true, pro: true, ultra: true },
  { free: false, lite: false, pro: true, ultra: true },
  { free: false, lite: true, pro: true, ultra: true },
  { free: false, lite: false, pro: true, ultra: true },
  { free: false, lite: false, pro: false, ultra: true },
  { free: false, lite: false, pro: false, ultra: true },
];

/** Per-tier accent treatment (owner ruling: dark + gold base; Lite
 *  cyan, Pro brightest gold, Ultra violet). Literal classes only. */
const TIER_ACCENTS: Record<
  TierKey,
  { text: string; border: string; chipBg: string; chipBorder: string; glow: string; btn: string }
> = {
  lite: {
    text: "text-[#00E5FF]",
    border: "border-[#00E5FF]/30",
    chipBg: "bg-[#00E5FF]/15",
    chipBorder: "border-[#00E5FF]/30",
    glow: "shadow-[0_24px_80px_rgba(0,229,255,0.08)]",
    btn: "bg-gradient-to-b from-[#4fe3ff] to-[#00a8cc] text-black shadow-[0_8px_32px_rgba(0,229,255,0.30)]",
  },
  pro: {
    text: "text-[#D4AF37]",
    border: "border-[#D4AF37]/50",
    chipBg: "bg-[#D4AF37]/15",
    chipBorder: "border-[#D4AF37]/30",
    glow: "shadow-[0_24px_90px_rgba(212,175,55,0.22)]",
    btn: "bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black shadow-[0_8px_32px_rgba(212,175,55,0.35)]",
  },
  ultra: {
    text: "text-[#a78bfa]",
    border: "border-[#a78bfa]/30",
    chipBg: "bg-[#a78bfa]/15",
    chipBorder: "border-[#a78bfa]/30",
    glow: "shadow-[0_24px_80px_rgba(167,139,250,0.10)]",
    btn: "bg-gradient-to-b from-[#c0a8ff] to-[#7c5cd6] text-white shadow-[0_8px_32px_rgba(167,139,250,0.30)]",
  },
};

/** The checkout plan key for a tier × period (route contract above). */
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

/** Scroll-reveal wrapper (Pricing v3): a section rises in once as
 *  it enters the viewport. The page wraps everything in
 *  MotionConfig reducedMotion="user", so for reduced-motion
 *  visitors the transform is disabled and the section simply sits
 *  in place — content is never gated on the animation. */
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
  // HTML gradient buttons in the reference design's language (v2):
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

/** Sticky mobile bar (appears after 700px of scroll): the featured
 *  Pro plan at the visitor's selected period. Its button carries the
 *  card's own checkout label, so it starts that checkout in the
 *  sheet — the same one tap the card's CTA makes (2026-11-06: it
 *  previously only scrolled to the card, a labelled-CTA dead end). */
function StickyMobileCta({
  copy,
  period,
  onCheckout,
}: {
  copy: PricingCopy;
  period: Period;
  onCheckout: (plan: CheckoutPlanId) => void;
}) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 700);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const proPlan = copy.plans[period];
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
          <div className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-[#D4AF37]/30 bg-[#0a0a12]/95 backdrop-blur px-4 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.6)]">
            <div className="min-w-0 shrink-0">
              <p className="text-[10px] font-bold tracking-[0.2em] text-[#D4AF37]">
                {copy.tiers.pro.name.toUpperCase()}
              </p>
              <p className="text-base font-bold leading-tight">
                {proPlan.price}
                <span className="text-white/45 text-xs font-normal">{proPlan.per}</span>
              </p>
              <p className="text-[11px] text-white/40 leading-tight">
                {copy.card.justPerDayBefore}
                {proPlan.perDay}
                {copy.card.justPerDayAfter}
              </p>
            </div>
            <button
              onClick={() => onCheckout(checkoutKeyFor("pro", period))}
              className="flex-1 py-3 rounded-xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black font-bold text-sm hover:brightness-110 active:scale-[0.99] transition"
            >
              {proPlan.cta}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {  const [open, setOpen] = useState(false);
  return (
    <div className="border border-white/10 rounded-2xl bg-white/[0.02] overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-4 px-4 py-3 text-left"
      >
        <span className="font-medium text-white/90">{q}</span>
        <ChevronDown className={`w-5 h-5 text-[#D4AF37] shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
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

function FeatureList({
  features,
  accent,
  strong = false,
}: {
  features: { title: string; desc: string; icon: typeof Sparkles }[];
  accent: (typeof TIER_ACCENTS)["pro"];
  strong?: boolean;
}) {
  return (
    <ul className="space-y-2">
      {features.map((f) => (
        <li key={f.title} className="flex items-center gap-2.5">
          <span
            className={`w-5 h-5 rounded-full ${accent.chipBg} border ${accent.chipBorder} flex items-center justify-center shrink-0`}
          >
            <Check className={`w-3 h-3 ${accent.text}`} strokeWidth={strong ? 3 : 2} />
          </span>
          <p className="text-sm text-white/85">
            <span className="font-medium">{f.title}</span>
            <span className="text-white/40"> — {f.desc}</span>
          </p>
        </li>
      ))}
    </ul>
  );
}

function TierCard({
  copy,
  tier,
  period,
  onCheckout,
}: {
  copy: PricingCopy;
  tier: TierKey;
  period: Period;
  onCheckout: (plan: CheckoutPlanId) => void;
}) {
  const accent = TIER_ACCENTS[tier];
  const tierCopy = copy.tiers[tier];
  const detail = copy.planDetails[tier];
  const p = planCopyFor(copy, tier, period);
  const plan = checkoutKeyFor(tier, period);
  const baseFeatures = (tier === "lite" ? copy.liteFeatures : copy.proFeatures).map(
    (f, i) => ({
      ...f,
      icon: (tier === "lite" ? LITE_FEATURE_ICONS : PRO_FEATURE_ICONS)[i] ?? Sparkles,
    }),
  );
  const vipFeatures = copy.vipFeatures.map((f, i) => ({
    ...f,
    icon: VIP_FEATURE_ICONS[i] ?? Zap,
  }));
  return (
    <motion.div
      {...(tier === "pro" ? { id: "pro-card" } : {})}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.35 }}
      className={`relative flex flex-col rounded-3xl border ${accent.border} bg-gradient-to-b from-white/[0.06] to-white/[0.02] backdrop-blur-xl ${accent.glow} scroll-mt-6`}
    >
      {tier === "pro" && (
        <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10 text-[10px] font-bold tracking-[0.15em] bg-[#D4AF37] text-black px-3 py-1 rounded-full whitespace-nowrap">
          {copy.toggle.mostPopular}
        </span>
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
          className="w-full h-36 md:h-40 object-cover rounded-t-[calc(1.5rem-1px)]"
        />
        <span className="absolute inset-0 bg-gradient-to-t from-[#0a0a12]/90 via-transparent to-transparent rounded-t-[calc(1.5rem-1px)]" />
      </Link>
      <div className="flex flex-col flex-1 p-5 md:p-6">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm font-semibold tracking-[0.2em] ${accent.text}`}>
            {tierCopy.name.toUpperCase()}
          </p>
          <span className="flex flex-col items-end gap-1.5">
            {period === "annual" && (
              <span className="text-[10px] font-bold tracking-[0.15em] px-2.5 py-1 rounded-full bg-[#D4AF37] text-black whitespace-nowrap">
                {tier === "pro" ? copy.card.vipProLabel : copy.tiers.annualBadge}
              </span>
            )}
            {p.save && (
              <span
                className={`text-xs font-bold px-3 py-1.5 rounded-full ${accent.chipBg} ${accent.text} border ${accent.chipBorder} whitespace-nowrap`}
              >
                {p.save}
              </span>
            )}
          </span>
        </div>
        <p className="text-sm text-white/45 mt-1.5">{tierCopy.tagline}</p>
        <div className="mt-3 flex items-baseline gap-1">
          <AnimatePresence mode="popLayout">
            <motion.span
              key={p.price}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="text-5xl font-bold tracking-tight"
            >
              {p.price}
            </motion.span>
          </AnimatePresence>
          <span className="text-white/45 text-lg">{p.per}</span>
        </div>
        <p className="text-sm text-white/45 mt-2">{p.note}</p>
        <p className={`text-sm ${accent.text} font-semibold mt-1.5`}>
          {copy.card.justPerDayBefore}
          {p.perDay}
          {copy.card.justPerDayAfter}
        </p>
        {p.trial && (
          <p className="mt-3">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide px-3 py-1.5 rounded-full bg-emerald-400/15 text-emerald-300 border border-emerald-400/30">
              <Zap className="w-3.5 h-3.5" /> {p.trial}
              {copy.card.trialChipSuffix}
            </span>
          </p>
        )}

        <div className="my-4 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

        <div className="flex-1">
          <FeatureList features={baseFeatures} accent={accent} />
          {tier === "ultra" && (
            <>
              <p className={`mt-4 mb-2 text-xs font-bold tracking-[0.2em] ${accent.text}`}>
                {copy.card.vipOnlyHeading}
              </p>
              <FeatureList features={vipFeatures} accent={accent} strong />
            </>
          )}
        </div>

        <div className="mt-5">
          <CheckoutButton plan={plan} label={p.cta} tier={tier} onCheckout={onCheckout} />
        </div>
        <div className="mt-4 flex items-center justify-center gap-4 text-[11px] text-white/40">
          {copy.card.trustRow.map((label, i) => {
            const Icon = CARD_TRUST_ICONS[i] ?? BadgeCheck;
            return (
              <span key={label} className="flex items-center gap-1.5">
                <Icon className={`w-3.5 h-3.5 ${accent.text}`} /> {label}
              </span>
            );
          })}
        </div>
        <p className="mt-3 text-center">
          <Link href={`/pricing/${tier}`} className={`text-sm font-semibold ${accent.text} hover:underline`}>
            {copy.card.detailsBefore}
            {tierCopy.name}
            {copy.card.detailsAfter}
          </Link>
        </p>
        <p className="mt-3 text-center">
          <HostedCheckoutLink plan={plan} caption={false} surface="pricing" />
        </p>
      </div>
    </motion.div>
  );
}

export default function PricingPage({
  copy = enPricing,
  locale = "en",
}: {
  copy?: PricingCopy;
  locale?: LocaleCode;
} = {}) {
  const [period, setPeriod] = useState<Period>("annual");
  const faqJsonLd = buildFaqJsonLd(copy, locale);
  const enterpriseFeatures = copy.enterprise.features ?? ENTERPRISE_FEATURES;
  const homeHref = localizedPath("", locale);
  // Checkout opens IN PLACE: the plan CTAs raise the embedded form in a
  // sheet (components/CheckoutSheet — bottom sheet on mobile, dialog on
  // desktop) instead of navigating to /checkout. It is the same
  // Checkout-Session machinery every lock surface reaches via
  // startPlanCheckout → /checkout, so the two presentations can't drift;
  // closing the sheet just returns here, and the hosted Stripe page
  // remains one quiet link away under each CTA.
  const [sheetPlan, setSheetPlan] = useState<CheckoutPlanId | null>(null);
  const closeSheet = useCallback(() => setSheetPlan(null), []);
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

  return (
    <MotionConfig reducedMotion="user">
    <main className="docs-root min-h-screen bg-[#050508] text-zinc-100 relative overflow-x-clip">
      <JsonLd data={faqJsonLd} />
      {/* Ambient gold glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full opacity-20 blur-[120px] bg-[#D4AF37]" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[300px] rounded-full opacity-10 blur-[100px] bg-[#00E5FF]" />
      </div>

      <div className="relative max-w-5xl mx-auto px-6 py-6 md:py-8">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-6">
          <Link href={homeHref} className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition">
            <ArrowLeft className="w-4 h-4" /> {copy.backToMap}
          </Link>
          <div className="flex items-center gap-3">
            <Link href={homeHref} aria-label="WorldEye — back to the live globe" className="shrink-0 inline-flex items-center"><img src="/worldeye-header-logo.png" alt="WorldEye" width={1063} height={290} className="h-6 w-auto" /></Link><span className="text-[11px] font-mono tracking-[0.3em] text-[#D4AF37]">{copy.proBadge}</span>
            <LanguageHeaderControl variant="mobile" />
          </div>
        </div>

        {/* Hero — the reference design: a real capture of the live
            globe at night, eyebrow, two-line headline with the second
            line in gold, the 4-item feature strip, and the gold
            billing-period toggle. */}
        <div className="relative left-1/2 -translate-x-1/2 w-screen overflow-hidden">
          <img
            src="/landing/features-globe.jpg"
            alt=""
            aria-hidden
            className="absolute inset-0 w-full h-full object-cover"
          />
          {/* Ambient hero loop (Pricing v3) — a real screen capture
              of live flight tracking on the globe, dimmed under the
              same overlays as the still. Decorative only: it is
              never labelled live, and reduced-motion visitors keep
              the static capture above. Absolutely positioned over
              the still, so it adds no layout shift. */}
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
          <div className="absolute inset-0 bg-gradient-to-b from-[#050508]/70 via-transparent to-[#050508]" />
          <div className="relative max-w-3xl mx-auto px-6 pt-12 pb-10 md:pt-16 md:pb-12 text-center">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <p className="text-[11px] md:text-xs font-bold tracking-[0.3em] text-[#D4AF37]">
                {copy.hero.eyebrow}
              </p>
              <h1 className="mt-3 text-4xl md:text-6xl font-bold tracking-tight leading-[1.05]">
                {copy.hero.h1Before}<span className="text-[#D4AF37]">{copy.hero.h1Accent}</span>{copy.hero.h1After}
              </h1>
              <p className="mt-4 text-sm md:text-base text-white/60 leading-relaxed max-w-2xl mx-auto">{copy.hero.sub}</p>
            </motion.div>

            {/* Feature strip */}
            <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3 text-left">
              {copy.heroFeatures.map((f, i) => {
                const Icon = HERO_FEATURE_ICONS[i] ?? Sparkles;
                return (
                  <div key={f.title} className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur px-4 py-3">
                    <Icon className="w-5 h-5 text-[#D4AF37]" />
                    <p className="mt-2 text-sm font-semibold text-white">{f.title}</p>
                    <p className="text-xs text-white/50 leading-relaxed">{f.desc}</p>
                  </div>
                );
              })}
            </div>

            {/* Billing-period toggle (annual is the default view and
                carries the VIP branding — owner ruling). */}
            <div className="mt-8 flex sm:inline-flex p-1.5 rounded-2xl bg-black/50 border border-[#D4AF37]/25 backdrop-blur w-full sm:w-auto max-w-full">
              {(["weekly", "monthly", "annual"] as Period[]).map((key) => (
                <button
                  key={key}
                  onClick={() => {
                    // Phase E funnel: a period change re-headlines the
                    // grid on the Pro plan of that period (the bare
                    // plan keys ARE the Pro plans).
                    if (key !== period) trackPlanSelected("pricing", key);
                    setPeriod(key);
                    // Wave 2 F3: remember the period this visitor is
                    // looking at so the post-signup trial prompt can
                    // preselect it.
                    recordLastViewedPlan(key);
                  }}
                  className={`relative flex-1 sm:flex-none px-2 sm:px-4 md:px-7 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
                    period === key ? "text-black" : "text-white/55 hover:text-white"
                  }`}
                >
                  {key === "annual" && (
                    <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-[9px] font-bold tracking-[0.15em] bg-[#D4AF37] text-black px-2 py-0.5 rounded-full whitespace-nowrap">
                      {copy.tiers.annualBadge}
                    </span>
                  )}
                  {period === key && (
                    <motion.span
                      layoutId="billing-pill"
                      className="absolute inset-0 rounded-xl bg-[#D4AF37]"
                      transition={{ type: "spring", stiffness: 400, damping: 32 }}
                    />
                  )}
                  <span className="relative flex items-center gap-2">
                    {copy.tiers.periods[key]}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Real-numbers strip (owner-approved 2026-11-05): the two
            published camera measures, imported from the canonical
            site-stats module — never literals here. The headline is
            the standing globe count; the served figure is the Live
            Camera Index snapshot measure and always carries its
            date, because the two measure different things. */}
        <div
          aria-label="WorldEye camera counts"
          className="mt-8 grid grid-cols-2 gap-2 max-w-2xl mx-auto"
        >
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-center">
            <div className="text-xl md:text-2xl font-bold tabular-nums text-[#D4AF37]">
              {LIVE_CAMERA_COUNT_LABEL}
            </div>
            <div className="mt-0.5 text-[10px] font-mono uppercase tracking-[0.18em] text-white/45">
              {copy.statsBand.liveLabel}
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-center">
            <div className="text-xl md:text-2xl font-bold tabular-nums text-[#D4AF37]">
              {CAMERA_INDEX_SNAPSHOT.servedLabel}
            </div>
            <div className="mt-0.5 text-[10px] font-mono uppercase tracking-[0.18em] text-white/45">
              {copy.statsBand.servedLabel}
            </div>
            <div className="mt-0.5 text-[10px] text-white/35">
              ({copy.statsBand.servedSnapshot})
            </div>
          </div>
        </div>

        {/* The 3-tier grid */}
        <div id="plans" className="mt-3 grid gap-5 md:grid-cols-3 items-stretch">
          {(["lite", "pro", "ultra"] as TierKey[]).map((tier) => (
            <TierCard key={tier} copy={copy} tier={tier} period={period} onCheckout={setSheetPlan} />
          ))}
        </div>
        <p className="flex items-center justify-center gap-2 text-xs text-white/50 mt-5 text-center">
          <ShieldCheck className="w-3.5 h-3.5 text-[#D4AF37]/80 shrink-0" /> {copy.card.guaranteeLine}
        </p>

        {/* Why upgrade — the reference design's icon row. */}
        <div className="mt-12">
          <h2 className="text-xl md:text-2xl font-bold text-center">{copy.whyUpgrade.h2Before}<span className="text-[#D4AF37]">{copy.whyUpgrade.h2Accent}</span></h2>
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 max-w-4xl mx-auto">
            {copy.whyUpgrade.items.map((item, i) => {
              const Icon = WHY_UPGRADE_ICONS[i] ?? Sparkles;
              return (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.4, delay: i * 0.07 }}
                  className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 transition-colors hover:border-[#D4AF37]/40"
                >
                  <Icon className="w-5 h-5 text-[#D4AF37]" />
                  <p className="mt-2 text-sm font-semibold text-white/90">{item.title}</p>
                  <p className="mt-1 text-xs text-white/50 leading-relaxed">{item.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Feature showcase (Pricing v3) — real captures of the
            live site. Every image is a screenshot of WorldEye
            itself; each caption says what the screen shows and
            nothing more. Copy lives in the dictionary's showcase
            block so both locales carry it. */}
        <div className="mt-14">
          <h2 className="text-xl md:text-2xl font-bold text-center">{copy.showcase.h2Before}<span className="text-[#D4AF37]">{copy.showcase.h2Accent}</span></h2>
          <p className="mt-2 text-sm text-white/50 text-center max-w-xl mx-auto leading-relaxed">{copy.showcase.sub}</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {copy.showcase.items.map((item, i) => (
              <motion.figure
                key={item.src}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.4, delay: (i % 3) * 0.08 }}
                className="group"
              >
                <div className="overflow-hidden rounded-3xl border border-white/10">
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

        {/* Enterprise — image-backed, in the reference's blue. The
            backdrop is the dictionary's maritime-layer capture (the
            Ultra detail copy's second feature image in both locales). */}
        <Reveal className="relative mt-10 max-w-3xl mx-auto rounded-3xl border border-[#38bdf8]/30 overflow-hidden">
          <img
            src={copy.planDetails.ultra.featureImages[1].src}
            alt={copy.planDetails.ultra.featureImages[1].alt}
            width={1200}
            height={675}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#04121f]/85 via-[#030b16]/90 to-[#02060d]/95" />
          <div className="relative flex flex-col md:flex-row md:items-center gap-6 p-6 md:p-8">
            <div className="flex-1">
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
            </div>
            <div className="md:w-64 shrink-0">
              <CheckoutButton plan="enterprise" label={copy.plans.enterprise.cta} tier="enterprise" onCheckout={setSheetPlan} />
              <p className="flex items-center justify-center gap-2 text-xs text-white/35 mt-3">
                <Lock className="w-3.5 h-3.5" /> {copy.enterprise.securedByStripe}
              </p>
              <p className="mt-2 text-center">
                <HostedCheckoutLink plan="enterprise" caption={false} surface="pricing" />
              </p>
              <p className="text-xs text-white/40 mt-3">{copy.enterprise.supportLine ?? ENTERPRISE_SUPPORT_LINE}</p>
              <p className="text-xs mt-3">
                <Link href="/enterprise" className="text-[#38bdf8] hover:underline">
                  {copy.enterprise.dashboardLink}
                </Link>
              </p>
            </div>
          </div>
        </Reveal>

        {/* Team Access */}
        <div className="mt-10">
          <CancelReassurance guarantee={false} />
        </div>
        <TeamSection />

        {/* Free vs the tiers comparison */}
        <Reveal className="mt-10">
          <h2 className="text-xl md:text-2xl font-bold text-center">{copy.comparison.h2Before}<span className="text-[#D4AF37]">{copy.comparison.h2Accent}</span></h2>
          <div className="mt-5 rounded-3xl border border-white/10 bg-white/[0.02] overflow-hidden max-w-3xl mx-auto">
            <div className="grid grid-cols-[1fr_40px_40px_40px_44px] md:grid-cols-[1fr_72px_72px_72px_72px] text-[11px] font-bold tracking-[0.15em] text-white/40 border-b border-white/10 bg-white/[0.02]">
              <div className="px-4 md:px-7 py-2.5">{copy.comparison.featureHeader}</div>
              <div className="py-2.5 text-center">{copy.comparison.freeHeader}</div>
              <div className="py-2.5 text-center text-[#00E5FF]">{copy.comparison.liteHeader}</div>
              <div className="py-2.5 text-center text-[#D4AF37] bg-[#D4AF37]/[0.08]">{copy.comparison.proHeader}</div>
              <div className="py-2.5 text-center text-[#a78bfa]">{copy.comparison.ultraHeader}</div>
            </div>
            {copy.comparison.rows.map((feature, i) => {
              const r = COMPARE_BOOLEANS[i] ?? { free: false, lite: false, pro: false, ultra: false };
              const cells = [
                { on: r.free, cls: "text-white/35" },
                { on: r.lite, cls: "text-[#00E5FF]/80" },
                { on: r.pro, cls: "text-[#D4AF37]" },
                { on: r.ultra, cls: "text-[#a78bfa]" },
              ];
              return (
                <div key={feature} className="grid grid-cols-[1fr_40px_40px_40px_44px] md:grid-cols-[1fr_72px_72px_72px_72px] border-b border-white/5 last:border-0 text-[13px] sm:text-sm">
                  <div className="px-4 md:px-7 py-2 text-white/75">{feature}</div>
                  {cells.map((c, j) => (
                    <div
                      key={j}
                      className={`py-2 flex justify-center items-center ${j === 3 ? "bg-[#a78bfa]/[0.05]" : j === 2 ? "bg-[#D4AF37]/[0.07]" : ""}`}
                    >
                      {c.on
                        ? <Check className={`w-4 h-4 ${c.cls}`} strokeWidth={3} />
                        : <Minus className="w-4 h-4 text-white/15" />}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-center text-xs text-white/40 max-w-xl mx-auto">
            {copy.comparison.noteBefore}
            <a href="/affiliates" className="underline hover:text-white/70">{copy.comparison.noteLink}</a>
            {copy.comparison.noteAfter}
          </p>
          <div className="mt-5 text-center">
            <button
              onClick={() => document.getElementById("pro-card")?.scrollIntoView({ behavior: "smooth", block: "center" })}
              className="px-6 py-2.5 rounded-2xl bg-[#D4AF37] text-black font-bold text-sm hover:brightness-110 transition"
            >
              {copy.comparison.choosePro}
            </button>
          </div>
        </Reveal>

        {/* FAQ */}
        <Reveal className="mt-10 max-w-2xl mx-auto">
          <h2 className="text-xl md:text-2xl font-bold text-center mb-4">{copy.faqHeading}</h2>
          <div className="space-y-2">
            {copy.faqs.map((f) => (
              <FaqItem key={f.q} q={f.q} a={f.a} />
            ))}
          </div>
        </Reveal>

        {/* Compare with the alternatives */}
        <Reveal className="mt-12 max-w-3xl mx-auto text-center">
          <h2 className="text-xl md:text-2xl font-bold">{copy.compareTeasers.heading}</h2>
          <p className="text-sm text-white/50 mt-2 max-w-xl mx-auto leading-relaxed">
            {copy.compareTeasers.intro}
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2.5">
            {copy.compareTeasers.links.map((l) => (
              <Link key={l.href} href={l.href} className="px-4 py-2 rounded-full border border-white/15 text-xs text-white/65 hover:text-white hover:border-[#D4AF37]/50 transition">
                {l.label}
              </Link>
            ))}
            <Link href="/compare" className="px-4 py-2 rounded-full border border-[#D4AF37]/40 text-xs text-[#D4AF37] hover:bg-[#D4AF37]/10 transition">
              {copy.compareTeasers.allLabel}
            </Link>
          </div>
        </Reveal>

        {/* Bottom trust */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs text-white/35">
          {copy.trust.map((label, i) => {
            const Icon = TRUST_ICONS[i] ?? BadgeCheck;
            return (
              <span key={label} className="flex items-center gap-1.5"><Icon className="w-4 h-4 text-[#D4AF37]/70" /> {label}</span>
            );
          })}
        </div>
      </div>
      <StickyMobileCta copy={copy} period={period} onCheckout={setSheetPlan} />
      <CheckoutSheet plan={sheetPlan} onClose={closeSheet} analyticsSurface="pricing" />
      <SiteFooter copy={getChromeCopy(locale)} locale={locale} slug="pricing" />
    </main>
    </MotionConfig>
  );
}
