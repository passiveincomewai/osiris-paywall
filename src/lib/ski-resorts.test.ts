import { describe, expect, it } from 'vitest';
import {
  getSkiResort,
  haversineKm,
  isSnowStakeCamera,
  projectOntoRoute,
  selectResortCameras,
  selectRouteCameras,
  skiResortSlug,
  SKI_RESORTS,
  type SkiResort,
} from './ski-resorts';
import type { CountryCamera } from './country-cameras';

const cam = (partial: Partial<CountryCamera> & { id: string }): CountryCamera => ({
  name: partial.id,
  ...partial,
});

/* A synthetic resort at a round coordinate so distances are easy to
   reason about: 0.01° of latitude ≈ 1.11 km. */
const resort: SkiResort = {
  slug: 'test-peak',
  name: 'Test Peak',
  town: 'Testville',
  region: 'Testshire',
  country: 'Testland',
  countrySlug: 'testland',
  lat: 45,
  lng: 7,
  resortCameraCount: 0,
  nearbyCameraCount: 0,
};

describe('skiResortSlug', () => {
  it('slugifies names the way the generator does', () => {
    expect(skiResortSlug("Val d'Isère")).toBe('val-d-isere');
    expect(skiResortSlug('St. Anton am Arlberg')).toBe('st-anton-am-arlberg');
    expect(skiResortSlug('Mt. Bachelor')).toBe('mt-bachelor');
  });

  it('matches every slug in the generated dataset', () => {
    for (const r of SKI_RESORTS) expect(skiResortSlug(r.name)).toBe(r.slug);
  });
});

describe('haversineKm', () => {
  it('measures a degree of latitude at ~111 km', () => {
    expect(haversineKm(45, 7, 46, 7)).toBeCloseTo(111.19, 1);
  });
  it('is zero for the same point and symmetric', () => {
    expect(haversineKm(45, 7, 45, 7)).toBe(0);
    expect(haversineKm(45, 7, 46, 8)).toBeCloseTo(haversineKm(46, 8, 45, 7), 9);
  });
});

describe('selectResortCameras', () => {
  it('splits records into the resort ring and the nearby ring, nearest first', () => {
    const records = [
      cam({ id: 'far', lat: 45.3, lng: 7 }), // ~33 km → nearby
      cam({ id: 'near-b', lat: 45.05, lng: 7 }), // ~5.6 km → resort
      cam({ id: 'near-a', lat: 45.01, lng: 7 }), // ~1.1 km → resort
      cam({ id: 'out', lat: 46, lng: 7 }), // ~111 km → excluded
    ];
    const out = selectResortCameras(records, resort);
    expect(out.resort.map(c => c.id)).toEqual(['near-a', 'near-b']);
    expect(out.nearby.map(c => c.id)).toEqual(['far']);
  });

  it('ignores records without coordinates', () => {
    const out = selectResortCameras([cam({ id: 'ghost' })], resort);
    expect(out.resort).toEqual([]);
    expect(out.nearby).toEqual([]);
  });

  it('collapses the same camera reported twice at the same spot', () => {
    const records = [
      cam({ id: 'a', name: 'Base Lift', lat: 45.01, lng: 7 }),
      cam({ id: 'b', name: 'Base Lift', lat: 45.0105, lng: 7 }),
    ];
    expect(selectResortCameras(records, resort).resort).toHaveLength(1);
  });

  it('pins snow-stake cameras to the top of the resort grid', () => {
    const records = [
      cam({ id: 'slope', name: 'Base Lift', lat: 45.01, lng: 7 }),
      cam({ id: 'stake', name: 'Test Peak Snow Stake', lat: 45.05, lng: 7 }),
      cam({ id: 'mid', name: 'Mid Mountain', lat: 45.03, lng: 7 }),
    ];
    expect(selectResortCameras(records, resort).resort.map(c => c.id)).toEqual([
      'stake',
      'slope',
      'mid',
    ]);
  });
});

