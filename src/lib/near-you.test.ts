import { describe, expect, it } from 'vitest';
import {
  areaLabelFor,
  dismissNearYou,
  formatApproxDistance,
  isNearYouDismissed,
  planNearYou,
  NEAR_YOU_DISMISS_KEY,
  type NearYouStore,
} from './near-you';
import type { CameraCandidate } from './nearby-cameras';
import type { VisitorLocation } from './visitor-geo';

// Salt Lake City reference point; 0.001° of latitude ≈ 111 m.
const SLC: VisitorLocation = { lat: 40.7608, lng: -111.891, city: 'Salt Lake City', region: 'UT', country: 'US' };
const cam = (id: string, lat: number, lng: number, extra: Partial<CameraCandidate> = {}): CameraCandidate => ({
  id, name: `Cam ${id}`, city: 'Salt Lake City', lat, lng, ...extra,
});

describe('formatApproxDistance', () => {
  it('rounds to whole kilometres with an approximation mark', () => {
    expect(formatApproxDistance(12_400)).toBe('≈12 km');
    expect(formatApproxDistance(12_500)).toBe('≈13 km');
    expect(formatApproxDistance(49_900)).toBe('≈50 km');
  });

  it('never claims sub-kilometre precision from a city-level point', () => {
    expect(formatApproxDistance(120)).toBe('≈1 km');
    expect(formatApproxDistance(0)).toBe('≈1 km');
  });
});

describe('areaLabelFor', () => {
  it('prefers city, then region, then country', () => {
    expect(areaLabelFor(SLC)).toBe('Salt Lake City');
    expect(areaLabelFor({ ...SLC, city: null })).toBe('UT');
    expect(areaLabelFor({ ...SLC, city: null, region: null })).toBe('US');
    expect(areaLabelFor({ ...SLC, city: null, region: null, country: null })).toBe('Your Area');
    expect(areaLabelFor(null)).toBe('Your Area');
  });
});

describe('planNearYou', () => {
  const showcase = [
    { id: 'sky-it-trevi', name: 'Trevi Fountain', city: 'Rome', country: 'Italy' },
    { id: 'sky-fr-calanques', name: 'Calanques', city: 'Marseille', country: 'France' },
  ];

  it('near: cameras inside 50 km, nearest first, capped at 6, with approximate distances', () => {
    const cameras = [
      cam('far-edge', 41.20, -111.891),          // ~48.8 km — inside
      cam('just-outside', 41.22, -111.891),      // ~51 km — outside
      cam('close', 40.7708, -111.891),           // ~1.1 km
      ...Array.from({ length: 7 }, (_, i) => cam(`mid-${i}`, 40.80 + i * 0.01, -111.891)),
    ];
    const plan = planNearYou({ location: SLC, cameras, catalogueSettled: true, showcase });
    expect(plan.kind).toBe('near');
    if (plan.kind !== 'near') return;
    expect(plan.areaLabel).toBe('Salt Lake City');
    expect(plan.items).toHaveLength(6);
    expect(plan.items[0].id).toBe('close');
    expect(plan.items[0].distanceLabel).toBe('≈1 km');
    expect(plan.items.map((i) => i.id)).not.toContain('just-outside');
  });

  it('pending: location known, catalogue not settled, nothing near yet', () => {
    const plan = planNearYou({ location: SLC, cameras: [], catalogueSettled: false, showcase });
    expect(plan).toEqual({ kind: 'pending' });
  });

  it('featured fallback: location known, catalogue settled, nothing within 50 km', () => {
    const cameras = [cam('tokyo', 35.6, 139.7)];
    const plan = planNearYou({ location: SLC, cameras, catalogueSettled: true, showcase });
    expect(plan.kind).toBe('featured');
    if (plan.kind !== 'featured') return;
    expect(plan.items.map((i) => i.id)).toEqual(['sky-it-trevi', 'sky-fr-calanques']);
    // Featured items never carry a distance — they are not near anyone.
    expect(plan.items.every((i) => i.distanceLabel === null)).toBe(true);
  });

  it('featured fallback: no location at all', () => {
    const plan = planNearYou({ location: null, cameras: [], catalogueSettled: false, showcase });
    expect(plan.kind).toBe('featured');
  });

  it('none: featured needed but the showcase set is empty', () => {
    expect(planNearYou({ location: null, cameras: [], catalogueSettled: true, showcase: [] }))
      .toEqual({ kind: 'none' });
    expect(planNearYou({ location: SLC, cameras: [cam('tokyo', 35.6, 139.7)], catalogueSettled: true, showcase: [] }))
      .toEqual({ kind: 'none' });
  });

  it('skips catalogue records without usable coordinates instead of calling them near', () => {
    const cameras = [
      { id: 'broken', name: 'Broken', lat: NaN, lng: NaN } as CameraCandidate,
      cam('ok', 40.7708, -111.891),
    ];
    const plan = planNearYou({ location: SLC, cameras, catalogueSettled: true, showcase: [] });
    expect(plan.kind).toBe('near');
    if (plan.kind === 'near') expect(plan.items.map((i) => i.id)).toEqual(['ok']);
  });
});

describe('dismissal', () => {
  const memoryStore = (): NearYouStore & { data: Record<string, string> } => {
    const data: Record<string, string> = {};
    return { data, get: (k) => data[k] ?? null, set: (k, v) => { data[k] = v; } };
  };

  it('persists permanently under the namespaced key', () => {
    const store = memoryStore();
    expect(isNearYouDismissed(store)).toBe(false);
    dismissNearYou(store);
    expect(store.data[NEAR_YOU_DISMISS_KEY]).toBe('1');
    expect(isNearYouDismissed(store)).toBe(true);
  });

  it('degrades quietly when storage throws', () => {
    const broken: NearYouStore = {
      get: () => { throw new Error('denied'); },
      set: () => { throw new Error('denied'); },
    };
    expect(isNearYouDismissed(broken)).toBe(false);
    expect(() => dismissNearYou(broken)).not.toThrow();
  });
});
