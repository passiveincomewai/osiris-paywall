/**
 * OSIRIS — city camera rosters (camera findability rollout, Phase 1,
 * 2026-10-30): every camera a city page owns, as crawlable text.
 *
 * A city page's record set is the one its explorer already serves —
 * src/lib/explore-data.ts recordsForDef() with a {country, city} def:
 * the per-country chunk's records whose cleaned `city` value is the
 * city's own name (the city semantics tools/build-city-pages.mjs
 * documents — state, county and corridor values in that field are
 * other hubs' cameras, never this page's), reduced to the dominant
 * place when one name files two real places. This module turns that
 * set into roster rows: the exact catalogue name, the city context,
 * and a deep link target (the catalogue id; the page renders
 * /?camera=<id>, the globe's existing deep link).
 *
 * Duplicate names are real (two cameras can share an operator label —
 * 358 exact name+city collisions in the US chunk alone). A repeated
 * name earns a qualifier built from real fields only: the record's
 * own source first (the "· GDOT" form), then the catalogue short-id
 * (the id's final segment) when the source cannot tell the group
 * apart, and the full id when even that ties. Nothing is invented.
 */

import { clean, type CountryCamera } from "@/lib/country-cameras";

export interface RosterEntry {
  /** Catalogue id — the /?camera=<id> deep link's target. */
  id: string;
  /** The catalogue's exact name for this camera (whitespace-cleaned). */
  name: string;
  /** The record's own cleaned city value (the page's city). */
  city: string;
  /** Display qualifier for a repeated name, or null when the name is
   *  unique in this roster. Bare text — the renderer adds the "·". */
  qualifier: string | null;
}

/** The records of one chunk that belong to one city: cleaned `city`
 *  exactly equals the cleaned city name. The same predicate
 *  explore-data's applyScope applies for a city def. */
export function cityRecords(
  records: readonly CountryCamera[],
  cityName: string,
): CountryCamera[] {
  const wanted = clean(cityName);
  return records.filter((r) => clean(r.city) === wanted);
}

/** The catalogue short-id: the id's final dash segment ("occ-ok-…"
 *  harvest ids end in the operator's numeric id; "gdot-13532" ends in
 *  the camera number). An id with no dash is its own short-id. */
export function shortId(id: string): string {
  const at = id.lastIndexOf("-");
  return at > 0 ? id.slice(at + 1) : id;
}

function qualifierFor(group: CountryCamera[]): Map<string, string> {
  const byId = new Map<string, string>();
  const sources = group.map((r) => clean(r.source));
  if (
    sources.every((s) => s.length > 0) &&
    new Set(sources).size === sources.length
  ) {
    group.forEach((r, i) => byId.set(r.id, sources[i]));
    return byId;
  }
  const shorts = group.map((r) => shortId(r.id));
  const shortsWork = new Set(shorts).size === shorts.length;
  group.forEach((r, i) => byId.set(r.id, shortsWork ? shorts[i] : r.id));
  return byId;
}

/**
 * Roster rows for one city's record set (already the city's own set —
 * see the header), in name order (then id) so the list is stable and
 * scannable. Records without an id or a name cannot be linked or
 * named and are dropped; every other record appears exactly once.
 */
export function buildCityRoster(
  records: readonly CountryCamera[],
): RosterEntry[] {
  const usable = records.filter((r) => r.id && clean(r.name).length > 0);
  const byName = new Map<string, CountryCamera[]>();
  for (const r of usable) {
    const name = clean(r.name);
    const group = byName.get(name) ?? [];
    group.push(r);
    byName.set(name, group);
  }
  const qualifiers = new Map<string, string>();
  for (const group of byName.values()) {
    if (group.length < 2) continue;
    for (const [id, q] of qualifierFor(group)) qualifiers.set(id, q);
  }
  return usable
    .map((r) => ({
      id: r.id,
      name: clean(r.name),
      city: clean(r.city),
      qualifier: qualifiers.get(r.id) ?? null,
    }))
    .sort((a, b) =>
      a.name === b.name
        ? a.id < b.id
          ? -1
          : a.id > b.id
            ? 1
            : 0
        : a.name.localeCompare(b.name),
    );
}

/**
 * Whether a resolved roster is the city's full story, judged against
 * the count the page itself quotes (the generated JSON count for the
 * generated tier, the hand config's count for editorial cities):
 * either the set clears the page's own explorer substance line (25 —
 * the same bar cityChunkStats' consumers use), or it reproduces the
 * quoted count exactly, which is what lets a one-camera city render
 * its one camera. Anything else (Sydney: the chunk files its feeds
 * under camera-system codes, so an exact-name match resolves ~1 of
 * the quoted 890) stays samples-only rather than printing a partial
 * list as if it were complete.
 */
export function rosterIsComplete(
  rosterCount: number,
  quotedCount: number,
): boolean {
  if (rosterCount <= 0) return false;
  return rosterCount >= 25 || rosterCount === quotedCount;
}
