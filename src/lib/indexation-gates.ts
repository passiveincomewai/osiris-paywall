/**
 * OSIRIS — C10 indexation gates (INTENT-AND-CLUSTERS §4.5, owner-approved
 * 2026-10-27, enforced 2026-10-28).
 *
 * §4.5 sets minimum substance thresholds per programmatic family. Below
 * the line a page stops being offered to search engines — it is NOT
 * deleted for users:
 *
 *   Country  ≥25 cameras OR ≥3 areas, else hub consolidation: no
 *            standalone page, a row on the regional hub with its
 *            cameras watchable there, a linkless row in the country
 *            directory, out of the sitemap, and the old URL 301s to
 *            the hub anchor (next.config.ts — pinned against this
 *            module by indexation-gates.test.ts).
 *   City     (generated tier) ≥50 cameras AND — for the 50–70 band —
 *            ≥2 of {operator diversity ≥2 sources, corridor breakdown
 *            ≥2 corridors, kind-mix ≥3 kinds}. Below: the page stays
 *            live with `noindex` metadata. See the city-scale note
 *            below for the one deliberate scoping of the count gate.
 *   State    ≥100 cameras OR ≥5 areas, else it must carry BOTH of the
 *            template's §4.2 blocks (corridor table, operator table)
 *            to stay indexable; if neither block can be built from
 *            data, `noindex`. (DC builds both and stays; Mississippi
 *            and Rhode Island build neither.)
 *   Ski      a facts row AND (≥1 on-mountain OR ≥5 nearby cameras),
 *            else the resort folds into the /ski-webcams hub as a
 *            listed resort without a detail page (out of the sitemap;
 *            the old URL 301s to the hub).
 *
 * Every set here is DERIVED from the same committed datasets the pages
 * are generated from (camera-countries.json, city-pages.json,
 * us-states.json, ski-resorts.json + ski-resort-facts.json), so a
 * catalogue rebuild re-evaluates the gates automatically. The two
 * overrides that data alone cannot express — the traffic-gate
 * exclusion and the city count-gate scoping — are explicit, dated
 * constants below, each with its provenance.
 *
 * The async halves of the city/state rules (corridor/mix/operator
 * counts) are computed by the templates from src/lib/place-breakdown,
 * using the pure element counters exported here, so the page metadata
 * and this module can never disagree about what counts as an element.
 */

import countriesIndex from "@/data/camera-countries.json";
import cityPages from "@/data/city-pages.json";
import usStates from "@/data/us-states.json";
import skiResorts from "@/data/ski-resorts.json";
import skiFacts from "@/data/ski-resort-facts.json";
import {
  COUNTRY_REGION,
  REGION_HUB,
  type RegionKey,
} from "@/lib/country-page-content";

/* ------------------------------------------------------------------ */
/* Countries — hub consolidation                                       */
/* ------------------------------------------------------------------ */

export const COUNTRY_MIN_CAMERAS = 25;
export const COUNTRY_MIN_AREAS = 3;

interface CountryIndexEntry {
  slug: string;
  name: string;
  count: number;
  cityCount: number;
  topCities: Array<{ name: string; count: number }>;
  samples: Array<{ id: string; name: string; city: string }>;
}

const COUNTRY_INDEX = (countriesIndex as { countries: CountryIndexEntry[] })
  .countries;

/**
 * Traffic gate (C10 enforcement rule, 2026-10-28): a below-line URL
 * with meaningful real traffic is NOT consolidated silently — it is
 * excluded here and flagged to the owner instead. Iran's country page
 * measured 59 pageviews in the 28 days to 2026-10-28 (Neon PageView)
 * despite a single indexed camera, so it keeps its page until the
 * owner decides or the traffic falls away. Remove a slug from this
 * map to let the data gate apply to it again.
 */
export const COUNTRY_TRAFFIC_GATE_EXCLUSIONS: Record<
  string,
  { pv28d: number; measuredOn: string }
> = {
  iran: { pv28d: 59, measuredOn: "2026-10-28" },
};

export interface ConsolidatedCountry {
  slug: string;
  name: string;
  count: number;
  areas: number;
  topCities: Array<{ name: string; count: number }>;
  samples: Array<{ id: string; name: string; city: string }>;
  region: RegionKey;
  /** The regional hub route, or null where the site has no hub for
   *  the region yet (Africa — REGION_HUB's own gap). */
  hubHref: string | null;
  /** Where the old country URL 301s to: the hub row's anchor, or the
   *  directory row's anchor for hub-less Africa. */
  redirectTarget: string;
}

