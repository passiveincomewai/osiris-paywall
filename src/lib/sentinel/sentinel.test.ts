import { describe, expect, it, vi } from 'vitest';
import { bboxAround, buildTrueColourRequest, SENTINEL_PROCESS_URL } from './request';
import {
  buildTokenRequestBody,
  createSentinelService,
  isSentinelConfigured,
  parseTokenResponse,
  sentinelCredentials,
} from './server';

describe('bboxAround', () => {
  it('produces a [west, south, east, north] box around the point', () => {
    const [w, s, e, n] = bboxAround(51.5, -0.12, 5);
    expect(w).toBeLessThan(-0.12);
    expect(e).toBeGreaterThan(-0.12);
    expect(s).toBeLessThan(51.5);
    expect(n).toBeGreaterThan(51.5);
    expect(n - s).toBeCloseTo((2 * 5) / 111.32, 3);
  });

  it('clamps at the poles / antimeridian instead of overflowing', () => {
    const [, , e, n] = bboxAround(89.9, 179.9, 50);
    expect(n).toBeLessThanOrEqual(90);
    expect(e).toBeLessThanOrEqual(180);
  });
});

describe('buildTrueColourRequest', () => {
  it('builds a Sentinel-2 L2A Process API request for the latest pass window', () => {
    const now = new Date('2026-10-22T12:00:00Z');
    const req = buildTrueColourRequest({ lat: 51.5, lng: -0.12, now });
    expect(req.url).toBe(SENTINEL_PROCESS_URL);
    expect(req.body.input.data[0].type).toBe('sentinel-2-l2a');
    const tr = req.body.input.data[0].dataFilter.timeRange;
    expect(tr.to).toBe('2026-10-22T12:00:00.000Z');
    expect(tr.from).toBe('2026-09-22T12:00:00.000Z'); // 30-day look-back
    expect(req.body.input.data[0].dataFilter.maxCloudCoverage).toBe(30);
    expect(req.body.input.bounds.properties.crs).toContain('4326');
    expect(req.body.output.responses[0].format.type).toBe('image/png');
    // True colour = B04 / B03 / B02 in that order.
    expect(req.body.evalscript).toContain('sample.B04');
    expect(req.body.evalscript).toContain('sample.B03');
    expect(req.body.evalscript).toContain('sample.B02');
  });
});

describe('CDSE OAuth client-credentials flow', () => {
  it('builds the token form body without embedding it in a URL', () => {
    const body = new URLSearchParams(buildTokenRequestBody('cid', 'csecret'));
    expect(body.get('grant_type')).toBe('client_credentials');
    expect(body.get('client_id')).toBe('cid');
    expect(body.get('client_secret')).toBe('csecret');
  });

  it('parses token responses with an expiry skew, rejects junk', () => {
    const t = parseTokenResponse({ access_token: 'tok', expires_in: 3600, token_type: 'Bearer' }, 1000);
    expect(t?.accessToken).toBe('tok');
    expect(t?.expiresAt).toBe(1000 + (3600 - 60) * 1000);
    expect(parseTokenResponse({ access_token: 'tok' }, 0)).toBeNull();
    expect(parseTokenResponse(null, 0)).toBeNull();
    expect(parseTokenResponse('nope', 0)).toBeNull();
  });

  it('requires BOTH env vars — otherwise a clean no-op with no network', async () => {
    expect(isSentinelConfigured({})).toBe(false);
    expect(isSentinelConfigured({ SENTINEL_HUB_CLIENT_ID: 'x' })).toBe(false);
    expect(isSentinelConfigured({ SENTINEL_HUB_CLIENT_ID: 'x', SENTINEL_HUB_CLIENT_SECRET: 'y' })).toBe(true);
    expect(sentinelCredentials({ SENTINEL_HUB_CLIENT_ID: 'x' })).toBeNull();

    const postToken = vi.fn(async () => ({ access_token: 't', expires_in: 3600 }));
    const postProcess = vi.fn(async () => ({ contentType: 'image/png', bytes: new Uint8Array([1]) }));
    const svc = createSentinelService({
      postToken,
      postProcess,
      credentials: () => null,
    });
    expect(await svc.getAccessToken()).toBeNull();
    expect(await svc.getLatestTrueColourImage({ lat: 51.5, lng: -0.12 })).toBeNull();
    expect(postToken).not.toHaveBeenCalled();
    expect(postProcess).not.toHaveBeenCalled();
  });

  it('exchanges credentials once, caches the token, and posts the process request', async () => {
    let now = 0;
    const postToken = vi.fn(async () => ({ access_token: 'tok-1', expires_in: 3600, token_type: 'Bearer' }));
    const postProcess = vi.fn(async (_url: string, _body: unknown, token: string) => {
      expect(token).toBe('tok-1');
      return { contentType: 'image/png', bytes: new Uint8Array([137, 80, 78, 71]) };
    });
    const svc = createSentinelService({
      postToken,
      postProcess,
      credentials: () => ({ clientId: 'cid', clientSecret: 'sec' }),
      now: () => now,
    });
    const img = await svc.getLatestTrueColourImage({ lat: 51.5, lng: -0.12 });
    expect(img?.contentType).toBe('image/png');
    expect(img?.bytes.length).toBe(4);
    expect(img?.bbox).toHaveLength(4);
    const img2 = await svc.getLatestTrueColourImage({ lat: 51.5, lng: -0.12 });
    expect(img2).not.toBeNull();
    expect(postToken).toHaveBeenCalledTimes(1); // token cached
    expect(postProcess).toHaveBeenCalledTimes(2);
    now += 3600 * 1000; // past the skewed expiry → a fresh token is fetched
    await svc.getAccessToken();
    expect(postToken).toHaveBeenCalledTimes(2);
  });

  it('fails gracefully: token or process errors return null', async () => {
    const badToken = createSentinelService({
      postToken: async () => { throw new Error('401'); },
      postProcess: async () => ({ contentType: 'image/png', bytes: new Uint8Array([1]) }),
      credentials: () => ({ clientId: 'a', clientSecret: 'b' }),
    });
    expect(await badToken.getLatestTrueColourImage({ lat: 0, lng: 0 })).toBeNull();

    const badProcess = createSentinelService({
      postToken: async () => ({ access_token: 't', expires_in: 3600 }),
      postProcess: async () => { throw new Error('no scene'); },
      credentials: () => ({ clientId: 'a', clientSecret: 'b' }),
    });
    expect(await badProcess.getLatestTrueColourImage({ lat: 0, lng: 0 })).toBeNull();
  });
});
