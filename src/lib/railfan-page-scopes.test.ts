import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { EXPLORE_SCOPES } from './explore-data';
import { matchesRailName } from './explore-scopes';
import { RAIL_PLACES } from './railfan-places';

/**
 * Railfan place walls (keyword wave B) — the reconciliation the
 * /train-webcams hub and the /train-webcams/[place] pages publish
 * by. The pages serve their counts from countForDef over the
 * EXPLORE_SCOPES registry and count rail-named feeds with the 'rail'
 * theme; this test pins (a) each registry definition the pages rely
 * on — chunk slug, geo centre and radius — against
 * lib/railfan-places, the module the routes are generated from, and
 * (b) the yield of that exact rule recomputed independently from the
 * raw generated chunks (src/data/countries/*.json, catalogue
 * generated 2026-10-20) with its own haversine, replicating
 * applyScope's geo rule (the served-path filter itself is
 * unit-covered in explore-scopes.test). Rail-named yields use the
 * served matcher (lib/explore-scopes matchesRailName) — the pattern
 * is the definition being pinned, the counting is independent.
 *
 * If the catalogue regenerates and a yield moves, this test fails
 * loudly — the pages' computed numbers follow the data automatically,
 * but the hard-coded figures in the hub's copy (393 worldwide, the
 * gap totals) must then be re-checked by hand rather than drifting
 * silently.
 */

const DATA_DIR = join(process.cwd(), 'src', 'data');

