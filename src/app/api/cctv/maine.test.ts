import { describe, it, expect } from 'vitest';
import { mapRecord, type MaineCameraRecord } from './maine';

/** A Maine camera, verbatim from newengland511.org's /List/GetData/Cameras. */
const maineCamera: MaineCameraRecord = {
  id: 1733,
  roadway: 'I-395',
  direction: 'Westbound',
  location: 'I-395 Mile 6 NB (Brewer)',
  state: 'Maine',
  areaId: 'ME',
  latLng: { geography: { wellKnownText: 'POINT (-68.722354 44.771244)' } },
  images: [{
    id: 2341,
    imageUrl: '/map/Cctv/2341',
    isVideoAuthRequired: false,
    videoDisabled: false,
    disabled: false,
    blocked: false,
  }],
};

/** A Maine Turnpike camera whose `location` is an internal code string. */
const codedCamera: MaineCameraRecord = {
  id: 1580,
  roadway: 'I-95',
  direction: 'Southbound',
  location: '95 SS 2.4 CCTV AX MTA',
  state: 'Maine',
  areaId: 'ME',
  latLng: { geography: { wellKnownText: 'POINT (-70.74995 43.10323)' } },
  images: [{
    id: 2188,
    imageUrl: '/map/Cctv/2188',
    isVideoAuthRequired: false,
    videoDisabled: false,
    disabled: false,
    blocked: false,
  }],
};

/** The same list interleaves the other two states — this one is New Hampshire's. */
const newHampshireCamera: MaineCameraRecord = {
  id: 666,
  roadway: 'NH-9',
  direction: 'Westbound',
  location: '9 W MM 10.7 - RWIS Station',
  state: 'New Hampshire',
  areaId: 'NH',
  latLng: { geography: { wellKnownText: 'POINT (-72.369432 42.928211)' } },
  images: [{
    id: 1274,
    imageUrl: '/map/Cctv/1274',
    isVideoAuthRequired: false,
    videoDisabled: false,
    disabled: false,
    blocked: false,
  }],
};

describe('mapRecord', () => {
  it('maps a Maine camera to its New England 511 snapshot', () => {
    expect(mapRecord(maineCamera)).toEqual({
      id: 'medot-1733',
      lat: 44.771244,
      lng: -68.722354,
      name: 'I-395 Mile 6 NB (Brewer)',
      city: 'Maine',
      country: 'US',
      feed_url: 'https://newengland511.org/map/Cctv/2341',
      source: 'MaineDOT',
    });
  });

  it('keeps a coded location as the name when that is all the feed publishes', () => {
    expect(mapRecord(codedCamera)?.name).toBe('95 SS 2.4 CCTV AX MTA');
    expect(mapRecord(codedCamera)?.feed_url).toBe('https://newengland511.org/map/Cctv/2188');
  });

  it('drops New Hampshire and Vermont rows from the shared tri-state list', () => {
    expect(mapRecord(newHampshireCamera)).toBeNull();
    expect(mapRecord({ ...maineCamera, state: 'Vermont', areaId: 'VT' })).toBeNull();
  });

  it('drops blocked or disabled cameras', () => {
    expect(mapRecord({
      ...maineCamera,
      images: [{ ...maineCamera.images![0], blocked: true }],
    })).toBeNull();
    expect(mapRecord({
      ...maineCamera,
      images: [{ ...maineCamera.images![0], disabled: true }],
    })).toBeNull();
  });

  it('drops coordinates outside Maine', () => {
    // Same record, moved to Boston.
    expect(mapRecord({
      ...maineCamera,
      latLng: { geography: { wellKnownText: 'POINT (-71.0589 42.3601)' } },
    })).toBeNull();
  });

  it('drops a record with no coordinates or no image', () => {
    expect(mapRecord({ ...maineCamera, latLng: null })).toBeNull();
    expect(mapRecord({ ...maineCamera, images: [] })).toBeNull();
  });
});
