import { describe, expect, it } from 'vitest';
import { bboxCacheKey, bboxContains, expandBbox, parseBboxParam } from './bbox';
import { normalizePicture, normalizeSearchResponse, panoramaxPictureUrl, panoramaxSearchUrl } from './panoramax';
import { createStreetLevelService, StreetLevelError } from './server';

/**
 * Fixtures are REAL-shaped: trimmed from a live Panoramax federation
 * response (MapComplete instance, Brussels, captured during the build).
 * Provider bulk (EXIF blobs, semantic annotations) is omitted exactly
 * the way the normalizer omits it.
 */
const REAL_ITEM = {
  type: 'Feature',
  id: '5d27bc6f-8093-4d3a-9d8f-084bc1cf8864',
  geometry: { type: 'Point', coordinates: [4.3560918, 50.8513197] },
  collection: '6e702976-580b-419c-8fb3-cf7bd364e6f8',
  properties: {
    datetime: '2024-10-28T18:18:11.427000+00:00',
    license: 'CC-BY-SA-4.0',
    'geovisio:producer': 'mapcomplete',
    'geovisio:rank_in_collection': 8998,
    'geovisio:thumbnail': 'https://panoramax.mapcomplete.org/api/pictures/5d27bc6f-8093-4d3a-9d8f-084bc1cf8864/thumb.jpg',
    'geovisio:image': 'https://panoramax.mapcomplete.org/api/pictures/5d27bc6f-8093-4d3a-9d8f-084bc1cf8864/hd.jpg',
    'view:azimuth': 192,
  },
  assets: {
    hd: { href: 'https://panoramax.mapcomplete.org/api/pictures/5d27bc6f-8093-4d3a-9d8f-084bc1cf8864/hd.jpg', roles: ['data'] },
    sd: { href: 'https://panoramax.mapcomplete.org/api/pictures/5d27bc6f-8093-4d3a-9d8f-084bc1cf8864/sd.jpg', roles: ['visual'] },
    thumb: { href: 'https://panoramax.mapcomplete.org/api/pictures/5d27bc6f-8093-4d3a-9d8f-084bc1cf8864/thumb.jpg', roles: ['thumbnail'] },
  },
  links: [
    { rel: 'license', href: 'https://spdx.org/licenses/CC-BY-SA-4.0.html' },
    { rel: 'next', href: 'https://panoramax.mapcomplete.org/api/collections/6e702976-580b-419c-8fb3-cf7bd364e6f8/items/d028b4e0-f62d-4d01-a23a-61726c5757de' },
    { rel: 'prev', href: 'https://panoramax.mapcomplete.org/api/collections/6e702976-580b-419c-8fb3-cf7bd364e6f8/items/a2eb14f8-00ea-406c-9bae-38e89d8cefd9' },
  ],
};

const itemAt = (lng: number, lat: number, id = '11111111-2222-3333-4444-555555555555') => ({
  type: 'Feature',
  id,
  geometry: { type: 'Point', coordinates: [lng, lat] },
  collection: '6e702976-580b-419c-8fb3-cf7bd364e6f8',
  properties: { datetime: '2023-05-01T10:00:00+00:00', license: 'CC-BY-SA-4.0', 'geovisio:producer': 'osm-fr' },
  assets: { sd: { href: `https://example.test/${id}/sd.jpg` }, thumb: { href: `https://example.test/${id}/thumb.jpg` } },
  links: [],
});

describe('bbox guard', () => {
  it('accepts a street-scale bbox', () => {
    expect(parseBboxParam('2.335,48.855,2.365,48.875')).toEqual({ west: 2.335, south: 48.855, east: 2.365, north: 48.875 });
  });
  it('rejects malformed, inverted, oversized and out-of-world boxes', () => {
    expect(parseBboxParam(null)).toBeNull();
    expect(parseBboxParam('2.3,48.8')).toBeNull();
    expect(parseBboxParam('2.3,48.8,x,48.9')).toBeNull();
    expect(parseBboxParam('2.4,48.8,2.3,48.9')).toBeNull(); // west > east
    expect(parseBboxParam('2.3,48.9,2.4,48.8')).toBeNull(); // south > north
    expect(parseBboxParam('0,40,3,43')).toBeNull(); // span 3° > cap 2°
    expect(parseBboxParam('-181,40,-179,41')).toBeNull(); // out of world
    expect(parseBboxParam('2.3,48.8,2.3,48.9')).toBeNull(); // zero span
  });
  it('quantizes cache keys and expands fetch margins', () => {
    const b = { west: 2.331, south: 48.851, east: 2.361, north: 48.871 };
    expect(bboxCacheKey(b)).toBe(bboxCacheKey({ west: 2.334, south: 48.854, east: 2.364, north: 48.874 }));
    const grown = expandBbox(b, 0.5);
    expect(grown.west).toBeLessThan(b.west);
    expect(grown.east).toBeGreaterThan(b.east);
    expect(bboxContains(b, 2.35, 48.86)).toBe(true);
    expect(bboxContains(b, 2.5, 48.86)).toBe(false);
  });
});

