import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { EXPLORE_SCOPES } from './explore-data';
import { NATIONAL_PARKS, parkSunTimes } from './national-parks';

/**
 * National park walls — the reconciliation the park pages publish by.
 * The pages serve their counts from recordsForDef over EXPLORE_SCOPES;
 * this test pins (a) each registry definition the pages rely on —
 * chunk slug, geo centre and radius — against src/lib/national-parks,
 * and (b) the yield of that exact rule recomputed independently from
 * the raw generated chunks (src/data/countries/*.json, catalogue
 * generated 2026-10-20) with its own haversine, including the count
 * of National Park Service records (source "OpenCCTV / nps") that the
 * parks' copy quotes. Gap pins cover the famous absences the hub
 * names: no Old Faithful camera, Glacier at two, the Smokies at
 * three, and the zero-camera parks.
 *
 * Deliberately no recordsForDef calls here: loading the 41k-record US
 * chunk through the test runner's module pipeline is memory-heavy in
 * the sandbox; raw-chunk recomputation is the independent half of the
 * reconciliation, and the registry pins are the other half (the
 * served-path filter itself is unit-covered in explore-scopes.test).
 *
 * If the catalogue regenerates and a yield moves, this test fails
 * loudly — the pages' computed numbers follow the data automatically,
 * but their hard-coded copy figures (188 / 39 / the per-park claims)
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

const NPS_SOURCE = 'OpenCCTV / nps';

/** Pinned yields, audited 2026-10-27 against the 2026-10-20 catalogue. */
const PINS: Record<string, { total: number; nps: number }> = {
  yellowstone: { total: 12, nps: 5 },
  'grand-canyon': { total: 4, nps: 4 },
  yosemite: { total: 6, nps: 6 },
  'rocky-mountain': { total: 7, nps: 5 },
  redwood: { total: 21, nps: 4 },
  haleakala: { total: 9, nps: 1 },
  acadia: { total: 8, nps: 1 },
  denali: { total: 10, nps: 0 },
  'glacier-bay': { total: 8, nps: 0 },
  'isle-royale': { total: 4, nps: 4 },
  'crater-lake': { total: 5, nps: 3 },
  'mount-rainier': { total: 6, nps: 3 },
  'grand-teton': { total: 4, nps: 0 },
  'kenai-fjords': { total: 4, nps: 0 },
  'virgin-islands': { total: 13, nps: 0 },
  'hawaii-volcanoes': { total: 9, nps: 0 },
  zion: { total: 15, nps: 0 },
  arches: { total: 13, nps: 1 },
  'bryce-canyon': { total: 5, nps: 0 },
  'black-canyon-of-the-gunnison': { total: 4, nps: 1 },
  shenandoah: { total: 17, nps: 0 },
  olympic: { total: 4, nps: 1 },
};

describe('national parks registry ↔ EXPLORE_SCOPES', () => {
  it('covers exactly the park-* scopes, both ways', () => {
    const scopeKeys = Object.keys(EXPLORE_SCOPES).filter((k) => k.startsWith('park-'));
    expect(scopeKeys.sort()).toEqual(NATIONAL_PARKS.map((p) => p.scopeKey).sort());
    expect(NATIONAL_PARKS).toHaveLength(22);
  });

  it('every scope definition matches its registry row (chunk, centre, radius)', () => {
    for (const p of NATIONAL_PARKS) {
      const def = EXPLORE_SCOPES[p.scopeKey];
      expect(def, p.slug).toBeDefined();
      const expectedSlug = p.slug === 'virgin-islands' ? 'us-virgin-islands' : 'united-states';
      expect(def.slugs, p.slug).toEqual([expectedSlug]);
      expect(def.geo, p.slug).toEqual({ lat: p.lat, lng: p.lng, radiusKm: p.radiusKm });
    }
  });

  it('every park clears the stated threshold and carries real copy', () => {
    for (const p of NATIONAL_PARKS) {
      expect(PINS[p.slug], p.slug).toBeDefined();
      expect(PINS[p.slug].total, p.slug).toBeGreaterThanOrEqual(4);
      expect(p.intro[0].length, p.slug).toBeGreaterThan(100);
      expect(p.intro[1].length, p.slug).toBeGreaterThan(100);
      expect(p.highlights.length, p.slug).toBeGreaterThanOrEqual(1);
      expect(p.faqs.length, p.slug).toBeGreaterThanOrEqual(2);
      // Timezone must be a real IANA zone (throws otherwise downstream).
      expect(
        () => new Intl.DateTimeFormat('en-US', { timeZone: p.tz }),
        p.slug,
      ).not.toThrow();
    }
  });
});

