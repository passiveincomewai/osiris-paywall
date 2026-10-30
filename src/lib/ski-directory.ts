/**
 * OSIRIS — ski hub directory: the pure search / filter / sort behind the
 * /ski-webcams resort directory. Kept free of React so the hub's client
 * component and this module's tests share exactly one implementation,
 * and so the grouped default view renders identically on the server.
 */
import type { SkiResort } from "./ski-resorts";
import {
  passesForResort,
  SKI_PASS_NAMES,
  type SkiPassName,
} from "./ski-resort-passes";

/** One verified resort logo, as recorded in src/data/ski-logos.json. */
export interface SkiResortLogo {
  /** Site-root path of the saved icon, e.g. "/ski-logos/snowbird.png". */
  src: string;
  /** The resort's verified official domain the icon was fetched from. */
  domain: string;
}

export type SkiResortLogoMap = Record<string, SkiResortLogo>;

export type SkiSortKey = "name-asc" | "name-desc" | "cameras";

/** How the unfiltered directory groups its resorts. */
export type SkiGroupBy = "country" | "region" | "pass";

/** Pass filter: a programme name, "none" (no documented affiliation
 *  among the four programmes), or null for every resort. */
export type SkiPassFilter = SkiPassName | "none" | null;

export interface SkiDirectoryQuery {
  /** Free text matched against name, town, region and country. */
  search: string;
  /** Exact country name, or null for every country. */
  country: string | null;
  /** Pass programme filter (documented affiliations only). */
  pass: SkiPassFilter;
  /** Grouping for the unfiltered view. */
  groupBy: SkiGroupBy;
  sort: SkiSortKey;
}

export const DEFAULT_SKI_DIRECTORY_QUERY: SkiDirectoryQuery = {
  search: "",
  country: null,
  pass: null,
  groupBy: "country",
  sort: "name-asc",
};

/** A resort's full camera count: its own feeds plus the nearby ring. */
export function totalCameras(resort: SkiResort): number {
  return resort.resortCameraCount + resort.nearbyCameraCount;
}

/**
 * Letters that do not decompose under NFD, folded to the ASCII a
 * visitor would type: Hlíðarfjall is found by "hlidarfjall", a
 * Norwegian "ø" town by "o".
 */
const NON_DECOMPOSING: Record<string, string> = {
  æ: "ae",
  œ: "oe",
  ß: "ss",
  ð: "d",
  đ: "d",
  þ: "th",
  ł: "l",
  ø: "o",
};

/**
 * Case- and diacritic-insensitive folding for search and name ordering,
 * so "hlidarfjall" finds Hlíðarfjall and "are" finds Åre. Starts from
 * the same NFD-strip the resort slugifier uses, then folds the letters
 * NFD leaves behind.
 */
export function foldForSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[æœßðđþłø]/g, (ch) => NON_DECOMPOSING[ch] ?? ch);
}

export function resortMatchesSearch(resort: SkiResort, search: string): boolean {
  const needle = foldForSearch(search.trim());
  if (!needle) return true;
  return [resort.name, resort.town, resort.region, resort.country].some((field) =>
    foldForSearch(field).includes(needle),
  );
}

export function filterSkiResorts(
  resorts: readonly SkiResort[],
  query: Pick<SkiDirectoryQuery, "search" | "country"> &
    Partial<Pick<SkiDirectoryQuery, "pass">>,
): SkiResort[] {
  return resorts.filter(
    (r) =>
      (query.country === null || r.country === query.country) &&
      (query.pass == null ||
        (query.pass === "none"
          ? passesForResort(r.slug).length === 0
          : passesForResort(r.slug).includes(query.pass))) &&
      resortMatchesSearch(r, query.search),
  );
}

/** Per-programme resort counts for the pass filter chips, canonical
 *  programme order, plus the no-documented-pass count. */
export function skiPassCounts(
  resorts: readonly SkiResort[],
): { passes: Array<{ pass: SkiPassName; count: number }>; none: number } {
  const counts = new Map<SkiPassName, number>(SKI_PASS_NAMES.map((p) => [p, 0]));
  let none = 0;
  for (const r of resorts) {
    const list = passesForResort(r.slug);
    if (list.length === 0) none += 1;
    for (const p of list) counts.set(p, (counts.get(p) ?? 0) + 1);
  }
  return {
    passes: SKI_PASS_NAMES.map((pass) => ({ pass, count: counts.get(pass) ?? 0 })),
    none,
  };
}

function compareByName(a: SkiResort, b: SkiResort): number {
  const an = foldForSearch(a.name);
  const bn = foldForSearch(b.name);
  if (an !== bn) return an < bn ? -1 : 1;
  return a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0;
}

export function sortSkiResorts(
  resorts: readonly SkiResort[],
  sort: SkiSortKey,
): SkiResort[] {
  const copy = [...resorts];
  switch (sort) {
    case "name-desc":
      copy.sort((a, b) => -compareByName(a, b));
      break;
    case "cameras":
      copy.sort((a, b) => totalCameras(b) - totalCameras(a) || compareByName(a, b));
      break;
    case "name-asc":
    default:
      copy.sort(compareByName);
      break;
  }
  return copy;
}

/**
 * Group resorts by country, countries in first-appearance order (the
 * order the hub has always rendered them), resorts in input order
 * within each group.
 */
