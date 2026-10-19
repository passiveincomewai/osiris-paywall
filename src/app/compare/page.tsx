import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import SiteFooter from "@/components/SiteFooter";
import JsonLd from "@/components/JsonLd";
import CompareHub from "./CompareHub";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "WorldEye vs Competitors — Compare the Best OSINT & Global Intelligence Platforms",
  description:
    "Compare WorldEye with Liveuamap, Flightradar24, Dataminr, Google Earth and more. Interactive 3D globe, live flights, cameras and OSINT tools — free with no signup.",
  alternates: { canonical: "/compare" },
  openGraph: {
    title: "WorldEye vs Competitors — Compare Global Intelligence Platforms",
    description:
      "Side-by-side comparisons of WorldEye vs the top OSINT, flight tracking, satellite and conflict-monitoring platforms.",
    type: "website",
    url: "/compare",
  },
  twitter: { card: "summary_large_image" },
};

const CATEGORIES = [
  { id: "osint", label: "OSINT" },
  { id: "satellite-monitoring", label: "Satellite monitoring" },
  { id: "flight-tracking", label: "Flight tracking" },
  { id: "maritime-intel", label: "Maritime intel" },
  { id: "conflict-monitoring", label: "Conflict monitoring" },
  { id: "geopolitical-analytics", label: "Geopolitical analytics" },
];

const DIFFERENTIATORS = [
  { title: "One globe, every layer", body: "Flights, satellites, ships, cameras, weather, quakes and wildfires on a single interactive 3D globe — not scattered across a dozen tabs." },
  { title: "Free with no signup", body: "The full live map costs nothing and needs no account. Most competitors paywall their best views." },
  { title: "~76,000 live cameras", body: "The world's largest free public-camera network, browsable right on the globe." },
  { title: "Pro OSINT toolkit", body: "AI analyst, Nmap/DNS/WHOIS/SSL lookups and premium intel feeds (cyber, GDELT, maritime, conflict, live news)." },
];