describe('national park wall yields (raw-chunk recomputation)', () => {
  it('matches the pinned totals and park-service counts for every park', () => {
    let grandTotal = 0;
    let grandNps = 0;
    for (const p of NATIONAL_PARKS) {
      const slug = p.slug === 'virgin-islands' ? 'us-virgin-islands' : 'united-states';
      const wall = rawWall(slug, p.lat, p.lng, p.radiusKm);
      const nps = wall.filter((r) => r.source === NPS_SOURCE).length;
      expect(wall.length, p.slug).toBe(PINS[p.slug].total);
      expect(nps, p.slug).toBe(PINS[p.slug].nps);
      grandTotal += wall.length;
      grandNps += nps;
    }
    // The two figures the hub's copy quotes.
    expect(grandTotal).toBe(188);
    expect(grandNps).toBe(39);
  });
});

describe('the named gaps stay gaps', () => {
  const us = (lat: number, lng: number, r: number) => rawWall('united-states', lat, lng, r);

  it('there is no Old Faithful camera in the Yellowstone wall', () => {
    const wall = us(44.73, -110.55, 55);
    expect(
      wall.filter((r) => (r.name ?? '').toLowerCase().includes('faithful')),
    ).toHaveLength(0);
  });

  it('Glacier holds exactly two cameras, both park-service', () => {
    const wall = us(48.6968, -113.7184, 30);
    expect(wall).toHaveLength(2);
    expect(wall.every((r) => r.source === NPS_SOURCE)).toBe(true);
  });

  it('the Great Smoky Mountains hold three around Newfound Gap', () => {
    expect(us(35.63, -83.44, 30)).toHaveLength(3);
  });

  it('the zero-camera parks stay zero', () => {
    expect(us(29.25, -103.25, 60), 'Big Bend').toHaveLength(0);
    expect(us(34.51, -93.05, 40), 'Hot Springs').toHaveLength(0);
    expect(us(24.63, -82.87, 40), 'Dry Tortugas').toHaveLength(0);
    expect(us(62.0, -142.0, 60), 'Wrangell-St. Elias').toHaveLength(0);
    expect(us(25.29, -80.99, 40), 'Everglades').toHaveLength(0);
    expect(us(58.65, -155.06, 60), 'Katmai / Brooks Falls').toHaveLength(0);
  });

  it('Death Valley holds exactly two within 60 km', () => {
    expect(us(36.505, -117.09, 60)).toHaveLength(2);
  });
});

describe('parkSunTimes', () => {
  it('computes a sane summer day for Yosemite', () => {
    const sun = parkSunTimes(37.7459, -119.5932, 'America/Los_Angeles', new Date('2026-06-21T18:00:00Z'));
    expect(sun.sunrise).not.toBeNull();
    expect(sun.sunset).not.toBeNull();
    expect(sun.sunrise!.getTime()).toBeLessThan(sun.sunset!.getTime());
    // June in Yosemite: well over 14 hours of daylight.
    const hours = (sun.sunset!.getTime() - sun.sunrise!.getTime()) / 3600_000;
    expect(hours).toBeGreaterThan(14);
    expect(hours).toBeLessThan(15.5);
    expect(sun.sunriseText).toMatch(/AM|PM/);
  });

  it('computes a short winter day for Denali', () => {
    const sun = parkSunTimes(63.728, -148.887, 'America/Anchorage', new Date('2026-12-21T20:00:00Z'));
    expect(sun.sunrise).not.toBeNull();
    expect(sun.sunset).not.toBeNull();
    const hours = (sun.sunset!.getTime() - sun.sunrise!.getTime()) / 3600_000;
    expect(hours).toBeGreaterThan(3);
    expect(hours).toBeLessThan(6);
  });
});
