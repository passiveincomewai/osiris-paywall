import { describe, expect, it } from 'vitest';
import { advanceFlight, advanceFlights, blendSnapshots, destinationPoint, lerpAngleDeg, wrapLng } from './motion';

const KNOT_MS = 0.514444;

describe('destinationPoint', () => {
  it('moves one minute of latitude flying due north', () => {
    // ~1 nm north of the equator is ~1/60 degree of latitude (1 arc-minute is
    // 1853.25 m at this earth radius vs the 1852 m nautical-mile definition).
    const p = destinationPoint(0, 0, 0, 1852);
    expect(p.lat).toBeCloseTo(1 / 60, 4);
    expect(p.lng).toBeCloseTo(0, 6);
  });

  it('wraps longitude across the antimeridian', () => {
    const p = destinationPoint(0, 179.99, 90, 5000);
    expect(p.lng).toBeLessThan(-179);
    expect(p.lng).toBeGreaterThan(-180);
  });
});

describe('advanceFlight (dead reckoning)', () => {
  const base = { lat: 51.5, lng: -0.12, heading: 90, speed_knots: 480, alt: 11000, icao24: 'abc123', grounded: false };

  it('advances along track at ground speed', () => {
    const moved = advanceFlight(base, 60);
    const expectedM = 480 * KNOT_MS * 60;
    // Recover the travelled distance from the coordinate change at lat 51.5.
    const dLngRad = ((moved.lng - base.lng) * Math.PI) / 180;
    const distM = dLngRad * 6371000 * Math.cos((base.lat * Math.PI) / 180);
    expect(distM).toBeCloseTo(expectedM, -2); // within ~100 m after 5dp rounding
    expect(moved.lat).toBeCloseTo(base.lat, 3);
  });

  it('holds position when grounded, engineless or dt is zero', () => {
    expect(advanceFlight({ ...base, grounded: true }, 60)).toEqual({ ...base, grounded: true });
    expect(advanceFlight({ ...base, speed_knots: null }, 60).lat).toBe(base.lat);
    expect(advanceFlight({ ...base, heading: null }, 60).lng).toBe(base.lng);
    expect(advanceFlight(base, 0)).toBe(base);
  });

  it('clamps extrapolation to five minutes', () => {
    const clamped = advanceFlight(base, 3600);
    const at300 = advanceFlight(base, 300);
    expect(clamped).toEqual(at300);
  });

  it('advances a whole snapshot without mutating the input', () => {
    const snap = [base, { ...base, icao24: 'def456', grounded: true }];
    const out = advanceFlights(snap, 30);
    expect(out).toHaveLength(2);
    expect(out[0].lng).not.toBe(base.lng);
    expect(out[1].lng).toBe(base.lng);
    expect(snap[0].lng).toBe(base.lng);
  });
});

describe('lerpAngleDeg', () => {
  it('takes the shortest arc across north', () => {
    expect(lerpAngleDeg(350, 10, 0.5)).toBeCloseTo(0, 6);
    expect(lerpAngleDeg(10, 350, 0.5)).toBeCloseTo(0, 6);
    expect(lerpAngleDeg(90, 180, 0.5)).toBeCloseTo(135, 6);
  });
});

describe('blendSnapshots', () => {
  const prev = [
    { icao24: 'aaa', lat: 40, lng: -74, heading: 350, alt: 10000, speed_knots: 450 },
    { icao24: 'gone', lat: 1, lng: 1, heading: 0, alt: 0, speed_knots: 0 },
  ];
  const next = [
    { icao24: 'aaa', lat: 41, lng: -73, heading: 10, alt: 11000, speed_knots: 460 },
    { icao24: 'new', lat: 10, lng: 20, heading: 90, alt: 5000, speed_knots: 300 },
  ];

  it('interpolates matched aircraft and passes new ones through', () => {
    const out = blendSnapshots(prev, next, 0.5);
    expect(out).toHaveLength(2);
    const a = out.find((f) => f.icao24 === 'aaa')!;
    expect(a.lat).toBeCloseTo(40.5, 6);
    expect(a.lng).toBeCloseTo(-73.5, 6);
    expect(a.heading).toBe(0); // 350° → 10° shortest arc crosses north
    expect(a.alt).toBe(10500);
    const fresh = out.find((f) => f.icao24 === 'new')!;
    expect(fresh.lat).toBe(10);
  });

  it('blends across the antimeridian the short way', () => {
    const p = [{ icao24: 'x', lat: -17, lng: 179.9, heading: 90, alt: 9000 }];
    const n = [{ icao24: 'x', lat: -17, lng: -179.9, heading: 90, alt: 9000 }];
    const out = blendSnapshots(p, n, 0.5);
    expect(Math.abs(out[0].lng)).toBeCloseTo(180, 6);
  });

  it('drops aircraft missing from the newest snapshot', () => {
    const out = blendSnapshots(prev, next, 0.5);
    expect(out.some((f) => f.icao24 === 'gone')).toBe(false);
  });

  it('alpha 0 returns the next snapshot untouched', () => {
    const out = blendSnapshots(prev, next, 0);
    expect(out.find((f) => f.icao24 === 'aaa')!.lat).toBe(41);
  });
});

describe('wrapLng', () => {
  it('normalises into [-180, 180)', () => {
    expect(wrapLng(190)).toBe(-170);
    expect(wrapLng(-190)).toBe(170);
    expect(wrapLng(180)).toBe(-180);
    expect(wrapLng(0)).toBe(0);
  });
});