export function groupSkiResortsByCountry(
  resorts: readonly SkiResort[],
): Array<{ country: string; resorts: SkiResort[] }> {
  const groups = new Map<string, SkiResort[]>();
  for (const r of resorts) {
    const list = groups.get(r.country) ?? [];
    list.push(r);
    groups.set(r.country, list);
  }
  return [...groups.entries()].map(([country, list]) => ({ country, resorts: list }));
}

/** Per-country resort counts for the filter chips, first-appearance order. */
export function skiCountryCounts(
  resorts: readonly SkiResort[],
): Array<{ country: string; count: number }> {
  return groupSkiResortsByCountry(resorts).map(({ country, resorts: list }) => ({
    country,
    count: list.length,
  }));
}

/** One labelled group of resorts in the unfiltered presentation. */
export interface SkiDirectoryGroup {
  key: string;
  label: string;
  resorts: SkiResort[];
}

/**
 * Group resorts by region (state / province / canton / prefecture).
 * Groups follow the hub's country order, regions alphabetical within a
 * country; the label carries the country where a bare region name
 * would be ambiguous across countries.
 */
export function groupSkiResortsByRegion(
  resorts: readonly SkiResort[],
): SkiDirectoryGroup[] {
  const countryOrder = new Map<string, number>();
  for (const r of resorts) {
    if (!countryOrder.has(r.country)) countryOrder.set(r.country, countryOrder.size);
  }
  const regionCountries = new Map<string, Set<string>>();
  for (const r of resorts) {
    const set = regionCountries.get(r.region) ?? new Set<string>();
    set.add(r.country);
    regionCountries.set(r.region, set);
  }
  const groups = new Map<string, SkiDirectoryGroup & { country: string }>();
  for (const r of resorts) {
    const key = `${r.country}::${r.region}`;
    const label =
      (regionCountries.get(r.region)?.size ?? 0) > 1
        ? `${r.region} · ${r.country}`
        : r.region;
    const group = groups.get(key) ?? { key, label, country: r.country, resorts: [] };
    group.resorts.push(r);
    groups.set(key, group);
  }
  return [...groups.values()]
    .sort(
      (a, b) =>
        (countryOrder.get(a.country) ?? 0) - (countryOrder.get(b.country) ?? 0) ||
        a.label.localeCompare(b.label),
    )
    .map(({ key, label, resorts: list }) => ({ key, label, resorts: list }));
}

/**
 * Group resorts by pass programme, in canonical programme order. A
 * resort with two documented affiliations appears under each — the
 * directory says so where it renders this grouping. Resorts with no
 * documented affiliation among the four programmes close the list
 * under an explicit "no listed pass" label.
 */
export function groupSkiResortsByPass(
  resorts: readonly SkiResort[],
): SkiDirectoryGroup[] {
  const groups: SkiDirectoryGroup[] = SKI_PASS_NAMES.map((pass) => ({
    key: `pass:${pass}`,
    label: pass,
    resorts: resorts.filter((r) => passesForResort(r.slug).includes(pass)),
  })).filter((g) => g.resorts.length > 0);
  const independent = resorts.filter((r) => passesForResort(r.slug).length === 0);
  if (independent.length > 0) {
    groups.push({
      key: "pass:none",
      label: "Independent — no listed pass",
      resorts: independent,
    });
  }
  return groups;
}

/** Searching, country-filtering or pass-filtering switches the
 *  directory to a flat grid. */
export function isSkiDirectoryFiltering(query: SkiDirectoryQuery): boolean {
  return (
    query.search.trim() !== "" || query.country !== null || query.pass !== null
  );
}

export interface SkiDirectoryResult {
  filtering: boolean;
  /** Resorts matching the query, before grouping. */
  total: number;
  /** Grouped presentation (not filtering), per the query's groupBy. */
  groups: SkiDirectoryGroup[];
  /** Flat presentation (filtering): every match, sorted. */
  flat: SkiResort[];
}

export function applySkiDirectoryQuery(
  resorts: readonly SkiResort[],
  query: SkiDirectoryQuery,
): SkiDirectoryResult {
  const filtering = isSkiDirectoryFiltering(query);
  const matched = filterSkiResorts(resorts, query);
  if (filtering) {
    return {
      filtering,
      total: matched.length,
      groups: [],
      flat: sortSkiResorts(matched, query.sort),
    };
  }
  /* Group first, then sort within each group: the group order is the
     hub's established one and must not follow the sort. */
  const grouped =
    query.groupBy === "region"
      ? groupSkiResortsByRegion(matched)
      : query.groupBy === "pass"
        ? groupSkiResortsByPass(matched)
        : groupSkiResortsByCountry(matched).map((g) => ({
            key: `country:${g.country}`,
            label: g.country,
            resorts: g.resorts,
          }));
  return {
    filtering,
    total: matched.length,
    groups: grouped.map((g) => ({
      ...g,
      resorts: sortSkiResorts(g.resorts, query.sort),
    })),
    flat: [],
  };
}

/**
 * Two-letter monogram for a resort without a verified logo: the first
 * letters of the first two words ("Whistler Blackcomb" → "WB"), or the
 * first two letters of a single-word name ("Obertauern" → "OB").
 * Hyphens and punctuation separate words ("Andermatt-Sedrun" → "AS").
 */
export function resortInitials(name: string): string {
  const words = name.split(/[^\p{L}]+/u).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return "?";
}
