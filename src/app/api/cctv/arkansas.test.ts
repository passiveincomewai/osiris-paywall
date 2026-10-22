import { describe, it, expect } from 'vitest';
import { mapFeature, snapshotUrl, type ArdotFeature } from './arkansas';

/** A live camera, verbatim from layers.idrivearkansas.com/cameras.geojson. */
const liveCamera: ArdotFeature = {
  type: 'Feature',
  properties: {
    id: 457,
    status: 'online',
    name: 'I-30 @ Red River',
  },
  geometry: { type: 'Point', coordinates: [-93.815969, 33.605106] },
};

describe('mapFeature', () => {
  it('maps a live camera to its layers snapshot', () => {
    expect(mapFeature(liveCamera)).toEqual({
      id: 'ardot-457',
      lat: 33.605106,
      lng: -93.815969,
      name: 'I-30 @ Red River',
      city: 'Arkansas',
      country: 'US',
      feed_url: 'https://layers.idrivearkansas.com/cameras/457.jpg',
      stream_type: 'jpg',
      external_url: 'https://www.idrivearkansas.com/',
      source: 'Arkansas DOT',
    });
  });

  it('never exposes the signed-cookie HLS playlist as a stream', () => {
    // The layer's hls_stream_protected answers 403 without a vend session,
    // so a mapped camera must not carry a stream_url at all.
    expect(mapFeature(liveCamera)).not.toHaveProperty('stream_url');
  });

  it('trims the trailing space some layer names carry', () => {
    expect(mapFeature({
      ...liveCamera,
      properties: { ...liveCamera.properties, name: 'I-555 @ S. Caraway (Exit 42) ' },
    })?.name).toBe('I-555 @ S. Caraway (Exit 42)');
  });

  it('drops a camera that is not online', () => {
    expect(mapFeature({
      ...liveCamera,
      properties: { ...liveCamera.properties, status: 'disabled' },
    })).toBeNull();
  });

  it('drops coordinates outside Arkansas', () => {
    // Same record, moved to Los Angeles.
    expect(mapFeature({
      ...liveCamera,
      geometry: { type: 'Point', coordinates: [-118.24, 34.05] },
    })).toBeNull();
    // And just east of the state bounds box, across the Mississippi.
    expect(mapFeature({
      ...liveCamera,
      geometry: { type: 'Point', coordinates: [-89.4, 35.15] },
    })).toBeNull();
  });

  it('drops a record with no coordinates, no properties or no id', () => {
    expect(mapFeature({ ...liveCamera, geometry: null })).toBeNull();
    expect(mapFeature({ ...liveCamera, properties: null })).toBeNull();
    expect(mapFeature({
      ...liveCamera,
      properties: { ...liveCamera.properties, id: null },
    })).toBeNull();
  });
});

describe('snapshotUrl', () => {
  it('builds the layers snapshot URL from the camera id', () => {
    expect(snapshotUrl(457)).toBe('https://layers.idrivearkansas.com/cameras/457.jpg');
    expect(snapshotUrl('249')).toBe('https://layers.idrivearkansas.com/cameras/249.jpg');
  });
});
