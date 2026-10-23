import { describe, it, expect } from 'vitest';
import { mapFeature, fetchFinlandCameras, type DigitrafficFeature } from './finland';

// A representative feature from the Digitraffic weathercam station list
// (verified live 2026-10-22; list-shape presets carry id + inCollection only,
// the per-station endpoint adds imageUrl/presentationName/municipality).
const sample: DigitrafficFeature = {
  id: 'C01503',
  geometry: { coordinates: [23.99616, 60.05374, 0] },
  properties: {
    id: 'C01503',
    name: 'kt51_Inkoo',
    collectionStatus: 'GATHERING',
    presets: [
      { id: 'C0150301', inCollection: true },
      { id: 'C0150302', inCollection: true },
      { id: 'C0150309', inCollection: false },
    ],
  },
};

describe('mapFeature', () => {
  it('maps one camera per in-collection preset, with the canonical Digitraffic still URL', () => {
    const cams = mapFeature(sample);
    expect(cams.map((c) => c.id)).toEqual(['fin-C0150301', 'fin-C0150302']);
    expect(cams[0]).toEqual({
      id: 'fin-C0150301',
      lat: 60.05374,
      lng: 23.99616,
      name: 'kt51 Inkoo',
      city: 'Finland',
      country: 'Finland',
      feed_url: 'https://weathercam.digitraffic.fi/C0150301.jpg',
      source: 'Fintraffic',
    });
  });

  it('prefers the detailed shape: names.en, municipality, preset imageUrl + presentationName', () => {
    const detailed: DigitrafficFeature = {
      ...sample,
      properties: {
        ...sample.properties,
        municipality: 'Inkoo',
        names: { fi: 'Tie 51 Inkoo', sv: 'Väg 51 Ingå', en: 'Road 51 Inkoo' },
        presets: [
          {
            id: 'C0150301',
            inCollection: true,
            imageUrl: 'https://weathercam.digitraffic.fi/C0150301.jpg',
            presentationName: 'Inkooseen',
          },
        ],
      },
    };
    const cams = mapFeature(detailed);
    expect(cams).toHaveLength(1);
    expect(cams[0].name).toBe('Road 51 Inkoo (Inkooseen)');
    expect(cams[0].city).toBe('Inkoo');
  });

  it('skips removed stations, out-of-collection presets, and unusable records', () => {
    expect(mapFeature({ ...sample, properties: { ...sample.properties, collectionStatus: 'REMOVED_TEMPORARILY' } })).toEqual([]);
    expect(mapFeature({ ...sample, properties: { ...sample.properties, presets: [{ id: 'C0150301', inCollection: false }] } })).toEqual([]);
    expect(mapFeature({ ...sample, properties: { ...sample.properties, presets: [] } })).toEqual([]);
    expect(mapFeature({ ...sample, id: null, properties: { ...sample.properties, id: null } })).toEqual([]);
    expect(mapFeature({ ...sample, geometry: null })).toEqual([]);
    expect(mapFeature({})).toEqual([]);
  });

  it('drops coordinates outside the Finland bounding box', () => {
    // Stockholm — well outside Finland
    const west: DigitrafficFeature = { ...sample, geometry: { coordinates: [18.0686, 59.3294] } };
    expect(mapFeature(west)).toEqual([]);
    // (0,0) placeholder
    const zero: DigitrafficFeature = { ...sample, geometry: { coordinates: [0, 0] } };
    expect(mapFeature(zero)).toEqual([]);
  });

  it('keeps Åland stations (lng down to ~19.6, west of the old region box)', () => {
    const aland: DigitrafficFeature = { ...sample, geometry: { coordinates: [19.9, 60.2] } };
    expect(mapFeature(aland)).toHaveLength(2);
  });
});

// Live integration test — opt in with RUN_LIVE_TESTS=1 (hits the real Digitraffic API).
const liveIt = process.env.RUN_LIVE_TESTS === '1' ? it : it.skip;

describe('fetchFinlandCameras (live)', () => {
  liveIt('fetches the full well-formed Finland inventory', async () => {
    const cams = await fetchFinlandCameras();
    expect(cams.length).toBeGreaterThan(2000);
    expect(new Set(cams.map((c) => c.id)).size).toBe(cams.length);
    for (const cam of cams) {
      expect(cam.id).toMatch(/^fin-C\d+$/);
      expect(cam.country).toBe('Finland');
      expect(cam.source).toBe('Fintraffic');
      expect(cam.feed_url).toMatch(/^https:\/\/weathercam\.digitraffic\.fi\//);
    }
  });
});
