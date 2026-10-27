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

type Plan = "weekly" | "monthly" | "annual" | "enterprise";

const PLANS: Record<Plan, { name: string; price: string; per: string; perDay: string; note: string; save?: string; cta: string; trial?: string }> = {
  weekly: { name: "Weekly", price: "$7.99", per: "/week", perDay: "$1.14", note: "3 days free, then billed weekly · cancel anytime", cta: "Start 3-Day Free Trial", trial: "3 days free" },
  monthly: { name: "Monthly", price: "$13.99", per: "/month", perDay: "$0.47", note: "10 days free, then billed monthly · cancel anytime", save: "Save 60%", cta: "Start 10-Day Free Trial", trial: "10 days free" },
  // The annual plan is VIP Pro — a real top tier (timelapse + the intel
  // layers are VIP-only), not just a longer billing period. "Annual"
  // survives only as cadence ("billed annually").
  annual: { name: "VIP Pro", price: "$74.99", per: "/year", perDay: "$0.21", note: "10 days free, then billed annually · cancel anytime", save: "Save 82% · Best value", cta: "Start 10-Day Free Trial", trial: "10 days free" },
  enterprise: { name: "Enterprise", price: "$999", per: "/year", perDay: "$2.74", note: "Billed annually · cancel anytime", cta: "Get Enterprise" },
};

const PRO_FEATURES = [
  { icon: BrainCircuit, title: "OI AI Assistant", desc: "Talk to the map. Forecasts, analysis and recon — powered by WorldEye's built-in AI, with nothing to set up." },
  { icon: Car, title: "Live Traffic Layer", desc: "Live TomTom congestion flow on the road network, with simulated vehicles clearly labeled as simulated." },
  { icon: ShieldCheck, title: "OSINT Toolkit", desc: "Nmap scans, DNS/WHOIS, SSL analysis and threat intel — in-browser." },
  { icon: Video, title: "Camera Recording Studio", desc: "Record live camera feeds right in your browser and save the clips." },
  { icon: Bell, title: "Camera alerts (2)", desc: "Watch up to 2 cameras and get emailed — with the photo — when a condition you describe, like snow or flooding, shows up." },
  { icon: Sparkles, title: "Every Future Layer", desc: "New premium feeds land in Pro first, at no extra cost." },
];

// VIP Pro extras — rendered only on the VIP Pro (annual) card. Timelapse
// and the OSINT intel layers are VIP-only; camera alerts appear on both
// cards because the allowance itself is the upgrade (2 on Pro → 10 here).
const VIP_FEATURES = [
  { icon: Zap, title: "Premium Intel Feeds", desc: "Cyber threats, GDELT events, maritime tracking, conflict zones, live news — VIP only." },
  { icon: Video, title: "Camera Timelapse", desc: "Capture snapshot cameras frame by frame and export the film — VIP only." },
  { icon: Bell, title: "Camera alerts (10)", desc: "The alert allowance raised to 10 watched cameras — Pro includes 2." },
];

// The enterprise offer copy lives in lib/enterprise/offer (shared with
// the /enterprise dashboard landing state and pinned by its tests).

const COMPARE_ROWS: { feature: string; free: boolean; pro: boolean; vip: boolean }[] = [  { feature: "Interactive 3D globe", free: true, pro: true, vip: true },
  { feature: "Live flight tracking & aircraft follow", free: true, pro: true, vip: true },
  { feature: "74,229 public CCTV cameras", free: true, pro: true, vip: true },
  { feature: "Satellite & space tracking", free: true, pro: true, vip: true },
  { feature: "Basic search — fly to any place", free: true, pro: true, vip: true },
  { feature: "Live transit vehicles (15 agencies)", free: true, pro: true, vip: true },
  { feature: "Space launch tracking & countdowns", free: true, pro: true, vip: true },
  { feature: "Street-level photo layer", free: true, pro: true, vip: true },
  { feature: "Radar, lightning, hurricanes & fire perimeters", free: true, pro: true, vip: true },
  { feature: "River gauges & bike-share systems", free: true, pro: true, vip: true },
  { feature: "Sensor effects", free: true, pro: true, vip: true },
  { feature: "Cinematic director (free for affiliates)", free: false, pro: false, vip: false },
  { feature: "Earthquakes, wildfires & weather", free: true, pro: true, vip: true },
  { feature: "OI AI assistant (built-in AI included)", free: false, pro: true, vip: true },
  { feature: "Satellite imagery view", free: true, pro: true, vip: true },
  { feature: "Live traffic layer (TomTom congestion)", free: false, pro: true, vip: true },
  { feature: "Advanced search filters", free: false, pro: true, vip: true },
  { feature: "OSINT toolkit (nmap, DNS, WHOIS, SSL)", free: false, pro: true, vip: true },
  { feature: "Camera Recording Studio", free: false, pro: true, vip: true },
  { feature: "Camera alerts (2 on Pro · 10 on VIP Pro)", free: false, pro: true, vip: true },
  { feature: "Every future Pro layer", free: false, pro: true, vip: true },
  { feature: "Premium intel feeds (cyber, GDELT, maritime, live news)", free: false, pro: false, vip: true },
  { feature: "Camera timelapse", free: false, pro: false, vip: true },
];

