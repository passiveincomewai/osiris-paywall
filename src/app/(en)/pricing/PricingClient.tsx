"use client";

import { useCallback, useEffect, useState } from "react";
import LanguageHeaderControl from "@/components/translate/LanguageHeaderControl";
import Link from "next/link";
import SiteFooter from "@/components/SiteFooter";
import JsonLd from "@/components/JsonLd";
import CheckoutSheet from "@/components/CheckoutSheet";
import TrialButton from "@/components/TrialButton";
import TeamSection from "./TeamSection";
import ProofCounters from "@/components/ProofCounters";
import CancelReassurance from "@/components/CancelReassurance";
import HostedCheckoutLink from "@/components/HostedCheckoutLink";
import {
  ENTERPRISE_OFFER_FEATURES as ENTERPRISE_FEATURES,
  ENTERPRISE_GUARANTEE_LINE,
  ENTERPRISE_SUPPORT_LINE,
} from "@/lib/enterprise/offer";
import { recordLastViewedPlan } from "@/lib/billing/trial-prompt";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Check, X, Sparkles, BrainCircuit,
  ShieldCheck, Zap, Lock, ChevronDown, BadgeCheck, Minus, Car, Video, Bell,
} from "lucide-react";
import { localizedPath, type LocaleCode } from "@/i18n/config";
import { localizedUrl } from "@/lib/i18n-seo";
import { enPricing, type PricingCopy } from "@/i18n/dictionaries/en/pricing";
import { getChromeCopy } from "@/i18n/dictionaries";

/**
 * The pricing page client. All copy comes from the pricing dictionary
 * (src/i18n/dictionaries/<locale>/pricing.ts) via props — the English
 * route passes the English dictionary (the render is unchanged), the
 * /es route passes the Spanish one. Checkout behavior is identical in
 * every locale: same plans, same Stripe machinery, USD prices.
 *
 * NOT localized in this tranche (they keep their own copy and render
 * in English on the Spanish page too — see the build REPORT):
 * TeamSection, CancelReassurance, ProofCounters, HostedCheckoutLink,
 * CheckoutSheet, TrialButton.
 */

type Plan = "weekly" | "monthly" | "annual" | "enterprise";

// Icons stay in code, in dictionary order (dictionaries hold copy only).
const PRO_FEATURE_ICONS = [BrainCircuit, Car, ShieldCheck, Video, Bell, Sparkles];
const VIP_FEATURE_ICONS = [Zap, Video, Bell];
const TRUST_ICONS = [BadgeCheck, ShieldCheck, Lock, X];

// Comparison-table checkmarks stay in code, in dictionary row order.
const COMPARE_BOOLEANS: { free: boolean; pro: boolean; vip: boolean }[] = [
  { free: true, pro: true, vip: true },
  { free: true, pro: true, vip: true },
  { free: true, pro: true, vip: true },
  { free: true, pro: true, vip: true },
  { free: true, pro: true, vip: true },
  { free: true, pro: true, vip: true },
  { free: true, pro: true, vip: true },
  { free: true, pro: true, vip: true },
  { free: true, pro: true, vip: true },
  { free: true, pro: true, vip: true },
  { free: true, pro: true, vip: true },
  { free: false, pro: false, vip: false },
  { free: true, pro: true, vip: true },
  { free: false, pro: true, vip: true },
  { free: true, pro: true, vip: true },
  { free: false, pro: true, vip: true },
  { free: false, pro: true, vip: true },
  { free: false, pro: true, vip: true },
  { free: false, pro: true, vip: true },
  { free: false, pro: true, vip: true },
  { free: false, pro: true, vip: true },
  { free: false, pro: false, vip: true },
  { free: false, pro: false, vip: true },
];

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

function CheckoutButton({
  plan,
  label,
  trial,
  onCheckout,
}: {
  plan: Plan;
  label: string;
  trial?: string;
  onCheckout: (plan: Plan) => void;
}) {
  // Trial plans carry the owner's artwork button; Enterprise (no trial)
  // keeps the gold button.
  if (trial) {
    return (
      <TrialButton label={label} onClick={() => onCheckout(plan)} className="w-full" />
    );
  }
  return (
    <button
      onClick={() => onCheckout(plan)}
      className="w-full py-4 rounded-2xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black font-bold text-lg tracking-wide hover:brightness-110 active:scale-[0.99] transition shadow-[0_8px_32px_rgba(212,175,55,0.35)]"
    >
      {label}
    </button>
  );
}

