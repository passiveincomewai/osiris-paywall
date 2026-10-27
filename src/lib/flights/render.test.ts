import { describe, expect, it } from 'vitest';
import {
  EMPTY_FLIGHT_BUCKETS,
  FlightBlend,
  flightIconImage,
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
      model_name: '',
      speed_knots: 450,
      registration: 'G-TEST',
      icao24: 'abc123',
      aircraft_category: 'plane',
    });
  });

  it('carries the route\'s helicopter tag through to the feature', () => {
    expect(flightToFeature(flight({ aircraft_category: 'heli' })).properties.aircraft_category).toBe('heli');
    // Anything unrecognised stays a plane — the icon never guesses a heli.
    expect(flightToFeature(flight({ aircraft_category: 'ufo' })).properties.aircraft_category).toBe('plane');
    expect(flightToFeature(flight({ aircraft_category: undefined })).properties.aircraft_category).toBe('plane');
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

describe('flightIconImage', () => {
  // Minimal evaluator for the expression subset flightIconImage emits
  // ('case' / '==' / 'get' / literals), so the test resolves the icon
  // the same way MapLibre's per-feature evaluation does.
  function evaluate(expr: any, props: Record<string, unknown>): unknown {
    if (!Array.isArray(expr)) return expr;
    const [op, ...rest] = expr;
    if (op === 'get') return props[rest[0] as string];
    if (op === '==') return evaluate(rest[0], props) === evaluate(rest[1], props);
    if (op === 'case') {
      for (let i = 0; i + 1 < rest.length; i += 2) {
        if (evaluate(rest[i], props)) return evaluate(rest[i + 1], props);
      }
      return evaluate(rest[rest.length - 1], props);
    }
    throw new Error(`unsupported op ${op}`);
  }

  it('resolves a heli-tagged feature to the helicopter glyph, per class colour', () => {
    const pairs: Array<[string, string]> = [
      ['plane-cyan', 'heli-cyan'],
      ['plane-green', 'heli-green'],
      ['plane-pink', 'heli-pink'],
      ['plane-red', 'heli-red'],
    ];
    for (const [planeIcon, heliIcon] of pairs) {
      const expr = flightIconImage(planeIcon, heliIcon);
      const heliFeature = flightToFeature(flight({ aircraft_category: 'heli' }));
      expect(evaluate(expr, heliFeature.properties)).toBe(heliIcon);
    }
  });

  it('resolves plane and untagged features to the plane glyph — never guesses a heli', () => {
    const expr = flightIconImage('plane-cyan', 'heli-cyan');
    expect(evaluate(expr, flightToFeature(flight()).properties)).toBe('plane-cyan');
    expect(evaluate(expr, flightToFeature(flight({ aircraft_category: undefined })).properties)).toBe('plane-cyan');
    expect(evaluate(expr, {})).toBe('plane-cyan');
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

  it('treats a re-delivered snapshot (same feed timestamp, fresh JSON) as a no-op', () => {
    const blend = new FlightBlend();
    const t0 = 1_000_000;
    const fixAt = t0 - 5_000; // when the feed generated the snapshot
    blend.push(buckets({ commercial_flights: 1 }), t0, fixAt);
    // 30 s later the client polls again; the server cache returns the SAME
    // snapshot, re-parsed — new array references, same feed timestamp.
    // It must not become the new bracket (that froze motion, then made the
    // next real snapshot sprint — the stutter-step glitch).
    const redelivered = buckets({ commercial_flights: 1 });
    blend.push(redelivered, t0 + 30_000, fixAt);
    const cur = blend.current(t0 + 60_000);
    // Still the lone-snapshot path: dead reckoning advanced it a full 60 s.
    expect(cur.commercial_flights[0].lng).toBeGreaterThan(-0.12 + 0.1);
    // And a genuinely new snapshot (new feed timestamp) IS accepted.
    const fresh = {
      ...redelivered,
      commercial_flights: redelivered.commercial_flights.map((f) => ({ ...f, lng: f.lng + 0.3 })),
    } as FlightBuckets;
    blend.push(fresh, t0 + 90_000, fixAt + 90_000);
    const end = blend.current(t0 + 180_000);
    expect(end.commercial_flights[0].lng).toBeCloseTo(-0.12 + 0.3, 3);
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

describe('FlightBlend.timing — fix-age derivation for the follow HUD', () => {
  it('is null before any snapshot', () => {
    expect(new FlightBlend().timing(1_000)).toBeNull();
  });

  it('reports the pushed feed timestamp as the newest fix time', () => {
    const blend = new FlightBlend();
    blend.push(buckets({ commercial_flights: 3 }), 10_000, 9_400);
    const t = blend.timing(10_000);
    expect(t).not.toBeNull();
    expect(t!.hasPrev).toBe(false);
    expect(t!.nextFixAt).toBe(9_400);
    // A lone snapshot is dead-reckoned: no bracket, alpha reads 1.
    expect(t!.alpha).toBe(1);
  });

  it('defaults the fix time to arrival when none is supplied', () => {
    const blend = new FlightBlend();
    blend.push(buckets({ commercial_flights: 1 }), 42_000);
    expect(blend.timing(42_000)!.nextFixAt).toBe(42_000);
  });

  it('rotates fix times with the snapshots and blends alpha across the interval', () => {
    const blend = new FlightBlend();
    blend.push(buckets({ commercial_flights: 2 }), 1_000, 900);
    blend.push(buckets({ commercial_flights: 2 }), 31_000, 30_500);
    const t = blend.timing(46_000);
    expect(t!.hasPrev).toBe(true);
    expect(t!.prevFixAt).toBe(900);
    expect(t!.nextFixAt).toBe(30_500);
    // Halfway through the 30 s interval that follows the second arrival.
    expect(t!.alpha).toBeCloseTo(0.5, 5);
  });

  it('clamps alpha at 1 once the interval has fully elapsed', () => {
    const blend = new FlightBlend();
    blend.push(buckets({ commercial_flights: 1 }), 1_000, 900);
    blend.push(buckets({ commercial_flights: 1 }), 31_000, 30_500);
    expect(blend.timing(500_000)!.alpha).toBe(1);
  });
});

// ── Heli legibility + real-evaluator contract (2026-10-26 bug) ─────
// Field report: live helicopters showed NOTHING at zooms 9/15/16 while
// planes around them rendered. The data path (route tag → delta merge →
// blend → features) and the icon-image expression both verify — the
// divergence is optical: the heli photo's bright core is ~9% of its
// frame vs ~19% for the plane photos, and the layers' icon-size stops
// growing at zoom 10 (1.0 = 24 logical px), so the heli's readable mass
// lands at roughly half a plane's and its dark rotor vanishes against
// the basemap. These tests evaluate the layers' layout expressions
// with MapLibre's OWN style-spec evaluator (maplibre-gl 6.7's pinned
// @maplibre/maplibre-gl-style-spec) — not a toy re-implementation —
// over features built from a realistic route payload, and pin that a
// heli feature resolves to a heli icon at a size that compensates.
import { createExpression } from '@maplibre/maplibre-gl-style-spec';
import * as renderModule from './render';
import { applyFlightsDelta, type FlightsPayloadLike } from './delta';

function evaluateWithMapLibre(expr: any, spec: Record<string, unknown>, props: Record<string, unknown>, zoom: number): unknown {
  const res = (createExpression as any)(expr, spec);
  if (res.result === 'error') throw new Error(res.value.map((e: any) => e.message).join('; '));
  return res.value.evaluate(
    { zoom },
    { type: 'Feature', properties: props, geometry: { type: 'Point', coordinates: [0, 0] } },
    {},
    null,
    ['plane-cyan', 'heli-cyan', 'plane-green', 'heli-green', 'plane-pink', 'heli-pink', 'plane-red', 'heli-red'],
  );
}

const ICON_SPEC = { type: 'resolvedImage', 'property-type': 'data-driven', expression: { interpolated: false, parameters: ['zoom', 'feature'] } };
const SIZE_SPEC = { type: 'number', 'property-type': 'data-driven', expression: { interpolated: true, parameters: ['zoom', 'feature'] } };

/** Records exactly as classifyFlight emits them (route.ts). */
function routeRecord(over: Record<string, unknown> = {}) {
  return {
    callsign: 'BAW117', lat: 51.5, lng: -0.12, alt: 11000, heading: 90,
    speed_knots: 450, model: 'A320', model_name: 'Airbus A320',
    icao24: 'abc123', registration: 'G-TEST', squawk: '', airline_code: 'BAW',
    aircraft_category: 'plane', category: 'commercial', grounded: false,
    nac_p: 8, type: 'flight', ...over,
  };
}

function realisticPayload(): FlightsPayloadLike {
  return {
    commercial_flights: [routeRecord()],
    private_flights: [
      routeRecord({
        callsign: 'N514MT', model: 'B407', model_name: 'Bell 407', icao24: 'a514mt',
        registration: 'N514MT', airline_code: '', aircraft_category: 'heli',
        category: 'private', lat: 39.7, lng: -105.5, alt: 2800, speed_knots: 110,
      }),
      routeRecord({
        callsign: 'N311PH', model: 'H135', model_name: 'Airbus H135', icao24: 'a311ph',
        registration: 'N311PH', airline_code: '', aircraft_category: 'heli',
        category: 'private', lat: 40.1, lng: -74.5, alt: 1500, speed_knots: 120,
      }),
    ],
    private_jets: [],
    military_flights: [routeRecord({
      callsign: '72166', model: 'H145', model_name: 'Airbus H145', icao24: 'ae1fb5',
      registration: '', airline_code: '', aircraft_category: 'heli',
      category: 'military', lat: 36.2, lng: -115.1, alt: 3000, speed_knots: 130,
    })],
    token: 'f1',
  };
}

describe('heli rendering contract — real MapLibre evaluator over the full client pipeline', () => {
  it('resolves every heli in every bucket to its heli icon, planes to plane icons', () => {
    const blend = new FlightBlend();
    blend.push(realisticPayload(), 1_000_000, 999_000);
    const moved = realisticPayload();
    moved.private_flights = moved.private_flights.map((f: any) => ({ ...f, lng: f.lng + 0.05 }));
    blend.push(moved, 1_030_000, 1_029_000);
    const cur = blend.current(1_045_000);
    const layers: Array<[keyof FlightBuckets, string, string]> = [
      ['commercial_flights', 'plane-cyan', 'heli-cyan'],
      ['private_flights', 'plane-green', 'heli-green'],
      ['private_jets', 'plane-pink', 'heli-pink'],
      ['military_flights', 'plane-red', 'heli-red'],
    ];
    for (const [bucket, planeIcon, heliIcon] of layers) {
      for (const feature of flightsToFeatures(cur[bucket])) {
        const resolved = evaluateWithMapLibre(renderModule.flightIconImage(planeIcon, heliIcon), ICON_SPEC, feature.properties, 9);
        expect(resolved).toBe(feature.properties.aircraft_category === 'heli' ? heliIcon : planeIcon);
      }
    }
  });

  it('keeps the heli tag when a delta patch (position only) moves the aircraft', () => {
    const held = realisticPayload();
    const merged = applyFlightsDelta(held, {
      delta: true, base: 'f1', token: 'f2',
      upserts: { private_flights: [{ icao24: 'a514mt', lat: 39.8, lng: -105.4, heading: 130, alt: 2900, speed_knots: 115 }] },
      removed: [],
    });
    expect(merged).not.toBeNull();
    const heli = merged!.private_flights.find((f: any) => f.icao24 === 'a514mt');
    const feature = flightToFeature(heli);
    expect(feature.properties.aircraft_category).toBe('heli');
    expect(evaluateWithMapLibre(renderModule.flightIconImage('plane-green', 'heli-green'), ICON_SPEC, feature.properties, 9)).toBe('heli-green');
  });

  it('sizes a heli feature materially larger than a plane at the same zoom (photo bright-core compensation)', () => {
    expect(typeof (renderModule as any).flightIconSize).toBe('function');
    const sizeExpr = (renderModule as any).flightIconSize();
    const heliProps = flightToFeature(routeRecord({ aircraft_category: 'heli' })).properties;
    const planeProps = flightToFeature(routeRecord({ aircraft_category: 'plane' })).properties;
    // The plane branch must keep the layers' long-standing size stops.
    expect(evaluateWithMapLibre(sizeExpr, SIZE_SPEC, planeProps, 1)).toBeCloseTo(0.4, 5);
    expect(evaluateWithMapLibre(sizeExpr, SIZE_SPEC, planeProps, 5)).toBeCloseTo(0.7, 5);
    expect(evaluateWithMapLibre(sizeExpr, SIZE_SPEC, planeProps, 15)).toBeCloseTo(1.0, 5);
    for (const zoom of [5, 9, 15]) {
      const hs = Number(evaluateWithMapLibre(sizeExpr, SIZE_SPEC, heliProps, zoom));
      const ps = Number(evaluateWithMapLibre(sizeExpr, SIZE_SPEC, planeProps, zoom));
      expect(hs).toBeGreaterThanOrEqual(ps * 1.5);
    }
  });
});
