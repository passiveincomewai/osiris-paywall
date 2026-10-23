/**
 * OSIRIS — WeatherAPI.com `forecast.json` → WeatherSnapshot normalization.
 *
 * Pure and defensive: the provider payload is `unknown` until each field
 * is checked. A payload without a usable location is not a snapshot at
 * all (null); individual missing readings stay null rather than being
 * smoothed over.
 */
import type {
  WeatherAirQuality,
  WeatherAlert,
  WeatherSnapshot,
} from './types';

type Rec = Record<string, unknown>;

function rec(v: unknown): Rec | null {
  return typeof v === 'object' && v !== null ? (v as Rec) : null;
}
function str(v: unknown): string | null {
  return typeof v === 'string' && v.trim() !== '' ? v : null;
}
function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function condition(v: unknown): { text: string; code: number | null } | null {
  const c = rec(v);
  if (!c) return null;
  const text = str(c.text);
  if (!text) return null;
  return { text, code: num(c.code) };
}

export function normalizeAirQuality(v: unknown): WeatherAirQuality | null {
  const a = rec(v);
  if (!a) return null;
  const out: WeatherAirQuality = {
    pm25: num(a.pm2_5),
    pm10: num(a.pm10),
    o3: num(a.o3),
    no2: num(a.no2),
    so2: num(a.so2),
    co: num(a.co),
    usEpaIndex: num(a['us-epa-index']),
    gbDefraIndex: num(a['gb-defra-index']),
  };
  // An air_quality object with no readings at all carries no information.
  return Object.values(out).some((x) => x !== null) ? out : null;
}

export function normalizeAlert(v: unknown): WeatherAlert | null {
  const a = rec(v);
  if (!a) return null;
  const headline = str(a.headline) ?? str(a.event);
  if (!headline) return null;
  return {
    headline,
    event: str(a.event),
    severity: str(a.severity),
    urgency: str(a.urgency),
    certainty: str(a.certainty),
    category: str(a.category),
    areas: str(a.areas),
    effective: str(a.effective),
    expires: str(a.expires),
    description: str(a.desc),
    instruction: str(a.instruction),
  };
}

/** Normalize a parsed forecast.json body. `fetchedAt` is the caller's clock. */
export function normalizeWeatherResponse(
  raw: unknown,
  fetchedAt: number,
): WeatherSnapshot | null {
  const root = rec(raw);
  if (!root) return null;
  const loc = rec(root.location);
  if (!loc) return null;
  const name = str(loc.name);
  if (!name) return null;

  const cur = rec(root.current) ?? {};
  const forecastRaw = rec(root.forecast);
  const daysRaw = Array.isArray(forecastRaw?.forecastday)
    ? (forecastRaw.forecastday as unknown[])
    : [];
  const alertsRaw = rec(root.alerts);
  const alertsList = Array.isArray(alertsRaw?.alert)
    ? (alertsRaw.alert as unknown[])
    : [];

  return {
    location: {
      name,
      region: str(loc.region),
      country: str(loc.country),
      lat: num(loc.lat),
      lng: num(loc.lon),
      localtime: str(loc.localtime),
    },
    current: {
      tempC: num(cur.temp_c),
      tempF: num(cur.temp_f),
      feelsLikeC: num(cur.feelslike_c),
      condition: condition(cur.condition),
      windKph: num(cur.wind_kph),
      humidity: num(cur.humidity),
      uv: num(cur.uv),
      lastUpdated: str(cur.last_updated),
    },
    forecast: daysRaw.flatMap((d) => {
      const day = rec(d);
      const inner = rec(day?.day);
      const date = str(day?.date);
      if (!day || !inner || !date) return [];
      return [
        {
          date,
          maxTempC: num(inner.maxtemp_c),
          minTempC: num(inner.mintemp_c),
          avgTempC: num(inner.avgtemp_c),
          condition: condition(inner.condition),
          dailyChanceOfRain: num(inner.daily_chance_of_rain),
          maxWindKph: num(inner.maxwind_kph),
        },
      ];
    }),
    alerts: alertsList.flatMap((a) => {
      const n = normalizeAlert(a);
      return n ? [n] : [];
    }),
    airQuality: normalizeAirQuality(cur.air_quality),
    fetchedAt,
    stale: false,
  };
}
