import { describe, expect, it } from 'vitest';
import type { CctvCamera } from './types';
import { applyNameHeadings, nameStatedHeading } from './name-headings';

const cam = (patch: Partial<CctvCamera>): CctvCamera => ({
  id: 'cal-test-1',
  lat: 39.0,
  lng: -122.0,
  name: 'Test',
  city: 'Ukiah',
  country: 'US',
  source: 'Caltrans',
  ...patch,
});

describe('nameStatedHeading', () => {
  it('reads an explicit looking/facing statement at compass-point precision', () => {
    expect(nameStatedHeading('SR-20 : West Of US-101 - Looking East (C007)')).toBe(90);
    expect(nameStatedHeading('Cobb Pkwy at I-285 Looking North (COBB)')).toBe(0);
    expect(nameStatedHeading('Harrop Ferry Landing North View')).toBe(0);
    expect(nameStatedHeading('Intersection cam facing southwest')).toBe(225);
  });

  it('accepts two statements that agree', () => {
    expect(nameStatedHeading('US-101 Looking South — South View')).toBe(180);
  });

  it('rejects two statements that disagree', () => {
    expect(nameStatedHeading('US-101 Looking East — West View')).toBeNull();
  });

  it('never treats a road-direction token as a facing', () => {
    expect(nameStatedHeading('I-15 NB @ 9000 S')).toBeNull();
    expect(nameStatedHeading('SR-6 Westbound at SR-92')).toBeNull();
    expect(nameStatedHeading('I-359 at MP 2 - North')).toBeNull();
    expect(nameStatedHeading('Main St / US-191 @ Center St')).toBeNull();
  });

  it('returns null for names with no statement', () => {
    expect(nameStatedHeading('Rucker Rd at Charlotte Dr (Alpharetta)')).toBeNull();
    expect(nameStatedHeading('')).toBeNull();
  });
});

describe('applyNameHeadings', () => {
  it("marks a stated camera as name-derived", () => {
    const out = applyNameHeadings([
      cam({ name: 'SR-20 : At SR-1 - Looking West (C020)' }),
    ]);
    expect(out[0].heading_deg).toBe(270);
    expect(out[0].heading_source).toBe('name-derived');
  });

  it('never overwrites an existing heading of any provenance', () => {
    const out = applyNameHeadings([
      cam({ name: 'X Looking East', heading_deg: 12, heading_source: 'faa' }),
      cam({ name: 'Y Looking East', heading_deg: 34, heading_source: 'road-derived' }),
    ]);
    expect(out[0].heading_deg).toBe(12);
    expect(out[0].heading_source).toBe('faa');
    expect(out[1].heading_deg).toBe(34);
    expect(out[1].heading_source).toBe('road-derived');
  });

  it('leaves unstated cameras untouched (same array, no new fields)', () => {
    const input = [cam({ name: 'I-15 NB @ 9000 S' })];
    const out = applyNameHeadings(input);
    expect(out).toBe(input);
    expect('heading_deg' in out[0]).toBe(false);
    expect('heading_source' in out[0]).toBe(false);
  });
});
