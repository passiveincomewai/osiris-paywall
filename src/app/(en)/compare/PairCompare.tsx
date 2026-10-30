import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Check,
  Minus,
  X,
  HelpCircle,
  ExternalLink,
  ThumbsUp,
  ThumbsDown,
  Scale,
} from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import EmailCaptureCard from "@/components/EmailCaptureCard";
import JsonLd from "@/components/JsonLd";
import PairLiveCams from "@/components/PairLiveCams";
import {
  getComparePair,
  listComparePairs,
  type ComparePairData,
  type PairLink,
} from "@/lib/compare-pairs-data";

/**
 * Competitor-vs-competitor comparison template (the X-vs-Y family),
 * wave-2 design. Structure, house rules: a fair head-to-head first —
 * VS hero with a one-line verdict, quick facts, key differences, about
 * cards, a feature-tally scorecard over the verified feature table,
 * both pricing blocks, pros/cons (or strengths prose on wave-1
 * entries), a "choose X if…" verdict pair and a natural-language
 * answer — then one clearly labelled section presenting WorldEye as
 * another option, with genuine WorldEye site imagery and, where the
 * pair entry curates them, live cameras from the WorldEye catalogue.
 * Then pair-specific FAQs, the research note and the source list.
 * Every row marked "Not verified" means we couldn't confirm it from an
 * official source, not that the feature doesn't exist.
 */

const STATUS_META: Record<
  string,
  { icon: "check" | "minus" | "x" | "help"; label: string; cls: string }
> = {
  yes: { icon: "check", label: "Yes", cls: "text-emerald-300" },
  partial: { icon: "minus", label: "Partial", cls: "text-amber-300" },
  no: { icon: "x", label: "No", cls: "text-red-300/70" },
  unverified: { icon: "help", label: "Not verified", cls: "text-white/35" },
};

function StatusCell({ value }: { value: string }) {
  const m = STATUS_META[value] ?? STATUS_META.unverified;
  const Icon =
    m.icon === "check"
      ? Check
      : m.icon === "minus"
        ? Minus
        : m.icon === "x"
          ? X
          : HelpCircle;
  return (
    <span className={`inline-flex items-center gap-1.5 ${m.cls}`}>
      <Icon className="w-4 h-4" />
      <span className="text-xs">{m.label}</span>
    </span>
  );
}

/** The default WorldEye imagery — genuine captures of the live site,
 *  used when a pair entry doesn't curate its own set. */
const DEFAULT_WORLDEYE_MEDIA = [
  {
    src: "/seo/worldeye-live-map.webp",
    alt: "The WorldEye live map — cameras, flights, ships and weather on one globe",
    caption: "The free WorldEye globe: every layer on one map",
  },
  {
    src: "/landing/track-flights.jpg",
    alt: "WorldEye flight tracking — live aircraft on the map",
    caption: "Live flight tracking in the same view",
  },
  {
    src: "/landing/osint-search.jpg",
    alt: "WorldEye OSINT search tools",
    caption: "The Pro OSINT toolkit, built into the map",
  },
];

export function pairMetadata(slug: string): Metadata {
  const p = getComparePair(slug);
  if (!p) return {};
  return {
    title: p.seoTitle,
    description: p.seoDescription,
    alternates: { canonical: `/compare/${slug}` },
    openGraph: {
      title: p.seoTitle,
      description: p.seoDescription,
      type: "article",
      url: `/compare/${slug}`,
      images: [{ url: "/seo/worldeye-live-map.webp" }],
    },
    twitter: {
      card: "summary_large_image",
      title: p.seoTitle,
      description: p.seoDescription,
      images: ["/seo/worldeye-live-map.webp"],
    },
  };
}

