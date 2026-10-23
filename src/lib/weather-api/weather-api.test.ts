import { describe, expect, it, vi } from 'vitest';
import { normalizeWeatherResponse } from './normalize';
import {
  buildForecastUrl,
  createWeatherApiService,
  isWeatherApiConfigured,
  WEATHERAPI_TTL_MS,
} from './server';

/**
 * Fixture shaped like a real WeatherAPI forecast.json response
 * (London, alerts=yes + aqi=yes) — trimmed to the fields the client
 * consumes. No live API is ever called in these tests.
 */
const FIXTURE = {
  location: {
    name: 'London',
    region: 'City of London, Greater London',
    country: 'United Kingdom',
    lat: 51.5171,
    lon: -0.1062,
    localtime: '2026-10-22 18:30',
  },
  current: {
    temp_c: 13.0,
    temp_f: 55.4,
    feelslike_c: 11.2,
    condition: { text: 'Partly cloudy', code: 1003 },
    wind_kph: 16.9,
    humidity: 72,
    uv: 2.0,
    last_updated: '2026-10-22 18:30',
    air_quality: {
      co: 233.5,
      no2: 28.7,
      o3: 41.0,
      so2: 5.2,
      pm2_5: 9.4,
      pm10: 13.1,
      'us-epa-index': 1,
      'gb-defra-index': 1,
    },
  },
  forecast: {
    forecastday: [
      {
        date: '2026-10-22',
        day: {
          maxtemp_c: 15.1,
          mintemp_c: 9.8,
          avgtemp_c: 12.3,
          condition: { text: 'Partly cloudy', code: 1003 },
          daily_chance_of_rain: 20,
          maxwind_kph: 24.1,
        },
      },
      {
        date: '2026-10-23',
        day: {
          maxtemp_c: 14.0,
          mintemp_c: 8.9,
          avgtemp_c: 11.4,
          condition: { text: 'Light rain', code: 1183 },
          daily_chance_of_rain: 86,
          maxwind_kph: 28.8,
        },
      },
    ],
  },
  alerts: {
    alert: [
      {
        headline: 'Yellow warning of wind affecting London & South East England',
        msgtype: 'Alert',
        severity: 'Moderate',
        urgency: 'Expected',
        certainty: 'Likely',
        category: 'Met',
        areas: 'London & South East England',
        event: 'Wind',
        effective: '2026-10-22T10:00:00+01:00',
        expires: '2026-10-23T06:00:00+01:00',
        desc: 'Gusts of 50-60 mph are likely.',
        instruction: 'Secure loose outdoor items.',
      },
    ],
  },
};

describe('normalizeWeatherResponse', () => {
  it('maps location, current, forecast, alerts and AQI', () => {
    const s = normalizeWeatherResponse(FIXTURE, 1234);
    expect(s).not.toBeNull();
    expect(s!.location).toMatchObject({ name: 'London', country: 'United Kingdom', lat: 51.5171, lng: -0.1062 });
    expect(s!.current.tempC).toBe(13.0);
    expect(s!.current.condition?.text).toBe('Partly cloudy');
    expect(s!.forecast).toHaveLength(2);
    expect(s!.forecast[1].dailyChanceOfRain).toBe(86);
    expect(s!.alerts).toHaveLength(1);
    expect(s!.alerts[0].event).toBe('Wind');
    expect(s!.alerts[0].severity).toBe('Moderate');
    expect(s!.airQuality?.pm25).toBe(9.4);
    expect(s!.airQuality?.usEpaIndex).toBe(1);
    expect(s!.fetchedAt).toBe(1234);
    expect(s!.stale).toBe(false);
  });

  it('rejects payloads without a usable location and tolerates missing sections', () => {
    expect(normalizeWeatherResponse(null, 0)).toBeNull();
    expect(normalizeWeatherResponse({}, 0)).toBeNull();
    expect(normalizeWeatherResponse({ location: { name: 'X' } }, 0)).toMatchObject({
      forecast: [],
      alerts: [],
      airQuality: null,
    });
  });
});

describe('buildForecastUrl', () => {
  it('requests forecast with alerts and AQI enabled', () => {
    const url = new URL(buildForecastUrl('London, United Kingdom', 'TESTKEY'));
    expect(url.pathname).toBe('/v1/forecast.json');
    expect(url.searchParams.get('key')).toBe('TESTKEY');
    expect(url.searchParams.get('q')).toBe('London, United Kingdom');
    expect(url.searchParams.get('alerts')).toBe('yes');
    expect(url.searchParams.get('aqi')).toBe('yes');
    expect(url.searchParams.get('days')).toBe('3');
  });
});

describe('createWeatherApiService — credential boundary + caching', () => {
  it('is a clean no-op without a key: no fetch, null result', async () => {
    const fetchJson = vi.fn(async () => FIXTURE);
    const svc = createWeatherApiService({ fetchJson, apiKey: () => null });
    expect(await svc.getWeather('London')).toBeNull();
    expect(fetchJson).not.toHaveBeenCalled();
    expect(isWeatherApiConfigured({})).toBe(false);
    expect(isWeatherApiConfigured({ WEATHERAPI_KEY: '  ' })).toBe(false);
    expect(isWeatherApiConfigured({ WEATHERAPI_KEY: 'x' })).toBe(true);
  });

  it('caches per location for the TTL and dedupes concurrent calls', async () => {
    let now = 1_000_000;
    const fetchJson = vi.fn(async () => FIXTURE);
    const svc = createWeatherApiService({ fetchJson, apiKey: () => 'k', now: () => now });
    const [a, b] = await Promise.all([svc.getWeather('London'), svc.getWeather('london')]);
    expect(a).toEqual(b);
    expect(fetchJson).toHaveBeenCalledTimes(1);
    now += WEATHERAPI_TTL_MS - 1;
    await svc.getWeather('London');
    expect(fetchJson).toHaveBeenCalledTimes(1);
    now += 2;
    await svc.getWeather('London');
    expect(fetchJson).toHaveBeenCalledTimes(2);
  });

  it('serves the last good snapshot (marked stale) when a refresh fails', async () => {
    let now = 0;
    let fail = false;
    const fetchJson = vi.fn(async () => {
      if (fail) throw new Error('upstream 500');
      return FIXTURE;
    });
    const svc = createWeatherApiService({ fetchJson, apiKey: () => 'k', now: () => now });
    const good = await svc.getWeather('London');
    expect(good?.stale).toBe(false);
    now += WEATHERAPI_TTL_MS + 1;
    fail = true;
    const stale = await svc.getWeather('London');
    expect(stale?.location.name).toBe('London');
    expect(stale?.stale).toBe(true);
  });

  it('returns null on a cold-cache failure (graceful failure)', async () => {
    const svc = createWeatherApiService({
      fetchJson: async () => { throw new Error('down'); },
      apiKey: () => 'k',
    });
    expect(await svc.getWeather('Nowhere')).toBeNull();
  });
});
