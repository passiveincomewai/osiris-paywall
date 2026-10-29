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
 */

import earthcamVsSkylinewebcams from "@/data/compare-pairs/earthcam-vs-skylinewebcams.json";
import flightradar24VsFlightaware from "@/data/compare-pairs/flightradar24-vs-flightaware.json";

export type PairFeature = { label: string; a: string; b: string; note?: string };

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
}

const BUNDLED: ComparePairData[] = [
  earthcamVsSkylinewebcams,
  flightradar24VsFlightaware,
] as ComparePairData[];

/** One bundled pair by slug (published only), or null. */
export function getComparePair(slug: string): ComparePairData | null {
  return BUNDLED.find((p) => p.slug === slug && p.published) ?? null;
}

/** All published pairs, in editorial order — hub + related rows. */
export function listComparePairs(): ComparePairData[] {
  return BUNDLED.filter((p) => p.published);
}
