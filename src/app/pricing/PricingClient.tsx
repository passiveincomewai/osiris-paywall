"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Check, X, Sparkles, Satellite, Search, BrainCircuit,
  ShieldCheck, Zap, Lock, ChevronDown, BadgeCheck, Minus,
} from "lucide-react";

type Plan = "weekly" | "monthly" | "annual";

const PLANS: Record<Plan, { price: string; per: string; perDay: string; note: string; save?: string; cta: string; trial?: string }> = {
  weekly: { price: "$3.99", per: "/week", perDay: "$0.57", note: "1 day free, then billed weekly · cancel anytime", cta: "Start 1-Day Free Trial", trial: "1 day free" },
  monthly: { price: "$9.99", per: "/month", perDay: "$0.33", note: "Billed monthly · cancel anytime", save: "Save 42%", cta: "Get Monthly Access" },
  annual: { price: "$59.99", per: "/year", perDay: "$0.16", note: "3 days free, then billed annually · cancel anytime", save: "Save 71% · Best value", cta: "Start 3-Day Free Trial", trial: "3 days free" },
};

const PRO_FEATURES = [
  { icon: BrainCircuit, title: "OI AI Assistant", desc: "Talk to the map. Forecasts, analysis and recon on your own OpenAI key." },
  { icon: Satellite, title: "Satellite View", desc: "High-resolution satellite imagery alongside the dark intel map." },
  { icon: Search, title: "Global Search & Filters", desc: "Find any place, address or coordinates and fly there instantly." },
  { icon: ShieldCheck, title: "OSINT Toolkit", desc: "Nmap scans, DNS/WHOIS, SSL analysis and threat intel — in-browser." },
  { icon: Zap, title: "Premium Intel Feeds", desc: "Cyber threats, GDELT events, maritime tracking, conflict zones, live news." },
  { icon: Sparkles, title: "Every Future Layer", desc: "New premium feeds land in Pro first, at no extra cost." },
];

const COMPARE_ROWS: { feature: string; free: boolean; pro: boolean }[] = [
  { feature: "Interactive 3D globe", free: true, pro: true },
  { feature: "Live flight tracking", free: true, pro: true },
  { feature: "36,000+ public CCTV cameras", free: true, pro: true },
  { feature: "Satellite & space tracking", free: true, pro: true },
  { feature: "Earthquakes, wildfires & weather", free: true, pro: true },
  { feature: "OI AI assistant (your own API key)", free: false, pro: true },
  { feature: "Satellite imagery view", free: false, pro: true },
  { feature: "Global search & filters", free: false, pro: true },
  { feature: "OSINT toolkit (nmap, DNS, WHOIS, SSL)", free: false, pro: true },
  { feature: "Premium intel feeds (cyber, GDELT, maritime)", free: false, pro: true },
  { feature: "Every future Pro layer", free: false, pro: true },
];

const FAQS = [
  {
    q: "Is the map really free?",
    a: "Yes. The 3D globe, live flights, 36,000+ street cameras, satellites and natural-hazard layers are free forever — no account, no credit card. Pro unlocks the intelligence-grade tools: the AI assistant, satellite view, global search and premium intel feeds.",
  },
  {
    q: "Do I need my own OpenAI key for the AI assistant?",
    a: "Yes. OI runs on your own API key (OpenAI, Anthropic, Google or OpenRouter) so your usage is billed directly by the provider at cost — we never mark it up or see your key. It stays in your browser.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Anytime, in one click. Your Pro access runs until the end of the billing period you've paid for — weekly, monthly or annual — and then simply stops. No retention calls, no dark patterns. On a free trial you're never charged during the trial: cancel before it ends and you pay nothing.",
  },
  {
    q: "What happens if I switch plans?",
    a: "Upgrades apply immediately with proration handled by Stripe. Downgrades take effect at the end of your current period.",
  },
  {
    q: "How is this different from osirisai.live?",
    a: "Same open-source engine, plus the Pro tier: an AI analyst that works the map for you, satellite imagery, global search and premium intel feeds the free site doesn't gate — because there is no gate there. Here, Pro funds the infrastructure.",
  },
];

