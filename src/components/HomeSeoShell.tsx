import StatBand, { type WeStat } from "./design/StatBand";
import SiteFooter from "./SiteFooter";
import LandingTrackerMount from "./landing/LandingTrackerMount";
import CamerasSection from "./landing/CamerasSection";
import SpotlightCam from "./SpotlightCam";
import DirectAnswers from "./seo/DirectAnswers";
import TrackingSection from "./landing/TrackingSection";
import HazardsSection from "./landing/HazardsSection";
import OsintSection from "./landing/OsintSection";
import PlansSection from "./landing/PlansSection";
import FaqSection from "./landing/FaqSection";
import type { LocaleCode } from "@/i18n/config";
import { enHome, type HomeCopy } from "@/i18n/dictionaries/en/home";
import { getChromeCopy } from "@/i18n/dictionaries";

// Server-rendered content shell for the homepage. The globe app above it is
// a fullscreen client application, so crawlers (and anyone on a slow
// connection) otherwise meet a page with almost no readable content. This
// shell ships in the initial HTML: one H1, the product showcase sections,
// the FAQ (same dictionary source as the FAQPage JSON-LD), clear calls to
// action, and a clickable contact email.
//
// Placement is handled by the .home-seo-shell rule in globals.css: in flow
// it follows the cinematic scroll track, so a visitor who keeps scrolling
// past the globe reaches it; ad traffic that skips the hero never sees it
// cover the app.
//
// The redesign (2026-10-14) lives entirely in this composition root plus
// src/components/landing/* — page.tsx and everything above the globe's
// lower boundary are untouched by construction. Interactive islands mount
// per-section behind IntersectionObserver gates (see landing/IoGate), so
// the homepage's initial JS carries none of the sections' code. Section
// order per the brief: cameras, tracking, hazards, OSINT toolkit, plans,
// FAQ + footer.
// Section 4 card visuals — real captures only (see OsintSection):
// satellite = mosaic from the same public Esri World Imagery tile source
// the in-app satellite view loads (the basemap switch itself is inside
// the Pro surface); maritime = a frame from the app's own globe with
// the maritime layer on; search = the search spotlight exactly
// as a signed-out visitor sees it. Cyber Intelligence and Camera
// Recording keep the monogram treatment: their data/studio are behind
// the Pro + sign-in gates, so no honest anonymous capture exists.
//
// Localization (2026-10-26): all copy comes from the home dictionary
// via `copy` (English by default — the English render is unchanged);
// the homepage passes the active locale's dictionary down. The footer
// gets slug="" so the language selector renders on both homepages.
const OSINT_VISUALS: Record<string, React.ReactNode> = {
  "satellite-maps": (
    /* eslint-disable-next-line @next/next/no-img-element -- static landing asset */
    <img
      src="/landing/osint-satellite.jpg"
      alt="Satellite imagery of the San Francisco Bay Area from Esri World Imagery, the source WorldEye's satellite view uses"
      width={800}
      height={600}
      loading="lazy"
      className="absolute inset-0 w-full h-full object-cover"
    />
  ),
  "maritime-tracking": (
    /* eslint-disable-next-line @next/next/no-img-element -- static landing asset */
    <img
      src="/landing/osint-maritime.jpg"
      alt="WorldEye globe over Europe, the Mediterranean and North Africa with the maritime layer on"
      width={800}
      height={600}
      loading="lazy"
      className="absolute inset-0 w-full h-full object-cover"
    />
  ),
  "global-search": (
    /* eslint-disable-next-line @next/next/no-img-element -- static landing asset */
    <img
      src="/landing/osint-search.jpg"
      alt="WorldEye search open on the globe — basic search is free for every visitor"
      width={800}
      height={600}
      loading="lazy"
      className="absolute inset-0 w-full h-full object-cover"
    />
  ),
};

/**
 * Headline figures band (visual-transformation homepage wave). Every
 * figure is a locked/verified fact, stated in the home dictionary's own
 * Quick Answers: 74,229 public cameras (the locked headline), from 109
 * countries (src/data/countries holds exactly 109 country files), the
 * United States largest at 41,355, Japan second at 10,472. Labels are
 * keyed by locale here — not added to the home dictionary — so the
 * dictionary manifest's source hash is untouched; number formatting
 * follows each locale dictionary's own convention (74,229 / 74.229).
 */
const STAT_BAND: Record<string, WeStat[]> = {
  en: [
    { value: "74,229", label: "Live cameras", sub: "Public cameras on one globe" },
    { value: "109", label: "Countries", sub: "Countries with cameras on the globe" },
    { value: "41,355", label: "United States", sub: "Largest camera network" },
    { value: "10,472", label: "Japan", sub: "Second-largest camera network" },
  ],
  es: [
    { value: "74.229", label: "Cámaras en vivo", sub: "Cámaras públicas en un solo globo" },
    { value: "109", label: "Países", sub: "Países con cámaras en el globo" },
    { value: "41.355", label: "Estados Unidos", sub: "La mayor red de cámaras" },
    { value: "10.472", label: "Japón", sub: "La segunda mayor red" },
  ],
};

export default function HomeSeoShell({
  copy = enHome,
  locale = "en",
}: {
  copy?: HomeCopy;
  locale?: LocaleCode;
} = {}) {
  return (
    <section aria-label={copy.shellLabel} className="home-seo-shell relative bg-[#06060C] text-white">
      <LandingTrackerMount />
      <SpotlightCam />
      <CamerasSection copy={copy} locale={locale} />
      <div
        className="mx-auto w-full"
        style={{
          maxWidth: "var(--we-wide)",
          paddingLeft: "var(--we-gutter)",
          paddingRight: "var(--we-gutter)",
          paddingTop: "var(--we-space-6)",
          paddingBottom: "var(--we-space-2)",
        }}
      >
        <StatBand stats={STAT_BAND[locale] ?? STAT_BAND.en} />
      </div>
      <div className="max-w-5xl mx-auto px-6 py-12 md:py-14">
        <DirectAnswers items={copy.directAnswers.items} label={copy.directAnswers.label} />
      </div>
      <TrackingSection copy={copy} locale={locale} />
      <HazardsSection copy={copy} />
      <OsintSection visuals={OSINT_VISUALS} copy={copy} />
      <PlansSection copy={copy} locale={locale} />
      <FaqSection copy={copy} />
      <SiteFooter
        newsletterHeadline={copy.footerHeadline}
        newsletterSub={copy.footerSub}
        copy={getChromeCopy(locale)}
        locale={locale}
        slug=""
      />
    </section>
  );
}
