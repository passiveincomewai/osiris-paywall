import { describe, it, expect } from 'vitest';
import {
  aggregateLiveRoutes,
  liveCountForRoute,
  naturalRouteCompare,
  filterByModeFamily,
  searchRoutes,
  searchStops,
  alertTone,
  alertUntilMs,
  nearestOf,
  type LiveVehicleRow,
} from './explorer';

const veh = (route: string, mode: string, id = `${route}-${Math.random()}`): LiveVehicleRow => ({
  id, lat: 40.7, lng: -111.9, route, mode,
});

describe('aggregateLiveRoutes', () => {
  it('counts vehicles per public route label and sorts naturally', () => {
    const rows = aggregateLiveRoutes([
      veh('417', 'bus'), veh('417', 'bus'), veh('417', 'bus'), veh('417', 'bus'),
      veh('17', 'bus'), veh('17', 'bus'),
      veh('200', 'bus'),
      veh('701', 'tram'), veh('701', 'tram'),
      veh('', 'bus'), // out of service — not a route
    ]);
    expect(rows.map((r) => r.route)).toEqual(['17', '200', '417', '701']);
    expect(rows.find((r) => r.route === '417')?.count).toBe(4);
    expect(rows.find((r) => r.route === '17')?.count).toBe(2);
    expect(rows.find((r) => r.route === '701')?.mode).toBe('tram');
  });

  it("owner's acceptance shape: UTA routes 17 and 417 are ordinary searchable rows", () => {
    const routes = [
      { short: '17', long: '1700 South' },
      { short: '200', long: 'State Street South' },
      { short: '417', long: 'North Redwood Rd' },
      { short: '701', long: 'Blue Line' },
    ];
    expect(searchRoutes(routes, '17').map((r) => r.short)).toEqual(['17', '417']);
    expect(searchRoutes(routes, '417').map((r) => r.short)).toEqual(['417']);
    expect(searchRoutes(routes, 'redwood').map((r) => r.short)).toEqual(['417']);
    expect(searchRoutes(routes, '')).toHaveLength(4);
  });
});

describe('liveCountForRoute', () => {
  it('counts only exact public labels', () => {
    const vs = [veh('17', 'bus'), veh('17', 'bus'), veh('170', 'bus'), veh('417', 'bus')];
    expect(liveCountForRoute(vs, '17')).toBe(2);
    expect(liveCountForRoute(vs, '999')).toBe(0);
  });
});

describe('naturalRouteCompare', () => {
  it('orders numeric labels by value, letters after numbers', () => {
    expect(['701', '17', '417', '200', 'A', '9'].sort(naturalRouteCompare)).toEqual([
      '9', '17', '200', '417', '701', 'A',
    ]);
  });
});

describe('filterByModeFamily', () => {
  const rows = [
    { short: '17', mode: 'bus' },
    { short: '701', mode: 'tram' },
    { short: '750', mode: 'train' },
    { short: 'F1', mode: 'ferry' },
  ];
  it('bus keeps buses only; rail keeps tram/metro/train; other shows under all', () => {
    expect(filterByModeFamily(rows, 'bus').map((r) => r.short)).toEqual(['17']);
    expect(filterByModeFamily(rows, 'rail').map((r) => r.short)).toEqual(['701', '750']);
    expect(filterByModeFamily(rows, 'all')).toHaveLength(4);
  });
});

describe('searchStops', () => {
  const stops = [
    { name: 'Redwood Rd / 700 N', routes: ['417'] },
    { name: 'North Temple Station', routes: ['701', '704'] },
    { name: '1700 S / Redwood Rd', routes: ['17'] },
  ];
  it('matches by name substring and by exact route label, capped', () => {
    expect(searchStops(stops, 'redwood').map((s) => s.name)).toEqual([
      'Redwood Rd / 700 N', '1700 S / Redwood Rd',
    ]);
    expect(searchStops(stops, '701').map((s) => s.name)).toEqual(['North Temple Station']);
    expect(searchStops(stops, '')).toEqual([]);
  });
});

describe('alertTone / alertUntilMs', () => {
  it("uses the feed's own effect as the severity signal", () => {
    expect(alertTone('NO_SERVICE')).toEqual({ label: 'NO SERVICE', tone: 'red' });
    expect(alertTone('STOP_MOVED').tone).toBe('red');
    expect(alertTone('DETOUR').tone).toBe('amber');
    expect(alertTone('REDUCED_SERVICE').tone).toBe('amber');
    expect(alertTone('ADDITIONAL_SERVICE').tone).toBe('cyan');
    expect(alertTone(undefined)).toEqual({ label: 'SERVICE ALERT', tone: 'amber' });
  });

  it('reports an end only when the feed published one', () => {
    expect(alertUntilMs({ id: '1', header: 'h', routes: [], periods: [{ startMs: 1, endMs: 500 }, { startMs: 2, endMs: 900 }] })).toBe(900);
    expect(alertUntilMs({ id: '1', header: 'h', routes: [], periods: [{ startMs: 1, endMs: null }] })).toBeNull();
    expect(alertUntilMs({ id: '1', header: 'h', routes: [], periods: [] })).toBeNull();
  });
});

describe('nearestOf', () => {
  it('finds the closest loaded point and its distance', () => {
    const pts = [
      { id: 'far', lat: 41.5, lng: -111.9 },
      { id: 'near', lat: 40.71, lng: -111.9 },
    ];
    const hit = nearestOf({ lat: 40.7, lng: -111.9 }, pts);
    expect(hit?.point.id).toBe('near');
    expect(hit?.distKm).toBeGreaterThan(1);
    expect(hit?.distKm).toBeLessThan(1.3);
    expect(nearestOf({ lat: 0, lng: 0 }, [])).toBeNull();
  });
});
