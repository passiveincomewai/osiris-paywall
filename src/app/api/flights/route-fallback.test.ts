import { describe, expect, it, vi } from 'vitest';

/**
 * Per-region last-good fallback + sweep bookkeeping (2026-10-27).
 *
 * The Atlanta defect: one failed/empty region fetch zeroed a
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

import { stealthFetch } from '@/lib/stealthFetch';
import {
  fetchMilFeed,
  fetchRegion,
  isHelicopterRecord,
  REGIONS,
  REGION_LAST_GOOD_MAX_AGE_MS,
  regionalIngestedCount,
  regionLastGoodKey,
  resolveRegionContribution,
  snapshotToken,
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
    // fetchRegion returns empty records for HTTP errors, timeouts and
    // empty answers alike, whichever provider was asked — the fallback
    // must cover all of them.
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

describe('provider order — adsb.lol primary, adsb.fi fallback (2026-10-28 migration)', () => {
  // The migration's whole contract in fetch order: adsb.lol is asked
  // first for every region and the military feed; adsb.fi is asked ONLY
  // where adsb.lol failed or answered empty, and is never asked when
  // adsb.lol served. These pin the URLs as well as the order — the
  // post-deploy provider counts are only meaningful if this holds.
  const LOL_POINT = 'https://api.adsb.lol/v2/point/40.8/-111.9/250';
  const FI_POINT = 'https://opendata.adsb.fi/api/v3/lat/40.8/lon/-111.9/dist/250';
  const LOL_MIL = 'https://api.adsb.lol/v2/mil';
  const FI_MIL = 'https://opendata.adsb.fi/api/v2/mil';

  function install(responses: Record<string, { body?: unknown; status?: number }>) {
    const asked: string[] = [];
    vi.mocked(stealthFetch).mockImplementation(async (url: any) => {
      const u = String(url);
      asked.push(u);
      const r = responses[u];
      if (!r) return new Response('unexpected url', { status: 500 });
      return Response.json(r.body ?? {}, { status: r.status ?? 200 });
    });
    return asked;
  }

  it('asks adsb.lol for a region first and never touches adsb.fi when it serves', async () => {
    const asked = install({ [LOL_POINT]: { body: { ac: [{ hex: 'abc123' }], total: 1 } } });
    const out = await fetchRegion(40.8, -111.9);
    expect(out.provider).toBe('adsblol');
    expect(out.records).toHaveLength(1);
    expect(asked).toEqual([LOL_POINT]);
  });

  it('falls back to adsb.fi v3 when adsb.lol answers empty for a region', async () => {
    const asked = install({
      [LOL_POINT]: { body: { ac: [], total: 0 } },
      [FI_POINT]: { body: { ac: [{ hex: 'def456' }], total: 1 } },
    });
    const out = await fetchRegion(40.8, -111.9);
    expect(out.provider).toBe('adsbfi');
    expect(out.records).toHaveLength(1);
    expect(asked).toEqual([LOL_POINT, FI_POINT]);
  });

  it('falls back to adsb.fi when adsb.lol fails outright (HTTP 500)', async () => {
    const asked = install({
      [LOL_POINT]: { status: 500 },
      [FI_POINT]: { body: { ac: [{ hex: 'def456' }], total: 1 } },
    });
    const out = await fetchRegion(40.8, -111.9);
    expect(out.provider).toBe('adsbfi');
    expect(asked).toEqual([LOL_POINT, FI_POINT]);
  });

  it('reports no provider when both come back empty', async () => {
    install({
      [LOL_POINT]: { body: { ac: [], total: 0 } },
      [FI_POINT]: { body: { ac: [], total: 0 } },
    });
    const out = await fetchRegion(40.8, -111.9);
    expect(out.provider).toBeNull();
    expect(out.records).toEqual([]);
  });

  it('takes the military feed from adsb.lol and leaves adsb.fi alone', async () => {
    const asked = install({ [LOL_MIL]: { body: { ac: [{ hex: 'mil1', dbFlags: 1 }], total: 1 } } });
    const out = await fetchMilFeed();
    expect(out.provider).toBe('adsblol');
    expect(asked).toEqual([LOL_MIL]);
  });

  it('falls back to the adsb.fi military feed when adsb.lol is empty', async () => {
    const asked = install({
      [LOL_MIL]: { body: { ac: [], total: 0 } },
      [FI_MIL]: { body: { ac: [{ hex: 'mil2', dbFlags: 1 }], total: 1 } },
    });
    const out = await fetchMilFeed();
    expect(out.provider).toBe('adsbfi');
    expect(out.records).toHaveLength(1);
    expect(asked).toEqual([LOL_MIL, FI_MIL]);
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

describe('snapshotToken — delta tokens are namespaced per process', () => {
  it('is unique per sequence number and carries a process namespace', () => {
    const a = snapshotToken(1);
    const b = snapshotToken(2);
    expect(a).not.toBe(b);
    // Shape: f<namespace>.<seq> — the namespace segment is what a bare
    // sequence ("f1", "f2", ...) lacked. Two function instances mint
    // the same bare strings for different snapshots, and a ?since=
    // delta answered against the wrong base silently corrupts the
    // client's sky; a foreign namespaced token simply misses the ring.
    expect(a).toMatch(/^f[0-9a-z]+\.1$/);
    expect(b).toMatch(/^f[0-9a-z]+\.2$/);
    expect(a.split('.')[0]).toBe(b.split('.')[0]);
    expect(a.split('.')[0].length).toBeGreaterThanOrEqual(5); // 'f' + >=4 ns chars
  });
});

describe('isHelicopterRecord — what tags aircraft_category heli', () => {
  it('tags the designators the set has always carried', () => {
    expect(isHelicopterRecord({ t: 'B407' })).toBe(true);
    expect(isHelicopterRecord({ t: 'R44' })).toBe(true);
    expect(isHelicopterRecord({ t: 'EC35' })).toBe(true);
  });

  it('tags rotorcraft designators measured missing live (2026-10-27)', () => {
    expect(isHelicopterRecord({ t: 'NH90' })).toBe(true);
    expect(isHelicopterRecord({ t: 'G2CA' })).toBe(true); // Cabri G2
    expect(isHelicopterRecord({ t: 'H500' })).toBe(true); // Hughes/MD 500
    expect(isHelicopterRecord({ t: 'H47' })).toBe(true); // Chinook
    expect(isHelicopterRecord({ t: 'H60' })).toBe(true); // Black Hawk
    expect(isHelicopterRecord({ t: 'H64' })).toBe(true); // Apache
  });

  it('tags OpenSky records by their numeric emitter category', () => {
    expect(isHelicopterRecord({ category_os: 8 })).toBe(true);
    expect(isHelicopterRecord({ category_os: 8, t: '' })).toBe(true);
  });

  it('tags tar1090 records by their string emitter category (A7)', () => {
    // The regional source's ONLY category evidence — previously unread.
    expect(isHelicopterRecord({ category: 'A7' })).toBe(true);
    expect(isHelicopterRecord({ category: 'A7', t: 'NH90' })).toBe(true);
    expect(isHelicopterRecord({ category: 'a7', t: 'C172' })).toBe(true);
  });

  it('does not let a miscoded A7 turn fixed-wing traffic into a helicopter', () => {
    // Both measured live in the same sample as the genuine misses.
    expect(isHelicopterRecord({ category: 'A7', t: 'B77W' })).toBe(false);
    expect(isHelicopterRecord({ category: 'A7', t: 'A321' })).toBe(false);
    expect(isHelicopterRecord({ category: 'A7', t: 'GLF6' })).toBe(false); // bizjet set
    expect(isHelicopterRecord({ category: 'A7', t: 'BALL' })).toBe(false); // balloon
    expect(isHelicopterRecord({ category: 'A7', t: 'GLID' })).toBe(false); // glider
  });

  it('leaves ordinary fixed-wing records as planes', () => {
    expect(isHelicopterRecord({ t: 'B738', category: 'A3' })).toBe(false);
    expect(isHelicopterRecord({ t: 'C172', category: 'A1' })).toBe(false);
    expect(isHelicopterRecord({})).toBe(false);
    expect(isHelicopterRecord({ t: 'A320' })).toBe(false);
  });
});