describe('Panoramax normalizer', () => {
  it('builds upstream URLs on the GeoVisio STAC surface', () => {
    expect(panoramaxSearchUrl('https://api.panoramax.xyz', { west: 1, south: 2, east: 3, north: 4 }, 50))
      .toBe('https://api.panoramax.xyz/api/search?bbox=1,2,3,4&limit=50');
    expect(panoramaxPictureUrl('https://api.panoramax.xyz', REAL_ITEM.id))
      .toBe(`https://api.panoramax.xyz/api/pictures/${REAL_ITEM.id}`);
  });

  it('normalizes a real-shaped picture with licence, producer and neighbours', () => {
    const pic = normalizePicture(REAL_ITEM);
    expect(pic).not.toBeNull();
    expect(pic!.id).toBe(REAL_ITEM.id);
    expect([pic!.lng, pic!.lat]).toEqual([4.3560918, 50.8513197]);
    expect(pic!.capturedAt).toBe('2024-10-28T18:18:11.427000+00:00');
    expect(pic!.sequenceId).toBe('6e702976-580b-419c-8fb3-cf7bd364e6f8');
    expect(pic!.producer).toBe('mapcomplete');
    expect(pic!.license).toBe('CC-BY-SA-4.0');
    expect(pic!.licenseUrl).toBe('https://spdx.org/licenses/CC-BY-SA-4.0.html');
    expect(pic!.imageUrl).toContain('/sd.jpg'); // the "visual" asset wins for display
    expect(pic!.thumbUrl).toContain('/thumb.jpg');
    expect(pic!.hdUrl).toContain('/hd.jpg');
    expect(pic!.azimuthDeg).toBe(192);
    expect(pic!.rankInSequence).toBe(8998);
    expect(pic!.nextId).toBe('d028b4e0-f62d-4d01-a23a-61726c5757de');
    expect(pic!.prevId).toBe('a2eb14f8-00ea-406c-9bae-38e89d8cefd9');
  });

  it('absolutizes instance-relative asset hrefs against the provider base', () => {
    // The single-picture endpoint returns derivative paths, not URLs —
    // they must resolve against the instance, never against our origin.
    const rel = {
      ...REAL_ITEM,
      assets: { sd: { href: '/derivatives/5d/27/sd.jpg' }, thumb: { href: '/derivatives/5d/27/thumb.jpg' } },
      properties: { ...REAL_ITEM.properties, 'geovisio:thumbnail': '/derivatives/5d/27/thumb.jpg', 'geovisio:image': '/derivatives/5d/27/hd.jpg' },
    };
    const pic = normalizePicture(rel, 'https://panoramax.mapcomplete.org');
    expect(pic!.imageUrl).toBe('https://panoramax.mapcomplete.org/derivatives/5d/27/sd.jpg');
    expect(pic!.thumbUrl).toBe('https://panoramax.mapcomplete.org/derivatives/5d/27/thumb.jpg');
    expect(pic!.hdUrl).toBe('https://panoramax.mapcomplete.org/derivatives/5d/27/hd.jpg');
  });

  it('drops records it cannot place and flags truncation honestly', () => {
    expect(normalizePicture({ id: 'x', geometry: null })).toBeNull();
    expect(normalizePicture({ geometry: { coordinates: [1, 2] } })).toBeNull();
    const page = { type: 'FeatureCollection', features: [REAL_ITEM, itemAt(4.36, 50.86)] };
    expect(normalizeSearchResponse(page, 5).truncated).toBe(false);
    expect(normalizeSearchResponse(page, 2).truncated).toBe(true);
    expect(normalizeSearchResponse(page, 5).pictures).toHaveLength(2);
    expect(normalizeSearchResponse(null, 5)).toEqual({ pictures: [], truncated: false });
  });
});

