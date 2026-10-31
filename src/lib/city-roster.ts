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
  /** The deep link's target id — the record's catalogue id, or its
   *  globe-served translation for the superseded oktraffic family
   *  (see globeId). */
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

/**
 * The id the globe actually serves for a chunk record, when the two
 * differ. The committed chunks predate the Oklahoma supersede
 * (2026-10-22, src/app/api/cctv/oklahoma.ts): ODOT's direct feed
 * replaced the OpenCCTV harvest's `oktraffic` family outright — the
 * runtime harvest file carries zero occ-ok- records, the region
 * serves only `okdot-<MapCamera id>` ids, and both layers share the
 * same numeric MapCamera id (verified live 2026-10-30 for the
 * McAlester test case and a sample of Oklahoma City records: both
 * /api/cctv?id= forms return the same camera). The prefixes do NOT
 * resolve alike, though: the chunk copy's stream playlist is the
 * Oct 20 snapshot's key and now 404s (ODOT rotates stream keys —
 * oklahoma.ts warns they are not stable), while the okdot- copy's
 * playlist is fetched fresh and plays. So a roster entry for an
 * oktraffic record links by its okdot- id; every other record links
 * by its own id, untouched.
 */
export function globeId(record: CountryCamera): string {
  if (clean(record.source) === "OpenCCTV / oktraffic") {
    const m = /^occ-ok-(\d+)$/.exec(record.id);
    if (m) return `okdot-${m[1]}`;
  }
  return record.id;
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
      /* The link id — globeId() translates the one superseded family
         (oktraffic) to the id the globe serves; everything else is
         the record's own catalogue id. */
      id: globeId(r),
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

/* ------------------------------------------------------------------ */
/* State rosters (Phase 2, 2026-10-30)                                 */
/* ------------------------------------------------------------------ */

export interface StateRosterGroup {
  /** Group heading: the records' own cleaned `city` value, verbatim —
   *  the area name the feeds carry. Some state DOT feeds file every
   *  camera under the state name itself (GDOT files "Georgia"), some
   *  under a county ("Jasper County"); the heading is that value, never
   *  an invented city. An empty value renders under the unnamed label. */
  label: string;
  entries: RosterEntry[];
}

/** The heading for a record set whose feeds carry no area value. */
export const UNNAMED_AREA_LABEL = "Feeds with no area named";

/**
 * A state's full roster, grouped by the records' cleaned `city` value.
 * The entry set is buildCityRoster over the whole state set, so the
 * duplicate-name qualifier rule (source → short-id → full id) and the
 * globeId translation apply exactly as on city pages. Groups are
 * ordered largest first (then label) so the state's real clusters lead;
 * entries inside a group keep buildCityRoster's name order. Every
 * usable record appears exactly once — the roster is never truncated.
 */
export function buildStateRoster(
  records: readonly CountryCamera[],
): StateRosterGroup[] {
  const entries = buildCityRoster(records);
  const byLabel = new Map<string, RosterEntry[]>();
  for (const e of entries) {
    const label = e.city.length > 0 ? e.city : UNNAMED_AREA_LABEL;
    const group = byLabel.get(label) ?? [];
    group.push(e);
    byLabel.set(label, group);
  }
  return [...byLabel.entries()]
    .map(([label, group]) => ({ label, entries: group }))
    .sort(
      (a, b) =>
        b.entries.length - a.entries.length || a.label.localeCompare(b.label),
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
