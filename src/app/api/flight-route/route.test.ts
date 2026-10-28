import { describe, expect, it, vi } from 'vitest';

/**
 * Route-resolution sources after the 2026-10-28 cleanup: ADSBDB and
 * HexDB race; airplanes.live is GONE — removed entirely because its
 * licence is non-commercial. These tests pin both halves: resolution
 * still works off the remaining sources, and no code path ever asks
 * airplanes.live again.
 */

vi.mock('@/lib/stealthFetch', () => ({
  stealthFetch: vi.fn(),
  stealthHeaders: vi.fn(() => ({})),
}));

// No local airport DB hits — ADSBDB's own origin/destination payload
// carries coordinates, which resolveAirports uses as its fallback.
vi.mock('@/lib/airports', () => ({
  lookupAirport: () => null,
  lookupAirportAsync: async () => null,
}));

import { stealthFetch } from '@/lib/stealthFetch';
import { GET } from './route';

const ADSBDB_ROUTE = {
  response: {
    flightroute: {
      origin: {
        icao_code: 'KJFK', iata_code: 'JFK', name: 'John F Kennedy Intl',
        municipality: 'New York', country_iso_name: 'United States',
        latitude: '40.6413', longitude: '-73.7781',
      },
      destination: {
        icao_code: 'EGLL', iata_code: 'LHR', name: 'London Heathrow',
        municipality: 'London', country_iso_name: 'United Kingdom',
        latitude: '51.4700', longitude: '-0.4543',
      },
    },
  },
};

function install(adsbdbStatus: number) {
  const asked: string[] = [];
  vi.mocked(stealthFetch).mockImplementation(async (url: any) => {
    const u = String(url);
    asked.push(u);
    if (u.includes('api.adsbdb.com')) {
      return adsbdbStatus === 200
        ? Response.json(ADSBDB_ROUTE)
        : new Response('adsbdb down', { status: adsbdbStatus });
    }
    if (u.includes('hexdb.io')) return new Response('no route', { status: 404 });
    return new Response('unexpected url', { status: 500 });
  });
  return asked;
}

function req(callsign: string) {
  return {
    url: `https://worldeye.app/api/flight-route?callsign=${callsign}&lat=45&lng=-30`,
  } as any;
}

describe('GET /api/flight-route — sources', () => {
  it('resolves a route from ADSBDB and never asks airplanes.live', async () => {
    const asked = install(200);
    const body = await (await GET(req('TESTDB1'))).json();
    expect(body.found).toBe(true);
    expect(body.source).toBe('adsbdb');
    expect(body.origin.icao).toBe('KJFK');
    expect(body.destination.icao).toBe('EGLL');
    expect(asked.some((u) => u.includes('airplanes.live'))).toBe(false);
  });

  it('reports a miss when the remaining sources fail — still without airplanes.live', async () => {
    const asked = install(500);
    const body = await (await GET(req('TESTMISS1'))).json();
    expect(body.found).toBe(false);
    expect(asked.length).toBeGreaterThan(0);
    expect(asked.some((u) => u.includes('airplanes.live'))).toBe(false);
  });
});
