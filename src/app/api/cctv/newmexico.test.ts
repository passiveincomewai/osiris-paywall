import { describe, it, expect } from 'vitest';
import { mapCamera, type NmroadsCameraRecord } from './newmexico';

/** A live camera, verbatim from servicev5.nmroads.com's GetCameraInfo. */
const liveCamera: NmroadsCameraRecord = {
  name: 'I-25@La_Bajada_Lower',
  title: 'I-25 @ Lower La Bajada',
  lat: 35.506001,
  lon: -106.244,
  grouping: 'Santa Fe Area',
  snapshotFile: 'http://ss.nmroads.com/snapshots/i25_lowerlabajada.jpg',
  enabled: true,
  mobile: false,
};

describe('mapCamera', () => {
  it('maps a live camera to its snapshot feed', () => {
    expect(mapCamera(liveCamera)).toEqual({
      id: 'nmdot-I-25@La_Bajada_Lower',
      lat: 35.506001,
      lng: -106.244,
      name: 'I-25 @ Lower La Bajada',
      city: 'Santa Fe Area',
      country: 'US',
      feed_url: 'http://ss.nmroads.com/snapshots/i25_lowerlabajada.jpg',
      source: 'New Mexico DOT',
    });
  });

  it('falls back to the region and a generated name when fields are blank', () => {
    expect(mapCamera({ ...liveCamera, title: '  ', grouping: null })).toEqual({
      id: 'nmdot-I-25@La_Bajada_Lower',
      lat: 35.506001,
      lng: -106.244,
      name: 'NMDOT Camera I-25@La_Bajada_Lower',
      city: 'New Mexico',
      country: 'US',
      feed_url: 'http://ss.nmroads.com/snapshots/i25_lowerlabajada.jpg',
      source: 'New Mexico DOT',
    });
  });

  it('drops disabled cameras', () => {
    expect(mapCamera({ ...liveCamera, enabled: false })).toBeNull();
  });

  it('drops coordinates outside New Mexico', () => {
    // Same record, moved to Los Angeles.
    expect(mapCamera({ ...liveCamera, lat: 34.05, lon: -118.24 })).toBeNull();
  });

  it('drops a record with no coordinates, no slug or no snapshot', () => {
    expect(mapCamera({ ...liveCamera, lat: null })).toBeNull();
    expect(mapCamera({ ...liveCamera, name: '  ' })).toBeNull();
    expect(mapCamera({ ...liveCamera, snapshotFile: null })).toBeNull();
  });
});
