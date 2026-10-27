import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Scale } from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import TrialCtaSection from "@/components/TrialCtaSection";
import SkiCompareTool from "@/components/SkiCompareTool";
import {
  allCompareData,
  pairSlug,
  parseCompareSelection,
  POPULAR_PAIRS,
} from "@/lib/ski-compare";
import { getSkiResort, SKI_RESORTS } from "@/lib/ski-resorts";
import type { SkiResortLogoMap } from "@/lib/ski-directory";
import skiLogosData from "@/data/ski-logos.json";

const BASE = "https://worldeye.app";
const SKI_LOGOS = skiLogosData as SkiResortLogoMap;

export const metadata: Metadata = {
  title: "Compare Ski Resorts — Side-by-Side Terrain, Cameras & Official Links",
  description:
    "Compare any two ski resorts side by side: base and summit elevation, vertical drop, skiable terrain, lifts, runs, live camera counts and verified links to official lift tickets, trail maps and lodging.",
  alternates: { canonical: `${BASE}/ski-webcams/compare` },
  openGraph: {
    title: "Compare Ski Resorts — Side by Side",
    description:
      "Terrain, cameras and official ticket, trail-map and lodging links for any two ski resorts, side by side.",
    url: "/ski-webcams/compare",
    type: "website",
  },
};

export default async function SkiComparePage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; b?: string }>;
}) {
  const sp = await searchParams;
  const initial = parseCompareSelection(sp.a, sp.b);
  const resorts = allCompareData();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${BASE}/` },
      { "@type": "ListItem", position: 2, name: "Ski webcams", item: `${BASE}/ski-webcams` },
      { "@type": "ListItem", position: 3, name: "Compare ski resorts", item: `${BASE}/ski-webcams/compare` },
    ],
  };

  return (
    <main className="docs-root min-h-screen bg-[#05070d] text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="max-w-5xl mx-auto px-6 py-10 md:py-16">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-white/45 mb-10">
          <Link href="/" className="hover:text-white transition">Home</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link href="/ski-webcams" className="hover:text-white transition">Ski webcams</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-white/80">Compare resorts</span>
        </nav>

        <div className="text-center max-w-3xl mx-auto">
          <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-[#D4AF37] border border-[#D4AF37]/30 rounded-full px-4 py-1.5 mb-6">
            <Scale className="w-3.5 h-3.5" /> SIDE BY SIDE
          </p>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight">Compare ski resorts</h1>
          <p className="mt-4 text-white/55">
            Terrain, live cameras and the official links that matter — lift tickets, trail maps
            and lodging — for any two of the {SKI_RESORTS.length} resorts with WorldEye pages.
          </p>
        </div>

        <section className="mt-12">
          <SkiCompareTool resorts={resorts} logos={SKI_LOGOS} initial={initial} />
        </section>

        <section className="mt-14">
          <h2 className="text-xl md:text-2xl font-bold mb-5">Popular comparisons</h2>
          <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {POPULAR_PAIRS.map(([a, b]) => {
              const ra = getSkiResort(a);
              const rb = getSkiResort(b);
              if (!ra || !rb) return null;
              return (
                <li key={pairSlug(a, b)}>
                  <Link
                    href={`/ski-webcams/compare/${pairSlug(a, b)}`}
                    className="block rounded-2xl border border-white/10 bg-white/[0.03] p-4 hover:bg-white/[0.05] transition"
                  >
                    <span className="font-semibold text-sm">
                      {ra.name} vs {rb.name}
                    </span>
                    <span className="block text-xs text-white/45 mt-1">
                      {ra.country} · {ra.region} vs {rb.region}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="mt-14 max-w-3xl">
          <h2 className="text-xl md:text-2xl font-bold mb-4">How to read the numbers</h2>
          <div className="space-y-4 text-white/70 leading-relaxed">
            <p>
              Camera counts are counted from the same live catalogue that powers the WorldEye
              globe — the resort feeds within 10 km of the base and the road cameras within
              40 km — never estimated. Terrain figures (elevations, vertical, skiable area,
              lifts, runs) come from each resort&apos;s sourced reference entry; where a figure
              hasn&apos;t been sourced for a resort, the cell shows a dash rather than a guess.
            </p>
            <p>
              The ticket, trail-map and lodging buttons go to pages on each resort&apos;s own
              official website, verified link by link. WorldEye doesn&apos;t sell lift tickets
              or lodging — the buttons exist so the comparison ends where the booking starts.
            </p>
          </div>
        </section>

        <TrialCtaSection utmSource="ski-compare" />
      </div>
      <SiteFooter />
    </main>
  );
}
