import { describe, expect, it } from 'vitest';
import {
  SKY_COPY,
  compass16,
  countTrackedObjects,
  countdownClock,
  fmtCount,
  fmtLatLng,
  relativeAgo,
  shapeLaunches,
  shapeQuakes,
  shapeStations,
  shapeStorms,
  type SkyLaunches,
} from './sky-today';
import { countdownTo } from './launches/countdown';
import type { LaunchRecord } from './launches/types';
import type { SatelliteRow } from './satellite-payload';

const NOW = Date.parse('2026-10-20T12:00:00Z');
const H = 3_600_000;
const iso = (ms: number) => new Date(ms).toISOString();

function launch(partial: Partial<LaunchRecord>): LaunchRecord {
  return {
    id: 'id-1',
    name: 'Falcon 9 Block 5 | Starlink Group 10-1',
    missionName: 'Starlink Group 10-1',
    missionDescription: null,
    rocketName: 'Falcon 9 Block 5',
    rocketFamily: 'Falcon',
    providerName: 'SpaceX',
    providerType: 'Commercial',
    statusName: 'Go for Launch',
    statusAbbrev: 'Go',
    net: iso(NOW + 2 * H),
    windowStart: null,
    windowEnd: null,
    netPrecision: 'Minute',
    probability: 90,
    padId: 80,
    padName: 'SLC-40',
    padLat: 28.5619,
    padLon: -80.5774,
    padLocation: 'Cape Canaveral SFS, FL, USA',
    orbitName: 'Low Earth Orbit',
    orbitAbbrev: 'LEO',
    programs: [],
    imageUrl: null,
    webcastLive: false,
    videoUrl: null,
    failReason: null,
    holdReason: null,
    lastUpdated: null,
    ...partial,
  };
}

function okLaunches(r: SkyLaunches) {
  if (r.kind !== 'ok') throw new Error('expected ok launches');
  return r;
}

describe('shapeLaunches', () => {
  it('picks the next launch and carries its pad for the fly-to', () => {
    const later = launch({ id: 'later', net: iso(NOW + 9 * H) });
    const sooner = launch({ id: 'sooner', net: iso(NOW + 2 * H) });
    const r = okLaunches(shapeLaunches({ upcoming: [later, sooner], previous: [] }, NOW));
    expect(r.next?.id).toBe('sooner');
    expect(r.next?.lat).toBeCloseTo(28.5619);
    expect(r.next?.lng).toBeCloseTo(-80.5774);
    expect(r.next?.detail).toBe('Falcon 9 Block 5 · SpaceX');
    expect(r.next?.place).toBe('Cape Canaveral SFS, FL, USA');
    expect(r.next?.countdown.approximate).toBe(false);
    expect(r.next?.countdown.label.startsWith('T−')).toBe(true);
  });

  it('keeps day-precision NETs honest: approximate, precision shown', () => {
    const fuzzy = launch({ id: 'fuzzy', net: iso(NOW + 30 * H), netPrecision: 'Day' });
    const r = okLaunches(shapeLaunches({ upcoming: [fuzzy], previous: [] }, NOW));
    expect(r.next?.countdown.approximate).toBe(true);
    expect(r.next?.netPrecision).toBe('Day');
  });

  it('lists further launches inside 24h only, capped at two', () => {
    const next = launch({ id: 'next', net: iso(NOW + 1 * H) });
    const a = launch({ id: 'a', net: iso(NOW + 5 * H) });
    const b = launch({ id: 'b', net: iso(NOW + 10 * H) });
    const c = launch({ id: 'c', net: iso(NOW + 20 * H) });
    const far = launch({ id: 'far', net: iso(NOW + 30 * H) });
    const r = okLaunches(shapeLaunches({ upcoming: [next, a, b, c, far], previous: [] }, NOW));
    expect(r.more.map((m) => m.id)).toEqual(['a', 'b']);
  });

  it('surfaces a liftoff from the last 12 hours as recent, with its outcome', () => {
    const flown = launch({
      id: 'flown',
      net: iso(NOW - 3 * H),
      statusName: 'Launch Successful',
      statusAbbrev: 'Success',
    });
    const older = launch({ id: 'older', net: iso(NOW - 20 * H), statusAbbrev: 'Success', statusName: 'Launch Successful' });
    const r = okLaunches(shapeLaunches({ upcoming: [], previous: [older, flown] }, NOW));
    expect(r.recent?.id).toBe('flown');
    expect(r.recent?.statusKind).toBe('success');
    expect(r.next).toBeNull();
  });

  it('reads the route error body as unavailable, never as "no launches"', () => {
    const r = shapeLaunches(
      {
        upcoming: [],
        previous: [],
        source: 'Launch Library 2 · The Space Devs',
        error: 'Launch data unavailable — Launch Library 2 did not answer and no cached copy exists yet.',
      },
      NOW,
    );
    expect(r.kind).toBe('error');
  });

  it('handles empty and malformed payloads', () => {
    const empty = okLaunches(shapeLaunches({ upcoming: [], previous: [] }, NOW));
    expect(empty.next).toBeNull();
    expect(empty.more).toEqual([]);
    expect(empty.recent).toBeNull();
    expect(shapeLaunches(null, NOW).kind).toBe('error');
    expect(shapeLaunches('junk', NOW).kind).toBe('error');
    const mixed = okLaunches(
      shapeLaunches({ upcoming: [null, 42, { name: 'no id' }, launch({ id: 'real' })], previous: 'x' }, NOW),
    );
    expect(mixed.next?.id).toBe('real');
  });

  it('passes the stale flag and webcast-live through untouched', () => {
    const live = launch({ id: 'live', webcastLive: true });
    const r = okLaunches(shapeLaunches({ upcoming: [live], previous: [], stale: true }, NOW));
    expect(r.stale).toBe(true);
    expect(r.next?.webcastLive).toBe(true);
  });
});

