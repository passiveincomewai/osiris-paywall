/**
 * OSIRIS — the pure search / sort behind the US state browser on the
 * United States pages (the state grid on /us-traffic-cameras and the
 * by-state section on the United States country page). Kept free of
 * React so the client component and this module's tests share exactly
 * one implementation — the lib/country-directory pattern.
 *
 * The rows are the generated per-state records (src/data/us-states.json
 * via lib/us-states): the same counts the state pages themselves
 * render, so a card can never quote a number its destination page
 * disagrees with.
 */

import { foldForSearch } from "@/lib/country-directory";

export interface UsStateEntry {
  slug: string;
  name: string;
  usps: string;
  count: number;
}

export type UsStateSortKey = "name-asc" | "cameras-desc" | "cameras-asc";

export interface UsStateQuery {
  search: string;
  sort: UsStateSortKey;
}

export const US_STATE_SORT_OPTIONS: Array<{
  value: UsStateSortKey;
  label: string;
}> = [
  { value: "name-asc", label: "Name A–Z" },
  { value: "cameras-desc", label: "Most cameras" },
  { value: "cameras-asc", label: "Fewest cameras" },
];

/**
 * Folded match over the state's name and its USPS code — "tx",
 * "Texas" and "new y" all behave the way a visitor expects. Prefix
 * matches on the name rank ahead of substring matches (and the USPS
 * exact code counts as a prefix), mirroring matchCityOptions' ranking
 * on the country pages.
 */
export function matchUsStates(
  states: readonly UsStateEntry[],
  rawValue: string,
): UsStateEntry[] {
  const q = foldForSearch(rawValue.trim());
  if (!q) return [...states];
  const prefix: UsStateEntry[] = [];
  const substring: UsStateEntry[] = [];
  for (const s of states) {
    const name = foldForSearch(s.name);
    if (name.startsWith(q) || foldForSearch(s.usps) === q) prefix.push(s);
    else if (name.includes(q)) substring.push(s);
  }
  /* A–Z inside each relevance group: deterministic whatever order
     the caller handed the states over in. */
  const byName = (a: UsStateEntry, b: UsStateEntry) =>
    a.name.localeCompare(b.name);
  return [...prefix.sort(byName), ...substring.sort(byName)];
}

export function applyUsStateQuery(
  states: readonly UsStateEntry[],
  query: UsStateQuery,
): UsStateEntry[] {
  const matched = matchUsStates(states, query.search);
  const sorted = [...matched];
  switch (query.sort) {
    case "cameras-desc":
      sorted.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
      break;
    case "cameras-asc":
      sorted.sort((a, b) => a.count - b.count || a.name.localeCompare(b.name));
      break;
    case "name-asc":
    default:
      /* A typed search keeps its relevance order (prefix before
         substring); the A–Z sort applies only to the unfiltered list,
         the CountriesDirectory behaviour. */
      if (!query.search.trim()) {
        sorted.sort((a, b) => a.name.localeCompare(b.name));
      }
      break;
  }
  return sorted;
}

export function isUsStateFiltering(query: UsStateQuery): boolean {
  return query.search.trim().length > 0 || query.sort !== "name-asc";
}