function reviewedLabel(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Resolve a side's WorldEye cross-link: explicit override wins, null
 *  hides it, absent falls back to the /compare/<slug> head-to-head. */
function sideLink(p: ComparePairData, side: "a" | "b"): PairLink | null {
  const override = side === "a" ? p.aLink : p.bLink;
  if (override !== undefined) return override;
  const slug = side === "a" ? p.aSlug : p.bSlug;
  const name = side === "a" ? p.aName : p.bName;
  return { href: `/compare/${slug}`, label: `WorldEye vs ${name}` };
}

type Tally = { yes: number; partial: number; no: number; unverified: number };

function tally(p: ComparePairData, side: "a" | "b"): Tally {
  const t: Tally = { yes: 0, partial: 0, no: 0, unverified: 0 };
  for (const f of p.features) {
    const v = f[side];
    if (v === "yes") t.yes++;
    else if (v === "partial") t.partial++;
    else if (v === "no") t.no++;
    else t.unverified++;
  }
  return t;
}

function TallyBar({ name, t }: { name: string; t: Tally }) {
  const total = Math.max(1, t.yes + t.partial + t.no + t.unverified);
  const seg = (n: number, cls: string) =>
    n > 0 ? (
      <span
        className={`block h-full ${cls}`}
        style={{ width: `${(n / total) * 100}%` }}
      />
    ) : null;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-semibold text-white text-sm">{name}</p>
        <p className="text-xs text-white/45">
          <span className="text-emerald-300">{t.yes} yes</span>
          {" · "}
          <span className="text-amber-300">{t.partial} partial</span>
          {" · "}
          <span className="text-red-300/70">{t.no} no</span>
          {t.unverified > 0 && (
            <>
              {" · "}
              <span className="text-white/35">{t.unverified} not verified</span>
            </>
          )}
        </p>
      </div>
      <div
        className="mt-2 flex h-2.5 w-full overflow-hidden rounded-full bg-white/[0.06]"
        role="img"
        aria-label={`${name}: ${t.yes} features confirmed, ${t.partial} partial, ${t.no} absent, ${t.unverified} not verified`}
      >
        {seg(t.yes, "bg-emerald-400/80")}
        {seg(t.partial, "bg-amber-400/80")}
        {seg(t.no, "bg-red-400/50")}
        {seg(t.unverified, "bg-white/15")}
      </div>
    </div>
  );
}

