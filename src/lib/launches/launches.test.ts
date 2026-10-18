import { describe, expect, it, vi } from 'vitest';
import { normalizeLaunch, normalizeLaunchList, launchPadKey } from './normalize';
import { countdownTo, nextLaunch } from './countdown';
import {
  buildAscentProfile, launchAzimuthDeg, orbitClassFor, positionAt,
  profilePath, replayClockLabel, replayEligible, REPLAY_BANNER,
} from './profile';
import { createLaunchService, UPCOMING_TTL_MS, PREVIOUS_TTL_MS } from './server';
import { spaceMissionPreset } from './preset';
import type { LaunchRecord } from './types';

/**
 * Fixtures are trimmed copies of REAL Launch Library 2 `mode=detailed`
 * records fetched live during the Phase 7 build (Falcon 9 | Bandwagon 5
 * upcoming; Falcon 9 | USSF-481 previous) — same keys, same nesting.
 */
const REAL_UPCOMING = {
  id: '3b430f81-0ff1-4d85-8a1a-cef0de326198',
  name: 'Falcon 9 Block 5 | Bandwagon 5 (Dedicated Mid-Inclination Rideshare)',
  net: '2026-10-19T10:30:00Z',
  window_start: '2026-10-19T10:30:00Z',
  window_end: '2026-10-19T11:30:00Z',
  status: { id: 1, name: 'Go for Launch', abbrev: 'Go', description: 'Current T-0 confirmed.' },
  net_precision: { id: 1, name: 'Minute', abbrev: 'MIN' },
  probability: 55,
  failreason: '',
  holdreason: '',
  webcast_live: false,
  image: 'https://thespacedevs-prod.nyc3.digitaloceanspaces.com/media/images/falcon_9_liftof.jpg',
  last_updated: '2026-10-17T04:12:00Z',
  launch_service_provider: { id: 121, name: 'SpaceX', type: 'Commercial', abbrev: 'SpX' },
  rocket: { configuration: { id: 162, name: 'Falcon 9', full_name: 'Falcon 9 Block 5', family: 'Falcon', variant: 'Block 5' } },
  mission: {
    id: 9001, name: 'Bandwagon 5 (Dedicated Mid-Inclination Rideshare)',
    description: 'Dedicated rideshare flight to a mid-inclination orbit.',
    orbit: { id: 8, name: 'Low Earth Orbit', abbrev: 'LEO' },
  },
  pad: {
    id: 80, name: 'Space Launch Complex 40',
    latitude: '28.56194122', longitude: '-80.57735736',
    location: { id: 12, name: 'Cape Canaveral SFS, FL, USA' },
  },
  program: [],
  vidURLs: [],
};

const REAL_PREVIOUS = {
  id: 'df88cfbf-f504-4e11-8370-e33dd6280b5b',
  name: 'Falcon 9 Block 5 | USSF-481',
  net: '2026-10-16T00:01:05Z',
  status: { id: 3, name: 'Launch Successful', abbrev: 'Success' },
  net_precision: { id: 1, name: 'Minute', abbrev: 'MIN' },
  probability: null,
  webcast_live: false,
  launch_service_provider: { name: 'SpaceX', type: 'Commercial' },
  rocket: { configuration: { name: 'Falcon 9', full_name: 'Falcon 9 Block 5', family: 'Falcon' } },
  mission: { name: 'USSF-481', orbit: { name: 'Polar Orbit', abbrev: 'PO' } },
  pad: { id: 16, name: 'Space Launch Complex 4E', latitude: 34.632, longitude: -120.611, location: { name: 'Vandenberg SFB, CA, USA' } },
  vidURLs: [{ url: 'https://www.youtube.com/watch?v=0rd-mypixIg', source: 'youtube.com' }],
};

const SPARSE = {
  id: 'sparse-1',
  name: 'Unknown Rocket | Classified Payload',
  net: null,
  status: { name: 'To Be Determined', abbrev: 'TBD' },
  // no mission, no pad, no rocket configuration at all
};

