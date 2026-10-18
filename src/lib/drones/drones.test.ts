import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { sanitizeObservation, publicDroneId } from './privacy';
import {
  ingestReport, snapshot, clearDroneStore, rateLimitOk, clearRateLimits,
  DRONE_TTL_MS, RECEIVER_ACTIVE_MS,
} from './store';
import { ingestConfigured, verifyIngestBearer } from './ingest-auth';
import { viewportCovered, circlePolygon, haversineM } from './geo';
import { bboxUsable } from './airspace';

const NOW = 1_792_000_000_000; // fixed "now" for deterministic windows

describe('privacy filter', () => {
  it('drops operator (System message) location and ids — provably absent out', () => {
    const clean = sanitizeObservation({
      id: '1581F67QC23BX00A1B2C',
      lat: 40.76, lng: -111.89, altitudeMslM: 1450, heightAglM: 60,
      headingDeg: 90, speedMps: 8.5, timestamp: NOW,
      // the sensitive payload a stock receiver would forward:
      operatorLat: 40.7599, operatorLng: -111.8901,
      operatorId: 'FA-OPERATOR-9988',
      selfId: 'John Pilot +1-801-555-0100',
      System: { OperatorLatitude: 40.7599, OperatorLongitude: -111.8901, OperatorID: 'FA-OPERATOR-9988' },
      authentication: { pages: ['secret'] },
    }, NOW);
    expect(clean).not.toBeNull();
    const serialized = JSON.stringify(clean);
    expect(serialized).not.toContain('40.7599');
    expect(serialized).not.toContain('-111.8901');
    expect(serialized).not.toContain('OPERATOR');
    expect(serialized).not.toContain('John Pilot');
    expect(serialized).not.toContain('801-555');
    expect(serialized).not.toContain('secret');
    // no field on the clean record can even carry operator data
    expect(Object.keys(clean!).sort()).toEqual([
      'altitudeMslM', 'headingDeg', 'heightAglM', 'lat', 'lng', 'publicId',
      'seenAt', 'speedMps', 'uaType', 'verticalSpeedMps',
    ]);
  });

  it('never stores the raw serial — only a session hash', () => {
    const clean = sanitizeObservation(
      { id: '1581F67QC23BX00A1B2C', lat: 40.7, lng: -111.9, timestamp: NOW }, NOW);
    expect(clean!.publicId).toMatch(/^drn_[0-9a-f]{16}$/);
    expect(JSON.stringify(clean)).not.toContain('1581F');
  });

  it('session id is stable inside a window and rotates across windows', () => {
    const W = 6 * 3_600_000;
    const T0 = Math.floor(NOW / W) * W; // align to a window boundary
    const a = publicDroneId('SERIAL-1', T0 + 60_000);
    const b = publicDroneId('SERIAL-1', T0 + 3_600_000); // +1h, same 6h window
    const c = publicDroneId('SERIAL-1', T0 + 7 * 3_600_000); // +7h, next window
    expect(a).toBe(b);
    expect(c).not.toBe(a);
  });

  it('accepts nested OpenDroneID message shapes', () => {
    const clean = sanitizeObservation({
      BasicID: { UAType: 2, IDType: 1, UASID: 'RID-SERIAL-XYZ' },
      Location: {
        Latitude: 41.2, Longitude: -112.0, Direction: 181,
        SpeedHorizontal: 12, SpeedVertical: -1, AltitudeGeodetic: 1500, Height: 80,
      },
      timestamp: NOW,
    }, NOW);
    expect(clean).toMatchObject({
      lat: 41.2, lng: -112.0, headingDeg: 181, speedMps: 12,
      altitudeMslM: 1500, heightAglM: 80, uaType: 2,
    });
  });

  it('rejects unusable observations', () => {
    expect(sanitizeObservation({ lat: 40, lng: -111 }, NOW)).toBeNull(); // no id
    expect(sanitizeObservation({ id: 'X', lat: 91, lng: 0 }, NOW)).toBeNull(); // bad lat
    expect(sanitizeObservation({ id: 'X', lat: 0, lng: 0 }, NOW)).toBeNull(); // ODID sentinel
    expect(sanitizeObservation({ id: 'X', lat: 40, lng: -111, timestamp: NOW - 11 * 60_000 }, NOW)).toBeNull(); // stale replay
    expect(sanitizeObservation({ id: 'X', lat: 40, lng: -111, timestamp: NOW + 10 * 60_000 }, NOW)).toBeNull(); // future
  });
});