export default async function CompareHubPage() {
  const competitors = await db.competitor.findMany({
    where: { published: true },
    orderBy: { name: "asc" },
    select: { slug: true, name: true, website: true, categories: true, tagline: true, lastReviewed: true },
  });

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "WorldEye vs Competitors — Compare Global Intelligence Platforms",
    description: "Side-by-side comparisons of WorldEye with leading OSINT, flight tracking, satellite and conflict-monitoring platforms.",
    url: "https://worldeye.app/compare",
    isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://worldeye.app/" },
      { "@type": "ListItem", position: 2, name: "Compare", item: "https://worldeye.app/compare" },
    ],
  };

  return (
    <div className="min-h-screen" style={{ background: "radial-gradient(1200px 600px at 50% -10%, #0a1a33 0%, #050810 55%, #03040a 100%)" }}>
      <JsonLd data={jsonLd} />
      <JsonLd data={breadcrumbLd} />

      {/* Hero */}
      <header className="max-w-5xl mx-auto px-6 pt-16 md:pt-24 pb-10 text-center">
        <nav aria-label="Breadcrumb" className="text-xs text-white/35 mb-6">
          <Link href="/" className="hover:text-white/70">Home</Link>
          <span className="mx-2">/</span>
          <span className="text-white/60">Compare</span>
        </nav>
        <p className="text-[11px] font-bold tracking-[0.25em] text-[#0096FF] mb-4">COMPARE WORLDEYE</p>
        <h1 className="text-3xl md:text-5xl font-extrabold text-white leading-tight">
          Compare WorldEye With Other<br />Global Intelligence Platforms
        </h1>
        <p className="text-white/55 mt-5 max-w-2xl mx-auto leading-relaxed">
          Honest, research-backed comparisons of WorldEye against the top OSINT tools, flight trackers,
          satellite platforms and conflict monitors. Verified features, real pricing, no hype.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/" className="px-6 py-3 rounded-xl bg-[#0096FF] hover:bg-[#0aa5ff] text-white font-semibold transition">
            Explore WorldEye
          </Link>
          <Link href="/pricing" className="px-6 py-3 rounded-xl border border-white/15 text-white/80 hover:text-white hover:border-white/30 transition">
            Unlock WorldEye PRO
          </Link>
        </div>
      </header>

      {/* Differentiators */}
      <section className="max-w-5xl mx-auto px-6 pb-12">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {DIFFERENTIATORS.map((d) => (
            <div key={d.title} className="rounded-2xl border border-[#0096FF]/20 bg-white/[0.03] p-5">
              <h2 className="text-sm font-bold text-white">{d.title}</h2>
              <p className="text-xs text-white/50 mt-2 leading-relaxed">{d.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Searchable / filterable cards */}
      <main className="max-w-5xl mx-auto px-6 pb-8">
        <CompareHub competitors={competitors} categories={CATEGORIES} />
      </main>

      {/* At-a-glance matrix */}
      <section className="max-w-5xl mx-auto px-6 pb-16">
        <h2 className="text-2xl font-bold text-white mb-2">At-a-glance comparison</h2>
        <p className="text-sm text-white/45 mb-6">WorldEye's free tier against typical competitor offerings. Details on each comparison page.</p>
        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="bg-white/[0.04] text-left">
                <th className="p-4 font-semibold text-white/70">Capability</th>
                <th className="p-4 font-semibold text-[#0096FF]">WorldEye (free)</th>
                <th className="p-4 font-semibold text-white/70">Typical competitor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {[
                ["Interactive 3D globe", "Yes", "Mostly 2D maps"],
                ["Live flight tracking", "Yes", "Yes (specialists)"],
                ["Public camera network", "~76,000 cameras", "Rarely included"],
                ["Satellite tracking", "Yes", "Yes (specialists)"],
                ["Ship tracking", "Yes", "Yes (specialists)"],
                ["Conflict monitoring", "Pro intel feeds", "Yes (specialists)"],
                ["OSINT toolkit", "Pro tier", "Yes (specialists)"],
                ["Price for the map", "Free, no signup", "Often freemium / paid"],
              ].map(([cap, we, them]) => (
                <tr key={cap}>
                  <td className="p-4 text-white/80">{cap}</td>
                  <td className="p-4 text-emerald-300">{we}</td>
                  <td className="p-4 text-white/45">{them}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-white/30 mt-4">Last reviewed: October 2026. Feature details are verified per-page with sources.</p>
      </section>

      {/* Head-to-head spotlights */}
      <section className="max-w-5xl mx-auto px-6 pb-16">
        <h2 className="text-2xl font-bold text-white text-center">Head-to-head spotlights</h2>
        <p className="text-sm text-white/45 text-center mt-3 max-w-xl mx-auto">
          The comparisons readers ask for most — the viral open-source
          globes and analyst dashboards, taken one at a time.
        </p>
        <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            {
              title: "WorldEye vs OSIRIS",
              desc: "Hosted 3D globe vs the self-hosted open-source OSINT platform — features, pricing, verdict.",
              href: "/compare/worldeye-vs-osiris",
            },
            {
              title: "WorldEye vs World Monitor",
              desc: "Camera globe vs the free geopolitical dashboard with chokepoint and markets depth.",
              href: "/compare/world-monitor",
            },
            {
              title: "God's Eye View alternatives",
              desc: "The viral Cesium globe, hosted vs self-hosted — and the ~4,000 vs 76,000+ camera question.",
              href: "/alternatives/gods-eye-view",
            },
            {
              title: "OSIRIS alternatives",
              desc: "Run your own intel stack, or open one that's already running? Every route compared.",
              href: "/alternatives/osiris",
            },
            {
              title: "GodsView AI alternatives",
              desc: "The hosted 'God's Eye View online' map vs the camera globe vs the open-source original.",
              href: "/alternatives/godsview-ai",
            },
            {
              title: "War Monitor alternatives",
              desc: "Conflict dashboards, analyst toolkits and live globes for watching a war in context.",
              href: "/alternatives/war-monitor",
            },
          ].map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className="block rounded-2xl border border-white/10 bg-white/[0.02] p-5 hover:border-[#0096FF]/40 hover:bg-white/[0.04] transition group"
            >
              <h3 className="font-bold text-white group-hover:text-[#7cc4ff] transition">{c.title}</h3>
              <p className="text-sm text-white/45 mt-1.5 leading-relaxed">{c.desc}</p>
              <span className="inline-block mt-3 text-xs font-semibold text-[#0096FF]">Read the comparison →</span>
            </Link>
          ))}
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
