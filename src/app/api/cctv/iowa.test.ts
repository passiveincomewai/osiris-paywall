import { describe, it, expect } from 'vitest';
import { mapFeature, fetchIowaCameras, type IowaDotFeature } from './iowa';

// A representative feature from Traffic_Cameras_View (verified live 2026-10-22)
const sample: IowaDotFeature = {
  attributes: {
    device_id: 59643334,
    COMMON_ID: 'ICTV29',
    Desc_: 'IC - I-80 @ MM 229.2',
    ImageName: 'IC - I-80 @ MM 229.2',
    ImageURL: 'https://atmsqf.iowadot.gov/SNAPSHOTS/PUBLIC/Metro/ictv29hd.jpeg',
    VideoURL: 'https://video3.iowadot.gov:8888/cedarrapids/ictv29lb/playlist.m3u8',
    latitude: 41.687152,
    longitude: -91.820917,
    REGION: 'Iowa City',
  },
};

const withAttrs = (patch: Record<string, unknown>): IowaDotFeature => ({
  attributes: { ...sample.attributes, ...patch },
});

describe('mapFeature', () => {
  it('maps a valid view to a CctvCamera with still and HLS stream', () => {
    expect(mapFeature(sample)).toEqual({
      id: 'iadot-59643334',
      lat: 41.687152,
      lng: -91.820917,
      name: 'IC - I-80 @ MM 229.2',
      city: 'Iowa City',
      country: 'US',
      feed_url: 'https://atmsqf.iowadot.gov/SNAPSHOTS/PUBLIC/Metro/ictv29hd.jpeg',
      stream_url: 'https://video3.iowadot.gov:8888/cedarrapids/ictv29lb/playlist.m3u8',
      stream_type: 'hls',
      source: 'Iowa DOT',
    });
  });

  it('keeps still-only and stream-only views', () => {
    expect(mapFeature(withAttrs({ VideoURL: null }))?.stream_url).toBeUndefined();
    expect(mapFeature(withAttrs({ VideoURL: null }))?.feed_url).toContain('ictv29hd.jpeg');
    expect(mapFeature(withAttrs({ ImageURL: null }))?.feed_url).toBeUndefined();
    expect(mapFeature(withAttrs({ ImageURL: null }))?.stream_type).toBe('hls');
  });

  it('skips views with no id, no media, or unusable coordinates', () => {
    expect(mapFeature(withAttrs({ device_id: null }))).toBeNull();
    expect(mapFeature(withAttrs({ ImageURL: null, VideoURL: null }))).toBeNull();
    expect(mapFeature(withAttrs({ latitude: null }))).toBeNull();
    expect(mapFeature({})).toBeNull();
  });

  it('drops coordinates outside the Iowa bounding box', () => {
    // Chicago — well outside Iowa
    expect(mapFeature(withAttrs({ latitude: 41.8781, longitude: -87.6298 }))).toBeNull();
  });
});

// Live integration test — opt in with RUN_LIVE_TESTS=1 (hits the real ArcGIS service).
const liveIt = process.env.RUN_LIVE_TESTS === '1' ? it : it.skip;

describe('fetchIowaCameras (live)', () => {
  liveIt('fetches the full well-formed Iowa inventory', async () => {
    const cams = await fetchIowaCameras();
    expect(cams.length).toBeGreaterThan(1000);
    expect(new Set(cams.map((c) => c.id)).size).toBe(cams.length);
    for (const cam of cams) {
      expect(cam.id).toMatch(/^iadot-\d+$/);
      expect(cam.country).toBe('US');
      expect(cam.source).toBe('Iowa DOT');
      expect(cam.feed_url || cam.stream_url).toBeTruthy();
    }
  });
});
