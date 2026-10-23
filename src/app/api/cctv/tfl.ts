import type { CctvCamera } from './types';
import { stealthFetch } from '@/lib/stealthFetch';
import { cachedSource } from '@/lib/sourceCache';
import { TFL_STAGED_CAMERAS } from './tfl-staged.generated';

/**
 * OSIRIS — London CCTV Cameras (Transport for London JamCams)
 * Source: TfL Unified API — GET https://api.tfl.gov.uk/Place/Type/JamCam
 * ~890 JamCams across Greater London, each carrying its own lat/lon and
 * image/clip URLs in the API response — coordinates are the API's own,
 * never derived or invented here.
 *
 * Access: the API answers anonymously at 50 requests/minute, which is
 * this module's working path (the index is cached, so one fetch per TTL
 * is all it ever makes). If TFL_APP_KEY is set in the environment — the
 * subscription key issued when the owner subscribes to the standard
 * product in the TfL API portal (500 requests/minute) — it is appended
 * as `app_key`. No key is ever hardcoded.
 *
 * Terms: TfL open data, released under terms modelled on the UK Open
 * Government Licence — usable commercially with attribution ("TfL" is
 * the source label on every record); WorldEye must not present itself
 * as an official TfL product. Registry verdict: families.ts `tfl` CLEAR.
 *
 * Fallback: if the API is unreachable at network level (DNS/connect/
 * timeout — an HTTP error status is an upstream decision and does NOT
 * trigger this), the module serves TFL_STAGED_CAMERAS, the generation-
 * time probe-verified snapshot produced by tools/harvest-tfl.ts, so
 * London does not go dark on an egress blip (Hong Kong precedent).
 */

const PLACES_URL = 'https://api.tfl.gov.uk/Place/Type/JamCam';
const IMAGE_HOST = 'https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk';

/** Greater London bounding box — drops any stray/placeholder coordinates. */
export const LONDON_BOUNDS = { minLat: 51.2, maxLat: 51.8, minLng: -0.6, maxLng: 0.35 };

/** One place from GET /Place/Type/JamCam (only the fields we consume). */
export interface TfLPlace {
  id?: string | null;
  commonName?: string | null;
  lat?: number | null;
  lon?: number | null;
  additionalProperties?: Array<{ key?: string | null; value?: string | null }> | null;
}

function prop(place: TfLPlace, key: string): string | undefined {
  const hit = place.additionalProperties?.find(p => p?.key === key);
  const value = hit?.value?.trim();
  return value ? value : undefined;
}

function isHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export type TfLSkipReason =
  | 'missing-id'
  | 'unavailable'
  | 'invalid-coordinates'
  | 'invalid-feed';

/**
 * Map one JamCam place to a catalogue camera, or say why it is skipped.
 * Exported for tests and for the generation-time staging tool
 * (tools/harvest-tfl.ts), which accounts every record it inspects.
 *
 * A place TfL itself marks `available: "false"` is skipped — mirroring
 * the Kentucky module's handling of KYTC's Offline record. Where the
 * API omits imageUrl, the still's URL is derived from the place's own
 * id (every JamCam id's suffix is its S3 file stem — the same pattern
 * the Finland module uses for Digitraffic presets); the clip URL is
 * only ever taken from the API, never derived.
 */
export function classifyJamCam(
  place: TfLPlace,
): { ok: true; camera: CctvCamera } | { ok: false; reason: TfLSkipReason } {
  const upstreamId = place?.id?.trim();
  if (!upstreamId) return { ok: false, reason: 'missing-id' };

  if (prop(place, 'available') === 'false') return { ok: false, reason: 'unavailable' };

  const lat = place.lat;
  const lng = place.lon;
  if (typeof lat !== 'number' || typeof lng !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { ok: false, reason: 'invalid-coordinates' };
  }
  if (lat < LONDON_BOUNDS.minLat || lat > LONDON_BOUNDS.maxLat || lng < LONDON_BOUNDS.minLng || lng > LONDON_BOUNDS.maxLng) {
    return { ok: false, reason: 'invalid-coordinates' };
  }

  const imageUrl = prop(place, 'imageUrl');
  let feedUrl: string;
  if (imageUrl) {
    if (!isHttpUrl(imageUrl)) return { ok: false, reason: 'invalid-feed' };
    feedUrl = imageUrl;
  } else {
    feedUrl = `${IMAGE_HOST}/${upstreamId.replace(/^JamCams_/, '')}.jpg`;
  }

  const videoUrl = prop(place, 'videoUrl');
  const camera: CctvCamera = {
    id: `tfl-${upstreamId}`,
    lat,
    lng,
    name: place.commonName?.trim() || 'London JamCam',
    city: 'London',
    country: 'UK',
    feed_url: feedUrl,
    ...(videoUrl && isHttpUrl(videoUrl) ? { stream_url: videoUrl, stream_type: 'mp4' as const } : {}),
    source: 'TfL',
  };
  return { ok: true, camera };
}

/** Map one JamCam place to a catalogue camera, or null when skipped. */
export function mapJamCam(place: TfLPlace): CctvCamera | null {
  const result = classifyJamCam(place);
  return result.ok ? result.camera : null;
}

/** Map a whole /Place/Type/JamCam response, de-duplicated by camera id. */
export function parseTfLPlaces(data: unknown): CctvCamera[] {
  if (!Array.isArray(data)) return [];
  const cams: CctvCamera[] = [];
  const seen = new Set<string>();
  for (const place of data as TfLPlace[]) {
    const camera = mapJamCam(place);
    if (!camera || seen.has(camera.id)) continue;
    seen.add(camera.id);
    cams.push(camera);
  }
  return cams;
}

/**
 * The request URL for the JamCam index. Appends the subscription key
 * only when TFL_APP_KEY is set in the environment — anonymous access
 * (50 req/min) is the default working path.
 */
export function tflPlacesUrl(env: Record<string, string | undefined> = process.env): string {
  const key = env.TFL_APP_KEY?.trim();
  return key ? `${PLACES_URL}?app_key=${encodeURIComponent(key)}` : PLACES_URL;
}

async function loadTfLCameras(): Promise<CctvCamera[]> {
  let res: Response;
  try {
    res = await stealthFetch(tflPlacesUrl(), {
      signal: AbortSignal.timeout(12000),
      headers: { Accept: 'application/json' },
    });
  } catch (error) {
    /* Network-level failure only: serve the probe-verified staged
       generation rather than dropping London from the catalogue. An
       HTTP error status falls through to the throw below instead —
       that is an upstream decision, and the caches treat it as one. */
    if (TFL_STAGED_CAMERAS.length) {
      console.warn(
        `[OSIRIS] TfL API unreachable (${error instanceof Error ? error.message : error}) — serving ${TFL_STAGED_CAMERAS.length} staged JamCams`,
      );
      return TFL_STAGED_CAMERAS;
    }
    throw error;
  }
  if (!res.ok) throw new Error(`TfL HTTP ${res.status}`);

  const data: unknown = await res.json();
  if (!Array.isArray(data)) throw new Error('TfL returned no JamCam array');

  const cams = parseTfLPlaces(data);
  console.log(`[OSIRIS] London cameras — TfL JamCams: ${cams.length} of ${data.length} places`);
  return cams;
}

const cachedTfLCameras = cachedSource('tfl', loadTfLCameras);

export async function fetchTfLCameras(): Promise<CctvCamera[]> {
  return cachedTfLCameras();
}
