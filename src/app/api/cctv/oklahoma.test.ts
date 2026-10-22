import { describe, it, expect } from 'vitest';
import { mapCamera, mapPole, type OkCameraPole } from './oklahoma';

/** A live pole, verbatim (trimmed) from oktraffic.org's CameraPoles response. */
const livePole: OkCameraPole = {
  id: 3,
  name: 'I-44 & I-240',
  mapCameras: [
    {
      latitude: '35.39637',
      longitude: '-97.57406',
      location: 'I-44 & I-240 N',
      type: 'Web',
      status: 'Free',
      id: 1103130967,
      blockAtis: '0',
      city: 'Oklahoma City',
      streamDictionary: {
        streamSrc: 'https://stream.oktraffic.org/delay-stream/f7db25eef2238d37.stream/playlist.m3u8',
      },
    },
  ],
};

const liveCamera = livePole.mapCameras![0];

describe('mapCamera', () => {
  it('maps a live camera to an HLS stream', () => {
    expect(mapCamera(liveCamera, livePole.name)).toEqual({
      id: 'okdot-1103130967',
      lat: 35.39637,
      lng: -97.57406,
      name: 'I-44 & I-240 N',
      city: 'Oklahoma City',
      country: 'US',
      stream_url: 'https://stream.oktraffic.org/delay-stream/f7db25eef2238d37.stream/playlist.m3u8',
      stream_type: 'hls',
      external_url: 'https://oktraffic.org/',
      source: 'Oklahoma DOT',
    });
  });

  it('falls back to the pole name, then a generated name', () => {
    expect(mapCamera({ ...liveCamera, location: null }, 'I-44 & I-240')?.name).toBe('I-44 & I-240');
    expect(mapCamera({ ...liveCamera, location: '  ' })?.name).toBe('Oklahoma DOT Camera 1103130967');
  });

  it('drops out-of-service, ATIS-blocked and non-Web cameras', () => {
    expect(mapCamera({ ...liveCamera, status: 'Out Of Service' })).toBeNull();
    expect(mapCamera({ ...liveCamera, blockAtis: '1' })).toBeNull();
    expect(mapCamera({ ...liveCamera, type: 'PTZ' })).toBeNull();
  });

  it('drops a camera with no HLS stream', () => {
    expect(mapCamera({ ...liveCamera, streamDictionary: null })).toBeNull();
    expect(mapCamera({
      ...liveCamera,
      streamDictionary: { streamSrc: 'https://stream.oktraffic.org/snapshot.jpg' },
    })).toBeNull();
  });

  it('drops coordinates outside Oklahoma', () => {
    // Same record, moved to Dallas.
    expect(mapCamera({ ...liveCamera, latitude: '32.78', longitude: '-96.80' })).toBeNull();
  });

  it('drops a record with no numeric id or unparseable coordinates', () => {
    expect(mapCamera({ ...liveCamera, id: null })).toBeNull();
    expect(mapCamera({ ...liveCamera, latitude: 'n/a' })).toBeNull();
    expect(mapCamera({ ...liveCamera, longitude: null })).toBeNull();
  });

  it('replaces a missing or N/A city with the state name', () => {
    expect(mapCamera({ ...liveCamera, city: 'N/A' })?.city).toBe('Oklahoma');
    expect(mapCamera({ ...liveCamera, city: null })?.city).toBe('Oklahoma');
    expect(mapCamera({ ...liveCamera, city: ' Tulsa ' })?.city).toBe('Tulsa');
  });
});

describe('mapPole', () => {
  it('maps every camera on a pole', () => {
    const pole: OkCameraPole = {
      id: 4,
      name: 'I-44 & S 59th',
      mapCameras: [
        liveCamera,
        {
          ...liveCamera,
          id: 1103131533,
          location: 'I-44 & S59th S',
          streamDictionary: {
            streamSrc: 'https://stream.oktraffic.org/delay-stream/f1e08ca665308ee2.stream/playlist.m3u8',
          },
        },
      ],
    };
    const cams = mapPole(pole);
    expect(cams.map(c => c.id)).toEqual(['okdot-1103130967', 'okdot-1103131533']);
  });

  it('returns nothing for a pole with no cameras', () => {
    expect(mapPole({ id: 1, name: 'Empty', mapCameras: [] })).toEqual([]);
    expect(mapPole({ id: 1, name: 'Empty', mapCameras: null })).toEqual([]);
  });
});
