import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Scale } from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import TrialCtaSection from "@/components/TrialCtaSection";
import SkiComparisonTable from "@/components/SkiComparisonTable";
import {
  buildCompareData,
  pairSlug,
  parsePairSlug,
  POPULAR_PAIRS,
  type CompareResortData,
} from "@/lib/ski-compare";
import { formatElevation } from "@/lib/ski-resort-facts";
import { getSkiResort } from "@/lib/ski-resorts";
import { plural } from "@/lib/country-page-content";
import type { SkiResortLogoMap } from "@/lib/ski-directory";
import skiLogosData from "@/data/ski-logos.json";

const BASE = "https://worldeye.app";
const SKI_LOGOS = skiLogosData as SkiResortLogoMap;

export function generateStaticParams() {
  return POPULAR_PAIRS.map(([a, b]) => ({ pair: pairSlug(a, b) }));
}

function pageTitle(a: CompareResortData, b: CompareResortData): string {
  return `${a.name} vs ${b.name} — Ski Resort Comparison`;
}

function metaDescription(a: CompareResortData, b: CompareResortData): string {
  return `Compare ${a.name} (${a.town}, ${a.region}) and ${b.name} (${b.town}, ${b.region}) side by side: elevation, vertical drop, terrain, lifts, runs, live camera counts and verified links to official lift tickets, trail maps and lodging.`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ pair: string }>;
}): Promise<Metadata> {
  const { pair } = await params;
  const parsed = parsePairSlug(pair);
  if (!parsed) return { title: "Not found" };
  const [ra, rb] = parsed;
  const a = buildCompareData(ra);
  const b = buildCompareData(rb);
  const url = `/ski-webcams/compare/${pairSlug(ra.slug, rb.slug)}`;
  const description = metaDescription(a, b);
  return {
    title: pageTitle(a, b),
    description,
    alternates: { canonical: `${BASE}${url}` },
    openGraph: { title: pageTitle(a, b), description, url, type: "website" },
  };
}

/**
 * Two or three plain-English contrasts, composed only from stats both
 * resorts actually have sourced — a missing figure skips its sentence.
 */
function statSentences(a: CompareResortData, b: CompareResortData): string[] {
  const fa = a.facts ?? {};
  const fb = b.facts ?? {};
  const out: string[] = [];
  if (fa.verticalM != null && fb.verticalM != null && fa.verticalM !== fb.verticalM) {
    const hi = fa.verticalM > fb.verticalM ? a : b;
    const lo = hi === a ? b : a;
    out.push(
      `${hi.name} is the bigger descent: ${formatElevation(Math.max(fa.verticalM, fb.verticalM))} of vertical against ${lo.name}'s ${formatElevation(Math.min(fa.verticalM, fb.verticalM))}.`,
    );
  }
  if (fa.summitElevationM != null && fb.summitElevationM != null && fa.summitElevationM !== fb.summitElevationM) {
    const hi = fa.summitElevationM > fb.summitElevationM ? a : b;
    out.push(
      `${hi.name} also tops out higher, at ${formatElevation(Math.max(fa.summitElevationM, fb.summitElevationM))}.`,
    );
  }
  if (fa.runs != null && fb.runs != null && fa.runs !== fb.runs) {
    const hi = fa.runs > fb.runs ? a : b;
    const lo = hi === a ? b : a;
    out.push(
      `On marked runs it is ${hi.name} ${Math.max(fa.runs, fb.runs)} to ${lo.name}'s ${Math.min(fa.runs, fb.runs)}.`,
    );
  }
  if (fa.skiableHectares != null && fb.skiableHectares != null && fa.skiableHectares !== fb.skiableHectares) {
    const hi = fa.skiableHectares > fb.skiableHectares ? a : b;
    const lo = hi === a ? b : a;
    out.push(
      `${hi.name} spreads over more skiable terrain than ${lo.name}.`,
    );
  }
  return out.slice(0, 3);
}

