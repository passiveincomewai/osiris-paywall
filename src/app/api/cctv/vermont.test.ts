import { describe, it, expect } from 'vitest';
import { mapRecord, type VermontCameraRecord } from './vermont';

/** A live Vermont camera, verbatim from newengland511.org's Cameras list. */
const liveCamera: VermontCameraRecord = {
  id: 622,
  areaId: 'VT',
  roadway: 'I-189',
  direction: 'Westbound',
  location: 'I-189 SOUTH BURLINGTON',
  city: null,
  county: null,
  latLng: { geography: { wellKnownText: 'POINT (-73.199637 44.449335)' } },
  images: [{
    imageUrl: '/map/Cctv/1230',
    isVideoAuthRequired: false,
    videoDisabled: false,
    disabled: false,
    blocked: false,
  }],
};

/** A New Hampshire row from the same tri-state response. */
const newHampshireCamera: VermontCameraRecord = {
  ...liveCamera,
  id: 666,
  areaId: 'NH',
  location: '9 W MM 10.7 - RWIS Station',
  latLng: { geography: { wellKnownText: 'POINT (-72.369432 42.928211)' } },
  images: [{ imageUrl: '/map/Cctv/1274' }],
};

describe('mapRecord', () => {
  it('maps a live Vermont camera to a snapshot feed', () => {
    expect(mapRecord(liveCamera)).toEqual({
      id: 'vtrans-622',
      lat: 44.449335,
      lng: -73.199637,
      name: 'I-189 SOUTH BURLINGTON',
      city: 'Vermont',
      country: 'US',
      feed_url: 'https://www.newengland511.org/map/Cctv/1230',
      source: 'Vermont Agency of Transportation',
    });
  });

  it('drops New Hampshire and Maine rows from the tri-state feed', () => {
    expect(mapRecord(newHampshireCamera)).toBeNull();
    expect(mapRecord({ ...liveCamera, areaId: 'ME' })).toBeNull();
    expect(mapRecord({ ...liveCamera, areaId: null })).toBeNull();
  });

  it('drops a site that serves the shared placeholder image', () => {
    // Site 814 (BENNINGTON US-7 North) returned the platform's static
    // 540×330 placeholder PNG on 2026-10-22, byte-identical to three other
    // cameras — the feed itself flags nothing.
    expect(mapRecord({
      ...liveCamera,
      id: 814,
      location: 'BENNINGTON US-7 North',
      latLng: { geography: { wellKnownText: 'POINT (-73.20299 42.90512)' } },
      images: [{ imageUrl: '/map/Cctv/1422' }],
    })).toBeNull();
  });

  it('drops blocked or disabled images', () => {
    expect(mapRecord({ ...liveCamera, images: [{ imageUrl: '/map/Cctv/1230', blocked: true }] })).toBeNull();
    expect(mapRecord({ ...liveCamera, images: [{ imageUrl: '/map/Cctv/1230', disabled: true }] })).toBeNull();
    expect(mapRecord({ ...liveCamera, images: [] })).toBeNull();
  });

  it('drops coordinates outside Vermont', () => {
    // Same record, moved to Boston.
    expect(mapRecord({
      ...liveCamera,
      latLng: { geography: { wellKnownText: 'POINT (-71.0589 42.3601)' } },
    })).toBeNull();
  });

  it('drops a record with no coordinates', () => {
    expect(mapRecord({ ...liveCamera, latLng: null })).toBeNull();
    expect(mapRecord({ ...liveCamera, latLng: { geography: { wellKnownText: null } } })).toBeNull();
  });

  it('falls back to a generated name when the row names no place', () => {
    const cam = mapRecord({ ...liveCamera, location: null, roadway: null, direction: null });
    expect(cam?.name).toBe('Vermont Camera 622');
  });
});
