import { describe, it, expect } from 'vitest';
import { mapCamera, fetchNycDotCameras, nycDotEnabled, type NycDotRecord } from './nycdot';

// A representative record from the official list (verified live 2026-10-22)
const sample: NycDotRecord = {
  id: '8a6bc417-4877-4ebe-8052-88c1b261baf1',
  name: 'Central Park West @ 86 St',
  latitude: 40.785302,
  longitude: -73.969353,
  area: 'Manhattan',
  isOnline: 'true',
  imageUrl: 'https://webcams.nyctmc.org/api/cameras/8a6bc417-4877-4ebe-8052-88c1b261baf1/image',
};

describe('mapCamera', () => {
  it('maps an online camera, borough as city', () => {
    expect(mapCamera(sample)).toEqual({
      id: 'nycdot-8a6bc417-4877-4ebe-8052-88c1b261baf1',
      lat: 40.785302,
      lng: -73.969353,
      name: 'Central Park West @ 86 St',
      city: 'Manhattan',
      country: 'US',
      feed_url: 'https://webcams.nyctmc.org/api/cameras/8a6bc417-4877-4ebe-8052-88c1b261baf1/image',
      source: 'NYC DOT',
    });
  });

  it('constructs the image URL from the id when the record omits it', () => {
    const cam = mapCamera({ ...sample, imageUrl: null });
    expect(cam?.feed_url).toBe(
      'https://webcams.nyctmc.org/api/cameras/8a6bc417-4877-4ebe-8052-88c1b261baf1/image',
    );
  });

  it('skips cameras the agency flags offline, and records with no id or coordinates', () => {
    expect(mapCamera({ ...sample, isOnline: 'false' })).toBeNull();
    expect(mapCamera({ ...sample, id: null })).toBeNull();
    expect(mapCamera({ ...sample, latitude: null })).toBeNull();
    expect(mapCamera({})).toBeNull();
  });

  it('drops coordinates outside the New York City bounding box', () => {
    // Albany — well outside the five boroughs
    expect(mapCamera({ ...sample, latitude: 42.6526, longitude: -73.7562 })).toBeNull();
  });
});

describe('nycDotEnabled (gate)', () => {
  it('is dark unless OSIRIS_CCTV_NYCDOT=on', () => {
    // Gated since 2026-10-22; the 2026-11-04 enable-as-probe proved
    // the serving environment cannot reach the host either, and the
    // gate was restored the same day. See the module header.
    delete process.env.OSIRIS_CCTV_NYCDOT;
    expect(nycDotEnabled()).toBe(false);
    process.env.OSIRIS_CCTV_NYCDOT = 'off';
    expect(nycDotEnabled()).toBe(false);
    process.env.OSIRIS_CCTV_NYCDOT = 'on';
    expect(nycDotEnabled()).toBe(true);
    delete process.env.OSIRIS_CCTV_NYCDOT;
  });

  it('serves nothing while the gate is closed', async () => {
    delete process.env.OSIRIS_CCTV_NYCDOT;
    await expect(fetchNycDotCameras()).resolves.toEqual([]);
  });
});

// Live integration test — opt in with RUN_LIVE_TESTS=1 AND OSIRIS_CCTV_NYCDOT=on
// (hits the real NYC DOT list; only meaningful where the host is reachable).
const liveIt = process.env.RUN_LIVE_TESTS === '1' ? it : it.skip;

describe('fetchNycDotCameras (live)', () => {
  liveIt('fetches the full well-formed NYC DOT inventory', async () => {
    const cams = await fetchNycDotCameras();
    expect(cams.length).toBeGreaterThan(800);
    expect(new Set(cams.map((c) => c.id)).size).toBe(cams.length);
    for (const cam of cams) {
      expect(cam.id).toMatch(/^nycdot-.+$/);
      expect(cam.country).toBe('US');
      expect(cam.source).toBe('NYC DOT');
      expect(cam.feed_url).toMatch(/^https:\/\/webcams\.nyctmc\.org\/api\/cameras\/.+\/image$/);
    }
  });
});