function sat(partial: Partial<SatelliteRow>): SatelliteRow {
  return {
    name: 'STARLINK-1008',
    lat: 10,
    lng: 20,
    alt: 550,
    mission: 'Commercial Comms',
    color: '#00E676',
    category: 'communications',
    noradId: '44242',
    ...partial,
  };
}

describe('shapeStations', () => {
  it('finds the ISS and CSS by NORAD id among the full catalogue', () => {
    const rows = [
      sat({}),
      sat({ name: 'ISS (ZARYA)', noradId: '25544', mission: 'Space Station', lat: 12.3456, lng: -45.6789, alt: 418, category: 'science' }),
      sat({ name: 'CSS (TIANHE)', noradId: '48274', mission: 'Space Station', lat: -20.5, lng: 130.25, alt: 390, category: 'science' }),
    ];
    const out = shapeStations(rows);
    expect(out.map((s) => s.noradId)).toEqual(['25544', '48274']);
    expect(out[0].name).toBe('ISS (ZARYA)');
    expect(out[0].altKm).toBe(418);
  });

  it('falls back to TLE names when ids are missing, and tolerates absence', () => {
    const rows = [sat({ name: 'ISS (ZARYA)', noradId: '' }), sat({ name: 'TIANHE-1', noradId: '' })];
    expect(shapeStations(rows)).toHaveLength(2);
    expect(shapeStations([sat({})])).toEqual([]);
    expect(shapeStations(undefined)).toEqual([]);
    expect(shapeStations(null)).toEqual([]);
  });

  it('skips stations with unusable positions', () => {
    const rows = [sat({ name: 'ISS (ZARYA)', noradId: '25544', lat: Number.NaN })];
    expect(shapeStations(rows)).toEqual([]);
  });
});

describe('shapeStorms', () => {
  const payload = {
    source: 'NOAA NHC',
    count: 2,
    storms: [
      { stormId: 'al092026', name: 'Nadine', classification: 'TS', intensityKt: 45, pressureMb: 1002, movementDir: 45, movementSpeedKt: 10, lastUpdate: '2026-10-20T12:00:00Z' },
      { stormId: 'al082026', name: 'Milton', classification: 'HU', intensityKt: 85, pressureMb: 970, movementDir: 270, movementSpeedKt: 0, lastUpdate: '2026-10-20T12:00:00Z' },
    ],
    features: [
      { type: 'Feature', geometry: { type: 'Point', coordinates: [-75.5, 28.1] }, properties: { kind: 'current', stormId: 'al092026', name: 'Nadine' } },
      { type: 'Feature', geometry: { type: 'Polygon', coordinates: [] }, properties: { kind: 'cone', name: 'Milton' } },
    ],
  };

  it('joins storms to their current-position features, strongest first', () => {
    const rows = shapeStorms(payload);
    expect(rows.map((r) => r.name)).toEqual(['Milton', 'Nadine']);
    expect(rows[1].lat).toBeCloseTo(28.1);
    expect(rows[1].lng).toBeCloseTo(-75.5);
    // Milton's only feature is a cone — no position to fly to.
    expect(rows[0].lat).toBeNull();
  });

  it('spells out classifications and converts winds and motion honestly', () => {
    const rows = shapeStorms(payload);
    const nadine = rows.find((r) => r.name === 'Nadine');
    expect(nadine?.classification).toBe('TS');
    expect(nadine?.classificationLabel).toBe('Tropical Storm');
    expect(nadine?.intensityKt).toBe(45);
    expect(nadine?.intensityMph).toBe(52);
    expect(nadine?.movementLabel).toBe('NE AT 10 KT');
    const milton = rows.find((r) => r.name === 'Milton');
    expect(milton?.classificationLabel).toBe('Hurricane');
    expect(milton?.movementLabel).toBe('STATIONARY');
  });

  it('is empty for quiet weather and junk', () => {
    expect(shapeStorms({ features: [], storms: [], count: 0, source: 'NOAA NHC' })).toEqual([]);
    expect(shapeStorms(null)).toEqual([]);
    expect(shapeStorms({ storms: [{ name: 42 }] })).toEqual([]);
  });
});

