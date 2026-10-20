import { describe, it, expect } from 'vitest';
import {
  findRouteCameras,
  camerasAlongRoute,
  pointToSegment,
  ROUTE_CAMERA_CORRIDOR_M,
  ROUTE_CAMERA_CAP,
  type RouteCameraCandidate,
} from './route-cameras';

// A straight east–west route at 41.32°N, ~16.7 km over three vertices.
const ROUTE: [number, number][] = [
  [-112.0, 41.32],
  [-111.9, 41.32],
  [-111.8, 41.32],
];

// Metres → degrees latitude (longitude degrees stretch with latitude,
// latitude degrees do not, to this approximation).
const mNorth = (m: number) => m / 111_320;

const cam = (over: Partial<RouteCameraCandidate>): RouteCameraCandidate => ({
  id: 'cam-1',
  name: 'Test camera',
  lat: 41.32,
  lng: -111.95,
  stream_type: 'jpg',
  feed_url: 'https://example.com/feed.jpg',
  ...over,
});

describe('pointToSegment', () => {
  it('measures perpendicular distance and along-route progress', () => {
    const hit = pointToSegment(41.32 + mNorth(500), -111.95, ROUTE[0], ROUTE[1], 0);
    expect(hit.distanceM).toBeCloseTo(500, -1);
    // Halfway along the first leg (~8.35 km of the ~16.7 km route).
    expect(hit.alongM).toBeGreaterThan(3_800);
    expect(hit.alongM).toBeLessThan(4_600);
  });

  it('clamps to the endpoint past the segment end', () => {
    const hit = pointToSegment(41.32, -111.79, ROUTE[1], ROUTE[2], 8_350);
    expect(hit.distanceM).toBeGreaterThan(700);
    expect(hit.distanceM).toBeLessThan(950);
    // Past the last vertex: progress pins at the route's end.
    expect(hit.alongM).toBeGreaterThan(16_000);
  });

  it('survives a degenerate (duplicated) vertex', () => {
    const hit = pointToSegment(41.32, -111.95, [-111.95, 41.32], [-111.95, 41.32], 1234);
    expect(hit.distanceM).toBeCloseTo(0, 0);
    expect(hit.alongM).toBe(1234);
  });
});

describe('findRouteCameras', () => {
  it('keeps cameras inside the corridor and drops those outside', () => {
    const inside = cam({ id: 'near', lat: 41.32 + mNorth(1_200) });
    const outside = cam({ id: 'far', lat: 41.32 + mNorth(3_000) });
    const found = findRouteCameras([inside, outside], ROUTE);
    expect(found.map((c) => c.id)).toEqual(['near']);
    expect(found[0].distanceFromRouteM).toBeGreaterThan(1_100);
    expect(found[0].distanceFromRouteM).toBeLessThan(1_300);
  });

  it('respects a custom corridor', () => {
    const c = cam({ id: 'x', lat: 41.32 + mNorth(800) });
    expect(findRouteCameras([c], ROUTE, 500)).toEqual([]);
    expect(findRouteCameras([c], ROUTE, ROUTE_CAMERA_CORRIDOR_M)).toHaveLength(1);
  });

  it('orders by along-route progress, not input order', () => {
    const late = cam({ id: 'late', lng: -111.85 });
    const early = cam({ id: 'early', lng: -111.97 });
    const found = findRouteCameras([late, early], ROUTE);
    expect(found.map((c) => c.id)).toEqual(['early', 'late']);
    expect(found[0].alongRouteM).toBeLessThan(found[1].alongRouteM);
  });

  it('dedupes by id, keeping the record nearest the line', () => {
    const nearCopy = cam({ id: 'dup', lat: 41.32 + mNorth(100) });
    const farCopy = cam({ id: 'dup', lat: 41.32 + mNorth(900) });
    const found = findRouteCameras([farCopy, nearCopy], ROUTE);
    expect(found).toHaveLength(1);
    expect(found[0].distanceFromRouteM).toBeLessThan(200);
  });

  it('skips cameras with no previewable media — they are not feeds', () => {
    const hosted = cam({
      id: 'hosted',
      stream_type: 'iframe',
      feed_url: undefined,
      stream_url: undefined,
      external_url: 'https://example.com/watch',
    });
    expect(findRouteCameras([hosted], ROUTE)).toEqual([]);
  });

  it('skips records without usable coordinates or ids', () => {
    const junk = [
      cam({ id: 'a', lat: 'north' }),
      cam({ id: 'b', lng: undefined }),
      cam({ id: '' }),
      cam({ id: undefined }),
    ] as RouteCameraCandidate[];
    expect(findRouteCameras(junk, ROUTE)).toEqual([]);
  });

  it('needs a real polyline and a real catalogue', () => {
    expect(findRouteCameras([cam({})], [])).toEqual([]);
    expect(findRouteCameras([cam({})], [[-112, 41.32]])).toEqual([]);
    expect(findRouteCameras([], ROUTE)).toEqual([]);
    expect(findRouteCameras(undefined, ROUTE)).toEqual([]);
    expect(findRouteCameras([cam({})], undefined)).toEqual([]);
  });
});

describe('camerasAlongRoute', () => {
  it('caps the rendered feeds at ROUTE_CAMERA_CAP but keeps order', () => {
    const many = Array.from({ length: ROUTE_CAMERA_CAP + 6 }, (_, i) =>
      cam({ id: `c${i}`, lng: -112 + i * 0.006 }),
    );
    const feeds = camerasAlongRoute(many, ROUTE);
    expect(feeds).toHaveLength(ROUTE_CAMERA_CAP);
    expect(feeds[0].id).toBe('c0');
    // The uncapped finder sees them all — the teaser's honest count.
    expect(findRouteCameras(many, ROUTE)).toHaveLength(ROUTE_CAMERA_CAP + 6);
  });
});