function ProsCons({
  name,
  pros,
  cons,
}: {
  name: string;
  pros: string[];
  cons: string[];
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 md:p-8">
      <h3 className="text-lg font-bold text-white mb-5">{name}: pros and cons</h3>
      <ul className="space-y-2.5">
        {pros.map((item) => (
          <li
            key={item}
            className="flex gap-2.5 text-sm text-white/65 leading-relaxed"
          >
            <ThumbsUp className="w-4 h-4 mt-0.5 shrink-0 text-emerald-300" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
      <ul className="space-y-2.5 mt-5">
        {cons.map((item) => (
          <li
            key={item}
            className="flex gap-2.5 text-sm text-white/65 leading-relaxed"
          >
            <ThumbsDown className="w-4 h-4 mt-0.5 shrink-0 text-red-300/70" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function PairComparePage({ slug }: { slug: string }) {
  const p: ComparePairData | null = getComparePair(slug);
  if (!p) notFound();

  const pageUrl = `https://worldeye.app/compare/${p.slug}`;
  const reviewed = reviewedLabel(p.lastReviewed);
  const keyDiffs = p.features.filter((f) => f.a !== f.b).slice(0, 4);
  const all = listComparePairs().filter((o) => o.slug !== p.slug);
  const sameSide = all.filter(
    (o) =>
      o.aSlug === p.aSlug ||
      o.bSlug === p.aSlug ||
      o.aSlug === p.bSlug ||
      o.bSlug === p.bSlug,
  );
  const restPairs = all.filter((o) => !sameSide.includes(o));
  const relatedOrdered = [...sameSide, ...restPairs];
  const aLink = sideLink(p, "a");
  const bLink = sideLink(p, "b");
  const media = p.worldEyeMedia ?? DEFAULT_WORLDEYE_MEDIA;
  const hasProsCons = !!(p.prosA && p.consA && p.prosB && p.consB);

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
  const relatedLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `More comparisons like ${p.aName} vs ${p.bName}`,
    itemListElement: relatedOrdered.slice(0, 12).map((o, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: `${o.aName} vs ${o.bName}`,
      url: `https://worldeye.app/compare/${o.slug}`,
    })),
  };

  return (
    <div
      className="docs-root min-h-screen"
      style={{
        background:
          "radial-gradient(1200px 600px at 50% -10%, #0a1a33 0%, #050810 55%, #03040a 100%)",
      }}
    >
      <JsonLd data={breadcrumbLd} />
      <JsonLd data={webPageLd} />
      {p.faqs.length > 0 && <JsonLd data={faqLd} />}
      {relatedOrdered.length > 0 && <JsonLd data={relatedLd} />}

      <article className="max-w-4xl mx-auto px-6 pt-14 md:pt-20 pb-8">
        <nav aria-label="Breadcrumb" className="text-xs text-white/35 mb-6">
          <Link href="/" className="hover:text-white/70">
            Home
          </Link>
          <span className="mx-2">/</span>
          <Link href="/compare" className="hover:text-white/70">
            Compare
          </Link>
          <span className="mx-2">/</span>
          <span className="text-white/60">
            {p.aName} vs {p.bName}
          </span>
        </nav>

        {/* Hero + direct answer */}
        <header className="text-center">
          <p className="text-[11px] font-bold tracking-[0.25em] text-[#0096FF] mb-4">
            {p.category.toUpperCase()} HEAD-TO-HEAD
          </p>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white leading-tight">
            {p.aName} vs {p.bName}{" "}
            <span className="text-white/40 text-2xl md:text-3xl">(2026)</span>
          </h1>

          {/* VS medallion */}
          <div className="mt-8 flex items-stretch justify-center gap-3 sm:gap-4 max-w-2xl mx-auto">
            <a
              href={p.aWebsite}
              target="_blank"
              rel="noopener nofollow"
              className="flex-1 rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] px-4 py-5 hover:border-[#0096FF]/40 transition group"
            >
              <span className="block text-base sm:text-lg font-extrabold text-white group-hover:text-[#7cc4ff] transition leading-snug">
                {p.aName}
              </span>
              <span className="mt-1.5 inline-flex items-center gap-1 text-xs text-white/40">
                Visit site <ExternalLink className="w-3 h-3" />
              </span>
            </a>
            <span className="self-center shrink-0 w-11 h-11 rounded-full bg-[#0096FF] text-white font-extrabold text-sm flex items-center justify-center shadow-[0_0_30px_rgba(0,150,255,0.45)]">
              VS
            </span>
            <a
              href={p.bWebsite}
              target="_blank"
              rel="noopener nofollow"
              className="flex-1 rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] px-4 py-5 hover:border-[#0096FF]/40 transition group"
            >
              <span className="block text-base sm:text-lg font-extrabold text-white group-hover:text-[#7cc4ff] transition leading-snug">
                {p.bName}
              </span>
              <span className="mt-1.5 inline-flex items-center gap-1 text-xs text-white/40">
                Visit site <ExternalLink className="w-3 h-3" />
              </span>
            </a>
          </div>

          <p className="text-white/55 mt-7 max-w-2xl mx-auto leading-relaxed">
            {p.intro}
          </p>
          {p.verdictLine && (
            <figure className="mt-7 max-w-2xl mx-auto rounded-2xl border border-[#0096FF]/25 bg-[#0096FF]/[0.05] px-6 py-5">
              <Scale className="w-5 h-5 text-[#0096FF] mx-auto mb-2" />
              <blockquote className="text-white/85 font-medium leading-relaxed">
                {p.verdictLine}
              </blockquote>
            </figure>
          )}
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link
              href="#features"
              className="px-6 py-3 rounded-xl bg-[#0096FF] hover:bg-[#0aa5ff] text-white font-semibold transition"
            >
              Compare Features
            </Link>
            <Link
              href="#pricing"
              className="px-6 py-3 rounded-xl border border-white/15 text-white/80 hover:text-white hover:border-white/30 transition"
            >
              Compare Pricing
            </Link>
          </div>
          <p className="text-xs text-white/30 mt-6">
            Last reviewed: {reviewed} · Sources listed at the bottom of this page
          </p>
        </header>

        {/* Quick facts */}
        {p.quickFacts && p.quickFacts.length > 0 && (
          <section className="mt-12" aria-label="Quick facts">
            <h2 className="text-xl font-bold text-white mb-4">Quick facts</h2>
            <div className="overflow-x-auto rounded-2xl border border-white/10">
              <table className="w-full text-sm min-w-[520px]">
                <thead>
                  <tr className="bg-white/[0.04] text-left">
                    <th scope="col" className="p-4 font-semibold text-white/70">
                      &nbsp;
                    </th>
                    <th scope="col" className="p-4 font-semibold text-white/85">
                      {p.aName}
                    </th>
                    <th scope="col" className="p-4 font-semibold text-white/85">
                      {p.bName}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {p.quickFacts.map((f) => (
                    <tr key={f.label}>
                      <td className="p-4 font-semibold text-white/60 whitespace-nowrap">
                        {f.label}
                      </td>
                      <td className="p-4 text-white/75">{f.a}</td>
                      <td className="p-4 text-white/75">{f.b}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Key differences */}
        {keyDiffs.length > 0 && (
          <section
            className="mt-12 rounded-2xl border border-[#0096FF]/20 bg-white/[0.03] p-6 md:p-8"
            aria-label="Key differences"
          >
            <h2 className="text-xl font-bold text-white mb-4">
              Key differences at a glance
            </h2>
            <ul className="space-y-3 text-sm">
              {keyDiffs.map((f) => (
                <li
                  key={f.label}
                  className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-white/70"
                >
                  <span className="font-semibold text-white sm:w-56 shrink-0">
                    {f.label}
                  </span>
                  <span>
                    <span className="text-white/40">{p.aName}:</span>{" "}
                    <StatusCell value={f.a} />
                  </span>
                  <span>
                    <span className="text-white/40">{p.bName}:</span>{" "}
                    <StatusCell value={f.b} />
                  </span>
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

        {/* Feature table + tally scorecard */}
        <section id="features" className="mt-12">
          <h2 className="text-2xl font-bold text-white mb-2">
            {p.aName} vs {p.bName}: feature comparison
          </h2>
          <p className="text-sm text-white/45 mb-6">
            Verified against official sources. “Not verified” means we couldn’t
            confirm it — not that it doesn’t exist.
          </p>
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 mb-6">
            <h3 className="text-sm font-bold tracking-wide text-white/70 mb-4">
              FEATURE TALLY — FROM THE TABLE BELOW
            </h3>
            <div className="space-y-5">
              <TallyBar name={p.aName} t={tally(p, "a")} />
              <TallyBar name={p.bName} t={tally(p, "b")} />
            </div>
            <p className="text-xs text-white/35 mt-4 leading-relaxed">
              A count of the rows in the verified table beneath — not a quality
              rating. The rows themselves, and what each product does best,
              matter more than the totals.
            </p>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr className="bg-white/[0.04] text-left">
                  <th scope="col" className="p-4 font-semibold text-white/70">
                    Feature
                  </th>
                  <th scope="col" className="p-4 font-semibold text-white/85">
                    {p.aName}
                  </th>
                  <th scope="col" className="p-4 font-semibold text-white/85">
                    {p.bName}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {p.features.map((f) => (
                  <tr key={f.label}>
                    <td className="p-4 text-white/80">
                      {f.label}
                      {f.note && (
                        <span className="block text-xs text-white/35 mt-1">
                          {f.note}
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <StatusCell value={f.a} />
                    </td>
                    <td className="p-4">
                      <StatusCell value={f.b} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="mt-12">
          <h2 className="text-2xl font-bold text-white mb-6">
            Pricing: {p.aName} vs {p.bName}
          </h2>
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

        {/* Pros/cons or strengths */}
        {hasProsCons ? (
          <section className="mt-12 grid md:grid-cols-2 gap-4">
            <ProsCons name={p.aName} pros={p.prosA!} cons={p.consA!} />
            <ProsCons name={p.bName} pros={p.prosB!} cons={p.consB!} />
          </section>
        ) : (
          <section className="mt-12 grid md:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 md:p-8">
              <h2 className="text-xl font-bold text-white mb-4">
                Where {p.aName} is stronger
              </h2>
              <p className="text-sm text-white/60 leading-relaxed">{p.aStrengths}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 md:p-8">
              <h2 className="text-xl font-bold text-white mb-4">
                Where {p.bName} is stronger
              </h2>
              <p className="text-sm text-white/60 leading-relaxed">{p.bStrengths}</p>
            </div>
          </section>
        )}

        {/* Verdict */}
        <section className="mt-12">
          <h2 className="text-2xl font-bold text-white mb-6">The verdict</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-[#0096FF]/25 bg-gradient-to-b from-[#0096FF]/[0.07] to-transparent p-6">
              <h3 className="font-bold text-white/85 mb-2">Choose {p.aName} if…</h3>
              <p className="text-sm text-white/60 leading-relaxed">{p.verdictA}</p>
            </div>
            <div className="rounded-2xl border border-[#0096FF]/25 bg-gradient-to-b from-[#0096FF]/[0.07] to-transparent p-6">
              <h3 className="font-bold text-white/85 mb-2">Choose {p.bName} if…</h3>
              <p className="text-sm text-white/60 leading-relaxed">{p.verdictB}</p>
            </div>
          </div>
        </section>

        {/* Natural-language answer for AI search */}
        <section className="mt-12">
          <h2 className="text-2xl font-bold text-white mb-4">
            Is {p.aName} better than {p.bName}?
          </h2>
          <p className="text-sm text-white/60 leading-relaxed">{p.betterAnswer}</p>
        </section>

        {/* WorldEye as another option — clearly labelled */}
        <section
          className="mt-12 rounded-2xl border border-[#0096FF]/30 bg-[#0096FF]/[0.06] p-6 md:p-8"
          aria-label="Another option: WorldEye"
        >
          <p className="text-[11px] font-bold tracking-[0.25em] text-[#0096FF] mb-3">
            ANOTHER OPTION
          </p>
          <h2 className="text-2xl font-bold text-white mb-4">Where WorldEye fits</h2>
          <p className="text-sm text-white/70 leading-relaxed">{p.worldEye}</p>

          {/* Genuine WorldEye site imagery */}
          <div className="grid sm:grid-cols-3 gap-3 mt-7">
            {media.map((m) => (
              <figure
                key={m.src}
                className="overflow-hidden rounded-xl border border-white/10 bg-black/30"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- static site imagery, no loader */}
                <img
                  src={m.src}
                  alt={m.alt}
                  loading="lazy"
                  className="w-full aspect-video object-cover"
                />
                <figcaption className="px-3 py-2 text-[11px] text-white/45 leading-snug">
                  {m.caption}
                </figcaption>
              </figure>
            ))}
          </div>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/"
              className="px-6 py-3 rounded-xl bg-[#0096FF] hover:bg-[#0aa5ff] text-white font-semibold transition"
            >
              Launch the Globe — Free
            </Link>
            <Link
              href="/pricing"
              className="px-6 py-3 rounded-xl border border-white/15 text-white/80 hover:text-white hover:border-white/30 transition"
            >
              See WorldEye Pro
            </Link>
          </div>

          {p.featuredCams && (
            <PairLiveCams
              categories={p.featuredCams.categories}
              ids={p.featuredCams.ids}
              title={p.featuredCams.title}
              blurb={p.featuredCams.blurb}
              pairSlug={p.slug}
            />
          )}

          {(aLink || bLink) && (
            <p className="text-xs text-white/35 mt-6">
              Full WorldEye head-to-heads:{" "}
              {[aLink, bLink]
                .filter((l): l is PairLink => !!l)
                .map((l, i) => (
                  <span key={l.href}>
                    {i > 0 && " · "}
                    <Link href={l.href} className="text-[#7cc4ff] hover:underline">
                      {l.label}
                    </Link>
                  </span>
                ))}
            </p>
          )}
        </section>

        {/* FAQ */}
        {p.faqs.length > 0 && (
          <section className="mt-12">
            <h2 className="text-2xl font-bold text-white mb-6">
              {p.aName} vs {p.bName}: quick answers
            </h2>
            <div className="space-y-6">
              {p.faqs.map((f) => (
                <div
                  key={f.q}
                  className="rounded-2xl border border-white/10 bg-white/[0.02] p-6"
                >
                  <h3 className="font-semibold text-white/90">{f.q}</h3>
                  <p className="text-sm text-white/55 leading-relaxed mt-2">{f.a}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Research note */}
        <section className="mt-12 rounded-2xl border border-white/10 bg-white/[0.02] p-6 md:p-8">
          <h2 className="text-2xl font-bold text-white mb-4">
            How we researched this comparison
          </h2>
          <div className="space-y-3 text-sm text-white/60 leading-relaxed">
            <p>
              Every row in the table above was checked against {p.aName}’s and{" "}
              {p.bName}’s official sites, documentation or published pricing —
              the sources are listed at the bottom of this page, and the
              comparison was last reviewed in {reviewed}. Where a capability
              couldn’t be confirmed from an official source, it is marked “Not
              verified” rather than guessed.
            </p>
            <p>
              This page is published by WorldEye, so the head-to-head above is
              kept deliberately neutral: each product’s strengths are stated in
              its own terms, and WorldEye appears only in the labelled “another
              option” section. WorldEye’s own figures there are counted, not
              estimated — 74,229 public cameras in its live directory across 105
              countries, and a free map (flights, satellites, ships, weather,
              earthquakes, wildfires, cameras and satellite imagery) with an
              optional Pro tier at $7.99/week, $13.99/month or $74.99/year.
            </p>
            <p>
              Products change. If you spot a row that has gone stale, the sources
              below show exactly what each claim rests on.
            </p>
          </div>
        </section>

        {/* Sources */}
        {p.sources.length > 0 && (
          <section className="mt-12">
            <h2 className="text-lg font-bold text-white/70 mb-3">Sources</h2>
            <ul className="text-xs text-white/40 space-y-1.5">
              {p.sources.map((s, i) => (
                <li key={i}>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener nofollow"
                    className="hover:text-white/70 underline underline-offset-2"
                  >
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Related */}
        <section className="mt-12">
          <h2 className="text-xl font-bold text-white mb-4">Related comparisons</h2>
          {sameSide.length > 0 && (
            <>
              <h3 className="text-sm font-semibold text-white/50 mb-3">
                More with {p.aName} or {p.bName}
              </h3>
              <div className="flex flex-wrap gap-2 mb-6">
                {sameSide.map((o) => (
                  <Link
                    key={o.slug}
                    href={`/compare/${o.slug}`}
                    className="px-4 py-2 rounded-full border border-[#0096FF]/30 text-xs text-[#7cc4ff] hover:bg-[#0096FF]/10 transition"
                  >
                    {o.aName} vs {o.bName}
                  </Link>
                ))}
              </div>
            </>
          )}
          <div className="flex flex-wrap gap-2">
            {[aLink, bLink]
              .filter((l): l is PairLink => !!l)
              .map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="px-4 py-2 rounded-full border border-white/15 text-xs text-white/60 hover:text-white hover:border-[#0096FF]/50 transition"
                >
                  {l.label}
                </Link>
              ))}
            {restPairs.slice(0, 10).map((o) => (
              <Link
                key={o.slug}
                href={`/compare/${o.slug}`}
                className="px-4 py-2 rounded-full border border-white/15 text-xs text-white/60 hover:text-white hover:border-[#0096FF]/50 transition"
              >
                {o.aName} vs {o.bName}
              </Link>
            ))}
            <Link
              href="/compare"
              className="px-4 py-2 rounded-full border border-[#0096FF]/40 text-xs text-[#7cc4ff] hover:bg-[#0096FF]/10 transition"
            >
              All comparisons →
            </Link>
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
