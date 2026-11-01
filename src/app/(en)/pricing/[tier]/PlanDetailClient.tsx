"use client";

/**
 * Per-plan detail page client (/pricing/lite|pro|ultra) — Pricing
 * Redesign v2 (2026-11-01). Each tier gets its OWN art direction in
 * its accent colour (Lite cyan, Pro gold, Ultra violet): Lite leads
 * with a wide capture band over a centred hero, Pro splits copy and
 * capture side by side, Ultra runs a full-bleed cinematic hero.
 *
 * Copy comes from the pricing dictionary's `planDetails` block
 * (English at launch — the detail routes are EN-only; the dictionary
 * carries the Spanish strings for a later /es route). Feature claims
 * mirror src/lib/billing/plans.ts entitlementsFor exactly, including
 * what each tier does NOT include. Checkout is the same machinery as
 * /pricing: same plan keys (Pro = bare period names, Lite/Ultra =
 * tier_period), same CheckoutSheet, trials from the period only
 * (weekly 3 days, monthly/annual 10 — src/lib/billing/trials.ts).
 */
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import SiteFooter from "@/components/SiteFooter";
import CheckoutSheet from "@/components/CheckoutSheet";
import HostedCheckoutLink from "@/components/HostedCheckoutLink";
import { preloadStripeJs } from "@/lib/billing/stripe-preload";
import type { CheckoutPlanId } from "@/lib/billing/trial-checkout";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Check, X, Zap, Lock, ChevronDown, BadgeCheck,
} from "lucide-react";
import { enPricing, type PricingCopy, type PricingPlanCopy } from "@/i18n/dictionaries/en/pricing";
import { getChromeCopy } from "@/i18n/dictionaries";

type Period = "weekly" | "monthly" | "annual";
type TierKey = "lite" | "pro" | "ultra";

const CARD_TRUST_ICONS = [BadgeCheck, Lock, Check];

/** Per-tier accent treatment — same ruling as /pricing (Lite cyan,
 *  Pro gold, Ultra violet). Literal classes only. */
const TIER_THEME: Record<
  TierKey,
  { text: string; border: string; chipBg: string; chipBorder: string; glow: string; btn: string }
> = {
  lite: {
    text: "text-[#00E5FF]",
    border: "border-[#00E5FF]/40",
    chipBg: "bg-[#00E5FF]/15",
    chipBorder: "border-[#00E5FF]/30",
    glow: "shadow-[0_24px_80px_rgba(0,229,255,0.10)]",
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
    border: "border-[#a78bfa]/40",
    chipBg: "bg-[#a78bfa]/15",
    chipBorder: "border-[#a78bfa]/30",
    glow: "shadow-[0_24px_80px_rgba(167,139,250,0.12)]",
    btn: "bg-gradient-to-b from-[#c0a8ff] to-[#7c5cd6] text-white shadow-[0_8px_32px_rgba(167,139,250,0.30)]",
  },
};

/** The checkout plan key for a tier × period (the /pricing contract). */
function checkoutKeyFor(tier: TierKey, period: Period): CheckoutPlanId {
  return tier === "pro" ? period : (`${tier}_${period}` as CheckoutPlanId);
}

/** The dictionary plan copy for a tier × period. */
function planCopyFor(copy: PricingCopy, tier: TierKey, period: Period): PricingPlanCopy {
  if (tier === "pro") return copy.plans[period];
  return copy.plansGrid[`${tier}_${period}` as keyof PricingCopy["plansGrid"]];
}

