import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, Minus, X, HelpCircle } from "lucide-react";
import { db } from "@/lib/db";
import SiteFooter from "@/components/SiteFooter";
import EmailCaptureCard from "@/components/EmailCaptureCard";
import JsonLd from "@/components/JsonLd";
import {
  getBundledCompetitor,
  listBundledRelated,
  type CompetitorData,
} from "@/lib/competitors-data";

export const dynamic = "force-dynamic";

/* Intent split (INTENT-AND-CLUSTERS §2.2): this template owns
   "WorldEye vs X" only. Competitors that also have a hand-built
   alternatives page get ONE in-content hand-off line in the hero —
   the alternatives page owns "X alternative(s)" (switching intent).
   EarthCam's alternatives owner is the standalone
   /earthcam-alternative page. The sentence frame rotates by slug so
   it isn't a template stamp; the anchor is composed from the
   competitor's own name. */
const ALTERNATIVES_HANDOFF: Record<string, string> = {
  windy: "/alternatives/windy",
  skylinewebcams: "/alternatives/skylinewebcams",
  flightradar24: "/alternatives/flightradar24",
  "google-earth": "/alternatives/google-earth",
  dataminr: "/alternatives/dataminr",
  liveuamap: "/alternatives/liveuamap",
  "world-monitor": "/alternatives/world-monitor",
  "zoom-earth": "/alternatives/zoom-earth",
  earthcam: "/earthcam-alternative",
};

function handoffFrame(slug: string): number {
  let sum = 0;
  for (let i = 0; i < slug.length; i++) sum += slug.charCodeAt(i);
  return sum % 3;
}

type Feature = { label: string; worldEye: string; competitor: string; note?: string };

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

/** DB row first (admin-seeded); bundled research JSON as the fallback so an
 *  unseeded environment still renders the real comparison. */
