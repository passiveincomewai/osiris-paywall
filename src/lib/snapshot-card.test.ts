import { describe, expect, it } from 'vitest';
import {
  copySnapshotLink,
  coverCrop,
  ellipsize,
  formatCaptureTime,
  shareSnapshotCard,
  snapshotCardMeta,
  type SnapshotShareEnv,
} from './snapshot-card';

describe('snapshotCardMeta', () => {
  const at = new Date('2026-11-06T08:07:00Z'); // 1:07 AM MST in Denver

  it('carries the camera record verbatim — real name and place, nothing invented', () => {
    const meta = snapshotCardMeta(
      { id: 'cam-1', name: 'Sukiyabashi Crossing', city: 'Tokyo', country: 'Japan' },
      at,
      'https://worldeye.app',
    );
    expect(meta.name).toBe('Sukiyabashi Crossing');
    expect(meta.place).toBe('Tokyo, Japan');
    expect(meta.capturedLabel).toBe('Nov 6, 2026 · 1:07 AM MST');
    expect(meta.fileName).toBe('worldeye-sukiyabashi-crossing-2026-11-06T0807.png');
    expect(meta.shareTitle).toBe('Sukiyabashi Crossing — live on WorldEye');
    expect(meta.shareUrl).toBe('https://worldeye.app/?camera=cam-1');
  });

  it('falls back plainly when the record carries no name or place', () => {
    const meta = snapshotCardMeta({ id: 'cam-2' }, at);
    expect(meta.name).toBe('Live camera');
    expect(meta.place).toBe('');
  });

  it('keeps a partial place partial — city only, country only', () => {
    expect(snapshotCardMeta({ name: 'X', city: 'Denver' }, at).place).toBe('Denver');
    expect(snapshotCardMeta({ name: 'X', country: 'Canada' }, at).place).toBe('Canada');
  });
});

describe('formatCaptureTime', () => {
  it('formats the capture moment in America/Denver, labelled with the zone', () => {
    // Summer: MDT (UTC-6)
    expect(formatCaptureTime(new Date('2026-07-04T18:30:00Z'))).toBe('Jul 4, 2026 · 12:30 PM MDT');
    // Winter: MST (UTC-7)
    expect(formatCaptureTime(new Date('2026-01-15T07:05:00Z'))).toBe('Jan 15, 2026 · 12:05 AM MST');
  });
});

describe('coverCrop', () => {
  it('centre-crops a 16:9 frame into the card without distortion', () => {
    expect(coverCrop(1920, 1080, 1200, 675)).toEqual({ sx: 0, sy: 0, sw: 1920, sh: 1080 });
  });

  it('crops the sides of a wider source and the top/bottom of a taller one', () => {
    const wide = coverCrop(2560, 1080, 1200, 675);
    expect(wide.sh).toBe(1080);
    expect(wide.sw).toBeCloseTo(1920);
    expect(wide.sx).toBeCloseTo(320);
    const tall = coverCrop(1080, 1920, 1200, 675);
    expect(tall.sw).toBe(1080);
    expect(tall.sh).toBeCloseTo(607.5);
    expect(tall.sy).toBeCloseTo((1920 - 607.5) / 2);
  });
});

describe('ellipsize', () => {
  it('leaves short text alone and ellipsizes long text to the cap', () => {
    expect(ellipsize('Short', 10)).toBe('Short');
    expect(ellipsize('A very long camera name indeed', 10)).toBe('A very lo…');
    expect(ellipsize('A very long camera name indeed', 10)).toHaveLength(10);
  });
});

describe('share actions', () => {
  const at = new Date('2026-11-06T08:07:00Z');
  const meta = snapshotCardMeta({ id: 'cam-1', name: 'Pier 39', city: 'San Francisco', country: 'United States' }, at, 'https://worldeye.app');
  const blob = new Blob(['png'], { type: 'image/png' });

  it('meta for a camera with no id carries no link, so no action can mint a dead one', () => {
    const noId = snapshotCardMeta({ name: 'Untracked' }, at);
    expect(noId.shareUrl).toBeNull();
  });

  it('shares the PNG file itself where the platform accepts files', async () => {
    const seen: unknown[] = [];
    const env: SnapshotShareEnv = {
      canShareFiles: () => true,
      share: async data => { seen.push(data); },
    };
    await expect(shareSnapshotCard(blob, meta, env)).resolves.toBe('shared-file');
    const data = seen[0] as { files?: File[]; title: string };
    expect(data.files?.[0]?.name).toBe(meta.fileName);
    expect(data.files?.[0]?.type).toBe('image/png');
  });

  it('falls back to the link sheet when files are not shareable', async () => {
    const seen: unknown[] = [];
    const env: SnapshotShareEnv = {
      canShareFiles: () => false,
      share: async data => { seen.push(data); },
    };
    await expect(shareSnapshotCard(blob, meta, env)).resolves.toBe('shared-link');
    expect((seen[0] as { url?: string }).url).toBe('https://worldeye.app/?camera=cam-1');
  });

  it('a dismissed sheet is reported, never followed by a silent copy', async () => {
    let copied = false;
    const env: SnapshotShareEnv = {
      canShareFiles: () => true,
      share: async () => { throw Object.assign(new Error('cancelled'), { name: 'AbortError' }); },
      clipboardWrite: async () => { copied = true; },
    };
    await expect(shareSnapshotCard(blob, meta, env)).resolves.toBe('dismissed');
    expect(copied).toBe(false);
  });

  it('copies the link when there is no share sheet', async () => {
    let copiedText: string | null = null;
    const env: SnapshotShareEnv = { clipboardWrite: async t => { copiedText = t; } };
    await expect(shareSnapshotCard(blob, meta, env)).resolves.toBe('copied');
    expect(copiedText).toBe('https://worldeye.app/?camera=cam-1');
    await expect(copySnapshotLink(meta, env)).resolves.toBe(true);
  });
});
