/**
 * OSIRIS — Aircraft photos (Planespotters.net public API).
 *
 * The aircraft panel shows a photo of the actual airframe when one
 * exists. Planespotters' public API looks photos up by ICAO24 hex or
 * by registration — both are TAIL-specific, so a hit is honestly
 * captioned as this aircraft, with the photographer credited and the
 * photo page linked (their API terms). There is no public type-search
 * endpoint, so the chain ends hex → registration → a labeled
 * placeholder: the panel NEVER shows a random or type-only image
 * dressed up as the airframe.
 *
 * Their API also rejects generic user agents — callers must send
 * PLANESPOTTERS_USER_AGENT.
 */

export const PLANESPOTTERS_API = 'https://api.planespotters.net/pub/photos';
export const PLANESPOTTERS_USER_AGENT = 'WorldEye/1.0 (+https://worldeye.app)';

export interface AircraftPhoto {
  /** Display image URL (their large thumbnail, 420×280). */
  src: string;
  /** The photo's page on planespotters.net (attribution link). */
  link: string;
  photographer: string;
  /** Which identifier produced the hit — both are tail-specific. */
  via: 'hex' | 'reg';
}

export function planespottersHexUrl(hex: string): string {
  return `${PLANESPOTTERS_API}/hex/${encodeURIComponent(hex.trim().toLowerCase())}`;
}

export function planespottersRegUrl(registration: string): string {
  return `${PLANESPOTTERS_API}/reg/${encodeURIComponent(registration.trim().toUpperCase())}`;
}

/**
 * Pull the first usable photo out of a Planespotters response.
 * Anything malformed, empty or missing its attribution fields is a
 * miss — an uncredited photo is never shown.
 */
export function parsePlanespottersPhoto(json: unknown, via: 'hex' | 'reg'): AircraftPhoto | null {
  const photos = (json as { photos?: unknown })?.photos;
  if (!Array.isArray(photos)) return null;
  for (const p of photos) {
    const src = (p as any)?.thumbnail_large?.src ?? (p as any)?.thumbnail?.src;
    const link = (p as any)?.link;
    const photographer = (p as any)?.photographer;
    if (
      typeof src === 'string' && /^https:\/\//i.test(src) &&
      typeof link === 'string' && /^https:\/\//i.test(link) &&
      typeof photographer === 'string' && photographer.trim()
    ) {
      return { src, link, photographer: photographer.trim(), via };
    }
  }
  return null;
}

/** Cache keys: hex preferred, registration the fallback identity. */
export function aircraftPhotoCacheKey(hex?: string | null, registration?: string | null): string | null {
  const h = (hex || '').trim().toLowerCase();
  if (h) return `hex:${h}`;
  const r = (registration || '').trim().toUpperCase();
  return r ? `reg:${r}` : null;
}
