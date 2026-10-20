import type { Metadata } from "next";
import Link from "next/link";
import {
  Globe,
  Code2,
  CloudSun,
  Radar,
  Eye,
  Camera,
  Plane,
  Satellite,
} from "lucide-react";
import {
  IntentShell,
  IntentBreadcrumbs,
  ReviewedStamp,
  HeroCtas,
  MidCta,
  webPageLd,
  itemListLd,
} from "@/components/SeoIntentLayout";
import RelatedLinks from "@/components/RelatedLinks";

export const metadata: Metadata = {
  title: "OSIRIS Alternatives in 2026 — Hosted Globe vs Self-Hosted OSINT",
  description:
    "OSIRIS is a free open-source OSINT dashboard you host yourself. Compare the alternatives: WorldEye's hosted live globe (74,229 cameras, no setup), the original project, World Monitor and LiveUAMap.",
  alternates: { canonical: "/alternatives/osiris" },
  openGraph: {
    title: "OSIRIS Alternatives in 2026 — Hosted Globe vs Self-Hosted OSINT | WorldEye",
    description:
      "The original OSIRIS is self-hosted open source. WorldEye is the hosted route to the same live planet: a 3D globe with 74,229 cameras, flights and satellites — free, no install.",
    url: "/alternatives/osiris",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "OSIRIS Alternatives in 2026 — Hosted Globe vs Self-Hosted OSINT | WorldEye",
    description:
      "Compare OSIRIS alternatives: WorldEye's hosted live globe, the original open-source project, World Monitor and LiveUAMap.",
  },
};

const OPTIONS = [
  {
    icon: Globe,
    name: "WorldEye",
    tag: "Best hosted alternative — no install",
    href: "/compare/worldeye-vs-osiris",
    linkLabel: "WorldEye vs OSIRIS, head-to-head",
    body: "The same idea as OSIRIS — one live map carrying cameras, flights, satellites, weather, quakes and fires — as a hosted product instead of a codebase. Open it in a browser: no Docker, no Node, no API keys for the core globe, and a camera network of 74,229 public feeds instead of 17,000+. Free with no signup; Pro ($3.99/week, $9.99/month, $59.99/year) adds the OSINT toolkit and live intel feeds, run on our infrastructure and our keys.",
  },
  {
    icon: Code2,
    name: "OSIRIS (the original)",
    tag: "Best if you want to self-host open source",
    href: "https://github.com/simplifaisoul/osiris",
    linkLabel: "OSIRIS on GitHub",
    body: "simplifaisoul's open-source project (MIT) is the real thing for builders: 15+ data layers over a MapLibre map — aviation, 17,000+ CCTV cameras, USGS seismic, NASA fires, 24/7 news — plus a recon toolkit (port scanning, DNS, WHOIS, SSL), crypto wallet tracing, sanctions search and Telegram OSINT. The trade-offs are the setup (you host it via Docker or Node), the upkeep, and the scope: its maritime and conflict layers are static reference data, not live feeds.",
  },
  {
    icon: Radar,
    name: "World Monitor",
    tag: "Best for geopolitical depth",
    href: "/alternatives/world-monitor",
    linkLabel: "World Monitor alternatives",
    body: "A free hosted dashboard (AGPL-3.0) aimed at analysts: 58 map layers, ACLED and UCDP conflict data, chokepoint tracking, markets and AI country briefs. Pick it when the question is geopolitical depth — briefs, instability scoring, digests — rather than a live camera globe.",
  },
  {
    icon: CloudSun,
    name: "LiveUAMap",
    tag: "Best for conflict and event mapping",
    href: "/alternatives/liveuamap",
    linkLabel: "LiveUAMap alternatives",
    body: "A long-running live map of conflicts and geopolitical events, built around curated event reports rather than raw sensor feeds. Pick it when the question is 'what happened where' in a war zone, not 'what does the world look like right now'.",
  },
];

