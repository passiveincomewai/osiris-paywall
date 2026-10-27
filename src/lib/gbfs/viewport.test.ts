import { describe, it, expect } from 'vitest';
import {
  padGbfsBounds,
  visibleGbfsItems,
  gbfsLoadCandidates,
  gbfsCacheEntryAfterFetch,
  GBFS_FRESH_MS,
  type GbfsCacheEntry,
  type GbfsViewBounds,
} from './viewport';

interface TestSystem { id: string; name: string; lat: number; lng: number }
interface TestItem { id: string; kind: string; lat: number; lng: number }

const sys = (id: string, lat: number, lng: number): TestSystem => ({ id, name: id, lat, lng });
const item = (id: string, lat: number, lng: number, kind = 'station'): TestItem => ({ id, kind, lat, lng });
type Cache = Map<string, GbfsCacheEntry<TestItem>>;
const cacheOf = (entries: Array<[string, GbfsCacheEntry<TestItem>]>): Cache => new Map(entries);

/** A viewport of the given span centered on a point (mirrors the transit relevance tests). */
function viewAt(lat: number, lng: number, spanLat: number, spanLng = spanLat * 1.5): GbfsViewBounds {
  return { south: lat - spanLat / 2, north: lat + spanLat / 2, west: lng - spanLng / 2, east: lng + spanLng / 2 };
}

// Real directory positions (public/data/gbfs-systems.json): Citi Bike's
// single centre point sits in Manhattan; its 2,519 stations span all five
// boroughs. A street-level viewport over Prospect Heights, Brooklyn
// contains neither the centre's latitude nor its longitude.
const CITI_BIKE = sys('lyft_nyc', 40.7414, -73.9467);
const BROOKLYN_STREET = viewAt(40.6779, -73.9700, 0.015); // ~z15
const PROSPECT_HEIGHTS_STATION = item('st-ph', 40.6779, -73.9700);
const WILLIAMSBURG_STATION = item('st-wb', 40.7081, -73.9571);
const MANHATTAN_STATION = item('st-mh', 40.7414, -73.9467);

describe('padGbfsBounds', () => {
  it('grows bounds by a fraction of their own span on every side', () => {
    const b = { west: 0, south: 0, east: 10, north: 20 };
    expect(padGbfsBounds(b, 0)).toEqual(b);
    expect(padGbfsBounds(b, 0.1)).toEqual({ west: -1, south: -2, east: 11, north: 22 });
    expect(padGbfsBounds(b, 1)).toEqual({ west: -10, south: -20, east: 20, north: 40 });
  });
});

describe('visibleGbfsItems — the zoom-disappearance regression', () => {
  it('renders an item whose own coordinates are in view even though its system centre is far outside', () => {
    const cache = cacheOf([['lyft_nyc', { at: 0, items: [PROSPECT_HEIGHTS_STATION] }]]);
    const out = visibleGbfsItems([CITI_BIKE], cache, BROOKLYN_STREET);
    expect(out).toEqual([{ system: CITI_BIKE, item: PROSPECT_HEIGHTS_STATION }]);
  });

  it('does not render items outside the view, wherever the centre is', () => {
    const cache = cacheOf([['lyft_nyc', {
      at: 0,
      items: [PROSPECT_HEIGHTS_STATION, WILLIAMSBURG_STATION, MANHATTAN_STATION],
    }]]);
    const out = visibleGbfsItems([CITI_BIKE], cache, BROOKLYN_STREET);
    expect(out.map((x) => x.item.id)).toEqual(['st-ph']);
  });

  it('applies per-item culling to every system, not just centre-outsiders', () => {
    const local = sys('local', 40.6779, -73.9700); // centre inside the view
    const farItem = item('st-far', 40.9000, -73.5000);
    const cache = cacheOf([
      ['lyft_nyc', { at: 0, items: [PROSPECT_HEIGHTS_STATION] }],
      ['local', { at: 0, items: [PROSPECT_HEIGHTS_STATION, farItem] }],
    ]);
    const out = visibleGbfsItems([CITI_BIKE, local], cache, BROOKLYN_STREET);
    expect(out.map((x) => `${x.system.id}:${x.item.id}`)).toEqual(['lyft_nyc:st-ph', 'local:st-ph']);
  });

  it('keeps items just past the edge (10% pad) so small pans do not flicker, and drops items beyond the pad', () => {
    const justPast = item('st-edge', BROOKLYN_STREET.north + 0.001, -73.9700); // pad reaches +0.0015
    const wellPast = item('st-past', BROOKLYN_STREET.north + 0.01, -73.9700);
    const cache = cacheOf([['lyft_nyc', { at: 0, items: [justPast, wellPast] }]]);
    const out = visibleGbfsItems([CITI_BIKE], cache, BROOKLYN_STREET);
    expect(out.map((x) => x.item.id)).toEqual(['st-edge']);
  });

  it('empty-cache behaviour is unchanged: uncached systems and unknown cache entries draw nothing', () => {
    expect(visibleGbfsItems([CITI_BIKE], new Map(), BROOKLYN_STREET)).toEqual([]);
    expect(visibleGbfsItems([], cacheOf([['ghost', { at: 0, items: [PROSPECT_HEIGHTS_STATION] }]]), BROOKLYN_STREET)).toEqual([]);
  });
});

