import { describe, it, expect } from 'vitest';
import { buildViewShareUrl } from './view';

const BASE = 'https://worldeye.app';

describe('buildViewShareUrl — the canonical globe view link', () => {
  it('pins the established format: lat, lon, zoom in order at 4dp/4dp/2dp', () => {
    expect(buildViewShareUrl({ lat: 40.7411, lng: -73.9897, zoom: 9.5 }, BASE)).toBe(
      'https://worldeye.app/?lat=40.7411&lon=-73.9897&zoom=9.50',
    );
  });

  it('rounds coordinates and zoom to the link precision', () => {
    expect(buildViewShareUrl({ lat: 40.74114, lng: -73.98966, zoom: 9.504 }, BASE)).toBe(
      'https://worldeye.app/?lat=40.7411&lon=-73.9897&zoom=9.50',
    );
  });

  it('appends the layers csv only when layers are active', () => {
    expect(
      buildViewShareUrl({ lat: 20, lng: 0, zoom: 2.5, layers: ['cameras', 'flights'] }, BASE),
    ).toBe('https://worldeye.app/?lat=20.0000&lon=0.0000&zoom=2.50&layers=cameras%2Cflights');
    expect(buildViewShareUrl({ lat: 20, lng: 0, zoom: 2.5, layers: [] }, BASE)).toBe(
      'https://worldeye.app/?lat=20.0000&lon=0.0000&zoom=2.50',
    );
    expect(buildViewShareUrl({ lat: 20, lng: 0, zoom: 2.5 }, BASE)).toBe(
      'https://worldeye.app/?lat=20.0000&lon=0.0000&zoom=2.50',
    );
  });

  it('drops empty layer keys rather than emitting blank segments', () => {
    expect(
      buildViewShareUrl({ lat: 1, lng: 2, zoom: 3, layers: ['', 'cameras'] }, BASE),
    ).toBe('https://worldeye.app/?lat=1.0000&lon=2.0000&zoom=3.00&layers=cameras');
  });

  it('tolerates a trailing slash on an explicit base', () => {
    expect(buildViewShareUrl({ lat: 1, lng: 2, zoom: 3 }, 'https://worldeye.app/')).toBe(
      'https://worldeye.app/?lat=1.0000&lon=2.0000&zoom=3.00',
    );
  });
});
