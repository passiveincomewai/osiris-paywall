import { describe, it, expect } from 'vitest';
import { mapFeature, type KdotFeature } from './kansas';

/** A live RWIS-style still, verbatim from kandrive.gov's MapFeatures response. */
const rwisCamera: KdotFeature = {
  title: 'K-39 at Neosho River, Chanute MP 27',
  uri: 'camera/1',
  features: [{ geometry: { coordinates: [-95.46492, 37.688] } }],
  __typename: 'Camera',
  active: true,
  views: [{ url: 'https://kscam.carsprogram.org/KDOT_573004_IMAGE001.JPG?1792657620000', category: 'IMAGE' }],
};

/** A Wichita VIDEO view — the API exposes only its JPEG snapshot. */
const wichitaCamera: KdotFeature = {
  title: 'US-54 at Maize',
  uri: 'camera/2401',
  features: [{ geometry: { coordinates: [-97.4601, 37.66575] } }],
  __typename: 'Camera',
  active: true,
  views: [{ url: 'https://kscam.carsprogram.org/snapshots/GEN_5-054-2089-2-US-54atMaize.jpeg', category: 'VIDEO' }],
};

/** A KC Scout snapshot published through KanDrive. */
const kcScoutCamera: KdotFeature = {
  title: '435 SB @ Farley/Hampton Rd',
  uri: 'camera/2356',
  features: [{ geometry: { coordinates: [-94.76378, 39.27769] } }],
  __typename: 'Camera',
  active: true,
  views: [{ url: 'https://www.kcscout.net/TransSuite.VCS.CameraSnapshots/PTCCTV0044-LQ.jpg?1792657620000', category: 'IMAGE' }],
};

describe('mapFeature', () => {
  it('maps an RWIS still and strips the per-request cache-buster', () => {
    expect(mapFeature(rwisCamera)).toEqual({
      id: 'kdot-1',
      lat: 37.688,
      lng: -95.46492,
      name: 'K-39 at Neosho River, Chanute MP 27',
      city: 'Kansas',
      country: 'US',
      feed_url: 'https://kscam.carsprogram.org/KDOT_573004_IMAGE001.JPG',
      stream_type: 'jpg',
      external_url: 'https://kandrive.gov/@37.688,-95.46492,14?show=camera%2F1',
      source: 'Kansas DOT',
    });
  });

  it('maps a VIDEO view to its JPEG snapshot (no HLS is published)', () => {
    expect(mapFeature(wichitaCamera)).toEqual({
      id: 'kdot-2401',
      lat: 37.66575,
      lng: -97.4601,
      name: 'US-54 at Maize',
      city: 'Kansas',
      country: 'US',
      feed_url: 'https://kscam.carsprogram.org/snapshots/GEN_5-054-2089-2-US-54atMaize.jpeg',
      stream_type: 'jpg',
      external_url: 'https://kandrive.gov/@37.66575,-97.4601,14?show=camera%2F2401',
      source: 'Kansas DOT',
    });
  });

  it('maps a KC Scout snapshot served through KanDrive', () => {
    const cam = mapFeature(kcScoutCamera);
    expect(cam?.id).toBe('kdot-2356');
    expect(cam?.feed_url).toBe('https://www.kcscout.net/TransSuite.VCS.CameraSnapshots/PTCCTV0044-LQ.jpg');
  });

  it('drops a camera whose feed is a placeholder icon, not a still', () => {
    expect(mapFeature({
      ...wichitaCamera,
      views: [{ url: '/images/icon-camera-closed-fill-solid-padded.svg', category: 'VIDEO' }],
    })).toBeNull();
  });

  it('drops a camera with no view URL', () => {
    expect(mapFeature({
      ...rwisCamera,
      views: [{ url: null, category: 'IMAGE' }],
    })).toBeNull();
  });

  it('drops a still from an unexpected host', () => {
    expect(mapFeature({
      ...rwisCamera,
      views: [{ url: 'https://example.com/KDOT_573004_IMAGE001.JPG', category: 'IMAGE' }],
    })).toBeNull();
  });

  it('drops inactive cameras and non-camera features', () => {
    expect(mapFeature({ ...rwisCamera, active: false })).toBeNull();
    expect(mapFeature({ ...rwisCamera, __typename: 'Event' })).toBeNull();
  });

  it('drops coordinates outside Kansas', () => {
    // Same record, moved to Los Angeles.
    expect(mapFeature({
      ...rwisCamera,
      features: [{ geometry: { coordinates: [-118.24, 34.05] } }],
    })).toBeNull();
  });

  it('drops a record with no coordinates or no id', () => {
    expect(mapFeature({ ...rwisCamera, features: [] })).toBeNull();
    expect(mapFeature({ ...rwisCamera, uri: null })).toBeNull();
  });
});
