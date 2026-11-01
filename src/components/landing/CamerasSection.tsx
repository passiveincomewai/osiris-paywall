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
 *
 * Visual transformation (design overhaul D-1, 2026-11-01): the section
 * now sits on the design system — token container and rhythm, a flat
 * ink surface with a hairline instead of the gold-bordered #0096FF
 * gradient band, Button-equivalent primary/ghost CTAs (the design
 * Button's exact fill, radius and padding, expressed as token classes
 * because GlobeHomeLink takes className only), and token category
 * cards (ink panels, hairlines, cyan live dots, steel inactive
 * arrows). The gold / #0096FF dialect is retired here; gold survives
 * only as locked facts (the /pricing Pro tier accent is not this
 * link). Copy, links, section order, the sr-only H1 and the logo
 * block are unchanged.
 */
export const CAMERA_CATEGORIES = [
  { label: "Cities", href: "/world-city-webcams" },
  { label: "Ski Resorts", href: "/ski-webcams" },
  { label: "Beaches", href: "/beach-webcams" },
  { label: "Highways", href: "/live-traffic-cameras" },
  { label: "Mountains", href: "/ski-webcams" },
  { label: "Airports", href: "/airport-webcams" },
] as const;

const CTA_PRIMARY =
  "inline-flex items-center px-[1.35rem] py-[0.8rem] rounded-[var(--we-radius-2)] bg-[var(--we-blue)] hover:bg-[var(--we-blue-strong)] text-[var(--we-text-on-accent)] border border-transparent text-sm font-semibold leading-none transition-colors";
const CTA_GHOST =
  "inline-flex items-center px-[1.35rem] py-[0.8rem] rounded-[var(--we-radius-2)] bg-transparent border border-[var(--we-line-3)] hover:border-[var(--we-text-1)] text-[var(--we-text-1)] text-sm font-semibold leading-none transition-colors";

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
              className="group flex items-center gap-3 bg-[var(--we-ink-2)] hover:bg-[var(--we-ink-3)] border border-[var(--we-line-2)] hover:border-[var(--we-line-3)] rounded-[var(--we-radius-2)] p-[var(--we-space-5)] transition-colors"
            >
              <span className="w-2 h-2 rounded-full shrink-0 bg-[var(--we-cyan)]" aria-hidden />
              <span className="font-semibold text-[var(--we-text-1)]">{label}</span>
              <ArrowRight
                className="w-4 h-4 ml-auto text-[var(--we-steel)] group-hover:text-[var(--we-blue-strong)] transition-colors"
                aria-hidden
              />
            </Link>
          );
        })}
      </div>
      <Link
        href="/cameras"
        className="inline-flex items-center gap-2 mt-6 text-sm font-semibold text-[var(--we-blue-strong)] hover:underline underline-offset-[3px]"
      >
        {copy.cameras.exploreLink} <ArrowRight className="w-4 h-4" aria-hidden />
      </Link>
      <Link
        href={webcamsHref}
        className="inline-flex items-center gap-2 mt-6 ml-6 text-sm font-semibold text-[var(--we-blue-strong)] hover:underline underline-offset-[3px]"
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
      <div
        style={{
          borderTop: "1px solid var(--we-line-2)",
          background: "var(--we-ink-1)",
        }}
      >
        <div
          className="mx-auto w-full"
          style={{
            maxWidth: "var(--we-wide)",
            paddingLeft: "var(--we-gutter)",
            paddingRight: "var(--we-gutter)",
            paddingTop: "var(--we-space-7)",
            paddingBottom: "var(--we-space-6)",
          }}
        >
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
            <h2
              className="font-[family-name:var(--we-font-display)]"
              style={{
                color: "var(--we-text-1)",
                fontSize: "clamp(1.875rem, 3.2vw, 2.375rem)",
                lineHeight: 1.12,
                fontWeight: 560,
                marginTop: "var(--we-space-6)",
              }}
            >
              {cameras.h2}
            </h2>
            <p
              style={{
                color: "var(--we-text-2)",
                fontSize: "var(--we-size-lede)",
                lineHeight: "var(--we-leading-body)",
                marginTop: "var(--we-space-3)",
                maxWidth: "var(--we-measure)",
              }}
            >
              {cameras.sub}
            </p>
            <div
              className="flex flex-wrap"
              style={{ marginTop: "var(--we-space-6)", gap: "var(--we-space-3)" }}
            >
              <GlobeHomeLink className={CTA_PRIMARY}>
                {cameras.ctaGlobe}
              </GlobeHomeLink>
              <Link href="/signup" className={CTA_GHOST}>
                {cameras.ctaSignup}
              </Link>
              <Link href={localizedPath("pricing", locale)} className={CTA_GHOST}>
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
