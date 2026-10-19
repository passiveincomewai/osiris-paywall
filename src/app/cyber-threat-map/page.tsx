import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  Shield,
  Server,
  MapPin,
  Globe,
  Bug,
  Radio,
  Clock,
  Eye,
  Search,
  GraduationCap,
  ChevronDown,
} from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import JsonLd from "@/components/JsonLd";
import RelatedLinks from "@/components/RelatedLinks";

export const metadata: Metadata = {
  title: "Cyber Threat Map — Botnet C2 Servers by Hosting Country",
  description:
    "A cyber threat map that does not fake attack arcs: known botnet C2 servers from abuse.ch Feodo Tracker, plotted once each at their hosting country. Part of WorldEye Pro.",
  alternates: { canonical: "/cyber-threat-map" },
  openGraph: {
    title: "Cyber Threat Map | WorldEye",
    description:
      "Known botnet command-and-control servers, plotted at their hosting country — no invented origins, targets or live attacks. Part of WorldEye Pro.",
    url: "/cyber-threat-map",
    type: "website",
  },
};

const DATA_POINTS = [
  {
    icon: Server,
    title: "One marker per C2 server",
    desc: "Every marker is one known botnet command-and-control server from the source blocklist — one indicator per server, never cloned or multiplied to make the map look busier.",
  },
  {
    icon: MapPin,
    title: "Hosting country",
    desc: "Each marker sits in the country where the server is hosted, as reported in the source record. Hosting is a fact about infrastructure — it is not an attribution of who operates the botnet.",
  },
  {
    icon: Globe,
    title: "Country-level precision",
    desc: "Placement is the hosting country's centroid, stated openly. The source records a country, not a street address, so the map shows country-level precision and nothing finer.",
  },
  {
    icon: Bug,
    title: "Malware family",
    desc: "Where the source record names the botnet or malware family associated with the server, the marker carries it — so you can see which known families the listed infrastructure belongs to.",
  },
  {
    icon: Radio,
    title: "Online or offline status",
    desc: "Feodo Tracker reports whether each listed server still answers. An offline C2 is a historical listing, not an active threat event — and the map keeps that distinction visible.",
  },
  {
    icon: Clock,
    title: "First seen & last online",
    desc: "Each indicator carries when the provider first listed the server and when it last answered, alongside the hosting network from the record. Dates from the source — nothing inferred.",
  },
];

const USE_CASES = [
  {
    icon: Eye,
    title: "Security awareness",
    desc: "See where known botnet infrastructure is actually hosted, and how concentrated it is in a handful of hosting countries. A grounded picture beats a scary animation for building real awareness of how botnets work.",
  },
  {
    icon: Search,
    title: "Research",
    desc: "Study the geography of known C2 hosting over time: which countries and hosting networks recur in the blocklist, which malware families they are associated with, and how listings age from first seen to last online.",
  },
  {
    icon: GraduationCap,
    title: "Education",
    desc: "Teach command-and-control without the fiction. The layer gives students a real, sourced dataset — known servers, real listing dates, honest precision — and a clear example of what threat data does and does not say.",
  },
];

