import { describe, expect, it } from 'vitest';
import {
  FLIGHT_PATH_FLOWN_LABEL,
  FLIGHT_PATH_ROUTE_LABEL,
  TRAIL_MAX_POINTS,
  airportCode,
  beginRouteFetch,
  createFlightPath,
  flightPathAccess,
  flightPathFeatures,
  flightPathHudData,
  haversineKm,
  noteFlightPathFix,
  parseFlightRouteResponse,
  pushTrailPoint,
  resolveFlightPathRoute,
  routeProgress,
  unwrapLngPath,
  type FlightRouteData,
  type TrailPoint,
} from './path';

// A straight equatorial route, 10° of longitude ≈ 1111.9 km, with the
// arc sampled every 2° so projection fractions are easy to reason about.
const EQUATOR_ROUTE: FlightRouteData = {
  origin: { iata: 'AAA', icao: 'KAAA', city: 'Alpha', lat: 0, lng: 0 },
  destination: { iata: 'BBB', icao: 'KBBB', city: 'Beta', lat: 0, lng: 10 },
  arc: [[0, 0], [2, 0], [4, 0], [6, 0], [8, 0], [10, 0]],
  totalDistanceKm: 1112,
};

describe('flightPathAccess — the Pro gate', () => {
  it('grants Pro only for an active subscription on the session user', () => {
    expect(flightPathAccess({ user: { subscriptionStatus: 'active' } })).toBe('pro');
    expect(flightPathAccess({ user: { subscriptionStatus: 'past_due' } })).toBe('free');
    expect(flightPathAccess({ user: {} })).toBe('free');
  });

  it('distinguishes a signed-out session from one that has not loaded', () => {
    expect(flightPathAccess({})).toBe('signed-out');
    expect(flightPathAccess({ user: null })).toBe('signed-out');
    expect(flightPathAccess(null)).toBe('unknown');
    expect(flightPathAccess(undefined)).toBe('unknown');
    expect(flightPathAccess('nope')).toBe('unknown');
  });
});

describe('parseFlightRouteResponse', () => {
  it('accepts a found route with a real arc', () => {
    const route = parseFlightRouteResponse({
      found: true,
      origin: { iata: 'PVG', icao: 'ZSPD', city: 'Shanghai', lat: 31.14, lng: 121.8 },
      destination: { iata: 'ANC', icao: 'PANC', city: 'Anchorage', lat: 61.17, lng: -149.98 },
      arc: [[121.8, 31.14], [170, 55], [-149.98, 61.17]],
      totalDistanceKm: 6919,
    });
    expect(route).not.toBeNull();
    expect(route!.origin.iata).toBe('PVG');
    expect(route!.destination.icao).toBe('PANC');
    expect(route!.arc).toHaveLength(3);
    expect(route!.totalDistanceKm).toBe(6919);
  });

  it('returns null when the lookup found nothing — never an invented route', () => {
    expect(parseFlightRouteResponse({ found: false, callsign: 'XXX1' })).toBeNull();
    expect(parseFlightRouteResponse(null)).toBeNull();
    expect(parseFlightRouteResponse({})).toBeNull();
  });

  it('returns null when an endpoint has no usable coordinates', () => {
    expect(parseFlightRouteResponse({
      found: true,
      origin: { iata: 'PVG', lat: 'east', lng: 121.8 },
      destination: { iata: 'ANC', lat: 61.17, lng: -149.98 },
      arc: [[121.8, 31.14], [-149.98, 61.17]],
    })).toBeNull();
  });

  it('falls back to the endpoint pair when the arc is unusable', () => {
    const route = parseFlightRouteResponse({
      found: true,
      origin: { iata: 'AAA', icao: 'KAAA', city: 'Alpha', lat: 0, lng: 0 },
      destination: { iata: 'BBB', icao: 'KBBB', city: 'Beta', lat: 0, lng: 10 },
      arc: [['x', 'y']],
    });
    expect(route).not.toBeNull();
    expect(route!.arc).toEqual([[0, 0], [10, 0]]);
    // Distance was absent: computed from the endpoints, not invented.
    expect(route!.totalDistanceKm).toBeCloseTo(1111.9, 0);
  });
});

