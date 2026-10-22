import type { CctvCamera } from './types';
import { stealthFetch } from '@/lib/stealthFetch';
import { cachedSource } from '@/lib/sourceCache';

/**
 * OSIRIS — New Mexico CCTV Cameras (NMDOT / NMRoads)
 * Source: https://nmroads.com — NMDOT's official traveller-information site
 * Data endpoint: https://servicev5.nmroads.com/RealMapWAR/GetCameraInfo
 * 185 enabled statewide traffic cameras — NO API KEY NEEDED.
 *
 * The NMRoads map reads its whole camera layer from that one JSON document:
 * every record carries its title, coordinates, region grouping and the
 * address of a refreshing JPEG still on `ss.nmroads.com`. That is what this
 * reads, live, the same way the site's own `getCameraInfoV4` does.
 *
 * Why this clears as a direct agency module: the harvest's `nmroads` family
 * is these same NMDOT cameras via the OpenCCTV aggregator, and the registry
 * already clears that family as an agency family. 145 of the 185 records here
 * are byte-for-byte the harvest's cameras (identical snapshot URLs), so this
 * module SUPERSEDES those harvest records — the coordinator drops the matched
 * `occ-nmroads-*` ids from the harvest file so nothing is served twice. The
 * remaining 40 are agency-listed cameras the aggregator never carried, or the
 * opposite-carriageway counterpart of one it did.
 *
 * There is no browser-playable video to take: the feed's only stream fields
 * point at an RTMP server (`rtmp://video.nmroads.com/nmroads` plus a
 * `*.stream` file per camera), which no web player can open. The site itself
 * shows the still (through its GetCameraImage proxy), so these come up as
 * snapshot cameras rather than video tiles.
 */

const FEED = 'https://servicev5.nmroads.com/RealMapWAR/GetCameraInfo';

/** New Mexico bounding box — drops any stray/placeholder coordinates. */
const NM_BOUNDS = { minLat: 31.3, maxLat: 37.1, minLng: -109.1, maxLng: -102.9 };

/** One record from GetCameraInfo's `cameraInfo` array (only fields we consume). */
export interface NmroadsCameraRecord {
  name?: string | null;
  title?: string | null;
  lat?: number | null;
  lon?: number | null;
  grouping?: string | null;
  snapshotFile?: string | null;
  enabled?: boolean | null;
  mobile?: boolean | null;
}

/** Map one GetCameraInfo record to a camera, or null if unusable. Exported for tests. */
export function mapCamera(rec: NmroadsCameraRecord): CctvCamera | null {
  if (!rec || rec.enabled === false) return null;

  const slug = rec.name?.trim();
  if (!slug) return null;

  const lat = rec.lat;
  const lng = rec.lon;
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < NM_BOUNDS.minLat || lat > NM_BOUNDS.maxLat) return null;
  if (lng < NM_BOUNDS.minLng || lng > NM_BOUNDS.maxLng) return null;

  const feed = rec.snapshotFile?.trim();
  if (!feed || !/^https?:\/\//i.test(feed)) return null;

  return {
    id: `nmdot-${slug}`,
    lat,
    lng,
    name: rec.title?.trim() || `NMDOT Camera ${slug}`,
    city: rec.grouping?.trim() || 'New Mexico',
    country: 'US',
    feed_url: feed,
    source: 'New Mexico DOT',
  };
}

async function loadNewMexicoCameras(): Promise<CctvCamera[]> {
  const res = await stealthFetch(FEED, {
    signal: AbortSignal.timeout(20000),
    headers: { Accept: 'application/json', Referer: 'https://nmroads.com/' },
  });
  if (!res.ok) throw new Error(`NMRoads HTTP ${res.status}`);

  const json = await res.json();
  const records = json?.cameraInfo;
  if (!Array.isArray(records)) throw new Error('NMRoads returned no cameraInfo');

  const cams: CctvCamera[] = [];
  const seen = new Set<string>();
  for (const rec of records) {
    const cam = mapCamera(rec);
    if (!cam || seen.has(cam.id)) continue;
    seen.add(cam.id);
    cams.push(cam);
  }

  console.log(`[OSIRIS] New Mexico cameras — New Mexico DOT / NMRoads: ${cams.length}`);
  return cams;
}

export const fetchNewMexicoCameras = cachedSource('newmexico', loadNewMexicoCameras);
