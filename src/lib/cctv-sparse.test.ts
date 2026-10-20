import { describe, expect, it } from 'vitest';
import { sparseSampleRegions, SPARSE_CATALOG_CAP } from './cctv-sparse';
import type { RegionCameras } from './cctv-snapshot';

const region = (name: string, n: number) =>
  Array.from({ length: n }, (_, i) => ({ id: `${name}-${i}` }));

describe('sparseSampleRegions', () => {
  it('returns the whole catalogue when it fits under the cap', () => {
    const regions: RegionCameras = { uk: region('uk', 3), japan: region('japan', 2) };
    const sample = sparseSampleRegions(regions, 100);
    expect(sample.heldTotal).toBe(5);
    expect(sample.cameras).toHaveLength(5);
    expect(sample.perRegion).toEqual({ japan: 2, uk: 3 });
  });

  it('caps the sample and keeps every non-empty region represented', () => {
    const regions: RegionCameras = {
      huge: region('huge', 10_000),
      mid: region('mid', 500),
      tiny: region('tiny', 3),
      empty: [],
    };
    const sample = sparseSampleRegions(regions, 200);
    expect(sample.cameras.length).toBeLessThanOrEqual(200);
    expect(sample.perRegion.tiny).toBeGreaterThanOrEqual(1);
    expect(sample.perRegion.mid).toBeGreaterThanOrEqual(1);
    expect(sample.perRegion.empty).toBe(0);
    // Proportional: the huge region dominates the sample.
    expect(sample.perRegion.huge).toBeGreaterThan(sample.perRegion.mid);
    // No duplicates, every sampled record is a real catalogue record.
    const ids = new Set(sample.cameras.map(c => c.id));
    expect(ids.size).toBe(sample.cameras.length);
  });

  it('is deterministic — the same catalogue yields the same sample', () => {
    const regions: RegionCameras = { a: region('a', 999), b: region('b', 333) };
    const first = sparseSampleRegions(regions, 100).cameras.map(c => c.id);
    const second = sparseSampleRegions(regions, 100).cameras.map(c => c.id);
    expect(first).toEqual(second);
  });

  it('spreads picks across a region instead of taking its head', () => {
    const regions: RegionCameras = { a: region('a', 100) };
    const sample = sparseSampleRegions(regions, 4);
    expect(sample.cameras.map(c => c.id)).toEqual(['a-0', 'a-25', 'a-50', 'a-75']);
  });

  it('uses the default cap when none is given', () => {
    const regions: RegionCameras = { a: region('a', SPARSE_CATALOG_CAP + 5_000) };
    expect(sparseSampleRegions(regions).cameras.length).toBe(SPARSE_CATALOG_CAP);
  });
});
