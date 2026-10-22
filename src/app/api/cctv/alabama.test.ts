import { describe, it, expect } from 'vitest';
import { mapFeature, cameraName, type AlgoFeature } from './alabama';

/** A live public camera, verbatim from api.algotraffic.com/v4.0/Cameras. */
const liveCamera: AlgoFeature = {
  type: 'Feature',
  geometry: { type: 'Point', coordinates: [-88.23953, 30.535105] },
  properties: {
    id: 31385,
    accessLevel: 'Public',
    location: {
      city: 'Mobile',
      displayRouteDesignator: 'I-10',
      routeDesignator: 'I-10',
      displayCrossStreet: 'McDonald Rd',
    },
    playbackUrls: {
      hls: 'https://cdn3.wowza.com/5/b3FOYzhMRS9aVlI1/mobile-fastly/mob-cam-c095.stream/playlist.m3u8',
      dash: 'https://cdn3.wowza.com/5/b3FOYzhMRS9aVlI1/mobile-fastly/mob-cam-c095.stream/manifest.mpd',
    },
    snapshotImageUrl: 'https://api.algotraffic.com/v4/Cameras/31385/snapshot.jpg',
    permLink: 'https://www.algotraffic.com?cameraId=31385',
  },
};

describe('mapFeature', () => {
  it('maps a public camera to a snapshot + HLS stream', () => {
    expect(mapFeature(liveCamera)).toEqual({
      id: 'aldot-31385',
      lat: 30.535105,
      lng: -88.23953,
      name: 'I-10 at McDonald Rd',
      city: 'Mobile',
      country: 'US',
      feed_url: 'https://api.algotraffic.com/v4/Cameras/31385/snapshot.jpg',
      stream_url: 'https://cdn3.wowza.com/5/b3FOYzhMRS9aVlI1/mobile-fastly/mob-cam-c095.stream/playlist.m3u8',
      stream_type: 'hls',
      external_url: 'https://www.algotraffic.com?cameraId=31385',
      source: 'ALDOT ALGO Traffic',
    });
  });

  it('drops non-public cameras (FirstResponder / ALDOT / Hidden)', () => {
    for (const accessLevel of ['FirstResponder', 'ALDOT', 'Hidden', null]) {
      expect(mapFeature({
        ...liveCamera,
        properties: { ...liveCamera.properties, accessLevel },
      })).toBeNull();
    }
  });

  it('drops coordinates outside Alabama', () => {
    // Same record, moved to Atlanta.
    expect(mapFeature({
      ...liveCamera,
      geometry: { type: 'Point', coordinates: [-84.39, 33.75] },
    })).toBeNull();
  });

  it('drops a record with no coordinates, no id, or no feed at all', () => {
    expect(mapFeature({ ...liveCamera, geometry: null })).toBeNull();
    expect(mapFeature({
      ...liveCamera,
      properties: { ...liveCamera.properties, id: null },
    })).toBeNull();
    expect(mapFeature({
      ...liveCamera,
      properties: { ...liveCamera.properties, snapshotImageUrl: null, playbackUrls: null },
    })).toBeNull();
  });

  it('keeps a snapshot-only camera, without a stream', () => {
    const cam = mapFeature({
      ...liveCamera,
      properties: { ...liveCamera.properties, playbackUrls: null },
    });
    expect(cam?.feed_url).toBe('https://api.algotraffic.com/v4/Cameras/31385/snapshot.jpg');
    expect(cam?.stream_url).toBeUndefined();
    expect(cam?.stream_type).toBeUndefined();
  });

  it('falls back to a constructed permLink when the feed omits one', () => {
    const cam = mapFeature({
      ...liveCamera,
      properties: { ...liveCamera.properties, permLink: null },
    });
    expect(cam?.external_url).toBe('https://www.algotraffic.com?cameraId=31385');
  });
});

describe('cameraName', () => {
  it('joins route and cross street', () => {
    expect(cameraName({ displayRouteDesignator: 'I-10', displayCrossStreet: 'McDonald Rd' }, 1))
      .toBe('I-10 at McDonald Rd');
  });

  it('uses the route alone when the cross street is unknown or repeats it', () => {
    expect(cameraName({ displayRouteDesignator: 'I-459', displayCrossStreet: 'I-459' }, 2)).toBe('I-459');
    expect(cameraName({ displayRouteDesignator: 'I-65', displayCrossStreet: 'Unknown' }, 3)).toBe('I-65');
  });

  it('falls back to the camera id when the feed names nothing', () => {
    expect(cameraName(null, 42)).toBe('ALDOT Camera 42');
    expect(cameraName({}, 42)).toBe('ALDOT Camera 42');
  });
});
