import { describe, it, expect, beforeEach, vi } from 'vitest';

/* Hermetic by construction: Nominatim answers null (no network) and
   the site has no OpenAI key, so every run below is the deterministic
   EXIF + validation path. The vision pass is covered at the pipeline
   level in lib/geolocation/analyze.test.ts. */
vi.mock('@/lib/nominatim', () => ({
  ATTRIBUTION: '© OpenStreetMap contributors',
  nominatim: async () => null,
}));
vi.mock('@/lib/oi/server-key', () => ({
  siteAiKey: () => null,
  siteAiModel: () => 'test-model',
  siteAiAvailable: () => false,
  SITE_AI_PROVIDER: 'openai',
}));

import { POST } from './route';
import { resetGeolocationLimits } from '@/lib/geolocation/limits';
import { EIFFEL_GPS, buildExifJpeg } from '@/lib/geolocation/exif-fixtures';

function postReq(bytes: Buffer | null, ip: string, name = 'photo.jpg', type = 'image/jpeg'): Request {
  const form = new FormData();
  if (bytes) form.append('photo', new File([new Uint8Array(bytes)], name, { type }));
  return new Request('https://worldeye.app/api/tools/photo-geolocation', {
    method: 'POST',
    body: form,
    headers: { 'x-vercel-forwarded-for': ip },
  });
}

const GPS_JPEG = buildExifJpeg({ gps: EIFFEL_GPS });

describe('POST /api/tools/photo-geolocation', () => {
  beforeEach(() => {
    resetGeolocationLimits();
    delete process.env.GEOLOCATION_BETA_ENABLED;
  });

  it('rejects a request with no photo attached', async () => {
    const res = await POST(postReq(null, '203.0.113.1'));
    expect(res.status).toBe(400);
  });

  it('rejects a file that is not an image by magic bytes, whatever its name', async () => {
    const res = await POST(postReq(Buffer.from('%PDF-1.7 not a photo'), '203.0.113.2', 'photo.jpg'));
    expect(res.status).toBe(415);
  });

  it('rejects an oversize upload', async () => {
    const big = Buffer.alloc(11 * 1024 * 1024);
    big[0] = 0xff; big[1] = 0xd8; big[2] = 0xff;
    const res = await POST(postReq(big, '203.0.113.3'));
    expect(res.status).toBe(413);
  });

  it('locates a GPS photo from its EXIF and reports the quota', async () => {
    const res = await POST(postReq(GPS_JPEG, '203.0.113.4'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('located');
    expect(body.mode).toBe('exif-only');
    expect(body.candidates[0].kind).toBe('exif');
    expect(body.candidates[0].lat).toBeCloseTo(48.8583917, 5);
    expect(body.candidates[0].radiusM).toBeGreaterThanOrEqual(250);
    expect(body.quota).toMatchObject({ limit: 3, remaining: 2 });
  });

  it('enforces the per-IP daily cap of 3', async () => {
    const ip = '203.0.113.5';
    for (let i = 0; i < 3; i++) {
      expect((await POST(postReq(GPS_JPEG, ip))).status).toBe(200);
    }
    const fourth = await POST(postReq(GPS_JPEG, ip));
    expect(fourth.status).toBe(429);
    // A different visitor is unaffected.
    expect((await POST(postReq(GPS_JPEG, '198.51.100.7'))).status).toBe(200);
  });

  it('answers 503 while the kill switch is off', async () => {
    process.env.GEOLOCATION_BETA_ENABLED = '0';
    const res = await POST(postReq(GPS_JPEG, '203.0.113.6'));
    expect(res.status).toBe(503);
  });
});
