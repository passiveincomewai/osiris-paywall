import { describe, expect, it } from 'vitest';
import {
  EMPTY_FLIGHT_BUCKETS,
  FlightBlend,
  flightToFeature,
  flightsToFeatures,
  type FlightBuckets,
} from './render';

function flight(over: Record<string, unknown> = {}) {
  return {
    callsign: 'BAW117',
    lat: 51.5,
    lng: -0.12,
    alt: 11000,
    heading: 90,
    speed_knots: 450,
    model: 'A320',
    icao24: 'abc123',
    registration: 'G-TEST',
    grounded: false,
    ...over,
  };
}

function buckets(counts: Partial<Record<keyof FlightBuckets, number>>, hexBase = 0) {
  const mk = (n: number, seed: number) =>
    Array.from({ length: n }, (_, i) =>
      flight({ icao24: (seed + i).toString(16).padStart(6, '0') }),
    );
  return {
    commercial_flights: mk(counts.commercial_flights ?? 0, hexBase),
    private_flights: mk(counts.private_flights ?? 0, hexBase + 100000),
    private_jets: mk(counts.private_jets ?? 0, hexBase + 200000),
    military_flights: mk(counts.military_flights ?? 0, hexBase + 300000),
  } as FlightBuckets;
}

describe('flightToFeature / flightsToFeatures', () => {
  it('converts one record to the feature shape the map has always used', () => {
    const f = flightToFeature(flight());
    expect(f.type).toBe('Feature');
    expect(f.geometry).toEqual({ type: 'Point', coordinates: [-0.12, 51.5] });
    expect(f.properties).toEqual({
      callsign: 'BAW117',
      heading: 90,
      alt: 11000,
      model: 'A320',
      speed_knots: 450,
      registration: 'G-TEST',
      icao24: 'abc123',
    });
  });

  it('defaults a missing heading to 0', () => {
    expect(flightToFeature(flight({ heading: undefined })).properties.heading).toBe(0);
  });

  it('renders EVERY record — no decimation, no cap', () => {
    const arr = Array.from({ length: 7000 }, (_, i) =>
      flight({ icao24: i.toString(16).padStart(6, '0') }),
    );
    expect(flightsToFeatures(arr)).toHaveLength(7000);
    expect(flightsToFeatures([])).toEqual([]);
    expect(flightsToFeatures(undefined)).toEqual([]);
  });
});