describe('gbfsLoadCandidates — viewport loading', () => {
  const NOW = 1_000_000_000;

  it('includes a system whose centre is outside the raw bounds but inside the padded bounds', () => {
    // ~z13 over Williamsburg: Citi Bike's centre lat (40.7414) is just
    // north of the raw viewport (north edge 40.7381) but well inside the
    // 100%-padded viewport.
    const view = viewAt(40.7081, -73.9571, 0.06);
    expect(CITI_BIKE.lat).toBeGreaterThan(view.north);
    const out = gbfsLoadCandidates([CITI_BIKE], new Map(), view, { lat: 40.7081, lng: -73.9571 }, NOW);
    expect(out).toEqual([CITI_BIKE]);
  });

  it('includes a system beyond even the padded bounds when it has cached items inside the raw bounds', () => {
    // Deep-Brooklyn street view: the centre is outside the 100% pad on
    // latitude, so only the cached-item rule can keep the system alive.
    const padded = padGbfsBounds(BROOKLYN_STREET, 1);
    expect(CITI_BIKE.lat).toBeGreaterThan(padded.north);
    const stale = NOW - GBFS_FRESH_MS - 1;
    const cache = cacheOf([['lyft_nyc', { at: stale, items: [PROSPECT_HEIGHTS_STATION] }]]);
    const out = gbfsLoadCandidates([CITI_BIKE], cache, BROOKLYN_STREET, { lat: 40.6779, lng: -73.9700 }, NOW);
    expect(out).toEqual([CITI_BIKE]);
  });

  it('excludes a system beyond the padded bounds whose cached items are all outside the raw bounds', () => {
    const cache = cacheOf([['lyft_nyc', { at: 0, items: [MANHATTAN_STATION] }]]);
    const out = gbfsLoadCandidates([CITI_BIKE], cache, BROOKLYN_STREET, { lat: 40.6779, lng: -73.9700 }, NOW);
    expect(out).toEqual([]);
  });

  it('keeps the 90 s freshness discipline: fresh caches are not refetched, stale and missing ones are', () => {
    const view = viewAt(40.7081, -73.9571, 0.06);
    const centre = { lat: 40.7081, lng: -73.9571 };
    const fresh = cacheOf([['lyft_nyc', { at: NOW - 30_000, items: [] }]]);
    expect(gbfsLoadCandidates([CITI_BIKE], fresh, view, centre, NOW)).toEqual([]);
    const boundary = cacheOf([['lyft_nyc', { at: NOW - GBFS_FRESH_MS, items: [] }]]);
    expect(gbfsLoadCandidates([CITI_BIKE], boundary, view, centre, NOW)).toEqual([]);
    const stale = cacheOf([['lyft_nyc', { at: NOW - GBFS_FRESH_MS - 1, items: [] }]]);
    expect(gbfsLoadCandidates([CITI_BIKE], stale, view, centre, NOW)).toEqual([CITI_BIKE]);
    expect(gbfsLoadCandidates([CITI_BIKE], new Map(), view, centre, NOW)).toEqual([CITI_BIKE]);
  });

  it('orders candidates nearest-centre first and caps the load at 6', () => {
    const centre = { lat: 40.0, lng: -73.0 };
    const view = viewAt(40.0, -73.0, 2);
    const systems = [8, 7, 6, 5, 4, 3, 2, 1].map((i) => sys(`s${i}`, 40.0 + i * 0.01, -73.0));
    const out = gbfsLoadCandidates(systems, new Map(), view, centre, NOW);
    expect(out.map((s) => s.id)).toEqual(['s1', 's2', 's3', 's4', 's5', 's6']);
  });

  it('returns nothing when there are no systems', () => {
    expect(gbfsLoadCandidates([], new Map(), BROOKLYN_STREET, { lat: 40.6779, lng: -73.9700 }, NOW)).toEqual([]);
  });
});