function consolidatedCountry(c: CountryIndexEntry): ConsolidatedCountry {
  const region = COUNTRY_REGION[c.slug];
  const hub = REGION_HUB[region];
  return {
    slug: c.slug,
    name: c.name,
    count: c.count,
    areas: c.cityCount,
    topCities: c.topCities,
    samples: c.samples,
    region,
    hubHref: hub ? hub.href : null,
    redirectTarget: hub ? `${hub.href}#${c.slug}` : `/cameras/countries#${c.slug}`,
  };
}

/** Every catalogue country below the §4.5 line, minus traffic-gate
 *  exclusions, in slug order. Derived — never hand-edit the result;
 *  change the data or the exclusion map. */
export const CONSOLIDATED_COUNTRIES: ConsolidatedCountry[] = COUNTRY_INDEX
  .filter(
    (c) =>
      c.count < COUNTRY_MIN_CAMERAS &&
      c.cityCount < COUNTRY_MIN_AREAS &&
      !(c.slug in COUNTRY_TRAFFIC_GATE_EXCLUSIONS),
  )
  .map(consolidatedCountry)
  .sort((a, b) => (a.slug < b.slug ? -1 : 1));

export const CONSOLIDATED_COUNTRY_SLUGS: ReadonlySet<string> = new Set(
  CONSOLIDATED_COUNTRIES.map((c) => c.slug),
);

export function isConsolidatedCountry(slug: string): boolean {
  return CONSOLIDATED_COUNTRY_SLUGS.has(slug);
}

export function consolidatedCountriesInRegion(
  region: RegionKey,
): ConsolidatedCountry[] {
  return CONSOLIDATED_COUNTRIES.filter((c) => c.region === region);
}

/** Countries that keep a standalone page (109 − 35 = 74 at the
 *  2026-10-20 catalogue snapshot). site-stats' DIRECTORY_COUNTRY_COUNT
 *  mirrors this number and is pinned to it by the gates test. */
export const COUNTRY_PAGE_COUNT =
  COUNTRY_INDEX.length - CONSOLIDATED_COUNTRIES.length;

/** The redirect table next.config.ts must carry for consolidated
 *  countries (asserted verbatim by indexation-gates.test.ts). */
export const COUNTRY_CONSOLIDATION_REDIRECTS: Array<{
  source: string;
  destination: string;
}> = CONSOLIDATED_COUNTRIES.map((c) => ({
  source: `/cameras/countries/${c.slug}`,
  destination: c.redirectTarget,
}));

/* ------------------------------------------------------------------ */
/* Cities — noindex (generated tier only; curated cities are editorial */
/* and exempt per §4.5).                                               */
/* ------------------------------------------------------------------ */

export const CITY_MIN_CAMERAS = 50;
export const CITY_BAND_MAX_CAMERAS = 70;

/**
 * CITY-SCALE SCOPING (deliberate, flagged to the owner in the C10
 * enforcement report): §4.5's ≥50 count gate was written against the
 * original 160-city programme, whose build gate was already ≥50 — the
 * six cities below leaked under it when the dominant-cluster recount
 * (payload113) pushed them to 39–49, and the owner approved noindex
 * for exactly this measured set (2026-10-27). The city-scale wave
 * shipped the same week admitted 123 further cities under the owner's
 * own newer criterion (keyword menu: "more programmatic city pages
 * (≥25 cams)") — 122 of them sit at 25–49 cameras. Noindexing those
 * on §4.5's authority would reverse a fresher owner decision, so the
 * count gate is enforced here ONLY for the approved measured set,
 * re-checked against live counts (a city that grows back to ≥50 drops
 * out automatically). The 50–70 element rule below is NOT scoped: it
 * applies to every generated city in the band, and its failing set
 * re-measured identical to the approved one.
 */
export const CITY_COUNT_GATE_ENFORCED_SLUGS: ReadonlySet<string> = new Set([
  "albany",
  "cleveland",
  "marysville",
  "riverside",
  "san-bernardino",
  "yoakum",
]);

interface GenCityEntry {
  slug: string;
  count: number;
  sourceCount: number;
}

const GEN_CITIES = cityPages.cities as unknown as GenCityEntry[];
const GEN_CITY_BY_SLUG = new Map(GEN_CITIES.map((g) => [g.slug, g]));

/** True when a generated city fails the (scoped) count gate right now. */
export function cityFailsCountGate(slug: string): boolean {
  const g = GEN_CITY_BY_SLUG.get(slug);
  if (!g) return false;
  return g.count < CITY_MIN_CAMERAS && CITY_COUNT_GATE_ENFORCED_SLUGS.has(slug);
}

/** True when a generated city sits in the 50–70 band, where indexation
 *  additionally requires ≥2 data elements (see countCityElements). */
export function cityInElementBand(slug: string): boolean {
  const g = GEN_CITY_BY_SLUG.get(slug);
  if (!g) return false;
  return g.count >= CITY_MIN_CAMERAS && g.count <= CITY_BAND_MAX_CAMERAS;
}