function StickyMobileCta({ cta }: { cta: string }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 700);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
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
          <button
            onClick={() => document.getElementById("pro-card")?.scrollIntoView({ behavior: "smooth", block: "center" })}
            className="pointer-events-auto w-full py-3.5 rounded-2xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black font-bold text-[15px] tracking-wide shadow-[0_8px_32px_rgba(212,175,55,0.45)] active:scale-[0.99] transition"
          >
            {cta}
          </button>
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

export default function PricingPage({
  copy = enPricing,
  locale = "en",
}: {
  copy?: PricingCopy;
  locale?: LocaleCode;
} = {}) {
  const [plan, setPlan] = useState<Plan>("annual");
  const PLANS = copy.plans;
  const p = PLANS[plan];
  const faqJsonLd = buildFaqJsonLd(copy, locale);
  // Feature icons ride along in code, exactly as the pre-i18n data
  // tables carried them (the JSX renders the check bullets, as before).
  const proFeatures = copy.proFeatures.map((f, i) => ({
    ...f,
    icon: PRO_FEATURE_ICONS[i] ?? Sparkles,
  }));
  const vipFeatures = copy.vipFeatures.map((f, i) => ({
    ...f,
    icon: VIP_FEATURE_ICONS[i] ?? Zap,
  }));
  const enterpriseFeatures = copy.enterprise.features ?? ENTERPRISE_FEATURES;
  const homeHref = localizedPath("", locale);
  // Checkout opens IN PLACE: the plan CTAs raise the embedded form in a
  // sheet (components/CheckoutSheet — bottom sheet on mobile, dialog on
  // desktop) instead of navigating to /checkout. It is the same
  // Checkout-Session machinery every lock surface reaches via
  // startPlanCheckout → /checkout, so the two presentations can't drift;
  // closing the sheet just returns here, and the hosted Stripe page
  // remains one quiet link away under each CTA.
  const [sheetPlan, setSheetPlan] = useState<Plan | null>(null);
  const closeSheet = useCallback(() => setSheetPlan(null), []);

  return (
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

        {/* Hero */}
        <div className="text-center max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <img
              src="/worldeye-eye.png"
              alt="WorldEye"
              width={600}
              height={432}
              className="h-10 md:h-12 w-auto mx-auto mb-4"
              style={{ filter: "drop-shadow(0 0 18px rgba(0,150,255,0.45))" }}
            />
            <h1 className="text-2xl md:text-4xl font-bold tracking-tight">
              {copy.hero.h1Before}<span className="text-[#D4AF37]">{copy.hero.h1Accent}</span>{copy.hero.h1After}
            </h1>
            <p className="text-white/55 mt-2 text-sm md:text-base leading-relaxed px-1">
              {copy.hero.sub}
            </p>
          </motion.div>

          <ProofCounters />

          {/* Billing toggle */}
          <div className="mt-6 inline-flex p-1.5 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur max-w-full">
            {(["weekly", "monthly", "annual"] as Plan[]).map((key) => (
              <button
                key={key}
                onClick={() => {
                  setPlan(key);
                  // Wave 2 F3: remember the plan this visitor is looking
                  // at so the post-signup trial prompt can preselect it.
                  recordLastViewedPlan(key);
                }}
                className={`relative px-4 md:px-7 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
                  plan === key ? "text-black" : "text-white/55 hover:text-white"
                }`}
              >
                {key === "annual" && (
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-[9px] font-bold tracking-[0.15em] bg-[#D4AF37] text-black px-2 py-0.5 rounded-full whitespace-nowrap">
                    {copy.toggle.mostPopular}
                  </span>
                )}
                {plan === key && (
                  <motion.span
                    layoutId="billing-pill"
                    className="absolute inset-0 rounded-xl bg-[#D4AF37]"
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  />
                )}
                <span className="relative flex items-center gap-2">
                  {PLANS[key].name}
                  {PLANS[key].save && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${plan === key ? "bg-black/20 text-black" : "bg-[#D4AF37]/15 text-[#D4AF37]"}`}>
                      {key === "annual" ? copy.toggle.discountAnnual : copy.toggle.discountMonthly}
                    </span>
                  )}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Price card */}
        <motion.div
          id="pro-card"
          key={plan}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="mt-6 max-w-md mx-auto rounded-3xl border border-[#D4AF37]/30 bg-gradient-to-b from-white/[0.06] to-white/[0.02] backdrop-blur-xl p-5 md:p-6 shadow-[0_24px_80px_rgba(212,175,55,0.12)]"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-semibold tracking-[0.2em] text-[#D4AF37]">{plan === "annual" ? copy.card.vipProLabel : copy.card.proLabel}</p>
              <div className="mt-2 flex items-baseline gap-1">
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
              <p className="text-sm text-[#D4AF37] font-semibold mt-1.5">{copy.card.justPerDayBefore}{p.perDay}{copy.card.justPerDayAfter}</p>
              {p.trial && (
                <p className="mt-3">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide px-3 py-1.5 rounded-full bg-emerald-400/15 text-emerald-300 border border-emerald-400/30">
                    <Zap className="w-3.5 h-3.5" /> {p.trial}{copy.card.trialChipSuffix}
                  </span>
                </p>
              )}
            </div>
            {p.save && (
              <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30 whitespace-nowrap">
                {p.save}
              </span>
            )}
          </div>

          <div className="my-4 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/30 to-transparent" />

          <ul className="space-y-2">
            {proFeatures.map((f) => (
              <li key={f.title} className="flex items-center gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 text-[#D4AF37]" />
                </span>
                <p className="text-sm text-white/85">
                  <span className="font-medium">{f.title}</span>
                  <span className="text-white/40"> — {f.desc}</span>
                </p>
              </li>
            ))}
          </ul>

          {plan === "annual" && (
            <>
              <p className="mt-4 mb-2 text-xs font-bold tracking-[0.2em] text-[#D4AF37]">{copy.card.vipOnlyHeading}</p>
              <ul className="space-y-2">
                {vipFeatures.map((f) => (
                  <li key={f.title} className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#D4AF37]/25 border border-[#D4AF37]/50 flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 text-[#D4AF37]" />
                    </span>
                    <p className="text-sm text-white/85">
                      <span className="font-medium">{f.title}</span>
                      <span className="text-white/40"> — {f.desc}</span>
                    </p>
                  </li>
                ))}
              </ul>
            </>
          )}

          <div className="mt-5">
            <CheckoutButton plan={plan} label={p.cta} trial={p.trial} onCheckout={setSheetPlan} />
          </div>
          <p className="flex items-center justify-center gap-2 text-xs text-white/35 mt-4">
            <Lock className="w-3.5 h-3.5" /> {copy.card.securedLine}
          </p>
          <p className="flex items-center justify-center gap-2 text-xs text-white/50 mt-2 text-center">
            <ShieldCheck className="w-3.5 h-3.5 text-[#D4AF37]/80 shrink-0" /> {copy.card.guaranteeLine}
          </p>
          <p className="mt-3 text-center">
            <HostedCheckoutLink plan={plan} caption={false} />
          </p>
        </motion.div>

        {/* Enterprise */}
        <div className="mt-10 max-w-3xl mx-auto rounded-3xl border border-[#00E5FF]/25 bg-gradient-to-b from-[#00E5FF]/[0.06] to-white/[0.02] backdrop-blur-xl p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <div className="flex-1">
              <p className="text-xs font-bold tracking-[0.25em] text-[#00E5FF] mb-2">{copy.enterprise.eyebrow}</p>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl md:text-5xl font-bold tracking-tight">{PLANS.enterprise.price}</span>
                <span className="text-white/45 text-lg">{PLANS.enterprise.per}</span>
              </div>
              <p className="text-sm text-white/45 mt-2">{PLANS.enterprise.note}</p>
              <ul className="mt-4 space-y-2">
                {enterpriseFeatures.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-white/85">
                    <span className="w-5 h-5 rounded-full bg-[#00E5FF]/15 border border-[#00E5FF]/30 flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 text-[#00E5FF]" />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
            <div className="md:w-64 shrink-0">
              <CheckoutButton plan="enterprise" label={PLANS.enterprise.cta} trial={PLANS.enterprise.trial} onCheckout={setSheetPlan} />
              <p className="flex items-center justify-center gap-2 text-xs text-white/35 mt-3">
                <Lock className="w-3.5 h-3.5" /> {copy.enterprise.securedByStripe}
              </p>
              <p className="mt-2 text-center">
                <HostedCheckoutLink plan="enterprise" caption={false} />
              </p>
              <p className="flex items-start gap-2 text-xs text-white/50 mt-4">
                <ShieldCheck className="w-3.5 h-3.5 text-[#00E5FF]/80 shrink-0 mt-px" />
                <span>{copy.enterprise.guaranteeLine ?? ENTERPRISE_GUARANTEE_LINE}</span>
              </p>
              <p className="text-xs text-white/40 mt-3">{copy.enterprise.supportLine ?? ENTERPRISE_SUPPORT_LINE}</p>
              <p className="text-xs mt-3">
                <Link href="/enterprise" className="text-[#00E5FF] hover:underline">
                  {copy.enterprise.dashboardLink}
                </Link>
              </p>
            </div>
          </div>
        </div>

        {/* Team Access */}
        <div className="mt-10">
          <CancelReassurance />
        </div>
        <TeamSection />

        {/* Free vs Pro comparison */}
        <div className="mt-10">
          <h2 className="text-xl md:text-2xl font-bold text-center">{copy.comparison.h2Before}<span className="text-[#D4AF37]">{copy.comparison.h2Accent}</span></h2>
          <div className="mt-5 rounded-3xl border border-white/10 bg-white/[0.02] overflow-hidden max-w-3xl mx-auto">
            <div className="grid grid-cols-[1fr_52px_52px_52px] md:grid-cols-[1fr_90px_90px_90px] text-[11px] font-bold tracking-[0.15em] text-white/40 border-b border-white/10 bg-white/[0.02]">
              <div className="px-5 md:px-7 py-2.5">{copy.comparison.featureHeader}</div>
              <div className="py-2.5 text-center">{copy.comparison.freeHeader}</div>
              <div className="py-2.5 text-center">{copy.comparison.proHeader}</div>
              <div className="py-2.5 text-center text-[#D4AF37]">{copy.comparison.vipHeader}</div>
            </div>
            {copy.comparison.rows.map((feature, i) => {
              const r = COMPARE_BOOLEANS[i] ?? { free: false, pro: false, vip: false };
              return (
                <div key={feature} className="grid grid-cols-[1fr_52px_52px_52px] md:grid-cols-[1fr_90px_90px_90px] border-b border-white/5 last:border-0 text-sm">
                  <div className="px-5 md:px-7 py-2 text-white/75">{feature}</div>
                  <div className="py-2 flex justify-center items-center">
                    {r.free
                      ? <Check className="w-4 h-4 text-white/35" />
                      : <Minus className="w-4 h-4 text-white/15" />}
                  </div>
                  <div className="py-2 flex justify-center items-center">
                    {r.pro
                      ? <Check className="w-4 h-4 text-white/60" strokeWidth={3} />
                      : <Minus className="w-4 h-4 text-white/15" />}
                  </div>
                  <div className="py-2 flex justify-center items-center bg-[#D4AF37]/[0.06]">
                    {r.vip
                      ? <Check className="w-4 h-4 text-[#D4AF37]" strokeWidth={3} />
                      : <Minus className="w-4 h-4 text-white/15" />}
                  </div>
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
        </div>

        {/* FAQ */}
        <div className="mt-10 max-w-2xl mx-auto">
          <h2 className="text-xl md:text-2xl font-bold text-center mb-4">{copy.faqHeading}</h2>
          <div className="space-y-2">
            {copy.faqs.map((f) => (
              <FaqItem key={f.q} q={f.q} a={f.a} />
            ))}
          </div>
        </div>

        {/* Compare with the alternatives */}
        <div className="mt-12 max-w-3xl mx-auto text-center">
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
        </div>

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
      <StickyMobileCta cta={p.cta} />
      <CheckoutSheet plan={sheetPlan} onClose={closeSheet} />
      <SiteFooter copy={getChromeCopy(locale)} locale={locale} slug="pricing" />
    </main>
  );
}
