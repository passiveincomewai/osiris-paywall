/**
 * OSIRIS — place weather for city / country pages (server-side).
 *
 * Combines the two keyed providers behind one call:
 *   • Forecast, government alerts and (fallback) AQI — WeatherAPI.com
 *     (src/lib/weather-api), behind WEATHERAPI_KEY.
 *   • Preferred AQI — OpenAQ ground stations (src/lib/openaq), behind
 *     OPENAQ_API_KEY, used whenever the page knows coordinates.
 *
 * Preference order for air quality: OpenAQ → WeatherAPI AQI → nothing.
 * With neither key set this returns null and the pages render exactly
 * as they did before — no placeholder weather, ever. Attribution for
 * whichever AQI source won travels with the reading and is rendered.
 */
import { getWeatherForPlace } from './weather-api/server';
import type { WeatherAirQuality, WeatherSnapshot } from './weather-api/types';
import { getOpenAqAirQuality } from './openaq/server';
import type { OpenAqReading } from './openaq/types';

export interface PlaceAirQuality {
  source: 'OpenAQ' | 'WeatherAPI';
  /** Display attribution — mandatory for OpenAQ data. */
  attribution: string;
  pm25: number | null;
  pm10: number | null;
  o3: number | null;
  no2: number | null;
  so2: number | null;
  co: number | null;
  /** US EPA index (WeatherAPI only — OpenAQ reports raw measurements). */
  usEpaIndex: number | null;
  /** Station / location name the reading came from, when known. */
  locationName: string | null;
  measuredAt: string | null;
}

export interface PlaceWeather {
  weather: WeatherSnapshot | null;
  airQuality: PlaceAirQuality | null;
}

export function airQualityFromOpenAq(r: OpenAqReading): PlaceAirQuality {
  return {
    source: 'OpenAQ',
    attribution: 'OpenAQ',
    pm25: r.pm25,
    pm10: r.pm10,
    o3: r.o3,
    no2: r.no2,
    so2: r.so2,
    co: r.co,
    usEpaIndex: null,
    locationName: r.location.name,
    measuredAt: r.measuredAt,
  };
}

export function airQualityFromWeatherApi(
  a: WeatherAirQuality,
  locationName: string | null,
): PlaceAirQuality {
  return {
    source: 'WeatherAPI',
    attribution: 'WeatherAPI.com',
    pm25: a.pm25,
    pm10: a.pm10,
    o3: a.o3,
    no2: a.no2,
    so2: a.so2,
    co: a.co,
    usEpaIndex: a.usEpaIndex,
    locationName,
    measuredAt: null,
  };
}

export interface PlaceWeatherDeps {
  getWeather: (query: string) => Promise<WeatherSnapshot | null>;
  getOpenAq: (lat: number, lng: number) => Promise<OpenAqReading | null>;
}

export interface PlaceWeatherQuery {
  /** WeatherAPI place query: "City, Country" or "lat,lng". */
  query: string;
  /** Coordinates for the OpenAQ station lookup, when the page has them. */
  lat?: number | null;
  lng?: number | null;
}

export function createPlaceWeatherService(deps: PlaceWeatherDeps) {
  async function getPlaceWeather(q: PlaceWeatherQuery): Promise<PlaceWeather | null> {
    const [weather, openAq] = await Promise.all([
      deps.getWeather(q.query).catch(() => null),
      q.lat != null && q.lng != null
        ? deps.getOpenAq(q.lat, q.lng).catch(() => null)
        : Promise.resolve(null),
    ]);

    let airQuality: PlaceAirQuality | null = null;
    if (openAq) {
      airQuality = airQualityFromOpenAq(openAq);
    } else if (weather?.airQuality) {
      airQuality = airQualityFromWeatherApi(weather.airQuality, weather.location.name);
    }

    if (!weather && !airQuality) return null;
    return { weather, airQuality };
  }
  return { getPlaceWeather };
}

const singleton = createPlaceWeatherService({
  getWeather: getWeatherForPlace,
  getOpenAq: getOpenAqAirQuality,
});

/** Place weather + AQI for a page, or null when nothing is available. */
export function getPlaceWeather(q: PlaceWeatherQuery): Promise<PlaceWeather | null> {
  return singleton.getPlaceWeather(q);
}
