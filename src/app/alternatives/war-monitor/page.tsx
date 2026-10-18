import type { Metadata } from "next";
import Link from "next/link";
import {
  Globe,
  Crosshair,
  Map,
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
  title: "War Monitor Alternatives in 2026 — Conflict Maps & Live Globes",
  description:
    "War Monitor (warmonitor.app) is a conflict-first intelligence dashboard. Compare the alternatives: WorldEye's 3D globe with 36,000+ live cameras, War Monitor itself, LiveUAMap and World Monitor.",
  alternates: { canonical: "/alternatives/war-monitor" },
  openGraph: {
    title: "War Monitor Alternatives in 2026 — Conflict Maps & Live Globes | WorldEye",
    description:
      "Conflict dashboards vs live-planet globes: analyst toolkits, camera networks, free tiers and pricing, compared honestly.",
    url: "/alternatives/war-monitor",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "War Monitor Alternatives in 2026 — Conflict Maps & Live Globes | WorldEye",
    description:
      "War Monitor vs WorldEye vs LiveUAMap vs World Monitor: which conflict-watching tool fits you?",
  },
};

const OPTIONS = [
  {
    icon: Globe,
    name: "WorldEye",
    tag: "Best all-planet alternative — no account",
    href: "/",
    linkLabel: "Open the live globe",
    body: "A hosted 3D globe for watching the world — conflict zones included, but not conflict-only: 36,000+ live public cameras across 105 countries, live flights, ships and satellites, weather, earthquakes and wildfires, all free with no account. Pro ($3.99/week, $9.99/month, $59.99/year) adds GDELT-powered conflict and event intel, cyber and maritime feeds and live news. What it doesn't have: War Monitor's analyst toolkit — no timeline replay, no link analysis.",
  },
  {
    icon: Crosshair,
    name: "War Monitor (the original)",
    tag: "Best for dedicated conflict analysis",
    href: "https://warmonitor.app/",
    linkLabel: "War Monitor's site",
    body: "A conflict-first dashboard at warmonitor.app: 25+ layers (military and commercial aircraft, satellites, naval vessels, fires, earthquakes, protests, nuclear facilities), ACLED and GDELT conflict feeds, frontlines and GPS-jamming maps, AI country briefs — and an analyst's toolkit WorldEye doesn't match: timeline replay, link analysis, pattern-of-life tracking and geofence alerts. Its free tier ($0, with signup) is generous; a paid Operator tier sits above it.",
  },
  {
    icon: Map,
    name: "LiveUAMap",
    tag: "Best for curated conflict reporting",
    href: "/alternatives/liveuamap",
    linkLabel: "LiveUAMap alternatives",
    body: "The long-running conflict news map: human-curated, source-linked event reports pinned to the map as they break. Pick it when the question is 'what happened, where, according to whom' — it's a newsroom product, not a sensor globe.",
  },
  {
    icon: Radar,
    name: "World Monitor",
    tag: "Best for geopolitical breadth",
    href: "/alternatives/world-monitor",
    linkLabel: "World Monitor alternatives",
    body: "A free hosted analyst dashboard (AGPL-3.0): 58 layer types, ACLED + UCDP conflict data, chokepoint tracking, markets and AI briefs. Pick it when you want the widest geopolitical data firehose rather than a war-room or a globe.",
  },
];

