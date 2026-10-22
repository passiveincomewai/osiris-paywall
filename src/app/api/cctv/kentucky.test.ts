import { describe, it, expect } from 'vitest';
import { mapKytcFeature, mapLexFeature, fetchKentuckyCameras, type KytcFeature, type LexFeature } from './kentucky';

// Representative features from the two GoKY layers (verified live 2026-10-22)
const kytcSample: KytcFeature = {
  attributes: {
    OBJECTID: 101,
    description: 'I-71/I-75 at Dixie Hwy',
    name: null,
    snapshot: 'https://www.trimarc.org/images/milestone/CCTV_06_75_1877.jpg',
    status: 'Online',
    county: 'Kenton',
    latitude: 39.049779,
    longitude: -84.549766,
  },
};

const lexSample: LexFeature = {
  attributes: {
    objectid: 1,
    location: 'Alumni/New Circle',
    still_url:
      'https://6855e4345af72.streamlock.net:1935/thumbnail?application=lexington-live&streamname=lex-cam-014.stream&fitmode=stretch&size=600x400',
  },
  geometry: { x: -84.46457133969764, y: 37.99517367214168 },
};

const withKytc = (patch: Record<string, unknown>): KytcFeature => ({
  attributes: { ...kytcSample.attributes, ...patch },
});

describe('mapKytcFeature', () => {
  it('maps a valid KYTC feature to a CctvCamera', () => {
    expect(mapKytcFeature(kytcSample)).toEqual({
      id: 'kytc-101',
      lat: 39.049779,
      lng: -84.549766,
      name: 'I-71/I-75 at Dixie Hwy',
      city: 'Kenton',
      country: 'US',
      feed_url: 'https://www.trimarc.org/images/milestone/CCTV_06_75_1877.jpg',
      source: 'KYTC GoKY',
    });
  });

  it('skips the Offline row and rows with no snapshot', () => {
    expect(mapKytcFeature(withKytc({ status: 'Offline' }))).toBeNull();
    expect(mapKytcFeature(withKytc({ snapshot: null }))).toBeNull();
    expect(mapKytcFeature(withKytc({ OBJECTID: null }))).toBeNull();
  });

  it('keeps status-less Louisville-metro rows, drops coordinates outside the box', () => {
    // The layer's state-less rows are TRIMARC cameras on the Indiana shore
    // of Louisville — inside the box by design (see module header).
    expect(mapKytcFeature(withKytc({ status: null, latitude: 38.345217, longitude: -85.753507 }))).not.toBeNull();
    expect(mapKytcFeature(withKytc({ status: null, latitude: 39.8, longitude: -85.0 }))).toBeNull();
  });
});

describe('mapLexFeature', () => {
  it('maps a valid Lexington feature from its geometry', () => {
    expect(mapLexFeature(lexSample)).toEqual({
      id: 'lexky-1',
      lat: 37.99517367214168,
      lng: -84.46457133969764,
      name: 'Alumni/New Circle',
      city: 'Lexington',
      country: 'US',
      feed_url:
        'https://6855e4345af72.streamlock.net:1935/thumbnail?application=lexington-live&streamname=lex-cam-014.stream&fitmode=stretch&size=600x400',
      source: 'LFUCG Lexington',
    });
  });

  it('skips features with no still or no geometry', () => {
    expect(mapLexFeature({ attributes: { ...lexSample.attributes, still_url: null }, geometry: lexSample.geometry })).toBeNull();
    expect(mapLexFeature({ attributes: lexSample.attributes, geometry: null })).toBeNull();
    expect(mapLexFeature({})).toBeNull();
  });
});

// Live integration test — opt in with RUN_LIVE_TESTS=1 (hits the real ArcGIS layers).
const liveIt = process.env.RUN_LIVE_TESTS === '1' ? it : it.skip;

describe('fetchKentuckyCameras (live)', () => {
  liveIt('fetches the KYTC + Lexington inventories', async () => {
    const cams = await fetchKentuckyCameras();
    expect(cams.length).toBeGreaterThan(300);
    expect(new Set(cams.map((c) => c.id)).size).toBe(cams.length);
    for (const cam of cams) {
      expect(cam.id).toMatch(/^(kytc|lexky)-\d+$/);
      expect(cam.country).toBe('US');
      expect(cam.feed_url).toMatch(/^https?:\/\//);
    }
  });
});