describe('pushTrailPoint — session flown trail', () => {
  const t0 = 1_000_000;

  it('records the first fix and each genuinely new one', () => {
    let trail: TrailPoint[] = [];
    trail = pushTrailPoint(trail, { lat: 51.5, lng: -0.12 }, t0);
    expect(trail).toHaveLength(1);
    // ~19 km in 2 minutes — a climbing airliner, under the plausibility cap.
    trail = pushTrailPoint(trail, { lat: 51.6, lng: 0.1 }, t0 + 120_000);
    expect(trail).toHaveLength(2);
    expect(trail[1]).toEqual({ lng: 0.1, lat: 51.6, at: t0 + 120_000 });
  });

  it('ignores a re-delivered identical fix (the same array comes back)', () => {
    const trail = pushTrailPoint([], { lat: 51.5, lng: -0.12 }, t0);
    const again = pushTrailPoint(trail, { lat: 51.5, lng: -0.12 }, t0 + 30_000);
    expect(again).toBe(trail);
  });

  it('ignores sub-step jitter around a parked position', () => {
    const trail = pushTrailPoint([], { lat: 51.5, lng: -0.12 }, t0);
    // ~11 m north — GPS noise, not motion.
    const jitter = pushTrailPoint(trail, { lat: 51.5001, lng: -0.12 }, t0 + 30_000);
    expect(jitter).toBe(trail);
  });

  it('restarts the trail instead of drawing a line across the map on a teleport', () => {
    let trail = pushTrailPoint([], { lat: 51.5, lng: -0.12 }, t0);
    trail = pushTrailPoint(trail, { lat: 51.6, lng: 0.1 }, t0 + 120_000);
    // ~5,900 km in 30 s — a feed glitch / re-acquired target, not flight.
    const jumped = pushTrailPoint(trail, { lat: 35.7, lng: 139.7 }, t0 + 150_000);
    expect(jumped).toHaveLength(1);
    expect(jumped[0]).toEqual({ lng: 139.7, lat: 35.7, at: t0 + 150_000 });
  });

  it('caps the trail, dropping the oldest fixes', () => {
    let trail: TrailPoint[] = [];
    const total = TRAIL_MAX_POINTS + 25;
    for (let i = 0; i < total; i++) {
      trail = pushTrailPoint(trail, { lat: 0, lng: i * 0.01 }, t0 + i * 30_000);
    }
    expect(trail).toHaveLength(TRAIL_MAX_POINTS);
    expect(trail[0].lng).toBeCloseTo(25 * 0.01, 5);
    expect(trail[trail.length - 1].lng).toBeCloseTo((total - 1) * 0.01, 5);
  });

  it('ignores fixes without usable coordinates', () => {
    const trail: TrailPoint[] = [];
    expect(pushTrailPoint(trail, { lat: 'x', lng: 0 }, t0)).toBe(trail);
    expect(pushTrailPoint(trail, { lat: 91, lng: 0 }, t0)).toBe(trail);
    expect(pushTrailPoint(trail, null as never, t0)).toBe(trail);
  });
});

describe('routeProgress — real distance math', () => {
  it('reads 0 at the origin and 1 at the destination', () => {
    expect(routeProgress(EQUATOR_ROUTE, 0, 0)!.fraction).toBeCloseTo(0, 2);
    expect(routeProgress(EQUATOR_ROUTE, 10, 0)!.fraction).toBeCloseTo(1, 2);
  });

  it('reads halfway at the arc midpoint, with along + remaining = total', () => {
    const p = routeProgress(EQUATOR_ROUTE, 5, 0)!;
    expect(p.fraction).toBeCloseTo(0.5, 2);
    expect(p.point[0]).toBeCloseTo(5, 1);
    expect(p.alongKm + p.remainingKm).toBeCloseTo(p.totalKm, 6);
    expect(p.totalKm).toBeCloseTo(1111.9, 0);
  });

  it('projects an off-route position onto the nearest arc point', () => {
    // 3° north of the 4° arc vertex: nearest route point is ~(4, 0).
    const p = routeProgress(EQUATOR_ROUTE, 4, 3)!;
    expect(p.point[0]).toBeCloseTo(4, 1);
    expect(p.point[1]).toBeCloseTo(0, 1);
    expect(p.fraction).toBeCloseTo(0.4, 1);
  });

  it('clamps past-the-end positions to the destination', () => {
    const p = routeProgress(EQUATOR_ROUTE, 14, 0)!;
    expect(p.fraction).toBe(1);
    expect(p.remainingKm).toBe(0);
  });

  it('returns null for an unusable position', () => {
    expect(routeProgress(EQUATOR_ROUTE, NaN, 0)).toBeNull();
  });
});

describe('unwrapLngPath', () => {
  it('keeps a transpacific arc continuous across the antimeridian', () => {
    const out = unwrapLngPath([[170, 55], [179, 60], [-179, 62], [-170, 61]]);
    expect(out.map((c) => c[0])).toEqual([170, 179, 181, 190]);
  });

  it('leaves an ordinary path untouched', () => {
    expect(unwrapLngPath([[0, 0], [5, 1], [10, 0]])).toEqual([[0, 0], [5, 1], [10, 0]]);
  });
});