const FAQS = [
  {
    q: "How much does WorldEye cost?",
    a: "The map itself is free — the globe, 74,229 cameras, flights, satellites and weather, no account needed. Pro is $7.99/week (starts with a 3-day free trial), $13.99/month (10-day free trial) or VIP Pro at $74.99/year (10-day free trial). Enterprise — the camera feed API and embed for your own platform — is $999/year and has no free trial. Every paid plan can be cancelled anytime, and first charges carry a 7-day money-back guarantee.",
  },
  {
    q: "Is the map really free?",
    a: "Yes. The 3D globe, live flights, 74,229 street cameras, satellites, transit, launch tracking, street-level photos, basic search and natural-hazard layers are free forever — no account, no credit card. Pro unlocks the intelligence-grade tools: the AI assistant, the live traffic layer and advanced search filters. VIP Pro (the yearly plan) adds the premium intel feeds and camera timelapse.",
  },
  {
    q: "Do I need my own API key for the AI assistant?",
    a: "No. OI is powered by WorldEye's built-in AI, with nothing to set up — no API key to bring, no separate provider account, nothing billed to you by a third party.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Anytime, in one click. Your Pro access runs until the end of the billing period you've paid for — weekly, monthly or yearly — and then simply stops. No retention calls, no dark patterns. On a free trial you're never charged during the trial: cancel before it ends and you pay nothing.",
  },
  {
    q: "What if I forget to cancel — can I get a refund?",
    a: "We email you before your trial's first charge, so it shouldn't come as a surprise. And if it still happens: your first charge is covered by a 7-day money-back guarantee — email us at passiveincomewai@gmail.com within 7 days of the charge for a full refund, no questions asked. The guarantee covers your first charge only; renewal charges aren't refundable under it.",
  },
  {
    q: "What happens if I switch plans?",
    a: "Upgrades apply immediately with proration handled by Stripe. Downgrades take effect at the end of your current period.",
  },
  {
    q: "How is this different from osirisai.live?",
    a: "Same open-source engine, plus the paid tiers: an AI analyst that works the map for you, live traffic, advanced search filters and — on VIP Pro — the premium intel feeds the free site doesn't gate, because there is no gate there. Here, the tiers fund the infrastructure.",
  },
];

// FAQPage structured data, built from the same FAQS array the page renders
// below so the schema can never drift from the visible questions.
const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  url: "https://worldeye.app/pricing",
  mainEntity: FAQS.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

