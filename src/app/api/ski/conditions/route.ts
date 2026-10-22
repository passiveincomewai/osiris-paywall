import { NextResponse } from 'next/server';
import { httpJson } from '@/lib/httpJson';

export const maxDuration = 20;

/**
 * OSIRIS — active weather alerts for one point, for the ski resort
 * pages' conditions panel.
 *
 * GET /api/ski/conditions?lat=..&lng=..&country=united-states
 *   → { supported, provider, alerts: [{ event, severity, headline, expires }] }
 *
 * The one point-alert source integrated in this codebase is the U.S.
 * National Weather Service — the same api.weather.gov feed
 * /api/weather maps (NOAA/NWS). It covers the United States only; for
 * resorts elsewhere the panel says so plainly and lets the live cameras
 * carry the conditions story rather than inventing a feed the site does
 * not have. Alerts are labelled with the provider wherever they render.
 */

interface NwsAlertProperties {
  event?: string;
  severity?: string;
  headline?: string;
  expires?: string;
  ends?: string;
}
interface NwsAlertsResponse {
  features?: Array<{ properties?: NwsAlertProperties }>;
}

export interface SkiAlert {
  event: string;
  severity: string | null;
  headline: string | null;
  expires: string | null;
}

/** Pure shaping of the NWS payload — most severe first. */
export function shapeNwsAlerts(json: NwsAlertsResponse | null | undefined): SkiAlert[] {
  const rank: Record<string, number> = { Extreme: 0, Severe: 1, Moderate: 2, Minor: 3 };
  return (json?.features ?? [])
    .map(f => f?.properties)
    .filter((p): p is NwsAlertProperties => !!p && typeof p.event === 'string')
    .map(p => ({
      event: p.event as string,
      severity: p.severity ?? null,
      headline: p.headline ?? null,
      expires: p.expires ?? p.ends ?? null,
    }))
    .sort((a, b) => (rank[a.severity ?? ''] ?? 4) - (rank[b.severity ?? ''] ?? 4));
}

/* Ten-minute point cache. Deliberately local rather than lib/sourceCache:
   that cache treats an empty result as no result, and "no active alerts"
   is the common, cacheable answer for a resort point. */
const CACHE_TTL_MS = 10 * 60 * 1000;
const pointCache = new Map<string, { at: number; alerts: SkiAlert[] }>();

async function alertsForPoint(lat: number, lng: number): Promise<SkiAlert[]> {
  const key = `${lat.toFixed(2)},${lng.toFixed(2)}`;
  const hit = pointCache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.alerts;
  const json = await httpJson<NwsAlertsResponse>(
    `https://api.weather.gov/alerts/active?status=actual&message_type=alert,update&point=${lat.toFixed(4)},${lng.toFixed(4)}`,
    { timeoutMs: 9000 },
  );
  const alerts = shapeNwsAlerts(json);
  pointCache.set(key, { at: Date.now(), alerts });
  return alerts;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get('lat'));
  const lng = Number(searchParams.get('lng'));
  const country = searchParams.get('country') ?? '';

  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return NextResponse.json({ error: 'lat and lng are required' }, { status: 400 });
  }

  if (country !== 'united-states') {
    return NextResponse.json({
      supported: false,
      provider: null,
      alerts: [],
    });
  }

  let alerts: SkiAlert[];
  try {
    alerts = await alertsForPoint(lat, lng);
  } catch {
    return NextResponse.json({ error: 'The weather alert feed could not be loaded' }, { status: 502 });
  }

  return NextResponse.json(
    { supported: true, provider: 'U.S. National Weather Service (NOAA/NWS)', alerts },
    { headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1200' } },
  );
}
