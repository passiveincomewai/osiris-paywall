import SiteFooter from "./SiteFooter";
import CamerasSection from "./landing/CamerasSection";
import TrackingSection from "./landing/TrackingSection";
import HazardsSection from "./landing/HazardsSection";
import OsintSection from "./landing/OsintSection";
import PlansSection from "./landing/PlansSection";
import FaqSection from "./landing/FaqSection";

// Server-rendered content shell for the homepage. The globe app above it is
// a fullscreen client application, so crawlers (and anyone on a slow
// connection) otherwise meet a page with almost no readable content. This
// shell ships in the initial HTML: one H1, the product showcase sections,
// the FAQ (same HOME_FAQS source as the FAQPage JSON-LD), clear calls to
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
// the maritime layer on; global search = the search spotlight exactly
// as a signed-out visitor sees it. Cyber Intelligence and Camera
// Recording keep the monogram treatment: their data/studio are behind
// the Pro + sign-in gates, so no honest anonymous capture exists.
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
      alt="WorldEye search open on the globe — search is a Pro feature"
      width={800}
      height={600}
      loading="lazy"
      className="absolute inset-0 w-full h-full object-cover"
    />
  ),
};

export default function HomeSeoShell() {
  return (
    <section aria-label="About WorldEye" className="home-seo-shell relative bg-[#06060C] text-white">
      <CamerasSection />
      <TrackingSection />
      <HazardsSection />
      <OsintSection visuals={OSINT_VISUALS} />
      <PlansSection />
      <FaqSection />
      <SiteFooter
        newsletterHeadline="Stay Ahead of the World."
        newsletterSub="Get platform updates, new intelligence layers, and important announcements."
      />
    </section>
  );
}
