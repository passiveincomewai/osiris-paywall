import { describe, expect, it } from 'vitest';
import type { CctvCamera } from './types';
import { applyRoadHeadings } from './road-headings';
import { ROAD_HEADINGS } from './road-headings.generated';

const cam = (patch: Partial<CctvCamera>): CctvCamera => ({
  id: 'txdot-test-1',
  lat: 32.47,
  lng: -99.8,
  name: 'Test',
  city: 'Abilene',
  country: 'US',
  source: 'TxDOT',
  ...patch,
});

const KNOWN_ID = Object.keys(ROAD_HEADINGS)[0];

describe('applyRoadHeadings', () => {
  it('ships a non-empty derivation table of sane bearings', () => {
    expect(KNOWN_ID).toBeTruthy();
    for (const v of Object.values(ROAD_HEADINGS)) {
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(360);
    }
  });

  it('marks a tabled camera as road-derived', () => {
    const out = applyRoadHeadings([cam({ id: KNOWN_ID })]);
    expect(out[0].heading_deg).toBe(ROAD_HEADINGS[KNOWN_ID]);
    expect(out[0].heading_source).toBe('road-derived');
  });

  it('never overwrites a sourced heading', () => {
    const out = applyRoadHeadings([
      cam({ id: KNOWN_ID, heading_deg: 123, heading_source: 'faa' }),
    ]);
    expect(out[0].heading_deg).toBe(123);
    expect(out[0].heading_source).toBe('faa');
  });

  it('leaves untabled cameras untouched (same array, no new fields)', () => {
    const input = [cam({ id: 'not-in-the-table-xyz' })];
    const out = applyRoadHeadings(input);
    expect(out).toBe(input);
    expect('heading_deg' in out[0]).toBe(false);
    expect('heading_source' in out[0]).toBe(false);
  });
});
