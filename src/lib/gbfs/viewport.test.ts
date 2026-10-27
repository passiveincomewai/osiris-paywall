import { describe, it, expect } from 'vitest';
import {
  padGbfsBounds,
  visibleGbfsItems,
  gbfsLoadCandidates,
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
