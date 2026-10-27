import { describe, it, expect } from 'vitest';
import { parseNetwork, zonedMidnightMs, type TransitNetwork } from './network';
import type { TransitAgency } from './agencies';
import {
  buildRouteSlugs,
  directionStopTimes,
  displayRouteLong,
  feedVersionDate,
  formatGtfsClock,
  groupRoutes,
  representativeDays,
  routeJsonLd,
  routeSlugBase,
  slugifySegment,
  stateForAgency,
  stopAnchor,
  terminusDepartures,
  transitPathsForAgency,
} from './seo';
import { networkFor } from './network';

const TZ = 'America/Denver';
// 2026-10-20 is a Tuesday; 2026-10-24 a Saturday; 2026-10-25 a Sunday.
const TUE = '20261020';
const TUE_NOON_UTC = Date.UTC(2026, 9, 20, 18, 0, 0);

const ROUTES = [
  'route_id,route_short_name,route_long_name,route_type,route_color,route_url',
  'R701,701,Blue Line,0,004A97,',
  'R2,2,200 SOUTH,3,,',
  'R750,750,FrontRunner,2,,',
  'R830,830X,UTAH VALLEY EXPRESS (UVX),3,,',
  'R9A,9,900 EAST,3,,',
  'R9B,9,900 EAST,3,,',
].join('\n');

const STOPS = [
  'stop_id,stop_code,stop_name,stop_lat,stop_lon',
  'A,1001,Alpha Station,40.0000,-111.0000',
  'B,1002,Beta Station,40.0100,-111.0000',
  'C,1003,Gamma Station,40.0200,-111.0050',
  'D,1004,Delta Station,40.0300,-111.0100',
].join('\n');

const CALENDAR = [
  'service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday,start_date,end_date',
  'WKD,1,1,1,1,1,0,0,20260101,20261231',
  'SAT,0,0,0,0,0,1,0,20260101,20261231',
  'SUN,0,0,0,0,0,0,1,20260101,20261231',
].join('\n');

const TRIPS = [
  'route_id,service_id,trip_id,trip_headsign,direction_id',
  'R701,WKD,T1,Southbound,0',
  'R701,WKD,T2,Southbound,0',
  'R701,WKD,T3,Northbound,1',
  'R701,SAT,T4,Southbound,0',
  'R2,WKD,T5,Eastbound,0',
  'R750,WKD,T6,Ogden,0',
  'R830,WKD,T7,Provo,0',
  'R9A,WKD,T8,East,0',
  'R9B,WKD,T9,West,0',
].join('\n');

const STOP_TIMES = [
  'trip_id,arrival_time,departure_time,stop_id,stop_sequence',
  'T1,06:00:00,06:00:00,A,1', 'T1,06:10:00,06:10:00,B,2', 'T1,06:20:00,06:20:00,C,3',
  'T2,07:00:00,07:00:00,A,1', 'T2,07:10:00,07:10:00,B,2', 'T2,07:20:00,07:20:00,C,3',
  'T3,08:00:00,08:00:00,C,1', 'T3,08:10:00,08:10:00,B,2', 'T3,08:20:00,08:20:00,A,3',
  'T4,09:00:00,09:00:00,A,1', 'T4,09:10:00,09:10:00,B,2', 'T4,09:20:00,09:20:00,C,3',
  'T5,05:30:00,05:30:00,B,1', 'T5,05:45:00,05:45:00,D,2',
  'T6,06:30:00,06:30:00,A,1', 'T6,07:30:00,07:30:00,D,2',
  'T7,06:15:00,06:15:00,B,1', 'T7,06:45:00,06:45:00,C,2',
  'T8,07:15:00,07:15:00,A,1', 'T8,07:25:00,07:25:00,B,2',
  'T9,07:15:00,07:15:00,C,1', 'T9,07:25:00,07:25:00,D,2',
].join('\n');

const FEED_INFO = [
  'feed_publisher_name,feed_version',
  'Fixture Transit,2026 AUG_20261008',
].join('\n');

function fixtureNet(): TransitNetwork {
  return parseNetwork({
    routes: ROUTES, stops: STOPS, trips: TRIPS, stopTimes: STOP_TIMES,
    calendar: CALENDAR, feedInfo: FEED_INFO,
  });
}

