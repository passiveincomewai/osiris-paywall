import { describe, it, expect } from 'vitest';
import {
  buildEntityShareUrl,
  buildPersonalShareUrl,
  coordShareId,
  coordShareIdFromCoords,
  entityRefFromSearch,
  entityShareTitle,
  eventShareId,
  findByCoordShareId,
  findQuakeByShareId,
  findStormFeatureByShareId,
  fireShareId,
  flightShareId,
  quakeShareId,
  stormShareId,
} from './links';

const BASE = 'https://worldeye.app';

describe('entity ids use each system’s real identifier', () => {
  it('quake = the USGS event id', () => {
    expect(quakeShareId({ id: 'us7000abcd' })).toBe('us7000abcd');
    expect(quakeShareId({ id: '' })).toBeNull();
    expect(quakeShareId(null)).toBeNull();
  });

  it('storm = the NHC stormId off the current-position feature', () => {
    expect(stormShareId({ properties: { stormId: 'al092026' } })).toBe('al092026');
    expect(stormShareId({ properties: {} })).toBeNull();
  });

  it('flight = the icao24 hex, lowercased', () => {
    expect(flightShareId({ icao24: 'A1B2C3' })).toBe('a1b2c3');
    expect(flightShareId({ icao24: 'not-a-hex!' })).toBeNull();
    expect(flightShareId({ icao24: '' })).toBeNull();
  });

  it('fire/event = the coordinate cell at display precision', () => {
    expect(fireShareId({ lat: 39.12345, lng: -105.98765 })).toBe('39.123,-105.988');
    expect(eventShareId({ lat: 50.45, lng: 30.523 })).toBe('50.450,30.523');
    expect(fireShareId({ lat: null, lng: 0 })).toBeNull();
    expect(coordShareId(91, 0)).toBeNull();
    expect(coordShareIdFromCoords([-105.98765, 39.12345])).toBe('39.123,-105.988');
    expect(coordShareIdFromCoords(null)).toBeNull();
  });
});

describe('URL building', () => {
  it('with a code the link rides /ref/<code> and keeps the deep-link param', () => {
    expect(buildEntityShareUrl({ kind: 'quake', id: 'us7000abcd' }, 'weabc123', BASE))
      .toBe('https://worldeye.app/ref/weabc123?quake=us7000abcd');
    expect(buildEntityShareUrl({ kind: 'camera', id: 'occ-123' }, 'jameson', BASE))
      .toBe('https://worldeye.app/ref/jameson?camera=occ-123');
    expect(buildEntityShareUrl({ kind: 'fire', id: '39.123,-105.988' }, 'weabc123', BASE))
      .toBe('https://worldeye.app/ref/weabc123?fire=39.123%2C-105.988');
  });

  it('without a code it is the bare deep link', () => {
    expect(buildEntityShareUrl({ kind: 'flight', id: 'a1b2c3' }, null, BASE))
      .toBe('https://worldeye.app/?flight=a1b2c3');
    expect(buildEntityShareUrl({ kind: 'storm', id: 'al092026' }, '', BASE))
      .toBe('https://worldeye.app/?storm=al092026');
  });

  it('personal link is the affiliate-style /ref/<code>', () => {
    expect(buildPersonalShareUrl('weabc123', BASE)).toBe('https://worldeye.app/ref/weabc123');
    expect(buildPersonalShareUrl('  ', BASE)).toBeNull();
  });
});

describe('parsing a landing URL', () => {
  it('round-trips every kind', () => {
    expect(entityRefFromSearch('?quake=us7000abcd')).toEqual({ kind: 'quake', id: 'us7000abcd' });
    expect(entityRefFromSearch('?flight=A1B2C3')).toEqual({ kind: 'flight', id: 'a1b2c3' });
    expect(entityRefFromSearch('?storm=al092026')).toEqual({ kind: 'storm', id: 'al092026' });
    expect(entityRefFromSearch('?fire=39.123%2C-105.988')).toEqual({ kind: 'fire', id: '39.123,-105.988' });
    expect(entityRefFromSearch('?event=50.450,30.523')).toEqual({ kind: 'event', id: '50.450,30.523' });
    expect(entityRefFromSearch('?camera=occ-123')).toEqual({ kind: 'camera', id: 'occ-123' });
  });

  it('prefers the most specific entity when several params ride along', () => {
    expect(entityRefFromSearch('?event=50.450,30.523&camera=occ-9')?.kind).toBe('camera');
    expect(entityRefFromSearch('?fire=1.000,2.000&quake=us1')?.kind).toBe('quake');
  });

  it('rejects malformed ids instead of resolving garbage', () => {
    expect(entityRefFromSearch('?flight=zz!!')).toBeNull();
    expect(entityRefFromSearch('?fire=abc')).toBeNull();
    expect(entityRefFromSearch('?quake=')).toBeNull();
    expect(entityRefFromSearch('?unknown=1')).toBeNull();
    expect(entityRefFromSearch('')).toBeNull();
    expect(entityRefFromSearch(null)).toBeNull();
  });
});

describe('resolution finders', () => {
  it('finds quakes by exact id', () => {
    const list = [{ id: 'a1' }, { id: 'us7000abcd' }];
    expect(findQuakeByShareId(list, 'us7000abcd')).toBe(list[1]);
    expect(findQuakeByShareId(list, 'nope')).toBeUndefined();
  });

  it('finds only the current-position storm feature', () => {
    const features = [
      { properties: { stormId: 'al092026', kind: 'forecast' } },
      { properties: { stormId: 'al092026', kind: 'current' } },
    ];
    expect(findStormFeatureByShareId(features, 'al092026')).toBe(features[1]);
  });

  it('finds fires/events by coordinate cell', () => {
    const fires = [{ lat: 1, lng: 2 }, { lat: 39.1234, lng: -105.9876 }];
    expect(findByCoordShareId(fires, '39.123,-105.988')).toBe(fires[1]);
    expect(findByCoordShareId(fires, '0.000,0.000')).toBeUndefined();
    expect(findByCoordShareId(null, '39.123,-105.988')).toBeUndefined();
  });
});

describe('titles stay truthful', () => {
  it('uses a supplied verified label, else a per-kind generic', () => {
    expect(entityShareTitle('quake', 'M5.2 — 10km S of Somewhere')).toBe('M5.2 — 10km S of Somewhere — live on WorldEye');
    expect(entityShareTitle('fire')).toBe('Active wildfire — live on WorldEye');
    expect(entityShareTitle('event', '  ')).toBe('Developing event — live on WorldEye');
  });
});
