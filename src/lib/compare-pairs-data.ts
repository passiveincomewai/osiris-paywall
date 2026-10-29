/**
 * Bundled competitor-vs-competitor comparison data — the researched
 * JSON in src/data/compare-pairs/*.json.
 *
 * These pages are the X-vs-Y family: a fair head-to-head between two
 * competitors, with WorldEye presented afterwards as another option.
 * The /compare/[slug] route owns "WorldEye vs X" only (INTENT-AND-
 * CLUSTERS §2.2); pair pages are separate hand-researched entries
 * rendered by compare/PairCompare.tsx from static routes.
 *
 * Every factual claim in the pair JSON was checked against the
 * competitors' own public pages (listed in each entry's sources) in
 * October 2026. Claims that could not be confirmed are marked
 * "unverified" in the feature tables rather than guessed.
 *
 * Wave 2 (2026-10-29) grew the family from 5 to 42 pairs: the
 * God's Eye View / GodsView AI / Argos Atlas clusters plus flight,
 * AIS, weather, satellite and OSINT head-to-heads.
 */

import earthcamVsSkylinewebcams from "@/data/compare-pairs/earthcam-vs-skylinewebcams.json";
import flightradar24VsFlightaware from "@/data/compare-pairs/flightradar24-vs-flightaware.json";
import windyVsVentusky from "@/data/compare-pairs/windy-vs-ventusky.json";
import marinetrafficVsVesselfinder from "@/data/compare-pairs/marinetraffic-vs-vesselfinder.json";
import googleEarthVsNasaWorldview from "@/data/compare-pairs/google-earth-vs-nasa-worldview.json";
import godsEyeViewVsArgosAtlas from "@/data/compare-pairs/gods-eye-view-vs-argos-atlas.json";
import godsEyeViewVsGoogleEarth from "@/data/compare-pairs/gods-eye-view-vs-google-earth.json";
import godsEyeViewVsZoomEarth from "@/data/compare-pairs/gods-eye-view-vs-zoom-earth.json";
import godsEyeViewVsWorldMonitor from "@/data/compare-pairs/gods-eye-view-vs-world-monitor.json";
import godsEyeViewVsEarthcam from "@/data/compare-pairs/gods-eye-view-vs-earthcam.json";
import godsEyeViewVsSkylinewebcams from "@/data/compare-pairs/gods-eye-view-vs-skylinewebcams.json";
import godsEyeViewVsLiveuamap from "@/data/compare-pairs/gods-eye-view-vs-liveuamap.json";
import godsEyeViewVsWindy from "@/data/compare-pairs/gods-eye-view-vs-windy.json";
import godsEyeViewVsNasaWorldview from "@/data/compare-pairs/gods-eye-view-vs-nasa-worldview.json";
import godsviewVsGodsEyeView from "@/data/compare-pairs/godsview-vs-gods-eye-view.json";
import godsviewVsArgosAtlas from "@/data/compare-pairs/godsview-vs-argos-atlas.json";
import godsviewVsWorldMonitor from "@/data/compare-pairs/godsview-vs-world-monitor.json";
import godsviewVsLiveuamap from "@/data/compare-pairs/godsview-vs-liveuamap.json";
import argosAtlasVsEarthcam from "@/data/compare-pairs/argos-atlas-vs-earthcam.json";
import argosAtlasVsSkylinewebcams from "@/data/compare-pairs/argos-atlas-vs-skylinewebcams.json";
import argosAtlasVsGoogleEarth from "@/data/compare-pairs/argos-atlas-vs-google-earth.json";
import argosAtlasVsZoomEarth from "@/data/compare-pairs/argos-atlas-vs-zoom-earth.json";
import argosAtlasVsWorldMonitor from "@/data/compare-pairs/argos-atlas-vs-world-monitor.json";
import argosAtlasVsLiveuamap from "@/data/compare-pairs/argos-atlas-vs-liveuamap.json";
import flightradar24VsAdsbExchange from "@/data/compare-pairs/flightradar24-vs-adsb-exchange.json";
import flightradar24VsAirplanesLive from "@/data/compare-pairs/flightradar24-vs-airplanes-live.json";
import flightawareVsAdsbExchange from "@/data/compare-pairs/flightaware-vs-adsb-exchange.json";
import adsbExchangeVsAirplanesLive from "@/data/compare-pairs/adsb-exchange-vs-airplanes-live.json";
import marinetrafficVsShipfinder from "@/data/compare-pairs/marinetraffic-vs-shipfinder.json";
import vesselfinderVsShipfinder from "@/data/compare-pairs/vesselfinder-vs-shipfinder.json";
import earthcamVsExploreOrg from "@/data/compare-pairs/earthcam-vs-explore-org.json";
import skylinewebcamsVsExploreOrg from "@/data/compare-pairs/skylinewebcams-vs-explore-org.json";
import earthcamVsZoomEarth from "@/data/compare-pairs/earthcam-vs-zoom-earth.json";
import zoomEarthVsWindy from "@/data/compare-pairs/zoom-earth-vs-windy.json";
import ventuskyVsZoomEarth from "@/data/compare-pairs/ventusky-vs-zoom-earth.json";
import zoomEarthVsNasaWorldview from "@/data/compare-pairs/zoom-earth-vs-nasa-worldview.json";
import zoomEarthVsGoogleEarth from "@/data/compare-pairs/zoom-earth-vs-google-earth.json";
import sentinelHubVsCopernicusBrowser from "@/data/compare-pairs/sentinel-hub-vs-copernicus-browser.json";
import sentinelHubVsZoomEarth from "@/data/compare-pairs/sentinel-hub-vs-zoom-earth.json";
import n2yoVsHeavensAbove from "@/data/compare-pairs/n2yo-vs-heavens-above.json";
import worldMonitorVsLiveuamap from "@/data/compare-pairs/world-monitor-vs-liveuamap.json";
import maltegoVsIntelligenceX from "@/data/compare-pairs/maltego-vs-intelligence-x.json";

