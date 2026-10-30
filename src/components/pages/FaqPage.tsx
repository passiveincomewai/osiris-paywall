import LanguageHeaderControl from "@/components/translate/LanguageHeaderControl";
import Link from "next/link";
import { ArrowLeft, MessageCircleQuestion } from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import JsonLd from "@/components/JsonLd";
import RelatedLinks from "@/components/RelatedLinks";
import FaqAccordion from "@/app/(en)/faq/FaqClient";
import FaqSearch from "@/app/(en)/faq/FaqSearch";
import RichText from "./RichText";
import { localizedPath, type LocaleCode } from "@/i18n/config";
import { isPublished } from "@/i18n/manifest";
import { localizedUrl } from "@/lib/i18n-seo";
import type { FaqCopy } from "@/i18n/dictionaries/en/faq";
import { getChromeCopy } from "@/i18n/dictionaries";

const RELATED_HREFS = ["/features", "/contact", "/changelog", "/security"];

/**
 * The FAQ page body, rendered from the faq dictionary in both locales.
 * The FAQPage JSON-LD is built from the dictionary's plain-text
 * schemaA mirrors in visible group order. (The pre-i18n hand-kept
 * schema list interleaved two groups slightly differently; order
 * inside mainEntity carries no meaning, and keeping it identical to
 * the visible order is the stricter discipline — noted in the build
 * REPORT.)
 */
export default function FaqPage({
  copy,
  locale,
}: {
  copy: FaqCopy;
  locale: LocaleCode;
}) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    name: "WorldEye Frequently Asked Questions",
    url: localizedUrl("faq", locale),
    isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
    mainEntity: copy.groups.flatMap((g) =>
      g.faqs.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.schemaA },
      }))
    ),
  };

  const groups = copy.groups.map((g) => ({
    title: g.title,
    faqs: g.faqs.map((f) => ({
      q: f.q,
      a: <RichText segments={f.a} locale={locale} />,
    })),
  }));

  // Help-center surfaces: localized when published in this locale,
  // the English page otherwise (the RichText link discipline).
  const contactHref = isPublished("contact", locale)
    ? localizedPath("contact", locale)
    : "/contact";
  const tutorialsHref = isPublished("tutorials", locale)
    ? localizedPath("tutorials", locale)
    : "/tutorials";

  return (
    <main className="docs-root min-h-screen bg-[#050508] text-zinc-100 relative overflow-x-clip">
      <JsonLd data={jsonLd} />
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full opacity-15 blur-[120px] bg-[#D4AF37]" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[300px] rounded-full opacity-10 blur-[100px] bg-[#00E5FF]" />
      </div>

      <div className="relative max-w-3xl mx-auto px-6 py-10 md:py-16">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-12">
          <Link href={localizedPath("", locale)} className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition">
            <ArrowLeft className="w-4 h-4" /> {copy.topBar.backToMap}
          </Link>
          <div className="flex items-center gap-3">
            <Link href={localizedPath("", locale)} aria-label={copy.topBar.logoAria} className="shrink-0 inline-flex items-center"><img src="/worldeye-header-logo.png" alt="WorldEye" width={1063} height={290} className="h-6 w-auto" /></Link>
            <LanguageHeaderControl variant="mobile" />
          </div>
        </div>

        {/* Hero */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-[#D4AF37] border border-[#D4AF37]/30 rounded-full px-4 py-1.5 mb-6">
            <MessageCircleQuestion className="w-3.5 h-3.5" /> {copy.hero.badge}
          </p>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
            {copy.hero.h1Before}<span className="text-[#D4AF37]">{copy.hero.h1Accent}</span>
          </h1>
          <p className="text-white/55 mt-4 text-base md:text-lg leading-relaxed">
            {copy.hero.sub}
          </p>
        </div>

        <FaqSearch
          search={copy.search}
          recommended={copy.recommended}
          viewAll={copy.viewAll}
          helpCenter={copy.helpCenter}
          contactHref={contactHref}
          tutorialsHref={tutorialsHref}
        />

        <div id="faq-all" className="scroll-mt-24">
          <h2 className="text-xl md:text-2xl font-bold mb-8">
            <span className="text-[#D4AF37]">{copy.viewAll.heading}</span>
          </h2>
          <FaqAccordion groups={groups} />
        </div>

        {/* Help center band */}
        <div className="mt-16 text-center rounded-3xl border border-[#D4AF37]/30 bg-gradient-to-b from-[#D4AF37]/[0.07] to-transparent p-10">
          <h2 className="text-xl md:text-2xl font-bold">{copy.helpCenter.heading}</h2>
          <p className="text-white/55 mt-2 mb-6 text-sm leading-relaxed max-w-xl mx-auto">
            {copy.helpCenter.body}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href={contactHref}
              className="px-6 py-3 rounded-2xl bg-[#D4AF37] text-black text-sm font-bold hover:brightness-110 transition"
            >
              {copy.helpCenter.button}
            </Link>
            <Link
              href={tutorialsHref}
              className="px-6 py-3 rounded-2xl border border-white/15 text-sm font-semibold text-white/80 hover:border-[#D4AF37]/50 hover:text-white transition"
            >
              {copy.helpCenter.tutorialsLabel}
            </Link>
          </div>
        </div>

        {/* Contact CTA */}
        <div className="mt-16 text-center rounded-3xl border border-white/10 bg-white/[0.02] p-10">
          <h2 className="text-xl md:text-2xl font-bold">{copy.contactCta.heading}</h2>
          <p className="text-white/55 mt-2 mb-6 text-sm">
            {copy.contactCta.sub}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/contact"
              className="px-6 py-3 rounded-2xl bg-[#D4AF37] text-black text-sm font-bold hover:brightness-110 transition"
            >
              {copy.contactCta.button}
            </Link>
          </div>
        </div>

        <RelatedLinks
          links={copy.related.map((r, i) => ({
            label: r.label,
            desc: r.desc,
            href: RELATED_HREFS[i] ?? "/features",
          }))}
        />
      </div>

      <SiteFooter copy={getChromeCopy(locale)} locale={locale} slug="faq" />
    </main>
  );
}