/* ── Fetch-result cache policy + the z14 Brooklyn regression ──────────
 *
 * REAL SHAPES ONLY. LYFT_NYC below is the verbatim directory entry from
 * public/data/gbfs-systems.json; the stations are verbatim items from
 * the production /api/gbfs/stations response for that system (captured
 * 2026-10-27; the live response holds 2,521 items, 139 of them inside
 * the z14 viewport used here). The component stores exactly these
 * objects in gbfsCacheRef and renders them via visibleGbfsItems.
 */
const LYFT_NYC = {
  id: 'lyft_nyc', name: 'Citi Bike', city: 'New York, NY', country: 'US',
  lat: 40.7414, lng: -73.9467, n: 2519, type: 'station',
  url: 'https://gbfs.citibikenyc.com/gbfs/2.3/gbfs.json',
};
interface RealItem {
  kind: 'station' | 'vehicle'; id: string; name?: string;
  lat: number; lng: number; bikes?: number; ebikes?: number; docks?: number; vt?: string;
}
const REAL_BROOKLYN_STATIONS: RealItem[] = [
  { kind: 'station', id: '475c44e1-31e3-4c60-b071-af2ca3f7618c', name: 'Prospect Pl & Nostrand Ave', lat: 40.67428, lng: -73.9503, bikes: 0, ebikes: 0, docks: 0 },
  { kind: 'station', id: '66dcc37f-0aca-11e7-82f6-3863bb44ef7c', name: 'Greene Ave & Nostrand Ave', lat: 40.6883337, lng: -73.950916, bikes: 8, ebikes: 1, docks: 11 },
  { kind: 'station', id: '62b97c1e-9d06-4c5e-b9c3-d76099e37fe4', name: 'Prospect Pl & Vanderbilt Ave', lat: 40.67767534, lng: -73.96902144, bikes: 12, ebikes: 7, docks: 9 },
  { kind: 'station', id: '1859088223746072684', name: 'Verona Pl & Fulton St', lat: 40.6803560840434, lng: -73.9476791024208, bikes: 3, ebikes: 0, docks: 11 },
  { kind: 'station', id: 'eb07bdfc-3a6f-40eb-96d2-0b92ac371619', name: 'Eastern Pkwy & Brooklyn Ave', lat: 40.66939, lng: -73.94514, bikes: 1, ebikes: 0, docks: 15 },
  { kind: 'station', id: '66de19ab-0aca-11e7-82f6-3863bb44ef7c', name: '3 St & Prospect Park West', lat: 40.668132, lng: -73.97363831, bikes: 20, ebikes: 19, docks: 8 },
  { kind: 'station', id: 'c2bb1874-bcb7-47c5-aa7d-05423b9087e8', name: 'Sterling Pl & New York Ave', lat: 40.67234, lng: -73.94763, bikes: 0, ebikes: 0, docks: 19 },
  { kind: 'station', id: '8aad788d-c7eb-4fca-a426-c39f47741a6f', name: 'President St & Nostrand Ave', lat: 40.66811, lng: -73.9505, bikes: 0, ebikes: 0, docks: 27 },
];
const REAL_OUT_OF_VIEW_STATION: RealItem =
  { kind: 'station', id: '1986707977001495180', name: '21 St & 20 Ave', lat: 40.78393602019729, lng: -73.91273114065842, bikes: 0, ebikes: 0, docks: 0 };
const REAL_ITEMS: RealItem[] = [...REAL_BROOKLYN_STATIONS, REAL_OUT_OF_VIEW_STATION];

/** z14.2 over Prospect Heights (the live-verification viewport). */
const Z14_PROSPECT_HEIGHTS = viewAt(40.6779, -73.9650, 0.03);
const Z14_CENTRE = { lat: 40.6779, lng: -73.9650 };
type RealCache = Map<string, GbfsCacheEntry<RealItem>>;

describe('gbfsCacheEntryAfterFetch — a failed fetch must not poison the cache', () => {
  const prev: GbfsCacheEntry<RealItem> = { at: 1_000, items: REAL_ITEMS };

  it('stores a successful non-empty result with a fresh stamp', () => {
    const next: RealItem[] = [REAL_BROOKLYN_STATIONS[0]];
    expect(gbfsCacheEntryAfterFetch(prev, true, next, 2_000)).toEqual({ at: 2_000, items: next });
    expect(gbfsCacheEntryAfterFetch(undefined, true, next, 2_000)).toEqual({ at: 2_000, items: next });
  });

  it('leaves the cache untouched on an HTTP error (the API returns {items: []} with 429)', () => {
    expect(gbfsCacheEntryAfterFetch(prev, false, [], 2_000)).toBeNull();
    expect(gbfsCacheEntryAfterFetch(undefined, false, [], 2_000)).toBeNull();
  });

  it('leaves the cache untouched when the body has no item array', () => {
    expect(gbfsCacheEntryAfterFetch(prev, true, undefined, 2_000)).toBeNull();
    expect(gbfsCacheEntryAfterFetch(prev, true, null, 2_000)).toBeNull();
  });

  it('never replaces good cached items with an empty "success" (the API returns {items: [], count: 0} on upstream failure)', () => {
    expect(gbfsCacheEntryAfterFetch(prev, true, [], 2_000)).toBeNull();
  });

  it('still stamps a genuinely empty system so it is not refetched on every move', () => {
    expect(gbfsCacheEntryAfterFetch(undefined, true, [], 2_000)).toEqual({ at: 2_000, items: [] });
    expect(gbfsCacheEntryAfterFetch({ at: 1_000, items: [] }, true, [], 2_000)).toEqual({ at: 2_000, items: [] });
  });
});

