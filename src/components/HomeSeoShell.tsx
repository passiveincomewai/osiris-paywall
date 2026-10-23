import SiteFooter from "./SiteFooter";
import LandingTrackerMount from "./landing/LandingTrackerMount";
import CamerasSection from "./landing/CamerasSection";
import DirectAnswers from "./seo/DirectAnswers";
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
// the maritime layer on; search = the search spotlight exactly
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
      alt="WorldEye search open on the globe — basic search is free for every visitor"
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
      <LandingTrackerMount />
      <CamerasSection />
      <div className="max-w-5xl mx-auto px-6 py-12 md:py-14">
        <DirectAnswers
          items={[
            {
              q: "What is WorldEye?",
              a: "WorldEye is a free website that puts a live 3D globe of Earth in your browser — 74,229 public cameras, live flights, satellites, weather, earthquakes and wildfires on one map. There is nothing to install and no account needed to look around. Paid plans add an AI analyst, camera recording, alerts and premium intelligence layers.",
            },
            {
              q: "How many live cameras can I watch on WorldEye?",
              a: "You can watch 74,229 live public cameras on WorldEye, plotted on one globe from 109 countries. The United States contributes the most — 41,355 cameras, largely state transportation-department networks — followed by Japan with 10,472. The mix covers highways, city streets, beaches, ski resorts, airports, harbors and nature reserves.",
            },
            {
              q: "Is WorldEye free?",
              a: "Yes — the globe, all the cameras, flight and satellite tracking, weather, earthquakes and basic search are free, and you never need an account to browse. The free plan includes 5 camera opens on the globe. Optional paid plans — Weekly at $7.99, Monthly at $13.99 and VIP Pro at $74.99 a year — remove that limit and add the AI analyst, camera recording and premium intel layers.",
            },
          ]}
        />
      </div>
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
