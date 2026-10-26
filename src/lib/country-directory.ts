/**
 * OSIRIS — countries index directory: the pure search / filter / sort
 * behind the /cameras/countries table. Kept free of React so the
 * index page's client component and this module's tests share exactly
 * one implementation, and so the default view renders identically on
 * the server.
 *
 * Region assignment has exactly one source of truth on the site:
 * COUNTRY_REGION in country-page-content.ts — the map the per-country
 * pages, explore data and region landing pages already use. This
 * module derives its lookup from that map rather than keeping a
 * second, hand-authored copy, so the directory's filter chips can
 * never disagree with the region groupings elsewhere on the site.
 */

import { COUNTRY_REGION, type RegionKey } from "@/lib/country-page-content";

export interface CountryDirectoryEntry {
  slug: string;
  name: string;
  count: number;
  topCities: Array<{ name: string; count: number }>;
  /** Extra names the search matches: ISO codes + alternate names from
   *  the generated index, merged with SEARCH_ALIASES_BY_SLUG below. */
  aliases?: string[];
}

/**
 * Names people actually type that neither the country name nor the
 * generated aliases cover ("USA", "Holland", "Britain"). Folded at
 * match time, so case and punctuation variants come free.
 */
export const SEARCH_ALIASES_BY_SLUG: Record<string, string[]> = {
  "united-states": ["USA", "America", "United States of America"],
  "united-kingdom": ["Britain", "Great Britain", "England", "Scotland", "Wales"],
  "united-arab-emirates": ["UAE", "Emirates"],
  netherlands: ["Holland"],
  "south-korea": ["Korea", "Republic of Korea"],
  "north-korea": ["Korea"],
  czechia: ["Czech Republic"],
  russia: ["Russian Federation"],
  vietnam: ["Viet Nam"],
  turkey: ["Turkiye", "Türkiye"],
};

/** The directory's region keys are the site's canonical RegionKey values. */
export type CountryRegionKey = RegionKey;

export interface CountryRegion {
  key: CountryRegionKey;
  label: string;
}

/** The region filter chips, in the order the toolbar shows them. */
export const COUNTRY_REGIONS: CountryRegion[] = [
  { key: "africa", label: "Africa" },
  { key: "asia", label: "Asia" },
  { key: "europe", label: "Europe" },
  { key: "north-america", label: "North America" },
  { key: "south-america", label: "South America" },
  { key: "oceania", label: "Oceania" },
];

/**
 * Every catalogue country → its region, keyed by slug — derived from
 * COUNTRY_REGION (country-page-content.ts), the site's canonical
 * country→region map; no assignments are copied here. The coverage
 * test pins this lookup to exactly the slugs in
 * src/data/camera-countries.json: a country the generator adds fails
 * the suite until it is placed in COUNTRY_REGION, and a removed
 * country fails it until its line is dropped there.
 *
 * The canonical map's transcontinental calls: Russia, Turkey, Cyprus,
 * Georgia, Azerbaijan and Armenia sit under Europe; Kazakhstan under
 * Asia; Egypt under Africa. Central American and Caribbean entries
 * sit under North America; Indonesia under Asia; Christmas Island
 * under Oceania.
 */
export const DIRECTORY_REGION_BY_SLUG: Record<string, CountryRegionKey> =
  COUNTRY_REGION;

export function regionForCountry(slug: string): CountryRegionKey | undefined {
  return DIRECTORY_REGION_BY_SLUG[slug];
}

export type CountrySortKey = "name-asc" | "cameras-desc" | "cameras-asc";

export interface CountryDirectoryQuery {
  /** Free text matched against the country name and its top city names. */
  search: string;
  /** Region key, or null for every region. */
  region: CountryRegionKey | null;
  sort: CountrySortKey;
}

export const DEFAULT_COUNTRY_DIRECTORY_QUERY: CountryDirectoryQuery = {
  search: "",
  region: null,
  sort: "name-asc",
};