describe('isSnowStakeCamera', () => {
  it('matches the names operators give stake cameras', () => {
    expect(isSnowStakeCamera(cam({ id: '1', name: 'Alta Snow Stake' }))).toBe(true);
    expect(isSnowStakeCamera(cam({ id: '2', name: 'Snowstake — Mid Gad' }))).toBe(true);
    expect(isSnowStakeCamera(cam({ id: '3', name: 'SR-210 Snow-Stake Cam' }))).toBe(true);
  });
  it('does not match ordinary slope or road cameras', () => {
    expect(isSnowStakeCamera(cam({ id: '4', name: 'Base Area Looking Up' }))).toBe(false);
    expect(isSnowStakeCamera(cam({ id: '5', name: 'Staker Road at Milepost 4' }))).toBe(false);
  });
});

/* A straight east–west route at latitude 45 from lng 7.0 to 7.2
   (~15.7 km), as [lng, lat] pairs like the directions API returns. */
const ROUTE: [number, number][] = [
  [7.0, 45.0],
  [7.1, 45.0],
  [7.2, 45.0],
];

describe('projectOntoRoute', () => {
  it('projects a point beside the middle of the route', () => {
    /* 0.01° north of the midpoint: off ≈ 1.11 km, along ≈ half the route. */
    const p = projectOntoRoute(45.01, 7.1, ROUTE);
    expect(p).not.toBeNull();
    expect(p!.offKm).toBeCloseTo(1.11, 1);
    expect(p!.alongKm).toBeCloseTo(7.86, 1);
  });

  it('clamps a point beyond the end to the end vertex', () => {
    const p = projectOntoRoute(45.0, 7.3, ROUTE);
    expect(p!.alongKm).toBeCloseTo(15.73, 1);
    expect(p!.offKm).toBeCloseTo(7.86, 1);
  });

  it('returns null for an empty route', () => {
    expect(projectOntoRoute(45, 7, [])).toBeNull();
  });
});

describe('selectRouteCameras', () => {
  it('keeps only corridor cameras and orders them along the route', () => {
    const records = [
      cam({ id: 'late', lat: 45.002, lng: 7.18 }), // ~0.22 km off, near the end
      cam({ id: 'early', lat: 44.998, lng: 7.02 }), // ~0.22 km off, near the start
      cam({ id: 'mid', lat: 45.0, lng: 7.1 }), // on the line
      cam({ id: 'away', lat: 45.05, lng: 7.1 }), // ~5.6 km off — outside a 2.5 km corridor
    ];
    const out = selectRouteCameras(records, ROUTE);
    expect(out.map(r => r.cam.id)).toEqual(['early', 'mid', 'late']);
    expect(out[0].alongKm).toBeLessThan(out[1].alongKm);
    expect(out[2].offKm).toBeLessThan(2.5);
  });

  it('respects a custom corridor width', () => {
    const records = [cam({ id: 'away', lat: 45.05, lng: 7.1 })];
    expect(selectRouteCameras(records, ROUTE, 2.5)).toEqual([]);
    expect(selectRouteCameras(records, ROUTE, 6)).toHaveLength(1);
  });
});

describe('the generated dataset', () => {
  it('holds resorts whose stated counts clear the coverage gate', () => {
    expect(SKI_RESORTS.length).toBeGreaterThan(0);
    for (const r of SKI_RESORTS) {
      expect(r.resortCameraCount).toBeGreaterThanOrEqual(1);
      expect(r.resortCameraCount + r.nearbyCameraCount).toBeGreaterThanOrEqual(4);
      expect(getSkiResort(r.slug)).toBe(r);
    }
  });

  it('has no two resorts close enough to be the same page twice', () => {
    for (let i = 0; i < SKI_RESORTS.length; i++) {
      for (let j = i + 1; j < SKI_RESORTS.length; j++) {
        const d = haversineKm(SKI_RESORTS[i].lat, SKI_RESORTS[i].lng, SKI_RESORTS[j].lat, SKI_RESORTS[j].lng);
        expect(d, `${SKI_RESORTS[i].name} vs ${SKI_RESORTS[j].name}`).toBeGreaterThanOrEqual(6);
      }
    }
  });
});
