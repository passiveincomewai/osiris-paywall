import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { EXPLORE_SCOPES } from './explore-data';
import { normalizeLaunch } from './launches/normalize';
import type { LaunchRecord } from './launches/types';
import {
  LAUNCH_SITE_GAPS,
  LAUNCH_SITES,
  formatLaunchNet,
  launchSiteBySlug,
  launchesAtSite,
} from './launch-sites';

/**
 * Launch sites — the reconciliation the /launch-sites pages publish
 * by. The one qualifying site's wall yield is recomputed from the
 * raw catalogue chunk (src/data/countries/united-states.json,
 * catalogue generated 2026-10-20) with its own haversine; the pad
 * matcher is pinned against fixtures run through the REAL LL2
 * normalizer (trimmed copies of live Launch Library 2 records, the
 * launches.test.ts convention); and the gap pins keep the family's
 * famous absences true: Starbase, Vandenberg and Wallops were
 * measured and have no qualifying cameras.
 */

const DATA_DIR = join(process.cwd(), 'src', 'data');

interface Rec {
  id?: string;
  lat?: number;
  lng?: number;
  name?: string;
  source?: string;
}

const usChunk = JSON.parse(
  readFileSync(join(DATA_DIR, 'countries', 'united-states.json'), 'utf8'),
) as Rec[];

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const t = (x: number) => (x * Math.PI) / 180;
  const h =
    Math.sin(t(lat2 - lat1) / 2) ** 2 +
    Math.cos(t(lat1)) * Math.cos(t(lat2)) * Math.sin(t(lng2 - lng1) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function rawRadius(lat: number, lng: number, radiusKm: number): Rec[] {
  return usChunk.filter(
    (r) =>
      typeof r.lat === 'number' &&
      typeof r.lng === 'number' &&
      haversineKm(lat, lng, r.lat, r.lng) <= radiusKm,
  );
}

const kennedy = LAUNCH_SITES[0];

/** A trimmed LL2-shaped record at a real pad, run through the real
 *  normalizer — the only honest way to fixture a LaunchRecord. */
function launchAt(pad: { id: number; name: string; latitude: string; longitude: string; location: string }): LaunchRecord {
  const l = normalizeLaunch({
    id: `fixture-${pad.id}`,
    name: 'Fixture | Board Test',
    net: '2026-11-07T23:24:00Z',
    status: { name: 'Go for Launch', abbrev: 'Go' },
    net_precision: { name: 'Minute' },
    launch_service_provider: { name: 'SpaceX', type: 'Commercial' },
    rocket: { configuration: { name: 'Falcon 9', full_name: 'Falcon 9 Block 5', family: 'Falcon' } },
    pad: {
      id: pad.id,
      name: pad.name,
      latitude: pad.latitude,
      longitude: pad.longitude,
      location: { name: pad.location },
    },
  });
  if (!l) throw new Error('fixture failed to normalize');
  return l;
}

describe('launch sites registry ↔ EXPLORE_SCOPES', () => {
  it('has exactly one site, matched to its wall definition', () => {
    expect(LAUNCH_SITES).toHaveLength(1);
    expect(kennedy.slug).toBe('kennedy-space-center');
    const def = EXPLORE_SCOPES[kennedy.scopeKey];
    expect(def).toBeDefined();
    expect(def.slugs).toEqual(['united-states']);
    expect(def.geo).toEqual({ lat: kennedy.lat, lng: kennedy.lng, radiusKm: kennedy.radiusKm });
    expect(launchSiteBySlug('kennedy-space-center')).toBe(kennedy);
    expect(launchSiteBySlug('starbase')).toBeNull();
    expect(kennedy.intro[0].length).toBeGreaterThan(100);
    expect(kennedy.intro[1].length).toBeGreaterThan(100);
    expect(kennedy.faqs.length).toBeGreaterThanOrEqual(2);
    expect(() => new Intl.DateTimeFormat('en-US', { timeZone: kennedy.tz })).not.toThrow();
  });

  it('the hub gap list names the three measured absences', () => {
    expect(LAUNCH_SITE_GAPS).toHaveLength(3);
    expect(LAUNCH_SITE_GAPS.map((g) => g.name)).toEqual([
      'Starbase, Texas',
      'Vandenberg Space Force Base, California',
      'Wallops Flight Facility, Virginia',
    ]);
  });
});

describe("Kennedy & the Cape's wall (raw-chunk recomputation)", () => {
  it('yields 27 cameras, every one an FDOT Space Coast corridor feed', () => {
    const wall = rawRadius(kennedy.lat, kennedy.lng, kennedy.radiusKm);
    expect(wall).toHaveLength(27);
    expect(wall.every((r) => r.source === 'FDOT')).toBe(true);
    const names = wall.map((r) => r.name ?? '');
    expect(names).toContain('SR-405 at US-1');
    expect(names).toContain('SR-528 at MM 54');
    /* The pads are closed federal ground: nothing in the wall is
       nearer than 13 km to its centre. */
    const nearest = Math.min(
      ...wall.map((r) => haversineKm(kennedy.lat, kennedy.lng, r.lat as number, r.lng as number)),
    );
    expect(nearest).toBeGreaterThan(13);
  });
});

describe('the pad matcher', () => {
  it('takes the Kennedy and Cape pads, leaves every other spaceport', () => {
    const lc39a = launchAt({
      id: 87,
      name: 'Launch Complex 39A',
      latitude: '28.6080585',
      longitude: '-80.6039558',
      location: 'Kennedy Space Center, FL, USA',
    });
    const slc40 = launchAt({
      id: 80,
      name: 'Space Launch Complex 40',
      latitude: '28.56194122',
      longitude: '-80.57735736',
      location: 'Cape Canaveral SFS, FL, USA',
    });
    const vandenberg = launchAt({
      id: 16,
      name: 'Space Launch Complex 4E',
      latitude: '34.632',
      longitude: '-120.611',
      location: 'Vandenberg SFB, CA, USA',
    });
    const starbase = launchAt({
      id: 999,
      name: 'Orbital Launch Mount A',
      latitude: '25.997',
      longitude: '-97.155',
      location: 'Starbase, TX, USA',
    });
    const wallops = launchAt({
      id: 998,
      name: 'Launch Area 3A',
      latitude: '37.9402',
      longitude: '-75.4573',
      location: 'Wallops Island, VA, USA',
    });
    const board = launchesAtSite([lc39a, slc40, vandenberg, starbase, wallops], kennedy);
    expect(board.map((l) => l.padName)).toEqual(['Launch Complex 39A', 'Space Launch Complex 40']);
  });

  it('skips records whose pad cannot be placed', () => {
    const noPad = normalizeLaunch({
      id: 'sparse-1',
      name: 'Unknown Rocket | Classified Payload',
      net: null,
      status: { name: 'To Be Determined', abbrev: 'TBD' },
    });
    expect(noPad).not.toBeNull();
    expect(launchesAtSite([noPad as LaunchRecord], kennedy)).toHaveLength(0);
  });
});

describe('NET formatting keeps the source’s precision', () => {
  const tz = 'America/New_York';
  it('a minute-precision NET earns a clock time', () => {
    const s = formatLaunchNet({ net: '2026-11-07T23:24:00Z', netPrecision: 'Minute' }, tz);
    expect(s).toContain('Nov 7');
    expect(s).toContain('6:24 PM');
  });
  it('a day-precision NET is a date, not a time', () => {
    const s = formatLaunchNet({ net: '2026-11-07T23:24:00Z', netPrecision: 'Day' }, tz);
    expect(s).toContain('Nov 7, 2026');
    expect(s).not.toContain('PM');
  });
  it('a month-precision NET is a month, never a countdown', () => {
    const s = formatLaunchNet({ net: '2026-11-07T23:24:00Z', netPrecision: 'Month' }, tz);
    expect(s).toBe('November 2026');
  });
  it('a null NET is an announcement still to come', () => {
    expect(formatLaunchNet({ net: null, netPrecision: null }, tz)).toBe('Date to be announced');
  });
});

describe('the named gaps stay gaps', () => {
  it('Starbase: nothing names it, one highway camera inside 10 km', () => {
    expect(
      usChunk.some((r) => /boca chica|starbase|spacex/i.test(r.name ?? '')),
    ).toBe(false);
    const near = rawRadius(25.9971, -97.1545, 10);
    expect(near).toHaveLength(1);
    expect(near[0].id).toBe('txdot-PHR-PHR PR 100 @ PR 100 (4 corners)');
    expect(rawRadius(25.9971, -97.1545, 12)).toHaveLength(2);
  });

  it('Vandenberg: zero within 10 km, seven within 25 km — none at the base', () => {
    expect(rawRadius(34.632, -120.6107, 10)).toHaveLength(0);
    expect(rawRadius(34.632, -120.6107, 25)).toHaveLength(7);
  });

  it('Wallops: zero within 10 km, one junction camera within 25 km', () => {
    expect(rawRadius(37.9402, -75.4573, 10)).toHaveLength(0);
    const within25 = rawRadius(37.9402, -75.4573, 25);
    expect(within25).toHaveLength(1);
    expect(within25[0].name).toBe('US 13 AT US 113');
  });
});
