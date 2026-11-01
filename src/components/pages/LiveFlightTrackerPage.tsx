import VoiceQA from "@/components/seo/VoiceQA";
import LanguageHeaderControl from "@/components/translate/LanguageHeaderControl";
import { mergePlaceFaqs } from "@/lib/place-answers";
import { getVoiceQuestionsByIds, type VoiceQuestion } from "@/lib/voice-questions";
import Link from "next/link";
import {
  ArrowLeft,
  Plane,
  Radar,
  Gauge,
  Navigation,
  Route,
  Users,
  ChevronDown,
  ArrowRight,
  Radio,
  Clock,
  ShieldCheck,
} from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import JsonLd from "@/components/JsonLd";
import BreadcrumbLd from "@/components/BreadcrumbLd";
import RelatedLinks from "@/components/RelatedLinks";
import TrackerClusterLinks from "@/components/TrackerClusterLinks";
import FlightsNowBoard from "@/components/trackers/FlightsNowBoard";
import MediaFrame from "@/components/design/MediaFrame";
import RichText from "./RichText";
import { localizedPath, type LocaleCode } from "@/i18n/config";
import { isPublished } from "@/i18n/manifest";
import { localizedUrl } from "@/lib/i18n-seo";
import type { LiveFlightTrackerCopy } from "@/i18n/dictionaries/en/live-flight-tracker";
import type { RichText as RichTextSegments } from "@/i18n/dictionaries/types";
import { getChromeCopy } from "@/i18n/dictionaries";

/**
 * The live flight tracker landing page, rendered from its dictionary
 * in both locales. The canonical voice questions stay data-owned
 * (src/lib/voice-questions.ts); the body translates the surviving
 * entries through the dictionary's voiceQuestions map when it has
 * them, then merges exactly as the English page always has — so the
 * visible VoiceQA block and the FAQPage schema can never diverge.
 * TrackerClusterLinks keeps its English labels in this tranche.
 */

const VOICE_IDS = [
  "best-way-to-track-flights",
  "which-plane-is-flying-over-me",
  "follow-a-specific-flight",
  "what-is-ads-b",
];

const WHAT_YOU_SEE_ICONS = [Navigation, Gauge, Plane, Route];
const USE_CASE_ICONS = [Users, Clock, Radio];
const RELATED_SLUGS = [
  "satellite-tracker",
  "earthquake-tracker",
  "cameras",
  "features",
  "live-plane-spotting",
  "ship-tracker",
];

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <details className="group border border-white/10 rounded-2xl bg-white/[0.02] overflow-hidden">
      <summary className="flex items-center justify-between gap-4 px-6 py-4 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
        <span className="font-medium text-white/90">{q}</span>
        <ChevronDown className="w-5 h-5 text-[#D4AF37] shrink-0 transition-transform group-open:rotate-180" />
      </summary>
      <p className="px-6 pb-5 text-sm text-white/60 leading-relaxed">{a}</p>
    </details>
  );
}

