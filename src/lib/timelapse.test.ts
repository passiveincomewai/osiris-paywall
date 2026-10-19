import { describe, expect, it } from 'vitest';
import {
  TIMELAPSE_MAX_FRAMES,
  formatElapsed,
  frameDecision,
  frameSignature,
  ledgerAfterKeep,
  playbackEnded,
  playbackIndex,
  timelapseAccess,
  timelapseFileName,
  timelapseFrameKey,
  timelapseSessionId,
  timelapseSupport,
  type CaptureLedger,
} from './timelapse';

describe('timelapse gate', () => {
  it('treats an active subscription as Pro (trialing resolves to active upstream)', () => {
    expect(timelapseAccess({ user: { subscriptionStatus: 'active' } })).toBe('pro');
  });

  it('locks every other signed-in state', () => {
    expect(timelapseAccess({ user: { subscriptionStatus: 'none' } })).toBe('free');
    expect(timelapseAccess({ user: { subscriptionStatus: 'canceled' } })).toBe('free');
    expect(timelapseAccess({ user: { subscriptionStatus: 'past_due' } })).toBe('free');
    expect(timelapseAccess({ user: {} })).toBe('free');
  });

  it('distinguishes signed-out and still-loading sessions', () => {
    expect(timelapseAccess({})).toBe('signed-out');
    expect(timelapseAccess({ user: null })).toBe('signed-out');
    expect(timelapseAccess(null)).toBe('unknown');
    expect(timelapseAccess(undefined)).toBe('unknown');
    expect(timelapseAccess('nope')).toBe('unknown');
  });
});

describe('timelapse support', () => {
  const still = 'https://cams.example.com/snap.jpg';

  it('supports snapshot cameras whose still the frame route can fetch', () => {
    expect(timelapseSupport({ id: 'udot-112731', feed_url: still }, 'jpg')).toEqual({ supported: true });
    expect(timelapseSupport({ id: 42, feed_url: still }, 'jpg')).toEqual({ supported: true });
    expect(
      timelapseSupport({ id: 'x', feed_url: `/api/cctv/proxy?url=${encodeURIComponent(still)}` }, 'jpg'),
    ).toEqual({ supported: true });
  });

  it('refuses stills the frame route cannot fetch (it answers 422 for them)', () => {
    // FAA WeatherCams stills are served through a same-origin resolver path.
    expect(timelapseSupport({ id: 'faa-10915', feed_url: '/api/cctv/faa-image/10915' }, 'jpg'))
      .toEqual({ supported: false, reason: 'no-still' });
    expect(timelapseSupport({ id: 'x' }, 'jpg')).toEqual({ supported: false, reason: 'no-still' });
    expect(timelapseSupport({ id: 'x', feed_url: '/api/cctv/proxy?url=notaurl' }, 'jpg'))
      .toEqual({ supported: false, reason: 'no-still' });
  });

  it('refuses live streams — they have no still frame to capture', () => {
    for (const t of ['hls', 'mp4', 'mjpeg', 'iframe']) {
      expect(timelapseSupport({ id: 'x', feed_url: still }, t)).toEqual({ supported: false, reason: 'stream' });
    }
  });

  it('refuses a snapshot camera with no catalogue id (the frame route keys on it)', () => {
    expect(timelapseSupport({ name: 'No id', feed_url: still }, 'jpg')).toEqual({ supported: false, reason: 'no-id' });
    expect(timelapseSupport({ id: '  ', feed_url: still }, 'jpg')).toEqual({ supported: false, reason: 'no-id' });
    expect(timelapseSupport(null, 'jpg')).toEqual({ supported: false, reason: 'no-id' });
  });
});

