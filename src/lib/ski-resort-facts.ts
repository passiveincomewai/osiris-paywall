/**
 * OSIRIS — per-resort facts for the ski pages' "About" sections.
 *
 * The dataset (src/data/ski-resort-facts.json) is hand-sourced: every
 * figure comes from the resort's reference entry (Wikipedia infobox /
 * lead, cross-checked against the resort's own published stats where
 * the two are public) and every paragraph is written for that one
 * mountain. Nothing here is generated from the camera catalogue and
 * nothing is shared boilerplate between resorts — a resort with no
 * sourced facts simply renders no About section.
 *
 * Elevations are metres, areas hectares; the page renders the imperial
 * conversion alongside (the conversion is arithmetic, not a fact).
 */
import factsData from '@/data/ski-resort-facts.json';

export interface SkiResortFacts {
  baseElevationM?: number;
  summitElevationM?: number;
  verticalM?: number;
  skiableHectares?: number;
  lifts?: number;
  runs?: number;
  /** Trail-difficulty split in percent (easiest / more difficult /
   *  most difficult), from the resort's reference entry (Wikipedia,
   *  checked 2026-10-30). Present only where a sourced split exists;
   *  the three shares sum to 100. */
  terrainMix?: {
    easiestPct: number;
    moreDifficultPct: number;
    mostDifficultPct: number;
  };
  /** The drive in: the real access road(s) and where they climb from. */
  access?: string;
  /** Paragraphs about this specific mountain — its terrain, its
   *  setting, what its cameras are good for. */
  about?: string[];
}

const FACTS = factsData as Record<string, SkiResortFacts>;

export function getSkiResortFacts(slug: string): SkiResortFacts | null {
  return FACTS[slug] ?? null;
}

/** "3,308 m (10,853 ft)" — metric primary, imperial computed. */
export function formatElevation(metres: number): string {
  const ft = Math.round(metres * 3.28084);
  return `${metres.toLocaleString('en-US')} m (${ft.toLocaleString('en-US')} ft)`;
}

/** "1,050 ha (2,595 acres)". */
export function formatArea(hectares: number): string {
  const acres = Math.round(hectares * 2.47105);
  return `${hectares.toLocaleString('en-US')} ha (${acres.toLocaleString('en-US')} acres)`;
}
