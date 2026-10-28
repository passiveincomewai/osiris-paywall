import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  IDLE_FLIGHT_FOLLOW,
  FOLLOW_LOST_GRACE_MS,
  aircraftFollowPreset,
  chaseCameraTarget,
  describeFix,
  followCameraTarget,
  followLostExpired,
  forwardCameraTarget,
  headingOf,
  noteFollowSeen,
  orbitCameraTarget,
  setFollowMode,
  startFollow,
  stopFollow,
  type FollowFix,
} from './follow';
import { FlightBlend, type FlightBlendTiming } from './render';

const SAVED = { center: [-0.12, 51.5] as [number, number], zoom: 4, pitch: 0, bearing: 0 };
const TARGET = { icao24: 'abc123', callsign: 'BAW117' };

function fix(over: Partial<FollowFix> = {}): FollowFix {
  return {
    lat: 0,
    lng: 0,
    heading: 90,
    alt: 11000,
    speed_knots: 450,
    callsign: 'BAW117',
    icao24: 'abc123',
    ...over,
  };
}

describe('follow state machine', () => {
  it('startFollow engages with the saved camera, chase default and a fresh grace window', () => {
    const s = startFollow(TARGET, SAVED, 10_000);
    expect(s.phase).toBe('engaging');
    expect(s.target).toEqual(TARGET);
    expect(s.savedCamera).toEqual(SAVED);
    expect(s.mode).toBe('chase');
    expect(s.engagedAt).toBe(10_000);
    expect(s.lastSeenAt).toBe(10_000);
    expect(s.lastFix).toBeNull();
  });

  it('startFollow can engage directly in forward mode (the cockpit view entry point)', () => {
    const s = startFollow(TARGET, SAVED, 10_000, 'forward');
    expect(s.phase).toBe('engaging');
    expect(s.target).toEqual(TARGET);
    expect(s.mode).toBe('forward');
    expect(s.modeSince).toBe(10_000);
    expect(s.lastSeenAt).toBe(10_000);
    // And the cockpit camera maths are what the mode drives.
    expect(followCameraTarget(s.mode, fix(), 0)).toEqual(forwardCameraTarget(fix()));
  });

  it('setFollowMode switches mode and restarts the mode clock; a no-op switch keeps state', () => {
    const s = startFollow(TARGET, SAVED, 0);
    const fwd = setFollowMode(s, 'forward', 5_000);
    expect(fwd.mode).toBe('forward');
    expect(fwd.modeSince).toBe(5_000);
    expect(setFollowMode(fwd, 'forward', 9_000)).toBe(fwd);
    expect(setFollowMode(IDLE_FLIGHT_FOLLOW, 'orbit', 1_000)).toBe(IDLE_FLIGHT_FOLLOW);
  });

  it('noteFollowSeen records the fix and refreshes the loss clock', () => {
    const s = startFollow(TARGET, SAVED, 0);
    const seen = noteFollowSeen(s, fix(), 7_500);
    expect(seen.lastSeenAt).toBe(7_500);
    expect(seen.lastFix?.callsign).toBe('BAW117');
  });

  it('followLostExpired fires only past the grace window, measured from last seen', () => {
    const s = startFollow(TARGET, SAVED, 0);
    expect(followLostExpired(s, FOLLOW_LOST_GRACE_MS)).toBe(false);
    expect(followLostExpired(s, FOLLOW_LOST_GRACE_MS + 1)).toBe(true);
    const seen = noteFollowSeen(s, fix(), 20_000);
    expect(followLostExpired(seen, 20_000 + FOLLOW_LOST_GRACE_MS)).toBe(false);
    expect(followLostExpired(seen, 20_000 + FOLLOW_LOST_GRACE_MS + 1)).toBe(true);
    expect(followLostExpired(IDLE_FLIGHT_FOLLOW, Number.MAX_SAFE_INTEGER)).toBe(false);
  });

  it('stopFollow returns to the idle state (the caller reads savedCamera before calling)', () => {
    const s = startFollow(TARGET, SAVED, 0);
    expect(s.savedCamera).toEqual(SAVED);
    const stopped = stopFollow();
    expect(stopped.phase).toBe('idle');
    expect(stopped.target).toBeNull();
    expect(stopped.savedCamera).toBeNull();
  });
});