const TABLE: { label: string; worldeye: string; warmonitor: string }[] = [
  { label: "Focus", worldeye: "The whole live planet — conflict is one layer among many", warmonitor: "Conflict and military activity first" },
  { label: "3D globe", worldeye: "Yes — globe-first", warmonitor: "Map dashboard (2D operations view)" },
  { label: "Public cameras", worldeye: "36,000+ feeds, browsable directory", warmonitor: "Public cameras included on the free tier (no published network size)" },
  { label: "Conflict data", worldeye: "GDELT-powered intel feeds (Pro)", warmonitor: "ACLED + GDELT feeds, frontlines, GPS-jamming layer" },
  { label: "Analyst toolkit", worldeye: "OSINT lookups + AI analyst (Pro)", warmonitor: "Timeline replay, link analysis, pattern-of-life, geofence alerts" },
  { label: "Weather & hazards", worldeye: "Radar, quakes, wildfires — core free layers", warmonitor: "Earthquakes and fires among its 25+ layers" },
  { label: "Account needed", worldeye: "No — the map is open", warmonitor: "Yes — free-tier signup" },
  { label: "Price", worldeye: "Free; Pro $3.99/wk, $9.99/mo, $59.99/yr", warmonitor: "Free tier $0; Operator upgrade (price on their site)" },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    webPageLd(
      "War Monitor Alternatives in 2026 — Conflict Maps & Live Globes",
      "War Monitor (warmonitor.app) is a conflict-first intelligence dashboard. Compare the alternatives: WorldEye's 3D globe with 36,000+ live cameras, War Monitor itself, LiveUAMap and World Monitor.",
      "/alternatives/war-monitor"
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

export default function WarMonitorAlternativesPage() {
  return (
    <IntentShell jsonLd={jsonLd}>
      <IntentBreadcrumbs
        trail={[
          { label: "Alternatives", href: "/compare" },
          { label: "War Monitor Alternatives" },
        ]}
      />

      {/* Hero */}
      <div className="text-center max-w-2xl mx-auto">
        <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-[#0096FF] border border-[#0096FF]/30 rounded-full px-4 py-1.5 mb-6">
          <Eye className="w-3.5 h-3.5" /> ALTERNATIVES
        </p>
        <h1 className="text-3xl md:text-6xl font-bold tracking-tight">
          War Monitor alternatives <span className="text-[#0096FF]">for every kind of watcher.</span>
        </h1>
        <p className="text-white/55 mt-4 md:mt-5 text-base md:text-lg leading-relaxed px-1">
          War Monitor is a conflict-first intelligence dashboard — strong on
          frontlines, feeds and analyst tools. If you want the conflicts in
          context — on a live 3D globe with 36,000+ cameras, flights, ships
          and weather, no account needed — that&apos;s WorldEye. Here&apos;s
          the honest comparison.
        </p>
        <ReviewedStamp />
        <HeroCtas />
      </div>

      {/* What is War Monitor */}
      <section className="mt-20 max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold">What War Monitor does well</h2>
        <div className="mt-6 space-y-4 text-white/60 leading-relaxed">
          <p>
            War Monitor (warmonitor.app) is built for one job: tracking armed
            conflict and military activity as it happens. It layers military
            and commercial aircraft, satellites, naval vessels, fires,
            earthquakes, protests and nuclear facilities over ACLED and
            GDELT conflict feeds, adds frontline mapping and a GPS-jamming
            layer, and wraps it in purpose-built modes (WAR, CYBER,
            MARITIME). Its analyst toolkit is the real differentiator:
            timeline replay to re-watch how a situation developed, link
            analysis, pattern-of-life tracking and convergence alerts inside
            geofences.
          </p>
          <p>
            People look for alternatives for predictable reasons: they want
            the same awareness without an account, without a war-only lens,
            or with the one thing a conflict dashboard treats as a side
            layer — live public cameras, at scale, on a globe you can spin.
            That&apos;s the gap WorldEye fills.
          </p>
        </div>
      </section>

      {/* The options */}
      <section className="mt-16">
        <h2 className="text-2xl md:text-3xl font-bold text-center">
          Four conflict-watching tools, <span className="text-[#0096FF]">compared</span>
        </h2>
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
        heading="See the conflict zones — and everything around them"
        body="WorldEye puts GDELT conflict intel on the same globe as 36,000+ live cameras, flights, ships and weather. Free, no account."
      />

      {/* Comparison table */}
      <section className="mt-20 max-w-4xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold">WorldEye vs War Monitor at a glance</h2>
        <p className="text-sm text-white/45 mt-3">
          Checked against warmonitor.app, October 2026.
        </p>
        <div className="mt-6 overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr className="bg-white/[0.04] text-left">
                <th scope="col" className="p-4 font-semibold text-white/70"> </th>
                <th scope="col" className="p-4 font-semibold text-[#0096FF]">WorldEye</th>
                <th scope="col" className="p-4 font-semibold text-white/70">War Monitor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {TABLE.map((r) => (
                <tr key={r.label}>
                  <td className="p-4 text-white/80 font-medium">{r.label}</td>
                  <td className="p-4 text-white/60">{r.worldeye}</td>
                  <td className="p-4 text-white/60">{r.warmonitor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap gap-3 pt-6">
          {[
            { icon: Globe, label: "The live globe", href: "/" },
            { icon: Camera, label: "36,000+ cameras", href: "/cameras" },
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

      {/* Honest verdict */}
      <section className="mt-16 max-w-3xl mx-auto rounded-3xl border border-white/10 bg-white/[0.03] p-8 md:p-10">
        <h2 className="text-2xl md:text-3xl font-bold">The honest verdict</h2>
        <div className="mt-5 space-y-4 text-white/60 leading-relaxed">
          <p>
            <span className="text-white/85 font-semibold">Choose War Monitor</span>{" "}
            if your work is the conflict itself: frontline movement, military
            asset tracking, and the analyst toolkit (timeline replay, link
            analysis, geofence alerts) built to investigate it. WorldEye
            doesn&apos;t offer those tools and won&apos;t claim to.
          </p>
          <p>
            <span className="text-white/85 font-semibold">Choose WorldEye</span>{" "}
            if you want situational awareness of the whole planet — conflicts
            visible on the same globe as the cameras, flights, ships and
            weather around them — with no account, a browsable 36,000+
            camera directory, and a consumer Pro tier at published prices.
          </p>
          <p>
            Serious watchers often run both: the dashboard for the
            investigation, the globe for the picture.
          </p>
        </div>
      </section>

      {/* Q&A */}
      <section className="mt-16 max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold">War Monitor questions, answered</h2>
        <div className="mt-8 space-y-8">
          <div>
            <h3 className="text-lg font-semibold text-white/90">Is War Monitor free?</h3>
            <p className="text-white/55 leading-relaxed mt-2">
              It has a free tier ($0) that covers the live map, conflict
              zones, public cameras, flights, satellites and earthquakes —
              with an account signup — plus a paid Operator upgrade.
              WorldEye&apos;s map needs no account at all; Pro is $3.99/week,
              $9.99/month or $59.99/year.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white/90">Does WorldEye have timeline replay or link analysis?</h3>
            <p className="text-white/55 leading-relaxed mt-2">
              No — that&apos;s War Monitor&apos;s home turf, and it does it
              well. WorldEye is a live view, not an investigation workbench:
              its Pro tools are OSINT lookups, intel feeds and an AI analyst
              for understanding what you&apos;re seeing now.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white/90">Which is better for following a specific war?</h3>
            <p className="text-white/55 leading-relaxed mt-2">
              For event-by-event depth, War Monitor (frontlines, ACLED feeds,
              replay) or LiveUAMap (curated reporting). For seeing a war in
              its living context — the ports, flights, weather and cameras
              around it — WorldEye&apos;s globe is the better picture.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white/90">Note: there are two &ldquo;War Monitors&rdquo;</h3>
            <p className="text-white/55 leading-relaxed mt-2">
              This page is about warmonitor.app, the browser dashboard. An
              unrelated ad-supported Android app shares the name; if
              that&apos;s the one you meant, the alternatives above still
              cover the same need — live conflict and world monitoring in a
              browser.
            </p>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <div className="mt-20 max-w-2xl mx-auto text-center rounded-3xl border border-[#0096FF]/30 bg-gradient-to-b from-[#0096FF]/[0.10] to-transparent p-10">
        <h2 className="text-2xl md:text-3xl font-bold">
          The whole planet, <span className="text-[#0096FF]">not just the war.</span>
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
      </div>

      <RelatedLinks
        links={[
          {
            label: "LiveUAMap alternatives",
            desc: "The conflict news map, compared with the globe and the dashboards.",
            href: "/alternatives/liveuamap",
          },
          {
            label: "World Monitor alternatives",
            desc: "The geopolitical firehose — and the globe-shaped alternative.",
            href: "/alternatives/world-monitor",
          },
          {
            label: "Best conflict monitoring tools",
            desc: "The ranked 2026 guide to watching conflicts live.",
            href: "/best-conflict-monitoring-tools",
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
