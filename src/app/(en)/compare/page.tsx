import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { planTierOf } from "@/lib/plan-tier";
import { premiumFeatureNames } from "@/lib/billing/premium-features";
import ProUpgradeEmbed from "@/components/ProUpgradeEmbed";
import { db } from "@/lib/db";
import SiteFooter from "@/components/SiteFooter";
import JsonLd from "@/components/JsonLd";
import CompareHub from "./CompareHub";
import { listBundledCompetitors } from "@/lib/competitors-data";
import { listComparePairs } from "@/lib/compare-pairs-data";

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
  { id: "webcam-network", label: "Webcam network" },
  { id: "weather", label: "Weather" },
  { id: "satellite-monitoring", label: "Satellite monitoring" },
  { id: "flight-tracking", label: "Flight tracking" },
  { id: "maritime-intel", label: "Maritime intel" },
  { id: "conflict-monitoring", label: "Conflict monitoring" },
  { id: "geopolitical-analytics", label: "Geopolitical analytics" },
];

/* The ranked category guides that group these head-to-heads — the
   hub links them so the roundup family is reachable from the hub,
   not only from each other's footers. */
const GUIDES = [
  { title: "Best live webcam sites", desc: "The webcam networks ranked — directories, scenic specialists and the live globe.", href: "/best-live-webcam-sites" },
  { title: "Best interactive 3D globes", desc: "Live globes, imagery globes and science globes, compared on what each actually shows.", href: "/best-interactive-3d-globes" },
  { title: "Best global intelligence dashboards", desc: "Planet-scale awareness platforms — visual globes, alerting engines and open data.", href: "/best-global-intelligence-dashboards" },
  { title: "Best geopolitical monitoring tools", desc: "Tools for tracking a fast-moving world, ranked by best fit.", href: "/best-geopolitical-monitoring-tools" },
  { title: "Best conflict monitoring tools", desc: "Conflict dashboards and event maps, compared honestly.", href: "/best-conflict-monitoring-tools" },
  { title: "Best OSINT tools", desc: "The ranked OSINT toolkit guide — free and paid, with honest limits.", href: "/best-osint-tools" },
  { title: "Free OSINT tools", desc: "Nine genuinely free OSINT tools that actually work — no trials, no credit cards.", href: "/free-osint-tools" },
  { title: "Best flight tracking tools", desc: "Flight trackers compared — coverage, blocked aircraft and pricing.", href: "/best-flight-tracking-tools" },
  { title: "Best ship tracking tools", desc: "AIS vessel trackers and maritime platforms, side by side.", href: "/best-ship-tracking-tools" },
  { title: "Best satellite tracking tools", desc: "Satellite and ISS trackers compared — live positions, passes and imagery.", href: "/best-satellite-tracking-tools" },
];

const DIFFERENTIATORS = [
  { title: "One globe, every layer", body: "Flights, satellites, ships, cameras, live transit, weather, quakes and wildfires on a single interactive 3D globe — not scattered across a dozen tabs." },
  { title: "Free with no signup", body: "The full live map costs nothing and needs no account. Most competitors paywall their best views." },
  { title: "74,229 live cameras", body: "The world's largest free public-camera network, browsable right on the globe." },
  { title: "Pro OSINT toolkit", body: "AI analyst and Nmap/DNS/WHOIS/SSL lookups on the paid tiers; Ultra adds the premium intel feeds (cyber, GDELT, maritime, conflict, live news)." },
];

