import type { Metadata } from "next";
import {
  ArrowLeft,
  BrainCircuit,
  Camera,
  Check,
  CloudLightning,
  Globe,
  Layers,
  Plane,
  Radio,
  Satellite,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import JsonLd from "@/components/JsonLd";
import RelatedLinks from "@/components/RelatedLinks";

export const metadata: Metadata = {
  title: "Features — Free Live Globe & Pro Tools | WorldEye",
  description:
    "All WorldEye features: a free 3D globe with flights, 36,000+ cameras, satellites and hazards — plus Pro's OI AI assistant, satellite imagery and OSINT toolkit.",
  alternates: { canonical: "/features" },
  openGraph: {
    title: "WorldEye Features — Free Live Globe & Pro Tools",
    description:
      "A free live 3D globe with flights, cameras, satellites and hazards — and Pro intelligence tools: OI AI assistant, satellite view, global search, OSINT toolkit and premium intel feeds.",
    url: "/features",
    type: "website",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "WorldEye Features",
  description:
    "Everything WorldEye can do: a free forever live 3D globe with flight tracking, 36,000+ public cameras, satellites and natural hazards — plus Pro intelligence tools.",
  url: "https://worldeye.app/features",
  isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
};

const FREE_FEATURES = [
  {
    icon: Globe,
    title: "Interactive 3D globe",
    desc: "The full interactive map — no account, no signup. Spin it, zoom it, make it yours.",
  },
  {
    icon: Plane,
    title: "Live flight tracking",
    desc: "Real-time aircraft positions and telemetry, rendered live on the globe.",
  },
  {
    icon: Camera,
    title: "36,000+ public CCTV cameras",
    desc: "Worldwide public street cameras, free for everyone. See streets as they are right now.",
  },
  {
    icon: Satellite,
    title: "Satellite & space tracking",
    desc: "Orbital tracking, passes and space situational awareness overhead.",
  },
  {
    icon: CloudLightning,
    title: "Earthquakes, wildfires & weather",
    desc: "Natural hazards as they happen — quakes, fires and severe weather layers.",
  },
];

const PRO_FEATURES = [
  {
    icon: BrainCircuit,
    title: "OI AI assistant",
    desc: "Talk to the map. Forecasts, analysis and recon powered by your own API key — OpenAI, Anthropic, Google or OpenRouter. Your key stays in your browser.",
  },
  {
    icon: Layers,
    title: "Satellite imagery view",
    desc: "High-resolution satellite imagery alongside the dark intel map.",
  },
  {
    icon: Search,
    title: "Global search & filters",
    desc: "Find any place, address or coordinates and fly there instantly.",
  },
  {
    icon: ShieldCheck,
    title: "OSINT toolkit",
    desc: "Nmap scans, DNS/WHOIS, SSL analysis and threat intel — right in your browser.",
  },
  {
    icon: Radio,
    title: "Premium intel feeds",
    desc: "Cyber threats, GDELT events, maritime tracking, conflict zones and live news.",
  },
  {
    icon: Sparkles,
    title: "Every future layer",
    desc: "New premium feeds land in Pro first, at no extra cost.",
  },
];

export default function FeaturesPage() {
  return (
    <main className="docs-root min-h-screen bg-[#050508] text-zinc-100 relative overflow-x-clip">
      <JsonLd data={jsonLd} />
      {/* Ambient glow */}
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
          <span className="text-[11px] font-mono tracking-[0.3em] text-[#D4AF37]">WORLDEYE</span>
        </div>

        {/* Hero */}
        <div className="text-center max-w-2xl mx-auto">
          <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-[#00E5FF] border border-[#00E5FF]/30 rounded-full px-4 py-1.5 mb-6">
            <Sparkles className="w-3.5 h-3.5" /> FEATURES
          </p>
          <h1 className="text-3xl md:text-6xl font-bold tracking-tight">
            Everything the planet is doing, <span className="text-[#D4AF37]">live</span>.
          </h1>
          <p className="text-white/55 mt-4 md:mt-5 text-base md:text-lg leading-relaxed px-1">
            A free forever live globe with flights, cameras, satellites and hazards —
            and Pro tools for anyone who needs intelligence-grade depth.
          </p>
        </div>

        {/* FREE FOREVER */}
        <section className="mt-16 md:mt-20">
          <div className="flex items-center gap-4 mb-8">
            <h2 className="text-2xl md:text-3xl font-bold">Free, <span className="text-[#00E5FF]">forever</span></h2>
            <span className="text-[10px] font-bold tracking-[0.2em] px-3 py-1.5 rounded-full bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/30">
              NO SIGNUP
            </span>
          </div>
          <p className="text-white/55 max-w-2xl mb-8">
            The core of WorldEye is open to everyone. No account, no credit card —
            just open the map and explore.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FREE_FEATURES.map((f) => (
              <div key={f.title} className="rounded-3xl border border-white/10 bg-white/[0.02] p-7 hover:border-[#00E5FF]/40 transition">
                <span className="w-11 h-11 rounded-2xl bg-[#00E5FF]/10 border border-[#00E5FF]/25 flex items-center justify-center mb-5">
                  <f.icon className="w-5 h-5 text-[#00E5FF]" />
                </span>
                <h3 className="font-semibold text-white/90 mb-2">{f.title}</h3>
                <p className="text-sm text-white/50 leading-relaxed">{f.desc}</p>
              </div>
            ))}
            <a
              href="/"
              className="rounded-3xl border border-[#00E5FF]/30 bg-gradient-to-b from-[#00E5FF]/[0.08] to-transparent p-7 flex flex-col justify-center hover:border-[#00E5FF]/60 transition group"
            >
              <h3 className="font-semibold text-white/90 mb-2">Try it right now</h3>
              <p className="text-sm text-white/50 leading-relaxed mb-4">
                Every free feature is live on the map today.
              </p>
              <span className="text-sm font-semibold text-[#00E5FF] group-hover:underline">
                Open the live map →
              </span>
            </a>
          </div>
        </section>

        {/* PRO */}
        <section className="mt-16 md:mt-20">
          <div className="flex items-center gap-4 mb-8">
            <h2 className="text-2xl md:text-3xl font-bold">Pro <span className="text-[#D4AF37]">intelligence tools</span></h2>
            <span className="text-[10px] font-bold tracking-[0.2em] px-3 py-1.5 rounded-full bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/30">
              FROM $3.99/WK
            </span>
          </div>
          <p className="text-white/55 max-w-2xl mb-8">
            For researchers, analysts and the deeply curious: an AI analyst that works
            the globe for you, satellite imagery, global search and premium intel feeds.
            Weekly $3.99 · Monthly $9.99 · Annual $59.99.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {PRO_FEATURES.map((f) => (
              <div key={f.title} className="rounded-3xl border border-[#D4AF37]/25 bg-gradient-to-b from-[#D4AF37]/[0.06] to-transparent p-7 hover:border-[#D4AF37]/60 transition">
                <span className="w-11 h-11 rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/25 flex items-center justify-center mb-5">
                  <f.icon className="w-5 h-5 text-[#D4AF37]" />
                </span>
                <h3 className="font-semibold text-white/90 mb-2">{f.title}</h3>
                <p className="text-sm text-white/50 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="/pricing"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black font-bold text-lg tracking-wide hover:brightness-110 transition shadow-[0_8px_32px_rgba(212,175,55,0.35)] text-center"
            >
              See Pro pricing
            </a>
            <a
              href="/"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl border border-white/15 text-white/70 font-semibold hover:bg-white/5 transition text-center"
            >
              Explore free first
            </a>
          </div>
          <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-white/40">
            <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-[#D4AF37]" /> Cancel anytime</li>
            <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-[#D4AF37]" /> Free trials on weekly &amp; annual</li>
            <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-[#D4AF37]" /> Stripe-secured checkout</li>
          </ul>
        </section>

        <RelatedLinks
          links={[
            {
              label: "Use cases",
              desc: "Who uses these features — researchers, travelers, storm watchers and more.",
              href: "/use-cases",
            },
            {
              label: "Live cameras",
              desc: "36,000+ public cameras on the globe, free for everyone.",
              href: "/cameras",
            },
            {
              label: "Live flight tracker",
              desc: "Real-time aircraft positions, altitude, speed and routes — free, no signup.",
              href: "/live-flight-tracker",
            },
            {
              label: "FAQ",
              desc: "Is the map free? What does Pro include? Answers to the common questions.",
              href: "/faq",
            },
          ]}
        />
      </div>

      <SiteFooter />
    </main>
  );
}
