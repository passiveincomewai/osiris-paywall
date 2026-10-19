import { describe, expect, it, vi } from 'vitest';
import {
  buildCameraShareUrl,
  cameraShareId,
  cameraShareText,
  cameraShareTitle,
  findCameraById,
  shareCamera,
  sharedCameraIdFromSearch,
  type ShareEnv,
} from './camera-share';

const BASE = 'https://worldeye.app';

describe('camera share link building', () => {
  it('builds a deep link for a baseline catalogue id', () => {
    expect(buildCameraShareUrl({ id: 'sky-china-downtown-qingdao-china-5501', name: 'Qingdao' }, BASE))
      .toBe('https://worldeye.app/?camera=sky-china-downtown-qingdao-china-5501');
  });

  it('builds a deep link for an occ harvest id, escaping reserved characters', () => {
    expect(buildCameraShareUrl({ id: 'occ-phenocam-NEON.D09.PRLA.DP1.20002' }, BASE))
      .toBe('https://worldeye.app/?camera=occ-phenocam-NEON.D09.PRLA.DP1.20002');
    expect(buildCameraShareUrl({ id: 'occ-x/a b' }, BASE))
      .toBe('https://worldeye.app/?camera=occ-x%2Fa%20b');
  });

  it('builds a deep link for an FAA resolver id', () => {
    expect(buildCameraShareUrl({ id: 'faa-KSLC-1' }, BASE)).toBe('https://worldeye.app/?camera=faa-KSLC-1');
  });

  it('returns null when the camera carries no usable id', () => {
    expect(buildCameraShareUrl({ name: 'No id' }, BASE)).toBeNull();
    expect(buildCameraShareUrl({ id: '   ' }, BASE)).toBeNull();
    expect(buildCameraShareUrl(null, BASE)).toBeNull();
    expect(cameraShareId({ id: 42 })).toBe('42');
  });

  it('titles the share with the camera name and no invented claims', () => {
    expect(cameraShareTitle({ id: 'x', name: 'Kabukicho' })).toBe('Kabukicho — live on WorldEye');
    expect(cameraShareTitle({ id: 'x' })).toBe('Live camera — live on WorldEye');
    expect(cameraShareText({ id: 'x', name: 'Kabukicho', city: 'Tokyo', country: 'Japan' }))
      .toBe('Kabukicho — live on WorldEye · Tokyo, Japan');
    expect(cameraShareText({ id: 'x', name: 'Kabukicho' })).toBe('Kabukicho — live on WorldEye');
  });
});

describe('shared id resolution', () => {
  it('reads the camera param back out of a query string', () => {
    expect(sharedCameraIdFromSearch('?camera=occ-alberta-000a3c6aeb&layers=cctv')).toBe('occ-alberta-000a3c6aeb');
    expect(sharedCameraIdFromSearch('camera=faa-KSLC-1')).toBe('faa-KSLC-1');
    expect(sharedCameraIdFromSearch('?camera=occ-x%2Fa%20b')).toBe('occ-x/a b');
    expect(sharedCameraIdFromSearch('?layers=cctv')).toBeNull();
    expect(sharedCameraIdFromSearch('?camera=')).toBeNull();
    expect(sharedCameraIdFromSearch('')).toBeNull();
    expect(sharedCameraIdFromSearch(null)).toBeNull();
  });

  const catalogue = [
    { id: 'sky-india-tower-of-peace-mount-abu-4359', name: 'Mount Abu' },
    { id: 'occ-alberta-000a3c6aeb', name: 'Alberta 511' },
    { id: 'occ-phenocam-NEON.D09.PRLA.DP1.20002', name: 'Phenocam' },
    { id: 'faa-KSLC-1', name: 'Salt Lake City Intl' },
  ];

  it('resolves baseline, occ, and FAA ids exactly', () => {
    expect(findCameraById(catalogue, 'sky-india-tower-of-peace-mount-abu-4359')?.name).toBe('Mount Abu');
    expect(findCameraById(catalogue, 'occ-alberta-000a3c6aeb')?.name).toBe('Alberta 511');
    expect(findCameraById(catalogue, 'faa-KSLC-1')?.name).toBe('Salt Lake City Intl');
  });

  it('an unknown or stale id resolves to nothing (the honest fallback)', () => {
    expect(findCameraById(catalogue, 'occ-alberta-000a3c6aeb-gone')).toBeUndefined();
    expect(findCameraById(catalogue, 'deleted-camera')).toBeUndefined();
    expect(findCameraById(catalogue, null)).toBeUndefined();
    expect(findCameraById([], 'faa-KSLC-1')).toBeUndefined();
    expect(findCameraById(undefined, 'faa-KSLC-1')).toBeUndefined();
  });
});

describe('share action', () => {
  const cam = { id: 'occ-alberta-000a3c6aeb', name: 'Alberta 511', city: 'Edmonton', country: 'Canada' };

  it('uses the platform share sheet when present', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const clipboardWrite = vi.fn().mockResolvedValue(undefined);
    const outcome = await shareCamera(cam, { share, clipboardWrite }, BASE);
    expect(outcome).toBe('shared');
    expect(share).toHaveBeenCalledWith({
      title: 'Alberta 511 — live on WorldEye',
      text: 'Alberta 511 — live on WorldEye · Edmonton, Canada',
      url: 'https://worldeye.app/?camera=occ-alberta-000a3c6aeb',
    });
    expect(clipboardWrite).not.toHaveBeenCalled();
  });

  it('a dismissed share sheet is not followed by a clipboard copy', async () => {
    const abort = new Error('dismissed');
    abort.name = 'AbortError';
    const share = vi.fn().mockRejectedValue(abort);
    const clipboardWrite = vi.fn().mockResolvedValue(undefined);
    expect(await shareCamera(cam, { share, clipboardWrite }, BASE)).toBe('dismissed');
    expect(clipboardWrite).not.toHaveBeenCalled();
  });

  it('falls back to the clipboard when there is no share sheet', async () => {
    const clipboardWrite = vi.fn().mockResolvedValue(undefined);
    expect(await shareCamera(cam, { clipboardWrite }, BASE)).toBe('copied');
    expect(clipboardWrite).toHaveBeenCalledWith('https://worldeye.app/?camera=occ-alberta-000a3c6aeb');
  });

  it('falls back to the clipboard when the share sheet fails outright', async () => {
    const share = vi.fn().mockRejectedValue(new Error('not allowed'));
    const clipboardWrite = vi.fn().mockResolvedValue(undefined);
    expect(await shareCamera(cam, { share, clipboardWrite }, BASE)).toBe('copied');
  });

  it('uses the legacy copy path when the clipboard API refuses', async () => {
    const env: ShareEnv = {
      clipboardWrite: vi.fn().mockRejectedValue(new Error('denied')),
      legacyCopy: vi.fn().mockReturnValue(true),
    };
    expect(await shareCamera(cam, env, BASE)).toBe('copied');
    expect(env.legacyCopy).toHaveBeenCalledWith('https://worldeye.app/?camera=occ-alberta-000a3c6aeb');
  });

  it('reports unavailable when nothing can carry the link', async () => {
    expect(await shareCamera(cam, {}, BASE)).toBe('unavailable');
    expect(await shareCamera({ name: 'id-less' }, { clipboardWrite: vi.fn() }, BASE)).toBe('unavailable');
  });
});
