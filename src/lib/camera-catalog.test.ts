import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  chunkRegionKeys, fetchCameraById, loadCameraCatalog, mergeCameraCatalog,
  type CatalogCamera,
} from './camera-catalog';

beforeEach(() => vi.useFakeTimers());
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

const json = (cameras: { id: string; [key: string]: unknown }[], pendingRegions: string[] = [], extra: Record<string, unknown> = {}) =>
  Response.json({ cameras, pendingRegions, ...extra });
const listJson = (regions: string[]) => Response.json({ regions });
const sparseJson = (cameras: { id: string }[], pendingRegions: string[] = []) =>
  Response.json({ cameras, pendingRegions, sparse: true, catalogueTotal: 74_229, total: cameras.length });

const LONDON = { west: -0.6, south: 51.3, east: 0.2, north: 51.7 };
const UTAH = { west: -112.5, south: 38.5, east: -110.5, north: 40.5 };

function startCatalog(fetcher: ReturnType<typeof vi.fn>) {
  vi.stubGlobal('fetch', fetcher);
  let cameras: CatalogCamera[] = [];
  const onError = vi.fn();
  const onDone = vi.fn();
  const handle = loadCameraCatalog(
    batch => { cameras = mergeCameraCatalog(cameras, batch); },
    onError,
    onDone,
  );
  return { handle, onError, onDone, cameras: () => cameras };
}

