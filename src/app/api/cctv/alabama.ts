import type { CctvCamera } from './types';
import { stealthFetch } from '@/lib/stealthFetch';
import { cachedSource } from '@/lib/sourceCache';

/**
 * OSIRIS — Alabama CCTV Cameras (ALDOT ALGO Traffic)
 * Source: https://api.algotraffic.com/v4.0/Cameras?includeGeometry=true —
 * the public GeoJSON feed behind ALGO Traffic (algotraffic.com), the Alabama
 * Department of Transportation's official traveller platform, built for
 * ALDOT/ALEA by the Center for Advanced Public Safety (University of
 * Alabama). NO API KEY NEEDED — the web app reads the same endpoint
 * anonymously.
 *
 * The feed lists 647 cameras statewide; 638 carry accessLevel "Public"
 * (the rest are FirstResponder / ALDOT / Hidden and are dropped here).
 * Every public camera gives both a refreshing snapshot
 * (`/v4/Cameras/{id}/snapshot.jpg`) and a Wowza HLS playlist
 * (`playbackUrls.hls`), plus a permLink back to the camera on
 * algotraffic.com.
 */

const FEED = 'https://api.algotraffic.com/v4.0/Cameras?includeGeometry=true';

/** Alabama bounding box — drops any stray/placeholder coordinates. */
const AL_BOUNDS = { minLat: 30.1, maxLat: 35.1, minLng: -88.5, maxLng: -84.8 };

export interface AlgoLocation {
  city?: string | null;
  displayRouteDesignator?: string | null;
  routeDesignator?: string | null;
  displayCrossStreet?: string | null;
}

export interface AlgoFeature {
  type?: string | null;
  geometry?: { type?: string | null; coordinates?: [number, number] } | null;
  properties?: {
    id?: number | null;
    accessLevel?: string | null;
    location?: AlgoLocation | null;
    playbackUrls?: { hls?: string | null; dash?: string | null } | null;
    snapshotImageUrl?: string | null;
    permLink?: string | null;
  } | null;
}

/**
 * ALGO names a camera by route and cross street: `I-10` + `McDonald Rd`
 * reads `I-10 at McDonald Rd`. The raw `crossStreet` field is "Unknown"
 * for most cameras while `displayCrossStreet` carries the real label, so
 * the display fields are the ones used. A cross street that repeats the
 * route (same-interchange records) is not doubled.
 */
export function cameraName(loc: AlgoLocation | null | undefined, id: number): string {
  const route = (loc?.displayRouteDesignator || loc?.routeDesignator || '').trim();
  const cross = (loc?.displayCrossStreet || '').trim();
  if (route && cross && cross.toLowerCase() !== 'unknown' && cross !== route) {
    return `${route} at ${cross}`;
  }
  return route || cross || `ALDOT Camera ${id}`;
}

/** Map one GeoJSON feature to a camera, or null if unusable. Exported for tests. */
export function mapFeature(f: AlgoFeature): CctvCamera | null {
  const p = f?.properties;
  if (!p || p.id == null || !Number.isFinite(p.id)) return null;

  /* The feed also carries responder-only and hidden cameras; only the
     ones ALGO shows the public belong on a public map. */
  if (p.accessLevel !== 'Public') return null;

  const coords = f.geometry?.coordinates;
  if (!coords) return null;
  const [lng, lat] = coords;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < AL_BOUNDS.minLat || lat > AL_BOUNDS.maxLat) return null;
  if (lng < AL_BOUNDS.minLng || lng > AL_BOUNDS.maxLng) return null;

  const feedUrl = p.snapshotImageUrl || undefined;
  const streamUrl = p.playbackUrls?.hls || undefined;
  if (!feedUrl && !streamUrl) return null;

  const cam: CctvCamera = {
    id: `aldot-${p.id}`,
    lat,
    lng,
    name: cameraName(p.location, p.id),
    city: p.location?.city || 'Alabama',
    country: 'US',
    source: 'ALDOT ALGO Traffic',
    external_url: p.permLink || `https://www.algotraffic.com?cameraId=${p.id}`,
  };
  if (feedUrl) cam.feed_url = feedUrl;
  if (streamUrl) {
    cam.stream_url = streamUrl;
    cam.stream_type = 'hls';
  }
  return cam;
}

async function loadAlabamaCameras(): Promise<CctvCamera[]> {
  const res = await stealthFetch(FEED, {
    signal: AbortSignal.timeout(20000),
    headers: { Accept: 'application/geo+json', Referer: 'https://algotraffic.com/' },
  });
  if (!res.ok) throw new Error(`ALGO Traffic HTTP ${res.status}`);

  const json = await res.json();
  const feats = json?.features;
  if (!Array.isArray(feats)) throw new Error('ALGO Traffic returned no features');

  const cams: CctvCamera[] = [];
  const seen = new Set<string>();
  for (const f of feats) {
    const cam = mapFeature(f);
    if (!cam || seen.has(cam.id)) continue;
    seen.add(cam.id);
    cams.push(cam);
  }

  console.log(`[OSIRIS] Alabama cameras — ALDOT ALGO Traffic: ${cams.length}`);
  return cams;
}

export const fetchAlabamaCameras = cachedSource('alabama', loadAlabamaCameras);