export default async function CompareHubPage() {
  // The closing upgrade embed (below) shows only to free and
  // signed-out readers; premium members already own what it sells
  // and, per the embed's own contract, never see it.
  const session = await auth().catch(() => null);
  const showUpgradeEmbed = planTierOf(session) === "free";
  // DB first (admin-seeded); bundled research JSON fills in until seeded.
  let competitors: { slug: string; name: string; website: string | null; categories: string[]; tagline: string | null; lastReviewed: Date }[] = [];
  try {
    competitors = await db.competitor.findMany({
      where: { published: true },
      orderBy: { name: "asc" },
      select: { slug: true, name: true, website: true, categories: true, tagline: true, lastReviewed: true },
    });
  } catch {
    /* DB unreachable — bundled fallback below */
  }
  if (competitors.length === 0) {
    competitors = listBundledCompetitors().map((c) => ({
      slug: c.slug, name: c.name, website: c.website,
      categories: c.categories, tagline: c.tagline, lastReviewed: c.lastReviewed,
    }));
  }

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
  /* Every comparison child, enumerated server-side from the same
     list the cards render — the hub's ItemList is the children's
     canonical table of contents for crawlers. */
  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "WorldEye comparisons",
    numberOfItems: competitors.length,
    itemListElement: competitors.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: `WorldEye vs ${c.name}`,
      url: `https://worldeye.app/compare/${c.slug}`,
    })),
  };

  return (
    <div className="docs-root min-h-screen" style={{ background: "radial-gradient(1200px 600px at 50% -10%, #0a1a33 0%, #050810 55%, #03040a 100%)" }}>
      <JsonLd data={jsonLd} />
      <JsonLd data={breadcrumbLd} />
      <JsonLd data={itemListLd} />

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
        <p className="text-white/45 mt-3 max-w-2xl mx-auto text-sm leading-relaxed">
          These are the pair pages: the numbers behind them are published in{" "}
          <Link href="/research" className="text-[#0096FF] hover:underline">WorldEye Research, the data hub</Link>,
          and the same platforms are ranked together in{" "}
          <Link href="/best-live-webcam-sites" className="text-[#0096FF] hover:underline">the ranked guide to the best live webcam sites</Link>.
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

      {/* How to read these comparisons */}
      <section className="max-w-5xl mx-auto px-6 pb-12">
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 md:p-8">
          <h2 className="text-xl font-bold text-white mb-3">How to read these comparisons</h2>
          <div className="space-y-3 text-sm text-white/55 leading-relaxed">
            <p>
              Most of the tools compared here are specialists: a flight tracker that does
              aviation deeply, a conflict map built around curated event reports, a weather
              platform built on forecast models. WorldEye is the generalist — one free 3D
              globe carrying flights, satellites, ships, live transit, weather, earthquakes,
              wildfires and 74,229 public cameras, with optional paid tiers for the OSINT
              toolkit and — on Ultra — the intel feeds. Neither shape is automatically better; the right pick
              depends on whether your work lives in one layer or moves between all of them.
            </p>
            <p>
              Each comparison page checks features against the competitor&rsquo;s official
              sources, lists those sources, states plainly where the competitor is stronger,
              and marks anything we could not verify as &ldquo;Not verified&rdquo; instead of
              guessing. Use the verdicts as a starting point, then open both products — the
              WorldEye side costs nothing and needs no signup, so the honest test takes a
              minute.
            </p>
          </div>
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
                ["Public camera network", "74,229 cameras", "Rarely included"],
                ["Satellite tracking", "Yes", "Yes (specialists)"],
                ["Ship tracking", "Yes", "Yes (specialists)"],
                ["Conflict monitoring", "Ultra intel feeds", "Yes (specialists)"],
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
              title: "WorldEye vs Windy",
              desc: "Forecast-model depth vs the live globe: weather plus flights, ships and 74,229 ground cameras.",
              href: "/compare/windy",
            },
            {
              title: "WorldEye vs SkylineWebcams",
              desc: "The scenic webcam directory vs 74,229 cameras on a 3D globe with weather and flights attached.",
              href: "/compare/skylinewebcams",
            },
            {
              title: "God's Eye View alternatives",
              desc: "The viral Cesium globe, hosted vs self-hosted — and the ~4,000 vs 74,229 camera question.",
              href: "/alternatives/gods-eye-view",
            },
            {
              title: "God's Eye View online",
              desc: "The install-vs-browser question, answered: what the open-source project needs to run — and the hosted route that needs nothing.",
              href: "/gods-eye-view-online",
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

      {/* Competitor head-to-heads (X vs Y, WorldEye as another option) */}
      <section className="max-w-5xl mx-auto px-6 pb-16">
        <h2 className="text-2xl font-bold text-white text-center">Competitor head-to-heads</h2>
        <p className="text-sm text-white/45 text-center mt-3 max-w-xl mx-auto">
          The rivalries readers search for even when WorldEye isn’t one of
          the names — fair, sourced comparisons, with WorldEye presented
          afterwards as another option.
        </p>
        <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {listComparePairs().map((pair) => (
            <Link
              key={pair.slug}
              href={`/compare/${pair.slug}`}
              className="block rounded-2xl border border-white/10 bg-white/[0.02] p-5 hover:border-[#0096FF]/40 hover:bg-white/[0.04] transition group"
            >
              <h3 className="font-bold text-white group-hover:text-[#7cc4ff] transition">{pair.aName} vs {pair.bName}</h3>
              <p className="text-sm text-white/45 mt-1.5 leading-relaxed">{pair.seoDescription}</p>
              <span className="inline-block mt-3 text-xs font-semibold text-[#0096FF]">Read the comparison →</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Ranked guides */}
      <section className="max-w-5xl mx-auto px-6 pb-16">
        <h2 className="text-2xl font-bold text-white text-center">Ranked guides</h2>
        <p className="text-sm text-white/45 text-center mt-3 max-w-xl mx-auto">
          The category rankings behind the head-to-heads — every guide
          ranks by genuine best-fit and states each pick&apos;s limits.
        </p>
        <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {GUIDES.map((g) => (
            <Link
              key={g.href}
              href={g.href}
              className="block rounded-2xl border border-white/10 bg-white/[0.02] p-5 hover:border-[#0096FF]/40 hover:bg-white/[0.04] transition group"
            >
              <h3 className="font-bold text-white group-hover:text-[#7cc4ff] transition">{g.title}</h3>
              <p className="text-sm text-white/45 mt-1.5 leading-relaxed">{g.desc}</p>
              <span className="inline-block mt-3 text-xs font-semibold text-[#0096FF]">Read the guide →</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Closing signup moment (2026-10-31): comparison readers are
          deciding between tools — the shared upgrade embed gives them
          the in-place checkout instead of only the mid-page pricing
          link. Free and signed-out readers only; premium members
          never see it. */}
      {showUpgradeEmbed && (
        <div className="mx-auto max-w-md px-6 pb-16">
          <ProUpgradeEmbed premiumLabels={premiumFeatureNames("pro")} />
        </div>
      )}

      <SiteFooter />
    </div>
  );
}