describe('z14 Brooklyn — the live-verification failure, replayed with real shapes', () => {
  const T0 = 1_000_000_000;
  const BROOKLYN_IDS = REAL_BROOKLYN_STATIONS.map((s) => s.id);

  it('geometry: at z14 the centre is outside even the padded bounds — candidacy rests on cached items alone', () => {
    const padded = padGbfsBounds(Z14_PROSPECT_HEIGHTS, 1);
    expect(LYFT_NYC.lat).toBeGreaterThan(padded.north);
    const cache: RealCache = new Map([['lyft_nyc', { at: T0, items: REAL_ITEMS }]]);
    expect(visibleGbfsItems([LYFT_NYC], cache, Z14_PROSPECT_HEIGHTS).map((x) => x.item.id)).toEqual(BROOKLYN_IDS);
  });

  it('one transient empty response used to erase every Brooklyn dot for good; now the cache survives and the next move retries', () => {
    // The state after the successful city-zoom load (z11.9, dots visible).
    const cache: RealCache = new Map([['lyft_nyc', { at: T0, items: REAL_ITEMS }]]);

    // 120 s later the user reaches z14.2; the entry is stale, and Citi
    // Bike is a load candidate ONLY because its cached items are in view.
    const T1 = T0 + 120_000;
    expect(gbfsLoadCandidates([LYFT_NYC], cache, Z14_PROSPECT_HEIGHTS, Z14_CENTRE, T1)).toEqual([LYFT_NYC]);

    // The refetch hits a transient failure. The API reports upstream
    // failure as HTTP 200 {items: [], count: 0}. The PRE-FIX component
    // stored that body unconditionally:
    const preFixWrite = (items: RealItem[], now: number) => cache.set('lyft_nyc', { at: now, items });
    preFixWrite([], T1);
    // …every in-view dot is gone…
    expect(visibleGbfsItems([LYFT_NYC], cache, Z14_PROSPECT_HEIGHTS)).toEqual([]);
    // …the fresh stamp blocks an immediate retry…
    expect(gbfsLoadCandidates([LYFT_NYC], cache, Z14_PROSPECT_HEIGHTS, Z14_CENTRE, T1 + 10_000)).toEqual([]);
    // …and once the stamp expires the system is not even a candidate any
    // more (no cached items in view; centre outside the padded bounds),
    // so the outage at this viewport is permanent — exactly what the
    // live verification saw, toggle included (the cache lives in a ref).
    expect(gbfsLoadCandidates([LYFT_NYC], cache, Z14_PROSPECT_HEIGHTS, Z14_CENTRE, T1 + 300_000)).toEqual([]);

    // The FIXED policy: the same response leaves the cache untouched.
    cache.set('lyft_nyc', { at: T0, items: REAL_ITEMS });
    const merged = gbfsCacheEntryAfterFetch(cache.get('lyft_nyc'), true, [], T1);
    expect(merged).toBeNull();
    if (merged) cache.set('lyft_nyc', merged);
    // Dots survive the failed refetch…
    expect(visibleGbfsItems([LYFT_NYC], cache, Z14_PROSPECT_HEIGHTS).map((x) => x.item.id)).toEqual(BROOKLYN_IDS);
    // …and because the old (stale) timestamp is kept, the very next
    // moveend retries the fetch instead of waiting out a poisoned stamp.
    expect(gbfsLoadCandidates([LYFT_NYC], cache, Z14_PROSPECT_HEIGHTS, Z14_CENTRE, T1 + 1_000)).toEqual([LYFT_NYC]);

    // The 429 shape (ok=false, {items: []}) is rejected the same way.
    expect(gbfsCacheEntryAfterFetch(cache.get('lyft_nyc'), false, [], T1)).toBeNull();
  });
});