function CheckoutButton({
  plan,
  label,
  onCheckout,
}: {
  plan: Plan;
  label: string;
  onCheckout: (plan: Plan) => void;
}) {
  // Trial plans carry the owner's artwork button; Enterprise (no trial)
  // keeps the gold button.
  if (PLANS[plan].trial) {
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

export default function PricingPage() {
  const [plan, setPlan] = useState<Plan>("annual");
  const p = PLANS[plan];
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
          <Link href="/" className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition">
            <ArrowLeft className="w-4 h-4" /> Back to the map
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/" aria-label="WorldEye — back to the live globe" className="shrink-0 inline-flex items-center"><img src="/worldeye-header-logo.png" alt="WorldEye" width={1063} height={290} className="h-6 w-auto" /></Link><span className="text-[11px] font-mono tracking-[0.3em] text-[#D4AF37]">PRO</span>
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
            <p className="text-[11px] font-mono font-medium tracking-[0.3em] text-[#D4AF37] mb-3">
              WORLDEYE PRICING
            </p>
            <h1 className="text-2xl md:text-4xl font-bold tracking-tight">
              See what the <span className="text-[#D4AF37]">free map</span> can&apos;t show you.
            </h1>
            <p className="text-white/55 mt-2 text-sm md:text-base leading-relaxed px-1">
              An AI analyst that works the globe for you. Live traffic. Advanced search filters.
              VIP intel feeds on the top tier. Pick your level — upgrade anytime.
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
                    MOST POPULAR
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
                      {key === "annual" ? "-71%" : "-42%"}
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
              <p className="text-sm font-semibold tracking-[0.2em] text-[#D4AF37]">{plan === "annual" ? "VIP PRO" : "PRO"}</p>
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
              <p className="text-sm text-[#D4AF37] font-semibold mt-1.5">Just {p.perDay} a day</p>
              {p.trial && (
                <p className="mt-3">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide px-3 py-1.5 rounded-full bg-emerald-400/15 text-emerald-300 border border-emerald-400/30">
                    <Zap className="w-3.5 h-3.5" /> {p.trial} — card not charged yet
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
            {PRO_FEATURES.map((f) => (
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
              <p className="mt-4 mb-2 text-xs font-bold tracking-[0.2em] text-[#D4AF37]">VIP PRO ONLY</p>
              <ul className="space-y-2">
                {VIP_FEATURES.map((f) => (
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
            <CheckoutButton plan={plan} label={p.cta} onCheckout={setSheetPlan} />
          </div>
          <p className="flex items-center justify-center gap-2 text-xs text-white/35 mt-4">
            <Lock className="w-3.5 h-3.5" /> Secured by Stripe · Cancel anytime · 1-click cancellation
          </p>
          <p className="flex items-center justify-center gap-2 text-xs text-white/50 mt-2 text-center">
            <ShieldCheck className="w-3.5 h-3.5 text-[#D4AF37]/80 shrink-0" /> Covered by a 7-day money-back guarantee on your first charge — email us within 7 days of the charge for a full refund, no questions asked.
          </p>
          <p className="mt-3 text-center">
            <HostedCheckoutLink plan={plan} caption={false} />
          </p>
        </motion.div>

        {/* Enterprise */}
        <div className="mt-10 max-w-3xl mx-auto rounded-3xl border border-[#00E5FF]/25 bg-gradient-to-b from-[#00E5FF]/[0.06] to-white/[0.02] backdrop-blur-xl p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <div className="flex-1">
              <p className="text-xs font-bold tracking-[0.25em] text-[#00E5FF] mb-2">ENTERPRISE</p>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl md:text-5xl font-bold tracking-tight">$999</span>
                <span className="text-white/45 text-lg">/year</span>
              </div>
              <p className="text-sm text-white/45 mt-2">Billed annually · cancel anytime</p>
              <ul className="mt-4 space-y-2">
                {ENTERPRISE_FEATURES.map((f) => (
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
              <CheckoutButton plan="enterprise" label="Get Enterprise" onCheckout={setSheetPlan} />
              <p className="flex items-center justify-center gap-2 text-xs text-white/35 mt-3">
                <Lock className="w-3.5 h-3.5" /> Secured by Stripe
              </p>
              <p className="mt-2 text-center">
                <HostedCheckoutLink plan="enterprise" caption={false} />
              </p>
              <p className="flex items-start gap-2 text-xs text-white/50 mt-4">
                <ShieldCheck className="w-3.5 h-3.5 text-[#00E5FF]/80 shrink-0 mt-px" />
                <span>{ENTERPRISE_GUARANTEE_LINE}</span>
              </p>
              <p className="text-xs text-white/40 mt-3">{ENTERPRISE_SUPPORT_LINE}</p>
              <p className="text-xs mt-3">
                <Link href="/enterprise" className="text-[#00E5FF] hover:underline">
                  Already Enterprise? Open your camera feed dashboard →
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
          <h2 className="text-xl md:text-2xl font-bold text-center">Free is generous. <span className="text-[#D4AF37]">VIP Pro is the full picture.</span></h2>
          <div className="mt-5 rounded-3xl border border-white/10 bg-white/[0.02] overflow-hidden max-w-3xl mx-auto">
            <div className="grid grid-cols-[1fr_52px_52px_52px] md:grid-cols-[1fr_90px_90px_90px] text-[11px] font-bold tracking-[0.15em] text-white/40 border-b border-white/10 bg-white/[0.02]">
              <div className="px-5 md:px-7 py-2.5">FEATURE</div>
              <div className="py-2.5 text-center">FREE</div>
              <div className="py-2.5 text-center">PRO</div>
              <div className="py-2.5 text-center text-[#D4AF37]">VIP PRO</div>
            </div>
            {COMPARE_ROWS.map((r) => (
              <div key={r.feature} className="grid grid-cols-[1fr_52px_52px_52px] md:grid-cols-[1fr_90px_90px_90px] border-b border-white/5 last:border-0 text-sm">
                <div className="px-5 md:px-7 py-2 text-white/75">{r.feature}</div>
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
            ))}
          </div>
          <p className="mt-3 text-center text-xs text-white/40 max-w-xl mx-auto">
            The Cinematic Director isn&apos;t a plan feature — it&apos;s free for members of the{" "}
            <a href="/affiliates" className="underline hover:text-white/70">affiliate program</a>{" "}
            on any plan, Free or Pro.
          </p>
          <div className="mt-5 text-center">
            <button
              onClick={() => document.getElementById("pro-card")?.scrollIntoView({ behavior: "smooth", block: "center" })}
              className="px-6 py-2.5 rounded-2xl bg-[#D4AF37] text-black font-bold text-sm hover:brightness-110 transition"
            >
              Choose Pro
            </button>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-10 max-w-2xl mx-auto">
          <h2 className="text-xl md:text-2xl font-bold text-center mb-4">Questions, answered.</h2>
          <div className="space-y-2">
            {FAQS.map((f) => (
              <FaqItem key={f.q} q={f.q} a={f.a} />
            ))}
          </div>
        </div>

        {/* Compare with the alternatives */}
        <div className="mt-12 max-w-3xl mx-auto text-center">
          <h2 className="text-xl md:text-2xl font-bold">Comparing your options?</h2>
          <p className="text-sm text-white/50 mt-2 max-w-xl mx-auto leading-relaxed">
            Most tools in this space do one thing well. These honest, source-checked
            head-to-heads show where WorldEye wins — and where the specialist is
            the better pick.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2.5">
            <Link href="/compare/windy" className="px-4 py-2 rounded-full border border-white/15 text-xs text-white/65 hover:text-white hover:border-[#D4AF37]/50 transition">
              WorldEye vs Windy — forecast models vs live ground cameras
            </Link>
            <Link href="/compare/skylinewebcams" className="px-4 py-2 rounded-full border border-white/15 text-xs text-white/65 hover:text-white hover:border-[#D4AF37]/50 transition">
              WorldEye vs SkylineWebcams — webcam directory vs camera globe
            </Link>
            <Link href="/compare/flightradar24" className="px-4 py-2 rounded-full border border-white/15 text-xs text-white/65 hover:text-white hover:border-[#D4AF37]/50 transition">
              WorldEye vs Flightradar24 — flight specialist vs all-in-one globe
            </Link>
            <Link href="/compare" className="px-4 py-2 rounded-full border border-[#D4AF37]/40 text-xs text-[#D4AF37] hover:bg-[#D4AF37]/10 transition">
              All comparisons →
            </Link>
          </div>
        </div>

        {/* Bottom trust */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs text-white/35">
          <span className="flex items-center gap-1.5"><BadgeCheck className="w-4 h-4 text-[#D4AF37]/70" /> 1-click cancellation</span>
          <span className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-[#D4AF37]/70" /> 7-day money-back guarantee on your first charge</span>
          <span className="flex items-center gap-1.5"><Lock className="w-4 h-4 text-[#D4AF37]/70" /> Stripe-secured checkout</span>
          <span className="flex items-center gap-1.5"><X className="w-4 h-4 text-[#D4AF37]/70" /> No ads, no data selling</span>
        </div>
      </div>
      <StickyMobileCta cta={p.cta} />
      <CheckoutSheet plan={sheetPlan} onClose={closeSheet} />
      <SiteFooter />
    </main>
  );
}
