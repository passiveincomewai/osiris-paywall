import { describe, expect, it, vi } from 'vitest';
import {
  normalizeOpenAqLatest,
  normalizeOpenAqLocations,
} from './normalize';
import {
  buildLatestUrl,
  buildLocationsUrl,
  createOpenAqService,
  isOpenAqConfigured,
  OPENAQ_TTL_MS,
} from './server';

/** Fixtures shaped like OpenAQ v3 responses (trimmed to consumed fields). */
const LOCATIONS = {
  meta: { found: 1 },
  results: [
    {
      id: 8118,
      name: 'London Bloomsbury',
      locality: 'London',
      country: { code: 'GB', name: 'United Kingdom' },
      coordinates: { latitude: 51.52229, longitude: -0.125889 },
      parameters: [
        { id: 2, name: 'pm25', units: 'µg/m³' },
        { id: 1, name: 'pm10', units: 'µg/m³' },
        { id: 10, name: 'no2', units: 'µg/m³' },
      ],
    },
  ],
};

const LATEST = {
  meta: { found: 3 },
  results: [
    { value: 8.1, datetime: { utc: '2026-10-22T17:00:00Z' }, parameter: { id: 2, name: 'pm25', units: 'µg/m³' }, sensorsId: 11, locationsId: 8118 },
    { value: 12.4, datetime: { utc: '2026-10-22T17:00:00Z' }, parameter: { id: 1, name: 'pm10', units: 'µg/m³' }, sensorsId: 12, locationsId: 8118 },
    { value: 31.0, datetime: { utc: '2026-10-22T17:00:00Z' }, parameter: { id: 10, name: 'no2', units: 'µg/m³' }, sensorsId: 13, locationsId: 8118 },
  ],
};

describe('OpenAQ v3 normalization', () => {
  it('maps locations with coordinates and parameter names', () => {
    const locs = normalizeOpenAqLocations(LOCATIONS);
    expect(locs).toHaveLength(1);
    expect(locs[0]).toMatchObject({ id: 8118, name: 'London Bloomsbury', countryCode: 'GB', lat: 51.52229 });
    expect(locs[0].parameters).toEqual(['pm25', 'pm10', 'no2']);
    expect(normalizeOpenAqLocations({})).toEqual([]);
    expect(normalizeOpenAqLocations(null)).toEqual([]);
  });

  it('maps latest measurements and drops junk rows', () => {
    const m = normalizeOpenAqLatest(LATEST);
    expect(m).toHaveLength(3);
    expect(m[0]).toMatchObject({ parameter: 'pm25', value: 8.1, measuredAt: '2026-10-22T17:00:00Z' });
    expect(normalizeOpenAqLatest({ results: [{ value: 'x' }, null] })).toEqual([]);
  });
});

describe('OpenAQ URL builders', () => {
  it('builds the v3 locations and latest URLs', () => {
    const loc = new URL(buildLocationsUrl(51.5, -0.12, 25000));
    expect(loc.pathname).toBe('/v3/locations');
    expect(loc.searchParams.get('coordinates')).toBe('51.5,-0.12');
    expect(loc.searchParams.get('radius')).toBe('25000');
    expect(buildLatestUrl(8118)).toBe('https://api.openaq.org/v3/locations/8118/latest');
  });
});

describe('createOpenAqService — credential boundary + caching', () => {
  function mockFetch() {
    return vi.fn(async (url: string) => (url.includes('/latest') ? LATEST : LOCATIONS));
  }

  it('is a clean no-op without a key: no fetch, null result', async () => {
    const fetchJson = mockFetch();
    const svc = createOpenAqService({ fetchJson, apiKey: () => null });
    expect(await svc.getNearestAirQuality(51.5, -0.12)).toBeNull();
    expect(fetchJson).not.toHaveBeenCalled();
    expect(isOpenAqConfigured({})).toBe(false);
    expect(isOpenAqConfigured({ OPENAQ_API_KEY: 'x' })).toBe(true);
  });

  it('returns a reading with mandatory OpenAQ attribution', async () => {
    const svc = createOpenAqService({ fetchJson: mockFetch(), apiKey: () => 'k' });
    const r = await svc.getNearestAirQuality(51.52, -0.12);
    expect(r).not.toBeNull();
    expect(r!.attribution).toBe('OpenAQ');
    expect(r!.location.name).toBe('London Bloomsbury');
    expect(r!.pm25).toBe(8.1);
    expect(r!.pm10).toBe(12.4);
    expect(r!.no2).toBe(31.0);
    expect(r!.o3).toBeNull(); // not reported by this station — never invented
  });

  it('caches per rounded coordinate inside the TTL (rate-limit aware)', async () => {
    let now = 0;
    const fetchJson = mockFetch();
    const svc = createOpenAqService({ fetchJson, apiKey: () => 'k', now: () => now });
    await svc.getNearestAirQuality(51.522, -0.125);
    await svc.getNearestAirQuality(51.524, -0.124); // same rounded key
    expect(fetchJson).toHaveBeenCalledTimes(2); // locations + latest, once
    now += OPENAQ_TTL_MS + 1;
    await svc.getNearestAirQuality(51.522, -0.125);
    expect(fetchJson).toHaveBeenCalledTimes(4);
  });

  it('returns null when no station is in range or upstream fails cold', async () => {
    const empty = createOpenAqService({
      fetchJson: async () => ({ results: [] }),
      apiKey: () => 'k',
    });
    expect(await empty.getNearestAirQuality(0, 0)).toBeNull();
    const down = createOpenAqService({
      fetchJson: async () => { throw new Error('429'); },
      apiKey: () => 'k',
    });
    expect(await down.getNearestAirQuality(51.5, -0.12)).toBeNull();
  });
});
