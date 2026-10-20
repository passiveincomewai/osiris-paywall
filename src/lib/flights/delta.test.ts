import { describe, expect, it } from 'vitest';
import { applyFlightsDelta, flightRecordKey, type FlightsDelta, type FlightsPayloadLike } from './delta';
import { diffFlightsSnapshots, fingerprintFlightsPayload } from '@/app/api/flights/route';

/* The protocol round-trip: the server's own diff of two snapshots,
   merged by the client, must reproduce the newer snapshot exactly —
   received == rendered, across moves, removals and reclassifications. */

const rec = (icao24: string, over: Record<string, unknown> = {}) => ({
  callsign: 'UAL100', lat: 39, lng: -98, alt: 10_668, heading: 90,
  speed_knots: 450, model: 'B738', icao24, registration: 'N12345',
  squawk: '2000', airline_code: 'UAL', aircraft_category: 'plane',
  category: 'commercial', grounded: false, nac_p: 8, type: 'flight',
  ...over,
});

const payload = (over: Partial<FlightsPayloadLike> = {}): FlightsPayloadLike => ({
  commercial_flights: [], private_flights: [], private_jets: [], military_flights: [],
  gps_jamming: [], total: 0, source: 'test', partial: false,
  timestamp: '2026-10-20T00:00:00.000Z', token: 'f1',
  ...over,
});

const byKey = (p: FlightsPayloadLike) => {
  const map = new Map<string, unknown>();
  for (const bucket of ['commercial_flights', 'private_flights', 'private_jets', 'military_flights'] as const) {
    for (const r of p[bucket]) map.set(`${bucket}:${flightRecordKey(r)}`, r);
  }
  return map;
};

function serverDelta(base: FlightsPayloadLike, current: FlightsPayloadLike): FlightsDelta {
  const { upserts, removed } = diffFlightsSnapshots(
    fingerprintFlightsPayload(base), current, fingerprintFlightsPayload(current),
  );
  return {
    delta: true, base: 'f1', token: 'f2', upserts, removed,
    gps_jamming: current.gps_jamming, total: current.total, source: current.source,
    providers: undefined, diagnostics: undefined, partial: false, timestamp: current.timestamp,
  };
}

describe('applyFlightsDelta', () => {
  it('round-trips a server diff: moves apply, removals vanish, categories move buckets', () => {
    const base = payload({
      commercial_flights: [rec('aaa111'), rec('bbb222')],
      private_flights: [rec('ccc333')],
      total: 3,
    });
    const current = payload({
      commercial_flights: [rec('aaa111', { lat: 40.25, lng: -97.5 })],
      private_jets: [rec('bbb222')],               // reclassified
      military_flights: [rec('ddd444')],            // new arrival
      // ccc333 vanished
      gps_jamming: [{ lat: 40, lng: -100, severity: 50, count: 4 }],
      total: 3, token: 'f2', timestamp: '2026-10-20T00:00:30.000Z',
    });
    const merged = applyFlightsDelta(base, serverDelta(base, current));
    expect(merged).not.toBeNull();
    expect(byKey(merged!)).toEqual(byKey(current));
    expect(merged!.total).toBe(3);
    expect(merged!.token).toBe('f2');
    expect(merged!.timestamp).toBe('2026-10-20T00:00:30.000Z');
    expect(merged!.gps_jamming).toEqual(current.gps_jamming);
    // Fresh bucket arrays — the render blend must see a new payload.
    expect(merged!.commercial_flights).not.toBe(base.commercial_flights);
    // Vanished aircraft is in NO bucket.
    const all = ['commercial_flights', 'private_flights', 'private_jets', 'military_flights']
      .flatMap(b => (merged as any)[b]).map((r: any) => r.icao24);
    expect(all).not.toContain('ccc333');
    expect(all.sort()).toEqual(['aaa111', 'bbb222', 'ddd444']);
  });

  it('keeps relative order for aircraft that stayed in their bucket', () => {
    const base = payload({ commercial_flights: [rec('a1'), rec('a2'), rec('a3')] });
    const current = payload({
      commercial_flights: [rec('a1'), rec('a2', { lat: 41 }), rec('a3')], token: 'f2',
    });
    const merged = applyFlightsDelta(base, serverDelta(base, current));
    expect(merged!.commercial_flights.map(r => r.icao24)).toEqual(['a1', 'a2', 'a3']);
    expect(merged!.commercial_flights[1].lat).toBe(41);
  });

  it('an unchanged delta returns the same sky with the new token', () => {
    const base = payload({ commercial_flights: [rec('a1')], total: 1 });
    const merged = applyFlightsDelta(base, {
      delta: true, base: 'f1', token: 'f1', unchanged: true, total: 1,
      timestamp: '2026-10-20T00:00:30.000Z',
    });
    expect(merged!.commercial_flights).toEqual(base.commercial_flights);
    expect(merged!.partial).toBe(false);
  });

  it('rejects a delta based on a snapshot the client does not hold', () => {
    const base = payload({ token: 'f7' });
    expect(applyFlightsDelta(base, { delta: true, base: 'f1', token: 'f2', upserts: {}, removed: [] }))
      .toBeNull();
    expect(applyFlightsDelta(base, { delta: true, base: 'f7', token: '', upserts: {}, removed: [] }))
      .toBeNull();
  });
});