describe('street level service', () => {
  const bbox = { west: 4.345, south: 50.845, east: 4.365, north: 50.86 };
  const feedOf = (features: any[]) => async () => ({ type: 'FeatureCollection', features });

  it('filters the margined fetch back to the exact request bbox', async () => {
    const inside = itemAt(4.355, 50.852);
    const marginOnly = itemAt(4.375, 50.87, '99999999-8888-7777-6666-555555555555'); // inside +50% margin, outside request
    const svc = createStreetLevelService({ fetchJson: feedOf([inside, marginOnly]), base: 'https://example.test', now: () => 1_000_000 });
    const out = await svc.getPicturesInBbox(bbox);
    expect(out.pictures.map((p) => p.id)).toEqual([inside.id]);
    expect(out.stale).toBe(false);
    expect(out.source).toBe('Panoramax');
  });

  it('serves nearby pans from cache instead of re-calling upstream', async () => {
    const svc = createStreetLevelService({ fetchJson: feedOf([itemAt(4.352, 50.852)]), base: 'https://example.test', now: () => 5_000 });
    await svc.getPicturesInBbox({ west: 4.341, south: 50.841, east: 4.361, north: 50.861 });
    await svc.getPicturesInBbox({ west: 4.344, south: 50.844, east: 4.364, north: 50.864 });
    expect(svc.upstreamCallCount()).toBe(1);
  });

  it('serves the last good copy flagged stale when upstream dies, errors when cold', async () => {
    let t = 0;
    let fail = false;
    const svc = createStreetLevelService({
      fetchJson: async () => { if (fail) throw new Error('down'); return { type: 'FeatureCollection', features: [itemAt(4.355, 50.852)] }; },
      base: 'https://example.test',
      now: () => t,
    });
    const first = await svc.getPicturesInBbox(bbox);
    expect(first.stale).toBe(false);
    t += 11 * 60_000; // past the 10-min TTL
    fail = true;
    const second = await svc.getPicturesInBbox(bbox);
    expect(second.stale).toBe(true);
    expect(second.fetchedAt).toBe(first.fetchedAt); // the copy's real age is not disguised
    expect(second.pictures).toHaveLength(1);

    const cold = createStreetLevelService({
      fetchJson: async () => { throw new Error('down'); },
      base: 'https://example.test',
    });
    await expect(cold.getPicturesInBbox(bbox)).rejects.toBeInstanceOf(StreetLevelError);
  });

  it('resolves a picture by id, caches it, and maps a 404 to not-found', async () => {
    const svc = createStreetLevelService({ fetchJson: async () => REAL_ITEM, base: 'https://example.test', now: () => 42 });
    const got = await svc.getPicture(REAL_ITEM.id);
    expect(got.picture.nextId).toBe('d028b4e0-f62d-4d01-a23a-61726c5757de');
    await svc.getPicture(REAL_ITEM.id);
    expect(svc.upstreamCallCount()).toBe(1);

    const missing = createStreetLevelService({
      fetchJson: async () => { const e = new Error('nf') as Error & { status?: number }; e.status = 404; throw e; },
      base: 'https://example.test',
    });
    await expect(missing.getPicture(REAL_ITEM.id)).rejects.toMatchObject({ kind: 'not-found' });
  });
});

// Live proof — opt in with RUN_LIVE_TESTS=1. Hits the REAL Panoramax API
// (STREETLEVEL_API_BASE overrides the federation meta-catalogue with any
// instance — they speak the same GeoVisio STAC API) and asserts a covered
// city-centre viewport returns real pictures with real capture dates and
// per-picture licences, and that an ocean viewport is an honest empty.
const liveIt = process.env.RUN_LIVE_TESTS === '1' ? it : it.skip;
describe('live Panoramax proof', () => {
  liveIt('covered viewport returns real dated, licensed pictures; ocean is honestly empty', async () => {
    const base = process.env.STREETLEVEL_API_BASE || 'https://api.panoramax.xyz';
    const svc = createStreetLevelService({
      base,
      fetchJson: async (url: string) => {
        const res = await fetch(url, { headers: { 'User-Agent': 'WorldEye/1.0 (live test)' }, signal: AbortSignal.timeout(60_000) });
        if (!res.ok) throw new Error(`${url} → ${res.status}`);
        return res.json();
      },
    });
    // Nantes city centre — Panoramax's home turf (federation default).
    // With STREETLEVEL_API_BASE pointed at the MapComplete instance use
    // its Brussels coverage instead: STREETLEVEL_TEST_BBOX overrides.
    const raw = (process.env.STREETLEVEL_TEST_BBOX || '-1.56,47.212,-1.545,47.222').split(',').map(Number);
    const covered = await svc.getPicturesInBbox({ west: raw[0], south: raw[1], east: raw[2], north: raw[3] });
    expect(covered.pictures.length).toBeGreaterThan(0);
    const pic = covered.pictures[0];
    expect(pic.capturedAt).toBeTruthy();
    expect(pic.license).toBeTruthy();
    expect(pic.imageUrl).toBeTruthy();
    const detail = await svc.getPicture(pic.id);
    expect(detail.picture.id).toBe(pic.id);

    const ocean = await svc.getPicturesInBbox({ west: -20, south: 44, east: -19.9, north: 44.1 });
    expect(ocean.pictures).toEqual([]);
  }, 120_000);
});
