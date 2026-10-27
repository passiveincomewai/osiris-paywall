import { describe, expect, it } from 'vitest';
import {
  FLIGHT_SHARE_ZOOM,
  findFlightFeatureInBuckets,
  flightShareCameraSettledOn,
  flightShareFlyToTarget,
} from './flight-open';

/**
 * Dataset-fallback flight share opens (2026-10-27): a /?flight=<hex>
 * landing whose aircraft sits outside the opening viewport can only
 * resolve through the snapshot blend. These tests pin that the
 * fallback produces a feature the camera can actually fly to — the
 * defect was the card opening with the map left behind.
 */

function rec(over: Record<string, unknown> = {}) {
  return {
    callsign: 'AAL1045',
    icao24: 'ab7da4',
    lat: 33.6407,
    lng: -84.4277,
    heading: 90,
    alt: 0,
    model: 'A321',
    model_name: 'Airbus A321',
    speed_knots: 0,
    registration: 'N902AA',
    aircraft_category: 'plane',
    ...over,
  };
}

const buckets = (over: Record<string, unknown[]> = {}) => ({
  commercial_flights: [],
  private_flights: [],
  private_jets: [],
  military_flights: [],
  ...over,
});

describe('findFlightFeatureInBuckets', () => {
  it('finds the aircraft in any bucket and converts it to a feature', () => {
    const f = findFlightFeatureInBuckets(
      buckets({ private_jets: [rec()] }),
      'ab7da4',
    );
    expect(f).not.toBeNull();
    expect(f!.geometry.coordinates).toEqual([-84.4277, 33.6407]);
    expect(f!.properties.icao24).toBe('ab7da4');
    expect(f!.properties.callsign).toBe('AAL1045');
  });

  it('matches the share id case-insensitively', () => {
    const f = findFlightFeatureInBuckets(
      buckets({ commercial_flights: [rec()] }),
      'AB7DA4',
    );
    expect(f).not.toBeNull();
  });

  it('returns null when the aircraft is not in the dataset', () => {
    expect(
      findFlightFeatureInBuckets(buckets({ commercial_flights: [rec()] }), 'ffffff'),
    ).toBeNull();
    expect(findFlightFeatureInBuckets(buckets(), 'ab7da4')).toBeNull();
    expect(findFlightFeatureInBuckets(null, 'ab7da4')).toBeNull();
    expect(findFlightFeatureInBuckets(undefined, 'ab7da4')).toBeNull();
  });

  it('does not match on registration — hex is the share-id contract', () => {
    // links.ts flightShareId() validates icao24 hex only; a
    // registration-form id must resolve nothing here.
    expect(
      findFlightFeatureInBuckets(buckets({ commercial_flights: [rec()] }), 'N902AA'),
    ).toBeNull();
  });
});

describe('flightShareFlyToTarget', () => {
  it('targets the feature position at share zoom from a zoomed-out globe', () => {
    const f = findFlightFeatureInBuckets(buckets({ commercial_flights: [rec()] }), 'ab7da4');
    const t = flightShareFlyToTarget(f, 1.8);
    expect(t).toEqual({ center: [-84.4277, 33.6407], zoom: FLIGHT_SHARE_ZOOM });
  });

  it('never zooms out when the visitor is already closer', () => {
    const f = findFlightFeatureInBuckets(buckets({ commercial_flights: [rec()] }), 'ab7da4');
    expect(flightShareFlyToTarget(f, 12)?.zoom).toBe(12);
  });

  it('returns null for a feature with no usable position', () => {
    expect(flightShareFlyToTarget(null, 3)).toBeNull();
    expect(flightShareFlyToTarget({}, 3)).toBeNull();
    expect(flightShareFlyToTarget({ geometry: { coordinates: [] } }, 3)).toBeNull();
    expect(
      flightShareFlyToTarget({ geometry: { coordinates: [Number.NaN, 10] } }, 3),
    ).toBeNull();
    expect(
      flightShareFlyToTarget({ geometry: { coordinates: [-84.4, 133.6] } }, 3),
    ).toBeNull();
  });
});

describe('flightShareCameraSettledOn', () => {
  const target: [number, number] = [-84.4277, 33.6407];

  it('is true once the flight has landed on the aircraft', () => {
    expect(flightShareCameraSettledOn({ lng: -84.4277, lat: 33.6407 }, target)).toBe(true);
    expect(flightShareCameraSettledOn({ lng: -84.2, lat: 33.5 }, target)).toBe(true);
  });

  it('is false when the camera stayed on the viewer’s own city', () => {
    // Salt Lake City vs the shared aircraft over Atlanta.
    expect(flightShareCameraSettledOn({ lng: -111.89, lat: 40.76 }, target)).toBe(false);
  });
});