function FaqItem({ q, a, accent }: { q: string; a: string; accent: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-white/10 rounded-2xl bg-white/[0.02] overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-4 px-4 py-3 text-left"
      >
        <span className="font-medium text-white/90">{q}</span>
        <ChevronDown className={`w-5 h-5 ${accent} shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
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

export default function PlanDetailClient({ tier }: { tier: TierKey }) {
  const copy = enPricing;
  const detail = copy.planDetails[tier];
  const theme = TIER_THEME[tier];
  const [period, setPeriod] = useState<Period>("annual");
  const [sheetPlan, setSheetPlan] = useState<CheckoutPlanId | null>(null);
  const closeSheet = useCallback(() => setSheetPlan(null), []);
  useEffect(() => {
    preloadStripeJs();
  }, []);

  const selected = planCopyFor(copy, tier, period);
  const selectedKey = checkoutKeyFor(tier, period);
  const onCheckout = (plan: CheckoutPlanId) => setSheetPlan(plan);

  const ctaButton = (label: string, plan: CheckoutPlanId, block = false) => (
    <button
      onClick={() => onCheckout(plan)}
      className={`${block ? "w-full" : "w-full sm:w-auto"} px-8 py-4 rounded-2xl font-bold text-lg tracking-wide hover:brightness-110 active:scale-[0.99] transition ${theme.btn}`}
    >
      {label}
    </button>
  );

  return (
    <main className="docs-root min-h-screen bg-[#050508] text-zinc-100 relative overflow-x-clip">
      <div className="relative max-w-5xl mx-auto px-6 py-6 md:py-8">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-6">
          <Link href="/pricing" className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition">
            <ArrowLeft className="w-4 h-4" /> {copy.planDetails.backToPricing}
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/" aria-label="WorldEye — back to the live globe" className="shrink-0 inline-flex items-center">
              <img src="/worldeye-header-logo.png" alt="WorldEye" width={1063} height={290} className="h-6 w-auto" />
            </Link>
            <span className="text-[11px] font-mono tracking-[0.3em] text-[#D4AF37]">{copy.proBadge}</span>
          </div>
        </div>

        {/* Hero — uniquely art-directed per tier. */}
        {tier === "lite" && (
          <div className="text-center">
            <figure>
              <img
                src={detail.heroImage.src}
                alt={detail.heroImage.alt}
                width={1200}
                height={675}
                className={`w-full h-52 md:h-72 object-cover rounded-3xl border ${theme.border} ${theme.glow}`}
              />
              <figcaption className="mt-2 text-xs text-white/35">{detail.heroImage.caption}</figcaption>
            </figure>
            <p className={`mt-8 text-[11px] md:text-xs font-bold tracking-[0.3em] ${theme.text}`}>{detail.eyebrow}</p>
            <h1 className="mt-3 text-4xl md:text-5xl font-bold tracking-tight">{detail.h1}</h1>
            <p className="mt-4 text-sm md:text-base text-white/55 leading-relaxed max-w-2xl mx-auto">{detail.intro}</p>
            <div className="mt-6">{ctaButton(selected.cta, selectedKey)}</div>
          </div>
        )}
        {tier === "pro" && (
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <p className={`text-[11px] md:text-xs font-bold tracking-[0.3em] ${theme.text}`}>{detail.eyebrow}</p>
              <h1 className="mt-3 text-4xl md:text-5xl font-bold tracking-tight">{detail.h1}</h1>
              <p className="mt-4 text-sm md:text-base text-white/55 leading-relaxed">{detail.intro}</p>
              <div className="mt-6">{ctaButton(selected.cta, selectedKey)}</div>
              <div className="mt-4 flex items-center gap-4 text-[11px] text-white/40">
                {copy.card.trustRow.map((label, i) => {
                  const Icon = CARD_TRUST_ICONS[i] ?? BadgeCheck;
                  return (
                    <span key={label} className="flex items-center gap-1.5">
                      <Icon className={`w-3.5 h-3.5 ${theme.text}`} /> {label}
                    </span>
                  );
                })}
              </div>
            </div>
            <figure>
              <img
                src={detail.heroImage.src}
                alt={detail.heroImage.alt}
                width={1200}
                height={675}
                className={`w-full h-64 md:h-80 object-cover rounded-3xl border ${theme.border} ${theme.glow}`}
              />
              <figcaption className="mt-2 text-xs text-white/35">{detail.heroImage.caption}</figcaption>
            </figure>
          </div>
        )}
        {tier === "ultra" && (
          <div className="relative left-1/2 -translate-x-1/2 w-screen overflow-hidden">
            <img src={detail.heroImage.src} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/60" />
            <div className="absolute inset-0 bg-gradient-to-b from-[#0b0618]/80 via-[#050508]/40 to-[#050508]" />
            <div className="relative max-w-3xl mx-auto px-6 pt-14 pb-12 md:pt-20 md:pb-16 text-center">
              <p className={`text-[11px] md:text-xs font-bold tracking-[0.3em] ${theme.text}`}>{detail.eyebrow}</p>
              <h1 className="mt-3 text-4xl md:text-6xl font-bold tracking-tight leading-[1.05]">{detail.h1}</h1>
              <p className="mt-4 text-sm md:text-base text-white/60 leading-relaxed max-w-2xl mx-auto">{detail.intro}</p>
              <div className="mt-7">{ctaButton(selected.cta, selectedKey)}</div>
              <p className="mt-3 text-xs text-white/35">{detail.heroImage.caption}</p>
            </div>
          </div>
        )}

        {/* Period pricing — the full table, every period selectable. */}
        <div className="mt-12 max-w-3xl mx-auto">
          <h2 className="text-xl md:text-2xl font-bold text-center">{copy.planDetails.pricingHeading}</h2>
          <div className="mt-5 space-y-2.5">
            {(["weekly", "monthly", "annual"] as Period[]).map((p) => {
              const pc = planCopyFor(copy, tier, p);
              const active = p === period;
              return (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  aria-pressed={active}
                  className={`w-full flex items-center gap-4 rounded-2xl border px-5 py-4 text-left transition ${
                    active
                      ? `${theme.border} bg-white/[0.05] ${theme.glow}`
                      : "border-white/10 bg-white/[0.02] hover:border-white/25"
                  }`}
                >
                  <span className="flex-1 min-w-0">
                    <span className="flex items-center gap-2 text-sm font-semibold text-white/90">
                      {copy.tiers.periods[p]}
                      {p === "annual" && (
                        <span className="text-[9px] font-bold tracking-[0.15em] px-2 py-0.5 rounded-full bg-[#D4AF37] text-black">
                          {tier === "pro" ? copy.card.vipProLabel : copy.tiers.annualBadge}
                        </span>
                      )}
                      {pc.save && (
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${theme.chipBg} ${theme.text} border ${theme.chipBorder}`}>
                          {pc.save}
                        </span>
                      )}
                    </span>
                    <span className="block text-xs text-white/40 mt-0.5">{pc.note}</span>
                  </span>
                  <span className="text-right shrink-0">
                    <span className="text-2xl font-bold tracking-tight">{pc.price}</span>
                    <span className="text-white/45 text-sm">{pc.per}</span>
                    <span className={`block text-xs ${theme.text} font-semibold`}>
                      {copy.card.justPerDayBefore}
                      {pc.perDay}
                      {copy.card.justPerDayAfter}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
          <div className={`mt-5 rounded-3xl border ${theme.border} bg-gradient-to-b from-white/[0.06] to-white/[0.02] backdrop-blur-xl p-5 md:p-6 ${theme.glow}`}>
            <div className="flex flex-wrap items-baseline gap-x-2">
              <AnimatePresence mode="popLayout">
                <motion.span
                  key={selected.price}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="text-5xl font-bold tracking-tight"
                >
                  {selected.price}
                </motion.span>
              </AnimatePresence>
              <span className="text-white/45 text-lg">{selected.per}</span>
              {selected.trial && (
                <span className="ml-auto inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide px-3 py-1.5 rounded-full bg-emerald-400/15 text-emerald-300 border border-emerald-400/30">
                  <Zap className="w-3.5 h-3.5" /> {selected.trial}
                  {copy.card.trialChipSuffix}
                </span>
              )}
            </div>
            <p className="text-sm text-white/45 mt-2">{selected.note}</p>
            <div className="mt-5">{ctaButton(selected.cta, selectedKey, true)}</div>
            <div className="mt-4 flex items-center justify-center gap-4 text-[11px] text-white/40">
              {copy.card.trustRow.map((label, i) => {
                const Icon = CARD_TRUST_ICONS[i] ?? BadgeCheck;
                return (
                  <span key={label} className="flex items-center gap-1.5">
                    <Icon className={`w-3.5 h-3.5 ${theme.text}`} /> {label}
                  </span>
                );
              })}
            </div>
            <p className="mt-3 text-center">
              <HostedCheckoutLink plan={selectedKey} caption={false} surface="pricing" />
            </p>
          </div>
        </div>

        {/* Best for */}
        <div className="mt-12 max-w-3xl mx-auto">
          <h2 className="text-xl md:text-2xl font-bold">{copy.planDetails.bestForHeading}</h2>
          <ul className="mt-4 space-y-2">
            {detail.bestFor.map((line) => (
              <li key={line} className="flex items-start gap-2.5 text-sm text-white/75 leading-relaxed">
                <span className={`mt-0.5 w-5 h-5 rounded-full ${theme.chipBg} border ${theme.chipBorder} flex items-center justify-center shrink-0`}>
                  <Check className={`w-3 h-3 ${theme.text}`} strokeWidth={3} />
                </span>
                {line}
              </li>
            ))}
          </ul>
        </div>

        {/* Everything included — layout varies by tier. */}
        <div className="mt-12 max-w-4xl mx-auto">
          <h2 className="text-xl md:text-2xl font-bold">
            {copy.planDetails.includesBefore}
            {copy.tiers[tier].name}
          </h2>
          {tier === "pro" ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {detail.includes.map((f) => (
                <div key={f.title} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                  <p className="flex items-center gap-2.5 text-sm font-semibold text-white/90">
                    <span className={`w-5 h-5 rounded-full ${theme.chipBg} border ${theme.chipBorder} flex items-center justify-center shrink-0`}>
                      <Check className={`w-3 h-3 ${theme.text}`} strokeWidth={3} />
                    </span>
                    {f.title}
                  </p>
                  <p className="mt-1.5 text-sm text-white/50 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          ) : (
            <ul className="mt-5 space-y-2.5 max-w-3xl">
              {detail.includes.map((f) => (
                <li key={f.title} className="flex items-start gap-2.5">
                  <span className={`mt-0.5 w-5 h-5 rounded-full ${theme.chipBg} border ${theme.chipBorder} flex items-center justify-center shrink-0`}>
                    <Check className={`w-3 h-3 ${theme.text}`} strokeWidth={tier === "ultra" ? 3 : 2} />
                  </span>
                  <p className="text-sm text-white/85">
                    <span className="font-medium">{f.title}</span>
                    <span className="text-white/40"> — {f.desc}</span>
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Not in this plan — stated plainly, with the way up. */}
        <div className="mt-10 max-w-4xl mx-auto">
          <h2 className="text-lg md:text-xl font-bold text-white/80">{copy.planDetails.excludesHeading}</h2>
          <ul className="mt-4 space-y-2.5 max-w-3xl">
            {detail.excludes.map((f) => (
              <li key={f.title} className="flex items-start gap-2.5">
                <span className="mt-0.5 w-5 h-5 rounded-full bg-white/[0.04] border border-white/10 flex items-center justify-center shrink-0">
                  <X className="w-3 h-3 text-white/35" />
                </span>
                <p className="text-sm text-white/60">
                  <span className="font-medium text-white/75">{f.title}</span>
                  <span className="text-white/40"> — {f.desc}</span>
                </p>
              </li>
            ))}
          </ul>
        </div>

        {/* Feature captures — real screens of the live site. */}
        <div className={`mt-12 grid gap-4 ${detail.featureImages.length > 2 ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
          {detail.featureImages.map((img) => (
            <figure key={img.src}>
              <img
                src={img.src}
                alt={img.alt}
                width={1200}
                height={675}
                loading="lazy"
                className="w-full h-48 md:h-56 object-cover rounded-3xl border border-white/10"
              />
              <figcaption className="mt-2 text-xs text-white/35">{img.caption}</figcaption>
            </figure>
          ))}
        </div>

        {/* FAQ */}
        <div className="mt-12 max-w-2xl mx-auto">
          <h2 className="text-xl md:text-2xl font-bold text-center mb-4">{copy.faqHeading}</h2>
          <div className="space-y-2">
            {detail.faqs.map((f) => (
              <FaqItem key={f.q} q={f.q} a={f.a} accent={theme.text} />
            ))}
          </div>
        </div>

        {/* Bottom CTA + back to the comparison */}
        <div className="mt-12 text-center">
          {ctaButton(selected.cta, selectedKey)}
          <p className="mt-5">
            <Link href="/pricing#plans" className={`text-sm font-semibold ${theme.text} hover:underline`}>
              {copy.planDetails.allPlansLink}
            </Link>
          </p>
        </div>
      </div>
      <CheckoutSheet plan={sheetPlan} onClose={closeSheet} />
      <SiteFooter copy={getChromeCopy("en")} locale="en" />
    </main>
  );
}