const UTA_STUB = {
  id: 'uta', name: 'UTA', region: 'Salt Lake City, UT',
  attribution: 'Utah Transit Authority',
} as unknown as TransitAgency;

describe('slugifySegment', () => {
  it('lowercases and dashes non-alphanumerics', () => {
    expect(slugifySegment('Blue Line')).toBe('blue-line');
    expect(slugifySegment('900 EAST')).toBe('900-east');
    expect(slugifySegment('  --Weird!! Name-- ')).toBe('weird-name');
  });
});

describe('route slugs', () => {
  it('builds short+long bases', () => {
    const net = fixtureNet();
    expect(routeSlugBase(net.routeById.get('R701')!)).toBe('701-blue-line');
    expect(routeSlugBase(net.routeById.get('R2')!)).toBe('2-200-south');
    expect(routeSlugBase(net.routeById.get('R830')!)).toBe('830x-utah-valley-express-uvx');
  });

  it('is unique across the network, suffixing collisions with the route id', () => {
    const net = fixtureNet();
    const slugs = buildRouteSlugs(net.routes);
    const values = [...slugs.values()];
    expect(new Set(values).size).toBe(values.length);
    // R9A / R9B share short+long — both get disambiguated, deterministically.
    expect(slugs.get('R9A')).toBe('9-900-east-r9a');
    expect(slugs.get('R9B')).toBe('9-900-east-r9b');
    const again = buildRouteSlugs(net.routes);
    expect([...again.entries()]).toEqual([...slugs.entries()]);
  });

  it('stop anchors are stable', () => {
    expect(stopAnchor('123456')).toBe('stop-123456');
  });
});

describe('displayRouteLong', () => {
  it('title-cases shouted bus names, keeps brands', () => {
    expect(displayRouteLong('200 SOUTH')).toBe('200 South');
    expect(displayRouteLong('UTAH VALLEY EXPRESS (UVX)')).toBe('Utah Valley Express (UVX)');
    expect(displayRouteLong('FRONTRUNNER')).toBe('FrontRunner');
  });
  it('leaves mixed-case feed styling untouched', () => {
    expect(displayRouteLong('Blue Line')).toBe('Blue Line');
    expect(displayRouteLong('S-Line')).toBe('S-Line');
  });
});

describe('stateForAgency', () => {
  it('parses US regions', () => {
    expect(stateForAgency({ region: 'Salt Lake City, UT' })).toEqual({
      code: 'UT', name: 'Utah', slug: 'utah',
    });
  });
  it('returns null for non-US regions', () => {
    expect(stateForAgency({ region: 'Netherlands' })).toBeNull();
    expect(stateForAgency({ region: 'Norway' })).toBeNull();
  });
});

describe('feedVersionDate', () => {
  it('prefers the trailing publication date', () => {
    expect(feedVersionDate('2026 AUG_20261008')?.toISOString()).toBe('2026-10-08T00:00:00.000Z');
  });
  it('falls back to the leading year-month', () => {
    expect(feedVersionDate('2026 AUG')?.toISOString()).toBe('2026-08-01T00:00:00.000Z');
  });
  it('is null for junk', () => {
    expect(feedVersionDate('v12')).toBeNull();
    expect(feedVersionDate(undefined)).toBeNull();
  });
});

describe('formatGtfsClock', () => {
  it('formats service-day seconds incl. past-midnight trips', () => {
    expect(formatGtfsClock(5 * 3600 + 42 * 60)).toEqual({ label: '5:42 AM', nextDay: false });
    expect(formatGtfsClock(25 * 3600 + 600)).toEqual({ label: '1:10 AM', nextDay: true });
    expect(formatGtfsClock(12 * 3600)).toEqual({ label: '12:00 PM', nextDay: false });
  });
});

