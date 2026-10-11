import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Globe, Eye, ShieldCheck, Users, Code2, ArrowRight } from "lucide-react";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "About WorldEye — Open Planetary Intelligence for Everyone",
  description:
    "WorldEye is a live 3D globe of the planet: free map, flights, satellites, weather, earthquakes, wildfires and ~36,000 public CCTV cameras with no signup. Pro adds the OI AI assistant, satellite view, global search and premium intel feeds.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About WorldEye",
    description:
      "A live 3D globe of the planet. Free forever, no signup — Pro unlocks intelligence-grade tools.",
    type: "website",
    url: "/about",
  },
};

const PRINCIPLES = [
  {
    icon: Globe,
    title: "The map is free forever",
    body: "The live 3D globe — flights, satellites, weather, earthquakes, wildfires and ~36,000 public CCTV cameras — costs nothing and requires no account. That will not change.",
  },
  {
    icon: Eye,
    title: "No signup to look around",
    body: "Open the site and you're in. Accounts exist only for Pro subscribers and affiliates — never as a toll gate in front of the map.",
  },
  {
    icon: ShieldCheck,
    title: "Privacy-respecting",
    body: "We don't sell data or run ads. The OI AI assistant runs on your own API key, which stays in your browser — we never see it.",
  },
  {
    icon: Code2,
    title: "Built on open source",
    body: "WorldEye is built on open-source mapping technology, forked from an MIT-licensed project. We build on the shoulders of open work and keep the map free in the same spirit.",
  },
];

export default function AboutPage() {
  return (
    <main className="docs-root min-h-screen bg-[#050508] text-zinc-100 relative overflow-x-clip">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full opacity-20 blur-[120px] bg-[#D4AF37]" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[300px] rounded-full opacity-10 blur-[100px] bg-[#00E5FF]" />
      </div>

      <div className="relative max-w-5xl mx-auto px-6 py-10 md:py-16">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-12">
          <Link href="/" className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition">
            <ArrowLeft className="w-4 h-4" /> Back to the map
          </Link>
          <span className="text-[11px] font-mono tracking-[0.3em] text-[#D4AF37]">WORLDEYE</span>
        </div>

        {/* Hero */}
        <div className="text-center max-w-2xl mx-auto">
          <img
            src="/worldeye-eye.png"
            alt="WorldEye"
            className="h-14 md:h-16 w-auto mx-auto mb-6"
            style={{ filter: "drop-shadow(0 0 18px rgba(0,150,255,0.45))" }}
          />
          <h1 className="text-3xl md:text-6xl font-bold tracking-tight">
            Open planetary <span className="text-[#D4AF37]">intelligence</span>, for everyone.
          </h1>
          <p className="text-white/55 mt-4 md:mt-5 text-base md:text-lg leading-relaxed px-1">
            WorldEye is a live 3D globe of the planet — aircraft in the sky, satellites
            overhead, storms forming, ground shaking, and tens of thousands of public
            cameras streaming. Free to explore, no account required.
          </p>
        </div>

        {/* What it is */}
        <section className="mt-16 md:mt-20 max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold">What WorldEye is</h2>
          <div className="mt-6 space-y-4 text-white/60 leading-relaxed">
            <p>
              A single interactive globe that fuses live data streams into one view:
              commercial and military flight positions, orbital satellite tracking,
              weather systems, earthquake and wildfire activity, and roughly 36,000
              publicly accessible street cameras around the world.
            </p>
            <p>
              The free tier is the whole map — everything listed above, with no signup
              and no paywall. A <Link href="/pricing" className="text-[#D4AF37] hover:underline">Pro subscription</Link> adds
              intelligence-grade tools on top: the OI AI assistant (which runs on your
              own OpenAI key), high-resolution satellite imagery view, global search,
              an in-browser OSINT toolkit, and premium intel feeds covering cyber
              threats, GDELT events, maritime tracking and live news.
            </p>
            <p>
              Pro exists for one reason: it funds the servers, data feeds and
              development that keep the free map running.
            </p>
          </div>
        </section>

        {/* Principles */}
        <section className="mt-16 md:mt-20">
          <h2 className="text-2xl md:text-3xl font-bold text-center">What we stand by</h2>
          <div className="mt-8 grid sm:grid-cols-2 gap-5">
            {PRINCIPLES.map((p) => (
              <div
                key={p.title}
                className="rounded-3xl border border-white/10 bg-white/[0.02] p-7"
              >
                <p.icon className="w-7 h-7 text-[#D4AF37] mb-4" />
                <h3 className="font-semibold text-white/90 text-lg">{p.title}</h3>
                <p className="text-sm text-white/50 mt-2 leading-relaxed">{p.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Team */}
        <section className="mt-16 md:mt-20 max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
            <Users className="w-7 h-7 text-[#D4AF37]" /> A small independent team
          </h2>
          <p className="mt-6 text-white/60 leading-relaxed">
            WorldEye is built and run by a small independent team — no venture
            funding, no ad network, no data brokerage. Revenue comes from Pro
            subscriptions, and every dollar goes back into keeping the free globe
            fast, live and open. If you use the map, share it, or go Pro, you&apos;re
            directly keeping it alive.
          </p>
        </section>

        {/* CTA */}
        <section className="mt-16 md:mt-20">
          <div className="rounded-3xl border border-[#D4AF37]/30 bg-gradient-to-b from-[#D4AF37]/[0.08] to-transparent p-8 md:p-12 text-center">
            <h2 className="text-2xl md:text-3xl font-bold">See the planet live.</h2>
            <p className="text-white/55 mt-3 max-w-xl mx-auto">
              Open the globe now — free, no signup. Or unlock the intelligence
              toolkit with Pro.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl border border-white/20 text-white font-semibold hover:bg-white/5 transition"
              >
                <Globe className="w-4 h-4" /> Open the live map
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-[#D4AF37] text-black font-bold hover:brightness-110 transition"
              >
                Upgrade to Pro <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>

        <p className="mt-10 text-center text-sm text-white/40">
          Want the details? Read the <Link href="/docs" className="text-[#D4AF37] hover:underline">documentation</Link> or
          browse the <Link href="/blog" className="text-[#D4AF37] hover:underline">blog</Link>.
        </p>
      </div>

      <SiteFooter />
    </main>
  );
}
