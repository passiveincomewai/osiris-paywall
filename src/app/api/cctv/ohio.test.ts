import { describe, it, expect } from 'vitest';
import { mapSite, fetchOhioCameras, type OhgoSite } from './ohio';

// A representative site from api.ohgo.com/cameras (verified live 2026-10-22)
const sample: OhgoSite = {
  Id: '00000000000001',
  Latitude: 41.50557,
  Longitude: -82.84921,
  Location: 'SR-2 at S Lightner Rd, 5060',
  Description: 'SR-2 at S Lightner Rd, 5060',
  Provider: null,
  Cameras: [
    {
      Direction: 'View',
      SmallURL: 'https://itscameras.dot.state.oh.us:443/images/toledo/SR2-EB-WestSign.jpg',
      LargeURL: 'https://itscameras.dot.state.oh.us:443/images/toledo/SR2-EB-WestSign.jpg',
    },
  ],
};

const withSite = (patch: Record<string, unknown>): OhgoSite => ({ ...sample, ...patch });

describe('mapSite', () => {
  it('maps a single-view site to one camera', () => {
    expect(mapSite(sample)).toEqual([
      {
        id: 'ohgo-00000000000001-0',
        lat: 41.50557,
        lng: -82.84921,
        name: 'SR-2 at S Lightner Rd, 5060',
        city: 'Ohio',
        country: 'US',
        feed_url: 'https://itscameras.dot.state.oh.us:443/images/toledo/SR2-EB-WestSign.jpg',
        source: 'ODOT OHGO',
      },
    ]);
  });

  it('maps multi-view sites per view, naming real directions', () => {
    const cams = mapSite(
      withSite({
        Cameras: [
          { Direction: 'North', LargeURL: 'https://example.com/n.jpg' },
          { Direction: 'South', LargeURL: 'https://example.com/s.jpg' },
        ],
      }),
    );
    expect(cams.map((c) => c.id)).toEqual(['ohgo-00000000000001-0', 'ohgo-00000000000001-1']);
    expect(cams.map((c) => c.name)).toEqual([
      'SR-2 at S Lightner Rd, 5060 (North)',
      'SR-2 at S Lightner Rd, 5060 (South)',
    ]);
  });

  it('skips KYTC cross-listings — the Kentucky module serves those', () => {
    expect(mapSite(withSite({ Provider: 'KYTC' }))).toEqual([]);
  });

  it('skips sites with no id, no usable views, or bad coordinates', () => {
    expect(mapSite(withSite({ Id: null }))).toEqual([]);
    expect(mapSite(withSite({ Cameras: [] }))).toEqual([]);
    expect(mapSite(withSite({ Cameras: [{ Direction: 'View' }] }))).toEqual([]);
    expect(mapSite(withSite({ Latitude: null }))).toEqual([]);
    // Indianapolis — well outside Ohio
    expect(mapSite(withSite({ Latitude: 39.7684, Longitude: -86.1581 }))).toEqual([]);
  });
});

// Live integration test — opt in with RUN_LIVE_TESTS=1 (hits the real OHGO API).
const liveIt = process.env.RUN_LIVE_TESTS === '1' ? it : it.skip;

describe('fetchOhioCameras (live)', () => {
  liveIt('fetches the full well-formed Ohio inventory', async () => {
    const cams = await fetchOhioCameras();
    expect(cams.length).toBeGreaterThan(1000);
    expect(new Set(cams.map((c) => c.id)).size).toBe(cams.length);
    for (const cam of cams) {
      expect(cam.id).toMatch(/^ohgo-\d+-\d+$/);
      expect(cam.country).toBe('US');
      expect(cam.source).toBe('ODOT OHGO');
      expect(cam.feed_url).toMatch(/^https?:\/\//);
    }
  });
});
