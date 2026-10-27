import { describe, it, expect } from 'vitest';
import {
  stopDirectionsDetail,
  dispatchStopDirections,
  pickOrigin,
  directionsApiUrl,
  STOP_DIRECTIONS_EVENT,
} from './directions';

describe('stopDirectionsDetail', () => {
  it('names the stop as the destination and walks to it', () => {
    expect(stopDirectionsDetail({ name: 'Murray Central Station', lat: 40.66, lng: -111.89 })).toEqual({
      label: 'Murray Central Station', lat: 40.66, lng: -111.89, kind: 'stop', mode: 'pedestrian',
    });
  });
  it('the event name is the bridge the page listens for', () => {
    expect(STOP_DIRECTIONS_EVENT).toBe('we:directions-to');
  });
});

describe('directionsApiUrl — the request construction DirectionsBar uses', () => {
  it('builds from/to/mode exactly like the directions fetch', () => {
    expect(directionsApiUrl({ lat: 40.76, lng: -111.89 }, { lat: 40.66, lng: -111.9 }, 'pedestrian'))
      .toBe('/api/directions?from=40.76,-111.89&to=40.66,-111.9&mode=pedestrian');
    expect(directionsApiUrl({ lat: 1, lng: 2 }, { lat: 3, lng: 4 }, 'auto'))
      .toBe('/api/directions?from=1,2&to=3,4&mode=auto');
  });
});

describe('pickOrigin — precedence', () => {
  const geo = { label: 'Current location', lat: 40.7, lng: -111.9, kind: 'current' };
  it('a granted fix wins over the map centre', () => {
    expect(pickOrigin(geo, { lat: 1, lng: 2 })).toEqual(geo);
  });
  it('falls back to the map centre, labelled as such', () => {
    expect(pickOrigin(null, { lat: 40.76, lng: -111.89 })).toEqual({
      label: 'Map centre', lat: 40.76, lng: -111.89, kind: 'coordinate',
    });
  });
  it('neither available ⇒ null (the bar opens with the origin to pick)', () => {
    expect(pickOrigin(null, null)).toBeNull();
  });
});

describe('dispatchStopDirections', () => {
  it('is a safe no-op without a window (SSR / node tests)', () => {
    expect(dispatchStopDirections({ name: 'X', lat: 1, lng: 2 })).toBe(false);
  });
});
