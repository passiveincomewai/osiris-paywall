import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { EXPLORE_SCOPES } from './explore-data';
import { AIRPORT_PAGES, airportGlobeUrl } from './airport-pages';

/**
 * Per-airport pages (keyword wave A, 2026-10-27) — the reconciliation
 * the airport pages publish by. Each page serves its count from
 * countForDef over the EXPLORE_SCOPES registry; this test pins (a)
 * each registry definition the pages rely on — chunk slug, geo centre
 * and radius — and (b) every number in lib/airport-pages (yield, top
 * source, FAA count, nearest distances, the six sample cameras)
 * recomputed independently from the raw generated chunks
 * (src/data/countries/*.json, catalogue generated 2026-10-20) with
 * its own haversine, replicating applyScope's geo rule.
 *
 * Deliberately no countForDef calls here, for the same reason as
 * seo-page-scopes.test.ts: loading the 41k-record US chunk through
 * the test runner's module pipeline exceeds the sandbox's memory;
 * raw-chunk recomputation is the independent half of the
 * reconciliation, and the registry pins are the other half.
 */

const DATA_DIR = join(process.cwd(), 'src', 'data');

interface Rec {
  id?: string;
  lat?: number;
  lng?: number;
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

function inRadius(a: (typeof AIRPORT_PAGES)[number]): Array<{ d: number; r: Rec }> {
  return chunk(a.countrySlug)
    .filter((r) => typeof r.lat === 'number' && typeof r.lng === 'number')
    .map((r) => ({ d: haversineKm(a.lat, a.lng, r.lat as number, r.lng as number), r }))
    .filter((x) => x.d <= a.radiusKm)
    .sort((x, y) => x.d - y.d);
}

describe('per-airport pages: set shape', () => {
  it('has 51 airports with unique slugs, IATA codes and scope keys', () => {
    expect(AIRPORT_PAGES.length).toBe(51);
    expect(new Set(AIRPORT_PAGES.map((a) => a.slug)).size).toBe(51);
    expect(new Set(AIRPORT_PAGES.map((a) => a.iata)).size).toBe(51);
    expect(new Set(AIRPORT_PAGES.map((a) => a.scopeKey)).size).toBe(51);
  });

  it('uses 15 km everywhere except Denver (25 km, stated on its page)', () => {
    for (const a of AIRPORT_PAGES) {
      expect(a.radiusKm, a.iata).toBe(a.iata === 'DEN' ? 25 : 15);
    }
  });

  it('every page clears the honesty floor of 50 cameras', () => {
    for (const a of AIRPORT_PAGES) {
      expect(a.count, a.iata).toBeGreaterThanOrEqual(50);
    }
  });

  it('the globe URL centres the airport with the flight layers lit', () => {
    const den = AIRPORT_PAGES.find((a) => a.iata === 'DEN')!;
    expect(airportGlobeUrl(den)).toBe(
      '/?geo=39.85610,-104.67370,25000&layers=flights,private,jets,military',
    );
  });
});

describe('per-airport pages: registry pins + raw-catalogue reconciliation', () => {
  for (const a of AIRPORT_PAGES) {
    it(`${a.iata}: def is the pinned radius over ${a.countrySlug}; data reconciles`, () => {
      const def = EXPLORE_SCOPES[a.scopeKey];
      expect(def, `scope ${a.scopeKey} must exist`).toBeTruthy();
      expect(def.slugs).toEqual([a.countrySlug]);
      expect(def.geo).toEqual({ lat: a.lat, lng: a.lng, radiusKm: a.radiusKm });

      const wall = inRadius(a);
      expect(wall.length, `${a.iata} yield`).toBe(a.count);

      const sources = new Map<string, number>();
      for (const { r } of wall) {
        if (r.source) sources.set(r.source, (sources.get(r.source) ?? 0) + 1);
      }
      const top = [...sources.entries()].sort((x, y) => y[1] - x[1])[0];
      expect(top[0], `${a.iata} top source`).toBe(a.topSource.raw);
      expect(top[1], `${a.iata} top source count`).toBe(a.topSource.count);

      const faa = wall.filter(({ r }) => r.source === 'FAA WeatherCams');
      expect(faa.length, `${a.iata} FAA count`).toBe(a.faaCount);
      if (faa.length > 0) {
        expect(Math.abs(faa[0].d - (a.faaNearestKm as number)), `${a.iata} FAA nearest`).toBeLessThan(0.15);
      } else {
        expect(a.faaNearestKm).toBeNull();
      }

      expect(Math.abs(wall[0].d - a.nearestKm), `${a.iata} nearest`).toBeLessThan(0.15);

      /* The samples are the six nearest records, pinned by id, name
         and distance — a catalogue reshuffle that changes which
         cameras lead a page fails here instead of drifting. */
      expect(a.samples.length).toBe(6);
      a.samples.forEach((s, i) => {
        expect(wall[i].r.id, `${a.iata} sample ${i} id`).toBe(s.id);
        expect(Math.abs(wall[i].d - s.km), `${a.iata} sample ${i} km`).toBeLessThan(0.15);
      });
    });
  }
});
