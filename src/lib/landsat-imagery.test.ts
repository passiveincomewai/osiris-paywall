import { describe, it, expect, vi } from 'vitest';
import {
  LANDSAT_CHILD_ZOOM,
  LANDSAT_FIRST_YEAR,
  LANDSAT_LAST_YEAR,
  LANDSAT_STOP_COUNT,
  LANDSAT_YEARS,
  childTilesFor,
  clampLandsatYear,
  createLandsatTileLoader,
  isLandsatYear,
  landsatMosaicId,
  landsatMosaicSearchBody,
  landsatProtocolTileUrl,
  parseLandsatProtocolUrl,
  planetaryTileUrl,
  transparentPngBytes,
  type CompositePart,
} from './landsat-imagery';

describe('the Landsat segment', () => {
  it('spans 1984–2013, one stop per year, ending where Wayback begins', () => {
    expect(LANDSAT_FIRST_YEAR).toBe(1984);
    expect(LANDSAT_LAST_YEAR).toBe(2013);
    expect(LANDSAT_YEARS).toHaveLength(30);
    expect(LANDSAT_STOP_COUNT).toBe(30);
    expect(LANDSAT_YEARS[0]).toBe(1984);
    expect(LANDSAT_YEARS[29]).toBe(2013);
  });

  it('clamps and validates years', () => {
    expect(clampLandsatYear(1990)).toBe(1990);
    expect(clampLandsatYear(1970)).toBe(1984);
    expect(clampLandsatYear(2030)).toBe(2013);
    expect(isLandsatYear(1984)).toBe(true);
    expect(isLandsatYear(2013)).toBe(true);
    expect(isLandsatYear(2014)).toBe(false);
    expect(isLandsatYear(1983)).toBe(false);
    expect(isLandsatYear(1990.5)).toBe(false);
  });
});

describe('protocol URLs', () => {
  it('builds and parses osiris-landsat:// tile templates', () => {
    expect(landsatProtocolTileUrl(1990)).toBe('osiris-landsat://1990/{z}/{x}/{y}');
    expect(parseLandsatProtocolUrl('osiris-landsat://1990/10/184/401')).toEqual({
      year: 1990, z: 10, x: 184, y: 401,
    });
    expect(parseLandsatProtocolUrl('osiris-landsat://1984/6/11/25')).toEqual({
      year: 1984, z: 6, x: 11, y: 25,
    });
  });

  it('rejects malformed or out-of-range requests', () => {
    expect(parseLandsatProtocolUrl('osiris-landsat://1990/{z}/{x}/{y}')).toBeNull();
    expect(parseLandsatProtocolUrl('osiris-landsat://2014/10/1/1')).toBeNull();
    expect(parseLandsatProtocolUrl('osiris-landsat://1990/10/1024/1')).toBeNull();
    expect(parseLandsatProtocolUrl('https://example.com/1990/10/1/1')).toBeNull();
    expect(parseLandsatProtocolUrl('osiris-dem://10/1/1')).toBeNull();
  });

  it('the Planetary Computer tile URL carries the required collection, band assets and fixed stretch', () => {
    expect(planetaryTileUrl('MOCKID', 10, 184, 401)).toBe(
      'https://planetarycomputer.microsoft.com/api/data/v1/mosaic/MOCKID/tiles/WebMercatorQuad/10/184/401' +
        '?collection=landsat-c2-l2&assets=red&assets=green&assets=blue&rescale=7000,22000',
    );
  });
});

describe('mosaic registration', () => {
  it('the per-year search is the collection, that calendar year, least-cloudy first', () => {
    expect(landsatMosaicSearchBody(1990)).toEqual({
      collections: ['landsat-c2-l2'],
      datetime: '1990-01-01T00:00:00Z/1990-12-31T23:59:59Z',
      query: { 'eo:cloud_cover': { lt: 50 } },
      sortby: [{ field: 'eo:cloud_cover', direction: 'asc' }],
    });
  });

  it('registers once per year and caches the id', async () => {
    const fetcher = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ id: 'pc1.test.mosaic' }),
    }));
    const a = await landsatMosaicId(1995, fetcher);
    const b = await landsatMosaicId(1995, fetcher);
    expect(a).toBe('pc1.test.mosaic');
    expect(b).toBe('pc1.test.mosaic');
    expect(fetcher).toHaveBeenCalledTimes(1);
    const [url, init] = fetcher.mock.calls[0] as unknown as [string, { body: string }];
    expect(url).toBe('https://planetarycomputer.microsoft.com/api/data/v1/mosaic/register');
    expect(JSON.parse(init.body)).toEqual(landsatMosaicSearchBody(1995));
  });

  it('a failed registration rejects and the next call retries', async () => {
    let fail = true;
    const fetcher = vi.fn(async () => {
      if (fail) return { ok: false, status: 503, json: async () => ({}) };
      return { ok: true, status: 200, json: async () => ({ id: 'pc1.retry.ok' }) };
    });
    await expect(landsatMosaicId(1996, fetcher)).rejects.toThrow(/503/);
    fail = false;
    await expect(landsatMosaicId(1996, fetcher)).resolves.toBe('pc1.retry.ok');
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});

