import { describe, expect, it } from 'vitest';
import type { SatelliteRow } from './satellite-payload';
import { interpolateSatelliteRows, MAX_EXTRAPOLATION_SPANS } from './satellite-motion';

const EPOCH = 1_000_000_000_000;
const NEXT = EPOCH + 600_000; // the route's ten-minute lookahead

function row(partial: Partial<SatelliteRow>): SatelliteRow {
  return {
    name: 'TEST', lat: 0, lng: 0, alt: 500, mission: 'Unknown',
    color: '#00E5FF', category: 'other', noradId: '1', ...partial,
  };
}

describe('interpolateSatelliteRows', () => {
  it('walks a marker along its vector: quarter span, half span, full span', () => {
    const rows = [row({ lat: 10, lng: 20, lat2: 30, lng2: 60 })];
    const quarter = interpolateSatelliteRows(rows, EPOCH, NEXT, EPOCH + 150_000);
    expect(quarter[0].lat).toBeCloseTo(15);
    expect(quarter[0].lng).toBeCloseTo(30);
    const half = interpolateSatelliteRows(rows, EPOCH, NEXT, EPOCH + 300_000);
    expect(half[0].lat).toBeCloseTo(20);
    expect(half[0].lng).toBeCloseTo(40);
    const full = interpolateSatelliteRows(rows, EPOCH, NEXT, NEXT);
    expect(full[0].lat).toBeCloseTo(30);
    expect(full[0].lng).toBeCloseTo(60);
  });

  it('extrapolates past the lookahead epoch along the same vector, capped', () => {
    const rows = [row({ lat: 0, lng: 0, lat2: 6, lng2: 12 })];
    const beyond = interpolateSatelliteRows(rows, EPOCH, NEXT, NEXT + 600_000); // 2 spans
    expect(beyond[0].lat).toBeCloseTo(12);
    expect(beyond[0].lng).toBeCloseTo(24);
    const wayBeyond = interpolateSatelliteRows(rows, EPOCH, NEXT, NEXT + 600_000 * 40);
    expect(wayBeyond[0].lat).toBeCloseTo(6 * MAX_EXTRAPOLATION_SPANS);
    expect(wayBeyond[0].lng).toBeCloseTo(12 * MAX_EXTRAPOLATION_SPANS);
  });

  it('takes the short way across the antimeridian and normalizes the result', () => {
    const rows = [row({ lat: 5, lng: 179, lat2: 6, lng2: -179 })];
    const half = interpolateSatelliteRows(rows, EPOCH, NEXT, EPOCH + 300_000);
    // 179 -> -179 the short way is +2 through 180, so halfway sits on 180/-180.
    expect(Math.abs(half[0].lng)).toBeCloseTo(180);
    const full = interpolateSatelliteRows(rows, EPOCH, NEXT, NEXT);
    expect(full[0].lng).toBeCloseTo(-179);
  });

  it('never walks latitude past a pole', () => {
    const rows = [row({ lat: 89, lat2: 95, lng: 0, lng2: 4 })];
    const out = interpolateSatelliteRows(rows, EPOCH, NEXT, NEXT + 600_000);
    expect(out[0].lat).toBeLessThanOrEqual(90);
  });

  it('passes rows without a lookahead pair through untouched, by identity', () => {
    const still = row({ lat: 1, lng: 2 });
    const moving = row({ lat: 0, lng: 0, lat2: 10, lng2: 10 });
    const out = interpolateSatelliteRows([still, moving], EPOCH, NEXT, EPOCH + 300_000);
    expect(out[0]).toBe(still);
    expect(out[1]).not.toBe(moving);
    expect(out[1].lat).toBeCloseTo(5);
  });

  it('returns the input itself when nothing can move (identity = no repaint needed)', () => {
    const rows = [row({ lat: 1, lng: 2 })]; // no lookahead anywhere
    expect(interpolateSatelliteRows(rows, EPOCH, NEXT, EPOCH + 300_000)).toBe(rows);
    const moving = [row({ lat: 0, lng: 0, lat2: 9, lng2: 9 })];
    expect(interpolateSatelliteRows(moving, EPOCH, NEXT, EPOCH)).toBe(moving); // at the epoch
    expect(interpolateSatelliteRows(moving, EPOCH, NEXT, EPOCH - 60_000)).toBe(moving); // clock before epoch
  });

  it('returns the input itself for unusable epochs', () => {
    const rows = [row({ lat: 0, lng: 0, lat2: 9, lng2: 9 })];
    expect(interpolateSatelliteRows(rows, NaN, NEXT, EPOCH)).toBe(rows);
    expect(interpolateSatelliteRows(rows, EPOCH, EPOCH, EPOCH)).toBe(rows);
    expect(interpolateSatelliteRows(rows, NEXT, EPOCH, EPOCH)).toBe(rows);
    expect(interpolateSatelliteRows([], EPOCH, NEXT, EPOCH + 1)).toEqual([]);
  });

  it('does not mutate the input rows', () => {
    const rows = [row({ lat: 1, lng: 2, lat2: 3, lng2: 4 })];
    interpolateSatelliteRows(rows, EPOCH, NEXT, EPOCH + 300_000);
    expect(rows[0].lat).toBe(1);
    expect(rows[0].lng).toBe(2);
  });
});
