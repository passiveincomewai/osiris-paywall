import type { CctvCamera } from './types';
import { stealthFetch } from '@/lib/stealthFetch';
import { cachedSource } from '@/lib/sourceCache';

/**
 * OSIRIS — South Dakota CCTV Cameras (SDDOT / SD511)
 * Source: https://sd.cdn.iteris-atis.com/geojson/icons/metadata/icons.cameras.geojson
 * — the exact GeoJSON file sd511.org itself loads for its camera layer.
 * 40 sites carrying 173 camera views, verified live 2026-10-22 —
 * NO API KEY NEEDED.
 *
 * One catalogue record per camera VIEW: `properties.cameras[]` entries
 * each carry their own still (`…/camera_images/<SITE>/<view>/latest.jpg`),
 * and the view's `description` is the most precise name the feed offers.
 * Site coordinates are rounded to ~2–3 decimals on some records — that
 * is the precision SDDOT publishes.
 *
 * Added 2026-10-22 (DOT completion): the catalogue previously carried
 * ~101 South Dakota cameras (the harvest's sddot family).
 */

const FEED = 'https://sd.cdn.iteris-atis.com/geojson/icons/metadata/icons.cameras.geojson';

/** South Dakota bounding box — drops any stray/placeholder coordinates. */
const SD_BOUNDS = { minLat: 42.4, maxLat: 46.0, minLng: -104.2, maxLng: -96.3 };

export interface SdFeature {
  id?: string | null;
  geometry?: { coordinates?: [number, number] | null } | null;
  properties?: {
    name?: string | null;
    route?: string | null;
    cameras?: Array<{
      id?: string | null;
      name?: string | null;
      description?: string | null;
      image?: string | null;
    }> | null;
  } | null;
}

/** Map one GeoJSON site feature to one camera per view. Exported for tests. */
export function mapFeature(feature: SdFeature): CctvCamera[] {
  const siteId = feature?.id;
  const coords = feature?.geometry?.coordinates;
  if (!siteId || !coords) return [];

  const [lng, lat] = coords;
  if (typeof lat !== 'number' || typeof lng !== 'number') return [];
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return [];
  if (lat < SD_BOUNDS.minLat || lat > SD_BOUNDS.maxLat) return [];
  if (lng < SD_BOUNDS.minLng || lng > SD_BOUNDS.maxLng) return [];

  const siteName = (feature.properties?.name || siteId).trim();
  const views = feature.properties?.cameras || [];
  const out: CctvCamera[] = [];
  for (const view of views) {
    const url = view?.image?.trim() || '';
    if (!url || view?.id == null) continue;
    out.push({
      id: `sddot-${siteId}-${view.id}`,
      lat,
      lng,
      name: (view.description || view.name || siteName).trim(),
      city: siteName,
      country: 'US',
      feed_url: url,
      source: 'SDDOT SD511',
    });
  }
  return out;
}

async function loadSouthDakotaCameras(): Promise<CctvCamera[]> {
  const res = await stealthFetch(FEED, {
    signal: AbortSignal.timeout(20000),
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`SD511 HTTP ${res.status}`);

  const data = await res.json();
  const cams: CctvCamera[] = [];
  const seen = new Set<string>();
  for (const feature of (data?.features || []) as SdFeature[]) {
    for (const cam of mapFeature(feature)) {
      if (seen.has(cam.id)) continue;
      seen.add(cam.id);
      cams.push(cam);
    }
  }

  console.log(`[OSIRIS] South Dakota cameras — SDDOT SD511: ${cams.length}`);
  return cams;
}

export const fetchSouthDakotaCameras = cachedSource('southdakota', loadSouthDakotaCameras);