describe('normalizeLaunch — real-shaped LL2 payloads', () => {
  it('maps the full upcoming record', () => {
    const l = normalizeLaunch(REAL_UPCOMING);
    expect(l).not.toBeNull();
    expect(l!.missionName).toContain('Bandwagon 5');
    expect(l!.rocketName).toBe('Falcon 9 Block 5');
    expect(l!.rocketFamily).toBe('Falcon');
    expect(l!.providerName).toBe('SpaceX');
    expect(l!.statusName).toBe('Go for Launch');
    expect(l!.net).toBe('2026-10-19T10:30:00.000Z');
    expect(l!.probability).toBe(55);
    expect(l!.padName).toBe('Space Launch Complex 40');
    expect(l!.padLat).toBeCloseTo(28.56194122, 6);
    expect(l!.padLon).toBeCloseTo(-80.57735736, 6);
    expect(l!.padLocation).toBe('Cape Canaveral SFS, FL, USA');
    expect(l!.orbitAbbrev).toBe('LEO');
    expect(l!.failReason).toBeNull(); // empty string is not a reason
  });

  it('maps a previous record with numeric pad coords and an outcome', () => {
    const l = normalizeLaunch(REAL_PREVIOUS);
    expect(l!.padLat).toBeCloseTo(34.632, 3);
    expect(l!.statusAbbrev).toBe('Success');
    expect(l!.videoUrl).toContain('youtube.com');
    expect(l!.probability).toBeNull();
  });

  it('keeps sparse records with honest nulls instead of dropping or inventing', () => {
    const l = normalizeLaunch(SPARSE);
    expect(l).not.toBeNull();
    expect(l!.net).toBeNull();
    expect(l!.padLat).toBeNull();
    expect(l!.orbitName).toBeNull();
    expect(l!.rocketName).toBeNull();
  });

  it('drops junk rows and non-list bodies', () => {
    expect(normalizeLaunch({ name: 'no id' })).toBeNull();
    expect(normalizeLaunch(null)).toBeNull();
    expect(normalizeLaunchList({ results: [REAL_UPCOMING, { bogus: true }, REAL_PREVIOUS] })).toHaveLength(2);
    expect(normalizeLaunchList({})).toEqual([]);
    expect(normalizeLaunchList('nope')).toEqual([]);
  });

  it('pad keys group the same pad across lists', () => {
    const a = normalizeLaunch(REAL_UPCOMING)!;
    expect(launchPadKey(a)).toBe('pad-80');
    expect(launchPadKey(normalizeLaunch(SPARSE)!)).toBeNull();
  });
});

describe('countdownTo', () => {
  const now = Date.parse('2026-10-18T00:00:00Z');
  it('counts down with days', () => {
    const c = countdownTo('2026-10-20T04:13:55Z', 'Minute', now);
    expect(c.sign).toBe('T−');
    expect(c.label).toBe('T−2D 04:13:55');
    expect(c.approximate).toBe(false);
  });
  it('counts up after NET passes', () => {
    const c = countdownTo('2026-10-17T23:00:00Z', 'Minute', now);
    expect(c.sign).toBe('T+');
    expect(c.label).toBe('T+01:00:00');
    expect(c.secondsToNet).toBe(-3600);
  });
  it('flags coarse NET precision as approximate', () => {
    expect(countdownTo('2026-11-01T00:00:00Z', 'Day', now).approximate).toBe(true);
    expect(countdownTo('2026-11-01T00:00:00Z', null, now).approximate).toBe(true);
    expect(countdownTo('2026-11-01T00:00:00Z', 'Hour', now).approximate).toBe(false);
  });
  it('handles a missing NET honestly', () => {
    expect(countdownTo(null, null, now).label).toBe('NET TBD');
  });
  it('nextLaunch picks the earliest countable launch', () => {
    const mk = (net: string | null) => ({ net });
    const list = [mk(null), mk('2026-10-25T00:00:00Z'), mk('2026-10-19T00:00:00Z'), mk('2026-10-01T00:00:00Z')];
    expect(nextLaunch(list, now)!.net).toBe('2026-10-19T00:00:00Z');
    expect(nextLaunch([mk(null)], now)).toBeNull();
  });
});

