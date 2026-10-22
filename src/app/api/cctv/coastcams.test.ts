import { describe, it, expect } from 'vitest';
import { COASTCAM_STATIONS, coastCamUrl, mapStations } from './coastcams';

describe('COASTCAM_STATIONS', () => {
  it('carries exactly the verified set: 5 cameras at 3 stations', () => {
    const cams = mapStations(COASTCAM_STATIONS);
    expect(cams).toHaveLength(5);
    expect(new Set(cams.map((c) => c.id)).size).toBe(5);
    expect(cams.map((c) => c.id)).toEqual([
      'usgs-coastcam-caco-05-c1',
      'usgs-coastcam-caco-05-c2',
      'usgs-coastcam-madeira_beach-c1',
      'usgs-coastcam-islaverde-c1',
      'usgs-coastcam-islaverde-c2',
    ]);
  });

  it('maps records in the catalogue shape, credited to USGS', () => {
    const [first] = mapStations(COASTCAM_STATIONS);
    expect(first).toEqual({
      id: 'usgs-coastcam-caco-05-c1',
      lat: 41.892622,
      lng: -69.963194,
      name: 'Marconi Beach Camera 1',
      city: 'Wellfleet',
      country: 'US',
      feed_url: 'https://cmgp-coastcam.s3-us-west-2.amazonaws.com/cameras/caco-05/latest/c1.snap.jpg',
      source: 'USGS CoastCam',
    });
    for (const cam of mapStations(COASTCAM_STATIONS)) {
      expect(cam.source).toBe('USGS CoastCam');
      expect(cam.feed_url).toMatch(/^https:\/\/cmgp-coastcam\.s3-us-west-2\.amazonaws\.com\/cameras\//);
    }
  });

  it('builds the per-station latest URL (Marconi keeps its dot naming)', () => {
    expect(coastCamUrl('caco-05', 'c1.snap.jpg')).toBe(
      'https://cmgp-coastcam.s3-us-west-2.amazonaws.com/cameras/caco-05/latest/c1.snap.jpg',
    );
    expect(coastCamUrl('islaverde', 'c2_snap.jpg')).toBe(
      'https://cmgp-coastcam.s3-us-west-2.amazonaws.com/cameras/islaverde/latest/c2_snap.jpg',
    );
  });

  it('skips stations without a usable position', () => {
    expect(mapStations([{ ...COASTCAM_STATIONS[0], lat: Number.NaN }])).toEqual([]);
  });
});