describe('schedule shapes', () => {
  it('representativeDays finds weekday + Saturday, omits serviceless Sunday', () => {
    const net = fixtureNet();
    const days = representativeDays(net, 'R701', TZ, TUE_NOON_UTC);
    expect(days.map(d => d.kind)).toEqual(['weekday', 'saturday']);
    expect(days[0].ymd).toBe(TUE);
    expect(days[1].ymd).toBe('20261024');
    const wd = days[0].directions.find(d => d.dir === 0)!;
    expect(wd.trips).toBe(2);
    expect(wd.headwayMin).toBe(60);
    const bus = representativeDays(net, 'R2', TZ, TUE_NOON_UTC);
    expect(bus.map(d => d.kind)).toEqual(['weekday']);
  });

  it('directionStopTimes gives per-stop first/last for the day', () => {
    const net = fixtureNet();
    const times = directionStopTimes(net, 'R701', 0, TUE);
    expect(times.get('A')).toEqual({ firstSec: 21600, lastSec: 25200, calls: 2 });
    expect(times.get('B')).toEqual({ firstSec: 22200, lastSec: 25800, calls: 2 });
  });

  it('terminusDepartures returns sorted epoch ms from the first stop', () => {
    const net = fixtureNet();
    const base = zonedMidnightMs(TUE, TZ);
    expect(terminusDepartures(net, 'R701', 0, TUE, TZ)).toEqual([
      base + 21600_000, base + 25200_000,
    ]);
  });
});

describe('groupRoutes', () => {
  it('groups UTA rail, FrontRunner, BRT and bus with agency labels', () => {
    const net = fixtureNet();
    const groups = groupRoutes(UTA_STUB, net.routes);
    const byLabel = new Map(groups.map(g => [g.label, g.routes.map(r => r.short)]));
    expect(byLabel.get('TRAX & S-Line')).toEqual(['701']);
    expect(byLabel.get('FrontRunner')).toEqual(['750']);
    expect(byLabel.get('Bus Rapid Transit')).toEqual(['830X']);
    expect(byLabel.get('Bus')).toEqual(expect.arrayContaining(['2', '9']));
  });
});

describe('transitPathsForAgency', () => {
  it('emits state + agency + one path per route — and NO stop URLs', () => {
    const net = fixtureNet();
    const paths = transitPathsForAgency(UTA_STUB, net, buildRouteSlugs(net.routes));
    expect(paths).toHaveLength(net.routes.length + 2);
    expect(paths[0].path).toBe('/transit/utah');
    expect(paths[1].path).toBe('/transit/uta');
    expect(paths.some(p => p.path === '/transit/uta/routes/701-blue-line')).toBe(true);
    expect(paths.every(p => !p.path.includes('/stops/'))).toBe(true);
  });
});

describe('routeJsonLd', () => {
  it('has BusRoute + breadcrumbs + FAQ in a valid @graph shape', () => {
    const net = fixtureNet();
    const route = net.routeById.get('R701')!;
    const ld = routeJsonLd({
      agency: UTA_STUB, route, slug: '701-blue-line',
      description: 'desc', faqs: [{ q: 'Q?', a: 'A.' }],
    }) as any;
    const types = ld['@graph'].map((g: any) => g['@type']);
    expect(types).toEqual(['BusRoute', 'BreadcrumbList', 'FAQPage']);
    const bus = ld['@graph'][0];
    expect(bus.name).toBe('UTA Route 701 Blue Line');
    expect(bus.url).toBe('https://worldeye.app/transit/uta/routes/701-blue-line');
    const crumbs = ld['@graph'][1].itemListElement;
    expect(crumbs).toHaveLength(5);
    expect(crumbs[4].item).toBe(bus.url);
    expect(ld['@graph'][2].mainEntity).toHaveLength(1);
  });
});

/**
 * Live reconciliation against the real UTA feed — opt in with
 * RUN_LIVE_TESTS=1 (npm run test:live). Pins the counts the SEO
 * report quotes: 86 routes, 5,425 stops, unique slugs, and the
 * sitemap family size (88 agency paths + the /transit hub = 89).
 */
const liveIt = process.env.RUN_LIVE_TESTS === '1' ? it : it.skip;
describe('UTA live feed reconciliation', () => {
  liveIt('86 routes / 5,425 stops / unique slugs / 88 agency paths', async () => {
    const net = await networkFor('uta', 'https://gtfsfeed.rideuta.com/GTFS.zip');
    expect(net.routes).toHaveLength(86);
    expect(net.stops).toHaveLength(5425);
    const slugs = buildRouteSlugs(net.routes);
    expect(new Set(slugs.values()).size).toBe(86);
    const paths = transitPathsForAgency(UTA_STUB, net, slugs);
    expect(paths).toHaveLength(88);
  }, 120_000);
});
