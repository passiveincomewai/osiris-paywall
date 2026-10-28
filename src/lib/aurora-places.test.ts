import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { EXPLORE_SCOPES } from './explore-data';
import { AURORA_PLACES, auroraPlaceBySlug, placeTonight } from './aurora-places';

/**
 * Aurora place walls — the reconciliation the per-place pages publish
 * by. The pages serve their counts from recordsForDef over
 * EXPLORE_SCOPES; this test pins (a) each registry row against its
 * scope definition (chunk slug, geo centre, radius), and (b) the
 * yield of that exact rule recomputed independently from the raw
 * generated chunks (src/data/countries/*.json, catalogue generated
 * 2026-10-20) with its own haversine. Gap pins cover the absences
 * the family is honest about: Yellowknife at zero, and Whitehorse,
 * Kiruna and Saariselkä below the page threshold.
 *
 * If the catalogue regenerates and a yield moves, this test fails
 * loudly — the pages' computed numbers follow the data automatically,
 * but any hard-coded copy figures must be re-checked by hand.
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
  fairbanks: 30,
  anchorage: 74,
  duluth: 14,
  marquette: 6,
  churchill: 4,
  reykjavik: 69,
  akureyri: 18,
  tromso: 12,
  alta: 9,
  lofoten: 6,
  rovaniemi: 8,
  levi: 5,
  abisko: 5,
};

describe('aurora place registry ↔ EXPLORE_SCOPES', () => {
  it('every scope definition matches its registry row (chunk, centre, radius)', () => {
    expect(AURORA_PLACES).toHaveLength(13);
    for (const p of AURORA_PLACES) {
      const def = EXPLORE_SCOPES[p.scopeKey];
      expect(def, p.slug).toBeDefined();
      expect(def.slugs, p.slug).toEqual([p.countrySlug]);
      expect(def.geo, p.slug).toEqual({ lat: p.lat, lng: p.lng, radiusKm: p.radiusKm });
      expect(auroraPlaceBySlug(p.slug), p.slug).toBe(p);
    }
    expect(auroraPlaceBySlug('yellowknife')).toBeNull();
    expect(auroraPlaceBySlug('kiruna')).toBeNull();
  });

  it('every place clears the threshold (or is the stated Churchill exception) and carries real copy', () => {
    for (const p of AURORA_PLACES) {
      expect(PINS[p.slug], p.slug).toBeDefined();
      if (p.slug === 'churchill') {
        // The stated exception: four directional feeds of one FAA site.
        expect(PINS[p.slug], p.slug).toBe(4);
      } else {
        expect(PINS[p.slug], p.slug).toBeGreaterThanOrEqual(5);
      }
      expect(p.intro[0].length, p.slug).toBeGreaterThan(100);
      expect(p.intro[1].length, p.slug).toBeGreaterThan(100);
      expect(p.highlights.length, p.slug).toBeGreaterThanOrEqual(1);
      expect(p.faqs.length, p.slug).toBeGreaterThanOrEqual(2);
      expect(p.kpNote.length, p.slug).toBeGreaterThan(50);
      expect(
        () => new Intl.DateTimeFormat('en-US', { timeZone: p.tz }),
        p.slug,
      ).not.toThrow();
    }
  });
});

describe('aurora place wall yields (raw-chunk recomputation)', () => {
  it('matches the pinned totals for every place', () => {
    for (const p of AURORA_PLACES) {
      const wall = rawWall(p.countrySlug, p.lat, p.lng, p.radiusKm);
      expect(wall.length, p.slug).toBe(PINS[p.slug]);
    }
  });

  it('the named anchor cameras are really in their walls', () => {
    const tromso = rawWall('norway', 69.6492, 18.956, 40);
    expect(tromso.some((r) => r.name === 'Panorama of Tromsø - Norway')).toBe(true);
    const churchill = rawWall('canada', 58.7684, -94.165, 50);
    expect(churchill).toHaveLength(4);
    expect(churchill.every((r) => (r.name ?? '').startsWith('Churchill'))).toBe(true);
    const levi = rawWall('finland', 67.8, 24.8, 40);
    expect(levi.some((r) => r.name === 'Levi Ski Resort')).toBe(true);
    const abisko = rawWall('sweden', 68.35, 18.82, 30);
    expect(abisko.some((r) => (r.name ?? '').includes('Björkliden'))).toBe(true);
    const anchorage = rawWall('united-states', 61.2181, -149.9003, 50);
    expect(anchorage.some((r) => (r.name ?? '').includes('Northern Lights'))).toBe(true);
  });
});

describe('the named gaps stay gaps', () => {
  it('Yellowknife has no catalogue camera (the aurora hub FAQ says so, and it stays true)', () => {
    expect(rawWall('canada', 62.454, -114.3718, 40)).toHaveLength(0);
  });

  it('Whitehorse, Kiruna and Saariselkä stay below the page threshold', () => {
    expect(rawWall('canada', 60.7212, -135.0538, 60)).toHaveLength(2);
    expect(rawWall('sweden', 67.8558, 20.2253, 40)).toHaveLength(2);
    expect(rawWall('finland', 68.4197, 27.4104, 40)).toHaveLength(2);
  });
});

describe('placeTonight — the darkness window is astronomy, honestly nulled', () => {
  it('Fairbanks in late October has a sunset, a next sunrise, and darkness between', () => {
    const t = placeTonight(64.8378, -147.7164, 'America/Anchorage', new Date('2026-10-27T20:00:00Z'));
    expect(t.sunset).not.toBeNull();
    expect(t.sunrise).not.toBeNull();
    expect(t.sunsetText).toMatch(/\d{1,2}:\d{2}\s[AP]M/);
    expect(t.sunriseText).toMatch(/\d{1,2}:\d{2}\s[AP]M/);
    expect(t.sunrise!.getTime()).toBeGreaterThan(t.sunset!.getTime());
    expect(t.darkLengthText).toMatch(/^\d+ h \d{2} min$/);
  });

  it('Tromsø under the midnight sun has no sunset to print', () => {
    const t = placeTonight(69.6492, 18.956, 'Europe/Oslo', new Date('2026-06-15T12:00:00Z'));
    expect(t.sunset).toBeNull();
    expect(t.sunsetText).toBeNull();
    expect(t.polar).toBe('day');
  });

  it('Tromsø in mid-December is polar night — dark around the clock', () => {
    const t = placeTonight(69.6492, 18.956, 'Europe/Oslo', new Date('2026-12-15T12:00:00Z'));
    expect(t.sunset).toBeNull();
    expect(t.sunrise).toBeNull();
    expect(t.polar).toBe('night');
  });
});