export default async function SkiPairPage({
  params,
}: {
  params: Promise<{ pair: string }>;
}) {
  const { pair } = await params;
  const parsed = parsePairSlug(pair);
  if (!parsed) notFound();
  const [ra, rb] = parsed;
  const a = buildCompareData(ra);
  const b = buildCompareData(rb);
  const canonical = `${BASE}/ski-webcams/compare/${pairSlug(ra.slug, rb.slug)}`;
  const totalA = a.resortCameraCount + a.nearbyCameraCount;
  const totalB = b.resortCameraCount + b.nearbyCameraCount;
  const sentences = statSentences(a, b);
  const others = POPULAR_PAIRS.filter(
    ([x, y]) => pairSlug(x, y) !== pairSlug(ra.slug, rb.slug),
  ).slice(0, 3);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${BASE}/` },
      { "@type": "ListItem", position: 2, name: "Ski webcams", item: `${BASE}/ski-webcams` },
      { "@type": "ListItem", position: 3, name: "Compare ski resorts", item: `${BASE}/ski-webcams/compare` },
      { "@type": "ListItem", position: 4, name: `${a.name} vs ${b.name}`, item: canonical },
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
          <Link href="/ski-webcams/compare" className="hover:text-white transition">Compare resorts</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-white/80">{a.name} vs {b.name}</span>
        </nav>

        <div className="text-center max-w-3xl mx-auto">
          <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-[#D4AF37] border border-[#D4AF37]/30 rounded-full px-4 py-1.5 mb-6">
            <Scale className="w-3.5 h-3.5" /> RESORT COMPARISON
          </p>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
            {a.name} vs {b.name}
          </h1>
          <p className="mt-4 text-white/55">
            {a.town}, {a.region} ({a.country}) against {b.town}, {b.region} ({b.country}) —
            terrain, live cameras and official links, side by side.
          </p>
        </div>

        <section className="mt-12">
          <SkiComparisonTable a={a} b={b} logos={SKI_LOGOS} />
        </section>

        <div className="mt-10 space-y-4 text-white/70 leading-relaxed max-w-3xl">
          <p>
            On cameras, WorldEye&apos;s live index holds {plural(totalA, "camera")} around{" "}
            {a.name} and {plural(totalB, "camera")} around {b.name} — both resort pages carry the
            full grids, the road cameras on the drive in, and a route tool that lines up every
            camera along your specific drive.
          </p>
          {sentences.length > 0 && <p>{sentences.join(" ")}</p>}
          <p>
            The honest tiebreaker is the day itself: check both mountains&apos; slope and
            snow-stake cameras on the morning you&apos;re choosing — fresh snow, wind and lift
            lines routinely reverse what the raw numbers suggest.
          </p>
        </div>

        <section className="mt-12">
          <h2 className="text-xl md:text-2xl font-bold mb-5">More comparisons</h2>
          <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <li>
              <Link
                href={`/ski-webcams/compare?a=${ra.slug}&b=${rb.slug}`}
                className="block rounded-2xl border border-[#D4AF37]/40 bg-[#D4AF37]/[0.06] p-4 hover:bg-[#D4AF37]/[0.1] transition"
              >
                <span className="font-semibold text-sm">Compare any two resorts</span>
                <span className="block text-xs text-white/45 mt-1">
                  Open the compare tool with this pair loaded
                </span>
              </Link>
            </li>
            {others.map(([x, y]) => {
              const rx = getSkiResort(x);
              const ry = getSkiResort(y);
              if (!rx || !ry) return null;
              return (
                <li key={pairSlug(x, y)}>
                  <Link
                    href={`/ski-webcams/compare/${pairSlug(x, y)}`}
                    className="block rounded-2xl border border-white/10 bg-white/[0.03] p-4 hover:bg-white/[0.05] transition"
                  >
                    <span className="font-semibold text-sm">
                      {rx.name} vs {ry.name}
                    </span>
                    <span className="block text-xs text-white/45 mt-1">Popular comparison</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>

        <TrialCtaSection utmSource="ski-compare-pair" />
      </div>
      <SiteFooter />
    </main>
  );
}
