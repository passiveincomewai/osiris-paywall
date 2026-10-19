import { describe, expect, it, vi } from 'vitest';

/**
 * First-paint behaviour of GET /api/flights, measured against a mocked
 * provider whose regions answer in ~150 ms. With fast fetches the
 * sweep's wall time is set by the route's own ~1.05 s start pacing
 * (38 regions ≈ 40 s) — the same shape as production, where a cold
 * sweep measured ~47 s and the first visitor used to wait for ALL of
 * it. These are REAL timers on purpose: the pacing and the first-paint
 * race are wall-clock behaviour, so faking the clock would fake the
 * result. The file is slow (~50 s) for exactly that reason.
 */

vi.mock('@/lib/stealthFetch', () => ({
  stealthFetch: vi.fn(),
  stealthHeaders: vi.fn(() => ({})),
}));

import { stealthFetch } from '@/lib/stealthFetch';
import { GET } from './route';

const PER_REGION = 30;
const REGION_COUNT = 38; // REGIONS in route.ts (35 original + Denver/SLC/Phoenix)

function ac(hex: string, over: Record<string, unknown> = {}) {
  return {
    hex,
    flight: 'UAL100',
    r: 'N12345',
    t: 'B738',
    lat: 39.0,
    lon: -98.0,
    alt_baro: 35000,
    gs: 450,
    track: 90,
    squawk: '2000',
    dbFlags: 0,
    ...over,
  };
}

/** The Salt Lake City region's answer: Utah airspace, incl. one
 *  helicopter the classifier tags aircraft_category 'heli'. */
function utahAircraft() {
  const out: any[] = [];
  for (let i = 0; i < 10; i++) {
    out.push(ac(`utah${i}`, {
      flight: `DAL${200 + i}`,
      t: 'A21N',
      lat: 40.76 + i * 0.05,
      lon: -111.89 + i * 0.05,
    }));
  }
  out.push(ac('utahheli', {
    flight: 'N911UT', r: 'N911UT', t: 'B407',
    lat: 40.65, lon: -111.85, alt_baro: 6500, gs: 110,
  }));
  out.push(ac('utahmil', {
    flight: 'RCH9999', t: 'C130',
    lat: 41.1, lon: -112.0,
  }));
  return out;
}

function installMock() {
  vi.mocked(stealthFetch).mockImplementation(async (url: any) => {
    const u = String(url);
    const respond = (body: unknown, status = 200) =>
      new Promise<Response>((resolve) =>
        setTimeout(() => resolve(Response.json(body, { status })), 150),
      );
    if (u.includes('opensky')) {
      // No snapshot → the route must fall back to the regional sweep.
      return new Response('unauthorized', { status: 401 });
    }
    if (u.endsWith('/mil')) {
      return respond({
        ac: Array.from({ length: 5 }, (_, i) =>
          ac(`mil${i}`, { flight: `RCH${300 + i}`, t: 'C130', lat: 50 + i, lon: 10 + i })),
      });
    }
    const m = u.match(/\/v3\/lat\/(-?[\d.]+)\/lon\/(-?[\d.]+)\//);
    if (m) {
      const lat = parseFloat(m[1]);
      const lon = parseFloat(m[2]);
      if (lat === 40.8 && lon === -111.9) return respond({ ac: utahAircraft() });
      const tag = `${lat},${lon}`.replace(/[^0-9a-z]/gi, '');
      return respond({
        ac: Array.from({ length: PER_REGION }, (_, i) =>
          ac(`${tag}x${i}`, { lat: lat + i * 0.01, lon: lon + i * 0.01 })),
      });
    }
    return new Response('unexpected url', { status: 500 });
  });
}

const UTAH_BBOX = { minLat: 37.0, maxLat: 42.05, minLon: -114.05, maxLon: -109.05 };
function allFlights(body: any) {
  return [
    ...(body.commercial_flights || []),
    ...(body.private_flights || []),
    ...(body.private_jets || []),
    ...(body.military_flights || []),
  ];
}

describe('GET /api/flights — first paint', () => {
  it('answers a partial payload in ~10s instead of holding the first paint for the whole ~40s sweep, then completes with Utah covered', async () => {
    installMock();

    // ── First paint (the fix) vs full build (the old wait) ──
    const t0 = Date.now();
    const first = await (await GET()).json();
    const firstPaintMs = Date.now() - t0;
    expect(first.partial).toBe(true);
    expect(first.total).toBeGreaterThanOrEqual(200);
    expect(first.providers.adsbfi_regions).toBeLessThan(REGION_COUNT);

    // ── Poll until the background build lands (what the old code made
    //    the FIRST response wait for) ──
    let full = first;
    let fullAtMs = firstPaintMs;
    while (full.partial) {
      const t = Date.now();
      full = await (await GET()).json();
      fullAtMs = Date.now() - t0;
      expect(fullAtMs).toBeLessThan(120_000);
      void t;
    }
    // The completed payload took the pacing-bound ~40s the sweep needs;
    // the first paint beat it by a wide margin.
    expect(fullAtMs).toBeGreaterThan(firstPaintMs + 15_000);

    // ── Completed payload: everything received is in it (no thinning
    //    to fake speed), Utah is covered, the heli is tagged ──
    const expectedTotal = 5 + (REGION_COUNT - 1) * PER_REGION + 12;
    expect(full.partial).toBe(false);
    expect(full.source).toBe('regional');
    expect(full.providers.adsbfi_regions).toBe(REGION_COUNT);
    expect(full.total).toBe(expectedTotal);
    expect(allFlights(full)).toHaveLength(expectedTotal);
    expect(full.diagnostics.dropped_invalid).toBe(0);

    const utah = allFlights(full).filter(
      (f: any) =>
        f.lat >= UTAH_BBOX.minLat && f.lat <= UTAH_BBOX.maxLat &&
        f.lng >= UTAH_BBOX.minLon && f.lng <= UTAH_BBOX.maxLon,
    );
    expect(utah).toHaveLength(12);
    const heli = allFlights(full).find((f: any) => f.callsign === 'N911UT');
    expect(heli?.aircraft_category).toBe('heli');

    // ── Cache: the next poll is served from the completed payload ──
    const tCache = Date.now();
    const cached = await (await GET()).json();
    expect(Date.now() - tCache).toBeLessThan(2_000);
    expect(cached.partial).toBe(false);
    expect(cached.total).toBe(expectedTotal);
  }, 180_000);
});
