/**
 * OSIRIS — Street Level provider: Panoramax (GeoVisio STAC API).
 *
 * Panoramax is a federation of community street-level imagery instances
 * behind one keyless meta-catalogue (api.panoramax.xyz). Access is the
 * standard GeoVisio STAC surface, verified live against the federation's
 * OpenAPI spec and a production instance:
 *
 *   GET {base}/api/search?bbox=w,s,e,n&limit=N   → STAC FeatureCollection
 *   GET {base}/api/pictures/{id}                 → STAC Feature
 *
 * Licensing: every PICTURE carries its own licence (mostly CC BY-SA
 * 4.0; the IGN instance publishes under Licence Ouverte 2.0) and its
 * producer. The normalizer keeps licence, licence link and producer on
 * every record so attribution renders wherever the image renders. The
 * image URLs used are the ones the API itself publishes for display
 * (assets with roles thumbnail/visual/data) — no scraping, no tile
 * hotlinking beyond the API's own contract.
 *
 * The meta-catalogue base is overridable with PANORAMAX_API_BASE (any
 * federation instance speaks the same API) — the seam a deployment uses
 * if the meta-catalogue is unreachable from its egress.
 */
import type { StreetPicture } from './types';
import type { LngLatBbox } from './bbox';

export const PANORAMAX_DEFAULT_BASE = 'https://api.panoramax.xyz';
export const PANORAMAX_PROVIDER_ID = 'panoramax';

export function panoramaxSearchUrl(base: string, bbox: LngLatBbox, limit: number): string {
  const b = `${bbox.west},${bbox.south},${bbox.east},${bbox.north}`;
  return `${base}/api/search?bbox=${b}&limit=${limit}`;
}

export function panoramaxPictureUrl(base: string, id: string): string {
  return `${base}/api/pictures/${encodeURIComponent(id)}`;
}

/** The id at the tail of a STAC item href (…/items/{uuid}). */
function idFromHref(href: unknown): string | null {
  if (typeof href !== 'string') return null;
  const tail = href.split('/').filter(Boolean).pop() ?? '';
  return /^[0-9a-fA-F-]{36}$/.test(tail) ? tail : null;
}

function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function str(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null;
}

/**
 * Asset hrefs are not uniformly absolute: search results carry full
 * URLs, but the single-picture endpoint returns instance-relative
 * derivative paths (/derivatives/…). Resolve everything against the
 * provider base so the client never renders a link that would resolve
 * against WorldEye's own origin.
 */
function absolutize(href: string | null, base: string): string | null {
  if (!href) return null;
  if (/^https?:\/\//i.test(href)) return href;
  try {
    return new URL(href, base.endsWith('/') ? base : `${base}/`).href;
  } catch {
    return href;
  }
}

/**
 * Normalize one STAC picture feature into a StreetPicture. Returns null
 * for anything without a usable id + position — a picture we cannot
 * place or attribute is dropped, never approximated. Provider bulk
 * (EXIF blobs, semantic annotations) is deliberately not carried.
 */
export function normalizePicture(feature: any, base: string = PANORAMAX_DEFAULT_BASE): StreetPicture | null {
  if (!feature || typeof feature !== 'object') return null;
  const id = str(feature.id);
  const coords = feature.geometry?.coordinates;
  if (!id || !Array.isArray(coords)) return null;
  const lng = num(coords[0]);
  const lat = num(coords[1]);
  if (lng === null || lat === null) return null;

  const p = feature.properties ?? {};
  const assets = feature.assets ?? {};
  const links: any[] = Array.isArray(feature.links) ? feature.links : [];
  const linkHref = (rel: string) => links.find((l) => l?.rel === rel)?.href;

  return {
    id,
    lng,
    lat,
    capturedAt: str(p.datetime),
    sequenceId: str(feature.collection) ?? str(p.collection?.id),
    producer: str(p['geovisio:producer']),
    license: str(p.license),
    licenseUrl: str(linkHref('license')),
    thumbUrl: absolutize(str(assets.thumb?.href) ?? str(p['geovisio:thumbnail']), base),
    imageUrl: absolutize(str(assets.sd?.href) ?? str(p['geovisio:image']) ?? str(assets.hd?.href), base),
    hdUrl: absolutize(str(assets.hd?.href) ?? str(p['geovisio:image']), base),
    azimuthDeg: num(p['view:azimuth']),
    rankInSequence: num(p['geovisio:rank_in_collection']),
    nextId: idFromHref(linkHref('next')),
    prevId: idFromHref(linkHref('prev')),
  };
}

/** Normalize a STAC search response. `truncated` is true when the page
 *  came back full — the cap, not the area, ended the list. */
export function normalizeSearchResponse(
  json: any,
  limit: number,
  base: string = PANORAMAX_DEFAULT_BASE,
): { pictures: StreetPicture[]; truncated: boolean } {
  const features: any[] = Array.isArray(json?.features) ? json.features : [];
  const pictures: StreetPicture[] = [];
  for (const f of features) {
    const pic = normalizePicture(f, base);
    if (pic) pictures.push(pic);
  }
  return { pictures, truncated: features.length >= limit };
}

/** Provider descriptor — the seam a second provider implements. */
export const panoramaxProvider = {
  id: PANORAMAX_PROVIDER_ID,
  label: 'Panoramax',
  searchUrl: panoramaxSearchUrl,
  pictureUrl: panoramaxPictureUrl,
  normalizeSearch: normalizeSearchResponse,
  normalizePicture,
};
