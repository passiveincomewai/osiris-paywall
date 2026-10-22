import type { CctvCamera } from './types';
import { stealthFetch } from '@/lib/stealthFetch';
import { cachedSource } from '@/lib/sourceCache';

/**
 * OSIRIS — Kentucky CCTV Cameras (KYTC + Lexington LFUCG)
 * Sources — the two ArcGIS layers GoKY (goky.ky.gov) itself loads:
 *   · KYTC `trafficCamerasCur_Prd` FeatureServer — 256 records statewide
 *     (247 in Kentucky, 9 border cameras), still URL per record.
 *   · LFUCG `Traffic_Camera_Locations_Public_view` — 108 Lexington
 *     cameras, Wowza thumbnail stills.
 * Both keyless, verified live 2026-10-22 — NO API KEY NEEDED.
 *
 * KYTC rows carry a `status`; the one row marked Offline is skipped.
 * Nine rows have no state: TRIMARC cameras on the Indiana shore of the
 * Louisville metro (I-65/I-64 corridor), which KYTC publishes as part
 * of the Louisville network — the bounding box below deliberately
 * includes that shore, so they are kept as published.
 *
 * Added 2026-10-22 (DOT completion): the catalogue previously carried
 * ~159 Kentucky cameras.
 */

const KYTC_LAYER =
  'https://services2.arcgis.com/CcI36Pduqd0OR4W9/ArcGIS/rest/services/trafficCamerasCur_Prd/FeatureServer/0/query';
const LEX_LAYER =
  'https://services1.arcgis.com/Mg7DLdfYcSWIaDnu/ArcGIS/rest/services/Traffic_Camera_Locations_Public_view/FeatureServer/0/query';

/** Kentucky bounding box — drops any stray/placeholder coordinates. */
const KY_BOUNDS = { minLat: 36.4, maxLat: 39.3, minLng: -89.7, maxLng: -81.8 };

export interface KytcFeature {
  attributes?: {
    OBJECTID?: number | null;
    description?: string | null;
    name?: string | null;
    snapshot?: string | null;
    status?: string | null;
    county?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  } | null;
}

export interface LexFeature {
  attributes?: {
    objectid?: number | null;
    location?: string | null;
    still_url?: string | null;
  } | null;
  geometry?: { x?: number | null; y?: number | null } | null;
}

function inBounds(lat: number, lng: number): boolean {
  return lat >= KY_BOUNDS.minLat && lat <= KY_BOUNDS.maxLat && lng >= KY_BOUNDS.minLng && lng <= KY_BOUNDS.maxLng;
}

/** Map one KYTC feature to a camera, or null if unusable. Exported for tests. */
export function mapKytcFeature(feature: KytcFeature): CctvCamera | null {
  const a = feature?.attributes;
  if (!a || a.OBJECTID == null) return null;
  if ((a.status || '').toLowerCase() === 'offline') return null;

  const url = a.snapshot?.trim() || '';
  if (!url) return null;

  const lat = a.latitude;
  const lng = a.longitude;
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !inBounds(lat, lng)) return null;

  return {
    id: `kytc-${a.OBJECTID}`,
    lat,
    lng,
    name: (a.description || a.name || `KYTC Camera ${a.OBJECTID}`).trim(),
    city: (a.county || 'Kentucky').trim(),
    country: 'US',
    feed_url: url,
    source: 'KYTC GoKY',
  };
}

/** Map one Lexington (LFUCG) feature to a camera, or null. Exported for tests. */
export function mapLexFeature(feature: LexFeature): CctvCamera | null {
  const a = feature?.attributes;
  if (!a || a.objectid == null) return null;

  const url = a.still_url?.trim() || '';
  if (!url) return null;

  const lng = feature.geometry?.x;
  const lat = feature.geometry?.y;
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !inBounds(lat, lng)) return null;

  return {
    id: `lexky-${a.objectid}`,
    lat,
    lng,
    name: (a.location || `Lexington Camera ${a.objectid}`).trim(),
    city: 'Lexington',
    country: 'US',
    feed_url: url,
    source: 'LFUCG Lexington',
  };
}

async function fetchArcGis(url: string): Promise<unknown> {
  const res = await stealthFetch(url, {
    signal: AbortSignal.timeout(20000),
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`Kentucky ArcGIS HTTP ${res.status}`);
  return res.json();
}

async function loadKentuckyCameras(): Promise<CctvCamera[]> {
  const kytcQuery = new URLSearchParams({
    where: '1=1',
    outFields: 'OBJECTID,description,name,snapshot,status,county,latitude,longitude',
    returnGeometry: 'false',
    f: 'json',
  });
  const lexQuery = new URLSearchParams({
    where: '1=1',
    outFields: 'objectid,location,still_url',
    outSR: '4326',
    f: 'json',
  });

  const [kytcData, lexData] = await Promise.all([
    fetchArcGis(`${KYTC_LAYER}?${kytcQuery}`),
    fetchArcGis(`${LEX_LAYER}?${lexQuery}`),
  ]);

  const cams: CctvCamera[] = [];
  const seen = new Set<string>();
  const push = (cam: CctvCamera | null) => {
    if (!cam || seen.has(cam.id)) return;
    seen.add(cam.id);
    cams.push(cam);
  };
  for (const f of ((kytcData as { features?: KytcFeature[] })?.features || [])) push(mapKytcFeature(f));
  for (const f of ((lexData as { features?: LexFeature[] })?.features || [])) push(mapLexFeature(f));

  console.log(`[OSIRIS] Kentucky cameras — KYTC + LFUCG: ${cams.length}`);
  return cams;
}

export const fetchKentuckyCameras = cachedSource('kentucky', loadKentuckyCameras);
