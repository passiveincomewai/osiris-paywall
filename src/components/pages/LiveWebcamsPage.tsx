import LanguageHeaderControl from "@/components/translate/LanguageHeaderControl";
import Link from "next/link";
import { ArrowRight, Camera, CheckCircle2, Compass, Globe, ShieldCheck } from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import EmailCaptureCard from "@/components/EmailCaptureCard";
import TrialCtaSection from "@/components/TrialCtaSection";
import DirectoryExplorer from "@/components/DirectoryExplorer";
import DirectorySearch from "@/components/DirectorySearch";
import CountriesDirectory from "@/components/CountriesDirectory";
import type { CountryDirectoryEntry } from "@/lib/country-directory";
import { isConsolidatedCountry } from "@/lib/indexation-gates";
import countriesIndex from "@/data/camera-countries.json";
import DirectAnswers from "@/components/seo/DirectAnswers";
import {
  CATALOGUE_GENERATED_AT,
  COUNTRY_INDEX,
  EXPLORE_SCOPES,
  areasForDef,
} from "@/lib/explore-data";
import { localizedPath, type LocaleCode } from "@/i18n/config";
import { localizedUrl } from "@/lib/i18n-seo";
import type { LiveWebcamsCopy } from "@/i18n/dictionaries/en/live-webcams";
import { getChromeCopy } from "@/i18n/dictionaries";
import { fill } from "@/i18n/dictionaries/types";

/* Data source: the generated camera index (camera-countries.json +
   the per-country records) — the same catalogue the country pages
   and the explorer below serve. The headline total is the owner's
   published served-camera figure; per-country counts are the
   index's own. Copy comes from the live-webcams dictionary; the
   catalogue numbers are filled into its {placeholders} at render
   time and formatted for the locale (74,229 / 74.229). The directory
   islands (DirectoryExplorer / DirectorySearch) keep their internal
   English UI in this tranche — see the build REPORT. */
const HEADLINE = 74229;
const EUROPE_COUNT = (EXPLORE_SCOPES.europe.slugs as string[]).length;

const FEATURE_ICONS = [Globe, Compass, ShieldCheck];
const EXPLORE_HREFS = [
  "/cameras/countries",
  "/world-city-webcams",
  "/live-traffic-cameras",
  "/europe-live-cameras",
  "/sunrise-around-the-world",
  "/live-flight-tracker",
];

