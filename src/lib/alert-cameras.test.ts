import { describe, expect, it } from 'vitest';
import {
  californiaCameras,
  countyDisplayName,
  countyGroups,
  countyKey,
  filterCameras,
  isCaliforniaCamera,
  sortForGrid,
  type AlertCam,
} from './alert-cameras';

function cam(partial: Partial<AlertCam>): AlertCam {
  return {
    id: 'x',
    name: 'Camera',
    county: 'kern',
    org: 'alertcalifornia',
    img: 'https://example.com/frame.jpg',
    url: 'https://example.com/cam',
    online: true,
    lat: 35.4,
    lng: -118.9,
    ...partial,
  };
}

describe('countyKey / countyDisplayName', () => {
  it('normalises the feed’s space-stripped county values', () => {
    expect(countyKey('sanluisobispo')).toBe('sanluisobispo');
    expect(countyKey('San Luis Obispo')).toBe('sanluisobispo');
  });

  it('maps feed values to official California county names', () => {
    expect(countyDisplayName('losangeles')).toBe('Los Angeles');
    expect(countyDisplayName('sanbernardino')).toBe('San Bernardino');
    expect(countyDisplayName('santaclara')).toBe('Santa Clara');
    expect(countyDisplayName('delnorte')).toBe('Del Norte');
    expect(countyDisplayName('eldorado')).toBe('El Dorado');
    expect(countyDisplayName('contracosta')).toBe('Contra Costa');
    expect(countyDisplayName('kern')).toBe('Kern');
    expect(countyDisplayName('nevada')).toBe('Nevada');
  });

  it('handles empty and unrecognised counties honestly', () => {
    expect(countyDisplayName('')).toBe('Unknown county');
    expect(countyDisplayName('someplace')).toBe('Someplace');
  });
});

describe('isCaliforniaCamera', () => {
  it('accepts a California county even at the state’s edge', () => {
    // South Lake Tahoe sits just east of the −120° meridian.
    expect(isCaliforniaCamera(cam({ county: 'eldorado', lat: 38.93, lng: -119.98 }))).toBe(true);
  });

  it('accepts coordinates inside California when the county is unknown', () => {
    expect(isCaliforniaCamera(cam({ county: '', lat: 37.77, lng: -122.42 }))).toBe(true);
  });

  it('rejects a Nevada camera (Reno coordinates, non-CA county)', () => {
    expect(isCaliforniaCamera(cam({ county: 'washoe', lat: 39.53, lng: -119.81 }))).toBe(false);
  });

  it('rejects coordinates outside the state entirely', () => {
    expect(isCaliforniaCamera(cam({ county: '', lat: 45.5, lng: -122.6 }))).toBe(false);
    expect(isCaliforniaCamera(cam({ county: '', lat: 36.1, lng: -115.17 }))).toBe(false);
  });

  it('californiaCameras filters a mixed set', () => {
    const mixed = [
      cam({ id: 'a', county: 'kern' }),
      cam({ id: 'b', county: 'washoe', lat: 39.53, lng: -119.81 }),
      cam({ id: 'c', county: 'sandiego' }),
    ];
    expect(californiaCameras(mixed).map((c) => c.id)).toEqual(['a', 'c']);
  });
});

describe('countyGroups / sortForGrid', () => {
  const set = [
    cam({ id: '1', name: 'B Peak', county: 'kern' }),
    cam({ id: '2', name: 'A Peak', county: 'kern' }),
    cam({ id: '3', name: 'C Peak', county: 'losangeles' }),
    cam({ id: '4', name: 'D Peak', county: 'losangeles' }),
    cam({ id: '5', name: 'E Peak', county: 'losangeles' }),
    cam({ id: '6', name: 'F Peak', county: 'sandiego' }),
  ];

  it('groups by county, biggest first, with display names', () => {
    expect(countyGroups(set)).toEqual([
      { key: 'losangeles', name: 'Los Angeles', count: 3 },
      { key: 'kern', name: 'Kern', count: 2 },
      { key: 'sandiego', name: 'San Diego', count: 1 },
    ]);
  });

  it('sorts the grid by county group rank, then camera name', () => {
    expect(sortForGrid(set).map((c) => c.id)).toEqual(['3', '4', '5', '2', '1', '6']);
    // input not mutated
    expect(set.map((c) => c.id)).toEqual(['1', '2', '3', '4', '5', '6']);
  });
});

describe('filterCameras', () => {
  const set = [
    cam({ id: '1', name: 'Antelope Mtn. 1', county: 'lassen' }),
    cam({ id: '2', name: 'Bald Mtn.', county: 'sanluisobispo' }),
    cam({ id: '3', name: 'Antelope Valley', county: 'losangeles' }),
  ];

  it('matches on camera name', () => {
    expect(filterCameras(set, 'antelope', null).map((c) => c.id)).toEqual(['1', '3']);
  });

  it('matches on the county display name, not just the raw value', () => {
    expect(filterCameras(set, 'san luis', null).map((c) => c.id)).toEqual(['2']);
    expect(filterCameras(set, 'los angeles', null).map((c) => c.id)).toEqual(['3']);
  });

  it('combines query and county filter', () => {
    expect(filterCameras(set, 'antelope', 'lassen').map((c) => c.id)).toEqual(['1']);
    expect(filterCameras(set, 'antelope', 'kern')).toEqual([]);
  });

  it('empty query and no county return everything', () => {
    expect(filterCameras(set, '  ', null)).toHaveLength(3);
  });
});
