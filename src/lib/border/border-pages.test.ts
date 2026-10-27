import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { EXPLORE_SCOPES } from '../explore-data';
import { BORDER_CROSSINGS, borderScopeKey } from './crossings';

/**
 * Border crossings — the reconciliation the /border-crossings pages
 * publish by, in the seo-page-scopes.test.ts pattern: (a) every
 * registry row's camera scope is registered in EXPLORE_SCOPES with
 * the same centre, radius and chunk pair the page quotes; (b) the
 * yield of that exact rule, recomputed independently from the raw
 * generated chunks with this file's own haversine, equals the pinned
 * count — so a catalogue regeneration that moves a wall fails loudly
 * here instead of drifting the pages' numbers silently; (c) every
 * city/state link a page emits names a page that exists.
 *
 * Counts pinned 2026-10-26 against the 2026-10-20 catalogue.
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

function rawGeoCount(slugs: string[], lat: number, lng: number, radiusKm: number): number {
  let n = 0;
  for (const slug of slugs) {
    for (const r of chunk(slug)) {
      if (typeof r.lat !== 'number' || typeof r.lng !== 'number') continue;
      if (haversineKm(lat, lng, r.lat, r.lng) <= radiusKm) n += 1;
    }
  }
  return n;
}

/** Yield of each crossing's stated rule, from the raw chunks. */
const PINNED_COUNTS: Record<string, number> = {
  'san-ysidro': 36,
  'otay-mesa': 33,
  calexico: 6,
  nogales: 12,
  'el-paso': 104,
  'del-rio': 9,
  'eagle-pass': 9,
  laredo: 55,
  'hidalgo-pharr': 9,
  progreso: 10,
  brownsville: 4,
  blaine: 53,
  lynden: 21,
  sumas: 32,
  pembina: 5,
  'international-falls': 2,
  'sault-ste-marie': 5,
  'port-huron': 14,
  detroit: 107,
  buffalo: 70,
  'niagara-falls': 32,
  'alexandria-bay': 6,
  champlain: 4,
  'derby-line': 3,
  houlton: 1,
};

describe('border crossing registry', () => {
  it('has 25 crossings with unique slugs and port numbers', () => {
    expect(BORDER_CROSSINGS).toHaveLength(25);
    expect(new Set(BORDER_CROSSINGS.map((c) => c.slug)).size).toBe(25);
    const ports = BORDER_CROSSINGS.flatMap((c) => c.portNumbers);
    expect(new Set(ports).size).toBe(ports.length);
    for (const c of BORDER_CROSSINGS) {
      expect(c.portNumbers.length).toBeGreaterThan(0);
      expect(c.facts.length).toBeGreaterThan(0);
      expect(c.bridges.length).toBeGreaterThan(0);
    }
  });

  it('links only to city/state pages that exist', () => {
    const cityPages = JSON.parse(readFileSync(join(DATA_DIR, 'city-pages.json'), 'utf8')) as {
      cities: Array<{ slug: string }>;
    };
    const citySlugs = new Set(cityPages.cities.map((c) => c.slug));
    const usStates = JSON.parse(readFileSync(join(DATA_DIR, 'us-states.json'), 'utf8')) as {
      states: Array<{ slug: string }>;
    };
    const stateSlugs = new Set(usStates.states.map((s) => s.slug));
    for (const c of BORDER_CROSSINGS) {
      expect(stateSlugs.has(c.statePageSlug), `${c.slug} state link`).toBe(true);
      if (c.cityPageSlug) {
        expect(citySlugs.has(c.cityPageSlug), `${c.slug} city link`).toBe(true);
      }
    }
  });
});

describe('border camera scopes', () => {
  for (const crossing of BORDER_CROSSINGS) {
    it(`${crossing.slug}: scope matches the registry and yields the pinned count`, () => {
      const def = EXPLORE_SCOPES[borderScopeKey(crossing)];
      expect(def, `scope ${borderScopeKey(crossing)} registered`).toBeDefined();
      expect(def.geo).toEqual({
        lat: crossing.lat,
        lng: crossing.lng,
        radiusKm: crossing.radiusKm,
      });
      const foreign = crossing.border === 'Mexican Border' ? 'mexico' : 'canada';
      expect(def.slugs).toEqual(['united-states', foreign]);
      const count = rawGeoCount(def.slugs as string[], crossing.lat, crossing.lng, crossing.radiusKm);
      expect(count).toBe(PINNED_COUNTS[crossing.slug]);
      expect(count).toBeGreaterThan(0);
    });
  }
});
