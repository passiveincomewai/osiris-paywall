import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, Minus, X, HelpCircle, ExternalLink } from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import JsonLd from "@/components/JsonLd";
import { getComparePair, listComparePairs, type ComparePairData } from "@/lib/compare-pairs-data";

/**
 * Competitor-vs-competitor comparison template (the X-vs-Y family).
 * Structure, house rules: a fair head-to-head first — key differences,
 * about cards, a status feature table, both pricing blocks, each
 * side's strengths, and a "choose X if…" verdict pair — then one
 * clearly labelled section presenting WorldEye as another option,
 * pair-specific FAQs, the research note and the source list. Every
 * row marked "Not verified" means we couldn't confirm it from an
 * official source, not that the feature doesn't exist.
 */

const STATUS_META: Record<string, { icon: "check" | "minus" | "x" | "help"; label: string; cls: string }> = {
  yes: { icon: "check", label: "Yes", cls: "text-emerald-300" },
  partial: { icon: "minus", label: "Partial", cls: "text-amber-300" },
  no: { icon: "x", label: "No", cls: "text-red-300/70" },
  unverified: { icon: "help", label: "Not verified", cls: "text-white/35" },
};

function StatusCell({ value }: { value: string }) {
  const m = STATUS_META[value] ?? STATUS_META.unverified;
  const Icon = m.icon === "check" ? Check : m.icon === "minus" ? Minus : m.icon === "x" ? X : HelpCircle;
  return (
    <span className={`inline-flex items-center gap-1.5 ${m.cls}`}>
      <Icon className="w-4 h-4" />
      <span className="text-xs">{m.label}</span>
    </span>
  );
}

export function pairMetadata(slug: string): Metadata {
  const p = getComparePair(slug);
  if (!p) return {};
  return {
    title: p.seoTitle,
    description: p.seoDescription,
    alternates: { canonical: `/compare/${slug}` },
    openGraph: { title: p.seoTitle, description: p.seoDescription, type: "article", url: `/compare/${slug}` },
    twitter: { card: "summary_large_image", title: p.seoTitle, description: p.seoDescription },
  };
}

