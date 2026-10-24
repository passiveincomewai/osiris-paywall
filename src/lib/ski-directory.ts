/**
 * OSIRIS — ski hub directory: the pure search / filter / sort behind the
 * /ski-webcams resort directory. Kept free of React so the hub's client
 * component and this module's tests share exactly one implementation,
 * and so the grouped default view renders identically on the server.
 */
import type { SkiResort } from "./ski-resorts";

/** One verified resort logo, as recorded in src/data/ski-logos.json. */
export interface SkiResortLogo {
  /** Site-root path of the saved icon, e.g. "/ski-logos/snowbird.png". */
  src: string;
  /** The resort's verified official domain the icon was fetched from. */
  domain: string;
}

export type SkiResortLogoMap = Record<string, SkiResortLogo>;

export type SkiSortKey = "name-asc" | "name-desc" | "cameras";

export interface SkiDirectoryQuery {
  /** Free text matched against name, town, region and country. */
  search: string;
  /** Exact country name, or null for every country. */
  country: string | null;
  sort: SkiSortKey;
}

export const DEFAULT_SKI_DIRECTORY_QUERY: SkiDirectoryQuery = {
  search: "",
  country: null,
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
  query: Pick<SkiDirectoryQuery, "search" | "country">,
): SkiResort[] {
  return resorts.filter(
    (r) =>
      (query.country === null || r.country === query.country) &&
      resortMatchesSearch(r, query.search),
  );
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

/** Searching or country-filtering switches the directory to a flat grid. */
export function isSkiDirectoryFiltering(query: SkiDirectoryQuery): boolean {
  return query.search.trim() !== "" || query.country !== null;
}

export interface SkiDirectoryResult {
  filtering: boolean;
  /** Resorts matching the query, before grouping. */
  total: number;
  /** Grouped presentation (not filtering): countries in hub order. */
  groups: Array<{ country: string; resorts: SkiResort[] }>;
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
  /* Group first, then sort within each group: the country order is
     the hub's established one and must not follow the sort. */
  return {
    filtering,
    total: matched.length,
    groups: groupSkiResortsByCountry(matched).map((g) => ({
      country: g.country,
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