describe('path state machine + features', () => {
  it('walks idle → loading → found / unavailable exactly once', () => {
    let s = createFlightPath('abc123', 'BAW117');
    expect(s.routeStatus).toBe('idle');
    s = beginRouteFetch(s);
    expect(s.routeStatus).toBe('loading');
    expect(beginRouteFetch(s)).toBe(s); // no second fetch
    const found = resolveFlightPathRoute(s, EQUATOR_ROUTE);
    expect(found.routeStatus).toBe('found');
    const missing = resolveFlightPathRoute(s, null);
    expect(missing.routeStatus).toBe('unavailable');
    expect(missing.route).toBeNull();
  });

  it('noteFlightPathFix returns the same state for a duplicate fix', () => {
    let s = createFlightPath('abc123', 'BAW117');
    s = noteFlightPathFix(s, { lat: 0, lng: 0 }, 1_000);
    expect(s.trail).toHaveLength(1);
    expect(noteFlightPathFix(s, { lat: 0, lng: 0 }, 31_000)).toBe(s);
  });

  it('builds route + flown + endpoints + progress features for a found route', () => {
    let s = resolveFlightPathRoute(createFlightPath('abc123', 'BAW117'), EQUATOR_ROUTE);
    s = noteFlightPathFix(s, { lat: 0, lng: 0 }, 1_000);
    // 222 km in 15 minutes — cruise speed, so the trail keeps both fixes.
    s = noteFlightPathFix(s, { lat: 0, lng: 2 }, 901_000);
    const features = flightPathFeatures(s, { lng: 5, lat: 0 });
    const kinds = features.map((f) => f.properties.kind);
    expect(kinds).toEqual(['route', 'flown', 'origin', 'destination', 'progress']);
    expect(features[0].properties.label).toBe(FLIGHT_PATH_ROUTE_LABEL);
    expect(features[1].properties.label).toBe(FLIGHT_PATH_FLOWN_LABEL);
    const progress = features.find((f) => f.properties.kind === 'progress')!;
    expect(progress.properties.pct).toBe(50);
  });

  it('builds the flown trail only when the route is unavailable — no fake line', () => {
    let s = resolveFlightPathRoute(createFlightPath('abc123', 'BAW117'), null);
    s = noteFlightPathFix(s, { lat: 0, lng: 0 }, 1_000);
    s = noteFlightPathFix(s, { lat: 0, lng: 2 }, 901_000);
    const features = flightPathFeatures(s, { lng: 5, lat: 0 });
    expect(features.map((f) => f.properties.kind)).toEqual(['flown']);
  });

  it('needs two fixes before the flown line exists', () => {
    const s = resolveFlightPathRoute(createFlightPath('abc123', 'BAW117'), null);
    expect(flightPathFeatures(noteFlightPathFix(s, { lat: 0, lng: 0 }, 1_000), null)).toEqual([]);
  });
});

describe('flightPathHudData', () => {
  it('reports codes, real progress and the trail count', () => {
    let s = resolveFlightPathRoute(createFlightPath('abc123', 'BAW117'), EQUATOR_ROUTE);
    s = noteFlightPathFix(s, { lat: 0, lng: 0 }, 1_000);
    const hud = flightPathHudData(s, 'pro', { lng: 5, lat: 0 });
    expect(hud.originCode).toBe('AAA');
    expect(hud.destinationCode).toBe('BBB');
    expect(hud.progressPct).toBe(50);
    expect(hud.trailPoints).toBe(1);
  });

  it('keeps progress null — never invented — without a route', () => {
    const s = resolveFlightPathRoute(createFlightPath('abc123', 'BAW117'), null);
    const hud = flightPathHudData(s, 'pro', { lng: 5, lat: 0 });
    expect(hud.progressPct).toBeNull();
    expect(hud.routeStatus).toBe('unavailable');
  });

  it('handles no active follow', () => {
    const hud = flightPathHudData(null, 'free', null);
    expect(hud).toEqual({
      access: 'free', routeStatus: 'idle',
      originCode: null, destinationCode: null,
      progressPct: null, trailPoints: 0,
    });
  });
});

describe('haversineKm + airportCode', () => {
  it('measures a degree of longitude at the equator', () => {
    expect(haversineKm(0, 0, 0, 1)).toBeCloseTo(111.19, 1);
  });

  it('prefers IATA and falls back to ICAO', () => {
    expect(airportCode({ iata: 'PVG', icao: 'ZSPD', city: '', lat: 0, lng: 0 })).toBe('PVG');
    expect(airportCode({ iata: '', icao: 'ZSPD', city: '', lat: 0, lng: 0 })).toBe('ZSPD');
  });
});
