import { describe, it, expect } from 'vitest';
import {
  parseNetwork, parseGtfsTime, thinLine, activeServiceIds, departuresForStop,
  routeDaySummary, ymdInZone, zonedMidnightMs, type TransitNetwork,
} from './network';

const TZ = 'America/Denver';
// 2026-10-20 is a Tuesday; 2026-10-24 a Saturday (sandbox calendar).
const TUE = '20261020';
const SAT = '20261024';

const ROUTES = [
  'route_id,route_short_name,route_long_name,route_type,route_color,route_url',
  'R1,701,Blue Line,0,0076BC,https://example.test/701',
  'R2,2,200 SOUTH,3,,',
].join('\n');

// Two points ~4 m apart (thinning fodder), then a long leg.
const SHAPES = [
  'shape_id,shape_pt_lat,shape_pt_lon,shape_pt_sequence',
  'S1,40.0000,-111.0000,1',
  'S1,40.00004,-111.0000,2',
  'S1,40.0100,-111.0000,3',
  'S1,40.0200,-111.0050,4',
].join('\n');

const STOPS = [
  'stop_id,stop_code,stop_name,stop_lat,stop_lon',
  'A,1001,Alpha Station,40.0000,-111.0000',
  'B,,Beta Station,40.0100,-111.0000',
  'C,,Gamma Station,40.0200,-111.0050',
  'D,,Delta Stop,40.0300,-111.0100',
].join('\n');

const TRIPS = [
  'route_id,service_id,trip_id,trip_headsign,direction_id,shape_id',
  'R1,WKD,T1,Downtown,0,S1',
  'R1,WKD,T2,Downtown,0,S1',
  'R1,WKD,T6,Downtown,0,S1',
  'R1,WKD,T3,University,1,S1',
  'R1,WKD,T5,Downtown,0,S1',
  'R2,SAT,T4,Loop,0,',
].join('\n');

const STOP_TIMES = [
  'trip_id,arrival_time,departure_time,stop_id,stop_sequence',
  'T1,08:00:00,08:00:00,A,1',
  'T1,08:10:00,08:10:00,B,2',
  'T1,08:20:00,08:20:00,C,3',
  'T2,09:00:00,09:00:00,A,1',
  'T2,09:10:00,09:10:00,B,2',
  'T2,09:20:00,09:20:00,C,3',
  'T6,08:30:00,08:30:00,A,1',
  'T6,08:40:00,08:40:00,B,2',
  'T6,08:50:00,08:50:00,C,3',
  'T3,08:05:00,08:05:00,C,1',
  'T3,08:15:00,08:15:00,B,2',
  'T3,08:25:00,08:25:00,A,3',
  'T5,25:10:00,25:10:00,A,1',
  'T5,25:20:00,25:20:00,B,2',
  'T4,10:00:00,10:00:00,A,1',
  'T4,10:15:00,10:15:00,D,2',
].join('\n');

const CALENDAR = [
  'service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday,start_date,end_date',
  'WKD,1,1,1,1,1,0,0,20260101,20261231',
  'SAT,0,0,0,0,0,1,0,20260101,20261231',
].join('\n');

const CALENDAR_DATES = [
  'service_id,date,exception_type',
  'WKD,20261024,1', // weekday service added on the Saturday
  'WKD,20261021,2', // weekday service removed on the Wednesday
].join('\n');

function fixture(): TransitNetwork {
  return parseNetwork({
    routes: ROUTES, shapes: SHAPES, stops: STOPS, trips: TRIPS,
    stopTimes: STOP_TIMES, calendar: CALENDAR, calendarDates: CALENDAR_DATES,
  });
}

describe('parseGtfsTime', () => {
  it('parses clock times including past-midnight hours', () => {
    expect(parseGtfsTime('08:05:00')).toBe(8 * 3600 + 5 * 60);
    expect(parseGtfsTime('25:10:00')).toBe(25 * 3600 + 10 * 60);
    expect(parseGtfsTime('7:05')).toBe(7 * 3600 + 5 * 60);
    expect(parseGtfsTime('')).toBeNull();
    expect(parseGtfsTime('soon')).toBeNull();
  });
});

describe('thinLine', () => {
  it('drops points closer than the spacing but keeps the ends', () => {
    const line = thinLine([[0, 0], [0.00004, 0], [0.01, 0], [0.02, 0.005]]);
    // Coordinates here are [lng, lat]; distances: p2 is ~4 m from p1 → dropped.
    expect(line.length).toBe(3);
    expect(line[0]).toEqual([0, 0]);
    expect(line[line.length - 1]).toEqual([0.02, 0.005]);
  });
});