describe('shapeQuakes', () => {
  const feed = [
    { id: 'a', magnitude: 3.1, place: '10km S of Alpha', time: NOW - 2 * H, lat: 35, lng: -118 },
    { id: 'b', magnitude: 5.6, place: 'Beta Ridge', time: NOW - 5 * H, lat: -20, lng: -70 },
    { id: 'c', magnitude: 4.5, place: 'Gamma Coast', time: NOW - 1 * H, lat: 0, lng: 100 },
    { id: 'stale', magnitude: 7.0, place: 'Yesterday', time: NOW - 30 * H, lat: 0, lng: 0 },
    { id: 'junk', magnitude: null, place: 'Nowhere', time: NOW, lat: 0, lng: 0 },
  ];

  it('picks the strongest quake inside the 24h window and counts honestly', () => {
    const s = shapeQuakes(feed, NOW);
    expect(s.strongest?.id).toBe('b');
    expect(s.strongest?.magnitude).toBe(5.6);
    expect(s.count).toBe(3);
    expect(s.strongCount).toBe(2);
  });

  it('is empty for an empty or missing feed', () => {
    expect(shapeQuakes([], NOW)).toEqual({ strongest: null, count: 0, strongCount: 0 });
    expect(shapeQuakes(undefined, NOW).strongest).toBeNull();
  });
});

describe('countdownClock', () => {
  it('ticks to the shaped next launch’s NET, split into H:M:S parts', () => {
    const next = launch({ id: 'next', net: iso(NOW + 2 * H + 61_000) });
    const r = okLaunches(shapeLaunches({ upcoming: [next], previous: [] }, NOW));
    expect(r.next?.id).toBe('next');
    expect(countdownClock(r.next!.countdown)).toEqual({
      sign: 'T−', days: 0, hours: 2, minutes: 1, seconds: 1,
    });
  });

  it('carries whole days separately from the H:M:S digits', () => {
    const clock = countdownClock(countdownTo(iso(NOW + 50 * H + 120_000), 'Minute', NOW));
    expect(clock).toEqual({ sign: 'T−', days: 2, hours: 2, minutes: 2, seconds: 0 });
  });

  it('keeps ticking as T+ for the first hour after NET', () => {
    const clock = countdownClock(countdownTo(iso(NOW - 7 * 60_000), 'Minute', NOW));
    expect(clock).toEqual({ sign: 'T+', days: 0, hours: 0, minutes: 7, seconds: 0 });
  });

  it('refuses approximate NETs and missing NETs — no fake ticking seconds', () => {
    const fuzzy = launch({ id: 'fuzzy', net: iso(NOW + 30 * H), netPrecision: 'Day' });
    const r = okLaunches(shapeLaunches({ upcoming: [fuzzy], previous: [] }, NOW));
    expect(countdownClock(r.next!.countdown)).toBeNull();
    expect(countdownClock(countdownTo(null, null, NOW))).toBeNull();
  });
});

describe('countTrackedObjects + fmtCount', () => {
  it('counts the loaded payload rows — the route total is the row count', () => {
    expect(countTrackedObjects([sat({}), sat({}), sat({})])).toBe(3);
    expect(countTrackedObjects([])).toBe(0);
  });

  it('is null (a dash, never a guess) until the payload loads', () => {
    expect(countTrackedObjects(null)).toBeNull();
    expect(countTrackedObjects(undefined)).toBeNull();
    expect(fmtCount(null)).toBe('——');
  });

  it('groups thousands for the stat cards', () => {
    expect(fmtCount(19204)).toBe('19,204');
    expect(fmtCount(0)).toBe('0');
    expect(fmtCount(7)).toBe('7');
  });
});

describe('formatting + copy', () => {
  it('formats sub-satellite points with hemispheres', () => {
    expect(fmtLatLng(12.3456, -45.6789)).toBe('12.35° N · 45.68° W');
    expect(fmtLatLng(-20.5, 130.25)).toBe('20.50° S · 130.25° E');
  });

  it('compass16 wraps and rounds', () => {
    expect(compass16(0)).toBe('N');
    expect(compass16(45)).toBe('NE');
    expect(compass16(271)).toBe('W');
    expect(compass16(360)).toBe('N');
    expect(compass16(-10)).toBe('N');
  });

  it('relativeAgo buckets', () => {
    expect(relativeAgo(NOW - 30_000, NOW)).toBe('JUST NOW');
    expect(relativeAgo(NOW - 12 * 60_000, NOW)).toBe('12M AGO');
    expect(relativeAgo(NOW - 3 * H, NOW)).toBe('3H AGO');
    expect(relativeAgo(NOW - 49 * H, NOW)).toBe('2D AGO');
  });

  it('pins the honest empty-state copy', () => {
    expect(SKY_COPY.title).toBe('TODAY IN THE SKY');
    expect(SKY_COPY.launchesEmpty).toBe('No launches scheduled today');
    expect(SKY_COPY.stormsEmpty).toBe('No active tropical storms');
    expect(SKY_COPY.launchesError).toBe('Launch data unavailable');
  });
});
