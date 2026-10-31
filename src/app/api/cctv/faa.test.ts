import { describe, it, expect } from 'vitest';
import {
  mapSite,
  faaImagePath,
  faaLastImageUrl,
  parseFaaLastImage,
  fetchFaaCameras,
  type FaaSite,
} from './faa';

// A representative site from /api/sites (Isabel Pass, Alaska — the shape the
// FAA returns, trimmed to the fields the module consumes).
const sample: FaaSite = {
  siteId: 37,
  siteName: 'Isabel Pass',
  siteArea: 'Isabel Pass',
  siteActive: true,
  country: 'US',
  state: 'AK',
  latitude: 63.41511,
  longitude: -145.75809,
  cameras: [
    {
      cameraId: 11671,
      cameraName: 'Camera 2',
      cameraDirection: 'South',
      cameraOutOfOrder: false,
      latitude: 63.41511,
      longitude: -145.75809,
    },
    {
      cameraId: 11672,
      cameraName: 'Camera 3',
      cameraDirection: 'NorthWest',
      cameraOutOfOrder: false,
      latitude: 63.41511,
      longitude: -145.75809,
    },
  ],
};

const withSite = (patch: Partial<FaaSite>): FaaSite => ({ ...sample, ...patch });

describe('mapSite', () => {
  it('maps a site’s cameras to CctvCamera records', () => {
    const cams = mapSite(sample);
    expect(cams).toHaveLength(2);
    expect(cams[0]).toEqual({
      id: 'faa-11671',
      lat: 63.41511,
      lng: -145.75809,
      heading_deg: 180,
      name: 'Isabel Pass — Camera 2 (South)',
      city: 'Isabel Pass',
      country: 'US',
      feed_url: '/api/cctv/faa-image/11671',
      stream_type: 'jpg',
      source: 'FAA WeatherCams',
    });
  });

  it('carries the FAA facing direction as a bearing, only when published', () => {
    const cams = mapSite(sample);
    expect(cams[1].heading_deg).toBe(315); // NorthWest
    const noDir = mapSite(withSite({
      cameras: [{ cameraId: 5, cameraName: 'Camera 1', cameraDirection: null, latitude: 1, longitude: 1 }],
    }));
    expect('heading_deg' in noDir[0]).toBe(false);
    const badDir = mapSite(withSite({
      cameras: [{ cameraId: 6, cameraName: 'Camera 1', cameraDirection: 'Sideways', latitude: 1, longitude: 1 }],
    }));
    expect('heading_deg' in badDir[0]).toBe(false);
  });

  it('skips inactive sites entirely', () => {
    expect(mapSite(withSite({ siteActive: false }))).toEqual([]);
  });

  it('skips out-of-order cameras but keeps their working neighbours', () => {
    const cams = mapSite(withSite({
      cameras: [
        { cameraId: 1, cameraName: 'Camera 1', cameraOutOfOrder: true, latitude: 1, longitude: 1 },
        { cameraId: 2, cameraName: 'Camera 2', cameraOutOfOrder: false, latitude: 1, longitude: 1 },
      ],
    }));
    expect(cams.map((c) => c.id)).toEqual(['faa-2']);
  });

  it('falls back to the site position when a camera has none of its own', () => {
    const cams = mapSite(withSite({
      cameras: [{ cameraId: 9, cameraName: 'Camera 1' }],
    }));
    expect(cams).toHaveLength(1);
    expect(cams[0].lat).toBe(63.41511);
    expect(cams[0].lng).toBe(-145.75809);
  });

  it('drops cameras with no usable position anywhere', () => {
    expect(mapSite(withSite({
      latitude: undefined,
      longitude: undefined,
      cameras: [{ cameraId: 9, cameraName: 'Camera 1' }],
    }))).toEqual([]);
    expect(mapSite(withSite({
      cameras: [{ cameraId: 9, cameraName: 'Camera 1', latitude: 0, longitude: 0 }],
    }))).toEqual([]);
  });

  it('maps Canadian sites to the catalogue’s country wording', () => {
    const cams = mapSite(withSite({ country: 'CA', state: 'BC' }));
    expect(cams[0].country).toBe('Canada');
  });

  it('omits the direction suffix when the FAA gives none', () => {
    const cams = mapSite(withSite({
      cameras: [{ cameraId: 5, cameraName: 'Camera 1', cameraDirection: null, latitude: 1, longitude: 1 }],
    }));
    expect(cams[0].name).toBe('Isabel Pass — Camera 1');
  });
});

describe('image resolution helpers', () => {
  it('builds the resolver path and the FAA lookup URL', () => {
    expect(faaImagePath(11671)).toBe('/api/cctv/faa-image/11671');
    expect(faaLastImageUrl(11671)).toBe('https://weathercams.faa.gov/api/cameras/11671/images/last/1');
  });

  it('extracts the frame URL from an /images/last/1 response', () => {
    const data = {
      success: true,
      payload: [{
        cameraId: 11671,
        imageUri: 'https://images.wcams-static.faa.gov/webimages/37/18/11671-1792365543323.jpg',
      }],
    };
    expect(parseFaaLastImage(data)).toBe('https://images.wcams-static.faa.gov/webimages/37/18/11671-1792365543323.jpg');
  });

  it('returns null for empty, failed, or malformed responses', () => {
    expect(parseFaaLastImage({ success: false, payload: null })).toBeNull();
    expect(parseFaaLastImage({ success: true, payload: [] })).toBeNull();
    expect(parseFaaLastImage({ success: true, payload: [{ imageUri: 'http://insecure.example/x.jpg' }] })).toBeNull();
    expect(parseFaaLastImage(null)).toBeNull();
    expect(parseFaaLastImage('nope')).toBeNull();
  });
});

// Live integration test — opt in with RUN_LIVE_TESTS=1 (hits the real FAA API).
const liveIt = process.env.RUN_LIVE_TESTS === '1' ? it : it.skip;

describe('fetchFaaCameras (live)', () => {
  liveIt('fetches the full FAA network, well-formed', async () => {
    const cams = await fetchFaaCameras();
    expect(cams.length).toBeGreaterThan(3000);
    expect(new Set(cams.map((c) => c.id)).size).toBe(cams.length);
    for (const cam of cams) {
      expect(cam.id).toMatch(/^faa-\d+$/);
      expect(cam.source).toBe('FAA WeatherCams');
      expect(cam.feed_url).toMatch(/^\/api\/cctv\/faa-image\/\d+$/);
      expect(Number.isFinite(cam.lat)).toBe(true);
      expect(Number.isFinite(cam.lng)).toBe(true);
    }
  });
});