describe('FlightBlend', () => {
  it('starts empty', () => {
    const blend = new FlightBlend();
    expect(blend.hasSnapshot).toBe(false);
    expect(blend.current(1_000_000)).toBe(EMPTY_FLIGHT_BUCKETS);
  });

  it('dead-reckons the lone snapshot until a second one brackets it', () => {
    const blend = new FlightBlend();
    const t0 = 1_000_000;
    blend.push(buckets({ commercial_flights: 1 }), t0);
    const now = blend.current(t0 + 60_000);
    // 450 kt eastbound for 60 s from lng -0.12 at lat 51.5 moves ~0.2° east.
    expect(now.commercial_flights).toHaveLength(1);
    expect(now.commercial_flights[0].lng).toBeGreaterThan(-0.12 + 0.1);
    expect(now.commercial_flights[0].lat).toBeCloseTo(51.5, 2);
  });

  it('blends between bracketing snapshots and keeps the newest set whole', () => {
    const blend = new FlightBlend();
    const t0 = 1_000_000;
    const first = buckets({ commercial_flights: 3, private_flights: 2 });
    blend.push(first, t0);
    // Second snapshot 30 s later: same aircraft, each 0.3° further east.
    const second = {
      ...first,
      commercial_flights: first.commercial_flights.map((f) => ({ ...f, lng: f.lng + 0.3 })),
      private_flights: first.private_flights.map((f) => ({ ...f, lng: f.lng + 0.3 })),
    } as FlightBuckets;
    blend.push(second, t0 + 30_000);

    const mid = blend.current(t0 + 45_000); // halfway through the render interval
    expect(mid.commercial_flights).toHaveLength(3);
    expect(mid.private_flights).toHaveLength(2);
    for (const f of mid.commercial_flights) {
      expect(f.lng).toBeCloseTo(-0.12 + 0.15, 3);
    }
    // At the end of the interval the render reaches the newest fixes.
    const end = blend.current(t0 + 60_000);
    expect(end.commercial_flights[0].lng).toBeCloseTo(-0.12 + 0.3, 3);
  });

  it('received count == rendered count per class, snapshot after snapshot', () => {
    const blend = new FlightBlend();
    const t0 = 1_000_000;
    const counts = {
      commercial_flights: 5814,
      private_flights: 523,
      private_jets: 94,
      military_flights: 51,
    };
    blend.push(buckets(counts, 0), t0);
    blend.push(buckets(counts, 7), t0 + 30_000); // same sizes, shifted hexes
    for (const at of [t0 + 30_000, t0 + 45_000, t0 + 59_000]) {
      const cur = blend.current(at);
      expect(cur.commercial_flights).toHaveLength(counts.commercial_flights);
      expect(cur.private_flights).toHaveLength(counts.private_flights);
      expect(cur.private_jets).toHaveLength(counts.private_jets);
      expect(cur.military_flights).toHaveLength(counts.military_flights);
      // …and the features produced from them match too.
      expect(flightsToFeatures(cur.commercial_flights)).toHaveLength(counts.commercial_flights);
      expect(flightsToFeatures(cur.private_flights)).toHaveLength(counts.private_flights);
      expect(flightsToFeatures(cur.private_jets)).toHaveLength(counts.private_jets);
      expect(flightsToFeatures(cur.military_flights)).toHaveLength(counts.military_flights);
    }
  });

  it('ignores an all-empty push once a real snapshot is held', () => {
    const blend = new FlightBlend();
    const t0 = 1_000_000;
    blend.push(buckets({ commercial_flights: 2 }), t0);
    blend.push(buckets({}), t0 + 30_000);
    expect(blend.current(t0 + 31_000).commercial_flights).toHaveLength(2);
  });

  it('treats re-pushing the identical payload as a no-op', () => {
    const blend = new FlightBlend();
    const t0 = 1_000_000;
    const snap = buckets({ commercial_flights: 1 });
    blend.push(snap, t0);
    blend.push(snap, t0 + 5_000); // same references — must not become its own prev
    const cur = blend.current(t0 + 65_000);
    // Still the lone-snapshot path: dead reckoning advanced it a full 60 s.
    expect(cur.commercial_flights[0].lng).toBeGreaterThan(-0.12 + 0.1);
  });
});

// Live count proof — opt in with RUN_LIVE_TESTS=1 and FLIGHTS_PROOF_URL
// pointing at a running server (default http://localhost:3000). Fetches the
// real /api/flights payload twice, pushes both snapshots through the exact
// conversion + blending the map runs, and asserts the feature counts equal
// the route's per-class record counts. Skipped in the normal suite.
const liveIt = process.env.RUN_LIVE_TESTS === '1' ? it : it.skip;
describe('live received-vs-rendered count proof', () => {
  liveIt(
    'features produced == records received, per class',
    async () => {
      const base = process.env.FLIGHTS_PROOF_URL || 'http://localhost:3000';
      const get = async () => {
        const res = await fetch(`${base}/api/flights`);
        expect(res.ok).toBe(true);
        return res.json();
      };
      const first = await get();
      const blend = new FlightBlend();
      blend.push(first, Date.now());
      const second = await get();
      blend.push(second, Date.now());

      const cur = blend.current(Date.now() + 15_000);
      const pairs: [keyof FlightBuckets, any[]][] = [
        ['commercial_flights', second.commercial_flights || []],
        ['private_flights', second.private_flights || []],
        ['private_jets', second.private_jets || []],
        ['military_flights', second.military_flights || []],
      ];
      let total = 0;
      for (const [key, received] of pairs) {
        const features = flightsToFeatures(cur[key]);
        expect(features).toHaveLength(received.length);
        total += received.length;
      }
      expect(total).toBeGreaterThan(0);
    },
    240_000,
  );
});
