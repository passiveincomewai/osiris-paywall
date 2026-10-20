import { expect, it } from 'vitest';
import { GET } from './route';

const request = (headers: Record<string, string> = {}) =>
  new Request('http://localhost/api/geo/visitor', { headers });

it('answers from the platform geo headers when they are present', async () => {
  const res = await GET(request({
    'x-vercel-ip-latitude': '40.7608',
    'x-vercel-ip-longitude': '-111.891',
    'x-vercel-ip-city': 'Salt%20Lake%20City',
    'x-vercel-ip-country-region': 'UT',
    'x-vercel-ip-country': 'US',
  }));
  expect(await res.json()).toEqual({
    status: 'success', lat: 40.7608, lon: -111.891,
    city: 'Salt Lake City', region: 'UT', country: 'US',
  });
  expect(res.headers.get('cache-control')).toBe('private, no-store');
});

it('fails closed (and uncached) when the platform provided nothing', async () => {
  const res = await GET(request());
  expect(await res.json()).toEqual({ status: 'fail' });
  expect(res.headers.get('cache-control')).toBe('private, no-store');
});

it('fails closed on malformed header values rather than guessing', async () => {
  const res = await GET(request({
    'x-vercel-ip-latitude': 'not-a-number',
    'x-vercel-ip-longitude': '-111.891',
    'x-vercel-ip-city': 'Salt%20Lake%20City',
  }));
  expect((await res.json()).status).toBe('fail');
});