const TABLE: { label: string; worldeye: string; osiris: string }[] = [
  { label: "How you run it", worldeye: "Hosted website — open the URL", osiris: "Self-hosted (Docker or Node.js); a live demo is linked from the repo" },
  { label: "Cost", worldeye: "Map free, no signup; Pro $3.99/wk, $9.99/mo, $59.99/yr", osiris: "Free open source (MIT); you pay for hosting and your own API keys" },
  { label: "Map", worldeye: "Interactive 3D globe", osiris: "MapLibre map (2D-first, terrain views)" },
  { label: "Public cameras", worldeye: "74,229 live feeds, browsable directory", osiris: "17,000+ cameras (project README)" },
  { label: "Flights / satellites", worldeye: "Live, on the globe", osiris: "Live (OpenSky aviation; N2YO satellites)" },
  { label: "Maritime", worldeye: "Live vessel positions; maritime intel feed on Pro", osiris: "Static reference data (39 ports, 10 chokepoints)" },
  { label: "Conflict data", worldeye: "Live GDELT-powered intel feeds (Pro)", osiris: "Static reference data (13 zones)" },
  { label: "Recon / OSINT tools", worldeye: "Pro toolkit: lookups + AI analyst on our keys", osiris: "Built-in: port scan, DNS, WHOIS, SSL, vuln scanning — your own keys" },
  { label: "Crypto tracing & sanctions search", worldeye: "Not offered", osiris: "Yes — BTC/ETH wallet tracing, OFAC sanctions search" },
  { label: "Source code", worldeye: "Closed (hosted product)", osiris: "Open source (MIT) — fork it, extend it" },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    webPageLd(
      "OSIRIS Alternatives in 2026 — Hosted Globe vs Self-Hosted OSINT",
      "OSIRIS is a free open-source OSINT dashboard you host yourself. Compare the alternatives: WorldEye's hosted live globe, the original project, World Monitor and LiveUAMap.",
      "/alternatives/osiris"
    ),
    itemListLd(
      OPTIONS.map((o) => ({
        name: o.name,
        href: o.href,
        description: `${o.tag}. ${o.body}`,
      }))
    ),
  ],
};

