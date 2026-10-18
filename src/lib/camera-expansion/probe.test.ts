import { describe, expect, it, vi } from 'vitest';
import { applyPlaceholderPass, fingerprintOf, hasImageMagic, probeFeed, type ProbeResult } from './probe';

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 1, 2, 3, 4]);

function fetchReturning(body: BodyInit | null, init: ResponseInit = {}) {
  return vi.fn(async (_url: string, _init?: RequestInit) => new Response(body, { status: 200, ...init }));
}

describe('hasImageMagic', () => {
  it('recognises the formats the catalogue serves', () => {
    expect(hasImageMagic(JPEG)).toBe(true);
    expect(hasImageMagic(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBe(true);
    expect(hasImageMagic(new Uint8Array([0x47, 0x49, 0x46, 0x38]))).toBe(true);
    expect(hasImageMagic(new TextEncoder().encode('<html>nope</html>'))).toBe(false);
  });
});

describe('probeFeed', () => {
  it('accepts a JPEG snapshot by magic bytes even with a wrong content-type', async () => {
    const result = await probeFeed('https://cam.example.com/a.jpg', 'image', fetchReturning(JPEG, { headers: { 'content-type': 'application/octet-stream' } }));
    expect(result.status).toBe('alive');
    expect(result.fingerprint).toBe(fingerprintOf(JPEG));
  });

  it('accepts by image content-type', async () => {
    const result = await probeFeed('https://cam.example.com/a.jpg', 'image', fetchReturning(new Uint8Array([1, 2, 3]), { headers: { 'content-type': 'image/jpeg' } }));
    expect(result.status).toBe('alive');
  });

  it('rejects an HTML error page served with 200', async () => {
    const result = await probeFeed('https://cam.example.com/a.jpg', 'image', fetchReturning('<html>offline</html>', { headers: { 'content-type': 'text/html' } }));
    expect(result.status).toBe('dead');
    expect(result.detail).toContain('not an image');
  });

  it('rejects HTTP errors and network failures without throwing', async () => {
    const http = await probeFeed('https://cam.example.com/a.jpg', 'image', fetchReturning('no', { status: 404 }));
    expect(http.status).toBe('dead');
    const net = await probeFeed('https://cam.example.com/a.jpg', 'image', vi.fn(async () => { throw new Error('ECONNREFUSED'); }));
    expect(net.status).toBe('dead');
    expect(net.detail).toContain('network');
  });

  it('requires a real HLS playlist', async () => {
    const good = await probeFeed('https://cam.example.com/a.m3u8', 'hls', fetchReturning('#EXTM3U\n#EXT-X-VERSION:3\n#EXTINF:6.0,\nseg1.ts\n'));
    expect(good.status).toBe('alive');
    const bad = await probeFeed('https://cam.example.com/a.m3u8', 'hls', fetchReturning('#EXTM3U\n#EXT-X-ENDLIST\n'));
    expect(bad.status).toBe('dead');
    const html = await probeFeed('https://cam.example.com/a.m3u8', 'hls', fetchReturning('<html/>'));
    expect(html.status).toBe('dead');
  });

  it('treats iframes as reachability checks', async () => {
    const ok = await probeFeed('https://cam.example.com/embed', 'iframe', fetchReturning('<html/>'));
    expect(ok.status).toBe('alive');
    const gone = await probeFeed('https://cam.example.com/embed', 'iframe', fetchReturning('x', { status: 503 }));
    expect(gone.status).toBe('dead');
  });

  it('sends a Range request for snapshots (the fingerprint method stays cheap)', async () => {
    const fetcher = fetchReturning(JPEG, { headers: { 'content-type': 'image/jpeg' } });
    await probeFeed('https://cam.example.com/a.jpg', 'image', fetcher);
    const headers = (fetcher.mock.calls[0][1] as RequestInit).headers as Record<string, string>;
    expect(headers.Range).toBe('bytes=0-2047');
  });
});

describe('applyPlaceholderPass', () => {
  function entry(url: string, fingerprint?: string): { probe: ProbeResult; probeUrl: string } {
    return {
      probeUrl: url,
      probe: { url, kind: 'image', status: 'alive', fingerprint, probedAt: '2026-10-18T00:00:00.000Z' },
    };
  }

  it('marks identical bytes served by ≥3 distinct cameras as placeholder', () => {
    const entries = new Map([
      ['a', entry('https://h1/a.jpg', 'same-bytes')],
      ['b', entry('https://h2/b.jpg', 'same-bytes')],
      ['c', entry('https://h3/c.jpg', 'same-bytes')],
      ['d', entry('https://h4/d.jpg', 'unique-bytes')],
    ]);
    applyPlaceholderPass(entries);
    expect(entries.get('a')!.probe.status).toBe('placeholder');
    expect(entries.get('c')!.probe.status).toBe('placeholder');
    expect(entries.get('d')!.probe.status).toBe('alive');
  });

  it('leaves a fingerprint shared by only two cameras alone', () => {
    const entries = new Map([
      ['a', entry('https://h1/a.jpg', 'twins')],
      ['b', entry('https://h2/b.jpg', 'twins')],
    ]);
    applyPlaceholderPass(entries);
    expect(entries.get('a')!.probe.status).toBe('alive');
  });
});
