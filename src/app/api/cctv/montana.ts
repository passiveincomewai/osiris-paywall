import type { CctvCamera } from './types';
import { stealthFetch } from '@/lib/stealthFetch';
import { cachedSource } from '@/lib/sourceCache';

/**
 * OSIRIS — Montana CCTV Cameras (MDT / MT 511 RWIS)
 * Source: https://mt.cdn.iteris-atis.com/geojson/icons/metadata/icons.rwis.geojson
 * — the exact GeoJSON file 511mt.net itself loads for its RWIS camera
 * layer. 118 RWIS stations carrying 426 camera views, verified live
 * 2026-10-22 — NO API KEY NEEDED.
 *
 * One catalogue record per camera VIEW: `properties.cameras[]` entries
 * each carry their own still (`…/rwis_images/<view>.jpg`), and the view's
 * `name` ("Bonner - East Elev 3280") is the most precise name the feed
 * offers. Coordinates are the station's own, exactly as MDT publishes
 * them — never geocoded or estimated.
 *
 * The sibling file icons.cameras.geojson is deliberately NOT used: it is
 * MDT's cross-listing of OTHER operators' cameras (neighbouring-state
 * DOTs and the national parks — MDT's own site labels that page "not
 * maintained by MDT"), and 13 of its records already ride the OpenCCTV
 * harvest's mtdot family.
 *
 * Added 2026-10-22 (DOT gap fills): the catalogue previously carried no
 * MDT-operated camera at all — the ~170 Montana-bbox records were FAA
 * WeatherCams, neighbouring states' 511 cross-listings, NPS and research
 * networks. Dedupe against the served catalogue at build time: 0 id
 * matches, 0 feed-URL matches, 0 same-location (≤10 m) matches against
 * the 38,087-record harvest. Three border stations (Yaak, Lookout Pass,
 * Raynolds Pass) sit 12–103 m from a single Idaho 511 cross-listed view
 * each (occ-s511-ID-414/380/328) — near-distinct directional views of
 * the same stations, not duplicates; the harvest side is the copy a
 * future sync should retire.
 *
 * One station IS a true duplicate and is excluded below: Bozeman Pass
 * (site 564002, 4 views). The FAA WeatherCams module already serves it —
 * FAA lists that site as operatedBy "MDT", thirdParty, attributed to the
 * Montana Division of Aeronautics — i.e. the FAA record and these views
 * are the same MDT cameras at the same pass (31 m apart, FAA rounds its
 * coordinates). Imported total is therefore 117 stations / 422 views.
 */

const FEED = 'https://mt.cdn.iteris-atis.com/geojson/icons/metadata/icons.rwis.geojson';

/** Montana bounding box — drops any stray/placeholder coordinates. */
const MT_BOUNDS = { minLat: 44.35, maxLat: 49.01, minLng: -116.06, maxLng: -104.03 };

/**
 * Stations already served through another module — skipped so the same
 * physical cameras never land on the map twice.
 * 564002 Bozeman Pass — served by the FAA WeatherCams module (faa.ts);
 * FAA lists the site as MDT-operated (see header).
 */
const COVERED_ELSEWHERE_SITES = new Set(['564002']);

export interface MtFeature {
  id?: string | null;
  geometry?: { coordinates?: [number, number] | null } | null;
  properties?: {
    name?: string | null;
    description?: string | null;
    route?: string | null;
    cameras?: Array<{
      id?: string | null;
      name?: string | null;
      description?: string | null;
      image?: string | null;
    }> | null;
  } | null;
}

/** Map one GeoJSON station feature to one camera per view. Exported for tests. */
export function mapFeature(feature: MtFeature): CctvCamera[] {
  const siteId = feature?.id;
  const coords = feature?.geometry?.coordinates;
  if (!siteId || !coords) return [];
  if (COVERED_ELSEWHERE_SITES.has(siteId)) return [];

  const [lng, lat] = coords;
  if (typeof lat !== 'number' || typeof lng !== 'number') return [];
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return [];
  if (lat < MT_BOUNDS.minLat || lat > MT_BOUNDS.maxLat) return [];
  if (lng < MT_BOUNDS.minLng || lng > MT_BOUNDS.maxLng) return [];

  const siteName = (feature.properties?.name || siteId).trim();
  const views = feature.properties?.cameras || [];
  const out: CctvCamera[] = [];
  for (const view of views) {
    const url = view?.image?.trim() || '';
    if (!url || view?.id == null) continue;
    out.push({
      id: `mtdot-${view.id}`,
      lat,
      lng,
      name: (view.name || view.description || siteName).trim(),
      city: siteName,
      country: 'US',
      feed_url: url,
      source: 'MDT 511',
    });
  }
  return out;
}

async function loadMontanaCameras(): Promise<CctvCamera[]> {
  const res = await stealthFetch(FEED, {
    signal: AbortSignal.timeout(20000),
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`MT511 HTTP ${res.status}`);

  const data = await res.json();
  const cams: CctvCamera[] = [];
  const seen = new Set<string>();
  for (const feature of (data?.features || []) as MtFeature[]) {
    for (const cam of mapFeature(feature)) {
      if (seen.has(cam.id)) continue;
      seen.add(cam.id);
      cams.push(cam);
    }
  }

  console.log(`[OSIRIS] Montana cameras — MDT MT511 RWIS: ${cams.length}`);
  return cams;
}

export const fetchMontanaCameras = cachedSource('montana', loadMontanaCameras);
