import type { CctvCamera } from './types';
import { stealthFetch } from '@/lib/stealthFetch';
import { cachedSource } from '@/lib/sourceCache';

/**
 * OSIRIS — Finland CCTV Cameras (Fintraffic / Digitraffic)
 * Source: https://tie.digitraffic.fi/api/weathercam/v1/stations — the
 * official Digitraffic weathercam station list (GeoJSON), Fintraffic's
 * open-data service. NO API KEY, no contract: the data is distributed
 * under CC BY 4.0, attribution to Fintraffic / Digitraffic required —
 * carried here as the catalogue `source: 'Fintraffic'` label, which the
 * enterprise rights gate (src/lib/enterprise/rights.ts) maps to the
 * attribution "Fintraffic (Finland) via WorldEye". Registry verdict:
 * `digitraffic` / `fintraffic` in src/lib/camera-expansion/families.ts.
 *
 * One catalogue record per camera VIEW (preset): a station carries
 * 1–7 presets, each with its own still. The station-list payload gives
 * each preset's id and collection state; the still URL is the preset's
 * canonical Digitraffic URL (the same URL the per-station endpoint
 * publishes as the preset's `imageUrl`). Only the list endpoint is
 * polled — one request per refresh, not one per station.
 *
 * Coordinates are the API's own geometry, never geocoded. Stations the
 * API marks REMOVED_TEMPORARILY and presets it marks out of collection
 * (`inCollection: false`) are skipped — the Kentucky module's
 * offline-row convention.
 *
 * Rebuilt 2026-10-22 to the direct-agency standard (typed records,
 * exported mapper, cachedSource): the previous module served only each
 * station's first preset (~815 records) with no bounds/status checks.
 * Live at rebuild: 815 stations / 2,285 presets. Full probe + dedupe
 * accounting in REPORT.md.
 */

const FEED = 'https://tie.digitraffic.fi/api/weathercam/v1/stations';
const IMAGE_BASE = 'https://weathercam.digitraffic.fi';

/** Finland bounding box — drops any stray/placeholder coordinates.
 *  The API's own stations span lat 59.86–70.09, lng 19.62–31.28. */
const FI_BOUNDS = { minLat: 59.5, maxLat: 70.3, minLng: 19.0, maxLng: 31.6 };

/** Station states the API uses for cameras it has taken out of service. */
const REMOVED_STATUSES = new Set(['REMOVED_TEMPORARILY', 'REMOVED_PERMANENTLY']);

export interface DigitrafficPreset {
  id?: string | null;
  imageUrl?: string | null;
  presentationName?: string | null;
  inCollection?: boolean | null;
}

export interface DigitrafficFeature {
  id?: string | null;
  geometry?: { coordinates?: [number, number, ...number[]] | null } | null;
  properties?: {
    id?: string | null;
    name?: string | null;
    municipality?: string | null;
    names?: { fi?: string | null; sv?: string | null; en?: string | null } | null;
    collectionStatus?: string | null;
    presets?: DigitrafficPreset[] | null;
  } | null;
}

/** The canonical still URL for one preset (matches the API's own imageUrl). */
export function digitrafficImageUrl(presetId: string): string {
  return `${IMAGE_BASE}/${presetId}.jpg`;
}

/** `kt51_Inkoo` → `kt51 Inkoo` — the list payload's compact station name. */
function prettifyListName(name: string): string {
  return name.replace(/_/g, ' ').trim();
}

/** Map one station feature to one camera per in-collection preset. Exported for tests. */
export function mapFeature(feature: DigitrafficFeature): CctvCamera[] {
  const props = feature?.properties;
  const stationId = feature?.id || props?.id;
  if (!stationId || !props) return [];
  if (props.collectionStatus && REMOVED_STATUSES.has(props.collectionStatus)) return [];

  const coords = feature.geometry?.coordinates;
  if (!coords || coords.length < 2) return [];
  const [lng, lat] = coords;
  if (typeof lat !== 'number' || typeof lng !== 'number') return [];
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return [];
  if (lat < FI_BOUNDS.minLat || lat > FI_BOUNDS.maxLat) return [];
  if (lng < FI_BOUNDS.minLng || lng > FI_BOUNDS.maxLng) return [];

  const stationName = (
    props.names?.en ||
    props.names?.fi ||
    (props.name ? prettifyListName(props.name) : '') ||
    `Finland Weathercam ${stationId}`
  ).trim();
  const city = (props.municipality || 'Finland').trim();

  const out: CctvCamera[] = [];
  for (const preset of props.presets || []) {
    if (!preset?.id || preset.inCollection === false) continue;
    const imageUrl = preset.imageUrl?.trim() || digitrafficImageUrl(preset.id);
    if (!imageUrl.startsWith('http')) continue;
    const view = preset.presentationName?.trim();
    out.push({
      id: `fin-${preset.id}`,
      lat,
      lng,
      name: view ? `${stationName} (${view})` : stationName,
      city,
      country: 'Finland',
      feed_url: imageUrl,
      source: 'Fintraffic',
    });
  }
  return out;
}

async function loadFinlandCameras(): Promise<CctvCamera[]> {
  const res = await stealthFetch(FEED, {
    signal: AbortSignal.timeout(20000),
    headers: { Accept: 'application/json', 'Digitraffic-User': 'WorldEye/1.0 (worldeye.app)' },
  });
  if (!res.ok) throw new Error(`Digitraffic weathercam HTTP ${res.status}`);

  const data = await res.json();
  const features = (data?.features || []) as DigitrafficFeature[];

  const cams: CctvCamera[] = [];
  const seen = new Set<string>();
  for (const feature of features) {
    for (const cam of mapFeature(feature)) {
      if (seen.has(cam.id)) continue;
      seen.add(cam.id);
      cams.push(cam);
    }
  }

  console.log(`[OSIRIS] Finland cameras — Fintraffic Digitraffic: ${cams.length}`);
  return cams;
}

export const fetchFinlandCameras = cachedSource('finland', loadFinlandCameras);
