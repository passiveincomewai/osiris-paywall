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
const DENVER = { lat: 39.7392, lng: -104.9903 };
const cam = (id: string, lat: number, lng: number, extra: Partial<CameraCandidate> = {}): CameraCandidate => ({
  id, name: `Cam ${id}`, city: 'Salt Lake City', lat, lng,
  // A snapshot feed by default: the visual prompt only offers cameras
  // previewMedia() can resolve a still for. Tests override per case.
  feed_url: `https://cams.example.com/${id}.jpg`,
  ...extra,
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
    { id: 'sky-it-trevi', name: 'Trevi Fountain', city: 'Rome', country: 'Italy', media: { kind: 'jpg' as const, url: 'https://cams.example.com/trevi.jpg' } },
    { id: 'sky-fr-calanques', name: 'Calanques', city: 'Marseille', country: 'France', media: { kind: 'jpg' as const, url: 'https://cams.example.com/calanques.jpg' } },
  ];

  it('near: cameras inside 50 km, nearest first, capped at 4, with approximate distances', () => {
    const cameras = [
      cam('far-edge', 41.20, -111.891),          // ~48.8 km — inside
      cam('just-outside', 41.22, -111.891),      // ~51 km — outside
      cam('close', 40.7708, -111.891),           // ~1.1 km
      ...Array.from({ length: 7 }, (_, i) => cam(`mid-${i}`, 40.80 + i * 0.01, -111.891)),
    ];
    const plan = planNearYou({ location: SLC, centre: null, cameras, catalogueSettled: true, showcase });
    expect(plan.kind).toBe('near');
    if (plan.kind !== 'near') return;
    expect(plan.areaLabel).toBe('Salt Lake City');
    expect(plan.items).toHaveLength(4);
    expect(plan.items[0].id).toBe('close');
    expect(plan.items[0].distanceLabel).toBe('≈1 km');
    expect(plan.items[0].media).toEqual({ kind: 'jpg', url: 'https://cams.example.com/close.jpg' });
    expect(plan.items.map((i) => i.id)).not.toContain('just-outside');
  });

  it('pending: location known, catalogue not settled, nothing near yet', () => {
    const plan = planNearYou({ location: SLC, centre: null, cameras: [], catalogueSettled: false, showcase });
    expect(plan).toEqual({ kind: 'pending' });
  });

  it('featured fallback: location known, catalogue settled, nothing within 50 km', () => {
    const cameras = [cam('tokyo', 35.6, 139.7)];
    const plan = planNearYou({ location: SLC, centre: null, cameras, catalogueSettled: true, showcase });
    expect(plan.kind).toBe('featured');
    if (plan.kind !== 'featured') return;
    expect(plan.items.map((i) => i.id)).toEqual(['sky-it-trevi', 'sky-fr-calanques']);
    // Featured items never carry a distance — they are not near anyone.
    expect(plan.items.every((i) => i.distanceLabel === null)).toBe(true);
    expect(plan.items[0].media.kind).toBe('jpg');
  });

  it('featured fallback: no location at all', () => {
    const plan = planNearYou({ location: null, centre: null, cameras: [], catalogueSettled: false, showcase });
    expect(plan.kind).toBe('featured');
  });

  it('none: featured needed but the showcase set is empty', () => {
    expect(planNearYou({ location: null, centre: null, cameras: [], catalogueSettled: true, showcase: [] }))
      .toEqual({ kind: 'none' });
    expect(planNearYou({ location: SLC, centre: null, cameras: [cam('tokyo', 35.6, 139.7)], catalogueSettled: true, showcase: [] }))
      .toEqual({ kind: 'none' });
  });

  it('skips catalogue records without usable coordinates instead of calling them near', () => {
    const cameras = [
      { id: 'broken', name: 'Broken', lat: NaN, lng: NaN } as CameraCandidate,
      cam('ok', 40.7708, -111.891),
    ];
    const plan = planNearYou({ location: SLC, centre: null, cameras, catalogueSettled: true, showcase: [] });
    expect(plan.kind).toBe('near');
    if (plan.kind === 'near') expect(plan.items.map((i) => i.id)).toEqual(['ok']);
  });

  it('near: a camera with no resolvable still is not offered', () => {
    const cameras = [
      cam('no-media', 40.7708, -111.891, { feed_url: undefined, stream_url: undefined }),
    ];
    const plan = planNearYou({ location: SLC, centre: null, cameras, catalogueSettled: true, showcase });
    expect(plan.kind).toBe('featured');
  });

  it('centre: the view centre wins over the visitor location', () => {
    const cameras = [
      cam('slc-cam', 40.7708, -111.891),
      cam('den-close', 39.7492, -104.9903, { city: 'Denver' }),   // ~1.1 km from centre
      cam('den-mid', 39.8392, -104.9903, { city: 'Denver' }),     // ~11 km from centre
    ];
    const plan = planNearYou({ location: SLC, centre: DENVER, cameras, catalogueSettled: true, showcase });
    expect(plan.kind).toBe('centre');
    if (plan.kind !== 'centre') return;
    // Labelled with the nearest camera's own city — where the camera is.
    expect(plan.areaLabel).toBe('Denver');
    expect(plan.items.map((i) => i.id)).toEqual(['den-close', 'den-mid']);
  });

  it('centre: HLS-only cameras are skipped for the next still-capable one; MP4 is offered', () => {
    const cameras = [
      cam('hls-closest', 39.7492, -104.9903, { city: 'Denver', feed_url: undefined, stream_type: 'hls', stream_url: 'https://cams.example.com/hls.m3u8' }),
      cam('mp4-next', 39.7592, -104.9903, { city: 'Denver', feed_url: undefined, stream_type: 'mp4', stream_url: 'https://cams.example.com/next.mp4' }),
    ];
    const plan = planNearYou({ location: null, centre: DENVER, cameras, catalogueSettled: true, showcase });
    expect(plan.kind).toBe('centre');
    if (plan.kind !== 'centre') return;
    expect(plan.items.map((i) => i.id)).toEqual(['mp4-next']);
    expect(plan.items[0].media).toEqual({ kind: 'mp4', url: 'https://cams.example.com/next.mp4' });
  });

  it('centre: pending while the catalogue is still landing', () => {
    const plan = planNearYou({ location: null, centre: DENVER, cameras: [], catalogueSettled: false, showcase });
    expect(plan).toEqual({ kind: 'pending' });
  });

  it('centre: falls through to near when nothing is near the centre', () => {
    const cameras = [cam('slc-cam', 40.7708, -111.891)];
    const plan = planNearYou({ location: SLC, centre: DENVER, cameras, catalogueSettled: true, showcase });
    expect(plan.kind).toBe('near');
  });

  it('featured: showcase entries without a still-capable media are skipped', () => {
    const visual = [
      { id: 'hls-only', name: 'HLS', city: 'Oslo', country: 'Norway', media: { kind: 'hls' as const, url: 'https://cams.example.com/x.m3u8' } },
      { id: 'no-media', name: 'None', city: 'Oslo', country: 'Norway', media: null },
    ];
    const plan = planNearYou({ location: null, centre: null, cameras: [], catalogueSettled: true, showcase: visual });
    expect(plan).toEqual({ kind: 'none' });
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
