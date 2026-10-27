import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { COUNTRY_INDEX, EXPLORE_SCOPES, resolveExploreDef } from './explore-data';

/**
 * SEO page set #37 — the reconciliation the aurora, NYC, Japan and
 * port pages publish by. The pages serve their counts from
 * countForDef over the EXPLORE_SCOPES registry; this test pins (a)
 * each registry definition the pages rely on — chunk slugs, geo
 * centre and radius, exact city — and (b) the yield of that exact
 * rule recomputed independently from the raw generated chunks
 * (src/data/countries/*.json, catalogue generated 2026-10-20) with
 * its own haversine, replicating applyScope's geo/city rules (the
 * served-path filter itself is unit-covered in explore-scopes.test).
 *
 * Deliberately no countForDef calls here: loading the 41k-record US
 * chunk through the test runner's module pipeline exceeds the
 * sandbox's memory; raw-chunk recomputation is the independent half
 * of the reconciliation, and the registry pins are the other half.
 *
 * If the catalogue regenerates and a yield moves, this test fails
 * loudly — the pages' computed numbers follow the data
 * automatically, but their hard-coded metadata and FAQ figures
 * (825 / 482 / 746 / 279 / 380 …) must then be re-checked by hand
 * rather than drifting silently.
 */

const DATA_DIR = join(process.cwd(), 'src', 'data');

interface Rec {
  lat?: number;
  lng?: number;
  city?: string;
  source?: string;
}