const FAQS = [
  {
    q: "Is the cyber threat map free?",
    a: "The WorldEye globe itself is free — no account, no signup — including flights, satellites, weather, earthquakes, wildfires and 76,000+ public cameras. The Botnet C2 Servers layer is part of WorldEye Pro, the paid intel toolkit: $3.99/week, $9.99/month or $59.99/year.",
  },
  {
    q: "Where does the data come from?",
    a: "abuse.ch Feodo Tracker, a public blocklist of known botnet command-and-control servers. WorldEye plots one indicator per listed server, carrying only the fields the record actually contains: hosting country, malware family where named, status, hosting network, and first-seen and last-online dates.",
  },
  {
    q: "Does this map show live attacks?",
    a: "No. It shows the hosting locations of known C2 servers — infrastructure that botnets use to receive instructions. It does not show attacks happening, attack origins, or attack targets, because the source data does not contain them and WorldEye does not invent them.",
  },
  {
    q: "How precise are the locations?",
    a: "Country-level only. Each marker is placed at the centroid of the server's hosting country — an openly stated approximation of the one location field the record contains. It is never presented as the server's exact position.",
  },
  {
    q: "What is a botnet C2 server?",
    a: "C2 stands for command-and-control: a server that compromised machines — the botnet — check in with to receive instructions and send results. Taking down or blocking known C2 servers is one of the main ways defenders disrupt botnets, which is why trackers like Feodo publish them.",
  },
  {
    q: "Why are there no attack arcs like on other threat maps?",
    a: "Because arcs from an attacker origin to a target would be fiction here. The source records where a C2 server is hosted — it does not record who operates it, who it attacked, or when any attack happened. A threat map that does not fake attack arcs is this page's whole point: every marker traces to a real record.",
  },
  {
    q: "What does online versus offline mean?",
    a: "Feodo Tracker reports whether a listed server still answers. Online means the C2 was reachable when last checked; offline means it has stopped answering — it may have been taken down, abandoned or moved. An offline listing is history, not a live event.",
  },
  {
    q: "Does a marker in a country mean that country is attacking?",
    a: "No. A marker means a known C2 server is hosted there — usually on ordinary commercial hosting infrastructure that anyone in the world can rent. Hosting location is not attacker attribution, and the map never presents it as such.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      name: "WorldEye Cyber Threat Map",
      description:
        "Known botnet C2 servers from abuse.ch Feodo Tracker, plotted once each at their hosting country with country-level precision. No attack origins, targets or live attacks are shown.",
      url: "https://worldeye.app/cyber-threat-map",
      isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
    },
    {
      "@type": "FAQPage",
      url: "https://worldeye.app/cyber-threat-map",
      mainEntity: FAQS.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ],
};

