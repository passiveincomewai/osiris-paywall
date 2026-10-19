import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';
import { requestHasTrafficAccess } from '@/lib/traffic/access';

vi.mock('@/lib/traffic/access', () => ({
  requestHasTrafficAccess: vi.fn(),
  trafficAccessForStatus: (s: string | null | undefined) => s === 'active',
}));

const mockAccess = vi.mocked(requestHasTrafficAccess);
const upstream = vi.fn();

const call = (z: string, x: string, y: string) =>
  GET(new NextRequest(`http://localhost/api/traffic/flow/${z}/${x}/${y}`), {
    params: Promise.resolve({ z, x, y }),
  });

const tileResponse = () =>
  Promise.resolve(
    new Response(new Uint8Array([9, 8, 7]), {
      status: 200,
      headers: { 'content-type': 'application/x-protobuf' },
    }),
  );

/* The route keeps an in-instance tile cache and per-IP rate windows as
   module state, so every case below uses its own tile coordinates. */
beforeEach(() => {
  vi.resetAllMocks();
  upstream.mockReset();
  vi.stubGlobal('fetch', upstream);
  process.env.TOMTOM_API_KEY = 'test-key';
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.TOMTOM_API_KEY;
});

describe('traffic flow proxy — subscriber gate', () => {
  it('answers 403 to a non-subscriber and never asks upstream', async () => {
    mockAccess.mockResolvedValue(false);
    const res = await call('12', '101', '201');
    expect(res.status).toBe(403);
    expect(res.headers.get('cache-control')).toBe('no-store');
    await expect(res.json()).resolves.toEqual({ error: 'subscription_required' });
    expect(upstream).not.toHaveBeenCalled();
  });

  it('serves a subscriber the upstream tile, privately cached', async () => {
    mockAccess.mockResolvedValue(true);
    upstream.mockImplementation(tileResponse);
    const res = await call('12', '102', '202');
    expect(res.status).toBe(200);
    expect(res.headers.get('x-traffic-cache')).toBe('miss');
    expect(res.headers.get('cache-control')).toContain('private');
    expect(res.headers.get('cache-control')).not.toContain('s-maxage');
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(new Uint8Array([9, 8, 7]));
    expect(upstream).toHaveBeenCalledOnce();
    // The key rides the upstream URL only — never the response.
    expect(String(upstream.mock.calls[0][0])).toContain('key=test-key');
  });

  it('serves a repeat tile from the instance cache (Pro path intact)', async () => {
    mockAccess.mockResolvedValue(true);
    upstream.mockImplementation(tileResponse);
    const first = await call('12', '103', '203');
    const second = await call('12', '103', '203');
    expect(first.headers.get('x-traffic-cache')).toBe('miss');
    expect(second.status).toBe(200);
    expect(second.headers.get('x-traffic-cache')).toBe('hit');
    expect(upstream).toHaveBeenCalledOnce();
  });

  it('keeps the no-key behaviour for subscribers: 204, nothing upstream', async () => {
    mockAccess.mockResolvedValue(true);
    delete process.env.TOMTOM_API_KEY;
    const res = await call('12', '104', '204');
    expect(res.status).toBe(204);
    expect(upstream).not.toHaveBeenCalled();
  });

  it('keeps the zoom band for subscribers: 204 below city zoom', async () => {
    mockAccess.mockResolvedValue(true);
    const res = await call('5', '3', '3');
    expect(res.status).toBe(204);
    expect(upstream).not.toHaveBeenCalled();
  });

  it('still validates coordinates before anything else: 400', async () => {
    mockAccess.mockResolvedValue(false);
    const res = await call('12', '99999', '201');
    expect(res.status).toBe(400);
    expect(upstream).not.toHaveBeenCalled();
  });
});
