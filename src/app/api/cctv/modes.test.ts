import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET, clearCctvRefreshes, regionsForBbox } from './route';
import { stealthFetch } from '@/lib/stealthFetch';
import { clearSourceCache } from '@/lib/sourceCache';

/* The viewport-first modes of GET /api/cctv: ?sparse=1 (first paint),
   ?bbox= (viewport fill), ?id= (deep-link resolution). Setup mirrors
   route.test.ts: snapshot off, fake timers, per-case cache clears. */
const flushIO = () => vi.advanceTimersByTimeAsync(0);

vi.mock('@/lib/stealthFetch', () => ({ stealthFetch: vi.fn(), stealthHeaders: vi.fn(() => ({})) }));
beforeEach(() => { process.env.OSIRIS_CCTV_SNAPSHOT = 'off'; vi.useFakeTimers(); vi.resetAllMocks(); clearSourceCache(); clearCctvRefreshes(); });
afterEach(async () => { await flushIO(); await vi.advanceTimersByTimeAsync(12_000); vi.useRealTimers(); });

const tflCameras = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    id: `JamCams_${1000 + i}`, lat: 51.5 + i * 0.01, lon: -0.12 + i * 0.01, commonName: `Cam ${i}`,
  }));

async function loadUk(n = 5) {
  vi.mocked(stealthFetch).mockResolvedValue(Response.json(tflCameras(n)));
  const res = await GET(new Request('http://localhost/api/cctv?region=uk'));
  return res.json();
}

describe('regionsForBbox', () => {
  it('resolves the regions a London viewport needs', () => {
    const regions = regionsForBbox(-0.6, 51.3, 0.2, 51.7);
    expect(regions).toContain('uk');
  });

  it('resolves Utah for a Utah viewport', () => {
    expect(regionsForBbox(-112.5, 38.5, -110.5, 40.5)).toContain('utah');
  });

  it('resolves only the coarse harvest shard for open ocean — no fine regions are invented', () => {
    // The harvest shards are half-planes in the point mapping by design
    // (absence would strand real cameras), so mid-Pacific water still
    // names its shard — but never a fine-grained region like uk/us-west.
    const regions = regionsForBbox(-170, -5, -160, 5);
    expect(regions).toEqual(['occ-latin-america']);
  });

  it('walks antimeridian-crossing boxes the short way round', () => {
    // West of 180 to east of -180, over New Zealand latitudes.
    expect(regionsForBbox(170, -42, -175, -38)).toContain('newzealand');
  });

  it('refuses non-finite boxes', () => {
    expect(regionsForBbox(Number.NaN, 0, 10, 10)).toEqual([]);
  });
});

describe('GET ?sparse=1', () => {
  it('samples what is held and names the regions it cannot cover', async () => {
    await loadUk(5);
    const res = await GET(new Request('http://localhost/api/cctv?sparse=1'));
    const body = await res.json();
    expect(body.sparse).toBe(true);
    expect(body.catalogueTotal).toBe(5);
    expect(body.total).toBe(body.cameras.length);
    expect(body.cameras.length).toBe(5);
    expect(body.pendingRegions).not.toContain('uk');
    expect(body.pendingRegions.length).toBeGreaterThan(0);
    expect(body.cameras[0].id).toMatch(/^tfl-JamCams_/);
  });
});

describe('GET ?bbox=', () => {
  it('serves the resolved regions and names the full resolved set', async () => {
    vi.mocked(stealthFetch).mockResolvedValue(Response.json(tflCameras(3)));
    const res = await GET(new Request('http://localhost/api/cctv?bbox=-0.6,51.3,0.2,51.7'));
    const body = await res.json();
    expect(body.resolvedRegions).toContain('uk');
    expect(body.regions).toContain('uk');
    expect(body.total).toBeGreaterThanOrEqual(3);
  });

  it('honours exclude: a region the client already holds is not re-served', async () => {
    vi.mocked(stealthFetch).mockResolvedValue(Response.json(tflCameras(3)));
    const res = await GET(new Request('http://localhost/api/cctv?bbox=-0.6,51.3,0.2,51.7&exclude=uk'));
    const body = await res.json();
    expect(body.resolvedRegions).toContain('uk');
    expect(body.regions).not.toContain('uk');
    expect(body.cameras.filter((c: { id: string }) => c.id.startsWith('tfl-'))).toEqual([]);
  });
});

describe('GET ?id=', () => {
  it('resolves a held camera and names its region', async () => {
    await loadUk(5);
    const res = await GET(new Request('http://localhost/api/cctv?id=tfl-JamCams_1002'));
    const body = await res.json();
    expect(body.total).toBe(1);
    expect(body.cameras[0].id).toBe('tfl-JamCams_1002');
    expect(body.regions).toEqual(['uk']);
  });

  it('answers an honest empty list for an unknown id', async () => {
    vi.mocked(stealthFetch).mockResolvedValue(Response.json(tflCameras(2)));
    const pending = GET(new Request('http://localhost/api/cctv?id=no-such-camera'));
    await vi.advanceTimersByTimeAsync(12_000);
    const body = await (await pending).json();
    expect(body.total).toBe(0);
    expect(body.cameras).toEqual([]);
  });
});
