import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  Radio,
  Ship,
  Anchor,
  Eye,
  ShieldAlert,
  ChevronDown,
} from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import JsonLd from "@/components/JsonLd";
import RelatedLinks from "@/components/RelatedLinks";

export const metadata: Metadata = {
  title: "What Is AIS? How Ship Tracking Works | WorldEye",
  description:
    "AIS explained: how ships broadcast identity, position and course by radio, who is required to carry it, and its limits. Read, then watch vessels live.",
  alternates: { canonical: "/what-is-ais" },
  openGraph: {
    title: "What Is AIS? How Ship Tracking Works | WorldEye",
    description:
      "How every ship tracker actually works — AIS transponders, receiver networks and why the data is open.",
    url: "/what-is-ais",
    type: "website",
  },
};

const HOW_IT_WORKS = [
  {
    icon: Ship,
    title: "The ship reports itself",
    desc: "An AIS transponder on the vessel packages its identity, position, speed, heading and status — updated continuously while underway.",
  },
  {
    icon: Radio,
    title: "It broadcasts over VHF",
    desc: "The data goes out on maritime VHF radio frequencies, unencrypted, every few seconds for fast vessels and every few minutes for those at anchor.",
  },
  {
    icon: Eye,
    title: "Receivers and satellites listen",
    desc: "Shore-based receivers near coasts and satellite payloads over open ocean pick up the broadcasts and feed them into global aggregation networks.",
  },
  {
    icon: Anchor,
    title: "The map draws the oceans",
    desc: "Those reports become live vessel markers: position, speed, heading, type and destination, plotted alongside ports and chokepoints.",
  },
];

const LIMITATIONS = [
  {
    title: "Not every vessel carries it",
    desc: "International rules require AIS on large commercial ships and passenger vessels, but small private boats, fishing craft in some regions and many older vessels operate without it — so the map shows the professional fleet, not every hull on the water.",
  },
  {
    title: "Coverage varies by region",
    desc: "Near busy coastlines with dense receiver networks, positions are fresh and frequent. In remote ocean areas the picture depends on satellite reception and updates more slowly.",
  },
  {
    title: "Transponders can go dark",
    desc: "AIS can be switched off, malfunction, or — in cases that make the news — be deliberately disabled to hide a vessel's movements. A quiet area of the map isn't necessarily an empty one.",
  },
  {
    title: "It's a signal, not proof",
    desc: "Because broadcasts are unencrypted and self-reported, identity data can be mistyped or spoofed. For navigation and awareness it's excellent; for investigations, corroborate it.",
  },
];

const FAQS = [
  {
    q: "What does AIS stand for?",
    a: "Automatic Identification System. It was originally designed as a collision-avoidance tool: ships broadcast who they are, where they are and where they're going so nearby vessels and port authorities can see the traffic picture. The public ship-tracking industry is a side effect of that openness.",
  },
  {
    q: "Which ships are required to carry AIS?",
    a: "Under international maritime rules, large commercial vessels — generally ships of 300 gross tonnage and above on international voyages, plus all passenger ships — must carry AIS transponders. That's why the global map is dominated by container ships, tankers, bulk carriers and ferries.",
  },
  {
    q: "What information does AIS broadcast?",
    a: "Static data (the ship's identity number, name, dimensions and vessel type), dynamic data (position, speed over ground, course, heading and navigation status), and voyage data the crew enters manually (destination, estimated arrival, cargo type).",
  },
  {
    q: "Can AIS track small boats?",
    a: "Usually not. Small private and recreational boats aren't generally required to carry AIS, though some do voluntarily (a simpler variant called Class B). If a boat isn't broadcasting, it won't appear on any AIS-based tracker.",
  },
  {
    q: "Is AIS data delayed or filtered?",
    a: "Public feeds can carry a small delay, and some providers withhold or anonymize certain vessel types at the request of authorities or operators. What reaches a public map is a real but curated view of global traffic.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      name: "What Is AIS? How Ship Tracking Works",
      description:
        "AIS explained: how ships broadcast identity, position and course by radio, who is required to carry it, and its limits.",
      url: "https://worldeye.app/what-is-ais",
      isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
    },
    {
      "@type": "FAQPage",
      url: "https://worldeye.app/what-is-ais",
      mainEntity: FAQS.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ],
};

