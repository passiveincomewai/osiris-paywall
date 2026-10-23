/**
 * OSIRIS — WeatherAPI.com server-only client.
 *
 * SERVER ONLY: this module reads WEATHERAPI_KEY and must never be
 * imported from a client component — the key would ship to the browser.
 *
 * Credential boundary (honest no-op): the owner signed up for
 * WeatherAPI.com but the key is not retrievable in this environment
 * (the Secure Vault capture was never completed). With WEATHERAPI_KEY
 * unset every entry point returns null without any network call, pages
 * render exactly as before, and no placeholder data is ever shown.
 *
 * Quota discipline: the free tier is 100,000 calls/month. Responses are
 * cached per location for 30 minutes (WEATHERAPI_TTL_MS) with in-flight
 * dedup, so page views never translate into per-view upstream calls.
 * A failed refresh serves the last good snapshot marked `stale`.
 */
import { normalizeWeatherResponse } from './normalize';
import type { WeatherSnapshot } from './types';

export const WEATHERAPI_BASE_URL = 'https://api.weatherapi.com/v1';
export const WEATHERAPI_TTL_MS = 30 * 60_000;

export function isWeatherApiConfigured(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return Boolean(env.WEATHERAPI_KEY && env.WEATHERAPI_KEY.trim() !== '');
}

export function weatherApiKey(
  env: Record<string, string | undefined> = process.env,
): string | null {
  const k = env.WEATHERAPI_KEY?.trim();
  return k ? k : null;
}

/**
 * The forecast.json URL for a place query (`q` accepts a city name,
 * "City, Country", or "lat,lng"). alerts=YES + aqi=YES are what fill
 * the non-US government-alert and air-quality gaps this integration
 * exists for; days=3 is the free tier's forecast ceiling.
 */
export function buildForecastUrl(query: string, apiKey: string): string {
  const params = new URLSearchParams({
    key: apiKey,
    q: query,
    days: '3',
    aqi: 'yes',
    alerts: 'yes',
  });
  return `${WEATHERAPI_BASE_URL}/forecast.json?${params.toString()}`;
}

export interface WeatherApiDeps {
  fetchJson: (url: string) => Promise<unknown>;
  apiKey: () => string | null;
  now?: () => number;
  ttlMs?: number;
}

interface CacheEntry {
  data: WeatherSnapshot;
  fetchedAt: number;
}

export function createWeatherApiService(deps: WeatherApiDeps) {
  const now = deps.now ?? (() => Date.now());
  const ttl = deps.ttlMs ?? WEATHERAPI_TTL_MS;
  const cache = new Map<string, CacheEntry>();
  const inflight = new Map<string, Promise<WeatherSnapshot | null>>();
  let upstreamCalls = 0;

  async function getWeather(query: string): Promise<WeatherSnapshot | null> {
    const q = query.trim();
    if (!q) return null;
    const key = deps.apiKey();
    if (!key) return null; // credential boundary — clean no-op

    const cacheKey = q.toLowerCase();
    const entry = cache.get(cacheKey);
    if (entry && now() - entry.fetchedAt < ttl) return entry.data;
    const pending = inflight.get(cacheKey);
    if (pending) return pending;

    const request = (async (): Promise<WeatherSnapshot | null> => {
      try {
        upstreamCalls++;
        const json = await deps.fetchJson(buildForecastUrl(q, key));
        const snapshot = normalizeWeatherResponse(json, now());
        if (!snapshot) throw new Error('unusable WeatherAPI response');
        cache.set(cacheKey, { data: snapshot, fetchedAt: snapshot.fetchedAt });
        return snapshot;
      } catch {
        const prev = cache.get(cacheKey);
        if (prev?.data) return { ...prev.data, stale: true };
        return null; // graceful failure — callers render nothing
      } finally {
        inflight.delete(cacheKey);
      }
    })();

    inflight.set(cacheKey, request);
    return request;
  }

  return { getWeather, upstreamCallCount: () => upstreamCalls };
}

/* ── Process-wide service (real fetch, real env, real clock) ─────── */

async function fetchJsonReal(url: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`WeatherAPI → ${res.status}`);
  return res.json();
}

const singleton = createWeatherApiService({
  fetchJson: fetchJsonReal,
  apiKey: () => weatherApiKey(),
});

/** Weather for a place query, or null when unconfigured / unavailable. */
export function getWeatherForPlace(query: string): Promise<WeatherSnapshot | null> {
  return singleton.getWeather(query);
}
