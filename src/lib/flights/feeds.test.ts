import { describe, expect, it } from 'vitest';
import { aircraftHex, extractAircraft, ingestAircraft } from './feeds';

describe('extractAircraft', () => {
  it('reads the current { ac } shape (adsb.lol /v2 and adsb.fi /v3 point, /v2 type feeds)', () => {
    const data = { ac: [{ hex: 'abc123' }, { hex: 'def456' }], total: 2 };
    expect(extractAircraft(data)).toHaveLength(2);
  });

  it('reads the deprecated { aircraft } shape (adsb.fi /v2 point endpoint)', () => {
    // The regression this pins: the /v2 point endpoint answers 200 with its
    // aircraft under `aircraft`, and a parser reading only `ac` silently
    // ingested zero from every region.
    const data = { aircraft: [{ hex: 'abc123' }], resultCount: 1 };
    expect(extractAircraft(data)).toHaveLength(1);
    expect(extractAircraft(data)[0].hex).toBe('abc123');
  });

  it('prefers ac when both keys exist', () => {
    const data = { ac: [{ hex: 'a' }], aircraft: [{ hex: 'b' }, { hex: 'c' }] };
    expect(extractAircraft(data)).toHaveLength(1);
  });

  it('returns [] for error bodies, nulls and non-objects', () => {
    expect(extractAircraft(null)).toEqual([]);
    expect(extractAircraft(undefined)).toEqual([]);
    expect(extractAircraft('error')).toEqual([]);
    expect(extractAircraft({ error: 'forbidden' })).toEqual([]);
    expect(extractAircraft({ ac: 'not-an-array' })).toEqual([]);
  });
});

describe('ingestAircraft', () => {
  it('dedupes on normalised hex and counts additions', () => {
    const into: any[] = [];
    const seen = new Set<string>();
    expect(ingestAircraft([{ hex: 'ABC123' }, { hex: 'abc123' }, { hex: 'DEF456' }], into, seen)).toBe(2);
    expect(into).toHaveLength(2);
    expect(ingestAircraft([{ hex: 'def456' }, { hex: '999999' }], into, seen)).toBe(1);
    expect(into).toHaveLength(3);
  });

  it('skips records without a usable hex', () => {
    const into: any[] = [];
    const seen = new Set<string>();
    expect(ingestAircraft([{ hex: '' }, {}, { hex: 42 }, null], into, seen)).toBe(0);
    expect(into).toHaveLength(0);
  });
});

describe('aircraftHex', () => {
  it('lowercases and trims', () => {
    expect(aircraftHex({ hex: ' A1B2C3 ' })).toBe('a1b2c3');
    expect(aircraftHex({})).toBe('');
    expect(aircraftHex(null)).toBe('');
  });
});