describe('childTilesFor', () => {
  it('a z7 tile is its four z8 children, placed in quadrants', () => {
    const children = childTilesFor(7, 23, 50);
    expect(children).toHaveLength(4);
    expect(children).toContainEqual({ x: 46, y: 100, dx: 0, dy: 0, size: 128 });
    expect(children).toContainEqual({ x: 47, y: 100, dx: 128, dy: 0, size: 128 });
    expect(children).toContainEqual({ x: 46, y: 101, dx: 0, dy: 128, size: 128 });
    expect(children).toContainEqual({ x: 47, y: 101, dx: 128, dy: 128, size: 128 });
  });

  it('a z6 tile is sixteen z8 children of 64px each', () => {
    const children = childTilesFor(6, 11, 25);
    expect(children).toHaveLength(16);
    expect(children.every(c => c.size === 64)).toBe(true);
    expect(children.map(c => c.x).sort((a, b) => a - b)[0]).toBe(44);
    expect(children.map(c => c.y).sort((a, b) => a - b)[0]).toBe(100);
    expect(Math.max(...children.map(c => c.dx))).toBe(192);
  });

  it('at the child zoom the tile is its own single placement', () => {
    expect(childTilesFor(LANDSAT_CHILD_ZOOM, 184, 401)).toEqual([
      { x: 184, y: 401, dx: 0, dy: 0, size: 256 },
    ]);
  });
});

describe('the tile loader', () => {
  const signal = () => new AbortController().signal;
  const okJpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]).buffer as ArrayBuffer;

  it('z \u2265 8 passes the Planetary Computer tile straight through', async () => {
    const fetchTile = vi.fn(async () => ({ status: 200, data: okJpeg }));
    const load = createLandsatTileLoader({ fetchTile, mosaicId: async () => 'MID' });
    const out = await load('osiris-landsat://1990/10/184/401', signal());
    expect(out).toBe(okJpeg);
    expect(fetchTile).toHaveBeenCalledWith(planetaryTileUrl('MID', 10, 184, 401), expect.anything());
  });

  it('a 204 (no Landsat coverage) becomes the transparent tile, not an error', async () => {
    const fetchTile = vi.fn(async () => ({ status: 204, data: new ArrayBuffer(0) }));
    const load = createLandsatTileLoader({ fetchTile, mosaicId: async () => 'MID' });
    const out = await load('osiris-landsat://1990/10/85/422', signal());
    expect(out.byteLength).toBe(transparentPngBytes().byteLength);
    expect(out.byteLength).toBeGreaterThan(0);
  });

  it('a hard HTTP error on a z \u2265 8 tile propagates (the old vintage stays up)', async () => {
    const fetchTile = vi.fn(async () => ({ status: 500, data: new ArrayBuffer(0) }));
    const load = createLandsatTileLoader({ fetchTile, mosaicId: async () => 'MID' });
    await expect(load('osiris-landsat://1990/10/184/401', signal())).rejects.toThrow(/500/);
  });

  it('below z6 the loader answers transparent without touching the network', async () => {
    const fetchTile = vi.fn(async () => ({ status: 200, data: okJpeg }));
    const mosaicId = vi.fn(async () => 'MID');
    const load = createLandsatTileLoader({ fetchTile, mosaicId });
    const out = await load('osiris-landsat://1990/5/5/12', signal());
    expect(out.byteLength).toBe(transparentPngBytes().byteLength);
    expect(fetchTile).not.toHaveBeenCalled();
    expect(mosaicId).not.toHaveBeenCalled();
  });

  it('z7 composes its four z8 children; a 204 child stays a transparent quadrant', async () => {
    const fetchTile = vi.fn(async (url: string) => {
      // The z8 children of z7 tile (23,50) are (46,100) (47,100)
      // (46,101) (47,101); serve the y=100 row, 204 the y=101 row.
      if (/\/8\/\d+\/100\?/.test(url)) return { status: 200, data: okJpeg };
      return { status: 204, data: new ArrayBuffer(0) };
    });
    const composed = new Uint8Array([1, 2, 3]).buffer as ArrayBuffer;
    const composite = vi.fn(async (_parts: CompositePart[]) => composed);
    const load = createLandsatTileLoader({ fetchTile, mosaicId: async () => 'MID', composite });
    const out = await load('osiris-landsat://1990/7/23/50', signal());
    expect(out).toBe(composed);
    expect(fetchTile).toHaveBeenCalledTimes(4);
    const parts = composite.mock.calls[0][0];
    expect(parts).toHaveLength(4);
    expect(parts.filter(p => p.data).length).toBeGreaterThan(0);
    expect(parts.filter(p => !p.data).length).toBeGreaterThan(0);
    expect(parts).toContainEqual({ data: okJpeg, dx: 0, dy: 0, size: 128 });
  });

  it('z7 with no coverage anywhere is transparent and never reaches the compositor', async () => {
    const fetchTile = vi.fn(async () => ({ status: 204, data: new ArrayBuffer(0) }));
    const composite = vi.fn(async () => new ArrayBuffer(9));
    const load = createLandsatTileLoader({ fetchTile, mosaicId: async () => 'MID', composite });
    const out = await load('osiris-landsat://1990/7/23/50', signal());
    expect(out.byteLength).toBe(transparentPngBytes().byteLength);
    expect(composite).not.toHaveBeenCalled();
  });

  it('an invalid protocol URL throws', async () => {
    const load = createLandsatTileLoader({ mosaicId: async () => 'MID' });
    await expect(load('osiris-landsat://1990/{z}/{x}/{y}', signal())).rejects.toThrow(/Invalid/);
  });
});