describe('store', () => {
  beforeEach(() => { clearDroneStore(); clearRateLimits(); });

  const rx = { id: 'rx-1', name: 'Rooftop', lat: 40.76, lng: -111.89, radiusM: 2500 };
  const obs = (id: string, at: number, lat = 40.761, lng = -111.891) =>
    sanitizeObservation({ id, lat, lng, timestamp: at }, at)!;

  it('serves ingested drones with trails, and they expire after the TTL', () => {
    ingestReport(rx, [obs('A', NOW)], NOW);
    ingestReport(rx, [obs('A', NOW + 10_000, 40.762, -111.892)], NOW + 10_000);
    const snap = snapshot(NOW + 10_000);
    expect(snap.drones.length).toBe(1);
    expect(snap.drones[0].trail.length).toBe(2);
    expect(snap.drones[0].ageS).toBe(0);
    // after TTL with no new report the drone is gone — not simulated, gone
    expect(snapshot(NOW + 10_000 + DRONE_TTL_MS + 1).drones.length).toBe(0);
  });

  it('receiver coverage is active, then lapses', () => {
    ingestReport(rx, [], NOW);
    expect(snapshot(NOW).receivers[0].active).toBe(true);
    expect(snapshot(NOW + RECEIVER_ACTIVE_MS + 1).receivers[0].active).toBe(false);
  });

  it('rate limiter trips after the per-minute cap', () => {
    for (let i = 0; i < 120; i++) expect(rateLimitOk('k', NOW)).toBe(true);
    expect(rateLimitOk('k', NOW)).toBe(false);
    expect(rateLimitOk('k', NOW + 61_000)).toBe(true);
    expect(rateLimitOk('other', NOW)).toBe(true);
  });
});

describe('ingest auth', () => {
  const saved = { ...process.env };
  afterEach(() => { process.env = { ...saved }; });

  it('is unconfigured (404 behaviour) with no env tokens', () => {
    delete process.env.DRONE_INGEST_TOKENS;
    delete process.env.DRONE_INGEST_TOKEN;
    expect(ingestConfigured()).toBe(false);
  });

  it('binds tokens to receiver ids and rejects bad tokens', () => {
    process.env.DRONE_INGEST_TOKENS = 'rx-roof:s3cret-token-1,rx-field:s3cret-token-2';
    delete process.env.DRONE_INGEST_TOKEN;
    const good = new Request('http://x', { headers: { authorization: 'Bearer s3cret-token-2' } });
    expect(verifyIngestBearer(good)).toEqual({ receiverId: 'rx-field' });
    const bad = new Request('http://x', { headers: { authorization: 'Bearer nope' } });
    expect(verifyIngestBearer(bad)).toBeUndefined();
    const none = new Request('http://x');
    expect(verifyIngestBearer(none)).toBeUndefined();
  });
});

describe('coverage geometry', () => {
  const bounds = { west: -111.95, south: 40.72, east: -111.85, north: 40.80 };
  it('haversine sanity', () => {
    expect(haversineM({ lat: 40.76, lng: -111.89 }, { lat: 40.77, lng: -111.89 })).toBeCloseTo(1112, -2);
  });
  it('covered only when an ACTIVE receiver circle intersects the viewport', () => {
    const near = [{ lat: 40.76, lng: -111.90, radiusM: 2500, active: true }];
    const far = [{ lat: 41.30, lng: -111.90, radiusM: 2500, active: true }];
    const dormant = [{ lat: 40.76, lng: -111.90, radiusM: 2500, active: false }];
    expect(viewportCovered(bounds, near)).toBe(true);
    expect(viewportCovered(bounds, far)).toBe(false);
    expect(viewportCovered(bounds, dormant)).toBe(false);
    expect(viewportCovered(bounds, [])).toBe(false);
  });
  it('circle polygon closes and has the right span', () => {
    const poly = circlePolygon(-111.89, 40.76, 1000, 32);
    expect(poly.length).toBe(33);
    expect(poly[0]).toEqual(poly[poly.length - 1]);
    const lats = poly.map((p) => p[1]);
    expect(Math.max(...lats) - Math.min(...lats)).toBeCloseTo(0.018, 2);
  });
});

describe('airspace bbox guard', () => {
  it('accepts a city viewport, rejects world views and junk', () => {
    expect(bboxUsable({ west: -112, south: 40.5, east: -111.7, north: 40.9 })).toBe(true);
    expect(bboxUsable({ west: -180, south: -90, east: 180, north: 90 })).toBe(false);
    expect(bboxUsable({ west: NaN, south: 0, east: 1, north: 1 })).toBe(false);
  });
});
