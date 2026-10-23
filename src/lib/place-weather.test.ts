import { describe, expect, it, vi } from 'vitest';
import { createPlaceWeatherService } from './place-weather';
import type { WeatherSnapshot } from './weather-api/types';
import type { OpenAqReading } from './openaq/types';

const WEATHER: WeatherSnapshot = {
  location: { name: 'London', region: null, country: 'United Kingdom', lat: 51.5, lng: -0.12, localtime: null },
  current: { tempC: 13, tempF: 55, feelsLikeC: 11, condition: { text: 'Cloudy', code: 1006 }, windKph: 10, humidity: 70, uv: 1, lastUpdated: null },
  forecast: [],
  alerts: [],
  airQuality: { pm25: 20, pm10: 25, o3: null, no2: null, so2: null, co: null, usEpaIndex: 2, gbDefraIndex: null },
  fetchedAt: 0,
  stale: false,
};

const OPENAQ: OpenAqReading = {
  location: { id: 1, name: 'Station A', locality: 'London', countryCode: 'GB', countryName: 'United Kingdom', lat: 51.5, lng: -0.12, parameters: ['pm25'] },
  measurements: [{ parameter: 'pm25', value: 7, units: 'µg/m³', measuredAt: '2026-10-22T17:00:00Z' }],
  pm25: 7, pm10: null, o3: null, no2: null, so2: null, co: null,
  measuredAt: '2026-10-22T17:00:00Z',
  fetchedAt: 0,
  stale: false,
  attribution: 'OpenAQ',
};

describe('createPlaceWeatherService — AQI preference order', () => {
  it('prefers OpenAQ over WeatherAPI AQI when both answer', async () => {
    const svc = createPlaceWeatherService({
      getWeather: async () => WEATHER,
      getOpenAq: async () => OPENAQ,
    });
    const r = await svc.getPlaceWeather({ query: 'London', lat: 51.5, lng: -0.12 });
    expect(r?.airQuality?.source).toBe('OpenAQ');
    expect(r?.airQuality?.attribution).toBe('OpenAQ');
    expect(r?.airQuality?.pm25).toBe(7);
    expect(r?.weather?.location.name).toBe('London'); // forecast still WeatherAPI
  });

  it('falls back to WeatherAPI AQI when OpenAQ has nothing', async () => {
    const svc = createPlaceWeatherService({
      getWeather: async () => WEATHER,
      getOpenAq: async () => null,
    });
    const r = await svc.getPlaceWeather({ query: 'London', lat: 51.5, lng: -0.12 });
    expect(r?.airQuality?.source).toBe('WeatherAPI');
    expect(r?.airQuality?.pm25).toBe(20);
    expect(r?.airQuality?.usEpaIndex).toBe(2);
  });

  it('does not call OpenAQ without coordinates', async () => {
    const getOpenAq = vi.fn(async () => OPENAQ);
    const svc = createPlaceWeatherService({ getWeather: async () => WEATHER, getOpenAq });
    await svc.getPlaceWeather({ query: 'London' });
    expect(getOpenAq).not.toHaveBeenCalled();
  });

  it('returns an OpenAQ-only result when WeatherAPI is unconfigured', async () => {
    const svc = createPlaceWeatherService({
      getWeather: async () => null,
      getOpenAq: async () => OPENAQ,
    });
    const r = await svc.getPlaceWeather({ query: 'London', lat: 51.5, lng: -0.12 });
    expect(r?.weather).toBeNull();
    expect(r?.airQuality?.source).toBe('OpenAQ');
  });

  it('returns null when neither provider answers (pages render unchanged)', async () => {
    const svc = createPlaceWeatherService({
      getWeather: async () => null,
      getOpenAq: async () => null,
    });
    expect(await svc.getPlaceWeather({ query: 'London', lat: 1, lng: 2 })).toBeNull();
  });
});
