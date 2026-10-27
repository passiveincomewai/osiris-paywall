/**
 * OSIRIS — ski resort comparison: the pure logic behind the interactive
 * compare tool (/ski-webcams/compare) and the pre-built popular-pair
 * pages (/ski-webcams/compare/[pair]).
 *
 * Everything here works over plain serializable data (CompareResortData)
 * so the client tool and the static pair pages share exactly one
 * implementation of pair parsing, selection rules and the comparison
 * rows. Figures come only from the sourced datasets — the generated
 * resort index (camera counts, location) and the hand-sourced facts
 * file — so a resort with no sourced fact renders an empty cell, never
 * an invented number.
 */
import { getSkiResort, SKI_RESORTS, type SkiResort } from "./ski-resorts";
import {
  formatArea,
  formatElevation,
  getSkiResortFacts,
  type SkiResortFacts,
} from "./ski-resort-facts";
import {
  getResortWebsiteUrl,
  getSkiResortLinks,
  type SkiResortLinks,
} from "./ski-resort-links";

/* ------------------------------------------------------------------ */
/* Popular pairs                                                       */
/* ------------------------------------------------------------------ */

/**
 * Pre-built comparison pages: neighbours and rivals skiers actually
 * cross-shop — same canyon or valley, same pass region, same trip
 * decision. Both slugs must be resorts with pages (the tests pin this).
 */
export const POPULAR_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ["snowbird", "brighton"],
  ["whistler-blackcomb", "lake-louise"],
  ["st-anton-am-arlberg", "ischgl"],
  ["zermatt", "st-moritz"],
  ["vail", "breckenridge"],
  ["niseko", "rusutsu"],
  ["killington", "stowe"],
];

/** "snowbird-vs-brighton" — the [pair] route segment for two slugs. */
export function pairSlug(a: string, b: string): string {
  return `${a}-vs-${b}`;
}

/**
 * Parse a [pair] route segment back into its two resorts. Resort slugs
 * are hyphenated names, so instead of assuming one separator position,
 * every "-vs-" split point is tried: the segment parses only when
 * exactly one split yields two known, distinct resort slugs. Unknown
 * resorts, a resort against itself, or an ambiguous/malformed segment
 * return null (the page 404s).
 */
export function parsePairSlug(raw: string): [SkiResort, SkiResort] | null {
  const matches: [SkiResort, SkiResort][] = [];
  let idx = raw.indexOf("-vs-");
  while (idx !== -1) {
    const a = raw.slice(0, idx);
    const b = raw.slice(idx + 4);
    if (a && b && a !== b) {
      const ra = getSkiResort(a);
      const rb = getSkiResort(b);
      if (ra && rb) matches.push([ra, rb]);
    }
    idx = raw.indexOf("-vs-", idx + 1);
  }
  return matches.length === 1 ? matches[0] : null;
}