describe('frame dedupe', () => {
  const empty: CaptureLedger = { count: 0, lastFrameAt: null, lastSignature: null };

  it('signs identical bytes identically and different bytes differently', () => {
    const a = new Uint8Array([1, 2, 3, 4, 5]);
    const b = new Uint8Array([1, 2, 3, 4, 6]);
    expect(frameSignature(a)).toBe(frameSignature(new Uint8Array([1, 2, 3, 4, 5])));
    expect(frameSignature(a)).not.toBe(frameSignature(b));
    expect(frameSignature(a)).not.toBe(frameSignature(new Uint8Array([1, 2, 3, 4])));
  });

  it('keeps the first frame and a genuinely new frame', () => {
    expect(frameDecision(empty, { frameAt: 't1', signature: 'aaa' })).toBe('keep');
    const led = ledgerAfterKeep(empty, { frameAt: 't1', signature: 'aaa' });
    expect(led).toEqual({ count: 1, lastFrameAt: 't1', lastSignature: 'aaa' });
    expect(frameDecision(led, { frameAt: 't2', signature: 'bbb' })).toBe('keep');
  });

  it('skips a re-served frame: same fetch timestamp wins over bytes', () => {
    const led = ledgerAfterKeep(empty, { frameAt: 't1', signature: 'aaa' });
    // Same X-Frame-At — the route is still holding the same picture.
    expect(frameDecision(led, { frameAt: 't1', signature: 'zzz' })).toBe('duplicate');
  });

  it('skips identical bytes when the timestamp header is missing', () => {
    const led = ledgerAfterKeep(empty, { frameAt: null, signature: 'aaa' });
    expect(frameDecision(led, { frameAt: null, signature: 'aaa' })).toBe('duplicate');
    expect(frameDecision(led, { frameAt: null, signature: 'bbb' })).toBe('keep');
  });

  it('stops at the cap instead of keeping', () => {
    const full: CaptureLedger = { count: TIMELAPSE_MAX_FRAMES, lastFrameAt: 't9', lastSignature: 's9' };
    expect(frameDecision(full, { frameAt: 't10', signature: 'new' })).toBe('full');
    const almost: CaptureLedger = { count: 2, lastFrameAt: null, lastSignature: null };
    expect(frameDecision(almost, { frameAt: 't', signature: 'x' }, 3)).toBe('keep');
    expect(frameDecision({ ...almost, count: 3 }, { frameAt: 't', signature: 'x' }, 3)).toBe('full');
  });
});

describe('playback order math', () => {
  it('walks frames in order at the chosen speed and clamps at the end', () => {
    expect(playbackIndex(0, 30, 10)).toBe(0);
    expect(playbackIndex(100, 30, 10)).toBe(1);
    expect(playbackIndex(1000, 30, 10)).toBe(10);
    expect(playbackIndex(60_000, 30, 10)).toBe(29);
    expect(playbackIndex(1000, 30, 2)).toBe(2);
  });

  it('knows when playback has run past the last frame', () => {
    expect(playbackEnded(2900, 30, 10)).toBe(false);
    expect(playbackEnded(3000, 30, 10)).toBe(true);
    expect(playbackEnded(0, 0, 10)).toBe(true);
    expect(playbackIndex(500, 0, 10)).toBe(0);
  });
});

describe('labels and keys', () => {
  it('formats the capture clock', () => {
    expect(formatElapsed(0)).toBe('0:00');
    expect(formatElapsed(65_000)).toBe('1:05');
    expect(formatElapsed(3_723_000)).toBe('1:02:03');
  });

  it('builds stable storage keys and an honest file name', () => {
    expect(timelapseSessionId('faa-10915')).toBe('tl:faa-10915');
    expect(timelapseFrameKey('tl:x', 7)).toBe('tl:x:00007');
    expect(timelapseFrameKey('tl:x', 600)).toBe('tl:x:00600');
    expect(timelapseFileName('Birchwood — Camera 2 (East)', new Date('2026-10-18T00:00:00Z')))
      .toBe('worldeye-timelapse-Birchwood-Camera-2-East-2026-10-18.webm');
    expect(timelapseFileName('')).toMatch(/^worldeye-timelapse-camera-\d{4}-\d{2}-\d{2}\.webm$/);
  });
});
