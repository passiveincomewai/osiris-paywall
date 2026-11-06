import AisFeedNotice from "@/components/AisFeedNotice";
import VoiceQA from "@/components/seo/VoiceQA";
import LanguageHeaderControl from "@/components/translate/LanguageHeaderControl";
import { mergePlaceFaqs } from "@/lib/place-answers";
import { getVoiceQuestionsByIds, type VoiceQuestion } from "@/lib/voice-questions";
import Link from "next/link";
import {
  ArrowLeft,
  Ship,
  MapPin,
  Gauge,
  Compass,
  Anchor,
  Radio,
  Eye,
  TrendingUp,
  ChevronDown,
} from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import JsonLd from "@/components/JsonLd";
import BreadcrumbLd from "@/components/BreadcrumbLd";
import RelatedLinks from "@/components/RelatedLinks";
import TrackerClusterLinks from "@/components/TrackerClusterLinks";
import RichText from "./RichText";
import { localizedPath, type LocaleCode } from "@/i18n/config";
import { isPublished } from "@/i18n/manifest";
import { localizedUrl } from "@/lib/i18n-seo";
import type { ShipTrackerCopy } from "@/i18n/dictionaries/en/ship-tracker";
import { SHIPS } from "@/lib/ships/registry";
import { getChromeCopy } from "@/i18n/dictionaries";

/**
 * The ship tracker landing page, rendered from its dictionary in
 * both locales. Voice questions merge through the canonical dataset
 * exactly as the English page always has (translated via the
 * dictionary's voiceQuestions map when available). Honest framing is
 * preserved in every locale: the maritime feed is a Pro intel feed;
 * the globe around it is free. TrackerClusterLinks keeps its English
 * labels in this tranche.
 */

const VOICE_IDS = ["follow-a-ship-at-sea", "track-a-cruise-ship"];

const DATA_POINT_ICONS = [MapPin, Gauge, Compass, Ship, Anchor, Radio, Radio, Anchor, Eye];
const USE_CASE_ICONS = [Eye, TrendingUp, Anchor, Ship, TrendingUp, Compass];
const RELATED_SLUGS = [
  "satellite-tracker",
  "features",
  "pricing",
  "",
  "live-flight-tracker",
  "best-ship-tracking-tools",
  "what-is-ais",
];