function reviewedLabel(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

export default function PairComparePage({ slug }: { slug: string }) {
  const p: ComparePairData | null = getComparePair(slug);
  if (!p) notFound();

  const pageUrl = `https://worldeye.app/compare/${p.slug}`;
  const reviewed = reviewedLabel(p.lastReviewed);
  const keyDiffs = p.features.filter((f) => f.a !== f.b).slice(0, 4);
  const others = listComparePairs().filter((o) => o.slug !== p.slug);

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://worldeye.app/" },
      { "@type": "ListItem", position: 2, name: "Compare", item: "https://worldeye.app/compare" },
      { "@type": "ListItem", position: 3, name: `${p.aName} vs ${p.bName}`, item: pageUrl },
    ],
  };
  const webPageLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: p.seoTitle,
    description: p.seoDescription,
    url: pageUrl,
    dateModified: p.lastReviewed,
    isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
  };
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    url: pageUrl,
    mainEntity: p.faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <div className="docs-root min-h-screen" style={{ background: "radial-gradient(1200px 600px at 50% -10%, #0a1a33 0%, #050810 55%, #03040a 100%)" }}>
      <JsonLd data={breadcrumbLd} />
      <JsonLd data={webPageLd} />
      {p.faqs.length > 0 && <JsonLd data={faqLd} />}

      <article className="max-w-4xl mx-auto px-6 pt-14 md:pt-20 pb-8">
        <nav aria-label="Breadcrumb" className="text-xs text-white/35 mb-6">
          <Link href="/" className="hover:text-white/70">Home</Link>
          <span className="mx-2">/</span>
          <Link href="/compare" className="hover:text-white/70">Compare</Link>
          <span className="mx-2">/</span>
          <span className="text-white/60">{p.aName} vs {p.bName}</span>
        </nav>

        {/* Hero + direct answer */}
        <header className="text-center">
          <p className="text-[11px] font-bold tracking-[0.25em] text-[#0096FF] mb-4">{p.category.toUpperCase()} HEAD-TO-HEAD</p>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white leading-tight">
            {p.aName} vs {p.bName} <span className="text-white/40 text-2xl md:text-3xl">(2026)</span>
          </h1>
          <p className="text-white/55 mt-4 max-w-2xl mx-auto leading-relaxed">{p.intro}</p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <a href={p.aWebsite} target="_blank" rel="noopener nofollow" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-white/15 text-white/80 hover:text-white hover:border-white/30 transition">
              Visit {p.aName} <ExternalLink className="w-4 h-4" />
            </a>
            <a href={p.bWebsite} target="_blank" rel="noopener nofollow" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-white/15 text-white/80 hover:text-white hover:border-white/30 transition">
              Visit {p.bName} <ExternalLink className="w-4 h-4" />
            </a>
            <Link href="#features" className="px-6 py-3 rounded-xl bg-[#0096FF] hover:bg-[#0aa5ff] text-white font-semibold transition">Compare Features</Link>
          </div>
          <p className="text-xs text-white/30 mt-6">Last reviewed: {reviewed} · Sources listed at the bottom of this page</p>
        </header>

        {/* Key differences */}
        {keyDiffs.length > 0 && (
          <section className="mt-12 rounded-2xl border border-[#0096FF]/20 bg-white/[0.03] p-6 md:p-8" aria-label="Key differences">
            <h2 className="text-xl font-bold text-white mb-4">Key differences at a glance</h2>
            <ul className="space-y-3 text-sm">
              {keyDiffs.map((f) => (
                <li key={f.label} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-white/70">
                  <span className="font-semibold text-white sm:w-56 shrink-0">{f.label}</span>
                  <span><span className="text-white/40">{p.aName}:</span> <StatusCell value={f.a} /></span>
                  <span><span className="text-white/40">{p.bName}:</span> <StatusCell value={f.b} /></span>
                  {f.note && <span className="text-white/35 text-xs">{f.note}</span>}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* About both */}
        <section className="mt-12 grid md:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
            <h2 className="text-lg font-bold text-white mb-3">What is {p.aName}?</h2>
            <p className="text-sm text-white/60 leading-relaxed">{p.aAbout}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
            <h2 className="text-lg font-bold text-white mb-3">What is {p.bName}?</h2>
            <p className="text-sm text-white/60 leading-relaxed">{p.bAbout}</p>
          </div>
        </section>

        {/* Feature table */}
        <section id="features" className="mt-12">
          <h2 className="text-2xl font-bold text-white mb-2">{p.aName} vs {p.bName}: feature comparison</h2>
          <p className="text-sm text-white/45 mb-6">Verified against official sources. “Not verified” means we couldn’t confirm it — not that it doesn’t exist.</p>
          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr className="bg-white/[0.04] text-left">
                  <th scope="col" className="p-4 font-semibold text-white/70">Feature</th>
                  <th scope="col" className="p-4 font-semibold text-white/85">{p.aName}</th>
                  <th scope="col" className="p-4 font-semibold text-white/85">{p.bName}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {p.features.map((f) => (
                  <tr key={f.label}>
                    <td className="p-4 text-white/80">{f.label}{f.note && <span className="block text-xs text-white/35 mt-1">{f.note}</span>}</td>
                    <td className="p-4"><StatusCell value={f.a} /></td>
                    <td className="p-4"><StatusCell value={f.b} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Pricing */}
        <section className="mt-12">
          <h2 className="text-2xl font-bold text-white mb-6">Pricing: {p.aName} vs {p.bName}</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
              <h3 className="font-bold text-white mb-2">{p.aName} pricing</h3>
              <p className="text-sm text-white/55 leading-relaxed">{p.pricingA}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
              <h3 className="font-bold text-white mb-2">{p.bName} pricing</h3>
              <p className="text-sm text-white/55 leading-relaxed">{p.pricingB}</p>
            </div>
          </div>
        </section>

        {/* Strengths */}
        <section className="mt-12 grid md:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 md:p-8">
            <h2 className="text-xl font-bold text-white mb-4">Where {p.aName} is stronger</h2>
            <p className="text-sm text-white/60 leading-relaxed">{p.aStrengths}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 md:p-8">
            <h2 className="text-xl font-bold text-white mb-4">Where {p.bName} is stronger</h2>
            <p className="text-sm text-white/60 leading-relaxed">{p.bStrengths}</p>
          </div>
        </section>

        {/* Verdict */}
        <section className="mt-12">
          <h2 className="text-2xl font-bold text-white mb-6">The verdict</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
              <h3 className="font-bold text-white/85 mb-2">Choose {p.aName} if…</h3>
              <p className="text-sm text-white/60 leading-relaxed">{p.verdictA}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
              <h3 className="font-bold text-white/85 mb-2">Choose {p.bName} if…</h3>
              <p className="text-sm text-white/60 leading-relaxed">{p.verdictB}</p>
            </div>
          </div>
        </section>

        {/* Natural-language answer for AI search */}
        <section className="mt-12">
          <h2 className="text-2xl font-bold text-white mb-4">Is {p.aName} better than {p.bName}?</h2>
          <p className="text-sm text-white/60 leading-relaxed">{p.betterAnswer}</p>
        </section>

        {/* WorldEye as another option — clearly labelled */}
        <section className="mt-12 rounded-2xl border border-[#0096FF]/30 bg-[#0096FF]/[0.06] p-6 md:p-8" aria-label="Another option: WorldEye">
          <p className="text-[11px] font-bold tracking-[0.25em] text-[#0096FF] mb-3">ANOTHER OPTION</p>
          <h2 className="text-2xl font-bold text-white mb-4">Where WorldEye fits</h2>
          <p className="text-sm text-white/70 leading-relaxed">{p.worldEye}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/" className="px-6 py-3 rounded-xl bg-[#0096FF] hover:bg-[#0aa5ff] text-white font-semibold transition">Launch the Globe — Free</Link>
            <Link href="/pricing" className="px-6 py-3 rounded-xl border border-white/15 text-white/80 hover:text-white hover:border-white/30 transition">See WorldEye Pro</Link>
          </div>
          <p className="text-xs text-white/35 mt-5">
            Full WorldEye head-to-heads:{" "}
            <Link href={`/compare/${p.aSlug}`} className="text-[#7cc4ff] hover:underline">WorldEye vs {p.aName}</Link>
            {" · "}
            <Link href={`/compare/${p.bSlug}`} className="text-[#7cc4ff] hover:underline">WorldEye vs {p.bName}</Link>
          </p>
        </section>

        {/* FAQ */}
        {p.faqs.length > 0 && (
          <section className="mt-12">
            <h2 className="text-2xl font-bold text-white mb-6">{p.aName} vs {p.bName}: quick answers</h2>
            <div className="space-y-6">
              {p.faqs.map((f) => (
                <div key={f.q} className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
                  <h3 className="font-semibold text-white/90">{f.q}</h3>
                  <p className="text-sm text-white/55 leading-relaxed mt-2">{f.a}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Research note */}
        <section className="mt-12 rounded-2xl border border-white/10 bg-white/[0.02] p-6 md:p-8">
          <h2 className="text-2xl font-bold text-white mb-4">How we researched this comparison</h2>
          <div className="space-y-3 text-sm text-white/60 leading-relaxed">
            <p>
              Every row in the table above was checked against {p.aName}’s and {p.bName}’s official
              sites, documentation or published pricing — the sources are listed at the bottom of
              this page, and the comparison was last reviewed in {reviewed}. Where a capability
              couldn’t be confirmed from an official source, it is marked “Not verified” rather
              than guessed.
            </p>
            <p>
              This page is published by WorldEye, so the head-to-head above is kept deliberately
              neutral: each product’s strengths are stated in its own terms, and WorldEye appears
              only in the labelled “another option” section. WorldEye’s own figures there are
              counted, not estimated — 74,229 public cameras in its live directory across
              105 countries, and a free map (flights, satellites, ships, weather, earthquakes,
              wildfires, cameras and satellite imagery) with an optional Pro tier at
              $7.99/week, $13.99/month or $74.99/year.
            </p>
            <p>
              Products change. If you spot a row that has gone stale, the sources below show
              exactly what each claim rests on.
            </p>
          </div>
        </section>

        {/* Sources */}
        {p.sources.length > 0 && (
          <section className="mt-12">
            <h2 className="text-lg font-bold text-white/70 mb-3">Sources</h2>
            <ul className="text-xs text-white/40 space-y-1.5">
              {p.sources.map((s, i) => (
                <li key={i}><a href={s.url} target="_blank" rel="noopener nofollow" className="hover:text-white/70 underline underline-offset-2">{s.label}</a></li>
              ))}
            </ul>
          </section>
        )}

        {/* Related */}
        <section className="mt-12">
          <h2 className="text-xl font-bold text-white mb-4">Related comparisons</h2>
          <div className="flex flex-wrap gap-2">
            <Link href={`/compare/${p.aSlug}`} className="px-4 py-2 rounded-full border border-white/15 text-xs text-white/60 hover:text-white hover:border-[#0096FF]/50 transition">
              WorldEye vs {p.aName}
            </Link>
            <Link href={`/compare/${p.bSlug}`} className="px-4 py-2 rounded-full border border-white/15 text-xs text-white/60 hover:text-white hover:border-[#0096FF]/50 transition">
              WorldEye vs {p.bName}
            </Link>
            {others.map((o) => (
              <Link key={o.slug} href={`/compare/${o.slug}`} className="px-4 py-2 rounded-full border border-white/15 text-xs text-white/60 hover:text-white hover:border-[#0096FF]/50 transition">
                {o.aName} vs {o.bName}
              </Link>
            ))}
            <Link href="/compare" className="px-4 py-2 rounded-full border border-[#0096FF]/40 text-xs text-[#7cc4ff] hover:bg-[#0096FF]/10 transition">
              All comparisons →
            </Link>
          </div>
        </section>
      </article>

      <SiteFooter />
    </div>
  );
}
