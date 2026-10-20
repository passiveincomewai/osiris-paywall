import { beforeAll, describe, expect, it, vi } from 'vitest';

/**
 * Delta polls for GET /api/flights (?since=<token>).
 *
 * The pure diff is exercised directly on fixtures; the route-level cases
 * run ONE real sweep (the mock mirrors route.test.ts: ~150 ms regions,
 * the route's own ~1.05 s pacing) and then answer from the warm cache,
 * so this file costs one ~45 s build, not one per case.
 */

vi.mock('@/lib/stealthFetch', () => ({
  stealthFetch: vi.fn(),
  stealthHeaders: vi.fn(() => ({})),
}));

import { stealthFetch } from '@/lib/stealthFetch';
import {
  GET, diffFlightsSnapshots, fingerprintFlightsPayload, flightRecordKey,
} from './route';

const rec = (icao24: string, over: Record<string, unknown> = {}) => ({
  callsign: 'UAL100', lat: 39, lng: -98, alt: 10_668, heading: 90,
  speed_knots: 450, model: 'B738', icao24, registration: 'N12345',
  squawk: '2000', airline_code: 'UAL', aircraft_category: 'plane',
  category: 'commercial', grounded: false, nac_p: 8, type: 'flight',
  ...over,
});

describe('diffFlightsSnapshots (pure)', () => {
  const base = {
    commercial_flights: [rec('aaa111'), rec('bbb222')],
    private_flights: [rec('ccc333')],
    private_jets: [], military_flights: [], gps_jamming: [],
  };

  it('reports moved, new and vanished aircraft — and nothing else', () => {
    const current = {
      commercial_flights: [rec('aaa111', { lat: 39.5 })], // moved
      private_flights: [],                                  // ccc333 vanished
      private_jets: [rec('bbb222')],                        // re-categorised
      military_flights: [rec('ddd444')],                    // new
      gps_jamming: [],
    };
    const { upserts, removed } = diffFlightsSnapshots(
      fingerprintFlightsPayload(base), current, fingerprintFlightsPayload(current),
    );
    expect(upserts.commercial_flights.map(r => r.icao24)).toEqual(['aaa111']);
    expect(upserts.private_jets.map(r => r.icao24)).toEqual(['bbb222']);
    expect(upserts.military_flights.map(r => r.icao24)).toEqual(['ddd444']);
    expect(upserts.private_flights).toEqual([]);
    expect(removed).toEqual(['ccc333']);
  });

  it('an identical snapshot diffs to nothing', () => {
    const hashes = fingerprintFlightsPayload(base);
    const { upserts, removed } = diffFlightsSnapshots(hashes, base, hashes);
    expect(Object.values(upserts).flat()).toEqual([]);
    expect(removed).toEqual([]);
  });

  it('keys records without a transponder code by callsign and position', () => {
    expect(flightRecordKey(rec('', { callsign: 'N911UT', lat: 40.6, lng: -111.8 })))
      .toBe('N911UT|40.6|-111.8');
    expect(flightRecordKey(rec('abc123'))).toBe('abc123');
  });
});

function installMock() {
  vi.mocked(stealthFetch).mockImplementation(async (url: any) => {
    const u = String(url);
    const respond = (body: unknown, status = 200) =>
      new Promise<Response>((resolve) =>
        setTimeout(() => resolve(Response.json(body, { status })), 150),
      );
    const ac = (hex: string) => ({
      hex, flight: 'UAL100', r: 'N12345', t: 'B738', lat: 39, lon: -98,
      alt_baro: 35000, gs: 450, track: 90, squawk: '2000', dbFlags: 0,
    });
    if (u.includes('opensky')) return new Response('unauthorized', { status: 401 });
    if (u.endsWith('/mil')) return respond({ ac: [ac('mil0')] });
    if (/\/v3\/lat\//.test(u)) return respond({ ac: [ac(`r${Math.abs(u.length)}x`)] });
    return new Response('unexpected url', { status: 500 });
  });
}

describe('GET /api/flights delta protocol (one real build)', () => {
  let firstToken: string;

  beforeAll(async () => {
    installMock();
    const res = await GET(new Request('http://localhost/api/flights'));
    const body = await res.json();
    expect(body.partial).toBe(false);
    expect(typeof body.token).toBe('string');
    firstToken = body.token;
  }, 120_000);

  it('answers an up-to-date poll with a tiny unchanged delta', async () => {
    const res = await GET(new Request(`http://localhost/api/flights?since=${firstToken}`));
    const body = await res.json();
    expect(body.delta).toBe(true);
    expect(body.unchanged).toBe(true);
    expect(body.token).toBe(firstToken);
    expect(body.commercial_flights).toBeUndefined();
    expect(JSON.stringify(body).length).toBeLessThan(500);
  });

  it('answers an unknown token with the full payload (client re-bases)', async () => {
    const res = await GET(new Request('http://localhost/api/flights?since=f999999'));
    const body = await res.json();
    expect(body.delta).toBeUndefined();
    expect(body.token).toBe(firstToken);
    expect(Array.isArray(body.commercial_flights)).toBe(true);
  });

  it('bare GET() (in-process admin consumer) still returns the full payload', async () => {
    const res = await GET();
    const body = await res.json();
    expect(body.token).toBe(firstToken);
    expect(typeof body.total).toBe('number');
  });
});