export default function ShipTrackerPage({
  copy,
  locale,
}: {
  copy: ShipTrackerCopy;
  locale: LocaleCode;
}) {
  const canonical = getVoiceQuestionsByIds(VOICE_IDS);
  const localizedEntries: VoiceQuestion[] = canonical.map((e) => {
    const tr = copy.voiceQuestions[e.id];
    return tr
      ? { ...e, question: tr.question, shortAnswer: tr.shortAnswer, longAnswer: tr.longAnswer }
      : e;
  });
  const voiceMerged = mergePlaceFaqs(copy.faqs, localizedEntries);
  const pageUrl = localizedUrl("ship-tracker", locale);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        name: copy.schema.webPageName,
        description: copy.schema.webPageDescription,
        url: pageUrl,
        isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
      },
      {
        "@type": "FAQPage",
        url: pageUrl,
        mainEntity: voiceMerged.merged.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
    ],
  };

  const relHref = (slug: string) =>
    isPublished(slug, locale) ? localizedPath(slug, locale) : slug === "" ? "/" : `/${slug}`;

  return (
    <main className="docs-root min-h-screen bg-[#050508] text-zinc-100 relative overflow-x-clip">
      <JsonLd data={jsonLd} />
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full opacity-15 blur-[120px] bg-[#00E5FF]" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[300px] rounded-full opacity-10 blur-[100px] bg-[#D4AF37]" />
      </div>

      <div className="relative max-w-5xl mx-auto px-6 py-10 md:py-16">
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

        <BreadcrumbLd trail={[{ label: copy.breadcrumbLabel }]} />

        {/* Hero */}
        <div className="text-center max-w-2xl mx-auto">
          <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-[#00E5FF] border border-[#00E5FF]/30 rounded-full px-4 py-1.5 mb-6">
            <Ship className="w-3.5 h-5" /> {copy.hero.badge}
          </p>
          <h1 className="text-3xl md:text-6xl font-bold tracking-tight">
            <RichText segments={copy.hero.h1} locale={locale} accentClassName="text-[#00E5FF]" />
          </h1>
          <p className="text-white/55 mt-4 md:mt-5 text-base md:text-lg leading-relaxed px-1">
            {copy.hero.sub}
          </p>
          <div className="mt-8">
            <Link
              href={localizedPath("pricing", locale)}
              className="inline-block px-8 py-4 rounded-2xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black font-bold text-lg tracking-wide hover:brightness-110 transition shadow-[0_8px_32px_rgba(212,175,55,0.35)]"
            >
              {copy.hero.cta}
            </Link>
          </div>
        </div>

        {/* Feed-level honesty (audit A4): renders only while the AIS
            vessel feed is not configured/returning positions. */}
        <AisFeedNotice locale={locale} className="mt-10 max-w-3xl mx-auto" />

        {/* The one-map answer */}
        <div className="mt-16 md:mt-20 max-w-3xl mx-auto rounded-3xl border border-[#D4AF37]/25 bg-[#D4AF37]/[0.04] p-8 md:p-10">
          <h2 className="text-xl md:text-2xl font-bold">
            {copy.oneMap.heading}
          </h2>
          <p className="mt-3 text-white/60 leading-relaxed">
            <RichText
              segments={copy.oneMap.body}
              locale={locale}
              linkClassName="text-[#D4AF37] hover:underline"
            />
          </p>
        </div>

        {/* What you can see */}
        <div className="mt-20">
          <h2 className="text-2xl md:text-3xl font-bold text-center">
            <RichText segments={copy.dataPoints.heading} locale={locale} />
          </h2>
          <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {copy.dataPoints.cards.map((d, i) => {
              const Icon = DATA_POINT_ICONS[i] ?? MapPin;
              return (
                <div
                  key={d.title}
                  className="rounded-3xl border border-white/10 bg-white/[0.02] p-6"
                >
                  <Icon className="w-6 h-6 text-[#00E5FF] mb-4" />
                  <p className="font-semibold text-white/90 mb-2">{d.title}</p>
                  <p className="text-sm text-white/45 leading-relaxed">{d.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* How it works */}
        <div className="mt-20 max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
            <RichText segments={copy.howItWorks.heading} locale={locale} />
          </h2>
          <div className="space-y-4 text-white/60 leading-relaxed">
            {copy.howItWorks.paragraphs.map((p, i) => (
              <p key={i}>
                <RichText
                  segments={p}
                  locale={locale}
                  linkClassName="text-[#D4AF37] hover:underline"
                />
              </p>
            ))}
          </div>
        </div>

        {/* Use cases */}
        <div className="mt-20">
          <h2 className="text-2xl md:text-3xl font-bold text-center">
            <RichText segments={copy.useCases.heading} locale={locale} />
          </h2>
          <div className="mt-8 grid md:grid-cols-3 gap-5">
            {copy.useCases.cards.map((u, i) => {
              const Icon = USE_CASE_ICONS[i] ?? Eye;
              return (
                <div
                  key={u.title}
                  className="rounded-3xl border border-white/10 bg-white/[0.02] p-8"
                >
                  <Icon className="w-6 h-6 text-[#D4AF37] mb-4" />
                  <p className="font-semibold text-white/90 text-lg mb-2">{u.title}</p>
                  <p className="text-sm text-white/45 leading-relaxed">{u.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Follow a specific cruise ship */}
        <div className="mt-20 max-w-3xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold">
            <RichText segments={copy.cruiseShips.heading} locale={locale} />
          </h2>
          <p className="text-white/55 mt-4 leading-relaxed">{copy.cruiseShips.body}</p>
          <div className="flex flex-wrap justify-center gap-2.5 mt-8">
            {SHIPS.map((s) => (
              <Link
                key={s.slug}
                href={relHref(`ships/${s.slug}`)}
                className="px-4 py-2 rounded-full border border-white/15 text-sm text-white/75 hover:bg-white/5 hover:text-white transition"
              >
                {copy.cruiseShips.whereIs} {s.name}?
              </Link>
            ))}
          </div>
          <Link
            href={relHref("ships")}
            className="inline-block mt-6 text-sm font-semibold text-[#00E5FF] hover:underline"
          >
            {copy.cruiseShips.browseAll}
          </Link>
        </div>

        {/* FAQ */}
        <div className="mt-20 max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
            <RichText segments={copy.faqHeading} locale={locale} />
          </h2>
          <div className="space-y-3">
            {copy.faqs.map((f) => (
              <details
                key={f.q}
                className="border border-white/10 rounded-2xl bg-white/[0.02] overflow-hidden group"
              >
                <summary className="flex items-center justify-between gap-4 px-6 py-4 cursor-pointer list-none">
                  <span className="font-medium text-white/90">{f.q}</span>
                  <ChevronDown className="w-5 h-5 text-[#D4AF37] shrink-0 transition-transform group-open:rotate-180" />
                </summary>
                <p className="px-6 pb-5 text-sm text-white/60 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </div>

        {/* Closing CTA */}
        <div className="mt-20 max-w-2xl mx-auto text-center rounded-3xl border border-[#D4AF37]/30 bg-gradient-to-b from-[#D4AF37]/[0.08] to-transparent p-10">
          <h2 className="text-2xl md:text-3xl font-bold">
            <RichText segments={copy.closingCta.heading} locale={locale} />
          </h2>
          <p className="text-white/55 mt-3 mb-8">
            {copy.closingCta.sub}
          </p>
          <Link
            href={localizedPath("pricing", locale)}
            className="inline-block px-8 py-4 rounded-2xl bg-[#D4AF37] text-black font-bold hover:brightness-110 transition"
          >
            {copy.closingCta.cta}
          </Link>
          <p className="mt-6 text-sm text-white/40">
            {copy.closingCta.exploreBefore}
            <Link href={localizedPath("", locale)} className="text-[#D4AF37] hover:underline">
              {copy.closingCta.exploreLink}
            </Link>
          </p>
        </div>

        {voiceMerged.surviving.length > 0 && (
          <VoiceQA entries={voiceMerged.surviving} title={copy.voiceTitle} />
        )}

        <RelatedLinks
          links={copy.related.map((r, i) => ({
            label: r.label,
            desc: r.desc,
            href: relHref(RELATED_SLUGS[i] ?? "features"),
          }))}
        />

        <TrackerClusterLinks current="/ship-tracker" />
      </div>

      <SiteFooter copy={getChromeCopy(locale)} locale={locale} slug="ship-tracker" />
    </main>
  );
}
