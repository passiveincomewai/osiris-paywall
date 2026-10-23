import { describe, it, expect } from 'vitest';
import { mapFeature, fetchMontanaCameras, type MtFeature } from './montana';

// A representative feature from icons.rwis.geojson (verified live 2026-10-22)
const sample: MtFeature = {
  id: '150011',
  geometry: { type: 'Point', coordinates: [-113.885824, 46.871434] } as MtFeature['geometry'],
  properties: {
    name: 'Bonner',
    description: 'I-90 MP 110.3',
    route: 'I-90',
    cameras: [
      {
        id: '150110-00-01',
        name: 'Bonner - East Elev 3280',
        description: 'East Elev 3280',
        image: 'https://mt.cdn.iteris-atis.com/rwis_images/150110-00-01.jpg',
      },
      {
        id: '150112-00-03',
        name: 'Bonner - Roadway Elev 3280',
        description: 'Roadway Elev 3280',
        image: 'https://mt.cdn.iteris-atis.com/rwis_images/150112-00-03.jpg',
      },
    ],
  },
};

describe('mapFeature', () => {
  it('maps one camera per view, named by the view name', () => {
    const cams = mapFeature(sample);
    expect(cams.map((c) => c.id)).toEqual(['mtdot-150110-00-01', 'mtdot-150112-00-03']);
    expect(cams[0]).toEqual({
      id: 'mtdot-150110-00-01',
      lat: 46.871434,
      lng: -113.885824,
      name: 'Bonner - East Elev 3280',
      city: 'Bonner',
      country: 'US',
      feed_url: 'https://mt.cdn.iteris-atis.com/rwis_images/150110-00-01.jpg',
      source: 'MDT 511',
    });
  });

  it('skips views with no image, and sites with no id or coordinates', () => {
    const noImage: MtFeature = {
      ...sample,
      properties: { ...sample.properties, cameras: [{ id: '150199-00-09', name: 'Dead view' }] },
    };
    expect(mapFeature(noImage)).toEqual([]);
    expect(mapFeature({ ...sample, id: null })).toEqual([]);
    expect(mapFeature({ ...sample, geometry: null })).toEqual([]);
    expect(mapFeature({})).toEqual([]);
  });

  it('drops coordinates outside the Montana bounding box', () => {
    // Gillette, Wyoming — cross-listed on MDT's neighbouring-state layer
    const south: MtFeature = { ...sample, geometry: { coordinates: [-105.467089, 44.29024] } };
    expect(mapFeature(south)).toEqual([]);
  });

  it('skips Bozeman Pass — already served via the FAA WeatherCams module', () => {
    const bozeman: MtFeature = {
      id: '564002',
      geometry: { type: 'Point', coordinates: [-110.8039548, 45.6668164] } as MtFeature['geometry'],
      properties: {
        name: 'Bozeman Pass',
        cameras: [
          {
            id: '564020-00-01',
            name: 'Bozeman Pass - East Elev 5748',
            image: 'https://mt.cdn.iteris-atis.com/rwis_images/564020-00-01.jpg',
          },
        ],
      },
    };
    expect(mapFeature(bozeman)).toEqual([]);
  });
});

// Live integration test — opt in with RUN_LIVE_TESTS=1 (hits the real MT511 GeoJSON).
const liveIt = process.env.RUN_LIVE_TESTS === '1' ? it : it.skip;

describe('fetchMontanaCameras (live)', () => {
  liveIt('fetches the full well-formed Montana RWIS inventory', async () => {
    const cams = await fetchMontanaCameras();
    expect(cams.length).toBeGreaterThan(400);
    expect(new Set(cams.map((c) => c.id)).size).toBe(cams.length);
    for (const cam of cams) {
      expect(cam.id).toMatch(/^mtdot-.+$/);
      expect(cam.country).toBe('US');
      expect(cam.source).toBe('MDT 511');
      expect(cam.feed_url).toMatch(/^https:\/\/mt\.cdn\.iteris-atis\.com\/rwis_images\//);
    }
  });
});
