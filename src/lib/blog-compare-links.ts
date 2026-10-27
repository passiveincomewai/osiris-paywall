/**
 * Blog → comparison-page links (SEO indexation push, 2026-10-26).
 *
 * The /compare/* pages were stuck in Google's "discovered, not indexed"
 * bucket: they were linked from the compare hub and footer, but almost
 * never from editorial content. This map gives the blog posts that
 * genuinely discuss a competitor category a small "head-to-head" block
 * linking the matching comparison pages, with descriptive anchor text.
 *
 * Editorial rule: only posts whose subject is the tool category itself
 * (a flight-tracker guide links flight-tracker comparisons, a ship-
 * tracking explainer links ship-tracker comparisons). One or two links
 * per post, never more — this is a reader service, not link stuffing.
 */

export type CompareLink = {
  /** Target path, e.g. "/compare/flightradar24". */
  href: string;
  /** Link label shown on the card. */
  label: string;
  /** One-line description under the label. */
  desc: string;
};

const L = (href: string, label: string, desc: string): CompareLink => ({ href, label, desc });

export const BLOG_COMPARE_LINKS: Record<string, CompareLink[]> = {
  "best-free-flight-trackers-2026": [
    L("/compare/flightradar24", "WorldEye vs Flightradar24", "The full head-to-head: coverage, blocked aircraft, pricing and verdict."),
    L("/compare/flightaware", "WorldEye vs FlightAware", "The aviation-data specialist, compared feature by feature."),
  ],
  "live-flight-tracking-guide": [
    L("/compare/flightradar24", "WorldEye vs Flightradar24", "How the best-known flight tracker stacks up against the free globe."),
  ],
  "how-live-flight-tracking-works": [
    L("/compare/adsb-exchange", "WorldEye vs ADS-B Exchange", "The unfiltered ADS-B network, compared honestly."),
  ],
  "why-flights-disappear-trackers": [
    L("/compare/adsb-exchange", "WorldEye vs ADS-B Exchange", "The tracker famous for not hiding aircraft — see where WorldEye differs."),
    L("/compare/flightradar24", "WorldEye vs Flightradar24", "Why some flights vanish here first: blocking policy, compared."),
  ],
  "follow-a-flight-live": [
    L("/compare/flightaware", "WorldEye vs FlightAware", "FlightAware's flight pages vs following a flight on the live globe."),
  ],
  "plane-spotting-guide": [
    L("/compare/flightradar24", "WorldEye vs Flightradar24", "The spotter's default app, compared with the free all-in-one globe."),
  ],
  "world-live-cameras": [
    L("/compare/skylinewebcams", "WorldEye vs SkylineWebcams", "The scenic webcam directory vs 74,229 cameras on a 3D globe."),
    L("/compare/earthcam", "WorldEye vs EarthCam", "The big-name webcam network, compared camera by camera."),
  ],
  "best-live-webcams-world": [
    L("/compare/skylinewebcams", "WorldEye vs SkylineWebcams", "Curated scenic cams vs a camera network on a living globe."),
    L("/compare/earthcam", "WorldEye vs EarthCam", "EarthCam's network vs WorldEye's — features, ads and pricing."),
  ],
  "best-beach-webcams": [
    L("/compare/skylinewebcams", "WorldEye vs SkylineWebcams", "Where the beach-cam directory is stronger — and where the globe wins."),
  ],
  "best-ski-webcams": [
    L("/compare/skylinewebcams", "WorldEye vs SkylineWebcams", "Ski webcams are a SkylineWebcams signature — see the honest comparison."),
  ],
  "how-to-read-weather-radar": [
    L("/compare/windy", "WorldEye vs Windy", "Forecast-model depth vs live radar and ground cameras on one globe."),
    L("/compare/zoom-earth", "WorldEye vs Zoom Earth", "The satellite weather view, compared with the all-in-one globe."),
  ],
  "hurricane-season-final-weeks-2026": [
    L("/compare/windy", "WorldEye vs Windy", "Windy tracks the storm's future; WorldEye shows the coast it is heading for."),
  ],
  "ais-ship-tracking-explained": [
    L("/compare/marinetraffic", "WorldEye vs MarineTraffic", "The AIS specialist, compared feature by feature."),
    L("/compare/vesselfinder", "WorldEye vs VesselFinder", "VesselFinder's ship pages vs ships on the live globe."),
  ],
  "how-to-watch-the-iss-live": [
    L("/compare/n2yo", "WorldEye vs N2YO", "The satellite-tracking specialist, compared with the free globe."),
  ],
  "what-is-osint": [
    L("/compare/maltego", "WorldEye vs Maltego", "The classic link-analysis tool, compared with the OSINT globe."),
  ],
  "osint-for-journalists": [
    L("/compare/bellingcat-toolkit", "WorldEye vs Bellingcat Toolkit", "The verification toolkit, compared for newsroom workflows."),
  ],
  "live-3d-globe-without-installing": [
    L("/compare/google-earth", "WorldEye vs Google Earth", "The installed classic vs a live globe that runs in the browser."),
  ],
};

/** Comparison links for a blog post slug (empty array when none apply). */
export function compareLinksForPost(slug: string): CompareLink[] {
  return BLOG_COMPARE_LINKS[slug] ?? [];
}
