import { describe, expect, it } from 'vitest';
import {
  cameraCandidateFromFeature,
  collectCameraCandidates,
  findNearestCameras,
  type CameraCandidate,
} from './nearby-cameras';

// ~111 m north of the origin per 0.001° of latitude — handy for fixtures.
const cam = (id: string, lat: number, lng: number): CameraCandidate => ({ id, name: `Cam ${id}`, lat, lng });

describe('findNearestCameras', () => {
  const at: [number, number] = [0, 0];
  const cameras = [
    cam('far', 0.01, 0),      // ~1.11 km
    cam('near', 0.001, 0),    // ~111 m
    cam('outside', 0.02, 0),  // ~2.22 km — beyond the 1.5 km default radius
    cam('mid', 0.005, 0),     // ~556 m
  ];

  it('returns nearest-first within the default 1.5 km radius', () => {
    const near = findNearestCameras(cameras, at);
    expect(near.map((x) => x.camera.id)).toEqual(['near', 'mid', 'far']);
    expect(near[0].distanceM).toBeGreaterThan(100);
    expect(near[0].distanceM).toBeLessThan(125);
  });

  it('honours an explicit radius and cap', () => {
    expect(findNearestCameras(cameras, at, { radiusM: 200 }).map((x) => x.camera.id)).toEqual(['near']);
    const many = Array.from({ length: 9 }, (_, i) => cam(`c${i}`, 0.001 * (i + 1), 0));
    expect(findNearestCameras(many, at, { max: 3 })).toHaveLength(3);
    expect(findNearestCameras(many, at)).toHaveLength(5); // CAMERA_SEARCH_MAX default
  });

  it('excludes records without usable coordinates instead of reporting them near', () => {
    const broken = [
      { id: 'nope', lat: undefined, lng: 0 },
      { id: 'nan', lat: NaN, lng: NaN },
      cam('ok', 0.001, 0),
    ] as any[];
    expect(findNearestCameras(broken, at).map((x) => x.camera.id)).toEqual(['ok']);
  });

  it('handles empty and missing input', () => {
    expect(findNearestCameras([], at)).toEqual([]);
    expect(findNearestCameras(undefined as any, at)).toEqual([]);
  });
});

describe('cameraCandidateFromFeature', () => {
  it('normalises a rendered cctv feature, taking lat/lng from geometry', () => {
    const cand = cameraCandidateFromFeature(
      { id: 7, name: 'I-15 @ 1000 N', city: 'Salt Lake City', feed_url: 'https://x', stream_type: 'hls' },
      [-111.9, 40.77],
    );
    expect(cand).toMatchObject({ id: 7, name: 'I-15 @ 1000 N', lat: 40.77, lng: -111.9 });
  });

  it('rejects features with no id or no usable geometry', () => {
    expect(cameraCandidateFromFeature({ name: 'x' }, [0, 0])).toBeNull();
    expect(cameraCandidateFromFeature({ id: 1 }, null)).toBeNull();
    expect(cameraCandidateFromFeature({ id: 1 }, ['a', 'b'])).toBeNull();
  });
});

describe('collectCameraCandidates', () => {
  const feature = (id: number, lng: number, lat: number) => ({
    properties: { id, name: `F${id}` },
    geometry: { coordinates: [lng, lat] },
  });

  it('prefers source features and dedupes by id', () => {
    const out = collectCameraCandidates([feature(1, 0, 0), feature(1, 0.001, 0.001), feature(2, 0, 0)], [cam('fb', 0, 0)]);
    expect(out.map((c) => c.id)).toEqual([1, 2]);
  });

  it('falls back to the page catalogue only when the source is empty', () => {
    const fallback = [cam('a', 1, 1), cam('b', 2, 2), { id: 'bad', lat: 'x' } as any];
    const out = collectCameraCandidates([], fallback);
    expect(out.map((c) => c.id)).toEqual(['a', 'b']);
    expect(collectCameraCandidates([feature(9, 0, 0)], fallback).map((c) => c.id)).toEqual([9]);
  });
});
