import { describe, it, expect } from 'vitest';
import { mapFeature, cleanTitle, type MassDotFeature } from './massachusetts';

/** A live camera, verbatim from mass511.com's MapFeatures response. */
const liveCamera: MassDotFeature = {
  title: 'I-90: I-90-WB-MM79.4-Charlton-@ MSP C10 West side',
  uri: 'camera/13312',
  features: [{ geometry: { coordinates: [-72.04124, 42.13533] } }],
  __typename: 'Camera',
  active: true,
  views: [{ url: 'https://public.carsprogram.org/cameras/MA/432525-fullJpeg.jpg', category: 'VIDEO' }],
};

describe('mapFeature', () => {
  it('maps a live camera to its JPEG frame', () => {
    expect(mapFeature(liveCamera)).toEqual({
      id: 'massdot-13312',
      lat: 42.13533,
      lng: -72.04124,
      name: 'I-90: I-90-WB-MM79.4-Charlton-@ MSP C10 West side',
      city: 'Massachusetts',
      country: 'US',
      feed_url: 'https://public.carsprogram.org/cameras/MA/432525-fullJpeg.jpg',
      external_url: 'https://mass511.com/@42.13533,-72.04124,14?show=camera%2F13312',
      source: 'MassDOT',
    });
  });

  /* IMAGE-category views carry a `?`-timestamp the site appends; the bare
     address serves the current frame, so the timestamp comes off. */
  it('strips the timestamp query IMAGE views carry', () => {
    expect(mapFeature({
      title: 'I-93: I-93-NB-MM19.4-Charlestown-before Ex 20',
      uri: 'camera/13366',
      features: [{ geometry: { coordinates: [-71.07661, 42.38059] } }],
      __typename: 'Camera',
      active: true,
      views: [{ url: 'https://public.carsprogram.org/cameras/MA/430708-fullJpeg.jpg?1792657620000', category: 'IMAGE' }],
    })?.feed_url).toBe('https://public.carsprogram.org/cameras/MA/430708-fullJpeg.jpg');
  });

  it('drops a camera whose feed is the unavailable placeholder, not a frame', () => {
    expect(mapFeature({
      ...liveCamera,
      uri: 'camera/13660',
      views: [{ url: 'https://public.carsprogram.org/cameras/MA/ma-unavailable.png', category: 'VIDEO' }],
    })).toBeNull();
  });

  it('drops inactive cameras and non-camera features', () => {
    expect(mapFeature({ ...liveCamera, active: false })).toBeNull();
    expect(mapFeature({ ...liveCamera, __typename: 'Event' })).toBeNull();
  });

  it('drops coordinates outside Massachusetts', () => {
    // Same record, moved to Los Angeles.
    expect(mapFeature({
      ...liveCamera,
      features: [{ geometry: { coordinates: [-118.24, 34.05] } }],
    })).toBeNull();
  });

  it('drops a record with no coordinates or no id', () => {
    expect(mapFeature({ ...liveCamera, features: [] })).toBeNull();
    expect(mapFeature({ ...liveCamera, uri: null })).toBeNull();
  });
});

describe('cleanTitle', () => {
  it('leaves MassDOT’s descriptive titles intact', () => {
    expect(cleanTitle('I-90: I-90-WB-MM79.4-Charlton-@ MSP C10 West side'))
      .toBe('I-90: I-90-WB-MM79.4-Charlton-@ MSP C10 West side');
    expect(cleanTitle('I-290: 290-MM021.8EB-Worcester-Ex 24 Plantation St'))
      .toBe('I-290: 290-MM021.8EB-Worcester-Ex 24 Plantation St');
  });

  it('collapses the doubled and trailing spaces some titles arrive with', () => {
    expect(cleanTitle('US 3: Rt3-SB-MM82.0-Chelmsford-After Ex 81A I-495  '))
      .toBe('US 3: Rt3-SB-MM82.0-Chelmsford-After Ex 81A I-495');
  });
});
