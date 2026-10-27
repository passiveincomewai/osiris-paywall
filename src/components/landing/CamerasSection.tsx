import Link from "next/link";
import { ArrowRight } from "lucide-react";
import GlobeHomeLink from "../GlobeHomeLink";
import Reveal from "./Reveal";
import CamerasGalleryMount from "./CamerasGalleryMount";
import { localizedPath, type LocaleCode } from "@/i18n/config";
import { isPublished } from "@/i18n/manifest";
import { enHome, type HomeCopy } from "@/i18n/dictionaries/en/home";

/**
 * Section 1 — live cameras. Opens with the shell's header block: the
 * homepage H1 (same text as always, re-homed here from the old hero-exit
 * strip), the brief's camera headline as H2, and the strip's three CTAs.
 * Below it, the camera gallery island mounts (see CameraGallery); until it
 * does — and for crawlers — these category cards carry the section.
 *
 * Copy comes from the home dictionary (cameras block); category hrefs
 * stay in code (routes are never translated). Links to pages published
 * in the current locale (pricing, live-webcams) localize; the rest keep
 * their English URLs.
 */
export const CAMERA_CATEGORIES = [
  { label: "Cities", href: "/world-city-webcams" },
  { label: "Ski Resorts", href: "/ski-webcams" },
  { label: "Beaches", href: "/beach-webcams" },
  { label: "Highways", href: "/live-traffic-cameras" },
  { label: "Mountains", href: "/ski-webcams" },
  { label: "Airports", href: "/airport-webcams" },
] as const;

function StaticCategoryCards({
  copy,
  locale,
}: {
  copy: HomeCopy;
  locale: LocaleCode;
}) {
  const webcamsHref = isPublished("live-webcams", locale)
    ? localizedPath("live-webcams", locale)
    : "/live-webcams";
  return (
    <Reveal delay={0.1} className="mt-10">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {CAMERA_CATEGORIES.map(({ href }, i) => {
          const label = copy.cameras.categoryLabels[i] ?? href;
          return (
            <Link
              key={label}
              href={href}
              className="group rounded-2xl border border-white/10 bg-white/[0.03] hover:border-[#0096FF]/50 hover:bg-white/[0.05] transition p-5 flex items-center gap-3"
            >
              <span className="w-2 h-2 rounded-full bg-[#0096FF] shrink-0" aria-hidden />
              <span className="font-semibold text-white">{label}</span>
              <ArrowRight className="w-4 h-4 ml-auto text-white/30 group-hover:text-[#0096FF] transition" aria-hidden />
            </Link>
          );
        })}
      </div>
      <Link
        href="/cameras"
        className="inline-flex items-center gap-2 mt-6 text-sm font-semibold text-[#0096FF] hover:text-[#0aa5ff] transition"
      >
        {copy.cameras.exploreLink} <ArrowRight className="w-4 h-4" aria-hidden />
      </Link>
      <Link
        href={webcamsHref}
        className="inline-flex items-center gap-2 mt-6 ml-6 text-sm font-semibold text-[#0096FF] hover:text-[#0aa5ff] transition"
      >
        {copy.cameras.webcamsLink} <ArrowRight className="w-4 h-4" aria-hidden />
      </Link>
    </Reveal>
  );
}

export default function CamerasSection({
  copy = enHome,
  locale = "en",
}: {
  copy?: HomeCopy;
  locale?: LocaleCode;
} = {}) {
  const cameras = copy.cameras;
  return (
    <section aria-label={cameras.ariaLabel} data-landing-view="cameras" className="relative">
      <div className="border-t border-[#D4AF37]/25 bg-gradient-to-b from-[#0096FF]/[0.07] to-transparent">
        <div className="max-w-7xl mx-auto px-6 pt-14 pb-10">
          <Reveal>
            {/* Owner order 2026-10-27 (production payload 93, folded into
                this rebase): the brand logo replaces the text heading
                block. The H1 text stays for semantics/SEO — visually
                hidden, with the image carrying the same words as its alt.
                Both come from the locale's dictionary, as the visible
                heading did before. */}
            <h1 className="sr-only">{cameras.h1}</h1>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/worldeye-logo.png"
              alt={cameras.h1}
              width={600}
              height={570}
              className="h-28 md:h-36 w-auto"
            />
            <h2 className="font-display text-3xl md:text-4xl font-medium leading-[1.12] text-white/90 mt-7">
              {cameras.h2}
            </h2>
            <p className="text-base md:text-lg text-white/60 leading-relaxed mt-3 max-w-2xl">
              {cameras.sub}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <GlobeHomeLink className="inline-flex items-center px-5 py-3 rounded-xl bg-[#0096FF] hover:bg-[#0aa5ff] text-white text-sm font-semibold transition">
                {cameras.ctaGlobe}
              </GlobeHomeLink>
              <Link
                href="/signup"
                className="inline-flex items-center px-5 py-3 rounded-xl border border-white/15 text-white/80 hover:text-white hover:border-white/30 text-sm font-semibold transition"
              >
                {cameras.ctaSignup}
              </Link>
              <Link
                href={localizedPath("pricing", locale)}
                className="inline-flex items-center px-5 py-3 rounded-xl border border-[#D4AF37]/40 text-[#D4AF37] hover:bg-[#D4AF37]/10 text-sm font-semibold transition"
              >
                {cameras.ctaPricing}
              </Link>
            </div>
          </Reveal>

          <CamerasGalleryMount fallback={<StaticCategoryCards copy={copy} locale={locale} />} />
        </div>
      </div>
    </section>
  );
}
