/**
 * OSIRIS — WeatherAPI.com normalized types.
 *
 * One shape for the parts of WeatherAPI's `forecast.json` response that
 * WorldEye renders: current conditions, the (free-tier) 3-day forecast,
 * government weather alerts, and air quality. Everything the provider
 * does not return stays null / an empty array — never invented.
 */

export interface WeatherLocation {
  name: string;
  region: string | null;
  country: string | null;
  lat: number | null;
  lng: number | null;
  localtime: string | null;
}

export interface WeatherCondition {
  text: string;
  code: number | null;
}

export interface WeatherCurrent {
  tempC: number | null;
  tempF: number | null;
  feelsLikeC: number | null;
  condition: WeatherCondition | null;
  windKph: number | null;
  humidity: number | null;
  uv: number | null;
  lastUpdated: string | null;
}

/** Air quality as WeatherAPI reports it (µg/m³ + index values). */
export interface WeatherAirQuality {
  pm25: number | null;
  pm10: number | null;
  o3: number | null;
  no2: number | null;
  so2: number | null;
  co: number | null;
  /** US EPA Air Quality Index category, 1 (Good) – 6 (Hazardous). */
  usEpaIndex: number | null;
  /** UK DEFRA banding, 1 (Low) – 10 (Very High). */
  gbDefraIndex: number | null;
}

export interface WeatherForecastDay {
  date: string;
  maxTempC: number | null;
  minTempC: number | null;
  avgTempC: number | null;
  condition: WeatherCondition | null;
  dailyChanceOfRain: number | null;
  maxWindKph: number | null;
}

/** A government weather alert (WeatherAPI `alerts.alert[]`). */
export interface WeatherAlert {
  headline: string;
  event: string | null;
  severity: string | null;
  urgency: string | null;
  certainty: string | null;
  category: string | null;
  areas: string | null;
  effective: string | null;
  expires: string | null;
  description: string | null;
  instruction: string | null;
}

export interface WeatherSnapshot {
  location: WeatherLocation;
  current: WeatherCurrent;
  forecast: WeatherForecastDay[];
  alerts: WeatherAlert[];
  airQuality: WeatherAirQuality | null;
  /** When this snapshot was fetched from the provider (epoch ms). */
  fetchedAt: number;
  /** True when a refresh failed and this is the last good snapshot. */
  stale: boolean;
}

export const WEATHERAPI_SOURCE_LABEL = 'WeatherAPI.com';
