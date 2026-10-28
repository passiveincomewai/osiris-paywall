import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET, clearMaritimeSnapshot, getLiveShipsForTracking, getOsirisShipType } from './route';

/* The route aggregates over the websocket-fed ship map on globalThis, so the
   tests drive it directly rather than standing up an AIS stream. */
interface Ship {
  id: number; mmsi: number; lat: number; lng: number;
  speed: number; type: string; name: string; timestamp: number;
}

const ships = () => (globalThis as unknown as { shipsCache: Map<number, Ship> }).shipsCache;

function addShip(mmsi: number, lat: number, lng: number) {
  ships().set(mmsi, {
    id: mmsi, mmsi, lat, lng, speed: 0, type: 'cargo',
    name: `SHIP-${mmsi}`, timestamp: Date.now(),
  });
}

describe('GET /api/maritime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    ships().clear();
    clearMaritimeSnapshot();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('still counts the ships sitting off a port', async () => {
    addShip(1, 1.26, 103.84); // on top of Singapore
    const body = await (await GET()).json();

    const singapore = body.ports.find((p: { name: string }) => p.name === 'Singapore');
    expect(singapore.volume).toContain('LIVE: 1');
    expect(singapore.volume).toContain('WAITING: 1');
    expect(body.total_ships).toBe(1);
  });

  it('serves one snapshot to every caller inside the TTL', async () => {
    addShip(1, 1.26, 103.84);
    const first = await (await GET()).json();

    vi.advanceTimersByTime(4_000);
    addShip(2, 1.27, 103.85);
    const second = await (await GET()).json();

    // The aggregation did not run again — the second caller got the first
    // caller's bytes, which is the whole point under load.
    expect(second).toEqual(first);
    expect(second.total_ships).toBe(1);
  });

  it('rebuilds once the TTL has passed', async () => {
    addShip(1, 1.26, 103.84);
    expect((await (await GET()).json()).total_ships).toBe(1);

    vi.advanceTimersByTime(5_000);
    addShip(2, 1.27, 103.85);
    expect((await (await GET()).json()).total_ships).toBe(2);
  });

  it('lets the browser and any CDN reuse the response', async () => {
    const res = await GET();
    const cc = res.headers.get('cache-control') ?? '';

    expect(cc).toContain('s-maxage=5');
    expect(cc).toContain('max-age=5');
    expect(cc).not.toContain('no-store');
    expect(res.headers.get('content-type')).toContain('application/json');
  });
});

describe('getOsirisShipType', () => {
  it('maps AIS passenger codes 60-69 to passenger (ferries and cruise ships)', () => {
    for (const code of [60, 61, 62, 63, 64, 65, 66, 67, 68, 69]) {
      expect(getOsirisShipType(code)).toBe('passenger');
    }
  });

  it('keeps the existing cargo, tanker and military ranges', () => {
    expect(getOsirisShipType(70)).toBe('cargo');
    expect(getOsirisShipType(79)).toBe('cargo');
    expect(getOsirisShipType(80)).toBe('tanker');
    expect(getOsirisShipType(89)).toBe('tanker');
    expect(getOsirisShipType(35)).toBe('military');
    expect(getOsirisShipType(0)).toBe('cargo');
    expect(getOsirisShipType(37)).toBe('cargo');
  });
});

describe('getLiveShipsForTracking', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    ships().clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns fresh records and prunes anything past the 10-minute window', () => {
    addShip(1, 47.6, -122.34);
    const stale = {
      id: 2, mmsi: 2, lat: 47.61, lng: -122.35, speed: 0, type: 'passenger',
      name: 'STALE', timestamp: Date.now() - 11 * 60 * 1000,
    };
    ships().set(2, stale);

    const live = getLiveShipsForTracking(Date.now());
    expect(live.map((s) => s.mmsi)).toEqual([1]);
    expect(ships().has(2)).toBe(false);
  });
});