const chunkCache = new Map<string, Rec[]>();
function chunk(slug: string): Rec[] {
  let hit = chunkCache.get(slug);
  if (!hit) {
    hit = JSON.parse(readFileSync(join(DATA_DIR, 'countries', `${slug}.json`), 'utf8')) as Rec[];
    chunkCache.set(slug, hit);
  }
  return hit;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const t = (x: number) => (x * Math.PI) / 180;
  const h =
    Math.sin(t(lat2 - lat1) / 2) ** 2 +
    Math.cos(t(lat1)) * Math.cos(t(lat2)) * Math.sin(t(lng2 - lng1) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function rawGeoCount(slug: string, lat: number, lng: number, radiusKm: number): number {
  return chunk(slug).filter(
    (r) =>
      typeof r.lat === 'number' &&
      typeof r.lng === 'number' &&
      haversineKm(lat, lng, r.lat, r.lng) <= radiusKm,
  ).length;
}

/** [scopeKey, chunk slug, centre lat, centre lng, radiusKm, verified yield] */
const GEO_WALLS: Array<[string, string, number, number, number, number]> = [
  ['event-le-fairbanks', 'united-states', 64.8378, -147.7164, 60, 30],
  ['nyc', 'united-states', 40.758, -73.9855, 25, 279],
  ['nyc-manhattan', 'united-states', 40.7831, -73.9712, 6, 25],
  ['nyc-brooklyn', 'united-states', 40.6782, -73.9442, 8, 53],
  ['nyc-queens', 'united-states', 40.7282, -73.7949, 10, 102],
  ['nyc-bronx', 'united-states', 40.8448, -73.8648, 7, 73],
  ['nyc-staten-island', 'united-states', 40.5795, -74.1502, 8, 31],
  ['japan-tokyo', 'japan', 35.6812, 139.7671, 20, 168],
  ['japan-fuji', 'japan', 35.3606, 138.7274, 25, 32],
  ['port-hong-kong', 'hong-kong', 22.293, 114.1693, 6, 380],
  ['port-tampa', 'united-states', 27.94, -82.45, 10, 263],
  ['port-busan', 'south-korea', 35.1, 129.04, 10, 162],
  ['port-seattle', 'united-states', 47.583, -122.335, 6, 127],
  ['port-vancouver', 'canada', 49.29, -123.09, 6, 98],
  ['port-fort-lauderdale', 'united-states', 26.09, -80.11, 8, 90],
  ['port-norfolk', 'united-states', 36.9, -76.33, 10, 87],
  ['port-miami', 'united-states', 25.77, -80.18, 10, 82],
  ['port-honolulu', 'united-states', 21.31, -157.87, 8, 77],
  ['port-sydney', 'australia', -33.86, 151.26, 10, 58],
  ['port-new-york', 'united-states', 40.68, -74.02, 10, 53],
  ['port-long-beach', 'united-states', 33.73, -118.26, 12, 35],
  ['port-rotterdam', 'netherlands', 51.95, 4.14, 15, 8],
];

describe('SEO #37 geo walls: registry pins + raw-catalogue yields', () => {
  for (const [key, slug, lat, lng, radiusKm, expected] of GEO_WALLS) {
    it(`${key}: def is the pinned radius over ${slug}; raw yield ${expected}`, () => {
      const def = EXPLORE_SCOPES[key];
      expect(def, `scope ${key} must exist`).toBeTruthy();
      expect(def.slugs).toEqual([slug]);
      expect(def.geo).toEqual({ lat, lng, radiusKm });
      expect(rawGeoCount(slug, lat, lng, radiusKm)).toBe(expected);
    });
  }
});

describe('SEO #37 country and city walls reconcile', () => {
  const COUNTRY_WALLS: Array<[string, string, number]> = [
    ['aurora-finland', 'finland', 825],
    ['aurora-iceland', 'iceland', 482],
    ['aurora-norway', 'norway', 746],
    ['japan', 'japan', 10472],
  ];
  for (const [key, slug, expected] of COUNTRY_WALLS) {
    it(`${key}: def is the ${slug} chunk; chunk length and index count are ${expected}`, () => {
      const def = EXPLORE_SCOPES[key];
      expect(def, `scope ${key} must exist`).toBeTruthy();
      expect(def.slugs).toEqual([slug]);
      expect(chunk(slug).length).toBe(expected);
      expect(COUNTRY_INDEX.find((c) => c.slug === slug)?.count).toBe(expected);
    });
  }

  const CITY_WALLS: Array<[string, number]> = [
    ['Osaka', 194],
    ['Sapporo', 184],
  ];
  for (const [city, expected] of CITY_WALLS) {
    it(`japan/${city}: resolved def pins the city; raw city yield is ${expected}`, () => {
      const def = resolveExploreDef({ country: 'japan', city });
      expect(def).toBeTruthy();
      expect(def!.slugs).toEqual(['japan']);
      expect(def!.city).toBe(city);
      expect(chunk('japan').filter((r) => r.city === city).length).toBe(expected);
    });
  }

  it('japan is the second-largest country in the index', () => {
    const sorted = [...COUNTRY_INDEX].sort((a, b) => b.count - a.count);
    expect(sorted[0].slug).toBe('united-states');
    expect(sorted[1].slug).toBe('japan');
    expect(sorted[1].count).toBe(10472);
  });

  it('the NYC whole-city wall is 274/279 NYSDOT 511NY feeds', () => {
    const inWall = chunk('united-states').filter(
      (r) =>
        typeof r.lat === 'number' &&
        typeof r.lng === 'number' &&
        haversineKm(40.758, -73.9855, r.lat, r.lng) <= 25,
    );
    expect(inWall.length).toBe(279);
    expect(inWall.filter((r) => r.source === 'OpenCCTV / ny511').length).toBe(274);
  });
});

describe('SEO #37 honest gaps stay gaps', () => {
  /* The claims the aurora and port pages make about places with NO
     wall: if a future catalogue fills one of these in, the pages'
     "no wall" copy must be revisited, so the gap is pinned too. */
  const GAPS: Array<[string, string, number, number, number, number]> = [
    // [label, chunk slug, lat, lng, radiusKm, verified yield]
    ['Yellowknife (aurora page)', 'canada', 62.454, -114.3716, 60, 0],
    ['Hamburg (port page)', 'germany', 53.54, 9.98, 12, 0],
    ['Antwerp (port page)', 'belgium', 51.25, 4.4, 12, 0],
    ['Southampton (port page)', 'united-kingdom', 50.9, -1.4, 10, 0],
    ['Liverpool (port page)', 'united-kingdom', 53.45, -2.99, 10, 0],
    ['Cape Town (port page)', 'south-africa', -33.9, 18.42, 8, 0],
    ['Piraeus (port page)', 'greece', 37.94, 23.64, 10, 0],
    ['Singapore (port page)', 'singapore', 1.26, 103.84, 12, 2],
  ];
  for (const [label, slug, lat, lng, radiusKm, expected] of GAPS) {
    it(`${label}: raw yield is ${expected}`, () => {
      expect(rawGeoCount(slug, lat, lng, radiusKm)).toBe(expected);
    });
  }
});
