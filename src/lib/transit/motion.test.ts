import { describe, it, expect } from 'vitest';
import { blendTransitSnapshots, advanceVehicle, TransitBlend, type TransitVehicleLike } from './motion';

const bus = (over: Partial<TransitVehicleLike> = {}): TransitVehicleLike => ({
  id: 'v1', lat: 40.7608, lng: -111.891, bearing: 90, speedKmh: 36, ts: 1000, ...over,
});

describe('blendTransitSnapshots', () => {
  it('interpolates position and bearing between bracketing fixes', () => {
    // A realistic 15 s move: ~475 m diagonal at city speed.
    const prev = [bus({ lat: 40.76, lng: -111.9, bearing: 80 })];
    const next = [bus({ lat: 40.763, lng: -111.896, bearing: 100, ts: 1015 })];
    const mid = blendTransitSnapshots(prev, next, 0.5);
    expect(mid[0].lat).toBeCloseTo(40.7615, 5);
    expect(mid[0].lng).toBeCloseTo(-111.898, 5);
    expect(mid[0].bearing).toBe(90);
    // The newest snapshot's own fields (fix time, route info) win.
    expect(mid[0].ts).toBe(1015);
  });
  it('alpha 0 returns the newest snapshot verbatim; alpha 1 lands on it', () => {
    const prev = [bus({ lat: 40.0 })];
    const next = [bus({ lat: 40.01 })];
    expect(blendTransitSnapshots(prev, next, 0)[0].lat).toBe(40.01);
    expect(blendTransitSnapshots(prev, next, 1)[0].lat).toBeCloseTo(40.01, 6);
  });
  it('snaps instead of gliding when fixes are implausibly far apart (feed correction)', () => {
    const prev = [bus({ lat: 40.76, lng: -111.89 })];
    const next = [bus({ lat: 40.9, lng: -111.89 })]; // ~15.6 km in one poll
    const out = blendTransitSnapshots(prev, next, 0.5);
    expect(out[0].lat).toBe(40.9);
  });
  it('passes through vehicles only in next and drops vehicles only in prev', () => {
    const prev = [bus({ id: 'old', lat: 40.1 }), bus({ id: 'v1', lat: 40.2 })];
    const next = [bus({ id: 'v1', lat: 40.21 }), bus({ id: 'new', lat: 40.3 })];
    const ids = blendTransitSnapshots(prev, next, 0.5).map(v => v.id);
    expect(ids).toEqual(['v1', 'new']);
  });
  it('crosses the antimeridian on the short arc', () => {
    const prev = [bus({ lat: 40, lng: 179.99 })];
    const next = [bus({ lat: 40, lng: -179.99 })];
    const mid = blendTransitSnapshots(prev, next, 0.5);
    expect(Math.abs(mid[0].lng)).toBeCloseTo(180, 1);
  });
});

describe('advanceVehicle (dead reckoning)', () => {
  it('advances along the reported bearing at the reported speed', () => {
    // 36 km/h = 10 m/s due east for 10 s = 100 m ≈ +0.00117° lng at 40.76°N
    const out = advanceVehicle(bus(), 10);
    expect(out.lat).toBeCloseTo(40.7608, 3);
    expect(out.lng).toBeGreaterThan(-111.891 + 0.001);
    expect(out.lng).toBeLessThan(-111.891 + 0.0014);
  });
  it('holds position with no speed or no bearing', () => {
    expect(advanceVehicle(bus({ speedKmh: 0 }), 10)).toEqual(bus({ speedKmh: 0 }));
    expect(advanceVehicle(bus({ bearing: undefined }), 10).lng).toBe(-111.891);
  });
  it('clamps projection to 45 s no matter how stale the snapshot', () => {
    const a = advanceVehicle(bus(), 45);
    const b = advanceVehicle(bus(), 3600);
    expect(b).toEqual(a);
  });
});

describe('TransitBlend', () => {
  it('dead-reckons a lone snapshot, then glides once a pair exists', () => {
    const blend = new TransitBlend();
    const t0 = 1_000_000;
    blend.push('uta', [bus({ lat: 40.76, lng: -111.9 })], t0);
    const lone = blend.current('uta', t0 + 10_000);
    expect(lone[0].lng).toBeGreaterThan(-111.9); // moved east along bearing
    blend.push('uta', [bus({ lat: 40.76, lng: -111.89, ts: 1015 })], t0 + 15_000);
    // At the arrival instant the glide is at ≈prev, not the new fix.
    const atArrival = blend.current('uta', t0 + 15_000);
    expect(atArrival[0].lng).toBeLessThan(-111.895);
    // Half an interval later it is halfway between the two real fixes.
    const mid = blend.current('uta', t0 + 22_500);
    expect(mid[0].lng).toBeCloseTo(-111.895, 3);
    // After a full interval it rests on the newest real fix — never beyond.
    const done = blend.current('uta', t0 + 45_000);
    expect(done[0].lng).toBeCloseTo(-111.89, 5);
  });
  it('an empty payload never clears a held snapshot; forget() does', () => {
    const blend = new TransitBlend();
    blend.push('uta', [bus()], 1_000);
    blend.push('uta', [], 2_000);
    expect(blend.current('uta', 2_000)).toHaveLength(1);
    blend.forget('uta');
    expect(blend.current('uta', 2_000)).toEqual([]);
    expect(blend.agencies()).toEqual([]);
  });
  it('ignores re-served snapshots whose fixes have not advanced (feed slower than the cache)', () => {
    const blend = new TransitBlend();
    blend.push('uta', [bus({ lng: -111.9, ts: 1000 })], 1_000);
    // Same fix (same vehicle ts) re-pushed 4 s later — must NOT rotate
    // the pair or the glide interval gets measured from the wrong push.
    blend.push('uta', [bus({ lng: -111.9, ts: 1000 })], 5_000);
    blend.push('uta', [bus({ lng: -111.89, ts: 1030 })], 20_000);
    // Interval measured from the last CONTENT change: 19 s. Half-way
    // (9.5 s after the new fix landed) the dot is mid-glide.
    const mid = blend.current('uta', 29_500);
    expect(mid[0].lng).toBeCloseTo(-111.895, 3);
  });
  it('keeps agencies independent', () => {
    const blend = new TransitBlend();
    blend.push('uta', [bus({ id: 'u1' })], 1_000);
    blend.push('rtd-denver', [bus({ id: 'r1', lat: 39.75, lng: -104.99 })], 1_000);
    expect(blend.current('uta', 1_000).map(v => v.id)).toEqual(['u1']);
    expect(blend.current('rtd-denver', 1_000).map(v => v.id)).toEqual(['r1']);
    expect(blend.agencies().sort()).toEqual(['rtd-denver', 'uta']);
  });
});