describe('ascent profile — reconstruction maths + honesty labeling', () => {
  it('banner text is the permanent honesty label', () => {
    expect(REPLAY_BANNER).toBe('RECONSTRUCTED ESTIMATE — NOT LIVE TELEMETRY');
  });

  it('launch azimuths match the textbook cases', () => {
    // Cape (28.56°N) to 51.6° inclination → ~45° (north-east).
    expect(launchAzimuthDeg(51.6, 28.5619)).toBeCloseTo(44.9, 0);
    // SSO (97.4°) from Vandenberg (34.6°N) → ~189° (south, slightly west).
    expect(launchAzimuthDeg(97.4, 34.632)).toBeCloseTo(189.1, 0);
    // Due-east equatorial target from the equator → 90°.
    expect(launchAzimuthDeg(0, 0)).toBeCloseTo(90, 5);
  });

  it('orbit classes resolve from LL2 names, unknown stays unknown', () => {
    expect(orbitClassFor({ orbitName: 'Low Earth Orbit', orbitAbbrev: 'LEO' })?.key).toBe('leo');
    expect(orbitClassFor({ orbitName: 'Sun-Synchronous Orbit', orbitAbbrev: 'SSO' })?.key).toBe('sso');
    expect(orbitClassFor({ orbitName: 'Polar Orbit', orbitAbbrev: 'PO' })?.key).toBe('polar');
    expect(orbitClassFor({ orbitName: 'Geostationary Transfer Orbit', orbitAbbrev: 'GTO' })?.key).toBe('gto');
    expect(orbitClassFor({ orbitName: null, orbitAbbrev: null })).toBeNull();
  });

  const profileOf = (raw: unknown) => buildAscentProfile(normalizeLaunch(raw)!);

  it('profile: countdown sits on the pad, ascent climbs monotonically to the nominal ceiling', () => {
    const p = profileOf(REAL_UPCOMING)!;
    expect(p).not.toBeNull();
    const c = positionAt(p, -5);
    expect(c.phase).toBe('countdown');
    expect(c.altitudeKm).toBe(0);
    expect(c.lat).toBeCloseTo(28.56194122, 6);
    let lastAlt = -1;
    for (let t = 0; t <= p.orbit.durationS; t += 20) {
      const pos = positionAt(p, t);
      expect(pos.altitudeKm).toBeGreaterThanOrEqual(lastAlt);
      lastAlt = pos.altitudeKm;
    }
    const top = positionAt(p, p.orbit.durationS);
    expect(top.altitudeKm).toBeCloseTo(p.orbit.altitudeKm, 6);
    expect(top.phase).toBe('insertion');
    expect(top.downrangeKm).toBeCloseTo(p.orbit.downrangeKm, 6);
    // Downrange of the Cape heading north-east: lat up, lon east of the pad.
    expect(top.lat).toBeGreaterThan(p.padLat);
    expect(top.lon).toBeGreaterThan(p.padLon);
  });

  it('path samples start at the pad and end at insertion', () => {
    const p = profileOf(REAL_PREVIOUS)!; // Polar from Vandenberg
    const path = profilePath(p, 10);
    expect(path.length).toBeGreaterThan(10);
    expect(path[0][0]).toBeCloseTo(-120.611, 3);
    expect(path[0][1]).toBeCloseTo(34.632, 3);
    // Polar azimuth from Vandenberg heads south: latitude decreases.
    expect(path[path.length - 1][1]).toBeLessThan(34.632);
  });

  it('eligibility requires pad + NET + a known orbit class', () => {
    expect(replayEligible(normalizeLaunch(REAL_UPCOMING)!)).toBe(true);
    expect(replayEligible(normalizeLaunch(SPARSE)!)).toBe(false);
    const noOrbit = { ...REAL_UPCOMING, mission: { name: 'X' } };
    expect(replayEligible(normalizeLaunch(noOrbit)!)).toBe(false);
  });

  it('replay clock labels', () => {
    expect(replayClockLabel(-7)).toBe('T−00:07');
    expect(replayClockLabel(0)).toBe('T+00:00');
    expect(replayClockLabel(222)).toBe('T+03:42');
  });
});

describe('launch service — quota discipline + stale-on-error', () => {
  const listJson = (results: unknown[]) => ({ count: results.length, results });
  const t0 = Date.parse('2026-10-18T00:00:00Z');

  function harness(failAt: (call: number) => boolean = () => false) {
    let nowMs = t0;
    let calls = 0;
    const svc = createLaunchService({
      now: () => nowMs,
      fetchJson: vi.fn(async (url: string) => {
        calls++;
        if (failAt(calls)) throw new Error('upstream down');
        return url.includes('upcoming') ? listJson([REAL_UPCOMING]) : listJson([REAL_PREVIOUS]);
      }),
    });
    return { svc, advance: (ms: number) => { nowMs += ms; }, calls: () => calls };
  }

  it('one upstream call per section, then cache serves', async () => {
    const h = harness();
    const a = await h.svc.getLaunches();
    expect(a.upcoming).toHaveLength(1);
    expect(a.previous).toHaveLength(1);
    expect(a.stale).toBe(false);
    expect(h.calls()).toBe(2);
    await h.svc.getLaunches();
    await h.svc.getLaunches();
    expect(h.calls()).toBe(2); // clients can never burn the quota
  });

  it('refreshes upcoming at 15 min and previous at 60 min — worst case ~5 calls/hour vs the 15/hour cap', async () => {
    const h = harness();
    await h.svc.getLaunches();
    h.advance(UPCOMING_TTL_MS + 1000);
    await h.svc.getLaunches();
    expect(h.calls()).toBe(3); // upcoming only
    h.advance(PREVIOUS_TTL_MS);
    await h.svc.getLaunches();
    expect(h.calls()).toBe(5); // both
  });

  it('serves last-good marked stale when a refresh fails', async () => {
    const h = harness((call) => call > 2);
    await h.svc.getLaunches();
    h.advance(UPCOMING_TTL_MS + 1000);
    const b = await h.svc.getLaunches();
    expect(b.upcoming).toHaveLength(1);
    expect(b.stale).toBe(true);
  });

  it('cold cache + dead upstream is an error, not an empty success', async () => {
    const h = harness(() => true);
    await expect(h.svc.getLaunches()).rejects.toThrow();
  });
});

describe('space mission preset', () => {
  it('builds a pad scene only when a target exists', () => {
    const preset = spaceMissionPreset();
    const ctx = { currentCenter: [0, 20] as [number, number], cameras: [] };
    expect(preset.build(ctx)).toBeNull();
    const scene = preset.build({ ...ctx, spaceTarget: { name: 'Bandwagon 5', padName: 'SLC-40', lat: 28.56, lon: -80.58 } });
    expect(scene).not.toBeNull();
    expect(scene!.keyframes[scene!.keyframes.length - 1].center).toEqual([-80.58, 28.56]);
    expect(preset.unavailableNote).toBeTruthy();
  });
});
