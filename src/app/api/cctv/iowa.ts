import type { CctvCamera } from './types';
import { stealthFetch } from '@/lib/stealthFetch';
import { cachedSource } from '@/lib/sourceCache';

/**
 * OSIRIS — Iowa CCTV Cameras (Iowa DOT)
 * Source: Iowa DOT's ArcGIS Online org, layer `Traffic_Cameras_View`
 * (FeatureServer/0) — the same inventory 511ia.org publishes.
 * ~1,264 camera views across ~865 sites — NO API KEY NEEDED.
 *
 * One record per camera VIEW: each carries a still (`ImageURL`) and an
 * HLS playlist (`VideoURL`), so both are mapped — the still feeds the
 * preview tiles, the playlist the viewer. Records are paged by FID; the
 * service caps one answer at 1,000 (maxRecordCount) and flags overflow
 * with exceededTransferLimit, which is what the loop follows.
 *
 * Added 2026-10-22 (DOT completion): the OpenCCTV harvest's arcgis_cams
 * family carried only ~121 of these; this module is the direct channel.
 */

const LAYER =
  'https://services.arcgis.com/8lRhdTsQyJpO52F1/arcgis/rest/services/Traffic_Cameras_View/FeatureServer/0/query';

/** Iowa bounding box — drops any stray/placeholder coordinates. */
const IA_BOUNDS = { minLat: 40.3, maxLat: 43.6, minLng: -96.7, maxLng: -89.9 };

const PAGE = 1000;

export interface IowaDotFeature {
  attributes?: {
    device_id?: number | null;
    COMMON_ID?: string | null;
    Desc_?: string | null;
    ImageName?: string | null;
    ImageURL?: string | null;
    VideoURL?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    REGION?: string | null;
  } | null;
}

/** Map one ArcGIS feature (one camera view) to a camera, or null. Exported for tests. */
export function mapFeature(feature: IowaDotFeature): CctvCamera | null {
  const a = feature?.attributes;
  if (!a || a.device_id == null) return null;

  const lat = a.latitude;
  const lng = a.longitude;
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < IA_BOUNDS.minLat || lat > IA_BOUNDS.maxLat) return null;
  if (lng < IA_BOUNDS.minLng || lng > IA_BOUNDS.maxLng) return null;

  const image = a.ImageURL?.trim() || '';
  const video = a.VideoURL?.trim() || '';
  if (!image && !video) return null;

  return {
    id: `iadot-${a.device_id}`,
    lat,
    lng,
    name: (a.Desc_ || a.ImageName || `Iowa DOT Camera ${a.device_id}`).trim(),
    city: (a.REGION || 'Iowa').trim(),
    country: 'US',
    ...(image ? { feed_url: image } : {}),
    ...(video ? { stream_url: video, stream_type: 'hls' as const } : {}),
    source: 'Iowa DOT',
  };
}

async function loadIowaCameras(): Promise<CctvCamera[]> {
  const cams: CctvCamera[] = [];
  const seen = new Set<string>();

  for (let page = 0; page < 5; page++) {
    const query = new URLSearchParams({
      where: '1=1',
      outFields: 'device_id,COMMON_ID,Desc_,ImageName,ImageURL,VideoURL,latitude,longitude,REGION',
      f: 'json',
      orderByFields: 'FID',
      resultRecordCount: String(PAGE),
      resultOffset: String(page * PAGE),
    });
    const res = await stealthFetch(`${LAYER}?${query}`, {
      signal: AbortSignal.timeout(20000),
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`Iowa DOT ArcGIS HTTP ${res.status}`);

    const data = await res.json();
    for (const feature of (data?.features || []) as IowaDotFeature[]) {
      const cam = mapFeature(feature);
      if (!cam || seen.has(cam.id)) continue;
      seen.add(cam.id);
      cams.push(cam);
    }
    if (!data?.exceededTransferLimit) break;
  }

  console.log(`[OSIRIS] Iowa cameras — Iowa DOT: ${cams.length}`);
  return cams;
}

export const fetchIowaCameras = cachedSource('iowa', loadIowaCameras);
