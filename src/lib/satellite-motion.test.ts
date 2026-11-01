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

describe('arc motion (midpoint rows)', () => {
  // A curved span: the midpoint sits well off the epoch→lookahead chord.
  const ARC = row({ lat: 0, lng: 0, lat2: 12, lng2: 20, latM: 10, lngM: 8, alt: 500, alt2: 700 });

  it('passes exactly through the propagated midpoint at half span', () => {
    const [mid] = interpolateSatelliteRows([ARC], EPOCH, NEXT, EPOCH + 300_000);
    expect(mid.lat).toBeCloseTo(10);
    expect(mid.lng).toBeCloseTo(8);
  });

  it('curves off the chord between samples (quarter span)', () => {
    const [q] = interpolateSatelliteRows([ARC], EPOCH, NEXT, EPOCH + 150_000);
    // Control lat = 2*10 - (0+12)/2 = 14 → B(0.25) = 0.375*14 + 0.0625*12 = 6.
    // The straight chord would read 3 — the arc must NOT read 3.
    expect(q.lat).toBeCloseTo(6);
  });

  it('interpolates altitude across the span on the same fraction', () => {
    const [mid] = interpolateSatelliteRows([ARC], EPOCH, NEXT, EPOCH + 300_000);
    expect(mid.alt).toBeCloseTo(600);
    const [full] = interpolateSatelliteRows([ARC], EPOCH, NEXT, NEXT);
    expect(full.alt).toBeCloseTo(700);
    expect(full.lat).toBeCloseTo(12);
    expect(full.lng).toBeCloseTo(20);
  });

  it('extrapolates along the arc end tangent, not the stale chord', () => {
    // Tangent at t=1 (per span) = p0 + 3*p1 - 4*pm = 0 + 36 - 40 = -4 for lat:
    // one span past the lookahead the arc reads 12 - 4 = 8; the chord's 12
    // would read 24. Altitude holds at alt2 (no tangent for a linear ramp
    // past its last propagated sample).
    const [ext] = interpolateSatelliteRows([ARC], EPOCH, NEXT, NEXT + 600_000);
    expect(ext.lat).toBeCloseTo(8);
    expect(ext.alt).toBeCloseTo(700);
  });

  it('keeps the arc on the short way across the antimeridian', () => {
    const rows = [row({ lat: 0, lng: 179, lat2: 2, lng2: -179, latM: 1, lngM: -179.5, alt2: 600 })];
    const [mid] = interpolateSatelliteRows(rows, EPOCH, NEXT, EPOCH + 300_000);
    expect(mid.lng).toBeCloseTo(-179.5);
  });

  it('falls back to the exact chord walk when the arc set is incomplete', () => {
    const rows = [row({ lat: 0, lng: 0, lat2: 12, lng2: 20, latM: 10 })]; // no lngM/alt2
    const [mid] = interpolateSatelliteRows(rows, EPOCH, NEXT, EPOCH + 300_000);
    expect(mid.lat).toBeCloseTo(6);   // chord midpoint, not the arc's 10
    expect(mid.alt).toBe(500);        // altitude untouched on the chord path
  });
});
