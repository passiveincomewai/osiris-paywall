/**
 * Aurora — NOAA SWPC data access (server-side only).
 *
 * Endpoints (public, free, no key; verified live from the build
 * environment on 2026-10-24):
 *   FORECAST: https://services.swpc.noaa.gov/products/noaa-planetary-k-index-forecast.json
 *     3-hourly Kp: recent observed + estimated + ~2.25 days predicted.
 *     This is the single source for both "current" and "tonight" —
 *     its observed tail mirrors the observed product.
 *   OBSERVED: https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json
 *     3-hourly observed Kp only; used as a fallback when the forecast
 *     product is unreachable (tonight's outlook then covers only the
 *     hours already measured, and places further out report no data).
 *
 * Failure contract: any error → null. No consumer ever sees a thrown
 * error or a fabricated reading; the page renders its "forecast
 * unavailable" state and the alert runner skips the run.
 *
 * Caching: a small per-instance TTL cache (10 min). On serverless this
 * is per warm instance — fine for a 3-hourly planetary index, and it
 * keeps a page render + an API call + a cron run from triple-fetching
 * in the same window.
 */
import { parseKpProduct, type KpPoint } from "./logic";

export const KP_FORECAST_URL =
  "https://services.swpc.noaa.gov/products/noaa-planetary-k-index-forecast.json";
export const KP_OBSERVED_URL =
  "https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json";

const CACHE_TTL_MS = 10 * 60 * 1000;
const cache = new Map<string, { at: number; points: KpPoint[] }>();

async function fetchProduct(url: string): Promise<KpPoint[] | null> {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.points;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const points = parseKpProduct(await res.json());
    if (points.length === 0) return null;
    cache.set(url, { at: Date.now(), points });
    return points;
  } catch {
    return null;
  }
}

/** The Kp series to plan tonight with, or null when NOAA is unreachable. */
export async function getKpSeries(): Promise<KpPoint[] | null> {
  const forecast = await fetchProduct(KP_FORECAST_URL);
  if (forecast) return forecast;
  return fetchProduct(KP_OBSERVED_URL);
}
