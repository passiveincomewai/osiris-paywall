import { describe, expect, it } from 'vitest';
import {
  bearingCompass,
  buildPairGlobeUrl,
  formatDistance,
  haversineKm,
  initialBearingDeg,
  placeLabel,
  sameCamera,
  searchCameras,
  sphericalMidpoint,
  toCameraPick,
  type CameraPick,
} from './camera-distance';

const NYC = { lat: 40.7128, lng: -74.006 };
const LA = { lat: 34.0522, lng: -118.2437 };
const LONDON = { lat: 51.5074, lng: -0.1278 };
const PARIS = { lat: 48.8566, lng: 2.3522 };

describe('haversineKm', () => {
  it('is 0 for the same point', () => {
    expect(haversineKm(NYC, NYC)).toBe(0);
  });

  // Reference values computed independently (Python haversine, same
  // IUGG mean radius); WGS84-geodesic figures differ by ~0.3% at most,
  // which is why the tool labels its numbers straight-line estimates.
  it('matches the New York → Los Angeles reference distance', () => {
    expect(haversineKm(NYC, LA)).toBeCloseTo(3935.8, 0);
  });

  it('matches the London → Paris reference distance', () => {
    expect(haversineKm(LONDON, PARIS)).toBeCloseTo(343.6, 0);
  });

  it('is symmetric', () => {
    expect(haversineKm(NYC, LA)).toBeCloseTo(haversineKm(LA, NYC), 9);
  });

  it('returns NaN for out-of-range coordinates', () => {
    expect(Number.isNaN(haversineKm({ lat: 91, lng: 0 }, NYC))).toBe(true);
  });
});

describe('initialBearingDeg + bearingCompass', () => {
  it('London → Paris heads south-south-east (148° on the 16-wind compass)', () => {
    const deg = initialBearingDeg(LONDON, PARIS);
    expect(deg).toBeCloseTo(148.1, 0);
    expect(bearingCompass(deg)).toBe('south-south-east');
  });

  it('New York → Los Angeles heads west (a touch north of due west)', () => {
    const deg = initialBearingDeg(NYC, LA);
    expect(deg).toBeCloseTo(273.7, 0);
    expect(bearingCompass(deg)).toBe('west');
  });

  it('cardinal bearings land on their plain words', () => {
    expect(bearingCompass(0)).toBe('north');
    expect(bearingCompass(45)).toBe('north-east');
    expect(bearingCompass(90)).toBe('east');
    expect(bearingCompass(180)).toBe('south');
    expect(bearingCompass(270)).toBe('west');
  });

  it('wraps past 360 and below 0', () => {
    expect(bearingCompass(359)).toBe('north');
    expect(bearingCompass(-45)).toBe('north-west');
  });
});

describe('sphericalMidpoint', () => {
  it('bisects an equatorial pair', () => {
    const mid = sphericalMidpoint({ lat: 0, lng: 0 }, { lat: 0, lng: 10 });
    expect(mid.lat).toBeCloseTo(0, 6);
    expect(mid.lng).toBeCloseTo(5, 6);
  });

  it('stays on the sphere between two real points', () => {
    const mid = sphericalMidpoint(NYC, LA);
    expect(haversineKm(NYC, mid)).toBeCloseTo(haversineKm(mid, LA), 0);
  });
});

describe('formatDistance', () => {
  it('uses metres under a kilometre', () => {
    expect(formatDistance(0.42).primary).toBe('420 m');
  });

  it('pairs km with miles', () => {
    const f = formatDistance(343.6);
    expect(f.primary).toBe('343.6 km');
    expect(f.secondary).toBe('213.5 miles');
  });

  it('drops the decimal on long hauls', () => {
    expect(formatDistance(3935.8).primary).toBe('3,936 km');
  });
});