export type PairFeature = { label: string; a: string; b: string; note?: string };

export type PairLink = { href: string; label: string };

export interface ComparePairData {
  slug: string;
  aSlug: string;
  bSlug: string;
  aName: string;
  bName: string;
  aWebsite: string;
  bWebsite: string;
  category: string;
  seoTitle: string;
  seoDescription: string;
  intro: string;
  aAbout: string;
  bAbout: string;
  features: PairFeature[];
  pricingA: string;
  pricingB: string;
  aStrengths: string;
  bStrengths: string;
  verdictA: string;
  verdictB: string;
  worldEye: string;
  betterAnswer: string;
  faqs: { q: string; a: string }[];
  sources: { label: string; url: string }[];
  lastReviewed: string;
  published: boolean;
  /* Wave-2 optional enrichments — the template renders each only when
     present, so wave-1 entries keep their original rendering. */
  /** One-line verdict shown as the hero pull-quote. */
  verdictLine?: string;
  /** Compact fact rows (founded / model / platforms / free tier…). */
  quickFacts?: { label: string; a: string; b: string }[];
  /** Pros/cons lists; when present they replace the strengths prose. */
  prosA?: string[];
  consA?: string[];
  prosB?: string[];
  consB?: string[];
  /**
   * Cross-link overrides for the "WorldEye vs X" links. Absent → the
   * default /compare/<slug> page. An object → that href/label. null →
   * no WorldEye page exists for that side; the link is omitted.
   */
  aLink?: PairLink | null;
  bLink?: PairLink | null;
  /** Curated live cameras (landing-manifest IDs) for the WorldEye section. */
  featuredCams?: {
    categories: string[];
    ids: string[];
    title: string;
    blurb: string;
  };
  /** Genuine WorldEye site imagery for the WorldEye section. */
  worldEyeMedia?: { src: string; alt: string; caption: string }[];
}

const BUNDLED: ComparePairData[] = [
  earthcamVsSkylinewebcams,
  flightradar24VsFlightaware,
  windyVsVentusky,
  marinetrafficVsVesselfinder,
  googleEarthVsNasaWorldview,
  godsEyeViewVsArgosAtlas,
  godsEyeViewVsGoogleEarth,
  godsEyeViewVsZoomEarth,
  godsEyeViewVsWorldMonitor,
  godsEyeViewVsEarthcam,
  godsEyeViewVsSkylinewebcams,
  godsEyeViewVsLiveuamap,
  godsEyeViewVsWindy,
  godsEyeViewVsNasaWorldview,
  godsviewVsGodsEyeView,
  godsviewVsArgosAtlas,
  godsviewVsWorldMonitor,
  godsviewVsLiveuamap,
  argosAtlasVsEarthcam,
  argosAtlasVsSkylinewebcams,
  argosAtlasVsGoogleEarth,
  argosAtlasVsZoomEarth,
  argosAtlasVsWorldMonitor,
  argosAtlasVsLiveuamap,
  flightradar24VsAdsbExchange,
  flightradar24VsAirplanesLive,
  flightawareVsAdsbExchange,
  adsbExchangeVsAirplanesLive,
  marinetrafficVsShipfinder,
  vesselfinderVsShipfinder,
  earthcamVsExploreOrg,
  skylinewebcamsVsExploreOrg,
  earthcamVsZoomEarth,
  zoomEarthVsWindy,
  ventuskyVsZoomEarth,
  zoomEarthVsNasaWorldview,
  zoomEarthVsGoogleEarth,
  sentinelHubVsCopernicusBrowser,
  sentinelHubVsZoomEarth,
  n2yoVsHeavensAbove,
  worldMonitorVsLiveuamap,
  maltegoVsIntelligenceX,
] as ComparePairData[];

/** One bundled pair by slug (published only), or null. */
export function getComparePair(slug: string): ComparePairData | null {
  return BUNDLED.find((p) => p.slug === slug && p.published) ?? null;
}

/** All published pairs, in editorial order — hub + related rows. */
export function listComparePairs(): ComparePairData[] {
  return BUNDLED.filter((p) => p.published);
}
