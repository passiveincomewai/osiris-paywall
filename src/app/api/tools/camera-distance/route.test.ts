import { describe, it, expect, vi } from 'vitest';

/* The route searches the directory dataset through
   lib/camera-directory-lookup; mock it with a two-city fixture so the
   test never loads the real 109-chunk dataset. */
vi.mock('@/lib/camera-directory-lookup', () => ({
  loadDirectoryIndex: async () =>
    new Map([
      ['a1', { id: 'a1', name: 'Main Street', city: 'Springfield', country: 'United States', lat: 39.78, lng: -89.65 }],
      ['a2', { id: 'a2', name: 'Main Street', city: 'Franklin', country: 'United States', lat: 35.92, lng: -86.87 }],
      ['b1', { id: 'b1', name: 'Shibuya Crossing', city: 'Tokyo', country: 'Japan', lat: 35.6595, lng: 139.7005 }],
      ['x1', { id: 'x1', name: 'No Coords Cam', city: 'Tokyo', country: 'Japan' }],
    ]),
}));

import { GET } from './route';

const get = (q: string) => GET(new Request(`https://worldeye.app/api/tools/camera-distance?q=${encodeURIComponent(q)}`));

describe('GET /api/tools/camera-distance', () => {
  it('returns same-named cameras from different places, disambiguated', async () => {
    const res = await get('main street');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.results).toHaveLength(2);
    expect(body.results.map((r: { city?: string }) => r.city).sort()).toEqual(['Franklin', 'Springfield']);
  });

  it('matches by city and drops records without coordinates', async () => {
    const body = await (await get('tokyo')).json();
    expect(body.results.map((r: { id: string }) => r.id)).toEqual(['b1']);
  });

  it('answers an empty result set, not an error, when nothing matches', async () => {
    const body = await (await get('zzzz-nothing')).json();
    expect(body.results).toEqual([]);
  });

  it('treats a one-character query as no search', async () => {
    const body = await (await get('t')).json();
    expect(body.results).toEqual([]);
  });
});