export function citySourceCount(slug: string): number | null {
  return GEN_CITY_BY_SLUG.get(slug)?.sourceCount ?? null;
}

/**
 * The §4.5 second condition, counted the same way by the measurement
 * probe, the city template's metadata and the tests: one element each
 * for operator diversity (≥2 sources), a corridor breakdown that
 * fires (≥2 corridors) and a kind-mix strip that fires (≥3 kinds).
 * A null breakdown (chunk/name mismatch) scores corridors and mix as
 * absent — pass -1 for either to mark it unavailable.
 */
export function countCityElements(input: {
  sources: number;
  corridors: number;
  mixKinds: number;
}): number {
  return (
    (input.sources >= 2 ? 1 : 0) +
    (input.corridors >= 2 ? 1 : 0) +
    (input.mixKinds >= 3 ? 1 : 0)
  );
}

export const CITY_MIN_ELEMENTS = 2;

/* ------------------------------------------------------------------ */
/* States — noindex when below the line AND neither §4.2 block builds  */
/* ------------------------------------------------------------------ */

export const STATE_MIN_CAMERAS = 100;
export const STATE_MIN_AREAS = 5;

interface StateIndexEntry {
  slug: string;
  count: number;
  areas: Array<{ name: string; count: number }>;
}

const STATE_INDEX = (usStates as { states: StateIndexEntry[] }).states;
const STATE_BY_SLUG = new Map(STATE_INDEX.map((s) => [s.slug, s]));

/** Below the §4.5 state line (<100 cameras AND <5 areas). At the
 *  current snapshot: District of Columbia, Mississippi, Rhode Island.
 *  DC still earns its page — both of its §4.2 blocks build — which the
 *  template checks with stateBlocksBuildable; MS and RI build neither
 *  and are noindexed. */
export function stateBelowLine(slug: string): boolean {
  const s = STATE_BY_SLUG.get(slug);
  if (!s) return false;
  return s.count < STATE_MIN_CAMERAS && s.areas.length < STATE_MIN_AREAS;
}

/**
 * Whether a below-line state keeps its indexation: §4.5 requires the
 * §4.2 corridor table AND operator block; the state template renders
 * the corridor table only when the breakdown total is ≥25 with ≥2
 * corridors, and the operator table only with ≥2 operator rows. This
 * mirrors those render gates exactly — noindex applies only when
 * NEITHER can be built.
 */
export function stateBlocksBuildable(input: {
  breakdownTotal: number | null;
  corridors: number;
  operatorRows: number;
}): { corridor: boolean; operator: boolean; any: boolean } {
  const corridor =
    input.breakdownTotal !== null &&
    input.breakdownTotal >= 25 &&
    input.corridors >= 2;
  const operator = input.operatorRows >= 2;
  return { corridor, operator, any: corridor || operator };
}

/* ------------------------------------------------------------------ */
/* Ski resorts — fold into the hub                                     */
/* ------------------------------------------------------------------ */

interface ResortIndexEntry {
  slug: string;
  name: string;
  resortCameraCount: number;
  nearbyCameraCount: number;
}

const RESORT_INDEX = (skiResorts as { resorts: ResortIndexEntry[] }).resorts;
const FACTS = skiFacts as Record<string, unknown>;

/** The §4.5 ski gate: a facts row AND (≥1 on-mountain OR ≥5 nearby). */
export function resortPassesGate(r: ResortIndexEntry): boolean {
  return (
    r.slug in FACTS &&
    (r.resortCameraCount >= 1 || r.nearbyCameraCount >= 5)
  );
}

/** Resorts that fold into the /ski-webcams hub (listed, no detail
 *  page). Re-measured after the 2026-10-28 facts sourcing for the
 *  camera-rich five (Grouse Mountain, Myoko Kogen, Diamond Peak,
 *  Tomamu, Voss): Blue Mountain (Ontario), Pyhä, Oppdal, June
 *  Mountain, Hoodoo. */
export const FOLDED_RESORT_SLUGS: ReadonlySet<string> = new Set(
  RESORT_INDEX.filter((r) => !resortPassesGate(r)).map((r) => r.slug),
);

export function isFoldedResort(slug: string): boolean {
  return FOLDED_RESORT_SLUGS.has(slug);
}

export const RESORT_PAGE_COUNT = RESORT_INDEX.length - FOLDED_RESORT_SLUGS.size;

/** The redirect table next.config.ts must carry for folded resorts. */
export const SKI_FOLD_REDIRECTS: Array<{
  source: string;
  destination: string;
}> = [...FOLDED_RESORT_SLUGS].sort().map((slug) => ({
  source: `/ski-webcams/${slug}`,
  destination: "/ski-webcams",
}));
