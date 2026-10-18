import { describe, expect, it } from 'vitest';
import type { CctvCamera } from '../../app/api/cctv/types';
import { CameraIndex } from './dedupe';
import { emptyFamilyStats, familyOutcomes, reportReconciles, summarizeFamilies, type HarvestReport } from './pipeline';
import { OCC_HARVEST_SHARDS, shardFor, OCC_HARVEST_SHARD_BOUNDS } from './shards';

/**
 * Dry-run accounting, exercised end to end at the bookkeeping level: a
 * fixture catalogue + fixture candidates classified by the real matchers,
 * with every inspected record landing in exactly one outcome bucket.
 */
describe('dry-run accounting', () => {
  it('reconciles: inspected equals the sum of all outcome buckets', () => {
    const baseline: CctvCamera[] = [
      { id: 'udot-1', lat: 40.59, lng: -111.9, name: 'I-15 at 9000 S', city: '', country: 'US', feed_url: 'https://udot.example.com/1.jpg', source: 'UDOT' },
    ];
    const index = new CameraIndex(baseline);
    const stats = emptyFamilyStats('state511');
    const candidates: CctvCamera[] = [
      // url duplicate of the baseline record
      { id: 'occ-a', lat: 41, lng: -112, name: 'Copy', city: '', country: 'US', feed_url: 'https://udot.example.com/1.jpg', source: 'OpenCCTV / state511' },
      // genuinely new
      { id: 'occ-b', lat: 39.1, lng: -110.5, name: 'New Camera', city: '', country: 'US', feed_url: 'https://new.example.com/2.jpg', source: 'OpenCCTV / state511' },
      // intra-harvest duplicate of occ-b (same URL, different upstream id)
      { id: 'occ-c', lat: 39.1, lng: -110.5, name: 'New Camera', city: '', country: 'US', feed_url: 'https://new.example.com/2.jpg', source: 'OpenCCTV / state511' },
    ];
    for (const cam of candidates) {
      stats.inspected++;
      const result = index.classify(cam);
      if (result.cls === 'duplicate') {
        if (result.matchedId.startsWith('occ-')) stats.intraDuplicates++;
        else stats.duplicates[result.method]++;
      } else {
        stats.verifiedNew++;
        if (result.cls === 'near-distinct') stats.nearDistinct++;
        index.add(cam);
      }
    }
    expect(stats.inspected).toBe(3);
    expect(stats.duplicates['url-full']).toBe(1);
    expect(stats.verifiedNew).toBe(1);
    expect(stats.intraDuplicates).toBe(1);
    expect(familyOutcomes(stats)).toBe(stats.inspected);

    const report: HarvestReport = {
      generatedAt: '2026-10-18T00:00:00.000Z',
      mode: 'dry-run',
      harvest: { markersTotal: 0, idsSelected: 0, recordsFetched: 0, recordsCached: 0 },
      baseline: { total: 1, source: 'fixture' },
      families: [stats],
      totals: summarizeFamilies([stats]),
      reconciles: true,
      notes: [],
    };
    expect(reportReconciles(report)).toBe(true);
  });

  it('detects a broken report', () => {
    const stats = emptyFamilyStats('x');
    stats.inspected = 5;
    stats.verifiedNew = 4;
    const report: HarvestReport = {
      generatedAt: '', mode: 'dry-run',
      harvest: { markersTotal: 0, idsSelected: 0, recordsFetched: 0, recordsCached: 0 },
      baseline: { total: 0, source: 'fixture' },
      families: [stats], totals: summarizeFamilies([stats]), reconciles: false, notes: [],
    };
    expect(reportReconciles(report)).toBe(false);
  });
});

describe('shard partition', () => {
  it('assigns every sampled world coordinate to exactly one shard, inside its bounds', () => {
    for (let lat = -85; lat <= 85; lat += 2.5) {
      for (let lng = -180; lng < 180; lng += 2.5) {
        const shard = shardFor(lat, lng);
        expect(OCC_HARVEST_SHARDS).toContain(shard);
        const b = OCC_HARVEST_SHARD_BOUNDS[shard];
        expect(lat).toBeGreaterThanOrEqual(b.minLat);
        expect(lat).toBeLessThanOrEqual(b.maxLat);
        expect(lng).toBeGreaterThanOrEqual(b.minLng);
        expect(lng).toBeLessThanOrEqual(b.maxLng);
      }
    }
  });

  it('puts the expected cities in the expected shards', () => {
    expect(shardFor(40.59, -111.9)).toBe('occ-north-america'); // Salt Lake City
    expect(shardFor(-23.5, -46.6)).toBe('occ-latin-america'); // São Paulo
    expect(shardFor(51.5, -0.12)).toBe('occ-europe'); // London
    expect(shardFor(-33.9, 18.4)).toBe('occ-africa'); // Cape Town
    expect(shardFor(35.7, 51.4)).toBe('occ-asia-pacific'); // Tehran
    expect(shardFor(25.2, 55.3)).toBe('occ-asia-pacific'); // Dubai
    expect(shardFor(31.2, 29.9)).toBe('occ-africa'); // Alexandria
    expect(shardFor(-33.9, 151.2)).toBe('occ-asia-pacific'); // Sydney
  });
});
