import { describe, it, expect } from 'vitest';
import { deflateRawSync } from 'zlib';
import { parseCsv, routeTypeMode, parseTripRouteMap, parseTripStopNames, extractZipText } from './staticGtfs';

describe('routeTypeMode', () => {
  it('maps GTFS route types to modes', () => {
    expect(routeTypeMode('0')).toBe('tram');
    expect(routeTypeMode('1')).toBe('metro');
    expect(routeTypeMode('2')).toBe('train');
    expect(routeTypeMode('3')).toBe('bus');
    expect(routeTypeMode('4')).toBe('ferry');
    expect(routeTypeMode('')).toBe('bus');
    expect(routeTypeMode(undefined)).toBe('bus');
  });
});

describe('parseCsv', () => {
  it('handles quoted fields with commas and escaped quotes', () => {
    const rows = parseCsv('a,b,c\r\n1,"x, y","say ""hi"""\r\n2,plain,');
    expect(rows).toEqual([
      { a: '1', b: 'x, y', c: 'say "hi"' },
      { a: '2', b: 'plain', c: '' },
    ]);
  });
  it('strips a BOM and trailing blank lines', () => {
    expect(parseCsv('\uFEFFa,b\n1,2\n\n')).toEqual([{ a: '1', b: '2' }]);
  });
});

const ROUTES = [
  'route_id,route_short_name,route_long_name,route_type',
  '5907,701,Blue Line,0',
  '41065,750,FrontRunner,2',
  '2328,33,3300 SOUTH,3',
].join('\n');
const TRIPS = [
  'route_id,trip_id,service_id,trip_headsign',
  '5907,T100,svc,Downtown',
  '41065,T200,svc,Ogden',
  '2328,T300,svc,',
  '9999,T404,svc,Nowhere',
].join('\n');

describe('parseTripRouteMap', () => {
  it('resolves public short names and exact modes from route_type', () => {
    const m = parseTripRouteMap(ROUTES, TRIPS);
    expect(m.get('T100')).toEqual({ route: '701', mode: 'tram', routeName: 'Blue Line', headsign: 'Downtown' });
    expect(m.get('T200')).toEqual({ route: '750', mode: 'train', routeName: 'FrontRunner', headsign: 'Ogden' });
    expect(m.get('T300')).toEqual({ route: '33', mode: 'bus', routeName: '3300 SOUTH' });
    expect(m.has('T404')).toBe(false); // trip on an unknown route is skipped
  });
});

const STOPS = [
  'stop_id,stop_name,stop_lat,stop_lon',
  'S1,First Station,40.0,-111.9',
  'S2,Second Station,40.1,-111.9',
  'S3,Third Station,40.2,-111.9',
].join('\n');
// Deliberately out of sequence order in the file, plus one row pointing
// at an unknown stop and one malformed row — both must be skipped.
const STOP_TIMES = [
  'trip_id,arrival_time,departure_time,stop_id,stop_sequence',
  'T100,08:10:00,08:10:00,S2,2',
  'T100,08:00:00,08:00:00,S1,1',
  'T100,08:20:00,08:20:00,S3,3',
  'T100,08:30:00,08:30:00,SXX,4',
  'T200,09:00:00,09:00:00,S3,1',
  'T200,bad,row',
].join('\n');

describe('parseTripStopNames', () => {
  it('returns stop names per trip in stop_sequence order', () => {
    const m = parseTripStopNames(STOPS, STOP_TIMES);
    expect(m.get('T100')).toEqual(['First Station', 'Second Station', 'Third Station']);
    expect(m.get('T200')).toEqual(['Third Station']);
  });
  it('returns an empty map when required columns are missing', () => {
    expect(parseTripStopNames(STOPS, 'trip_id,stop_id\nT100,S1').size).toBe(0);
    expect(parseTripStopNames(STOPS, '').size).toBe(0);
  });
});

/** Build a minimal single-file ZIP (stored or deflated) in memory. */
function makeZip(name: string, data: string, method: 0 | 8): Uint8Array {
  const raw = new TextEncoder().encode(data);
  const comp = method === 8 ? new Uint8Array(deflateRawSync(raw)) : raw;
  const nameBytes = new TextEncoder().encode(name);
  const local = new Uint8Array(30 + nameBytes.length + comp.length);
  const lv = new DataView(local.buffer);
  lv.setUint32(0, 0x04034b50, true);
  lv.setUint16(4, 20, true);
  lv.setUint16(8, method, true);
  lv.setUint32(18, comp.length, true);
  lv.setUint32(22, raw.length, true);
  lv.setUint16(26, nameBytes.length, true);
  local.set(nameBytes, 30);
  local.set(comp, 30 + nameBytes.length);
  const central = new Uint8Array(46 + nameBytes.length);
  const cv = new DataView(central.buffer);
  cv.setUint32(0, 0x02014b50, true);
  cv.setUint16(4, 20, true);
  cv.setUint16(10, method, true);
  cv.setUint32(20, comp.length, true);
  cv.setUint32(24, raw.length, true);
  cv.setUint16(28, nameBytes.length, true);
  cv.setUint32(42, 0, true);
  central.set(nameBytes, 46);
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, 1, true);
  ev.setUint16(10, 1, true);
  ev.setUint32(12, central.length, true);
  ev.setUint32(16, local.length, true);
  const out = new Uint8Array(local.length + central.length + eocd.length);
  out.set(local, 0);
  out.set(central, local.length);
  out.set(eocd, local.length + central.length);
  return out;
}

describe('extractZipText', () => {
  it('reads stored and deflated entries', () => {
    expect(extractZipText(makeZip('routes.txt', ROUTES, 0), 'routes.txt')).toBe(ROUTES);
    expect(extractZipText(makeZip('trips.txt', TRIPS, 8), 'trips.txt')).toBe(TRIPS);
  });
  it('returns null for a missing file or non-zip bytes', () => {
    expect(extractZipText(makeZip('routes.txt', ROUTES, 0), 'stops.txt')).toBeNull();
    expect(extractZipText(new TextEncoder().encode('not a zip'), 'routes.txt')).toBeNull();
  });
});
