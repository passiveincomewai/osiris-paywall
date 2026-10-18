import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { chunkRegionKeys, loadCameraCatalog, mergeCameraCatalog } from './camera-catalog';

beforeEach(() => vi.useFakeTimers());
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
const json = (cameras: { id: string }[], pendingRegions: string[] = []) => Response.json({ cameras, pendingRegions });
const listJson = (regions: string[]) => Response.json({ regions });

describe('sharded camera catalogue', () => {
  it('discovers regions, loads them in slices, and retries only missing regions', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(listJson(['uk', 'canada']))
      .mockResolvedValueOnce(json([{ id: 'london' }], ['canada']))
      .mockResolvedValueOnce(json([{ id: 'ottawa' }]));
    vi.stubGlobal('fetch', fetcher);
    let cameras: { id: string | number }[] = [];
    const stop = loadCameraCatalog(batch => { cameras = mergeCameraCatalog(cameras, batch); }, vi.fn());
    await vi.advanceTimersByTimeAsync(0);
    expect(fetcher.mock.calls[0][0]).toBe('/api/cctv?region=list');
    expect(fetcher.mock.calls[1][0]).toBe('/api/cctv?region=uk%2Ccanada');
    expect(cameras).toEqual([{ id: 'london' }]);
    await vi.advanceTimersByTimeAsync(15_000);
    expect(fetcher.mock.calls[2][0]).toBe('/api/cctv?region=canada');
    expect(cameras).toEqual([{ id: 'london' }, { id: 'ottawa' }]);
    await vi.advanceTimersByTimeAsync(120_000);
    expect(fetcher).toHaveBeenCalledTimes(3);
    stop();
  });

  it('never requests the whole-world payload when discovery works', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(listJson(['uk']))
      .mockResolvedValue(json([]));
    vi.stubGlobal('fetch', fetcher);
    const stop = loadCameraCatalog(vi.fn(), vi.fn());
    await vi.advanceTimersByTimeAsync(120_000);
    for (const call of fetcher.mock.calls) expect(call[0]).not.toContain('region=all');
    stop();
  });

  it('falls back to the single all request when discovery fails, with bounded retries', async () => {
    const fetcher = vi.fn().mockRejectedValueOnce(new Error('network down'))
      .mockImplementation(async () => json([], ['canada']));
    vi.stubGlobal('fetch', fetcher);
    const onError = vi.fn();
    const stop = loadCameraCatalog(vi.fn(), onError);
    await vi.advanceTimersByTimeAsync(120_000);
    // list (failed) + all + canada + canada = 4 calls, 3 passes, one error surfaced
    expect(fetcher).toHaveBeenCalledTimes(4);
    expect(onError).toHaveBeenCalledTimes(1);
    stop();
  });

  it('retries a failed shard group without refetching the groups that landed', async () => {
    const regions = ['r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7', 'r8', 'r9'];
    const fetcher = vi.fn()
      .mockResolvedValueOnce(listJson(regions))
      .mockResolvedValueOnce(json([{ id: 'a' }]))
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValue(json([{ id: 'b' }]));
    vi.stubGlobal('fetch', fetcher);
    let cameras: { id: string | number }[] = [];
    const onError = vi.fn();
    const stop = loadCameraCatalog(batch => { cameras = mergeCameraCatalog(cameras, batch); }, onError);
    await vi.advanceTimersByTimeAsync(0);
    expect(onError).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(15_000);
    const retryUrls = fetcher.mock.calls.slice(3).map(call => call[0]);
    expect(retryUrls).toEqual(['/api/cctv?region=r9']);
    expect(cameras).toEqual([{ id: 'a' }, { id: 'b' }]);
    stop();
  });

  it('cancels queued retries when cameras are switched off', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(listJson(['uk', 'canada']))
      .mockResolvedValue(json([], ['canada']));
    vi.stubGlobal('fetch', fetcher);
    const stop = loadCameraCatalog(vi.fn(), vi.fn());
    await vi.advanceTimersByTimeAsync(0);
    stop();
    await vi.advanceTimersByTimeAsync(120_000);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('updates duplicate camera IDs without duplicating dots', () => {
    expect(mergeCameraCatalog([{ id: 'a', name: 'old' }], [{ id: 'a', name: 'new' }, { id: 'b', name: 'second' }]))
      .toEqual([{ id: 'a', name: 'new' }, { id: 'b', name: 'second' }]);
  });
});

describe('chunkRegionKeys', () => {
  it('groups keys without dropping or duplicating any', () => {
    const keys = Array.from({ length: 61 }, (_, i) => `region-${i}`);
    const groups = chunkRegionKeys(keys, 8);
    expect(groups.flat()).toEqual(keys);
    expect(groups.every(group => group.length <= 8)).toBe(true);
  });
});
