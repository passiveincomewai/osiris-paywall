import { describe, expect, it, vi } from 'vitest';
import { fetchVisitorLocation, parseGeoResponse, parseVercelGeoHeaders } from './visitor-geo';

const headers = (map: Record<string, string>) => (name: string) => map[name] ?? null;

describe('parseVercelGeoHeaders', () => {
  it('parses a full header set, decoding the URL-encoded city', () => {
    const loc = parseVercelGeoHeaders(headers({
      'x-vercel-ip-latitude': '40.7608',
      'x-vercel-ip-longitude': '-111.891',
      'x-vercel-ip-city': 'Salt%20Lake%20City',
      'x-vercel-ip-country-region': 'UT',
      'x-vercel-ip-country': 'US',
    }));
    expect(loc).toEqual({ lat: 40.7608, lng: -111.891, city: 'Salt Lake City', region: 'UT', country: 'US' });
  });

  it('keeps coordinates when labels are absent', () => {
    const loc = parseVercelGeoHeaders(headers({
      'x-vercel-ip-latitude': '51.5',
      'x-vercel-ip-longitude': '-0.13',
    }));
    expect(loc).toMatchObject({ lat: 51.5, lng: -0.13, city: null, region: null, country: null });
  });

  it('returns null without coordinates (country-only is not a location)', () => {
    expect(parseVercelGeoHeaders(headers({ 'x-vercel-ip-country': 'US' }))).toBeNull();
    expect(parseVercelGeoHeaders(headers({}))).toBeNull();
  });

  it('rejects out-of-range, non-numeric and null-island coordinates', () => {
    const base = { 'x-vercel-ip-city': 'Nowhere' };
    expect(parseVercelGeoHeaders(headers({ ...base, 'x-vercel-ip-latitude': '91', 'x-vercel-ip-longitude': '0' }))).toBeNull();
    expect(parseVercelGeoHeaders(headers({ ...base, 'x-vercel-ip-latitude': '0', 'x-vercel-ip-longitude': '-181' }))).toBeNull();
    expect(parseVercelGeoHeaders(headers({ ...base, 'x-vercel-ip-latitude': 'abc', 'x-vercel-ip-longitude': '0' }))).toBeNull();
    expect(parseVercelGeoHeaders(headers({ ...base, 'x-vercel-ip-latitude': '0', 'x-vercel-ip-longitude': '0' }))).toBeNull();
  });

  it('survives a throwing header getter', () => {
    expect(parseVercelGeoHeaders(() => { throw new Error('boom'); })).toBeNull();
  });
});

describe('parseGeoResponse', () => {
  it('parses the /api/geo/visitor success shape', () => {
    expect(parseGeoResponse({ status: 'success', lat: 40.76, lon: -111.89, city: 'Salt Lake City', region: 'UT', country: 'US' }))
      .toEqual({ lat: 40.76, lng: -111.89, city: 'Salt Lake City', region: 'UT', country: 'US' });
  });

  it('parses the legacy /api/geo shape (regionName, extra fields ignored)', () => {
    expect(parseGeoResponse({ status: 'success', lat: 51.5, lon: -0.13, city: 'London', regionName: 'England', country: 'United Kingdom', isp: 'x', query: '1.2.3.4' }))
      .toEqual({ lat: 51.5, lng: -0.13, city: 'London', region: 'England', country: 'United Kingdom' });
  });

  it('treats the providers’ literal "Unknown" labels as absent', () => {
    expect(parseGeoResponse({ status: 'success', lat: 1, lon: 2, city: 'Unknown', regionName: 'Unknown', country: 'Unknown' }))
      .toEqual({ lat: 1, lng: 2, city: null, region: null, country: null });
  });

  it('returns null for failures and junk', () => {
    expect(parseGeoResponse({ status: 'fail' })).toBeNull();
    expect(parseGeoResponse({ error: 'All geolocation providers failed' })).toBeNull();
    expect(parseGeoResponse({ status: 'success', lat: 'north', lon: 0 })).toBeNull();
    expect(parseGeoResponse(null)).toBeNull();
    expect(parseGeoResponse('success')).toBeNull();
    expect(parseGeoResponse(undefined)).toBeNull();
  });
});

describe('fetchVisitorLocation', () => {
  it('resolves the location from a success response', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'success', lat: 35.6, lon: 139.7, city: 'Tokyo', region: 'Tokyo', country: 'JP' }),
    });
    const loc = await fetchVisitorLocation(fetchImpl as any);
    expect(fetchImpl.mock.calls[0][0]).toBe('/api/geo/visitor');
    expect(loc).toMatchObject({ lat: 35.6, lng: 139.7, city: 'Tokyo' });
  });

  it('resolves null on fail bodies, HTTP errors and network failure — never throws', async () => {
    const failBody = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ status: 'fail' }) });
    expect(await fetchVisitorLocation(failBody as any)).toBeNull();
    const httpErr = vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) });
    expect(await fetchVisitorLocation(httpErr as any)).toBeNull();
    const netErr = vi.fn().mockRejectedValue(new Error('offline'));
    expect(await fetchVisitorLocation(netErr as any)).toBeNull();
  });
});