async function loadCompetitor(slug: string): Promise<CompetitorData | null> {
  try {
    const row = await db.competitor.findUnique({ where: { slug, published: true } });
    if (row) {
      return {
        slug: row.slug,
        name: row.name,
        website: row.website,
        categories: row.categories,
        tagline: row.tagline,
        description: row.description,
        features: (row.features as unknown as CompetitorData["features"]) ?? [],
        pricing: row.pricing,
        whyWorldEye: (row.whyWorldEye as unknown as string[]) ?? [],
        competitorWins: row.competitorWins,
        verdictWorldEye: row.verdictWorldEye,
        verdictCompetitor: row.verdictCompetitor,
        sources: (row.sources as unknown as CompetitorData["sources"]) ?? [],
        lastReviewed: row.lastReviewed,
        published: row.published,
        seoTitle: row.seoTitle,
        seoDescription: row.seoDescription,
      };
    }
  } catch {
    /* DB unreachable — fall through to the bundled copy */
  }
  return getBundledCompetitor(slug);
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const c = await loadCompetitor(slug);
  if (!c) notFound();
  const title = c.seoTitle || `WorldEye vs ${c.name} (2026): Which Platform Is Right for You?`;
  const description = c.seoDescription || c.tagline || `Compare WorldEye with ${c.name}: features, pricing and verdict.`;
  return {
    title,
    description,
    alternates: { canonical: `/compare/${slug}` },
    openGraph: { title, description, type: "article", url: `/compare/${slug}` },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function ComparePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = await loadCompetitor(slug);
  if (!c) notFound();

  const features = c.features ?? [];
  const whyWorldEye = c.whyWorldEye ?? [];
  const sources = c.sources ?? [];
  const reviewed = new Date(c.lastReviewed).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  let related: { slug: string; name: string }[] = [];
  try {
    related = await db.competitor.findMany({
      where: { published: true, slug: { not: slug }, categories: { hasSome: c.categories } },
      take: 4,
      select: { slug: true, name: true },
    });
  } catch {
    /* DB unreachable — related falls back below */
  }
  if (related.length === 0) {
    related = listBundledRelated(slug, c.categories).map((r) => ({ slug: r.slug, name: r.name }));
  }

  const title = c.seoTitle || `WorldEye vs ${c.name} (2026): Which Intelligence Platform Is Right for You?`;
  const pageUrl = `https://worldeye.app/compare/${slug}`;

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://worldeye.app/" },
      { "@type": "ListItem", position: 2, name: "Compare", item: "https://worldeye.app/compare" },
      { "@type": "ListItem", position: 3, name: `WorldEye vs ${c.name}`, item: pageUrl },
    ],
  };
  const webPageLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: title,
    description: c.seoDescription || c.tagline,
    url: pageUrl,
    dateModified: new Date(c.lastReviewed).toISOString().slice(0, 10),
    isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
  };

  const keyDiffs = features.filter((f) => f.worldEye !== f.competitor).slice(0, 4);

  /* Per-entry FAQ, built entirely from this entry's own researched
     fields (pricing, competitorWins, verdicts, tagline) — so every
     comparison page carries a block of genuinely entry-specific text
     beyond the shared template sections, in the page and in FAQ
     structured data alike. Fields an entry doesn't have simply drop
     their question rather than rendering a placeholder. */
  const faqs: { q: string; a: string }[] = [];
  if (c.pricing) {
    faqs.push({
      q: `Is ${c.name} free?`,
      a: `${c.pricing} WorldEye's map is free forever with no signup; Pro is $7.99/week, $13.99/month or $74.99/year.`,
    });
  }
  if (c.competitorWins) {
    faqs.push({
      q: `What is ${c.name} best for?`,
      a: c.competitorWins,
    });
  }
  if (c.verdictWorldEye || c.verdictCompetitor) {
    faqs.push({
      q: `WorldEye or ${c.name} — which should I choose?`,
      a: [c.verdictWorldEye, c.verdictCompetitor].filter(Boolean).join(" "),
    });
  }
  if (c.tagline) {
    faqs.push({
      q: `What is ${c.name}?`,
      a: `${c.tagline} The full researched comparison — features checked against official sources, pricing and verdicts — is on this page.`,
    });
  }
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    url: pageUrl,
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <div className="docs-root min-h-screen" style={{ background: "radial-gradient(1200px 600px at 50% -10%, #0a1a33 0%, #050810 55%, #03040a 100%)" }}>
      <JsonLd data={breadcrumbLd} />
      <JsonLd data={webPageLd} />
      {faqs.length > 0 && <JsonLd data={faqLd} />}

      <article className="max-w-4xl mx-auto px-6 pt-14 md:pt-20 pb-8">
        <nav aria-label="Breadcrumb" className="text-xs text-white/35 mb-6">
          <Link href="/" className="hover:text-white/70">Home</Link>
          <span className="mx-2">/</span>
          <Link href="/compare" className="hover:text-white/70">Compare</Link>
          <span className="mx-2">/</span>
          <span className="text-white/60">{c.name}</span>
        </nav>

        {/* Hero + direct answer */}
        <header className="text-center">
          <h1 className="text-3xl md:text-4xl font-extrabold text-white leading-tight">{title.replace(/ \(2026\):.*$/, "")} <span className="text-white/40 text-2xl md:text-3xl">(2026)</span></h1>
          <p className="text-white/55 mt-4 max-w-2xl mx-auto leading-relaxed">{c.description}</p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link href="/" className="px-6 py-3 rounded-xl bg-[#0096FF] hover:bg-[#0aa5ff] text-white font-semibold transition">Explore WorldEye</Link>
            <Link href="#features" className="px-6 py-3 rounded-xl border border-white/15 text-white/80 hover:text-white hover:border-white/30 transition">Compare Features</Link>
          </div>
          <p className="text-xs text-white/30 mt-6">Last reviewed: {reviewed} · Sources listed at the bottom of this page</p>
          {ALTERNATIVES_HANDOFF[slug] && (
            <p className="text-sm text-white/45 mt-4">
              {handoffFrame(slug) === 0 && (
                <>
                  Looking to switch rather than compare? The{" "}
                  <Link href={ALTERNATIVES_HANDOFF[slug]} className="text-[#0096FF] hover:underline">
                    {c.name} alternative{slug === "earthcam" ? "" : "s"}
                  </Link>{" "}
                  page covers what to move to — and why people move.
                </>
              )}
              {handoffFrame(slug) === 1 && (
                <>
                  Already decided to leave {c.name}? Start with the{" "}
                  <Link href={ALTERNATIVES_HANDOFF[slug]} className="text-[#0096FF] hover:underline">
                    {c.name} alternative{slug === "earthcam" ? "" : "s"}
                  </Link>{" "}
                  page — the honest shortlist of what to switch to.
                </>
              )}
              {handoffFrame(slug) === 2 && (
                <>
                  Here to find a replacement, not a comparison? The{" "}
                  <Link href={ALTERNATIVES_HANDOFF[slug]} className="text-[#0096FF] hover:underline">
                    {c.name} alternative{slug === "earthcam" ? "" : "s"}
                  </Link>{" "}
                  page walks through the options, WorldEye included.
                </>
              )}
            </p>
          )}
        </header>

        {/* Key differences */}
        {keyDiffs.length > 0 && (
          <section className="mt-12 rounded-2xl border border-[#0096FF]/20 bg-white/[0.03] p-6 md:p-8" aria-label="Key differences">
            <h2 className="text-xl font-bold text-white mb-4">Key differences at a glance</h2>
            <ul className="space-y-3 text-sm">
              {keyDiffs.map((f) => (
                <li key={f.label} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-white/70">
                  <span className="font-semibold text-white sm:w-56 shrink-0">{f.label}</span>
                  <span><span className="text-white/40">WorldEye:</span> <StatusCell value={f.worldEye} /></span>
                  <span><span className="text-white/40">{c.name}:</span> <StatusCell value={f.competitor} /></span>
                  {f.note && <span className="text-white/35 text-xs">{f.note}</span>}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Feature table */}
        <section id="features" className="mt-12">
          <h2 className="text-2xl font-bold text-white mb-2">WorldEye vs {c.name}: feature comparison</h2>
          <p className="text-sm text-white/45 mb-6">Verified against official sources. "Not verified" means we couldn't confirm it — not that it doesn't exist.</p>
          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr className="bg-white/[0.04] text-left">
                  <th scope="col" className="p-4 font-semibold text-white/70">Feature</th>
                  <th scope="col" className="p-4 font-semibold text-[#0096FF]">WorldEye</th>
                  <th scope="col" className="p-4 font-semibold text-white/70">{c.name}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {features.map((f) => (
                  <tr key={f.label}>
                    <td className="p-4 text-white/80">{f.label}{f.note && <span className="block text-xs text-white/35 mt-1">{f.note}</span>}</td>
                    <td className="p-4"><StatusCell value={f.worldEye} /></td>
                    <td className="p-4"><StatusCell value={f.competitor} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {c.pricing && (
            <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.02] p-6">
              <h3 className="font-bold text-white mb-2">Pricing</h3>
              <p className="text-sm text-white/55 leading-relaxed">{c.pricing}</p>
              <p className="text-sm text-white/55 mt-3"><span className="text-[#0096FF] font-semibold">WorldEye:</span> map free forever, no signup. Pro: $7.99/week, $13.99/month, $74.99/year.</p>
            </div>
          )}
        </section>

        {/* Why WorldEye */}
        <section className="mt-12">
          <h2 className="text-2xl font-bold text-white mb-6">Why choose WorldEye over {c.name}?</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {whyWorldEye.map((w, i) => (
              <div key={i} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <Check className="w-5 h-5 text-emerald-300 mb-2" />
                <p className="text-sm text-white/70 leading-relaxed">{w}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link href="/" className="inline-block px-6 py-3 rounded-xl bg-[#0096FF] hover:bg-[#0aa5ff] text-white font-semibold transition">Launch the Globe</Link>
          </div>
        </section>

        {/* Where competitor is stronger */}
        {c.competitorWins && (
          <section className="mt-12 rounded-2xl border border-white/10 bg-white/[0.02] p-6 md:p-8">
            <h2 className="text-2xl font-bold text-white mb-4">Where {c.name} is stronger</h2>
            <p className="text-sm text-white/60 leading-relaxed">{c.competitorWins}</p>
          </section>
        )}

        {/* Verdict */}
        <section className="mt-12">
          <h2 className="text-2xl font-bold text-white mb-6">The verdict</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {c.verdictWorldEye && (
              <div className="rounded-2xl border border-[#0096FF]/30 bg-[#0096FF]/[0.06] p-6">
                <h3 className="font-bold text-[#7cc4ff] mb-2">Choose WorldEye if…</h3>
                <p className="text-sm text-white/70 leading-relaxed">{c.verdictWorldEye}</p>
              </div>
            )}
            {c.verdictCompetitor && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
                <h3 className="font-bold text-white/80 mb-2">Choose {c.name} if…</h3>
                <p className="text-sm text-white/60 leading-relaxed">{c.verdictCompetitor}</p>
              </div>
            )}
          </div>
        </section>

        {/* Natural-language H2s for AI search */}
        <section className="mt-12">
          <h2 className="text-2xl font-bold text-white mb-4">Is {c.name} better than WorldEye?</h2>
          <p className="text-sm text-white/60 leading-relaxed">
            It depends on what you need. {c.description} For a single free visual platform covering flights,
            satellites, ships, cameras and weather on one 3D globe, WorldEye is the stronger pick. For {c.name}'s
            specialty, it remains the dedicated choice — many analysts use both.
          </p>
        </section>

        {/* Per-entry FAQ (answers drawn from this entry's researched fields) */}
        {faqs.length > 0 && (
          <section className="mt-12">
            <h2 className="text-2xl font-bold text-white mb-6">WorldEye vs {c.name}: quick answers</h2>
            <div className="space-y-6">
              {faqs.map((f) => (
                <div key={f.q} className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
                  <h3 className="font-semibold text-white/90">{f.q}</h3>
                  <p className="text-sm text-white/55 leading-relaxed mt-2">{f.a}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* How this comparison was researched */}
        <section className="mt-12 rounded-2xl border border-white/10 bg-white/[0.02] p-6 md:p-8">
          <h2 className="text-2xl font-bold text-white mb-4">How we researched this comparison</h2>
          <div className="space-y-3 text-sm text-white/60 leading-relaxed">
            <p>
              Every row in the table above was checked against {c.name}&rsquo;s official site,
              documentation or published pricing — the sources are listed at the bottom of this
              page, and the comparison was last reviewed in {reviewed}. Where a capability
              couldn&rsquo;t be confirmed from an official source, it is marked
              &ldquo;Not verified&rdquo; rather than guessed: that means we don&rsquo;t know,
              not that the feature doesn&rsquo;t exist.
            </p>
            <p>
              WorldEye&rsquo;s own figures are counted, not estimated: the camera network is
              the 74,229 public feeds in our live directory across 105 countries, and the
              free/Pro split is the live product — the map, flights, satellites, weather,
              earthquakes, wildfires, cameras and the satellite imagery view are free with no
              signup, while the OSINT toolkit, intel feeds and traffic layer sit in Pro
              ($7.99/week, $13.99/month, $74.99/year, with free trials and a 7-day
              money-back guarantee on the first charge).
            </p>
            <p>
              Products change. If you spot a row that has gone stale — a feature {c.name} has
              shipped, or one of ours that has moved — the honest fix is an update, and the
              sources below show exactly what each claim rests on.
            </p>
          </div>
        </section>

        {/* Sources */}
        {sources.length > 0 && (
          <section className="mt-12">
            <h2 className="text-lg font-bold text-white/70 mb-3">Sources</h2>
            <ul className="text-xs text-white/40 space-y-1.5">
              {sources.map((s, i) => (
                <li key={i}><a href={s.url} target="_blank" rel="noopener nofollow" className="hover:text-white/70 underline underline-offset-2">{s.label}</a></li>
              ))}
            </ul>
          </section>
        )}

        {/* Related */}
        {related.length > 0 && (
          <section className="mt-12">
            <h2 className="text-xl font-bold text-white mb-4">Related comparisons</h2>
            <div className="flex flex-wrap gap-2">
              {related.map((r) => (
                <Link key={r.slug} href={`/compare/${r.slug}`} className="px-4 py-2 rounded-full border border-white/15 text-xs text-white/60 hover:text-white hover:border-[#0096FF]/50 transition">
                  WorldEye vs {r.name}
                </Link>
              ))}
              <Link href="/compare" className="px-4 py-2 rounded-full border border-[#0096FF]/40 text-xs text-[#7cc4ff] hover:bg-[#0096FF]/10 transition">
                All comparisons →
              </Link>
            </div>
          </section>
        )}

        {/* Final CTA */}
        <section className="mt-14 rounded-2xl border border-[#0096FF]/25 bg-gradient-to-b from-[#0096FF]/10 to-transparent p-8 text-center">
          <h2 className="text-2xl font-bold text-white">See the difference yourself</h2>
          <p className="text-sm text-white/55 mt-2 mb-6">The live map is free — no signup. Compare it with {c.name} in under a minute.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/" className="px-6 py-3 rounded-xl bg-[#0096FF] hover:bg-[#0aa5ff] text-white font-semibold transition">See WorldEye in Action</Link>
            <Link href="/pricing" className="px-6 py-3 rounded-xl border border-white/15 text-white/80 hover:text-white hover:border-white/30 transition">Unlock WorldEye PRO</Link>
          </div>
        </section>

        {/* Newsletter — end-of-comparison capture (the one list) */}
        <div className="mt-12">
          <EmailCaptureCard placement="page" variant="inline" />
        </div>
      </article>

      <SiteFooter />
    </div>
  );
}