export default function LiveFlightTrackerPage({
  copy,
  locale,
}: {
  copy: LiveFlightTrackerCopy;
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
  const pageUrl = localizedUrl("live-flight-tracker", locale);

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

  const prose = (segments: RichTextSegments, key: number) => (
    <p key={key}>
      <RichText
        segments={segments}
        locale={locale}
        strongClassName="text-white/90"
        linkClassName="text-[#00E5FF] hover:underline"
      />
    </p>
  );

  return (
    <main className="docs-root min-h-screen bg-[#050508] text-zinc-100 relative overflow-x-clip">
      <JsonLd data={jsonLd} />
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full opacity-15 blur-[120px] bg-[#00E5FF]" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[300px] rounded-full opacity-10 blur-[100px] bg-[#D4AF37]" />
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
        <div className="text-center max-w-3xl mx-auto">
          <img
            src="/worldeye-eye.png"
            alt="WorldEye"
            width={600}
            height={432}
            className="h-14 md:h-16 w-auto mx-auto mb-6"
            style={{ filter: "drop-shadow(0 0 18px rgba(0,150,255,0.45))" }}
          />
          <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-[#00E5FF] border border-[#00E5FF]/30 rounded-full px-4 py-1.5 mb-6">
            <Radar className="w-3.5 h-3.5" /> {copy.hero.badge}
          </p>
          <h1 className="text-3xl md:text-6xl font-bold tracking-tight">
            <RichText
              segments={copy.hero.h1}
              locale={locale}
              accentClassName="text-[#00E5FF]"
            />
          </h1>
          <p className="text-white/55 mt-4 md:mt-5 text-base md:text-lg leading-relaxed px-1">
            {copy.hero.sub}
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href={localizedPath("", locale)}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black font-bold text-lg tracking-wide hover:brightness-110 active:scale-[0.99] transition shadow-[0_8px_32px_rgba(212,175,55,0.35)]"
            >
              {copy.hero.ctaPrimary} <ArrowRight className="w-5 h-5" />
            </Link>
            <span className="text-sm text-white/40">{copy.hero.freeNote}</span>
          </div>
        </div>

        {/* The feature, as it runs — a real capture of the flight
            layer on the live globe. */}
        <div className="mt-12 md:mt-16">
          <MediaFrame caption={copy.heroImage.caption} source="WorldEye">
            <img
              src="/landing/track-flights.jpg"
              alt={copy.heroImage.alt}
              width={1280}
              height={640}
              loading="lazy"
              className="block w-full h-auto"
            />
          </MediaFrame>
        </div>

        {/* The one-map answer */}
        <div className="mt-16 md:mt-20 max-w-3xl mx-auto rounded-3xl border border-[#00E5FF]/25 bg-[#00E5FF]/[0.04] p-8 md:p-10">
          <h2 className="text-xl md:text-2xl font-bold">
            {copy.oneMap.heading}
          </h2>
          <p className="mt-3 text-white/60 leading-relaxed">
            <RichText
              segments={copy.oneMap.body}
              locale={locale}
              linkClassName="text-[#00E5FF] hover:underline"
            />
          </p>
        </div>

        {/* Happening now — the live feed itself (site-audit R22:
            the earthquake tracker's live-board pattern, applied to
            the site's own flight feed). */}
        <div className="mt-20 md:mt-28">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
            {locale === "es" ? (
              <>Ahora mismo — <span className="text-[#00E5FF]">vuelos en vivo</span></>
            ) : (
              <>Happening now — <span className="text-[#00E5FF]">live flights</span></>
            )}
          </h2>
          <FlightsNowBoard />
        </div>

        {/* Satellite view — the direct answer */}
        <div className="mt-20 md:mt-28 max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center">
            {copy.satelliteView.heading}
          </h2>
          <div className="mt-8 space-y-4 text-white/60 leading-relaxed">
            {copy.satelliteView.paragraphs.map((p, i) => prose(p, i))}
          </div>
        </div>

        {/* How it works */}
        <div className="mt-20 md:mt-28 max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center">
            {copy.howItWorks.heading}
          </h2>
          <div className="mt-8 space-y-4 text-white/60 leading-relaxed">
            {copy.howItWorks.paragraphs.map((p, i) => prose(p, i))}
          </div>
        </div>

        {/* How to use */}
        <div className="mt-20 md:mt-28 max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center">
            {copy.howToUse.heading}
          </h2>
          <div className="mt-8 space-y-4 text-white/60 leading-relaxed">
            {copy.howToUse.paragraphs.map((p, i) => prose(p, i))}
          </div>
        </div>

        {/* What you can see */}
        <div className="mt-20 md:mt-28">
          <h2 className="text-2xl md:text-3xl font-bold text-center">
            {copy.whatYouSee.heading}
          </h2>
          <div className="mt-8 grid sm:grid-cols-2 gap-5">
            {copy.whatYouSee.cards.map((f, i) => {
              const Icon = WHAT_YOU_SEE_ICONS[i] ?? Navigation;
              return (
                <div
                  key={f.title}
                  className="rounded-3xl border border-white/10 bg-white/[0.02] p-7"
                >
                  <Icon className="w-7 h-7 text-[#00E5FF]" />
                  <h3 className="mt-4 font-semibold text-white/90 text-lg">{f.title}</h3>
                  <p className="mt-2 text-sm text-white/50 leading-relaxed">{f.body}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Use cases */}
        <div className="mt-20 md:mt-28">
          <h2 className="text-2xl md:text-3xl font-bold text-center">
            {copy.useCases.heading}
          </h2>
          <div className="mt-8 grid md:grid-cols-3 gap-5">
            {copy.useCases.cards.map((u, i) => {
              const Icon = USE_CASE_ICONS[i] ?? Users;
              return (
                <div
                  key={u.title}
                  className="rounded-3xl border border-white/10 bg-white/[0.02] p-7"
                >
                  <Icon className="w-7 h-7 text-[#D4AF37]" />
                  <h3 className="mt-4 font-semibold text-white/90 text-lg">{u.title}</h3>
                  <p className="mt-2 text-sm text-white/50 leading-relaxed">{u.body}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Reading a flight + limitations */}
        <div className="mt-20 md:mt-28 max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center">
            {copy.reading.heading}
          </h2>
          <div className="mt-8 space-y-4 text-white/60 leading-relaxed">
            {copy.reading.paragraphs.map((p, i) => prose(p, i))}
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-20 md:mt-28 max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
            {copy.faqHeading}
          </h2>
          <div className="space-y-3">
            {copy.faqs.map((f) => (
              <Faq key={f.q} q={f.q} a={f.a} />
            ))}
          </div>
        </div>

        {/* Questions the map answers */}
        <div className="mt-20 md:mt-28 max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center">
            {copy.questionsMap.heading}
          </h2>
          <div className="mt-8 space-y-4 text-white/60 leading-relaxed">
            {copy.questionsMap.paragraphs.map((p, i) => prose(p, i))}
          </div>
        </div>

        {/* Pro upgrade strip */}
        <div className="mt-20 rounded-3xl border border-[#D4AF37]/30 bg-gradient-to-b from-[#D4AF37]/[0.08] to-transparent p-8 md:p-10 text-center">
          <p className="text-xs font-bold tracking-[0.25em] text-[#D4AF37] mb-3">{copy.proStrip.eyebrow}</p>
          <h2 className="text-2xl md:text-3xl font-bold">
            {copy.proStrip.heading}
          </h2>
          <p className="text-white/55 mt-3 max-w-2xl mx-auto">
            <RichText
              segments={copy.proStrip.body}
              locale={locale}
              linkClassName="text-[#D4AF37] hover:underline"
            />
          </p>
          <Link
            href={localizedPath("pricing", locale)}
            className="inline-flex items-center gap-2 mt-6 px-7 py-3 rounded-2xl bg-[#D4AF37] text-black font-bold hover:brightness-110 transition"
          >
            {copy.proStrip.cta} <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Related */}
        {voiceMerged.surviving.length > 0 && (
          <VoiceQA entries={voiceMerged.surviving} title={copy.voiceTitle} />
        )}

        <RelatedLinks
          links={copy.related.map((r, i) => {
            const slug = RELATED_SLUGS[i] ?? "features";
            return {
              label: r.label,
              desc: r.desc,
              href: isPublished(slug, locale)
                ? localizedPath(slug, locale)
                : `/${slug}`,
            };
          })}
        />

        <TrackerClusterLinks current="/live-flight-tracker" />

        {/* Trust */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs text-white/35">
          {copy.trust.map((label) => (
            <span key={label} className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#D4AF37]/70" /> {label}
            </span>
          ))}
        </div>
      </div>

      <SiteFooter copy={getChromeCopy(locale)} locale={locale} slug="live-flight-tracker" />
    </main>
  );
}
