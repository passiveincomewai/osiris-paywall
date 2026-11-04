import { describe, it, expect } from 'vitest';
import { parseWsdotTravelTimes, parseWsdotDate, wsdotConfigured } from './wsdot';

/** Trimmed from a live WSDOT TravelTimes response captured 2026-11-04
 *  (same field names/shapes; the congested row's CurrentTime was
 *  raised to exercise the ratio). */
const FIXTURE = [
  {
    AverageTime: 25, CurrentTime: 25, Distance: 26.72,
    Description: 'Everett to Downtown Seattle using HOV lanes',
    Name: 'Everett-Seattle HOV',
    StartPoint: { Description: 'I-5 @ 41st St in Everett', Direction: 'S', Latitude: 47.964146, Longitude: -122.199237, MilePost: 192.55, RoadName: '005' },
    EndPoint: { Description: 'I-5 @ University St in Seattle', Direction: 'S', Latitude: 47.609294, Longitude: -122.331759, MilePost: 165.83, RoadName: '005' },
    TimeUpdated: '/Date(1793780400000-0800)/', TravelTimeID: 2,
  },
  {
    AverageTime: 20, CurrentTime: 40, Distance: 12.5,
    Description: 'Congested corridor', Name: 'Test Corridor',
    StartPoint: { Latitude: 47.6, Longitude: -122.3, RoadName: '005' },
    EndPoint: { Latitude: 47.5, Longitude: -122.2, RoadName: '005' },
    TimeUpdated: '/Date(1793784000000-0800)/', TravelTimeID: 3,
  },
  {
    AverageTime: 0, CurrentTime: 10, Name: 'Broken row',
    StartPoint: { Latitude: 47.6, Longitude: -122.3 },
    EndPoint: { Latitude: 47.5, Longitude: -122.2 },
    TimeUpdated: '/Date(1793784000000-0800)/', TravelTimeID: 4,
  },
];

describe('parseWsdotTravelTimes', () => {
  it('maps AverageTime/CurrentTime to relative_speed on an endpoint chord', () => {
    const { features, at } = parseWsdotTravelTimes(FIXTURE);
    expect(features).toHaveLength(2);
    expect(features[0].properties).toMatchObject({ relative_speed: 1, source: 'wsdot', name: 'Everett-Seattle HOV' });
    expect(features[0].geometry).toEqual({
      type: 'LineString',
      coordinates: [[-122.199237, 47.964146], [-122.331759, 47.609294]],
    });
    expect(features[1].properties).toMatchObject({ relative_speed: 0.5 });
    expect(at).toBe(1793784000000);
  });

  it('returns empty for non-array payloads', () => {
    expect(parseWsdotTravelTimes(null)).toEqual({ features: [], at: null });
    expect(parseWsdotTravelTimes({ nope: true }).features).toEqual([]);
  });
});

describe('parseWsdotDate / wsdotConfigured', () => {
  it('parses the WSDOT /Date(ms±offset)/ format', () => {
    expect(parseWsdotDate('/Date(1793780400000-0800)/')).toBe(1793780400000);
    expect(parseWsdotDate('2026-11-04')).toBeNull();
    expect(parseWsdotDate(undefined)).toBeNull();
  });
  it('reads only WSDOT_ACCESS_CODE', () => {
    expect(wsdotConfigured({ ...process.env, WSDOT_ACCESS_CODE: ' x ' })).toBe(true);
    const without = { ...process.env };
    delete without.WSDOT_ACCESS_CODE;
    expect(wsdotConfigured(without)).toBe(false);
  });
});