describe('viewport-first camera catalogue', () => {
  it('first paint is the sparse layer — discovery, then one small sample, never the world', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(listJson(['uk', 'canada']))
      .mockResolvedValueOnce(sparseJson([{ id: 'sparse-london' }, { id: 'sparse-ottawa' }]));
    const { handle, onDone, cameras } = startCatalog(fetcher);
    await vi.advanceTimersByTimeAsync(0);
    expect(fetcher.mock.calls.map(c => c[0])).toEqual(['/api/cctv?region=list', '/api/cctv?sparse=1']);
    expect(cameras()).toEqual([{ id: 'sparse-london' }, { id: 'sparse-ottawa' }]);
    expect(onDone).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(300_000);
    expect(fetcher).toHaveBeenCalledTimes(2); // nothing speculative follows the first paint
    handle.cancel();
  });

  it('fills the viewport on demand, excludes held regions, and caches the box', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(listJson(['uk', 'utah']))
      .mockResolvedValueOnce(sparseJson([{ id: 'sparse-1' }]))
      .mockResolvedValueOnce(json([{ id: 'london-1' }], [], { regions: ['uk'], resolvedRegions: ['uk', 'europe-live'] }))
      .mockResolvedValueOnce(json([{ id: 'slc-1' }], [], { regions: ['utah'], resolvedRegions: ['utah'] }));
    const { handle, cameras } = startCatalog(fetcher);
    await vi.advanceTimersByTimeAsync(0);

    handle.loadForBounds(LONDON);
    await vi.advanceTimersByTimeAsync(349);
    expect(fetcher).toHaveBeenCalledTimes(2); // debounce has not fired yet
    await vi.advanceTimersByTimeAsync(1);
    expect(fetcher.mock.calls[2][0]).toBe('/api/cctv?bbox=-0.6%2C51.3%2C0.2%2C51.7');
    expect(cameras().map(c => c.id)).toContain('london-1');

    // Same box again: resolved and fully held — no request at all.
    handle.loadForBounds(LONDON);
    await vi.advanceTimersByTimeAsync(1_000);
    expect(fetcher).toHaveBeenCalledTimes(3);

    // A new box excludes the region already held in full.
    handle.loadForBounds(UTAH);
    await vi.advanceTimersByTimeAsync(350);
    expect(fetcher.mock.calls[3][0]).toContain('exclude=uk');
    expect(cameras().map(c => c.id)).toContain('slc-1');
    handle.cancel();
  });

  it('retries a region the server still had pending for the viewport, bounded', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(listJson(['uk']))
      .mockResolvedValueOnce(sparseJson([{ id: 'sparse-1' }]))
      .mockResolvedValueOnce(json([], ['uk'], { regions: ['uk'], resolvedRegions: ['uk'] }))
      .mockResolvedValue(json([{ id: 'london-1' }]));
    const { handle, cameras } = startCatalog(fetcher);
    await vi.advanceTimersByTimeAsync(0);
    handle.loadForBounds(LONDON);
    await vi.advanceTimersByTimeAsync(350);
    expect(cameras().map(c => c.id)).not.toContain('london-1');
    await vi.advanceTimersByTimeAsync(15_000);
    expect(fetcher.mock.calls.at(-1)?.[0]).toBe('/api/cctv?region=uk');
    expect(cameras().map(c => c.id)).toContain('london-1');
    handle.cancel();
  });

  it('ensureFullCatalog loads every remaining region in slices, once', async () => {
    const regions = ['r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7', 'r8', 'r9'];
    const fetcher = vi.fn()
      .mockResolvedValueOnce(listJson(regions))
      .mockResolvedValueOnce(sparseJson([{ id: 'sparse-1' }]))
      .mockResolvedValue(json([{ id: 'full-1' }]));
    const { handle, cameras } = startCatalog(fetcher);
    await vi.advanceTimersByTimeAsync(0);
    handle.ensureFullCatalog();
    handle.ensureFullCatalog(); // idempotent while a fill is in flight / done
    await vi.advanceTimersByTimeAsync(0);
    const sliceUrls = fetcher.mock.calls.slice(2).map(c => c[0]);
    expect(sliceUrls).toEqual([
      '/api/cctv?region=r1%2Cr2%2Cr3%2Cr4%2Cr5%2Cr6%2Cr7%2Cr8',
      '/api/cctv?region=r9',
    ]);
    expect(cameras().map(c => c.id)).toContain('full-1');
    handle.cancel();
  });

  it('falls back to the single world request when discovery fails, with bounded retries', async () => {
    const fetcher = vi.fn().mockRejectedValueOnce(new Error('network down'))
      .mockImplementation(async () => json([], ['canada']));
    const { handle, onError } = startCatalog(fetcher);
    await vi.advanceTimersByTimeAsync(120_000);
    // list (failed) + all + canada + canada = 4 calls, 3 passes, one error surfaced
    expect(fetcher).toHaveBeenCalledTimes(4);
    expect(onError).toHaveBeenCalledTimes(1);
    handle.cancel();
  });

  it('falls back to a full fill when the sparse layer fails', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(listJson(['uk']))
      .mockRejectedValueOnce(new Error('sparse down'))
      .mockResolvedValue(json([{ id: 'london-1' }]));
    const { handle, onError, cameras } = startCatalog(fetcher);
    await vi.advanceTimersByTimeAsync(0);
    expect(fetcher.mock.calls.map(c => c[0])).toEqual([
      '/api/cctv?region=list', '/api/cctv?sparse=1', '/api/cctv?region=uk',
    ]);
    expect(cameras().map(c => c.id)).toContain('london-1');
    expect(onError).toHaveBeenCalledTimes(1);
    handle.cancel();
  });

  it('cancels queued work when cameras are switched off', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(listJson(['uk', 'canada']))
      .mockResolvedValue(sparseJson([{ id: 'sparse-1' }], ['canada']));
    const { handle } = startCatalog(fetcher);
    await vi.advanceTimersByTimeAsync(0);
    handle.cancel();
    await vi.advanceTimersByTimeAsync(300_000);
    expect(fetcher).toHaveBeenCalledTimes(2); // the sparse re-check never fires
  });

  it('updates duplicate camera IDs without duplicating dots', () => {
    expect(mergeCameraCatalog([{ id: 'a', name: 'old' }], [{ id: 'a', name: 'new' }, { id: 'b', name: 'second' }]))
      .toEqual([{ id: 'a', name: 'new' }, { id: 'b', name: 'second' }]);
  });
});

describe('fetchCameraById', () => {
  it('returns the record for a known id', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json([{ id: 'faa-1', name: 'Pass Cam' }])));
    await expect(fetchCameraById('faa-1')).resolves.toEqual({ id: 'faa-1', name: 'Pass Cam' });
  });

  it('returns null for an unknown id or a failed request', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json([])));
    await expect(fetchCameraById('nope')).resolves.toBeNull();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('down')));
    await expect(fetchCameraById('nope')).resolves.toBeNull();
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
