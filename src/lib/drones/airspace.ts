/**
 * WorldEye — FAA airspace overlay data for the drone layer.
 *
 * Source: the FAA's own public ArcGIS services (services6.arcgis.com,
 * the FAA NAS data organisation) — the same datasets behind the FAA's
 * UAS Facility Maps viewer:
 *  - FAA_UAS_FacilityMap_Data — LAANC grid cells with the maximum
 *    altitude (ft AGL) the FAA publishes for each cell, per airport.
 *    380,860 cells nationwide; queried per viewport bbox.
 *  - Part_Time_National_Security_UAS_Flight_Restrictions — the standing
 *    national-security UAS flight restrictions (a handful of polygons).
 *
 * This is planning/reference data the FAA itself publishes with a
 * "not for navigation, not an authorization" disclaimer — the UI labels
 * it as FAA reference data and links pilots to LAANC for authorization.
 *
 * Server-proxied and cached for 10 minutes per rounded bbox, like the
 * site's other ArcGIS layers.
 */

import type { AirspaceFeature } from './types';
import type { LngLatBounds } from './geo';

const ORG = 'https://services6.arcgis.com/ssFJjBXIUyZDrSYZ/ArcGIS/rest/services';
const GRID_SERVICE = `${ORG}/FAA_UAS_FacilityMap_Data/FeatureServer/0/query`;
const RESTRICTION_SERVICE =
  `${ORG}/Part_Time_National_Security_UAS_Flight_Restrictions/FeatureServer/0/query`;

const CACHE_TTL_MS = 10 * 60_000;
const PAGE_SIZE = 2_000; // the service's maxRecordCount — one ArcGIS page
const MAX_GRID_FEATURES = 6_000; // hard cap per bbox; beyond it we say truncated

interface CacheEntry {
  at: number;
  data: AirspaceResult;
}
export interface AirspaceResult {
  grids: AirspaceFeature[];
  restrictions: AirspaceFeature[];
  truncated: boolean;
  source: string;
}

const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<AirspaceResult>>();

/** Reject absurd viewports — the grid only makes sense near airports. */
export function bboxUsable(b: LngLatBounds): boolean {
  const spanLng = Math.abs(b.east - b.west);
  const spanLat = Math.abs(b.north - b.south);
  return (
    Number.isFinite(spanLng + spanLat) &&
    spanLng > 0 && spanLat > 0 && spanLng <= 3 && spanLat <= 3 &&
    b.west >= -180 && b.east <= 180 && b.south >= -90 && b.north <= 90 && b.south < b.north
  );
}

function envelope(b: LngLatBounds): string {
  return `${b.west},${b.south},${b.east},${b.north}`;
}

/**
 * Fetch one ArcGIS query URL and return its parsed FeatureCollection.
 * ArcGIS reports many query failures as HTTP 200 with an {"error": …}
 * body and NO features array — mapping that to "zero results" silently
 * empties the overlay (the 2026-10-18 wide-bbox incident: a transient
 * upstream error became an empty success, then got cached), so any
 * body that isn't a real FeatureCollection is an error here.
 */
async function fetchFeatureCollection(url: string, label: string): Promise<any> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'OSIRIS-Intelligence-Platform/3.5' },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`${label} ${res.status}`);
  const fc: any = await res.json();
  if (fc?.error) {
    const detail =
      fc.error.message || (fc.error.details ?? []).join('; ') || `code ${fc.error.code ?? 'unknown'}`;
    throw new Error(`${label} error: ${detail}`);
  }
  if (!Array.isArray(fc?.features)) {
    throw new Error(`${label}: unexpected response (no features array)`);
  }
  return fc;
}