/**
 * Letters that do not decompose under NFD, folded to the ASCII a
 * visitor would type (the same folding the ski directory uses, so the
 * two directory pages search alike).
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

/** Case- and diacritic-insensitive folding for search: "curacao" finds Curaçao. */
export function foldForSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[æœßðđþłø]/g, (ch) => NON_DECOMPOSING[ch] ?? ch);
}

/**
 * City match anchored at a word start. A bare substring test made the
 * query "usa" match Jer**usa**lem, Bul**usa**n and B**usa**n — a city
 * only counts when the needle begins the city name or one of its words.
 */
function cityMatchesNeedle(foldedCity: string, needle: string): boolean {
  if (foldedCity.startsWith(needle)) return true;
  return foldedCity.split(/[\s\-/]+/).some((w) => w.startsWith(needle));
}

export function countryMatchesSearch(
  entry: CountryDirectoryEntry,
  search: string,
): boolean {
  const needle = foldForSearch(search.trim());
  if (!needle) return true;
  if (foldForSearch(entry.name).includes(needle)) return true;
  const aliases = [...(entry.aliases ?? []), ...(SEARCH_ALIASES_BY_SLUG[entry.slug] ?? [])];
  if (aliases.some((a) => foldForSearch(a).includes(needle))) return true;
  return entry.topCities.some((city) => cityMatchesNeedle(foldForSearch(city.name), needle));
}

/** The top city that made a search match (for the row's "via" hint), or null. */
export function matchedCityName(
  entry: CountryDirectoryEntry,
  search: string,
): string | null {
  const needle = foldForSearch(search.trim());
  if (!needle) return null;
  if (foldForSearch(entry.name).includes(needle)) return null;
  const hit = entry.topCities.find((city) => cityMatchesNeedle(foldForSearch(city.name), needle));
  return hit ? hit.name : null;
}

export function filterCountries(
  entries: readonly CountryDirectoryEntry[],
  query: Pick<CountryDirectoryQuery, "search" | "region">,
): CountryDirectoryEntry[] {
  return entries.filter(
    (entry) =>
      (query.region === null || regionForCountry(entry.slug) === query.region) &&
      countryMatchesSearch(entry, query.search),
  );
}

/**
 * The page's long-standing name order: the index page has always
 * sorted with localeCompare, and the default view must render the
 * identical table (the JSON-LD ItemList keeps the same order too), so
 * name ordering stays localeCompare rather than the folded compare.
 */
function compareByName(a: CountryDirectoryEntry, b: CountryDirectoryEntry): number {
  const byLocale = a.name.localeCompare(b.name);
  if (byLocale !== 0) return byLocale;
  return a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0;
}

export function sortCountries(
  entries: readonly CountryDirectoryEntry[],
  sort: CountrySortKey,
): CountryDirectoryEntry[] {
  const copy = [...entries];
  switch (sort) {
    case "cameras-desc":
      copy.sort((a, b) => b.count - a.count || compareByName(a, b));
      break;
    case "cameras-asc":
      copy.sort((a, b) => a.count - b.count || compareByName(a, b));
      break;
    case "name-asc":
    default:
      copy.sort(compareByName);
      break;
  }
  return copy;
}

/** Searching or region-filtering is what shows the "N countries" line. */
export function isCountryDirectoryFiltering(
  query: Pick<CountryDirectoryQuery, "search" | "region">,
): boolean {
  return query.search.trim() !== "" || query.region !== null;
}

export function applyCountryDirectoryQuery(
  entries: readonly CountryDirectoryEntry[],
  query: CountryDirectoryQuery,
): CountryDirectoryEntry[] {
  return sortCountries(filterCountries(entries, query), query.sort);
}

/** Per-region country counts for the filter chips, in chip order. */
export function countryRegionCounts(
  entries: readonly CountryDirectoryEntry[],
): Array<{ region: CountryRegion; count: number }> {
  return COUNTRY_REGIONS.map((region) => ({
    region,
    count: entries.filter((entry) => regionForCountry(entry.slug) === region.key)
      .length,
  }));
}
