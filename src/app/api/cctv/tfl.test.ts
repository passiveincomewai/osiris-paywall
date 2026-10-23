import { describe, it, expect } from 'vitest';
import { classifyJamCam, mapJamCam, parseTfLPlaces, tflPlacesUrl, type TfLPlace } from './tfl';

// A representative place from GET /Place/Type/JamCam, verbatim shape
// (verified live 2026-10-22): coordinates and both media URLs are the
// API's own, carried in additionalProperties.
const samplePlace: TfLPlace = {
  id: 'JamCams_00002.00865',
  commonName: 'A406 Billet Upass E',
  lat: 51.60067,
  lon: -0.01594,
  additionalProperties: [
    { key: 'available', value: 'true' },
    { key: 'imageUrl', value: 'https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00002.00865.jpg' },
    { key: 'videoUrl', value: 'https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00002.00865.mp4' },
    { key: 'view', value: 'West' },
  ],
};

describe('mapJamCam', () => {
  it('maps a JamCam place to a CctvCamera using the API coordinates and URLs', () => {
    expect(mapJamCam(samplePlace)).toEqual({
      id: 'tfl-JamCams_00002.00865',
      lat: 51.60067,
      lng: -0.01594,
      name: 'A406 Billet Upass E',
      city: 'London',
      country: 'UK',
      feed_url: 'https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00002.00865.jpg',
      stream_url: 'https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00002.00865.mp4',
      stream_type: 'mp4',
      source: 'TfL',
    });
  });

  it('falls back to a default name when commonName is missing', () => {
    expect(mapJamCam({ ...samplePlace, commonName: null })?.name).toBe('London JamCam');
  });

  it('derives the still URL from the place id when imageUrl is absent', () => {
    const place: TfLPlace = {
      id: 'JamCams_00001.07450',
      commonName: 'A12 Blackwall Tunnel',
      lat: 51.5155,
      lon: -0.0025,
      additionalProperties: [{ key: 'available', value: 'true' }],
    };
    const cam = mapJamCam(place);
    expect(cam?.feed_url).toBe('https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.07450.jpg');
    // The clip URL is only ever taken from the API, never derived.
    expect(cam?.stream_url).toBeUndefined();
  });

  it('skips places TfL marks unavailable', () => {
    const place: TfLPlace = {
      ...samplePlace,
      additionalProperties: [
        { key: 'available', value: 'false' },
        { key: 'imageUrl', value: 'https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00002.00865.jpg' },
      ],
    };
    expect(classifyJamCam(place)).toEqual({ ok: false, reason: 'unavailable' });
    expect(mapJamCam(place)).toBeNull();
  });

  it('treats a missing available flag as available (partial API shapes still map)', () => {
    const place: TfLPlace = { id: 'JamCams_1', lat: 51.5, lon: -0.1, commonName: 'London' };
    expect(mapJamCam(place)?.id).toBe('tfl-JamCams_1');
  });

  it('skips places with no id or unusable coordinates', () => {
    expect(classifyJamCam({ ...samplePlace, id: null })).toEqual({ ok: false, reason: 'missing-id' });
    expect(classifyJamCam({ ...samplePlace, lat: null })).toEqual({ ok: false, reason: 'invalid-coordinates' });
    expect(classifyJamCam({ ...samplePlace, lat: Number.NaN })).toEqual({ ok: false, reason: 'invalid-coordinates' });
  });

  it('drops coordinates outside the Greater London bounding box', () => {
    // Hong Kong — well outside London
    expect(classifyJamCam({ ...samplePlace, lat: 22.24845, lon: 114.1505 })).toEqual({
      ok: false,
      reason: 'invalid-coordinates',
    });
  });

  it('rejects a non-http imageUrl rather than serving it', () => {
    const place: TfLPlace = {
      ...samplePlace,
      additionalProperties: [{ key: 'imageUrl', value: 'jamcams://00002.00865' }],
    };
    expect(classifyJamCam(place)).toEqual({ ok: false, reason: 'invalid-feed' });
  });
});

describe('parseTfLPlaces', () => {
  it('de-duplicates repeated place ids', () => {
    expect(parseTfLPlaces([samplePlace, samplePlace])).toHaveLength(1);
  });

  it('returns an empty list for a non-array payload', () => {
    expect(parseTfLPlaces({})).toEqual([]);
    expect(parseTfLPlaces(null)).toEqual([]);
  });
});

describe('tflPlacesUrl', () => {
  it('is the anonymous JamCam endpoint by default — no key, 50 req/min path', () => {
    expect(tflPlacesUrl({})).toBe('https://api.tfl.gov.uk/Place/Type/JamCam');
    expect(tflPlacesUrl({ TFL_APP_KEY: '   ' })).toBe('https://api.tfl.gov.uk/Place/Type/JamCam');
  });

  it('appends app_key only when TFL_APP_KEY is set', () => {
    expect(tflPlacesUrl({ TFL_APP_KEY: 'test-key' })).toBe(
      'https://api.tfl.gov.uk/Place/Type/JamCam?app_key=test-key',
    );
  });
});

// Live integration test — opt in with RUN_LIVE_TESTS=1 (hits the real TfL API).
const liveIt = process.env.RUN_LIVE_TESTS === '1' ? it : it.skip;

describe('TfL Unified API (live)', () => {
  liveIt('answers anonymously with a full, well-formed JamCam inventory', async () => {
    const res = await fetch(tflPlacesUrl({}));
    expect(res.ok).toBe(true);
    const places = parseTfLPlaces(await res.json());
    expect(places.length).toBeGreaterThan(700);
    expect(new Set(places.map(c => c.id)).size).toBe(places.length);
    for (const cam of places) {
      expect(cam.country).toBe('UK');
      expect(cam.source).toBe('TfL');
      expect(cam.feed_url).toMatch(/^https:\/\/s3-eu-west-1\.amazonaws\.com\/jamcams\.tfl\.gov\.uk\/.+\.jpg$/);
      expect(cam.lat).toBeGreaterThan(51.2);
      expect(cam.lat).toBeLessThan(51.8);
      expect(cam.lng).toBeGreaterThan(-0.6);
      expect(cam.lng).toBeLessThan(0.35);
    }
  });
});
