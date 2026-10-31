import LanguageHeaderControl from "@/components/translate/LanguageHeaderControl";
import Link from "next/link";
import { ArrowLeft, MessageCircleQuestion } from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import JsonLd from "@/components/JsonLd";
import RelatedLinks from "@/components/RelatedLinks";
import FaqAccordion from "@/app/(en)/faq/FaqClient";
import Button from "@/components/design/Button";
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
      a: (
        <RichText
          segments={f.a}
          locale={locale}
          linkClassName="text-[var(--we-blue-strong)] hover:underline"
          accentClassName="text-[var(--we-blue-strong)]"
        />
      ),
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
    <main
      className="docs-root min-h-screen relative overflow-x-clip"
      style={{ background: "var(--we-ink-0)", color: "var(--we-text-1)" }}
    >
      <JsonLd data={jsonLd} />
      <div className="relative max-w-3xl mx-auto px-6 py-10 md:py-16">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-12">
          <Link href={localizedPath("", locale)} className="flex items-center gap-2 text-sm transition text-[var(--we-text-2)] hover:text-[var(--we-text-1)]">
            <ArrowLeft className="w-4 h-4" /> {copy.topBar.backToMap}
          </Link>
          <div className="flex items-center gap-3">
            <Link href={localizedPath("", locale)} aria-label={copy.topBar.logoAria} className="shrink-0 inline-flex items-center"><img src="/worldeye-header-logo.png" alt="WorldEye" width={1063} height={290} className="h-6 w-auto" /></Link>
            <LanguageHeaderControl variant="mobile" />
          </div>
        </div>

        {/* Hero */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <p
            className="inline-flex items-center gap-2 px-4 py-1.5 mb-6 font-[family-name:var(--we-font-mono)] uppercase"
            style={{
              fontSize: "var(--we-size-micro)",
              letterSpacing: "var(--we-tracking-micro)",
              color: "var(--we-text-1)",
              border: "1px solid var(--we-line-3)",
              borderRadius: "var(--we-radius-full)",
              background: "var(--we-ink-2)",
            }}
          >
            <MessageCircleQuestion className="w-3.5 h-3.5" /> {copy.hero.badge}
          </p>
          <h1
            className="font-[family-name:var(--we-font-display)]"
            style={{
              color: "var(--we-text-1)",
              fontSize: "var(--we-size-display-1)",
              lineHeight: "var(--we-leading-display)",
              fontWeight: 560,
            }}
          >
            {copy.hero.h1Before}
            <span style={{ color: "var(--we-blue-strong)" }}>{copy.hero.h1Accent}</span>
          </h1>
          <p className="mt-4 text-base md:text-lg leading-relaxed text-[var(--we-text-2)]">
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
          <h2
            className="font-[family-name:var(--we-font-display)] mb-8"
            style={{ color: "var(--we-text-1)", fontSize: "var(--we-size-title)", lineHeight: "var(--we-leading-display)", fontWeight: 560 }}
          >
            {copy.viewAll.heading}
          </h2>
          <FaqAccordion groups={groups} />
        </div>

        {/* Help center band */}
        <div className="mt-16 text-center p-10" style={{ background: "var(--we-ink-2)", border: "1px solid var(--we-line-2)", borderRadius: "var(--we-radius-3)" }}>
          <h2 className="font-[family-name:var(--we-font-display)]" style={{ color: "var(--we-text-1)", fontSize: "var(--we-size-title)", lineHeight: "var(--we-leading-display)", fontWeight: 560 }}>{copy.helpCenter.heading}</h2>
          <p className="mt-2 mb-6 text-sm leading-relaxed max-w-xl mx-auto text-[var(--we-text-2)]">
            {copy.helpCenter.body}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button href={contactHref}>{copy.helpCenter.button}</Button>
            <Button variant="ghost" href={tutorialsHref}>
              {copy.helpCenter.tutorialsLabel}
            </Button>
          </div>
        </div>

        {/* Contact CTA */}
        <div className="mt-16 text-center p-10" style={{ background: "var(--we-ink-2)", border: "1px solid var(--we-line-2)", borderRadius: "var(--we-radius-3)" }}>
          <h2 className="font-[family-name:var(--we-font-display)]" style={{ color: "var(--we-text-1)", fontSize: "var(--we-size-title)", lineHeight: "var(--we-leading-display)", fontWeight: 560 }}>{copy.contactCta.heading}</h2>
          <p className="mt-2 mb-6 text-sm text-[var(--we-text-2)]">
            {copy.contactCta.sub}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button href="/contact">{copy.contactCta.button}</Button>
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