export default function CyberThreatMapPage() {
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
            <Shield className="w-3.5 h-5" /> BOTNET C2 INDICATORS
          </p>
          <h1 className="text-3xl md:text-6xl font-bold tracking-tight">
            A threat map that <span className="text-[#00E5FF]">doesn&apos;t fake it.</span>
          </h1>
          <p className="text-white/55 mt-4 md:mt-5 text-base md:text-lg leading-relaxed px-1">
            WorldEye&apos;s Botnet C2 Servers layer plots known botnet
            command-and-control servers from abuse.ch Feodo Tracker — one
            marker per server, placed at its hosting country. No attack
            origins, no targets, no animated arcs.
          </p>
          <div className="mt-8">
            <Link
              href="/pricing"
              className="inline-block px-8 py-4 rounded-2xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black font-bold text-lg tracking-wide hover:brightness-110 transition shadow-[0_8px_32px_rgba(212,175,55,0.35)]"
            >
              Unlock the C2 layer with Pro
            </Link>
          </div>
        </div>

        {/* What the data is */}
        <div className="mt-20">
          <h2 className="text-2xl md:text-3xl font-bold text-center">
            What the data <span className="text-[#D4AF37]">actually is</span>
          </h2>
          <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {DATA_POINTS.map((d) => (
              <div
                key={d.title}
                className="rounded-3xl border border-white/10 bg-white/[0.02] p-6"
              >
                <d.icon className="w-6 h-6 text-[#00E5FF] mb-4" />
                <p className="font-semibold text-white/90 mb-2">{d.title}</p>
                <p className="text-sm text-white/45 leading-relaxed">{d.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* How it works */}
        <div className="mt-20 max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
            How the layer <span className="text-[#D4AF37]">works</span>
          </h2>
          <div className="space-y-4 text-white/60 leading-relaxed">
            <p>
              abuse.ch Feodo Tracker publishes a botnet C2 blocklist: one row
              per known command-and-control server. A row says where a server
              is hosted, which malware family it is associated with where
              known, whether it still answers, which hosting network it sits
              on, and when it was first listed and last seen online.
            </p>
            <p>
              WorldEye&apos;s Pro layer, Botnet C2 Servers, takes that list
              and plots it on the same 3D globe as everything else: one
              indicator per server, deduplicated, carrying only the fields
              the record actually contains. Placement is the centroid of the
              hosting country — an approximation of a field that is in the
              record, labeled as country-level precision wherever it appears.
            </p>
            <p>
              The C2 layer is part of the{" "}
              <Link href="/pricing" className="text-[#D4AF37] hover:underline">
                Pro intel toolkit
              </Link>{" "}
              ($3.99/week, $9.99/month, $59.99/year). The globe itself —
              including live flights, satellites, weather, earthquakes,
              wildfires and 76,000+ public cameras — is free for everyone
              with no account.
            </p>
          </div>
        </div>

        {/* What it isn't */}
        <div className="mt-20 max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
            What this map <span className="text-[#D4AF37]">does not show</span>
          </h2>
          <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 md:p-8 space-y-5 text-white/60 leading-relaxed text-sm md:text-base">
            <div>
              <h3 className="font-semibold text-white/90 mb-1.5">Not attack origins</h3>
              <p>
                A C2 server&apos;s hosting country is not where an attacker
                is. Botnet operators rent ordinary hosting anywhere in the
                world, so the map never attributes a server to a person, a
                group or a government — the source record does not, either.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-white/90 mb-1.5">Not attack targets</h3>
              <p>
                The blocklist records the control server, not the machines it
                controlled or anything they were pointed at. There are no
                victim locations in this data, so none are drawn.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-white/90 mb-1.5">Not live attacks</h3>
              <p>
                A listing is not an event. Some listed servers are offline —
                taken down, abandoned or moved — and even an online C2 is
                standing infrastructure, not an attack in progress. Nothing on
                this layer animates an attack, because nothing in the source
                describes one.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-white/90 mb-1.5">No arcs, no inflated counts</h3>
              <p>
                Many threat maps draw dramatic arcs between invented origins
                and targets, and multiply indicators until the screen looks
                busy. This layer does neither: one marker per known server,
                at country-level precision, with the count equal to the
                number of records — nothing cloned, nothing decorated.
              </p>
            </div>
          </div>
        </div>

        {/* Use cases */}
        <div className="mt-20">
          <h2 className="text-2xl md:text-3xl font-bold text-center">
            What it <span className="text-[#D4AF37]">is for</span>
          </h2>
          <div className="mt-8 grid md:grid-cols-3 gap-5">
            {USE_CASES.map((u) => (
              <div
                key={u.title}
                className="rounded-3xl border border-white/10 bg-white/[0.02] p-8"
              >
                <u.icon className="w-6 h-6 text-[#D4AF37] mb-4" />
                <p className="font-semibold text-white/90 text-lg mb-2">{u.title}</p>
                <p className="text-sm text-white/45 leading-relaxed">{u.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-20 max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
            Cyber threat map <span className="text-[#D4AF37]">FAQ</span>
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
            See the infrastructure, <span className="text-[#D4AF37]">not the fiction</span>
          </h2>
          <p className="text-white/55 mt-3 mb-8">
            The Botnet C2 Servers layer — known servers, hosting countries,
            honest precision — is part of WorldEye Pro.
          </p>
          <Link
            href="/pricing"
            className="inline-block px-8 py-4 rounded-2xl bg-[#D4AF37] text-black font-bold hover:brightness-110 transition"
          >
            See Pro plans
          </Link>
          <p className="mt-6 text-sm text-white/40">
            Just want to explore?{" "}
            <Link href="/" className="text-[#D4AF37] hover:underline">
              Open the free globe
            </Link>
          </p>
        </div>

        <RelatedLinks
          links={[
            {
              label: "Features",
              desc: "Everything the globe can do — free forever layers and Pro intelligence tools.",
              href: "/features",
            },
            {
              label: "Pricing",
              desc: "Weekly, monthly and annual Pro plans — the Botnet C2 Servers layer is included.",
              href: "/pricing",
            },
            {
              label: "Best OSINT tools",
              desc: "How WorldEye compares with the wider open-source intelligence toolkit.",
              href: "/best-osint-tools",
            },
            {
              label: "Open the map",
              desc: "The free live 3D globe — flights, weather, cameras and more, no signup.",
              href: "/",
            },
          ]}
        />
      </div>

      <SiteFooter />
    </main>
  );
}
