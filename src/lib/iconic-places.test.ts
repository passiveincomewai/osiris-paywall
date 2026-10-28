import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { EXPLORE_SCOPES } from './explore-data';
import { ICONIC_GAPS, ICONIC_PLACES, iconicPlaceBySlug } from './iconic-places';

/**
 * Iconic places — the reconciliation the /iconic-places pages
 * publish by. The pages serve their counts from recordsForDef over
 * EXPLORE_SCOPES; this test pins (a) each registry row against its
 * scope definition (chunks, name pattern, geo bound), and (b) the
 * yield of that exact rule recomputed independently from the raw
 * generated chunks (src/data/countries/*.json, catalogue generated
 * 2026-10-20). Gap pins cover the famous absences the hub prints:
 * Times Square, Abbey Road, Bourbon Street, Ocean Drive, Pier 39,
 * Rodeo Drive and Lombard Street were all measured at zero
 * qualifying cameras — a camera merely in the same city never
 * qualifies, which is the family's whole rule.
 *
 * If the catalogue regenerates and a yield moves, this test fails
 * loudly — the pages' computed numbers follow the data
 * automatically, but their hard-coded copy (highlights, gap notes)
 * must then be re-checked by hand rather than drifting silently.
 */

const DATA_DIR = join(process.cwd(), 'src', 'data');