export default function OsirisAlternativesPage() {
  return (
    <IntentShell jsonLd={jsonLd}>
      <IntentBreadcrumbs
        trail={[
          { label: "Alternatives", href: "/compare" },
          { label: "OSIRIS Alternatives" },
        ]}
      />

      {/* Hero */}
      <div className="text-center max-w-2xl mx-auto">
        <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-[#0096FF] border border-[#0096FF]/30 rounded-full px-4 py-1.5 mb-6">
          <Eye className="w-3.5 h-3.5" /> ALTERNATIVES
        </p>
        <h1 className="text-3xl md:text-6xl font-bold tracking-tight">
          OSIRIS alternatives, <span className="text-[#0096FF]">hosted and self-hosted.</span>
        </h1>
        <p className="text-white/55 mt-4 md:mt-5 text-base md:text-lg leading-relaxed px-1">
          Looking for an OSIRIS alternative? The original is a free
          open-source OSINT dashboard you install and host yourself. If you
          want that same live planet — 74,229 cameras, flights, satellites,
          weather — already running in your browser, that&apos;s WorldEye.
          Here&apos;s the honest breakdown of every route.
        </p>
        <ReviewedStamp />
        <HeroCtas />
      </div>

      {/* The honest framing */}
      <section className="mt-20 max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold">Why look for an alternative at all?</h2>
        <div className="mt-6 space-y-4 text-white/60 leading-relaxed">
          <p>
            OSIRIS (Open Source Intelligence &amp; Reconnaissance Integrated
            System) earned its following honestly: a production-grade OSINT
            dashboard that fuses live flight tracking, a 17,000+ camera CCTV
            network, earthquake and fire monitoring, conflict mapping and 24/7
            news into one WebGL interface — free, MIT-licensed, and a genuine
            &ldquo;Palantir alternative&rdquo; for people who can run it.
          </p>
          <p>
            That last phrase is why alternatives exist. OSIRIS is software
            you operate: clone the repo, stand it up with Docker or Node,
            keep it updated, and configure your own keys for its AI features.
            Some of its layers are reference data rather than live feeds —
            its maritime coverage is a static set of 39 ports and 10
            chokepoints, and its conflict layer is 13 static zones. For
            builders, all of that is the point. For everyone else, it&apos;s
            a wall between them and the view.
          </p>
        </div>
      </section>

      {/* Hosted answer */}
      <section className="mt-16 max-w-3xl mx-auto rounded-3xl border border-white/10 bg-white/[0.03] p-8 md:p-10">
        <h2 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
          <Globe className="w-7 h-7 text-[#0096FF] shrink-0" />
          Is there a hosted version of OSIRIS?
        </h2>
        <div className="mt-5 space-y-4 text-white/60 leading-relaxed">
          <p>
            The project links a live demo from its repository, and hosted
            instances circulate — but OSIRIS is built to be run by you, on
            your infrastructure. WorldEye is the hosted product built on the
            same concept: one interactive 3D globe with live flights,
            satellites, weather, earthquakes and wildfires, plus a
            public-camera network of 74,229 feeds. No install, no build
            step, no API keys for the core globe — open the page and
            it&apos;s already live, on phone or desktop.
          </p>
          <p>
            The honest trade: you can&apos;t fork a website. If you want to
            modify the code, run everything on your own machine, or use
            OSIRIS&apos;s crypto-tracing and sanctions-search tools (which
            WorldEye doesn&apos;t offer), the open-source project is the
            right choice and it&apos;s genuinely excellent. WorldEye is for
            watching, not tinkering.
          </p>
        </div>
      </section>

      {/* The options */}
      <section className="mt-20">
        <h2 className="text-2xl md:text-3xl font-bold text-center">
          Four ways to get the view, <span className="text-[#0096FF]">compared</span>
        </h2>
        <p className="text-white/50 text-center mt-4 max-w-2xl mx-auto">
          Each option is the right answer for somebody — here&apos;s who.
        </p>
        <div className="mt-10 grid gap-5 max-w-4xl mx-auto">
          {OPTIONS.map((o, i) => (
            <div
              key={o.name}
              className="rounded-3xl border border-white/10 bg-white/[0.03] p-7 md:p-8 hover:border-[#0096FF]/40 transition"
            >
              <div className="flex items-start gap-5">
                <span className="flex items-center justify-center w-11 h-11 rounded-2xl bg-[#0096FF]/10 border border-[#0096FF]/25 text-sm font-bold text-[#0096FF] shrink-0">
                  {i + 1}
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-xl font-bold">{o.name}</h3>
                    <span className="text-xs font-semibold text-[#0096FF] bg-[#0096FF]/10 border border-[#0096FF]/25 rounded-full px-3 py-1">
                      {o.tag}
                    </span>
                  </div>
                  <p className="text-sm text-white/50 leading-relaxed mt-3">{o.body}</p>
                  <Link
                    href={o.href}
                    className="inline-flex items-center gap-1.5 text-sm text-[#0096FF] hover:underline mt-4 font-medium"
                  >
                    {o.linkLabel}
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <MidCta
        heading="The view, without the server"
        body="WorldEye's globe is live right now — 74,229 cameras, flights, satellites and weather on one screen. Open it and decide in thirty seconds."
      />

      {/* Comparison table */}
      <section className="mt-20 max-w-4xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold">WorldEye vs OSIRIS at a glance</h2>
        <p className="text-sm text-white/45 mt-3">
          Verified against the OSIRIS project&apos;s public documentation,
          October 2026.
        </p>
        <div className="mt-6 overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr className="bg-white/[0.04] text-left">
                <th scope="col" className="p-4 font-semibold text-white/70"> </th>
                <th scope="col" className="p-4 font-semibold text-[#0096FF]">WorldEye</th>
                <th scope="col" className="p-4 font-semibold text-white/70">OSIRIS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {TABLE.map((r) => (
                <tr key={r.label}>
                  <td className="p-4 text-white/80 font-medium">{r.label}</td>
                  <td className="p-4 text-white/60">{r.worldeye}</td>
                  <td className="p-4 text-white/60">{r.osiris}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap gap-3 pt-6">
          {[
            { icon: Globe, label: "The hosted globe", href: "/" },
            { icon: Camera, label: "74,229 cameras", href: "/cameras" },
            { icon: Plane, label: "Live flights", href: "/live-flight-tracker" },
            { icon: Satellite, label: "Satellites", href: "/satellite-tracker" },
          ].map((c) => (
            <Link
              key={c.label}
              href={c.href}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/15 text-sm font-semibold text-white/80 hover:bg-white/5 hover:border-[#0096FF]/40 transition"
            >
              <c.icon className="w-4 h-4 text-[#0096FF]" /> {c.label}
            </Link>
          ))}
        </div>
      </section>

      {/* How to choose */}
      <section className="mt-16 max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold">Which one should you use?</h2>
        <div className="mt-6 grid sm:grid-cols-3 gap-4">
          {[
            {
              q: "Just want to watch the world live?",
              a: "WorldEye. It's already running — free, no signup, no keys, on any device with a browser.",
            },
            {
              q: "Want to build on it or self-host?",
              a: "OSIRIS. MIT-licensed, documented, and made to be run on your own infrastructure with your own layers.",
            },
            {
              q: "Need crypto tracing or sanctions search?",
              a: "OSIRIS — those tools are built in. WorldEye's Pro toolkit covers recon lookups and intel feeds instead.",
            },
          ].map((c) => (
            <div key={c.q} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <p className="font-semibold text-white/90 mb-2">{c.q}</p>
              <p className="text-sm text-white/50 leading-relaxed">{c.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Q&A */}
      <section className="mt-16 max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold">OSIRIS questions, answered</h2>
        <div className="mt-8 space-y-8">
          <div>
            <h3 className="text-lg font-semibold text-white/90">Is OSIRIS free?</h3>
            <p className="text-white/55 leading-relaxed mt-2">
              Yes — the code is free and open source (MIT). Running it
              isn&apos;t costless, though: you provide the hosting (Docker or
              Node on your own machine or server) and your own API keys for
              its AI features. WorldEye&apos;s core globe is free with no
              keys and no hosting; Pro is optional.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white/90">Can I use OSIRIS without installing it?</h3>
            <p className="text-white/55 leading-relaxed mt-2">
              The project is designed to be self-hosted; a live demo is
              linked from its GitHub repository. For a permanently hosted,
              maintained version of the concept, WorldEye is the
              alternative: the same live-globe idea at worldeye.app, in the
              browser, with a larger camera network.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white/90">Which has more cameras?</h3>
            <p className="text-white/55 leading-relaxed mt-2">
              WorldEye: 74,229 live public cameras from 105 countries,
              versus 17,000+ in OSIRIS&apos;s CCTV layer (the figure in its
              README). Both draw on public feeds — transport agencies, city
              networks and public webcams; WorldEye&apos;s directory is
              larger and browsable by country and city.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white/90">Is WorldEye the same as OSIRIS AI?</h3>
            <p className="text-white/55 leading-relaxed mt-2">
              No. &ldquo;OSIRIS AI&rdquo; write-ups refer to the same
              open-source OSIRIS project and its AI assistant. WorldEye is a
              separate, hosted product with its own AI analyst on Pro — the
              two projects are alternatives, not versions of each other.
            </p>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <div className="mt-20 max-w-2xl mx-auto text-center rounded-3xl border border-[#0096FF]/30 bg-gradient-to-b from-[#0096FF]/[0.10] to-transparent p-10">
        <h2 className="text-2xl md:text-3xl font-bold">
          Skip the setup. <span className="text-[#0096FF]">See the planet.</span>
        </h2>
        <p className="text-white/55 mt-3 mb-8">
          One click, no signup, no API keys. The globe is already spinning.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/"
            className="inline-block px-8 py-4 rounded-2xl bg-[#0096FF] text-white font-bold hover:bg-[#0077d6] transition"
          >
            Launch WorldEye Free
          </Link>
          <Link
            href="/features"
            className="inline-block px-8 py-4 rounded-2xl border border-white/15 text-white/85 font-semibold hover:border-[#0096FF]/50 hover:bg-white/5 transition"
          >
            Compare Features
          </Link>
        </div>
        <p className="mt-6 text-sm text-white/40">
          Want the detail? Read the{" "}
          <Link href="/compare/worldeye-vs-osiris" className="text-[#0096FF] hover:underline">
            WorldEye vs OSIRIS head-to-head
          </Link>
        </p>
      </div>

      <RelatedLinks
        links={[
          {
            label: "WorldEye vs OSIRIS",
            desc: "The detailed head-to-head: features, pricing and verdict.",
            href: "/compare/worldeye-vs-osiris",
          },
          {
            label: "God's Eye View alternatives",
            desc: "The other viral globe, compared hosted vs self-hosted.",
            href: "/alternatives/gods-eye-view",
          },
          {
            label: "Best global intelligence dashboards",
            desc: "The full ranked guide to planet-scale dashboards in 2026.",
            href: "/best-global-intelligence-dashboards",
          },
          {
            label: "Pricing",
            desc: "Weekly $3.99, monthly $9.99, annual $59.99 — the core globe stays free.",
            href: "/pricing",
          },
        ]}
      />
    </IntentShell>
  );
}
