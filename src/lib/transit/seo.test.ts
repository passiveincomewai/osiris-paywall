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
  isShuttleRoute,
  isShuttleVariantRoute,
  representativeDays,
  routeIndexDecision,
  routeJsonLd,
  routeSlugBase,
  routesForSeoPages,
  routeTitle,
  slugifySegment,
  stateForAgency,
  stopAnchor,
  terminusDepartures,
  transitPathsForAgency,
  weekdayDailyTrips,
  FLAGSHIP_MIN_WEEKDAY_TRIPS,
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
  attribution: 'Utah Transit Authority', timezone: 'America/Denver',
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

describe('routeTitle', () => {
  // routeTitle reads only short/long off the route (via
  // routeDisplayName); the cast keeps the fixture to those fields.
  const route = (short: string, long: string) =>
    ({ short, long }) as unknown as Parameters<typeof routeTitle>[1];

  it('is agency + route number + route name + the short suffix', () => {
    expect(routeTitle({ name: 'MBTA' }, route('1', 'Harvard Square - Nubian Station'))).toBe(
      'MBTA Route 1 Harvard Square - Nubian Station — Schedule & Stops',
    );
    expect(routeTitle({ name: 'UTA' }, route('701', 'Blue Line'))).toBe(
      'UTA Route 701 Blue Line — Schedule & Stops',
    );
  });

  it('keeps the differentiators that make every title unique', () => {
    // Same route number + name under two agencies (the Puget Sound
    // overlap: King County Metro and Community Transit both run
    // numbered routes out of the same hubs).
    const a = routeTitle({ name: 'King County Metro' }, route('101', 'Renton - Seattle'));
    const b = routeTitle({ name: 'Community Transit' }, route('101', 'Mariner P&R - Aurora Village TC'));
    expect(a).not.toBe(b);
    // Same agency, same number, different name.
    const c = routeTitle({ name: 'MBTA' }, route('1', 'Harvard Square - Nubian Station'));
    const d = routeTitle({ name: 'MBTA' }, route('1', ''));
    expect(c).not.toBe(d);
  });

  it('does not repeat the route number when the name restates it', () => {
    expect(routeTitle({ name: 'RTD' }, route('A', 'A'))).toBe('RTD Route A — Schedule & Stops');
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
  it('reads an embedded ISO-8601 generation date (MBTA)', () => {
    // Live feed_info feed_version: the feed's generation timestamp is
    // stated outright in the string — a real version date that the
    // pre-fix parser missed, leaving all 400 MBTA routes undated.
    expect(feedVersionDate('Fall 2026, 2026-10-27T19:47:13+00:00, version D')?.toISOString()).toBe('2026-10-27T00:00:00.000Z');
    // An invalid ISO-like fragment is not trusted.
    expect(feedVersionDate('feed 2026-13-40 build')).toBeNull();
  });
  it('reads a validity-range version by its start date (Community Transit)', () => {
    // Live feed_info feed_version: feed_start_date 20261002,
    // feed_end_date 20261211. The trailing date is the feed's
    // validity END — the pre-fix parser stamped it as lastmod and
    // future-dated the agency's whole sitemap family.
    expect(feedVersionDate('20261002-20261211')?.toISOString()).toBe('2026-10-02T00:00:00.000Z');
  });
  it('reads a bare epoch-seconds version (Metro Transit MN)', () => {
    // Live feed_info feed_version at audit time; the epoch is the
    // feed build moment, 2026-10-21T15:11:10Z — day precision out.
    expect(feedVersionDate('1792595470')?.toISOString()).toBe('2026-10-21T00:00:00.000Z');
  });
  it('never rolls overflow digits into a fantasy date', () => {
    // The pre-hardening parser turned the epoch's last eight digits
    // ("92595470": year 9259, month 54, day 70) into 9263-08-09 via
    // Date.UTC rollover. Out-of-range components are now rejected.
    expect(feedVersionDate('build 92595470')).toBeNull();
    expect(feedVersionDate('20261340')).toBeNull();
    expect(feedVersionDate('feed-99999999')).toBeNull();
    expect(feedVersionDate('99991231')).toBeNull();
  });
  it('rejects a 10-digit date-like stamp that is not a plausible epoch', () => {
    // "2026100812" read as epoch seconds lands in 2034 — beyond the
    // feed-vintage window — and its tail digits fail validation too.
    expect(feedVersionDate('2026100812')).toBeNull();
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
  it('emits state + agency + indexable routes only (R17) — and NO stop URLs', () => {
    const net = fixtureNet();
    const paths = transitPathsForAgency(UTA_STUB, net, buildRouteSlugs(net.routes));
    // Fixture fleet under the R17 policy: the tram (701), the train
    // (750) and the BRT (830X) stay; the 1-trip buses (2, 9) drop.
    expect(paths.map(p => p.path)).toEqual([
      '/transit/utah',
      '/transit/uta',
      '/transit/uta/routes/701-blue-line',
      '/transit/uta/routes/750-frontrunner',
      '/transit/uta/routes/830x-utah-valley-express-uvx',
    ]);
    expect(paths.every(p => !p.path.includes('/stops/'))).toBe(true);
  });
});

describe('route index policy (R17–R19)', () => {
  it('detects shuttle variants by public name (R18)', () => {
    expect(isShuttleRoute({ short: 'Blue Line Shuttle', long: 'Blue Line Shuttle' })).toBe(true);
    expect(isShuttleRoute({ short: '509', long: '900 W SHUTTLE' })).toBe(true);
    expect(isShuttleRoute({ short: '701', long: 'Blue Line' })).toBe(false);
    expect(isShuttleRoute({ short: '2', long: '200 SOUTH' })).toBe(false);
  });

  it('counts weekday trips across both directions', () => {
    const net = fixtureNet();
    // R701: T1+T2 (dir 0) + T3 (dir 1) on the WKD service.
    expect(weekdayDailyTrips(net, 'R701', TZ, TUE_NOON_UTC)).toBe(3);
    expect(weekdayDailyTrips(net, 'R2', TZ, TUE_NOON_UTC)).toBe(1);
  });

  it('keeps rail + BRT, drops ordinary bus, and drops shuttles however frequent', () => {
    const net = fixtureNet();
    const d = (id: string) => routeIndexDecision(UTA_STUB, net, net.routeById.get(id)!, TZ);
    expect(d('R701')).toEqual({ indexable: true, reason: 'rail' });
    expect(d('R750')).toEqual({ indexable: true, reason: 'rail' });
    expect(d('R830')).toEqual({ indexable: true, reason: 'brt' });
    expect(d('R2')).toEqual({ indexable: false, reason: 'standard' });
    const shuttle = { id: 'SHX', short: 'Blue Line Shuttle', long: 'Blue Line Shuttle', mode: 'bus' as const, color: '' };
    expect(routeIndexDecision(UTA_STUB, net, shuttle, TZ)).toEqual({ indexable: false, reason: 'shuttle' });
  });

  it('keeps a bus route at or above the flagship weekday-trips bar', () => {
    // Synthetic feed: one bus route with exactly FLAGSHIP_MIN_WEEKDAY_TRIPS
    // weekday trips, one with one fewer.
    const mk = (prefix: string, n: number) => {
      const trips: string[] = [];
      const times: string[] = [];
      for (let i = 0; i < n; i++) {
        trips.push(`${prefix},WKD,${prefix}T${i},Outbound,0`);
        times.push(`${prefix}T${i},06:00:00,06:00:00,A,1`, `${prefix}T${i},06:10:00,06:10:00,B,2`);
      }
      return { trips, times };
    };
    const big = mk('RB', FLAGSHIP_MIN_WEEKDAY_TRIPS);
    const small = mk('RS', FLAGSHIP_MIN_WEEKDAY_TRIPS - 1);
    const net = parseNetwork({
      routes: [
        'route_id,route_short_name,route_long_name,route_type,route_color,route_url',
        'RB,B1,BIG BUS,3,,',
        'RS,B2,SMALL BUS,3,,',
      ].join('\n'),
      stops: STOPS,
      trips: ['route_id,service_id,trip_id,trip_headsign,direction_id', ...big.trips, ...small.trips].join('\n'),
      stopTimes: ['trip_id,arrival_time,departure_time,stop_id,stop_sequence', ...big.times, ...small.times].join('\n'),
      calendar: CALENDAR,
      feedInfo: FEED_INFO,
    });
    expect(weekdayDailyTrips(net, 'RB', TZ, TUE_NOON_UTC)).toBe(FLAGSHIP_MIN_WEEKDAY_TRIPS);
    expect(routeIndexDecision(UTA_STUB, net, net.routeById.get('RB')!, TZ))
      .toEqual({ indexable: true, reason: 'flagship' });
    expect(routeIndexDecision(UTA_STUB, net, net.routeById.get('RS')!, TZ))
      .toEqual({ indexable: false, reason: 'standard' });
  });
});

describe('shuttle-variant generation exclusion (R18)', () => {
  // Shapes copied from the live MBTA GTFS (2026-10-31): 400 routes,
  // 216 shuttle routes, every one id-namespaced "Shuttle-…" AND
  // shuttle-named; parent lines carry ordinary ids. This is the
  // GENERATION exclusion (no page at all) — the name-only
  // isShuttleRoute above is the R17 index policy for generated pages.
  const route = (id: string, short: string, long: string) =>
    ({ id, short, long }) as unknown as Parameters<typeof isShuttleVariantRoute>[0];

  it('flags MBTA segment and generic shuttle variants (both signals)', () => {
    expect(isShuttleVariantRoute(route('Shuttle-AshmontJFKUMass', 'Red Line Shuttle', 'Ashmont - JFK/UMass (Shuttle)'))).toBe(true);
    expect(isShuttleVariantRoute(route('Shuttle-Generic-Red', 'Red Line Shuttle', ''))).toBe(true);
    expect(isShuttleVariantRoute(route('Shuttle-Generic', 'Shuttle', ''))).toBe(true);
    // "Airport" here is Airport Station (Blue Line) — a Blue Line
    // replacement variant, not a primary airport service.
    expect(isShuttleVariantRoute(route('Shuttle-AirportWonderland', 'Blue Line Shuttle', 'Airport - Wonderland (Shuttle)'))).toBe(true);
  });

  it('keeps parent lines and primary shuttle identities (one signal is not enough)', () => {
    expect(isShuttleVariantRoute(route('Red', '', 'Red Line'))).toBe(false);
    expect(isShuttleVariantRoute(route('1', '1', 'Harvard Square - Nubian Station'))).toBe(false);
    // A primary airport/community shuttle: shuttle in the NAME but
    // an ordinary route id — a primary identity, not a variant.
    // (It is still generated; R17's isShuttleRoute noindexes it.)
    expect(isShuttleVariantRoute(route('APT', 'APT', 'Downtown - Airport Shuttle'))).toBe(false);
    // Namespaced id whose public name never says shuttle: kept —
    // the rider-facing name is the evidence, not the id alone.
    expect(isShuttleVariantRoute(route('Shuttle-1', '1', 'Downtown Connector'))).toBe(false);
  });

  it('routesForSeoPages drops only the variants; MBTA-shaped set 6 → 4', () => {
    const all = [
      route('Red', '', 'Red Line'),
      route('Green-B', 'B', 'Green Line B'),
      route('Shuttle-Generic-Red', 'Red Line Shuttle', ''),
      route('Shuttle-AshmontJFKUMass', 'Red Line Shuttle', 'Ashmont - JFK/UMass (Shuttle)'),
      route('APT', 'APT', 'Downtown - Airport Shuttle'),
      route('1', '1', 'Harvard Square - Nubian Station'),
    ] as unknown as Parameters<typeof routesForSeoPages>[0];
    const kept = routesForSeoPages(all);
    expect(kept.map(r => r.id)).toEqual(['Red', 'Green-B', 'APT', '1']);
  });

  it('a shuttle-only network keeps its routes (they are its primary service)', () => {
    const all = [
      route('Shuttle-Generic', 'Shuttle', ''),
      route('Shuttle-AirportWonderland', 'Blue Line Shuttle', 'Airport - Wonderland (Shuttle)'),
    ] as unknown as Parameters<typeof routesForSeoPages>[0];
    expect(routesForSeoPages(all)).toEqual(all);
  });

  it('the generation set flows into slugs + sitemap paths (the seo-data wiring)', () => {
    const net = parseNetwork({
      routes: [
        'route_id,route_short_name,route_long_name,route_type,route_color',
        'Red,,Red Line,1,DA291C',
        'Shuttle-Generic-Red,Red Line Shuttle,,3,',
        'Shuttle-AshmontJFKUMass,Red Line Shuttle,Ashmont - JFK/UMass (Shuttle),3,',
        '1,1,Harvard Square - Nubian Station,3,',
      ].join('\n'),
      stops: STOPS, trips: TRIPS, stopTimes: STOP_TIMES, calendar: CALENDAR,
    });
    // Pre-filter the fixture carries both shuttle routes.
    expect(net.routes.map(r => r.id)).toEqual(
      expect.arrayContaining(['Shuttle-Generic-Red', 'Shuttle-AshmontJFKUMass']),
    );
    const pageNet = { ...net, routes: routesForSeoPages(net.routes) };
    expect(pageNet.routes.map(r => r.id).sort()).toEqual(['1', 'Red']);
    const slugs = buildRouteSlugs(pageNet.routes);
    // No slug is ever minted for a shuttle variant — so no static
    // param, no agency-hub link and no route page for one.
    expect([...slugs.keys()].sort()).toEqual(['1', 'Red']);
    const paths = transitPathsForAgency(
      { id: 'mbta', name: 'MBTA', region: 'Boston, MA', attribution: 'MBTA', timezone: 'America/New_York' } as unknown as TransitAgency,
      pageNet, slugs,
    );
    // The sitemap additionally applies the R17 index policy: the
    // Red Line (metro/rail) stays; the 0-trip bus route 1 drops as
    // 'standard'. The invariant here is that no shuttle path exists.
    expect(paths.map(p => p.path)).toEqual([
      '/transit/massachusetts',
      '/transit/mbta',
      '/transit/mbta/routes/red-red-line',
    ]);
    expect(paths.some(p => /shuttle/i.test(p.path))).toBe(false);
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
 * report quotes: 86 routes, 5,425 stops, unique slugs. The sitemap
 * family size was 88 agency paths before 2026-10-31; the R17 index
 * policy now keeps only hubs + indexable routes, so the path count
 * is asserted structurally (2 hubs + the routes routeIndexDecision
 * keeps) with two stable spot checks: the flagship 603X stays, the
 * 134-trip route 2 drops.
 */
const liveIt = process.env.RUN_LIVE_TESTS === '1' ? it : it.skip;
describe('UTA live feed reconciliation', () => {
  liveIt('86 routes / 5,425 stops / unique slugs / R17-filtered agency paths', async () => {
    const net = await networkFor('uta', 'https://gtfsfeed.rideuta.com/GTFS.zip');
    expect(net.routes).toHaveLength(86);
    expect(net.stops).toHaveLength(5425);
    const slugs = buildRouteSlugs(net.routes);
    expect(new Set(slugs.values()).size).toBe(86);
    const paths = transitPathsForAgency(UTA_STUB, net, slugs);
    const kept = net.routes.filter(r => routeIndexDecision(UTA_STUB, net, r, TZ).indexable);
    expect(paths).toHaveLength(2 + kept.length);
    expect(paths.some(p => p.path === '/transit/uta/routes/603x-ogden-express-ogx')).toBe(true);
    expect(paths.some(p => p.path === '/transit/uta/routes/2-200-south')).toBe(false);
  }, 120_000);
});