async function fetchGrids(b: LngLatBounds): Promise<{ features: AirspaceFeature[]; truncated: boolean }> {
  const features: AirspaceFeature[] = [];
  let truncated = false;
  let offset = 0;
  // Page through the service (2,000 records/page, OBJECTID-ordered for
  // stable pages) until it stops reporting exceededTransferLimit or we
  // reach the per-bbox cap — beyond the cap we stop and SAY so via
  // `truncated` instead of quietly returning a partial sky.
  for (;;) {
    const params = new URLSearchParams({
      where: '1=1',
      geometry: envelope(b),
      geometryType: 'esriGeometryEnvelope',
      inSR: '4326',
      spatialRel: 'esriSpatialRelIntersects',
      outFields: 'CEILING,UNIT,APT1_NAME,APT1_LAANC',
      outSR: '4326',
      resultRecordCount: String(PAGE_SIZE),
      resultOffset: String(offset),
      orderByFields: 'OBJECTID',
      f: 'geojson',
    });
    const fc = await fetchFeatureCollection(`${GRID_SERVICE}?${params}`, 'FAA facility maps');
    for (const f of fc.features) {
      const g = f.geometry;
      const p = f.properties ?? {};
      if (!g || (g.type !== 'Polygon' && g.type !== 'MultiPolygon')) continue;
      features.push({
        kind: 'grid',
        ceilingFt: typeof p.CEILING === 'number' ? p.CEILING : null,
        airport: p.APT1_NAME || '',
        laanc: p.APT1_LAANC === 1 ? true : p.APT1_LAANC === 0 ? false : null,
        reason: '',
        geometry: g,
      });
    }
    const moreUpstream = fc.properties?.exceededTransferLimit === true;
    if (!moreUpstream) break;
    if (fc.features.length === 0 || features.length >= MAX_GRID_FEATURES) {
      truncated = true;
      break;
    }
    offset += fc.features.length;
  }
  if (features.length > MAX_GRID_FEATURES) features.length = MAX_GRID_FEATURES;
  return { features, truncated };
}

async function fetchRestrictions(): Promise<AirspaceFeature[]> {
  // Only a handful exist nationwide — fetched whole, cached an hour by
  // the route-level cache key (bbox-independent, key '').
  const params = new URLSearchParams({
    where: '1=1',
    outFields: 'Base,Facility,Reason,State',
    outSR: '4326',
    resultRecordCount: '500',
    f: 'geojson',
  });
  const fc = await fetchFeatureCollection(`${RESTRICTION_SERVICE}?${params}`, 'FAA restrictions');
  const features: AirspaceFeature[] = [];
  for (const f of fc.features) {
    const g = f.geometry;
    const p = f.properties ?? {};
    if (!g || (g.type !== 'Polygon' && g.type !== 'MultiPolygon')) continue;
    features.push({
      kind: 'restriction',
      ceilingFt: null,
      airport: p.Facility || p.Base || '',
      laanc: null,
      reason: p.Reason || 'National security UAS flight restriction',
      geometry: g,
    });
  }
  return features;
}

const restrictionCache: { at: number; data: AirspaceFeature[] } = { at: 0, data: [] };
const RESTRICTION_TTL_MS = 60 * 60_000;

/** Grids for one viewport + the national restriction set, cached. */
export async function getAirspace(b: LngLatBounds): Promise<AirspaceResult> {
  const key = [b.west, b.south, b.east, b.north].map((v) => v.toFixed(2)).join(',');
  const hit = cache.get(key);
  const now = Date.now();
  if (hit && now - hit.at < CACHE_TTL_MS) return hit.data;
  const pending = inflight.get(key);
  if (pending) return pending;

  const job = (async (): Promise<AirspaceResult> => {
    const grids = await fetchGrids(b);
    let restrictions = restrictionCache.data;
    if (now - restrictionCache.at >= RESTRICTION_TTL_MS || !restrictions.length) {
      try {
        restrictions = await fetchRestrictions();
        restrictionCache.at = Date.now();
        restrictionCache.data = restrictions;
      } catch {
        restrictions = restrictionCache.data; // keep last good (may be [])
      }
    }
    const data: AirspaceResult = {
      grids: grids.features,
      restrictions,
      truncated: grids.truncated,
      source: 'FAA UAS Facility Maps (LAANC grids) + FAA national-security UAS flight restrictions, via FAA ArcGIS',
    };
    cache.set(key, { at: Date.now(), data });
    if (cache.size > 64) cache.delete(cache.keys().next().value as string);
    return data;
  })();
  inflight.set(key, job);
  try {
    return await job;
  } finally {
    inflight.delete(key);
  }
}