/** The popular pair a resort appears in, if any — for cross-linking. */
export function popularPairFor(
  slug: string,
): { pair: string; other: SkiResort } | null {
  for (const [a, b] of POPULAR_PAIRS) {
    if (a === slug) {
      const other = getSkiResort(b);
      if (other) return { pair: pairSlug(a, b), other };
    }
    if (b === slug) {
      const other = getSkiResort(a);
      if (other) return { pair: pairSlug(a, b), other };
    }
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Compare data                                                        */
/* ------------------------------------------------------------------ */

/** Everything the compare UI shows about one resort, serializable. */
export interface CompareResortData {
  slug: string;
  name: string;
  town: string;
  region: string;
  country: string;
  resortCameraCount: number;
  nearbyCameraCount: number;
  facts: SkiResortFacts | null;
  links: SkiResortLinks | null;
  /** The resort's official website, when its domain is verified. */
  website: string | null;
}

/** Assemble one resort's compare data from the sourced datasets. */
export function buildCompareData(resort: SkiResort): CompareResortData {
  return {
    slug: resort.slug,
    name: resort.name,
    town: resort.town,
    region: resort.region,
    country: resort.country,
    resortCameraCount: resort.resortCameraCount,
    nearbyCameraCount: resort.nearbyCameraCount,
    facts: getSkiResortFacts(resort.slug),
    links: getSkiResortLinks(resort.slug),
    website: getResortWebsiteUrl(resort.slug),
  };
}

export function allCompareData(): CompareResortData[] {
  return SKI_RESORTS.map(buildCompareData);
}

/* ------------------------------------------------------------------ */
/* Comparison rows                                                     */
/* ------------------------------------------------------------------ */

export interface ComparisonRow {
  key: string;
  label: string;
  /** Formatted value for each side; null renders as an em dash. */
  a: string | null;
  b: string | null;
}

function num(v: number | undefined): string | null {
  return v != null ? v.toLocaleString("en-US") : null;
}
function elev(v: number | undefined): string | null {
  return v != null ? formatElevation(v) : null;
}
function area(v: number | undefined): string | null {
  return v != null ? formatArea(v) : null;
}
function place(r: CompareResortData): string {
  return `${r.town}, ${r.region} · ${r.country}`;
}

/**
 * The side-by-side rows, in display order. Location and camera counts
 * exist for every resort; the terrain stats appear only where the
 * facts file sources them for that resort.
 */
export function buildComparisonRows(
  a: CompareResortData,
  b: CompareResortData,
): ComparisonRow[] {
  const fa = a.facts ?? {};
  const fb = b.facts ?? {};
  return [
    { key: "location", label: "Location", a: place(a), b: place(b) },
    {
      key: "resortCameras",
      label: "Resort cameras",
      a: num(a.resortCameraCount),
      b: num(b.resortCameraCount),
    },
    {
      key: "nearbyCameras",
      label: "Road cameras nearby",
      a: num(a.nearbyCameraCount),
      b: num(b.nearbyCameraCount),
    },
    { key: "base", label: "Base elevation", a: elev(fa.baseElevationM), b: elev(fb.baseElevationM) },
    { key: "summit", label: "Summit elevation", a: elev(fa.summitElevationM), b: elev(fb.summitElevationM) },
    { key: "vertical", label: "Vertical drop", a: elev(fa.verticalM), b: elev(fb.verticalM) },
    { key: "terrain", label: "Skiable terrain", a: area(fa.skiableHectares), b: area(fb.skiableHectares) },
    { key: "lifts", label: "Lifts", a: num(fa.lifts), b: num(fb.lifts) },
    { key: "runs", label: "Runs", a: num(fa.runs), b: num(fb.runs) },
  ];
}

/* ------------------------------------------------------------------ */
/* Selection logic (the interactive tool)                              */
/* ------------------------------------------------------------------ */

export interface CompareSelection {
  a: string | null;
  b: string | null;
}

function knownSlug(raw: string | null | undefined): string | null {
  return raw && getSkiResort(raw) ? raw : null;
}

/**
 * Validate raw ?a= / ?b= params into a selection: unknown slugs drop
 * out, and a resort never compares against itself (the duplicate is
 * dropped, keeping the first).
 */
export function parseCompareSelection(
  aRaw: string | null | undefined,
  bRaw: string | null | undefined,
): CompareSelection {
  const a = knownSlug(aRaw);
  let b = knownSlug(bRaw);
  if (b !== null && b === a) b = null;
  return { a, b };
}

/**
 * Apply a picker change. Picking the resort already shown on the other
 * side swaps the two sides instead of producing a self-comparison;
 * picking the empty option clears that side.
 */
export function nextSelection(
  current: CompareSelection,
  side: "a" | "b",
  slug: string | null,
): CompareSelection {
  const next: CompareSelection = { ...current, [side]: slug };
  if (next.a !== null && next.a === next.b) {
    return side === "a"
      ? { a: next.a, b: current.a }
      : { a: current.b, b: next.b };
  }
  return next;
}