const CATALOGUE: CameraPick[] = [
  { id: 'a1', name: 'Main Street', city: 'Springfield', country: 'United States', lat: 39.78, lng: -89.65 },
  { id: 'a2', name: 'Main Street', city: 'Franklin', country: 'United States', lat: 35.92, lng: -86.87 },
  { id: 'b1', name: 'Shibuya Crossing', city: 'Tokyo', country: 'Japan', lat: 35.6595, lng: 139.7005 },
  { id: 'b2', name: 'Tokyo Tower', city: 'Tokyo', country: 'Japan', lat: 35.6586, lng: 139.7454 },
  { id: 'c1', name: 'Broken Record', city: 'Nowhere', country: 'Nowhere', lat: 999, lng: 0 },
];

describe('searchCameras', () => {
  it('returns both same-named cameras, told apart by place', () => {
    const hits = searchCameras(CATALOGUE, 'main street');
    expect(hits.map(h => h.id)).toEqual(['a1', 'a2']); // identical score + name → catalogue order (stable sort)
    const labels = hits.map(h => placeLabel(h));
    expect(labels).toContain('Springfield, United States');
    expect(labels).toContain('Franklin, United States');
    expect(new Set(labels).size).toBe(2);
  });

  it('matches by city as well as by name', () => {
    const hits = searchCameras(CATALOGUE, 'tokyo');
    expect(hits.map(h => h.id).sort()).toEqual(['b1', 'b2']);
  });

  it('never returns a record without valid coordinates', () => {
    expect(searchCameras(CATALOGUE, 'broken')).toEqual([]);
  });

  it('needs at least two characters', () => {
    expect(searchCameras(CATALOGUE, 't')).toEqual([]);
  });

  it('returns nothing when nothing matches', () => {
    expect(searchCameras(CATALOGUE, 'zzzz-not-a-place')).toEqual([]);
  });
});

describe('sameCamera', () => {
  it('matches by catalogue id even if the coords moved', () => {
    expect(sameCamera(CATALOGUE[0], { ...CATALOGUE[0], lat: 0, lng: 0 })).toBe(true);
  });

  it('does not confuse two same-named cameras in different places', () => {
    expect(sameCamera(CATALOGUE[0], CATALOGUE[1])).toBe(false);
  });
});

describe('toCameraPick', () => {
  it('keeps a well-formed record', () => {
    expect(toCameraPick({ id: 7, name: ' Pier Cam ', city: ' Dover ', lat: 51.1, lng: 1.3 })).toEqual({
      id: '7',
      name: 'Pier Cam',
      city: 'Dover',
      lat: 51.1,
      lng: 1.3,
    });
  });

  it('drops records without usable coordinates', () => {
    expect(toCameraPick({ id: 'x', name: 'No Coords' })).toBeNull();
    expect(toCameraPick({ id: 'x', name: 'Bad Coords', lat: 200, lng: 0 })).toBeNull();
  });
});

describe('buildPairGlobeUrl', () => {
  it('builds a geo link centred between the pair (radius clamped by the geo link)', () => {
    // 10° apart on the equator ≈ 1,112 km; half of that exceeds the
    // geo link's 100 km radius ceiling, so the clamp applies.
    const url = buildPairGlobeUrl({ lat: 0, lng: 0 }, { lat: 0, lng: 10 }, 'https://worldeye.app');
    expect(url).toBe('https://worldeye.app/?geo=0.00000,5.00000,100000');
  });

  it('frames a short hop with half its distance', () => {
    // London → Cambridge is 79.47 km reference; half ≈ 39,737 m.
    const url = buildPairGlobeUrl(LONDON, { lat: 52.2053, lng: 0.1218 }, 'https://worldeye.app');
    expect(url).toContain('?geo=');
    expect(Number(url!.split(',')[2])).toBe(39737);
  });

  it('returns null for invalid points', () => {
    expect(buildPairGlobeUrl({ lat: 91, lng: 0 }, NYC)).toBeNull();
  });
});
