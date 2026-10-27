import { describe, expect, it } from 'vitest';
import {
  buildCorridor,
  getCorridor,
  projectOntoCorridor,
  CORRIDORS,
  MATCH_RADIUS_KM,
} from './corridors';
import type { CountryCamera } from './country-cameras';
import usChunk from '@/data/countries/united-states.json';

const cam = (id: string, lat: number, lng: number, source = 'TEST'): CountryCamera => ({
  id,
  name: id,
  lat,
  lng,
  source,
});

describe('corridor projection', () => {
  const i70 = getCorridor('i-70')!;

  it('places a camera on its state segment', () => {
    // Denver waypoint and Baltimore waypoint are both on the I-70 path.
    const denver = projectOntoCorridor(i70, 39.74, -104.99);
    expect(denver?.state).toBe('CO');
    expect(denver!.distKm).toBeLessThan(0.5);
    const baltimore = projectOntoCorridor(i70, 39.29, -76.61);
    expect(baltimore?.state).toBe('MD');
    expect(baltimore!.chainKm).toBeGreaterThan(denver!.chainKm);
  });

  it('measures perpendicular distance honestly', () => {
    // ~55 km north of the Denver waypoint: far outside the match radius.
    const far = projectOntoCorridor(i70, 40.24, -104.99);
    expect(far!.distKm).toBeGreaterThan(MATCH_RADIUS_KM * 5);
  });
});

describe('buildCorridor', () => {
  const i70 = getCorridor('i-70')!;

  it('excludes cameras beyond the match radius', () => {
    const build = buildCorridor(i70, [
      cam('on-route', 39.74, -104.99),
      cam('far-away', 41.5, -104.99),
    ]);
    expect(build.total).toBe(1);
    expect(build.segments).toHaveLength(1);
    expect(build.segments[0].state).toBe('CO');
  });

  it('orders cameras along the route regardless of input order', () => {
    const build = buildCorridor(i70, [
      cam('baltimore', 39.29, -76.61),
      cam('denver', 39.74, -104.99),
      cam('richfield', 38.77, -112.08),
    ]);
    expect(build.total).toBe(3);
    expect(build.segments.map((s) => s.state)).toEqual(['UT', 'CO', 'MD']);
    const all = build.segments.flatMap((s) => s.cameras.map((c) => c.id));
    expect(all).toEqual(['richfield', 'denver', 'baltimore']);
  });

  it('counts segments below the rich threshold as not qualifying on their own', () => {
    const build = buildCorridor(i70, [cam('only', 39.74, -104.99)]);
    expect(build.qualifies).toBe(false);
    expect(build.richSegments).toBe(0);
  });
});

describe('catalogue reconciliation (measured independently from the raw chunk)', () => {
  const records = usChunk as unknown as CountryCamera[];
  // Counts from a separate projection implementation over the same chunk
  // (perpendicular distance <= 3 km to the corridor reference path).
  const EXPECTED: Record<string, number> = {
    'i-5': 797,
    'i-15': 874,
    'i-35': 604,
    'i-40': 290,
    'i-70': 398,
    'i-80': 436,
    'i-90': 515,
    'i-95': 1332,
  };
  for (const def of CORRIDORS) {
    it(`${def.slug} matches the measured count and qualifies`, () => {
      const build = buildCorridor(def, records);
      expect(build.total).toBe(EXPECTED[def.slug]);
      expect(build.qualifies).toBe(true);
      // Segment counts sum back to the total.
      const sum = build.segments.reduce((s, seg) => s + seg.cameras.length, 0);
      expect(sum).toBe(build.total);
    });
  }
});