export default async function LiveWebcamsPage({
  copy,
  locale,
}: {
  copy: LiveWebcamsCopy;
  locale: LocaleCode;
}) {
  const fmt = (n: number) => n.toLocaleString(locale === "en" ? "en-US" : "es-ES");
  const areas = await areasForDef(EXPLORE_SCOPES.all, 400);
  const top10 = [...COUNTRY_INDEX].sort((a, b) => b.count - a.count).slice(0, 10);
  /* The full country directory below the Top-10: the same entries
     /cameras/countries renders (the generated index's rows + aliases,
     consolidated countries unlinked), fed to the same CountriesDirectory
     island — search by country or top city, region filter, sort by
     count. Its UI strings stay English like this page's other directory
     islands (see the header comment); the section heading follows the
     same tranche rule. */
  const aliasesBySlug = new Map(
    (
      countriesIndex as unknown as {
        countries: Array<{ slug: string; aliases?: string[] }>;
      }
    ).countries.map((c) => [c.slug, c.aliases ?? []]),
  );
  const directoryEntries: CountryDirectoryEntry[] = COUNTRY_INDEX.map((c) => ({
    slug: c.slug,
    name: c.name,
    count: c.count,
    topCities: c.topCities,
    aliases: aliasesBySlug.get(c.slug) ?? [],
    hasPage: !isConsolidatedCountry(c.slug),
  }));
  const tokens = {
    count: fmt(HEADLINE),
    countries: String(COUNTRY_INDEX.length),
    topCount: fmt(top10[0].count),
    europeCount: String(EUROPE_COUNT),
  };
  const t = (s: string) => fill(s, tokens);
  const pageUrl = localizedUrl("live-webcams", locale);

  const jsonLd = {
    "@context": "https://schema.org",
    // Single @graph for this page: exactly ONE FAQPage, built from the
    // same FAQS array rendered below so schema matches visible questions.
    "@graph": [
      {
        "@type": "CollectionPage",
        name: t(copy.schema.name),
        description: t(copy.schema.description),
        url: pageUrl,
        isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
        numberOfItems: HEADLINE,
        dateModified: CATALOGUE_GENERATED_AT,
      },
      {
        "@type": "FAQPage",
        url: pageUrl,
        mainEntity: [...copy.faqs, ...copy.topAnswers].map((f) => ({
          "@type": "Question",
          name: t(f.q),
          acceptedAnswer: { "@type": "Answer", text: t(f.a) },
        })),
      },
    ],
  };

  return (
    <main className="docs-root min-h-screen bg-[#05070d] text-zinc-100">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="max-w-4xl mx-auto px-6 py-10 md:py-16">
        <div className="flex items-center justify-between mb-10">
          <Link href="/cameras" className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition">
            <Camera className="w-4 h-4" /> {copy.topBar.camerasLink}
          </Link>
          <div className="flex items-center gap-3">
            <Link href={localizedPath("", locale)} aria-label={copy.topBar.logoAria} className="shrink-0 inline-flex items-center"><img src="/worldeye-header-logo.png" alt="WorldEye" width={1063} height={290} className="h-6 w-auto" /></Link>
            <LanguageHeaderControl variant="mobile" />
          </div>
        </div>

        {/* Hero */}
        <div className="max-w-3xl">
          <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-[#D4AF37] border border-[#D4AF37]/30 rounded-full px-4 py-1.5 mb-6">
            <Camera className="w-3.5 h-3.5" /> {copy.hero.badge}
          </p>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
            {t(copy.hero.h1Before)}<span className="text-[#D4AF37]">{copy.hero.h1Accent}</span>
          </h1>
          <p className="text-white/55 mt-5 text-base md:text-lg leading-relaxed">
            {t(copy.hero.intro1)}
          </p>
          <p className="text-white/55 mt-4 text-base md:text-lg leading-relaxed">
            {t(copy.hero.intro2)}
          </p>
          <DirectAnswers
            className="mt-10"
            headingClassName="text-xl md:text-2xl font-bold leading-snug"
            label={copy.quickAnswersLabel}
            items={copy.topAnswers.map((f) => ({ q: t(f.q), a: t(f.a) }))}
          />
          <DirectorySearch
            label={copy.search.label}
            options={areas}
            placeholder={copy.search.placeholder}
            emptyText={copy.search.emptyText}
            targetId="all-explorer"
          />
        </div>

        {/* Why cards */}
        <div className="mt-14 grid md:grid-cols-3 gap-5">
          {copy.features.map((f, i) => {
            const Icon = FEATURE_ICONS[i] ?? Globe;
            return (
              <div key={f.title} className="rounded-2xl border border-white/10 bg-white/[0.02] p-7">
                <span className="w-10 h-10 rounded-2xl bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-[#D4AF37]" />
                </span>
                <h2 className="text-lg font-bold mt-5">{f.title}</h2>
                <p className="text-sm text-white/55 leading-relaxed mt-2">{f.desc}</p>
              </div>
            );
          })}
        </div>

        {/* Top 10 mini-table */}
        <div className="mt-16">
          <h2 className="text-2xl md:text-3xl font-bold">
            {copy.topTable.heading}
          </h2>
          <p className="text-white/50 mt-2 text-sm md:text-base">
            {copy.topTable.subBefore}
            <Link href="/cameras/countries" className="text-[#D4AF37] hover:underline">
              {t(copy.topTable.subLink)}
            </Link>
            {copy.topTable.subAfter}
          </p>
          <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
            <table className="w-full text-sm md:text-base">
              <thead>
                <tr className="bg-white/[0.04] text-left text-xs uppercase tracking-wider text-white/45">
                  <th scope="col" className="px-4 md:px-6 py-4 font-semibold">{copy.topTable.countryHeader}</th>
                  <th scope="col" className="px-4 md:px-6 py-4 font-semibold text-right">{copy.topTable.camerasHeader}</th>
                </tr>
              </thead>
              <tbody>
                {top10.map((c) => (
                  <tr key={c.slug} className="border-t border-white/[0.06] hover:bg-white/[0.03] transition">
                    <td className="px-4 md:px-6 py-3.5 font-medium">
                      <Link href={`/cameras/countries/${c.slug}`} className="text-[#D4AF37] hover:underline">
                        {c.name}
                      </Link>
                    </td>
                    <td className="px-4 md:px-6 py-3.5 text-right tabular-nums text-white/85">
                      {fmt(c.count)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Every country, searchable — the full directory with the
            same search / region-filter / sort the country index page
            offers, so a visitor can jump from here to any country's
            own page without leaving to hunt for it. */}
        <div className="mt-16">
          <h2 className="text-2xl md:text-3xl font-bold">
            Browse all {COUNTRY_INDEX.length} countries
          </h2>
          <p className="text-white/50 mt-2 text-sm md:text-base">
            Search by country or by its biggest camera city, filter by
            region, or sort by camera count — every row opens that
            country&apos;s own live camera page.
          </p>
          <CountriesDirectory countries={directoryEntries} />
        </div>

        {/* Full directory, live */}
        <div className="mt-16">
          <h2 className="text-2xl md:text-3xl font-bold">{copy.explorer.heading}</h2>
          <p className="text-white/50 mt-2 text-sm md:text-base">
            {copy.explorer.sub}
          </p>
          <div className="mt-6">
            <DirectoryExplorer
              scopeKey="all"
              scopeLabel={copy.search.scopeLabel}
              groupBy="country"
              searchPlaceholder={copy.search.explorerPlaceholder}
              explorerId="all-explorer"
            />
          </div>
        </div>

        {/* Explore more */}
        <div className="mt-16">
          <h2 className="text-2xl md:text-3xl font-bold">{copy.exploreHeading}</h2>
          <div className="mt-6 grid sm:grid-cols-2 gap-5">
            {copy.exploreCards.map((card, i) => (
              <Link
                key={card.title}
                href={EXPLORE_HREFS[i] ?? "/cameras"}
                className="rounded-2xl border border-white/10 bg-white/[0.02] p-7 hover:border-[#D4AF37]/40 transition group"
              >
                <h3 className="font-bold text-lg group-hover:text-[#D4AF37] transition">
                  {card.title}
                </h3>
                <p className="text-sm text-white/55 mt-2 leading-relaxed">
                  {t(card.desc)}
                </p>
              </Link>
            ))}
          </div>
        </div>

        {/* How a feed earns its place */}
        <div className="mt-16">
          <h2 className="text-2xl md:text-3xl font-bold">{copy.earn.heading}</h2>
          <div className="mt-6 space-y-4 text-white/60 leading-relaxed max-w-3xl">
            {copy.earn.paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
          <p className="mt-6 text-sm text-white/50 leading-relaxed max-w-3xl">
            {copy.indexLink.before}
            <Link href="/live-camera-index" className="text-[#D4AF37] hover:underline">
              {copy.indexLink.link}
            </Link>
            {copy.indexLink.after}
          </p>
        </div>

        {/* Direct answers (AEO) */}
        <DirectAnswers
          className="mt-16"
          headingClassName="text-xl md:text-2xl font-bold leading-snug"
          label={copy.quickAnswersLabel}
          items={copy.directAnswers.map((f) => ({ q: t(f.q), a: t(f.a) }))}
        />

        {/* FAQs */}
        <div className="mt-16">
          <h2 className="text-2xl md:text-3xl font-bold">{copy.faqsHeading}</h2>
          <div className="mt-6 space-y-4">
            {copy.faqs.map((f) => (
              <details
                key={f.q}
                className="rounded-2xl border border-white/10 bg-white/[0.02] px-6 py-5 group"
              >
                <summary className="font-semibold cursor-pointer list-none flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-[#D4AF37] shrink-0" />
                  {t(f.q)}
                </summary>
                <p className="text-sm text-white/55 leading-relaxed mt-3 pl-7">{t(f.a)}</p>
              </details>
            ))}
          </div>
        </div>

        <TrialCtaSection utmSource="live-webcams" />

        {/* CTA */}
        <div className="mt-16 text-center rounded-3xl border border-[#D4AF37]/30 bg-gradient-to-b from-[#D4AF37]/[0.08] to-transparent p-10 md:p-14">
          <h2 className="text-2xl md:text-4xl font-bold tracking-tight">
            {copy.cta.headingBefore}<span className="text-[#D4AF37]">{copy.cta.headingAccent}</span>
          </h2>
          <p className="text-white/55 mt-4 max-w-xl mx-auto">
            {copy.cta.sub}
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href={localizedPath("", locale)}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black font-bold text-lg tracking-wide hover:brightness-110 transition shadow-[0_8px_32px_rgba(212,175,55,0.35)]"
            >
              {copy.cta.primaryCta} <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/cameras"
              className="inline-flex items-center gap-2 px-6 py-4 rounded-2xl border border-white/15 text-white/75 hover:text-white hover:border-white/30 transition font-semibold"
            >
              {copy.cta.secondaryCta}
            </Link>
          </div>
        </div>

        {/* Newsletter — end-of-page capture. EN only: the card's copy
            is not dictionary-driven, and the localized footer form
            already serves the other locales on this page. */}
        {locale === "en" && (
          <div className="mt-16">
            <EmailCaptureCard placement="page" variant="inline" />
          </div>
        )}
      </div>
      <SiteFooter copy={getChromeCopy(locale)} locale={locale} slug="live-webcams" />
    </main>
  );
}
