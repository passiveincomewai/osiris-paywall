import { describe, it, expect, vi, afterEach } from 'vitest';
import { getAirspace } from './airspace';

/**
 * Airspace fetch hardening — the 2026-10-18 incident: ArcGIS reports
 * query failures as HTTP 200 with an {"error": …} body and no features
 * array; the old code mapped that to a successful EMPTY result (and a
 * lying truncated:false), which then got cached. These tests pin the
 * new behaviour: error bodies throw, pages are followed, and hitting
 * the cap reports truncated honestly.
 */

function gridFeature(i: number) {
  return {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [[[-112 + i * 0.001, 40.6], [-112 + i * 0.001, 40.61], [-111.99, 40.61], [-111.99, 40.6], [-112 + i * 0.001, 40.6]]],
    },
    properties: { CEILING: 200, UNIT: 'Feet', APT1_NAME: 'Salt Lake City Intl', APT1_LAANC: 1 },
  };
}

function gridPage(count: number, exceeded: boolean) {
  return {
    type: 'FeatureCollection',
    features: Array.from({ length: count }, (_, i) => gridFeature(i)),
    ...(exceeded ? { properties: { exceededTransferLimit: true } } : {}),
  };
}

function restrictionPage() {
  return {
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [[[0, 0], [0, 1], [1, 1], [1, 0], [0, 0]]] },
      properties: { Base: 'B', Facility: 'F', Reason: 'R', State: 'UT' },
    }],
  };
}

function okJson(body: unknown) {
  return { ok: true, status: 200, json: async () => body } as Response;
}

/** Install a fetch stub; gridHandler decides each grid page by offset. */
function stubFetch(gridHandler: (offset: number) => unknown) {
  const gridOffsets: number[] = [];
  const fetchMock = vi.fn(async (url: string) => {
    const u = String(url);
    if (u.includes('Part_Time_National_Security')) return okJson(restrictionPage());
    if (u.includes('FAA_UAS_FacilityMap_Data')) {
      const offset = Number(new URL(u).searchParams.get('resultOffset') ?? '0');
      gridOffsets.push(offset);
      return okJson(gridHandler(offset));
    }
    throw new Error(`unexpected fetch: ${u}`);
  });
  vi.stubGlobal('fetch', fetchMock);
  return { fetchMock, gridOffsets };
}

afterEach(() => { vi.unstubAllGlobals(); });

// Distinct bbox per test — getAirspace caches per rounded bbox for 10 min.
let n = 0;
function freshBbox() {
  n += 1;
  return { west: -112 - n, south: 40, east: -111.5 - n, north: 40.4 };
}

describe('airspace fetch', () => {
  it('a single page under the transfer limit is complete and not truncated', async () => {
    stubFetch(() => gridPage(42, false));
    const r = await getAirspace(freshBbox());
    expect(r.grids.length).toBe(42);
    expect(r.truncated).toBe(false);
    expect(r.grids[0]).toMatchObject({ kind: 'grid', airport: 'Salt Lake City Intl', ceilingFt: 200 });
  });

  it('follows pagination until the service stops reporting exceededTransferLimit', async () => {
    const { gridOffsets } = stubFetch((offset) =>
      offset === 0 ? gridPage(2000, true) : gridPage(300, false));
    const r = await getAirspace(freshBbox());
    expect(gridOffsets).toEqual([0, 2000]);
    expect(r.grids.length).toBe(2300);
    expect(r.truncated).toBe(false);
  });

  it('stops at the per-bbox cap and reports truncated instead of a silent partial', async () => {
    const { gridOffsets } = stubFetch(() => gridPage(2000, true));
    const r = await getAirspace(freshBbox());
    expect(gridOffsets).toEqual([0, 2000, 4000]);
    expect(r.grids.length).toBe(6000);
    expect(r.truncated).toBe(true);
  });

  it('an ArcGIS HTTP-200 error body is an error, never an empty success', async () => {
    stubFetch(() => ({ error: { code: 400, message: 'Cannot perform query.', details: ["'geometry' parameter is invalid"] } }));
    await expect(getAirspace(freshBbox())).rejects.toThrow(/FAA facility maps error/);
  });

  it('a body with no features array is an error, never an empty success', async () => {
    stubFetch(() => ({ type: 'FeatureCollection' }));
    await expect(getAirspace(freshBbox())).rejects.toThrow(/no features array/);
  });
});
