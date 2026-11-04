/**
 * OSIRIS — nearest-camera search over the globe's loaded camera index.
 *
 * ONE implementation, shared by every "cameras near X" surface: the traffic
 * road-click popup, the aircraft popup ("cameras near this aircraft") and
 * the region dossier ("cameras near here"). Before this module the search
 * lived inline in the traffic popup; the other surfaces now call the same
 * code instead of growing copies that could drift apart.
 *
 * The search runs over cameras ALREADY loaded on the client (the cctv map
 * source, falling back to the page's camera catalogue). It creates no camera
 * records and changes no access rules — opening a result goes through the
 * same onEntityClick → CameraViewer path (and the same free-camera gate)
 * as clicking a camera pin.
 */
import { CAMERA_SEARCH_MAX, CAMERA_SEARCH_RADIUS_M } from '@/lib/traffic/config';
import { haversineM } from '@/lib/traffic/roads';

/** The fields a nearby-camera result carries into the shared viewer. */
export interface CameraCandidate {
  id: unknown;
  name?: string;
  city?: string;
  country?: string;
  source?: string;
  feed_url?: string;
  stream_url?: string;
  stream_type?: string;
  external_url?: string;
  /** Facing direction in degrees: source-published ('faa'), stated in
      the camera's name by its source ('name-derived'), or a road-derived
      estimate ('road-derived') — see heading_source. */
  heading_deg?: number;
  heading_source?: 'faa' | 'name-derived' | 'road-derived';
  lat: number;
  lng: number;
}

export interface NearbyCamera {
  camera: CameraCandidate;
  distanceM: number;
}

/** Normalise one rendered cctv source feature into a candidate. */
export function cameraCandidateFromFeature(properties: any, coordinates: unknown): CameraCandidate | null {
  const p = properties ?? {};
  if (p.id == null || !Array.isArray(coordinates)) return null;
  const [lng, lat] = coordinates as [number, number];
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;
  return {
    id: p.id, name: p.name, city: p.city, country: p.country, source: p.source,
    feed_url: p.feed_url, stream_url: p.stream_url, stream_type: p.stream_type,
    external_url: p.external_url,
    heading_deg: typeof p.heading_deg === 'number' ? p.heading_deg : undefined,
    heading_source: typeof p.heading_source === 'string' ? p.heading_source : undefined,
    lat, lng,
  };
}

/**
 * Build the candidate list: rendered cctv features first (deduped by id);
 * when the source has nothing yet, fall back to the page's camera catalogue
 * (same fallback order the traffic popup originally used).
 */
export function collectCameraCandidates(features: any[], fallbackCameras: any[] | undefined): CameraCandidate[] {
  const byId = new Map<string, CameraCandidate>();
  for (const f of features ?? []) {
    const cand = cameraCandidateFromFeature(f?.properties, (f?.geometry as any)?.coordinates);
    if (cand) byId.set(String(cand.id), cand);
  }
  if (!byId.size && Array.isArray(fallbackCameras)) {
    for (const c of fallbackCameras) {
      if (c?.id != null && typeof c.lat === 'number') byId.set(String(c.id), c as CameraCandidate);
    }
  }
  return [...byId.values()];
}

/**
 * Cameras within `radiusM` of a [lng, lat] point, nearest first, capped at
 * `max`. Records without usable coordinates produce NaN distances and are
 * filtered out — a camera we cannot place is never reported as "near".
 */
export function findNearestCameras(
  cameras: Array<CameraCandidate | any>,
  at: [number, number],
  opts: { radiusM?: number; max?: number } = {},
): NearbyCamera[] {
  const radiusM = opts.radiusM ?? CAMERA_SEARCH_RADIUS_M;
  const max = opts.max ?? CAMERA_SEARCH_MAX;
  return (cameras ?? [])
    .map((camera) => ({ camera, distanceM: haversineM(at, [camera?.lng, camera?.lat]) }))
    .filter((x) => Number.isFinite(x.distanceM) && x.distanceM <= radiusM)
    .sort((a, b) => a.distanceM - b.distanceM)
    .slice(0, max);
}
