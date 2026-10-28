import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { EXPLORE_SCOPES } from './explore-data';
import { VOLCANOES, volcanoBySlug } from './volcanoes';

/**
 * Volcano walls — the reconciliation the volcano pages publish by.
 * The pages serve their counts from recordsForDef over EXPLORE_SCOPES;
 * this test pins (a) each registry row against its scope definition
 * (chunk slug, geo centre, radius), and (b) the yield of that exact
 * rule recomputed independently from the raw generated chunks
 * (src/data/countries/*.json, catalogue generated 2026-10-20) with
 * its own haversine. Gap pins cover the famous absences the family
 * is honest about: Stromboli and Popocatépetl at zero, Hekla's lone
 * road junction, and Semeru owning no camera of its own.
 *
 * If the catalogue regenerates and a yield moves, this test fails
 * loudly — the pages' computed numbers follow the data automatically,
 * but their hard-coded copy (the hub's "17 cameras" class of claims)
 * must then be re-checked by hand rather than drifting silently.
 */

const DATA_DIR = join(process.cwd(), 'src', 'data');

interface Rec {
  lat?: number;
  lng?: number;
  name?: string;
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

function rawWall(slug: string, lat: number, lng: number, radiusKm: number): Rec[] {
  return chunk(slug).filter(
    (r) =>
      typeof r.lat === 'number' &&
      typeof r.lng === 'number' &&
      haversineKm(lat, lng, r.lat, r.lng) <= radiusKm,
  );
}

/** Pinned yields, audited 2026-10-27 against the 2026-10-20 catalogue. */
const PINS: Record<string, number> = {
  kilauea: 17,
  reykjanes: 24,
  katla: 12,
  etna: 1,
  vesuvius: 80,
  sakurajima: 10,
  merapi: 25,
  bromo: 1,
  fuji: 80,
  ruapehu: 4,
};

describe('volcano registry ↔ EXPLORE_SCOPES', () => {
  it('covers exactly the event-vo-* scopes, both ways', () => {
    const scopeKeys = Object.keys(EXPLORE_SCOPES).filter((k) => k.startsWith('event-vo-'));
    expect(scopeKeys.sort()).toEqual(VOLCANOES.map((v) => v.scopeKey).sort());
    expect(VOLCANOES).toHaveLength(10);
  });

  it('every scope definition matches its registry row (chunk, centre, radius)', () => {
    for (const v of VOLCANOES) {
      const def = EXPLORE_SCOPES[v.scopeKey];
      expect(def, v.slug).toBeDefined();
      expect(def.slugs, v.slug).toEqual([v.countrySlug]);
      expect(def.geo, v.slug).toEqual({ lat: v.lat, lng: v.lng, radiusKm: v.radiusKm });
    }
  });

  it('every volcano clears the threshold and carries real copy', () => {
    for (const v of VOLCANOES) {
      expect(PINS[v.slug], v.slug).toBeDefined();
      expect(PINS[v.slug], v.slug).toBeGreaterThanOrEqual(1);
      expect(v.intro[0].length, v.slug).toBeGreaterThan(100);
      expect(v.intro[1].length, v.slug).toBeGreaterThan(100);
      expect(v.highlights.length, v.slug).toBeGreaterThanOrEqual(1);
      expect(v.faqs.length, v.slug).toBeGreaterThanOrEqual(2);
      expect(v.observatory.name.length, v.slug).toBeGreaterThan(3);
      expect(
        () => new Intl.DateTimeFormat('en-US', { timeZone: v.tz }),
        v.slug,
      ).not.toThrow();
      expect(volcanoBySlug(v.slug), v.slug).toBe(v);
    }
    expect(volcanoBySlug('stromboli')).toBeNull();
    expect(volcanoBySlug('popocatepetl')).toBeNull();
  });
});

describe('volcano wall yields (raw-chunk recomputation)', () => {
  it('matches the pinned totals for every volcano', () => {
    for (const v of VOLCANOES) {
      const wall = rawWall(v.countrySlug, v.lat, v.lng, v.radiusKm);
      expect(wall.length, v.slug).toBe(PINS[v.slug]);
    }
  });

  it("Etna's single camera is the dedicated volcano feed", () => {
    const wall = rawWall('italy', 37.751, 14.9934, 30);
    expect(wall).toHaveLength(1);
    expect(wall[0].name).toBe('Mount Etna - Volcano');
  });

  it("Bromo's single camera is its dedicated feed", () => {
    const wall = rawWall('indonesia', -7.9425, 112.953, 30);
    expect(wall).toHaveLength(1);
    expect(wall[0].name).toBe('Volcano Bromo - Indonesia');
  });

  it('the dedicated and named cameras the copy quotes are really in their walls', () => {
    const merapi = rawWall('indonesia', -7.5407, 110.4457, 30);
    expect(merapi.some((r) => r.name === 'Volcano Merapi')).toBe(true);
    expect(merapi.some((r) => (r.name ?? '').startsWith('Pantauan Merapi'))).toBe(true);
    const sakurajima = rawWall('japan', 31.5936, 130.6572, 20);
    expect(
      sakurajima.filter((r) => (r.name ?? '').toLowerCase().includes('sakurajima')).length,
    ).toBeGreaterThanOrEqual(3);
    const fuji = rawWall('japan', 35.3606, 138.7274, 30);
    expect(fuji.some((r) => r.name === 'Mt. Fuji Live')).toBe(true);
    const kilauea = rawWall('united-states', 19.4069, -155.2834, 50);
    expect(kilauea.filter((r) => (r.name ?? '').startsWith('Holei Pali')).length).toBe(4);
  });
});

describe('the named gaps stay gaps', () => {
  it('Stromboli has no catalogue camera (the hub page says so, and it stays true)', () => {
    expect(rawWall('italy', 38.789, 15.213, 30)).toHaveLength(0);
  });

  it('Popocatépetl and Colima have no catalogue cameras', () => {
    expect(rawWall('mexico', 19.0234, -98.6229, 50)).toHaveLength(0);
    expect(rawWall('mexico', 19.514, -103.617, 30)).toHaveLength(0);
  });

  it("Semeru owns no camera — the one in range is Bromo's", () => {
    const wall = rawWall('indonesia', -8.108, 112.922, 30);
    expect(wall).toHaveLength(1);
    expect(wall[0].name).toContain('Bromo');
  });

  it("Hekla's only in-range records are one road junction, not a wall", () => {
    const wall = rawWall('iceland', 63.992, -19.665, 40);
    expect(wall).toHaveLength(3);
    expect(wall.every((r) => (r.name ?? '').includes('Bræðratunguvegur'))).toBe(true);
  });

  it('the zero-camera candidates stay zero', () => {
    expect(rawWall('philippines', 14.002, 120.993, 25), 'Taal').toHaveLength(0);
    expect(rawWall('philippines', 13.257, 123.685, 25), 'Mayon').toHaveLength(0);
    expect(rawWall('chile', -39.42, -71.94, 40), 'Villarrica').toHaveLength(0);
    expect(rawWall('costa-rica', 10.463, -84.703, 30), 'Arenal').toHaveLength(0);
    expect(rawWall('ecuador', -0.677, -78.438, 40), 'Cotopaxi').toHaveLength(0);
    expect(rawWall('new-zealand', -37.52, 177.18, 50), 'Whakaari').toHaveLength(0);
  });
});