function CheckoutButton({ plan, label }: { plan: Plan; label: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (res.status === 401) {
        window.location.href = `/api/auth/signin?callbackUrl=${encodeURIComponent("/pricing")}`;
        return;
      }
      if (!res.ok || !data.url) throw new Error(data.error || "Checkout failed");
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout failed");
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={startCheckout}
        disabled={loading}
        className="w-full py-4 rounded-2xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black font-bold text-lg tracking-wide hover:brightness-110 active:scale-[0.99] disabled:opacity-60 transition shadow-[0_8px_32px_rgba(212,175,55,0.35)]"
      >
        {loading ? "Opening secure checkout…" : label}
      </button>
      {error && <p className="text-red-400 text-sm mt-3 text-center">{error}</p>}
    </>
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
        className="w-full flex items-center justify-between gap-4 px-6 py-4 text-left"
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
            <p className="px-6 pb-5 text-sm text-white/60 leading-relaxed">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function PricingPage() {
  const [plan, setPlan] = useState<Plan>("annual");
  const p = PLANS[plan];

  return (
    <main className="docs-root min-h-screen bg-[#050508] text-zinc-100 relative overflow-x-clip">
      {/* Ambient gold glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full opacity-20 blur-[120px] bg-[#D4AF37]" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[300px] rounded-full opacity-10 blur-[100px] bg-[#00E5FF]" />
      </div>

      <div className="relative max-w-5xl mx-auto px-6 py-10 md:py-16">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-12">
          <a href="/" className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition">
            <ArrowLeft className="w-4 h-4" /> Back to the map
          </a>
          <span className="text-[11px] font-mono tracking-[0.3em] text-[#D4AF37]">WORLDEYE PRO</span>
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
              className="h-14 md:h-16 w-auto mx-auto mb-6"
              style={{ filter: "drop-shadow(0 0 18px rgba(0,150,255,0.45))" }}
            />
            <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-[#D4AF37] border border-[#D4AF37]/30 rounded-full px-4 py-1.5 mb-6">
              <Sparkles className="w-3.5 h-3.5" /> UPGRADE TO PRO
            </p>
            <h1 className="text-3xl md:text-6xl font-bold tracking-tight">
              See what the <span className="text-[#D4AF37]">free map</span> can&apos;t show you.
            </h1>
            <p className="text-white/55 mt-4 md:mt-5 text-base md:text-lg leading-relaxed px-1">
              An AI analyst that works the globe for you. Satellite imagery. Global search.
              Premium intel feeds. One subscription, everything unlocked.
            </p>
          </motion.div>

          {/* Billing toggle */}
          <div className="mt-11 md:mt-13 inline-flex p-1.5 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur max-w-full">
            {(["weekly", "monthly", "annual"] as Plan[]).map((key) => (
              <button
                key={key}
                onClick={() => setPlan(key)}
                className={`relative px-4 md:px-7 py-2.5 rounded-xl text-sm font-semibold capitalize transition-all whitespace-nowrap ${
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
                  {key}
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
          className="mt-8 md:mt-10 max-w-lg mx-auto rounded-3xl border border-[#D4AF37]/30 bg-gradient-to-b from-white/[0.06] to-white/[0.02] backdrop-blur-xl p-6 md:p-10 shadow-[0_24px_80px_rgba(212,175,55,0.12)]"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-semibold tracking-[0.2em] text-[#D4AF37]">PRO</p>
              <div className="mt-2 flex items-baseline gap-1">
                <AnimatePresence mode="popLayout">
                  <motion.span
                    key={p.price}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                    className="text-6xl font-bold tracking-tight"
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

          <div className="my-7 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/30 to-transparent" />

          <ul className="space-y-3.5">
            {PRO_FEATURES.map((f) => (
              <li key={f.title} className="flex gap-3">
                <span className="mt-0.5 w-6 h-6 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center shrink-0">
                  <Check className="w-3.5 h-3.5 text-[#D4AF37]" />
                </span>
                <div>
                  <p className="font-medium text-white/90">{f.title}</p>
                  <p className="text-sm text-white/45">{f.desc}</p>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-8">
            <CheckoutButton plan={plan} label={p.cta} />
          </div>
          <p className="flex items-center justify-center gap-2 text-xs text-white/35 mt-4">
            <Lock className="w-3.5 h-3.5" /> Secured by Stripe · Cancel anytime · 1-click cancellation
          </p>
        </motion.div>

        {/* Free vs Pro comparison */}
        <div className="mt-20">
          <h2 className="text-2xl md:text-3xl font-bold text-center">Free is generous. <span className="text-[#D4AF37]">Pro is the full picture.</span></h2>
          <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.02] overflow-hidden max-w-3xl mx-auto">
            <div className="grid grid-cols-[1fr_64px_64px] md:grid-cols-[1fr_110px_110px] text-[11px] font-bold tracking-[0.15em] text-white/40 border-b border-white/10 bg-white/[0.02]">
              <div className="px-5 md:px-7 py-4">FEATURE</div>
              <div className="py-4 text-center">FREE</div>
              <div className="py-4 text-center text-[#D4AF37]">PRO</div>
            </div>
            {COMPARE_ROWS.map((r) => (
              <div key={r.feature} className="grid grid-cols-[1fr_64px_64px] md:grid-cols-[1fr_110px_110px] border-b border-white/5 last:border-0 text-sm">
                <div className="px-5 md:px-7 py-3.5 text-white/75">{r.feature}</div>
                <div className="py-3.5 flex justify-center items-center">
                  {r.free
                    ? <Check className="w-4 h-4 text-white/35" />
                    : <Minus className="w-4 h-4 text-white/15" />}
                </div>
                <div className="py-3.5 flex justify-center items-center bg-[#D4AF37]/[0.06]">
                  <Check className="w-4 h-4 text-[#D4AF37]" strokeWidth={3} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8 text-center">
            <button
              onClick={() => document.getElementById("pro-card")?.scrollIntoView({ behavior: "smooth", block: "center" })}
              className="px-8 py-3.5 rounded-2xl bg-[#D4AF37] text-black font-bold hover:brightness-110 transition"
            >
              Choose Pro
            </button>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-20 max-w-2xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">Questions, answered.</h2>
          <div className="space-y-3">
            {FAQS.map((f) => (
              <FaqItem key={f.q} q={f.q} a={f.a} />
            ))}
          </div>
        </div>

        {/* Bottom trust */}
        <div className="mt-16 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs text-white/35">
          <span className="flex items-center gap-1.5"><BadgeCheck className="w-4 h-4 text-[#D4AF37]/70" /> 1-click cancellation</span>
          <span className="flex items-center gap-1.5"><Lock className="w-4 h-4 text-[#D4AF37]/70" /> Stripe-secured checkout</span>
          <span className="flex items-center gap-1.5"><X className="w-4 h-4 text-[#D4AF37]/70" /> No ads, no data selling</span>
        </div>
      </div>
      <StickyMobileCta cta={p.cta} />
    </main>
  );
}