interface Rec {
  id?: string;
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

/** The scope rule recomputed from raw chunks: chunk union → name
 *  pattern → geo bound, the applyScope order. */
function rawSet(scopeKey: string): Rec[] {
  const def = EXPLORE_SCOPES[scopeKey];
  const base = (def.slugs as string[]).flatMap((s) => chunk(s));
  let out = base;
  if (def.namePattern) {
    const pattern = def.namePattern;
    out = out.filter((r) => pattern.test(r.name ?? ''));
  }
  if (def.geo) {
    const { lat, lng, radiusKm } = def.geo;
    out = out.filter(
      (r) =>
        typeof r.lat === 'number' &&
        typeof r.lng === 'number' &&
        haversineKm(lat, lng, r.lat, r.lng) <= radiusKm,
    );
  }
  return out;
}

function rawRadius(slug: string, lat: number, lng: number, radiusKm: number): Rec[] {
  return chunk(slug).filter(
    (r) =>
      typeof r.lat === 'number' &&
      typeof r.lng === 'number' &&
      haversineKm(lat, lng, r.lat, r.lng) <= radiusKm,
  );
}

/** Pinned yields, audited 2026-10-27 against the 2026-10-20 catalogue. */
const PINS: Record<string, number> = {
  'shibuya-crossing': 2,
  'las-vegas-strip': 26,
  'duval-street': 1,
  'kalakaua-avenue': 6,
};

describe('iconic places registry ↔ EXPLORE_SCOPES', () => {
  it('covers exactly the iconic-* scopes, both ways', () => {
    const scopeKeys = Object.keys(EXPLORE_SCOPES).filter((k) => k.startsWith('iconic-'));
    expect(scopeKeys.sort()).toEqual(ICONIC_PLACES.map((p) => p.scopeKey).sort());
    expect(ICONIC_PLACES).toHaveLength(4);
  });

  it('every registry row carries real copy and a valid timezone', () => {
    for (const p of ICONIC_PLACES) {
      expect(PINS[p.slug], p.slug).toBeDefined();
      expect(p.intro[0].length, p.slug).toBeGreaterThan(100);
      expect(p.intro[1].length, p.slug).toBeGreaterThan(100);
      expect(p.highlights.length, p.slug).toBeGreaterThanOrEqual(1);
      expect(p.faqs.length, p.slug).toBeGreaterThanOrEqual(2);
      expect(p.links.length, p.slug).toBeGreaterThanOrEqual(1);
      expect(p.setRule.length, p.slug).toBeGreaterThan(20);
      expect(() => new Intl.DateTimeFormat('en-US', { timeZone: p.tz }), p.slug).not.toThrow();
      expect(iconicPlaceBySlug(p.slug), p.slug).toBe(p);
    }
    expect(iconicPlaceBySlug('times-square')).toBeNull();
    expect(iconicPlaceBySlug('abbey-road')).toBeNull();
  });

  it('the hub gap list names the seven measured absences', () => {
    expect(ICONIC_GAPS).toHaveLength(7);
    for (const g of ICONIC_GAPS) expect(g.note.length).toBeGreaterThan(40);
  });
});

describe('iconic place set yields (raw-chunk recomputation)', () => {
  it('matches the pinned totals for every place', () => {
    for (const p of ICONIC_PLACES) {
      expect(rawSet(p.scopeKey).length, p.slug).toBe(PINS[p.slug]);
    }
  });

  it("Shibuya's set is exactly the two feeds that name the crossing", () => {
    const set = rawSet('iconic-shibuya-crossing');
    expect(set.map((r) => r.id).sort()).toEqual([
      'jp-shibuya-crossing',
      'sky-japan-tokyo-shibuya-scramble-crossing-1825',
    ]);
    /* The near-misses stay out: a Shibuya streets feed and a
       Shibuya river bridge are not the crossing. */
    expect(set.some((r) => r.id === 'sky-japan-streets-of-shibuya-tokyo-5367')).toBe(false);
    expect(set.some((r) => (r.name ?? '').includes('Shibuya Bridge'))).toBe(false);
    /* One of the two is registered at the crossing itself. */
    const atCrossing = set.find((r) => r.id === 'jp-shibuya-crossing');
    expect(atCrossing?.lat).toBeCloseTo(35.6595, 3);
    expect(atCrossing?.lng).toBeCloseTo(139.7005, 3);
  });

  it("the Strip's set is the boulevard between Sahara and the Welcome Sign", () => {
    const set = rawSet('iconic-las-vegas-strip');
    expect(set).toHaveLength(26);
    for (const r of set) {
      expect(r.name ?? '').toMatch(/las vegas blvd/i);
      expect(r.lat as number).toBeGreaterThanOrEqual(36.0807);
      expect(r.lat as number).toBeLessThanOrEqual(36.1439);
    }
    const names = set.map((r) => r.name ?? '');
    expect(names.some((n) => n.includes('Bellagio'))).toBe(true);
    expect(names.some((n) => n.includes('Welcome Sign'))).toBe(true);
    /* The boulevard north of Sahara is the same street, not the
       Strip — its cameras stay out. */
    expect(set.some((r) => r.id === 'ndot-7458')).toBe(false);
    expect(set.some((r) => (r.name ?? '').includes('Bob Stupak'))).toBe(false);
  });

  it("Duval's set is the single camera on Duval itself", () => {
    const set = rawSet('iconic-duval-street');
    expect(set.map((r) => r.id)).toEqual(['fdot-5931']);
    expect(set[0].name).toContain('Duval');
    /* Key West's other Truman Ave cameras stand within 1.2 km and
       are not Duval cameras — none is in the set. */
    const truman = rawRadius('united-states', 24.5511, -81.7992, 1.2).filter(
      (r) => (r.name ?? '').includes('Truman') && r.id !== 'fdot-5931',
    );
    expect(truman).toHaveLength(4);
    for (const r of truman) expect(set.some((s) => s.id === r.id)).toBe(false);
  });

  it("Kalākaua's set is exactly the six avenue-intersection cameras", () => {
    const set = rawSet('iconic-kalakaua-avenue');
    expect(set.map((r) => r.id).sort()).toEqual([
      'occ-arcgis-HI-0db6428b03',
      'occ-arcgis-HI-2c796788a8',
      'occ-arcgis-HI-6f23f71d43',
      'occ-arcgis-HI-81132c3bf2',
      'occ-arcgis-HI-abd71148db',
      'occ-arcgis-HI-c64c82bf67',
    ]);
  });
});

describe('the named gaps stay gaps', () => {
  it('Times Square has no qualifying camera', () => {
    expect(
      chunk('united-states').some((r) => /times square/i.test(r.name ?? '')),
    ).toBe(false);
    expect(rawRadius('united-states', 40.758, -73.9855, 1)).toHaveLength(0);
  });

  it("Abbey Road's famous crossing has no camera — and its name match is a different street", () => {
    expect(rawRadius('united-kingdom', 51.5321, -0.177, 0.3)).toHaveLength(0);
    const underpass = chunk('united-kingdom').find((r) => r.name === 'A406 Abbey Road Underpass');
    expect(underpass).toBeDefined();
    expect(
      haversineKm(51.5321, -0.177, underpass?.lat as number, underpass?.lng as number),
    ).toBeGreaterThan(5);
  });

  it('Bourbon Street and the French Quarter have no camera', () => {
    expect(rawRadius('united-states', 29.9546, -90.0692, 1)).toHaveLength(0);
    expect(
      chunk('united-states').some((r) => /bourbon st|french quarter/i.test(r.name ?? '')),
    ).toBe(false);
  });

  it('Ocean Drive, Pier 39, Rodeo Drive and Lombard Street are all zero', () => {
    expect(
      chunk('united-states').some((r) => /ocean drive/i.test(r.name ?? '')),
      'Ocean Drive name',
    ).toBe(false);
    expect(rawRadius('united-states', 25.7825, -80.1301, 1), 'Ocean Drive radius').toHaveLength(0);
    expect(rawRadius('united-states', 37.8099, -122.4104, 2), 'Pier 39').toHaveLength(0);
    expect(rawRadius('united-states', 34.0678, -118.4027, 2), 'Rodeo Drive').toHaveLength(0);
    expect(rawRadius('united-states', 37.8021, -122.4187, 1.5), 'Lombard Street').toHaveLength(0);
  });
});