describe('follow camera maths', () => {
  it('headingOf normalises and falls back when the fix has no heading', () => {
    expect(headingOf(fix({ heading: 450 }))).toBe(90);
    expect(headingOf(fix({ heading: -90 }))).toBe(270);
    expect(headingOf(fix({ heading: null }), 123)).toBe(123);
    expect(headingOf(fix({ heading: undefined }))).toBe(0);
  });

  it('chase centres behind the aircraft, bearing locked to heading, pitched down', () => {
    const t = chaseCameraTarget(fix());
    // Heading 90° (east) at the equator: the chase centre is ~1.15 km WEST.
    expect(t.bearing).toBe(90);
    expect(t.pitch).toBe(68);
    expect(t.zoom).toBe(15.4);
    expect(t.center[0]).toBeLessThan(-0.009);
    expect(t.center[0]).toBeGreaterThan(-0.012);
    expect(Math.abs(t.center[1])).toBeLessThan(0.001);
  });

  it('forward centres ahead of the aircraft at near-horizon pitch', () => {
    const t = forwardCameraTarget(fix());
    expect(t.bearing).toBe(90);
    expect(t.pitch).toBe(85);
    expect(t.zoom).toBe(16.6);
    // ~480 m EAST of the fix.
    expect(t.center[0]).toBeGreaterThan(0.003);
    expect(t.center[0]).toBeLessThan(0.0055);
  });

  it('forward view crosses the antimeridian cleanly', () => {
    const t = forwardCameraTarget(fix({ lat: 10, lng: 179.999 }));
    expect(t.center[0]).toBeLessThan(-179.99);
  });

  it('orbit centres on the aircraft and advances bearing with elapsed time', () => {
    const still = orbitCameraTarget(fix(), 0);
    expect(still.center).toEqual([0, 0]);
    expect(still.bearing).toBe(90);
    expect(still.pitch).toBe(55);
    expect(orbitCameraTarget(fix(), 20_000).bearing).toBe(190);
    // 74 s in: 90 + 370 wraps to 100.
    expect(orbitCameraTarget(fix(), 74_000).bearing).toBe(100);
  });

  it('followCameraTarget dispatches per mode', () => {
    const f = fix();
    expect(followCameraTarget('chase', f, 0)).toEqual(chaseCameraTarget(f));
    expect(followCameraTarget('forward', f, 0)).toEqual(forwardCameraTarget(f));
    expect(followCameraTarget('orbit', f, 2_000)).toEqual(orbitCameraTarget(f, 2_000));
  });

  it('a fix without heading flies the fallback bearing', () => {
    const t = chaseCameraTarget(fix({ heading: null }), 270);
    expect(t.bearing).toBe(270);
    // Facing west, the chase centre sits EAST of the aircraft.
    expect(t.center[0]).toBeGreaterThan(0.009);
  });
});

describe('describeFix — fix-age derivation and interpolation honesty', () => {
  const NOW = 100_000;
  const timing = (over: Partial<FlightBlendTiming>): FlightBlendTiming => ({
    hasPrev: true,
    alpha: 0.5,
    prevFixAt: NOW - 35_000,
    nextFixAt: NOW - 5_000,
    ...over,
  });

  it('is null without a snapshot', () => {
    expect(describeFix(null, NOW)).toBeNull();
  });

  it('bracketed rendering is INTERPOLATED, aged from the newest fix', () => {
    const d = describeFix(timing({}), NOW);
    expect(d!.kind).toBe('interpolated');
    expect(d!.label).toBe('POSITION INTERPOLATED BETWEEN FIXES');
    expect(d!.newestFixAgeS).toBeCloseTo(5, 5);
  });

  it('a lone snapshot being dead-reckoned is EXTRAPOLATED', () => {
    const d = describeFix(timing({ hasPrev: false, alpha: 1 }), NOW);
    expect(d!.kind).toBe('extrapolated');
    expect(d!.label).toBe('POSITION EXTRAPOLATED FROM THE LAST FIX');
  });

  it('sitting on the newest fix past the interval is EXTRAPOLATED, not interpolated', () => {
    const d = describeFix(timing({ alpha: 1 }), NOW);
    expect(d!.kind).toBe('extrapolated');
  });

  it('age never goes negative against a future-dated fix', () => {
    const d = describeFix(timing({ nextFixAt: NOW + 60_000 }), NOW);
    expect(d!.newestFixAgeS).toBe(0);
  });
});

