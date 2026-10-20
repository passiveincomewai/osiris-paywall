/**
 * Bundled competitor comparison data — the researched JSON in
 * src/data/competitors/*.json (the same files the admin seed POST upserts
 * into the Competitor table).
 *
 * The /compare routes read the DB first. Until the table is seeded in an
 * environment, they fall back to this bundled copy so the pages render the
 * real researched comparisons instead of "Comparison not found". Once the
 * DB is seeded, DB rows win and this module is simply unused by the routes.
 */

import acled from "@/data/competitors/acled.json";
import adsbExchange from "@/data/competitors/adsb-exchange.json";
import airplanesLive from "@/data/competitors/airplanes-live.json";
import bellingcatToolkit from "@/data/competitors/bellingcat-toolkit.json";
import conflictzoneIo from "@/data/competitors/conflictzone-io.json";
import copernicusBrowser from "@/data/competitors/copernicus-browser.json";
import crisis24 from "@/data/competitors/crisis24.json";
import dataminr from "@/data/competitors/dataminr.json";
import deepstatemap from "@/data/competitors/deepstatemap.json";
import earthcam from "@/data/competitors/earthcam.json";
import exploreOrg from "@/data/competitors/explore-org.json";
import flightaware from "@/data/competitors/flightaware.json";
import flightradar24 from "@/data/competitors/flightradar24.json";
import gdelt from "@/data/competitors/gdelt.json";
import globalThreatWatch from "@/data/competitors/global-threat-watch.json";
import googleEarth from "@/data/competitors/google-earth.json";
import intelligenceX from "@/data/competitors/intelligence-x.json";
import liveuamap from "@/data/competitors/liveuamap.json";
import maltego from "@/data/competitors/maltego.json";
import marinetraffic from "@/data/competitors/marinetraffic.json";
import n2yo from "@/data/competitors/n2yo.json";
import nasaWorldview from "@/data/competitors/nasa-worldview.json";
import osintIndustries from "@/data/competitors/osint-industries.json";
import recordedFuture from "@/data/competitors/recorded-future.json";
import sentinelHub from "@/data/competitors/sentinel-hub.json";
import shadowdragon from "@/data/competitors/shadowdragon.json";
import skylinewebcams from "@/data/competitors/skylinewebcams.json";
import ventusky from "@/data/competitors/ventusky.json";
import vesselfinder from "@/data/competitors/vesselfinder.json";
import windy from "@/data/competitors/windy.json";
import worldMonitor from "@/data/competitors/world-monitor.json";
import zoomEarth from "@/data/competitors/zoom-earth.json";

export type CompetitorFeature = { label: string; worldEye: string; competitor: string; note?: string };

export interface CompetitorData {
  slug: string;
  name: string;
  website: string | null;
  categories: string[];
  tagline: string | null;
  description: string;
  features: CompetitorFeature[];
  pricing: string | null;
  whyWorldEye: string[];
  competitorWins: string | null;
  verdictWorldEye: string | null;
  verdictCompetitor: string | null;
  sources: { label: string; url: string }[];
  lastReviewed: Date;
  published: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
}

// The bundled research was verified in October 2026 (see
// ~/workspace/worldeye-competitor-seo/RESEARCH.md); the admin seed stamps
// lastReviewed at seed time instead.
const BUNDLED_REVIEWED = new Date("2026-10-17T00:00:00Z");

type RawCompetitor = {
  slug: string;
  name: string;
  website?: string;
  categories?: string[];
  tagline?: string;
  description: string;
  features?: CompetitorFeature[];
  pricing?: string;
  whyWorldEye?: string[];
  competitorWins?: string;
  verdictWorldEye?: string;
  verdictCompetitor?: string;
  sources?: { label: string; url: string }[];
  published?: boolean;
  seoTitle?: string;
  seoDescription?: string;
};

function normalize(raw: RawCompetitor): CompetitorData {
  return {
    slug: raw.slug,
    name: raw.name,
    website: raw.website ?? null,
    categories: raw.categories ?? [],
    tagline: raw.tagline ?? null,
    description: raw.description,
    features: raw.features ?? [],
    pricing: raw.pricing ?? null,
    whyWorldEye: raw.whyWorldEye ?? [],
    competitorWins: raw.competitorWins ?? null,
    verdictWorldEye: raw.verdictWorldEye ?? null,
    verdictCompetitor: raw.verdictCompetitor ?? null,
    sources: raw.sources ?? [],
    lastReviewed: BUNDLED_REVIEWED,
    published: !!raw.published,
    seoTitle: raw.seoTitle ?? null,
    seoDescription: raw.seoDescription ?? null,
  };
}

const BUNDLED: CompetitorData[] = [
  acled, adsbExchange, airplanesLive, bellingcatToolkit, conflictzoneIo,
  copernicusBrowser, crisis24, dataminr, deepstatemap, earthcam, exploreOrg,
  flightaware, flightradar24, gdelt, globalThreatWatch, googleEarth,
  intelligenceX, liveuamap, maltego, marinetraffic, n2yo, nasaWorldview,
  osintIndustries, recordedFuture, sentinelHub, shadowdragon, skylinewebcams,
  ventusky, vesselfinder, windy, worldMonitor, zoomEarth,
].map((d) => normalize(d as RawCompetitor));

/** One bundled competitor by slug (published only), or null. */
export function getBundledCompetitor(slug: string): CompetitorData | null {
  return BUNDLED.find((c) => c.slug === slug && c.published) ?? null;
}

/** All bundled competitors (published only), name order — hub shape. */
export function listBundledCompetitors(): CompetitorData[] {
  return BUNDLED.filter((c) => c.published).sort((a, b) => a.name.localeCompare(b.name));
}

/** Bundled competitors sharing a category with the given slug (related row). */
export function listBundledRelated(slug: string, categories: string[], take = 4): CompetitorData[] {
  return BUNDLED.filter(
    (c) => c.published && c.slug !== slug && c.categories.some((cat) => categories.includes(cat)),
  ).slice(0, take);
}