interface Rec {
  name?: string;
  lat?: number;
  lng?: number;
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

function rawWall(slug: string, lat: number, lng: number, radiusKm: number): Rec[] {
  return chunk(slug).filter(
    (r) =>
      typeof r.lat === 'number' &&
      typeof r.lng === 'number' &&
      haversineKm(lat, lng, r.lat, r.lng) <= radiusKm,
  );
}

/** Verified yields over the raw chunks (data phase, 2026-10-27):
 *  total catalogue cameras within 15 km / of those, rail-named. */
const YIELDS: Record<string, { total: number; rail: number }> = {
  tokyo: { total: 104, rail: 5 },
  osaka: { total: 139, rail: 4 },
  nagoya: { total: 48, rail: 7 },
  hiroshima: { total: 85, rail: 1 },
  sapporo: { total: 104, rail: 1 },
  ichikawa: { total: 93, rail: 5 },
  tsu: { total: 74, rail: 3 },
  ise: { total: 69, rail: 4 },
  anjo: { total: 34, rail: 2 },
  busan: { total: 283, rail: 7 },
  incheon: { total: 205, rail: 10 },
  'yuen-long': { total: 599, rail: 37 },
  ershui: { total: 83, rail: 2 },
  lincoln: { total: 18, rail: 2 },
};

/** Places whose single rail-named feed is a dedicated rail anchor
 *  (a station cam) — the family's stated alternative to rail ≥ 2. */
const ANCHOR_ONLY = new Set(['hiroshima', 'sapporo']);

describe('railfan walls: registry pins + raw-catalogue yields', () => {
  for (const place of RAIL_PLACES) {
    it(`${place.scopeKey}: def is the pinned 15 km radius over ${place.countrySlug}; raw yield ${YIELDS[place.slug].total} total / ${YIELDS[place.slug].rail} rail-named`, () => {
      const def = EXPLORE_SCOPES[place.scopeKey];
      expect(def, `scope ${place.scopeKey} must exist`).toBeTruthy();
      expect(def.slugs).toEqual([place.countrySlug]);
      expect(def.geo).toEqual({ lat: place.lat, lng: place.lng, radiusKm: place.radiusKm });
      const wall = rawWall(place.countrySlug, place.lat, place.lng, place.radiusKm);
      expect(wall.length).toBe(YIELDS[place.slug].total);
      expect(wall.filter((r) => matchesRailName(r.name ?? '')).length).toBe(
        YIELDS[place.slug].rail,
      );
    });
  }

  it('the family is 14 places, each clearing the stated bar (total ≥ 15, and rail ≥ 2 or a dedicated anchor)', () => {
    expect(RAIL_PLACES).toHaveLength(14);
    for (const p of RAIL_PLACES) {
      const y = YIELDS[p.slug];
      expect(y, `yield pin for ${p.slug}`).toBeTruthy();
      expect(y.total).toBeGreaterThanOrEqual(15);
      expect(y.rail >= 2 || ANCHOR_ONLY.has(p.slug)).toBe(true);
    }
  });

  it("the worldwide scope is the 'rail' theme over the whole catalogue", () => {
    const def = EXPLORE_SCOPES['rail-named'];
    expect(def).toBeTruthy();
    expect(def.slugs).toBe('all');
    expect(def.theme).toBe('rail');
  });

  it('the worldwide rail-named yield over the raw catalogue is 393', () => {
    const index = JSON.parse(
      readFileSync(join(DATA_DIR, 'camera-countries.json'), 'utf8'),
    ) as { countries: Array<{ slug: string }> };
    let rail = 0;
    for (const c of index.countries) {
      rail += chunk(c.slug).filter((r) => matchesRailName(r.name ?? '')).length;
    }
    expect(rail).toBe(393);
  }, 120_000);
});

describe('rail-named matcher: the name must say railway', () => {
  const YES = [
    'Tehachapi Live Trains',
    'Osaka - Tokaido Shinkansen',
    'BNSF Downtown Lincoln',
    'IH-10 East @ Union Pacific Railroad',
    'Busan Station Railway Pier 4, Busan',
    'Sapporo JR Station Concourse',
    'Nagoya Station Area',
    'Yodo River at Hankyu Kyoto Line',
    'JR Kansai Main Line Aibi Bridge, Yokkaichi',
    'Castle Peak Rd-Ping Shan near Ping Shan Light Rail Stop - Eastbound',
    'North Lantau Highway near MTR Siu Ho Wan Depot - Eastbound (1)',
    'Spoorzicht met Mo (Railcam)',
    'North Yorkshire Moors Railway',
    'Zürich Hauptbahnhof',
    'George St (Railway Square)',
    'Minowa Station - Taitō',
    'Station Square, Astrakhan',
    'High-Speed Rail Bridge, Xiluo, Yunlin',
    'Daejeo Vehicle Depot',
  ];
  const NO = [
    /* utility stations — the Japanese river networks' gauging sites */
    'Yodo River Water Level Station',
    'Denzugawa pump station area, Adachi',
    'Mukaiya Relay Station, Shimamoto',
    'Haeundae Fire Station',
    'Beigang No. 3 Water Gate Pumping Station, Yunlin',
    'Shalu Air Quality Station',
    'LTSER IT25 - Matsch/Mazia - Forest station F6',
    'Esto-Sadok, Red Polyana Lift Base Station',
    /* depots that are not rail depots, and depot street names */
    'CLAY-173_043063: Mount Zion Rd at Home Depot (CLAYTON)',
    'Myeongchon Bus Depot, Ulsan',
    'Deagon - Depot Road On/Off Ramp',
    /* street names and the Hanshin EXPRESSWAY (not the railway) */
    'SH1 Tram Rd South (Southbound)',
    'Hanshin Inagawa Bridge',
    'Hanshin Mosogawa Bridge',
  ];
  for (const name of YES) {
    it(`rail-named: ${name}`, () => {
      expect(matchesRailName(name)).toBe(true);
    });
  }
  for (const name of NO) {
    it(`not rail-named: ${name}`, () => {
      expect(matchesRailName(name)).toBe(false);
    });
  }
  /* One documented limit, pinned so the behaviour is explicit:
     "Gaines St & Railroad Ave" names a street (Railroad Avenue),
     not the railway itself — but the matcher cannot tell a street
     from a line by name alone, and the family's copy claims only
     that a feed "names a railway". It therefore counts: */
  it('street names that name a railroad still count as naming one (documented limit)', () => {
    expect(matchesRailName('Gaines St & Railroad Ave')).toBe(true);
  });
});

describe('railfan gaps stay gaps (the hub names them as having no wall)', () => {
  /* The famous rail towns the /train-webcams hub names as gaps: if a
     future catalogue fills one in, the hub's gap copy must be
     revisited, so the totals are pinned too. */
  const GAPS: Array<[string, number, number, number]> = [
    // [label, lat, lng, 15 km total] — US chunk throughout
    ['Tehachapi', 35.1322, -118.4489, 4],
    ['Rochelle', 41.9239, -89.0686, 0],
    ['Folkston', 30.7311, -82.0051, 3],
    ['North Platte', 41.1276, -100.7612, 4],
    ['Barstow', 34.8958, -117.0173, 4],
    ['Gallup', 35.5281, -108.7426, 1],
  ];
  for (const [label, lat, lng, total] of GAPS) {
    it(`${label}: raw 15 km yield is ${total}`, () => {
      expect(rawWall('united-states', lat, lng, 15).length).toBe(total);
    });
  }
});
