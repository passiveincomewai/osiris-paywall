import { describe, it, expect } from 'vitest';
import { parseNetwork, routeLineFeatures } from './network';
import { groupRoutesByType } from './explorer';

/**
 * UTA reconciliation, fixture form (audit 2026-10-26).
 *
 * The live audit compared UTA's published GTFS (feed version
 * 2026 AUG_20261008, valid 2026-08-16 → 2026-12-05) against the
 * network the app builds from it, table by table:
 *   routes.txt  86 rows (81 type 3 bus, 4 type 0 tram, 1 type 2 rail)
 *   stops.txt   5,425 rows, every one with name + coordinates
 *   trips.txt   11,078 trips — all reference known routes, all
 *               carry stop_times and a shape_id
 * and the app's parser serves ALL of it: 86 routes / 5,425 stops,
 * confirmed against production /api/transit/network on the same day.
 * The single gap is feed-side, not parser-side: route 972 (Midvale
 * Ft Union Station → Solitude/Brighton, the ski bus) is published
 * in routes.txt with ZERO trips in this feed version, so it exists
 * in the index with no directions a stop list could be built from.
 *
 * This fixture pins those shapes so a future parser change can't
 * silently start dropping a class of route (a route_type, a
 * no-trips route, a route whose trips lack shapes…).
 */

const ROUTES = [
  'route_id,route_short_name,route_long_name,route_type,route_color,route_url',
  '1701,701,Blue Line,0,005DAA,https://www.rideuta.com/701',
  '1750,750,FrontRunner,2,6C2D82,',
  '1200,200,State Street South,3,F68B1F,',
  '65123,972,BINGHM JNCT/SOL BRIGHTN,3,000000,https://www.rideuta.com/972',
].join('\n');

const STOPS = [
  'stop_id,stop_code,stop_name,stop_lat,stop_lon',
  'S1,1001,Central Station,40.7625,-111.9089',
  'S2,1002,Murray Central,40.6599,-111.8888',
  'S3,1003,Ft Union,40.6200,-111.8100',
].join('\n');

const TRIPS = [
  'route_id,service_id,trip_id,trip_headsign,direction_id,shape_id',
  '1701,WKD,T701a,To Murray,0,SH701',
  '1750,WKD,T750a,To Ogden,0,SH750',
  '1200,WKD,T200a,To Downtown,0,SH200',
  // route 65123 (972) deliberately has NO trips — the feed-side gap.
].join('\n');

const STOP_TIMES = [
  'trip_id,arrival_time,departure_time,stop_id,stop_sequence',
  'T701a,08:00:00,08:00:00,S1,1',
  'T701a,08:10:00,08:10:00,S2,2',
  'T750a,09:00:00,09:00:00,S1,1',
  'T750a,09:20:00,09:20:00,S3,2',
  'T200a,10:00:00,10:00:00,S3,1',
  'T200a,10:05:00,10:05:00,S2,2',
].join('\n');

const CALENDAR = [
  'service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday,start_date,end_date',
  'WKD,1,1,1,1,1,0,0,20260816,20261205',
].join('\n');

const net = parseNetwork({
  routes: ROUTES, stops: STOPS, trips: TRIPS, stopTimes: STOP_TIMES, calendar: CALENDAR,
});

describe('UTA-shaped feed → served network reconciliation', () => {
  it('serves EVERY routes.txt row — bus, tram and commuter rail alike', () => {
    expect(net.routes.map((r) => r.short)).toEqual(['200', '701', '750', '972']);
    const byMode = (m: string) => net.routes.filter((r) => r.mode === m).length;
    expect(byMode('bus')).toBe(2);
    expect(byMode('tram')).toBe(1);
    expect(byMode('train')).toBe(1);
  });

  it('serves every stop, with its serving routes resolved', () => {
    expect(net.stops).toHaveLength(3);
    expect(net.stopById.get('S2')?.routes).toEqual(['200', '701']);
  });

  it('builds directions for every route that has trips — and only those', () => {
    expect(net.directions.get('1701')).toHaveLength(1);
    expect(net.directions.get('1750')).toHaveLength(1);
    expect(net.directions.get('1200')).toHaveLength(1);
  });

  it('the no-trips route (972 in the real feed) is served in the index but has no directions', () => {
    const r972 = net.routeByShort.get('972');
    expect(r972).toBeDefined();
    expect(r972?.url).toBe('https://www.rideuta.com/972');
    expect(net.directions.get('65123')).toBeUndefined();
    // …and draws no line: route lines come from directions only.
    const fc = routeLineFeatures(net) as { features: Array<{ properties: { short: string } }> };
    expect(fc.features.map((f) => f.properties.short).sort()).toEqual(['200', '701', '750']);
  });

  it('type grouping for the Explorer list drops nothing', () => {
    const groups = groupRoutesByType(net.routes);
    expect(groups.map((g) => g.id)).toEqual(['rail', 'bus']);
    expect(groups.find((g) => g.id === 'rail')?.routes.map((r) => r.short)).toEqual(['701', '750']);
    expect(groups.find((g) => g.id === 'bus')?.routes.map((r) => r.short)).toEqual(['200', '972']);
    expect(groups.reduce((n, g) => n + g.routes.length, 0)).toBe(net.routes.length);
  });
});