describe('parseNetwork', () => {
  const net = fixture();
  it('builds routes with agency colors and mode fallbacks', () => {
    const r1 = net.routeByShort.get('701');
    expect(r1?.color).toBe('#0076BC');
    expect(r1?.mode).toBe('tram');
    expect(net.routeByShort.get('2')?.color).toBe('#FFA726'); // bus default
    expect(net.routes.map(r => r.short)).toEqual(['2', '701']); // numeric-aware sort
  });
  it('joins the routes serving each stop', () => {
    expect(net.stopById.get('A')?.routes).toEqual(['2', '701']);
    expect(net.stopById.get('D')?.routes).toEqual(['2']);
    expect(net.stopById.get('C')?.routes).toEqual(['701']);
  });
  it('picks the fullest trip per direction and thins its shape', () => {
    const dirs = net.directions.get('R1');
    expect(dirs?.length).toBe(2);
    const d0 = dirs?.find(d => d.dir === 0);
    expect(d0?.stopIds).toEqual(['A', 'B', 'C']);
    expect(d0?.headsign).toBe('Downtown');
    // S1 has 4 points with two ~4 m apart → thinned to 3.
    expect(d0?.line.length).toBe(3);
    expect(d0?.line[0]).toEqual([-111, 40]);
  });
});

describe('activeServiceIds', () => {
  const net = fixture();
  it('follows weekday masks and calendar-date exceptions', () => {
    expect([...activeServiceIds(net, TUE)].sort()).toEqual(['WKD']);
    expect([...activeServiceIds(net, SAT)].sort()).toEqual(['SAT', 'WKD']); // WKD added by exception
    expect([...activeServiceIds(net, '20261021')]).toEqual([]); // WKD removed by exception
    expect([...activeServiceIds(net, '20261025')]).toEqual([]); // Sunday: nothing
  });
});

describe('departuresForStop', () => {
  const net = fixture();
  it('resolves service-day times to real instants, incl. past-midnight trips', () => {
    const base = zonedMidnightMs(TUE, TZ);
    const deps = departuresForStop(net, 'A', base + 30 * 60000, base + 12 * 3600000, TZ);
    // T5 (25:10 on Monday's service day) lands at 01:10 Tuesday; then the
    // morning's departures — both directions call at A (T3 starts there
    // as its inbound terminus): T1 08:00, T3 08:25, T6 08:30, T2 09:00.
    expect(deps.map(d => d.tripId)).toEqual(['T5', 'T1', 'T3', 'T6', 'T2']);
    expect(deps[0].schedMs).toBe(zonedMidnightMs('20261019', TZ) + (25 * 3600 + 600) * 1000);
    expect(deps[1].schedMs).toBe(base + 8 * 3600000);
    expect(deps.every(d => d.routeId === 'R1')).toBe(true);
  });
  it('returns nothing for a stop with no calls', () => {
    const base = zonedMidnightMs(TUE, TZ);
    expect(departuresForStop(net, 'ZZZ', base, base + 3600000, TZ)).toEqual([]);
  });
});

describe('routeDaySummary', () => {
  const net = fixture();
  it('summarizes first/last/trips/headway per direction for the day', () => {
    const [d0, d1] = routeDaySummary(net, 'R1', TUE, TZ);
    const base = zonedMidnightMs(TUE, TZ);
    expect(d0.trips).toBe(4);
    expect(d0.firstDepMs).toBe(base + 8 * 3600000);
    expect(d0.lastDepMs).toBe(base + (25 * 3600 + 600) * 1000);
    expect(d0.headwayMin).toBe(30); // gaps 30, 30, 970 → median 30
    expect(d1.trips).toBe(1);
    expect(d1.headwayMin).toBeNull();
  });
  it('shows no service on a day the route does not run', () => {
    const [d0] = routeDaySummary(net, 'R2', TUE, TZ); // R2 is Saturday-only
    expect(d0.trips).toBe(0);
    expect(d0.firstDepMs).toBeNull();
  });
});

describe('zone day math', () => {
  it('computes the agency-local day and midnight consistently', () => {
    // 2026-10-20 05:30 UTC is 2026-10-19 23:30 in Denver (MDT, UTC-6).
    const at = new Date(Date.UTC(2026, 9, 20, 5, 30));
    expect(ymdInZone(TZ, at)).toBe('2026-10-19');
    expect(zonedMidnightMs('20261020', TZ)).toBe(Date.UTC(2026, 9, 20, 6, 0));
  });
});
