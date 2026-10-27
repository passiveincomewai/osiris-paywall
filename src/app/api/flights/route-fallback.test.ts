import { describe, expect, it, vi } from 'vitest';

/**
 * Per-region last-good fallback + sweep bookkeeping (2026-10-27).
 *
 * The Atlanta defect: one failed/empty adsb.fi region fetch zeroed a
 * whole 250 nm circle for the sweep and every cached reload after it.
 * These tests pin the pure pieces the sweep is built from — what a
 * region contributes (fresh vs last-good vs nothing), how long
 * last-good data stays usable, the regional-ingested count, and the
 * two centres added to close the Memphis/Florida coverage holes.
 */

vi.mock('@/lib/stealthFetch', () => ({
  stealthFetch: vi.fn(),
  stealthHeaders: vi.fn(() => ({})),
}));

import {
  REGIONS,
  REGION_LAST_GOOD_MAX_AGE_MS,
  regionalIngestedCount,
  regionLastGoodKey,
  resolveRegionContribution,
} from './route';

const NOW = 1_800_000_000_000;
const fresh = [{ hex: 'aaaa01' }, { hex: 'aaaa02' }];
const lastGoodRecords = [{ hex: 'bbbb01' }];

describe('resolveRegionContribution', () => {
  it('uses the fresh answer when the fetch returned aircraft', () => {
    const out = resolveRegionContribution(fresh, { records: lastGoodRecords, time: NOW - 1000 }, NOW);
    expect(out.records).toBe(fresh);
    expect(out.usedFallback).toBe(false);
  });

  it('falls back to last-good records when the fetch came back empty', () => {
    const out = resolveRegionContribution([], { records: lastGoodRecords, time: NOW - 60_000 }, NOW);
    expect(out.records).toBe(lastGoodRecords);
    expect(out.usedFallback).toBe(true);
  });

  it('treats a failed fetch (empty array) the same as an empty answer', () => {
    // fetchAdsbFiRegion returns [] for HTTP errors, timeouts and parse
    // failures alike — the fallback must cover all of them.
    const out = resolveRegionContribution([], { records: lastGoodRecords, time: NOW - 5 * 60_000 }, NOW);
    expect(out.usedFallback).toBe(true);
    expect(out.records).toHaveLength(1);
  });

  it('still falls back at exactly the 15-minute boundary', () => {
    const out = resolveRegionContribution(
      [],
      { records: lastGoodRecords, time: NOW - REGION_LAST_GOOD_MAX_AGE_MS },
      NOW,
    );
    expect(out.usedFallback).toBe(true);
  });

  it('contributes nothing once last-good data is older than 15 minutes', () => {
    const out = resolveRegionContribution(
      [],
      { records: lastGoodRecords, time: NOW - REGION_LAST_GOOD_MAX_AGE_MS - 1 },
      NOW,
    );
    expect(out.records).toEqual([]);
    expect(out.usedFallback).toBe(false);
  });

  it('contributes nothing when the region has never answered', () => {
    const out = resolveRegionContribution([], undefined, NOW);
    expect(out.records).toEqual([]);
    expect(out.usedFallback).toBe(false);
  });

  it('never falls back to an empty last-good entry', () => {
    const out = resolveRegionContribution([], { records: [], time: NOW }, NOW);
    expect(out.records).toEqual([]);
    expect(out.usedFallback).toBe(false);
  });
});

describe('regionalIngestedCount', () => {
  it('is the post-sweep total minus the feeds ingested before the sweep', () => {
    expect(regionalIngestedCount(3450, 135, 0)).toBe(3315);
    expect(regionalIngestedCount(3450, 135, 2000)).toBe(1315);
  });

  it('never reports a negative count', () => {
    expect(regionalIngestedCount(100, 135, 0)).toBe(0);
  });
});

describe('REGIONS — sweep centres', () => {
  it('has 40 centres, including the 2026-10-27 Mid-South and Florida additions', () => {
    expect(REGIONS).toHaveLength(40);
    expect(REGIONS).toContainEqual({ lat: 35.0, lon: -90.0 }); // Mid-South (Memphis)
    expect(REGIONS).toContainEqual({ lat: 28.5, lon: -81.7 }); // Florida
    // The centre whose failure produced the Atlanta defect is still swept.
    expect(REGIONS).toContainEqual({ lat: 33.0, lon: -84.0 }); // Southeast (Atlanta)
  });

  it('keys last-good entries by centre coordinates', () => {
    expect(regionLastGoodKey({ lat: 35.0, lon: -90.0 })).toBe('35,-90');
    expect(regionLastGoodKey({ lat: 28.5, lon: -81.7 })).toBe('28.5,-81.7');
  });

  it('keeps the sweep inside its deadline at the 1.05 s pacing floor', () => {
    // 40 centres × 1050 ms of starts ≈ 42 s < the 50 s sweep deadline
    // (SWEEP_DEADLINE_MS in route.ts), itself inside the 60 s route
    // maxDuration.
    expect(REGIONS.length * 1050).toBeLessThan(50_000);
  });
});
