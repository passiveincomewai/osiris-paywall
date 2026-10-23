/**
 * OSIRIS — OpenAQ API v3 server-only client.
 *
 * SERVER ONLY: reads OPENAQ_API_KEY and sends it as the `X-API-Key`
 * header — never import this from a client component.
 *
 * Credential boundary (honest no-op): the owner has NOT signed up for
 * OpenAQ yet, and v3 requires a key. With OPENAQ_API_KEY unset every
 * entry point returns null without any network call.
 *
 * Rate-limit discipline: the free tier is 60 requests/minute and
 * 2,000 requests/hour per key. One lookup costs at most two upstream
 * calls (locations + that location's latest), results are cached per
 * rounded coordinate for 30 minutes with in-flight dedup, and a failed
 * refresh serves the last good reading marked `stale`.
 *
 * Attribution: OpenAQ requires source attribution wherever its data is
 * displayed — readings carry `attribution: 'OpenAQ'` and renderers
 * must show it.
 */
import {
  buildOpenAqReading,
  normalizeOpenAqLatest,
  normalizeOpenAqLocations,
} from './normalize';
import type { OpenAqReading } from './types';

export const OPENAQ_BASE_URL = 'https://api.openaq.org/v3';
export const OPENAQ_TTL_MS = 30 * 60_000;
/** Default station search radius (metres) around the requested point. */
export const OPENAQ_DEFAULT_RADIUS_M = 25_000;

export function isOpenAqConfigured(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return Boolean(env.OPENAQ_API_KEY && env.OPENAQ_API_KEY.trim() !== '');
}

export function openAqApiKey(
  env: Record<string, string | undefined> = process.env,
): string | null {
  const k = env.OPENAQ_API_KEY?.trim();
  return k ? k : null;
}

export function buildLocationsUrl(lat: number, lng: number, radiusM: number): string {
  const params = new URLSearchParams({
    coordinates: `${lat},${lng}`,
    radius: String(radiusM),
    limit: '5',
  });
  return `${OPENAQ_BASE_URL}/locations?${params.toString()}`;
}

export function buildLatestUrl(locationId: number): string {
  return `${OPENAQ_BASE_URL}/locations/${locationId}/latest`;
}

export interface OpenAqDeps {
  /** Fetches JSON with the provider's auth header already applied. */
  fetchJson: (url: string) => Promise<unknown>;
  apiKey: () => string | null;
  now?: () => number;
  ttlMs?: number;
  radiusM?: number;
}

export function createOpenAqService(deps: OpenAqDeps) {
  const now = deps.now ?? (() => Date.now());
  const ttl = deps.ttlMs ?? OPENAQ_TTL_MS;
  const radius = deps.radiusM ?? OPENAQ_DEFAULT_RADIUS_M;
  const cache = new Map<string, { data: OpenAqReading; fetchedAt: number }>();
  const inflight = new Map<string, Promise<OpenAqReading | null>>();
  let upstreamCalls = 0;

  async function getNearestAirQuality(
    lat: number,
    lng: number,
  ): Promise<OpenAqReading | null> {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    if (!deps.apiKey()) return null; // credential boundary — clean no-op

    // ~1 km rounding: nearby pages share one cached station lookup.
    // Round with Math.round, not toFixed: toFixed sends negative
    // half-steps away from zero ((-0.125).toFixed(2) === '-0.13' but
    // (-0.124).toFixed(2) === '-0.12'), splitting one bucket into two
    // cache keys — the Math.round form buckets both to -0.12.
    const round2 = (v: number) => Math.round(v * 100) / 100;
    const cacheKey = `${round2(lat)},${round2(lng)},${radius}`;
    const entry = cache.get(cacheKey);
    if (entry && now() - entry.fetchedAt < ttl) return entry.data;
    const pending = inflight.get(cacheKey);
    if (pending) return pending;

    const request = (async (): Promise<OpenAqReading | null> => {
      try {
        upstreamCalls++;
        const locations = normalizeOpenAqLocations(
          await deps.fetchJson(buildLocationsUrl(lat, lng, radius)),
        );
        // Prefer a station that actually reports particulate matter.
        const location =
          locations.find((l) => l.parameters.includes('pm25')) ?? locations[0];
        if (!location) return cache.get(cacheKey)?.data ?? null;
        upstreamCalls++;
        const measurements = normalizeOpenAqLatest(
          await deps.fetchJson(buildLatestUrl(location.id)),
        );
        const reading = buildOpenAqReading(location, measurements, now());
        if (!reading) {
          const prev = cache.get(cacheKey);
          return prev ? { ...prev.data, stale: true } : null;
        }
        cache.set(cacheKey, { data: reading, fetchedAt: reading.fetchedAt });
        return reading;
      } catch {
        const prev = cache.get(cacheKey);
        return prev ? { ...prev.data, stale: true } : null;
      } finally {
        inflight.delete(cacheKey);
      }
    })();

    inflight.set(cacheKey, request);
    return request;
  }

  return { getNearestAirQuality, upstreamCallCount: () => upstreamCalls };
}

/* ── Process-wide service (real fetch, real env, real clock) ─────── */

function makeFetchJson(apiKey: string): (url: string) => Promise<unknown> {
  return async (url: string) => {
    const res = await fetch(url, {
      headers: { Accept: 'application/json', 'X-API-Key': apiKey },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new Error(`OpenAQ → ${res.status}`);
    return res.json();
  };
}

const singleton = createOpenAqService({
  // The key is resolved per call so a key set after boot is honoured,
  // and the header always carries the current key.
  fetchJson: async (url) => {
    const key = openAqApiKey();
    if (!key) throw new Error('OPENAQ_API_KEY not configured');
    return makeFetchJson(key)(url);
  },
  apiKey: () => openAqApiKey(),
});

/** Latest air quality near a point, or null when unconfigured / no station. */
export function getOpenAqAirQuality(
  lat: number,
  lng: number,
): Promise<OpenAqReading | null> {
  return singleton.getNearestAirQuality(lat, lng);
}
