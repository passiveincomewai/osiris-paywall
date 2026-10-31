import type { CctvCamera } from './types';
import { stealthFetch } from '@/lib/stealthFetch';
import { cachedSource } from '@/lib/sourceCache';
import { parseCompassDirection } from '@/lib/compass';

/**
 * OSIRIS — FAA WeatherCams (weathercams.faa.gov)
 *
 * The FAA's public weather-camera network: ~980 sites (airports, mountain
 * passes, remote strips) carrying ~3,500 cameras across the US and Canada —
 * a network no DOT index publishes, which is why the camera-expansion audit
 * found it almost entirely absent from the catalogue.
 *
 * The site's own API is the source. One call returns every site with its
 * cameras embedded:
 *   GET https://weathercams.faa.gov/api/sites?zoom=3&bounds=-60,-180|75,180
 * The API refuses headerless callers (401) — it expects the Referer of the
 * site it was built for, so the fetch sends it.
 *
 * Images are the wrinkle: the FAA serves each frame from a timestamped URL
 * (…/webimages/<site>/<profile>/<camera>-<epoch-ms>.jpg) with no stable
 * "latest" alias, so a frame baked into the catalogue would freeze at fetch
 * time. Instead each record's feed_url points at our own resolver,
 * /api/cctv/faa-image/<cameraId>, which asks the FAA for the camera's
 * current frame and redirects to it — the same indirection the catalogue
 * already uses for Skyline/YouTube records (/api/cctv/resolve), applied to
 * stills. Only cameras somebody actually opens cost an upstream call.
 */

const SITES_URL = 'https://weathercams.faa.gov/api/sites?zoom=3&bounds=-60,-180|75,180';
const FAA_REFERER = 'https://weathercams.faa.gov/';

/** One camera as embedded in a site record. Only the fields we consume. */
export interface FaaCamera {
  cameraId?: number;
  cameraName?: string | null;
  cameraDirection?: string | null;
  cameraOutOfOrder?: boolean;
  latitude?: number;
  longitude?: number;
}

/** One site from /api/sites. Only the fields we consume. */
export interface FaaSite {
  siteId?: number;
  siteName?: string | null;
  siteArea?: string | null;
  siteActive?: boolean;
  country?: string | null;
  state?: string | null;
  latitude?: number;
  longitude?: number;
  cameras?: FaaCamera[];
}

/** The resolver URL a camera's still is served through. */
export function faaImagePath(cameraId: number): string {
  return `/api/cctv/faa-image/${cameraId}`;
}

/** The FAA endpoint that names a camera's most recent frame. */
export function faaLastImageUrl(cameraId: number): string {
  return `https://weathercams.faa.gov/api/cameras/${cameraId}/images/last/1`;
}

/** Pull the current frame URL out of an /images/last/1 response, or null. */
export function parseFaaLastImage(data: unknown): string | null {
  const payload = (data as { payload?: unknown })?.payload;
  if (!Array.isArray(payload) || !payload.length) return null;
  const uri = (payload[0] as { imageUri?: unknown })?.imageUri;
  return typeof uri === 'string' && uri.startsWith('https://') ? uri : null;
}

/**
 * Map one site (with its embedded cameras) to catalogue records.
 * Skips inactive sites, out-of-order cameras, and anything without a
 * usable position (a camera's own coordinates win; the site's are the
 * fallback — for most sites they are the same point). Exported for tests.
 */
export function mapSite(site: FaaSite): CctvCamera[] {
  if (!site || site.siteActive === false) return [];
  const siteName = (site.siteName || site.siteArea || 'FAA Weather Camera').trim();
  const country = site.country === 'CA' ? 'Canada' : 'US';
  const city = (site.siteArea || site.state || siteName).trim();

  const cams: CctvCamera[] = [];
  for (const cam of site.cameras || []) {
    if (cam.cameraId == null || cam.cameraOutOfOrder) continue;
    const lat = Number.isFinite(cam.latitude) ? cam.latitude : site.latitude;
    const lng = Number.isFinite(cam.longitude) ? cam.longitude : site.longitude;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    if (lat === 0 && lng === 0) continue;

    const camName = (cam.cameraName || 'Camera').trim();
    const direction = cam.cameraDirection?.trim();
    // The FAA publishes the direction each camera faces as a compass
    // point; carry it as a bearing so the map can draw the facing cone.
    // A value that is not a compass point stays unset — no direction is
    // ever guessed for a camera whose source did not state one.
    const heading = parseCompassDirection(cam.cameraDirection);
    cams.push({
      id: `faa-${cam.cameraId}`,
      lat: lat!,
      lng: lng!,
      ...(heading !== null ? { heading_deg: heading, heading_source: 'faa' as const } : {}),
      name: direction ? `${siteName} — ${camName} (${direction})` : `${siteName} — ${camName}`,
      city,
      country,
      feed_url: faaImagePath(cam.cameraId),
      stream_type: 'jpg',
      source: 'FAA WeatherCams',
    });
  }
  return cams;
}

async function loadFaaCameras(): Promise<CctvCamera[]> {
  const res = await stealthFetch(SITES_URL, {
    signal: AbortSignal.timeout(20000),
    headers: { Referer: FAA_REFERER, Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`FAA WeatherCams HTTP ${res.status}`);

  const data = await res.json();
  const sites: FaaSite[] = Array.isArray(data?.payload) ? data.payload : [];
  const cams: CctvCamera[] = [];
  const seen = new Set<string>();
  for (const site of sites) {
    for (const cam of mapSite(site)) {
      if (seen.has(cam.id)) continue;
      seen.add(cam.id);
      cams.push(cam);
    }
  }

  console.log(`[OSIRIS] FAA cameras — FAA WeatherCams: ${cams.length} from ${sites.length} sites`);
  return cams;
}

export const fetchFaaCameras = cachedSource('faa', loadFaaCameras);
