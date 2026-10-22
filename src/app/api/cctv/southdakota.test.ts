import { describe, it, expect } from 'vitest';
import { mapFeature, fetchSouthDakotaCameras, type SdFeature } from './southdakota';

// A representative feature from icons.cameras.geojson (verified live 2026-10-22)
const sample: SdFeature = {
  id: 'CSDATY',
  geometry: { type: 'Point', coordinates: [-97.06, 44.95] } as SdFeature['geometry'],
  properties: {
    name: 'Watertown North',
    route: 'I-29',
    cameras: [
      {
        id: '1',
        name: 'Camera Looking South',
        description: 'Watertown-north of town along I-29 @ MP 179 looking south',
        image: 'https://sd.cdn.iteris-atis.com/camera_images/CSDATY/1/latest.jpg',
      },
      {
        id: '4',
        name: 'Road Surface View',
        description: 'Watertown-north of town along I-29 @ MP 179 road surface',
        image: 'https://sd.cdn.iteris-atis.com/camera_images/CSDATY/4/latest.jpg',
      },
    ],
  },
};

describe('mapFeature', () => {
  it('maps one camera per view, named by the view description', () => {
    const cams = mapFeature(sample);
    expect(cams.map((c) => c.id)).toEqual(['sddot-CSDATY-1', 'sddot-CSDATY-4']);
    expect(cams[0]).toEqual({
      id: 'sddot-CSDATY-1',
      lat: 44.95,
      lng: -97.06,
      name: 'Watertown-north of town along I-29 @ MP 179 looking south',
      city: 'Watertown North',
      country: 'US',
      feed_url: 'https://sd.cdn.iteris-atis.com/camera_images/CSDATY/1/latest.jpg',
      source: 'SDDOT SD511',
    });
  });

  it('skips views with no image, and sites with no id or coordinates', () => {
    const noImage: SdFeature = {
      ...sample,
      properties: { ...sample.properties, cameras: [{ id: '9', name: 'Dead view' }] },
    };
    expect(mapFeature(noImage)).toEqual([]);
    expect(mapFeature({ ...sample, id: null })).toEqual([]);
    expect(mapFeature({ ...sample, geometry: null })).toEqual([]);
    expect(mapFeature({})).toEqual([]);
  });

  it('drops coordinates outside the South Dakota bounding box', () => {
    // Minneapolis — well outside South Dakota
    const east: SdFeature = { ...sample, geometry: { coordinates: [-93.265, 44.9778] } };
    expect(mapFeature(east)).toEqual([]);
  });
});

// Live integration test — opt in with RUN_LIVE_TESTS=1 (hits the real SD511 GeoJSON).
const liveIt = process.env.RUN_LIVE_TESTS === '1' ? it : it.skip;

describe('fetchSouthDakotaCameras (live)', () => {
  liveIt('fetches the full well-formed South Dakota inventory', async () => {
    const cams = await fetchSouthDakotaCameras();
    expect(cams.length).toBeGreaterThan(150);
    expect(new Set(cams.map((c) => c.id)).size).toBe(cams.length);
    for (const cam of cams) {
      expect(cam.id).toMatch(/^sddot-.+$/);
      expect(cam.country).toBe('US');
      expect(cam.source).toBe('SDDOT SD511');
      expect(cam.feed_url).toMatch(/^https:\/\/sd\.cdn\.iteris-atis\.com\//);
    }
  });
});
