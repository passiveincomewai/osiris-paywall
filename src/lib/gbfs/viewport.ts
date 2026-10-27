/**
 * OSIRIS — GBFS viewport selection (pure; shared by the map client and
 * unit tests).
 *
 * THE BUG THIS FIXES: the client used to render a system's cached
 * stations/vehicles only while the system's single centre point fell
 * inside the viewport, and loadVisible() likewise only fetched systems
 * whose centre was in bounds. A system's service area extends well past
 * its centre, so zooming into one neighbourhood of a large system
 * pushed the centre out of the viewport and EVERY in-view dot of that
 * system vanished at once (Citi Bike: centre in Manhattan at
 * 40.7414,-73.9467 — zoom into Brooklyn at street level and all 2,500
 * stations disappeared, Brooklyn ones included).
 *
 * THE RULES NOW:
 * - Rendering is per-item: a cached station/vehicle is drawn when ITS
 *   OWN coordinates fall inside the viewport, padded by 10% of the
 *   span so edge dots don't flicker on small pans. The system centre
 *   plays no part in rendering.
 * - Loading stays centre-based (a fetch is per-system) but candidacy
 *   no longer requires the centre in the raw viewport: the viewport
 *   padded by 100% of its span on each side counts, because stations
 *   reach well past the centre — and a system that already has cached
 *   items inside the raw viewport is always a candidate, so a system
 *   discovered at city zoom keeps refreshing at street zoom. The
 *   existing discipline is unchanged otherwise: nearest-centre first,
 *   at most 6 fetches per load, 90 s freshness.
 */

export interface GbfsViewBounds {
  west: number;
  south: number;
  east: number;
  north: number;
}

/** Render culling pad: items this far outside the viewport still draw. */
export const GBFS_RENDER_PAD_FRAC = 0.1;
/** Load candidacy pad: centres this far outside the viewport still fetch. */
export const GBFS_LOAD_PAD_FRAC = 1;
/** A station fetch stays fresh this long (the layer's 90 s discipline). */
export const GBFS_FRESH_MS = 90_000;
/** Max systems fetched per viewport load. */
export const GBFS_MAX_LOADS = 6;

export interface GbfsSystemPoint {
  id: string;
  lat: number;
  lng: number;
}

export interface GbfsCacheEntry<I> {
  at: number;
  items: readonly I[];
}

/** Grow bounds by `frac` of their own span on every side. */
export function padGbfsBounds(b: GbfsViewBounds, frac: number): GbfsViewBounds {
  const dx = (b.east - b.west) * frac;
  const dy = (b.north - b.south) * frac;
  return { west: b.west - dx, south: b.south - dy, east: b.east + dx, north: b.north + dy };
}

export function gbfsPointInBounds(lng: number, lat: number, b: GbfsViewBounds): boolean {
  return lng >= b.west && lng <= b.east && lat >= b.south && lat <= b.north;
}

/**
 * The cached items to draw for a viewport: every station/vehicle whose
 * own coordinates fall inside the viewport (padded by `padFrac`),
 * paired with its system so the caller can stamp system properties.
 * Iteration order matches the systems list, then cache order — the
 * same order the centre-gated renderer produced for in-view systems.
 */
export function visibleGbfsItems<S extends { id: string }, I extends { lat: number; lng: number }>(
  systems: readonly S[],
  cache: ReadonlyMap<string, GbfsCacheEntry<I>>,
  view: GbfsViewBounds,
  padFrac: number = GBFS_RENDER_PAD_FRAC,
): Array<{ system: S; item: I }> {
  const padded = padGbfsBounds(view, padFrac);
  const out: Array<{ system: S; item: I }> = [];
  for (const system of systems) {
    const cached = cache.get(system.id);
    if (!cached) continue;
    for (const item of cached.items) {
      if (gbfsPointInBounds(item.lng, item.lat, padded)) out.push({ system, item });
    }
  }
  return out;
}

/**
 * Systems to fetch for a viewport, nearest-centre first: a system is a
 * candidate when its centre falls inside the generously padded
 * viewport OR it already has cached items inside the raw viewport;
 * candidates whose cache is still fresh are skipped, and the result is
 * capped. `now` is injected so freshness is testable.
 */
/**
 * The cache entry to store after a station fetch — or null to leave
 * the cache EXACTLY as it was. This guards the failure that erased
 * every dot of a large system at street zoom: /api/gbfs/stations
 * reports failure AS an empty item list (HTTP 429 {items: []} when the
 * client IP is rate-limited; HTTP 200 {items: [], count: 0} whenever
 * the upstream GBFS fetch throws). Storing that body unconditionally
 * replaced a healthy entry (Citi Bike: ~2,500 items) with [], and the
 * fresh timestamp then suppressed any retry for GBFS_FRESH_MS — after
 * which a deep-zoom viewport could lose the system as a load
 * candidate altogether (candidacy there rests on cached items in
 * view), making the outage permanent until the user zoomed back out.
 * So: a transport/HTTP failure, a malformed body, and an empty
 * "success" over a non-empty cache are all treated as NO result —
 * prior items and their (stale) timestamp survive, and the next
 * moveend retries the fetch. An empty result for a system with no
 * cached items is stored (with stamp) so a genuinely empty system is
 * not refetched on every move.
 */
export function gbfsCacheEntryAfterFetch<I>(
  prev: GbfsCacheEntry<I> | undefined,
  ok: boolean,
  items: readonly I[] | null | undefined,
  now: number,
): { at: number; items: I[] } | null {
  if (!ok || !Array.isArray(items)) return null;
  if (items.length === 0 && prev && prev.items.length > 0) return null;
  return { at: now, items: items.slice() };
}

export function gbfsLoadCandidates<S extends GbfsSystemPoint, I extends { lat: number; lng: number }>(
  systems: readonly S[],
  cache: ReadonlyMap<string, GbfsCacheEntry<I>>,
  view: GbfsViewBounds,
  center: { lat: number; lng: number },
  now: number,
  opts: { padFrac?: number; freshMs?: number; maxSystems?: number } = {},
): S[] {
  const padFrac = opts.padFrac ?? GBFS_LOAD_PAD_FRAC;
  const freshMs = opts.freshMs ?? GBFS_FRESH_MS;
  const maxSystems = opts.maxSystems ?? GBFS_MAX_LOADS;
  const padded = padGbfsBounds(view, padFrac);
  const hasItemInView = (id: string): boolean => {
    const cached = cache.get(id);
    return !!cached && cached.items.some((it) => gbfsPointInBounds(it.lng, it.lat, view));
  };
  return systems
    .filter((s) => gbfsPointInBounds(s.lng, s.lat, padded) || hasItemInView(s.id))
    .map((s) => ({ s, d: (s.lat - center.lat) ** 2 + (s.lng - center.lng) ** 2 }))
    .sort((a, b) => a.d - b.d)
    .map((x) => x.s)
    .filter((s) => { const ch = cache.get(s.id); return !ch || now - ch.at > freshMs; })
    .slice(0, maxSystems);
}