describe('integration — FlightBlend timing feeds describeFix (the HUD path)', () => {
  const buckets = (n: number) => ({
    commercial_flights: Array.from({ length: n }, (_, i) => fix({ icao24: `hex${i}` })),
    private_flights: [],
    private_jets: [],
    military_flights: [],
  });

  it('mid-interval the HUD reads INTERPOLATED with the newest fix age; after the interval, EXTRAPOLATED', () => {
    const blend = new FlightBlend();
    blend.push(buckets(2), 1_000, 900);
    blend.push(buckets(2), 31_000, 30_500);
    // 15 s into the interval after the second snapshot: bracketing fixes.
    const mid = describeFix(blend.timing(46_000), 46_000);
    expect(mid!.kind).toBe('interpolated');
    expect(mid!.newestFixAgeS).toBeCloseTo(15.5, 5);
    // Well past the interval with no newer snapshot: held at the last fix.
    const late = describeFix(blend.timing(500_000), 500_000);
    expect(late!.kind).toBe('extrapolated');
    expect(late!.newestFixAgeS).toBeCloseTo(469.5, 5);
  });

  it('a single snapshot dead-reckons: EXTRAPOLATED from its own fix time', () => {
    const blend = new FlightBlend();
    blend.push(buckets(1), 10_000, 8_000);
    const d = describeFix(blend.timing(13_000), 13_000);
    expect(d!.kind).toBe('extrapolated');
    expect(d!.newestFixAgeS).toBeCloseTo(5, 5);
  });
});

describe('aircraftFollowPreset — Director action preset', () => {
  afterEach(() => {
    delete (globalThis as any).window;
  });

  it('never builds a scene (it drives the follow system, not the player)', () => {
    const p = aircraftFollowPreset();
    expect(p.build({ currentCenter: [0, 0], cameras: [] })).toBeNull();
  });

  it('is available only when an aircraft is selected', () => {
    const p = aircraftFollowPreset();
    expect(p.available!({ currentCenter: [0, 0], cameras: [] })).toBe(false);
    expect(p.available!({ currentCenter: [0, 0], cameras: [], followTarget: null })).toBe(false);
    expect(
      p.available!({ currentCenter: [0, 0], cameras: [], followTarget: { icao24: 'abc123', callsign: 'BAW117' } }),
    ).toBe(true);
    expect(p.unavailableNote).toBeTruthy();
  });

  it('action engages follow on the selected aircraft through the window bridge', () => {
    const toggle = vi.fn();
    (globalThis as any).window = { __weFlightFollowToggle: toggle };
    const p = aircraftFollowPreset();
    p.action!({ currentCenter: [0, 0], cameras: [], followTarget: { icao24: 'abc123', callsign: 'BAW117' } });
    expect(toggle).toHaveBeenCalledWith('abc123', 'BAW117');
  });

  it('action is a no-op without a target or without the bridge', () => {
    const p = aircraftFollowPreset();
    (globalThis as any).window = {};
    expect(() =>
      p.action!({ currentCenter: [0, 0], cameras: [], followTarget: { icao24: 'abc123' } }),
    ).not.toThrow();
    expect(() => p.action!({ currentCenter: [0, 0], cameras: [] })).not.toThrow();
  });
});