export default function WhatIsAisPage() {
  return (
    <main className="docs-root min-h-screen bg-[#050508] text-zinc-100 relative overflow-x-clip">
      <JsonLd data={jsonLd} />
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full opacity-15 blur-[120px] bg-[#00E5FF]" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[300px] rounded-full opacity-10 blur-[100px] bg-[#D4AF37]" />
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
          <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-[#00E5FF] border border-[#00E5FF]/30 rounded-full px-4 py-1.5 mb-6">
            <Radio className="w-3.5 h-3.5" /> EXPLAINER
          </p>
          <h1 className="text-3xl md:text-6xl font-bold tracking-tight">
            What is <span className="text-[#00E5FF]">AIS?</span>
          </h1>
          <p className="text-white/55 mt-4 md:mt-5 text-base md:text-lg leading-relaxed px-1">
            The open radio system behind every ship tracker on Earth. How
            vessels broadcast their identity and course to the world — and why
            the data was public from day one.
          </p>
          <div className="mt-8">
            <Link
              href="/ship-tracker"
              className="inline-block px-8 py-4 rounded-2xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black font-bold text-lg tracking-wide hover:brightness-110 transition shadow-[0_8px_32px_rgba(212,175,55,0.35)]"
            >
              See live vessels on the globe
            </Link>
          </div>
        </div>

        {/* What it is */}
        <div className="mt-20 max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
            Built for safety, <span className="text-[#D4AF37]">open by design</span>
          </h2>
          <div className="space-y-4 text-white/60 leading-relaxed">
            <p>
              AIS — Automatic Identification System — is the maritime
              world&apos;s answer to a simple problem: in fog, at night, or in
              a crowded strait, how does every ship know where every other ship
              is? The answer: make every ship say so, constantly, over the
              radio.
            </p>
            <p>
              A transponder on each equipped vessel broadcasts its identity,
              position, speed, heading and status on maritime VHF — openly and
              unencrypted, because encrypting it would defeat the purpose.
              Nearby ships, port authorities and coastal stations all listen,
              and collisions have fallen as a result.
            </p>
            <p>
              But once the signal is in the air, anyone can hear it. Networks
              of shore receivers and satellites now collect those broadcasts
              globally, and ship-tracking maps are what happens when you
              visualize the aggregate. It&apos;s the same architecture as
              ADS-B in aviation — a safety broadcast that became a public
              window onto global movement.
            </p>
          </div>
        </div>

        {/* How it works */}
        <div className="mt-20">
          <h2 className="text-2xl md:text-3xl font-bold text-center">
            From transponder <span className="text-[#D4AF37]">to your screen</span>
          </h2>
          <div className="mt-8 grid sm:grid-cols-2 gap-5 max-w-4xl mx-auto">
            {HOW_IT_WORKS.map((s, i) => (
              <div
                key={s.title}
                className="rounded-3xl border border-white/10 bg-white/[0.02] p-7"
              >
                <div className="flex items-center gap-4 mb-4">
                  <span className="w-8 h-8 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-[#D4AF37] font-bold text-sm flex items-center justify-center shrink-0">
                    {i + 1}
                  </span>
                  <s.icon className="w-6 h-6 text-[#00E5FF]" />
                </div>
                <p className="font-semibold text-white/90 text-lg mb-2">{s.title}</p>
                <p className="text-sm text-white/45 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* What's in a broadcast */}
        <div className="mt-20 max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
            What a broadcast <span className="text-[#D4AF37]">carries</span>
          </h2>
          <div className="space-y-4 text-white/60 leading-relaxed">
            <p>
              <strong className="text-white/90">Who it is:</strong> the
              vessel&apos;s unique identity number, name, dimensions and type —
              container ship, tanker, ferry, tug, fishing boat and more.
            </p>
            <p>
              <strong className="text-white/90">What it&apos;s doing:</strong>{" "}
              GPS position, speed over ground, course, heading and navigation
              status (underway, at anchor, moored, fishing).
            </p>
            <p>
              <strong className="text-white/90">Where it&apos;s going:</strong>{" "}
              destination, estimated time of arrival and cargo information —
              entered by the crew, and only as accurate as the last person who
              typed it in.
            </p>
          </div>
        </div>

        {/* Limitations */}
        <div className="mt-20 max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8 flex items-center justify-center gap-3">
            <ShieldAlert className="w-7 h-7 text-[#D4AF37]" />
            The <span className="text-[#D4AF37]">limitations</span>
          </h2>
          <div className="space-y-4">
            {LIMITATIONS.map((l) => (
              <div
                key={l.title}
                className="rounded-2xl border border-white/10 bg-white/[0.02] p-6"
              >
                <p className="font-semibold text-white/90 mb-2">{l.title}</p>
                <p className="text-sm text-white/50 leading-relaxed">{l.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-20 max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
            AIS <span className="text-[#D4AF37]">FAQ</span>
          </h2>
          <div className="space-y-3">
            {FAQS.map((f) => (
              <details
                key={f.q}
                className="border border-white/10 rounded-2xl bg-white/[0.02] overflow-hidden group"
              >
                <summary className="flex items-center justify-between gap-4 px-6 py-4 cursor-pointer list-none">
                  <span className="font-medium text-white/90">{f.q}</span>
                  <ChevronDown className="w-5 h-5 text-[#D4AF37] shrink-0 transition-transform group-open:rotate-180" />
                </summary>
                <p className="px-6 pb-5 text-sm text-white/60 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </div>

        {/* Closing CTA */}
        <div className="mt-20 max-w-2xl mx-auto text-center rounded-3xl border border-[#D4AF37]/30 bg-gradient-to-b from-[#D4AF37]/[0.08] to-transparent p-10">
          <h2 className="text-2xl md:text-3xl font-bold">
            Now go <span className="text-[#D4AF37]">watch the seas</span>
          </h2>
          <p className="text-white/55 mt-3 mb-8">
            Vessel traffic, ports and chokepoints on one globe — the maritime
            feed is part of WorldEye Pro.
          </p>
          <Link
            href="/ship-tracker"
            className="inline-block px-8 py-4 rounded-2xl bg-[#D4AF37] text-black font-bold hover:brightness-110 transition"
          >
            Explore the ship tracker
          </Link>
          <p className="mt-6 text-sm text-white/40">
            Curious about the aviation equivalent?{" "}
            <Link href="/what-is-ads-b" className="text-[#D4AF37] hover:underline">
              Read what ADS-B is
            </Link>
          </p>
        </div>

        <RelatedLinks
          links={[
            {
              label: "Ship tracker",
              desc: "Live vessel traffic on a 3D globe, powered by the broadcasts this page explains.",
              href: "/ship-tracker",
            },
            {
              label: "What is ADS-B?",
              desc: "The aviation twin of AIS — how aircraft broadcast their position in the sky.",
              href: "/what-is-ads-b",
            },
            {
              label: "Satellite tracker",
              desc: "Thousands of satellites overhead — the ISS, Starlink and more, live.",
              href: "/satellite-tracker",
            },
            {
              label: "Pricing",
              desc: "Weekly, monthly and annual Pro plans — the maritime feed is included.",
              href: "/pricing",
            },
          ]}
        />
      </div>

      <SiteFooter />
    </main>
  );
}
