import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { EXPLORE_SCOPES } from './explore-data';
import { ALL_SPOTS } from './surf-spots';

/**
 * Surf & beach spot walls (keyword wave B) — the reconciliation the
 * /surf-webcams hub, the /surf-webcams/[spot] pages and the
 * /beach-webcams/[spot] pages publish by. The pages serve their
 * counts from countForDef over the EXPLORE_SCOPES registry; this test
 * pins (a) each registry definition the pages rely on — chunk slug,
 * geo centre and radius — against lib/surf-spots, the module the
 * routes are generated from, and (b) the yield of that exact rule
 * recomputed independently from the raw generated chunks
 * (src/data/countries/*.json, catalogue generated 2026-10-20) with
 * its own haversine, replicating applyScope's geo rule (the
 * served-path filter itself is unit-covered in explore-scopes.test).
 *
 * If the catalogue regenerates and a yield moves, this test fails
 * loudly — the pages' computed numbers follow the data automatically,
 * but the hard-coded figures in the hub's copy (184 / 82 / 68 …) must
 * then be re-checked by hand rather than drifting silently.
 */

const DATA_DIR = join(process.cwd(), 'src', 'data');

interface Rec {
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

function rawGeoCount(slug: string, lat: number, lng: number, radiusKm: number): number {
  return chunk(slug).filter(
    (r) =>
      typeof r.lat === 'number' &&
      typeof r.lng === 'number' &&
      haversineKm(lat, lng, r.lat, r.lng) <= radiusKm,
  ).length;
}

/** Verified 12 km yields over the raw chunks (data phase, 2026-10-27). */
const YIELDS: Record<string, number> = {
  haeundae: 184,
  waikiki: 82,
  bondi: 68,
  encinitas: 45,
  kamakura: 38,
  manly: 36,
  'new-smyrna-beach': 30,
  'huntington-beach': 26,
  'la-jolla': 26,
  'san-clemente': 24,
  ichinomiya: 17,
  'surfers-paradise': 16,
  'santa-cruz': 15,
  'laguna-beach': 79,
  'miami-beach': 73,
  'newport-beach': 42,
  'daytona-beach': 33,
  'virginia-beach': 28,
  galveston: 24,
  'myrtle-beach': 22,
  palma: 22,
  'santa-monica': 18,
  'key-west': 29,
};

describe('surf & beach walls: registry pins + raw-catalogue yields', () => {
  for (const spot of ALL_SPOTS) {
    it(`${spot.scopeKey}: def is the pinned 12 km radius over ${spot.countrySlug}; raw yield ${YIELDS[spot.slug]}`, () => {
      const def = EXPLORE_SCOPES[spot.scopeKey];
      expect(def, `scope ${spot.scopeKey} must exist`).toBeTruthy();
      expect(def.slugs).toEqual([spot.countrySlug]);
      expect(def.geo).toEqual({ lat: spot.lat, lng: spot.lng, radiusKm: spot.radiusKm });
      expect(rawGeoCount(spot.countrySlug, spot.lat, spot.lng, spot.radiusKm)).toBe(
        YIELDS[spot.slug],
      );
    });
  }

  it('the family is 13 surf spots + 10 beach spots, each with a pinned yield', () => {
    expect(ALL_SPOTS).toHaveLength(23);
    expect(ALL_SPOTS.filter((s) => s.family === 'surf')).toHaveLength(13);
    expect(ALL_SPOTS.filter((s) => s.family === 'beach')).toHaveLength(10);
    for (const s of ALL_SPOTS) expect(YIELDS[s.slug]).toBeGreaterThan(0);
  });
});

describe('surf gaps stay gaps (the hub names them as having no wall)', () => {
  /* The famous breaks the /surf-webcams hub names as gaps: if a
     future catalogue fills one in, the hub's gap copy must be
     revisited, so the zero is pinned too. */
  const GAPS: Array<[string, string, number, number]> = [
    // [label, chunk slug, lat, lng] — 12 km yield verified 0
    ['Nazaré', 'portugal', 39.6023, -9.0708],
    ['Biarritz', 'france', 43.4832, -1.5586],
    ['Byron Bay', 'australia', -28.6431, 153.6119],
    ['Malibu', 'united-states', 34.0259, -118.7798],
    ['Hossegor', 'france', 43.665, -1.4417],
    ['Newquay', 'united-kingdom', 50.4156, -5.0737],
    ["Jeffrey's Bay", 'south-africa', -34.0505, 24.9235],
  ];
  for (const [label, slug, lat, lng] of GAPS) {
    it(`${label}: raw 12 km yield is 0`, () => {
      expect(rawGeoCount(slug, lat, lng, 12)).toBe(0);
    });
  }
});
