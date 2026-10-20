import { describe, it, expect } from 'vitest';
import {
  classifyGeoError,
  geoEnvironmentIssue,
  requestCurrentPosition,
} from './geo-position';

describe('classifyGeoError', () => {
  it('maps PERMISSION_DENIED (1) to the denied remedy — never to HTTPS', () => {
    const issue = classifyGeoError({ code: 1 }, { hasGeolocation: true, secureContext: true });
    expect(issue.kind).toBe('denied');
    expect(issue.title).toMatch(/location is off/i);
    expect(issue.remedy).toMatch(/site settings/i);
    expect(issue.remedy).toMatch(/try again/i);
    expect(issue.retryable).toBe(true);
    expect(`${issue.title} ${issue.remedy}`).not.toMatch(/HTTPS/);
  });

  it('maps POSITION_UNAVAILABLE (2) to its own message', () => {
    const issue = classifyGeoError({ code: 2 }, { secureContext: true });
    expect(issue.kind).toBe('unavailable');
    expect(issue.retryable).toBe(true);
    expect(`${issue.title} ${issue.remedy}`).not.toMatch(/HTTPS/);
  });

  it('maps TIMEOUT (3) to its own message', () => {
    const issue = classifyGeoError({ code: 3 }, { secureContext: true });
    expect(issue.kind).toBe('timeout');
    expect(issue.retryable).toBe(true);
    expect(`${issue.title} ${issue.remedy}`).not.toMatch(/HTTPS/);
  });

  it('blames HTTPS only when the context is actually insecure', () => {
    const issue = classifyGeoError({ code: 1 }, { secureContext: false });
    expect(issue.kind).toBe('insecure');
    expect(issue.remedy).toMatch(/HTTPS/);
    expect(issue.retryable).toBe(false);
  });

  it('a secure context with no error code is unknown, never insecure', () => {
    const issue = classifyGeoError(null, { secureContext: true });
    expect(issue.kind).toBe('unknown');
    expect(`${issue.title} ${issue.remedy}`).not.toMatch(/HTTPS/);
  });

  it('a browser without geolocation is unsupported, whatever the code says', () => {
    const issue = classifyGeoError({ code: 1 }, { hasGeolocation: false, secureContext: true });
    expect(issue.kind).toBe('unsupported');
    expect(issue.retryable).toBe(false);
  });

  it('an unrecognised code degrades to unknown', () => {
    expect(classifyGeoError({ code: 99 }).kind).toBe('unknown');
    expect(classifyGeoError(undefined).kind).toBe('unknown');
    expect(classifyGeoError({}).kind).toBe('unknown');
  });
});

describe('geoEnvironmentIssue', () => {
  it('passes a normal secure browser through to the watch', () => {
    expect(geoEnvironmentIssue({ hasGeolocation: true, secureContext: true })).toBeNull();
    expect(geoEnvironmentIssue({})).toBeNull();
  });

  it('short-circuits insecure contexts and missing geolocation', () => {
    expect(geoEnvironmentIssue({ secureContext: false })?.kind).toBe('insecure');
    expect(geoEnvironmentIssue({ hasGeolocation: false })?.kind).toBe('unsupported');
  });
});

describe('requestCurrentPosition — the one-shot fix flow', () => {
  const fakeGeo = (behave: 'grant' | 'deny' | 'timeout' | 'unavailable') => {
    const calls = { n: 0 };
    const geo = {
      getCurrentPosition: (ok: any, err: any) => {
        calls.n++;
        if (behave === 'grant') ok({ coords: { latitude: 41.31, longitude: -111.92 } });
        else err({ code: behave === 'deny' ? 1 : behave === 'timeout' ? 3 : 2 });
      },
    };
    return { geo: geo as never, calls };
  };

  it('grant → coordinates', async () => {
    const { geo } = fakeGeo('grant');
    await expect(requestCurrentPosition(geo, { hasGeolocation: true, secureContext: true }))
      .resolves.toEqual({ ok: true, lat: 41.31, lng: -111.92 });
  });

  it('deny → the denied issue with its remedy, and no coordinates', async () => {
    const { geo } = fakeGeo('deny');
    const res = await requestCurrentPosition(geo, { hasGeolocation: true, secureContext: true });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.issue.kind).toBe('denied');
      expect(res.issue.remedy).toContain('site settings');
      expect(res.issue.remedy).not.toContain('HTTPS');
    }
  });

  it('timeout and unavailable stay their own honest kinds', async () => {
    const t = await requestCurrentPosition(fakeGeo('timeout').geo, { secureContext: true });
    expect(!t.ok && t.issue.kind).toBe('timeout');
    const u = await requestCurrentPosition(fakeGeo('unavailable').geo, { secureContext: true });
    expect(!u.ok && u.issue.kind).toBe('unavailable');
  });

  it('an insecure context never reaches the browser call', async () => {
    const { geo, calls } = fakeGeo('grant');
    const res = await requestCurrentPosition(geo, { hasGeolocation: true, secureContext: false });
    expect(!res.ok && res.issue.kind).toBe('insecure');
    expect(calls.n).toBe(0);
  });

  it('no geolocation at all → unsupported', async () => {
    const res = await requestCurrentPosition(null, {});
    expect(!res.ok && res.issue.kind).toBe('unsupported');
  });
});
