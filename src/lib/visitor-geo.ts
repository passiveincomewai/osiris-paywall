/**
 * Visitor location from the platform's geo headers — the coarse,
 * server-side answer to "roughly where is this visitor" that drives the
 * globe's opening view and the Near You strip (lib/near-you.ts).
 *
 * Source: the headers Vercel's edge stamps on every request it serves
 *   x-vercel-ip-latitude / x-vercel-ip-longitude   (decimal strings)
 *   x-vercel-ip-city                               (URL-encoded)
 *   x-vercel-ip-country-region / x-vercel-ip-country
 * They are read by /api/geo/visitor and parsed here. Precision is
 * CITY level at best — the point is a city's reference point, not the
 * visitor's position — and every consumer must treat it that way (the
 * strip labels its distances approximate for exactly this reason).
 *
 * Deliberately NOT here: any IP-lookup service and any browser
 * geolocation prompt. The older /api/geo route (a third-party IP lookup
 * proxy) still serves the features that already used it; the opening
 * flow tries the headers first and falls back to it only when the
 * platform provided nothing, so behaviour off-Vercel is unchanged.
 *
 * Failure mode is always "unknown" (null): no headers, malformed
 * headers, or out-of-range coordinates all degrade to the previous
 * behaviour. Nothing in this module ever throws or blocks.
 */

export interface VisitorLocation {
  lat: number;
  lng: number;
  city: string | null;
  region: string | null;
  country: string | null;
}

const MAX_LABEL_LEN = 80;

function cleanLabel(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const s = v.trim().slice(0, MAX_LABEL_LEN);
  // The legacy providers report the literal string "Unknown" for fields
  // they could not resolve — that is an absence, not a place name.
  if (!s || s.toLowerCase() === 'unknown') return null;
  return s;
}

function decodeLabel(v: string | null): string | null {
  if (v == null) return null;
  try {
    return cleanLabel(decodeURIComponent(v));
  } catch {
    return cleanLabel(v);
  }
}

function cleanCoord(v: unknown): number | null {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
}

/**
 * Assemble a location from coordinates + labels, or null when the
 * coordinates are unusable. (0, 0) is rejected: it is the Gulf of
 * Guinea, and a platform that cannot locate a visitor does not get to
 * park the globe there.
 */
function buildLocation(
  latRaw: unknown,
  lngRaw: unknown,
  labels: { city?: unknown; region?: unknown; country?: unknown },
): VisitorLocation | null {
  const lat = cleanCoord(latRaw);
  const lng = cleanCoord(lngRaw);
  if (lat == null || lng == null) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  if (lat === 0 && lng === 0) return null;
  return {
    lat,
    lng,
    city: cleanLabel(labels.city),
    region: cleanLabel(labels.region),
    country: cleanLabel(labels.country),
  };
}

/** Parse the platform geo headers (any header getter, e.g. Headers.get). */
export function parseVercelGeoHeaders(
  get: (name: string) => string | null,
): VisitorLocation | null {
  try {
    return buildLocation(get('x-vercel-ip-latitude'), get('x-vercel-ip-longitude'), {
      city: decodeLabel(get('x-vercel-ip-city')),
      region: get('x-vercel-ip-country-region'),
      country: get('x-vercel-ip-country'),
    });
  } catch {
    return null;
  }
}

/**
 * Parse a geo endpoint response into a location. Accepts both shapes in
 * play: /api/geo/visitor ({status, lat, lon, city, region, country}) and
 * the legacy /api/geo ({status, lat, lon, city, regionName, country}).
 * Anything else — error bodies, status:'fail', junk — returns null.
 */
export function parseGeoResponse(json: unknown): VisitorLocation | null {
  if (!json || typeof json !== 'object') return null;
  const rec = json as Record<string, unknown>;
  if (rec.status !== 'success') return null;
  return buildLocation(rec.lat, rec.lon ?? rec.lng, {
    city: rec.city,
    region: rec.region ?? rec.regionName,
    country: rec.country,
  });
}

type FetchLike = (input: string, init?: { signal?: AbortSignal }) => Promise<{
  ok: boolean;
  json: () => Promise<unknown>;
}>;

/**
 * Ask /api/geo/visitor for the header-derived location. Resolves to null
 * on ANY failure (route missing, non-OK, malformed body, abort) — the
 * caller always has its fallback ready and the globe never waits on this.
 */
export async function fetchVisitorLocation(
  fetchImpl: FetchLike = fetch as unknown as FetchLike,
  signal?: AbortSignal,
): Promise<VisitorLocation | null> {
  try {
    const res = await fetchImpl('/api/geo/visitor', signal ? { signal } : undefined);
    if (!res.ok) return null;
    return parseGeoResponse(await res.json());
  } catch {
    return null;
  }
}
