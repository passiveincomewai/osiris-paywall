/**
 * OSIRIS — ALERTCalifornia fire cameras: the shared server-side read of
 * the ALERTCalifornia wildfire camera network, plus the pure helpers the
 * /california-fire-cameras page and its explorer are built on.
 *
 * The network is PTZ fire-watch cameras run for early wildfire detection.
 * Each camera's latest still frame is republished about every 15 seconds
 * at a stable URL — live IMAGES, not video streams, and every surface
 * that shows them labels them as such.
 *
 * Source: the network's public ArcGIS FeatureServer (the same layer
 * Esri's Living Atlas publishes) — https://alertcalifornia.org/.
 * Public and keyless. Server-cached for 10 minutes (positions are fixed;
 * only the frames change, and clients pull those straight from
 * ALERTCalifornia).
 */

import { cachedSource } from '@/lib/sourceCache';

const SERVICE =
  'https://services8.arcgis.com/X84q166Srnyl4JMV/arcgis/rest/services/' +
  'ALERTCalifornia_Camera_Feed/FeatureServer/0/query';

export interface AlertCam {
  id: string;
  name: string;
  county: string;
  org: string;
  img: string;
  url: string;
  online: boolean;
  lat: number;
  lng: number;
}

async function fetchCameras(): Promise<AlertCam[]> {
  // This service caps pages at 50 records (maxRecordCount), so walk the
  // offsets until the transfer-limit flag clears (~1,285 active cameras).
  const raw: any[] = [];
  for (let page = 0; page < 40; page++) {
    const params = new URLSearchParams({
      where: "isActive='active'",
      outFields: 'cameraName,siteId,organization,county,imageURL,cameraURL,isOnline',
      outSR: '4326',
      geometryPrecision: '4',
      orderByFields: 'OBJECTID',
      resultOffset: String(page * 50),
      resultRecordCount: '50',
      f: 'geojson',
    });
    const res = await fetch(`${SERVICE}?${params}`, {
      headers: { 'User-Agent': 'OSIRIS-Intelligence-Platform/3.5' },
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) throw new Error(`ALERTCalifornia ${res.status}`);
    const fc: any = await res.json();
    const batch: any[] = fc.features ?? [];
    raw.push(...batch);
    if (!fc.properties?.exceededTransferLimit || batch.length === 0) break;
  }
  const cams: AlertCam[] = [];
  for (const f of raw) {
    const coords = f.geometry?.coordinates;
    const p = f.properties ?? {};
    if (!Array.isArray(coords) || !p.imageURL) continue;
    cams.push({
      id: p.siteId || String(p.cameraName || coords.join(',')),
      name: p.cameraName || 'ALERT Camera',
      county: p.county || '',
      org: p.organization || '',
      img: p.imageURL,
      url: p.cameraURL || '',
      online: p.isOnline === 'online',
      lat: coords[1],
      lng: coords[0],
    });
  }
  return cams;
}

/** The cached read shared by /api/alert-cameras and the fire-cameras page. */
export const getAlertCameras = cachedSource<AlertCam>(
  'alertwest-cameras',
  fetchCameras,
  10 * 60_000,
);

/* ── California membership ───────────────────────────────────────────────
   The feed layer is the ALERTCalifornia network, but the page promises
   CALIFORNIA cameras, so membership is checked rather than assumed: a
   camera belongs when its county is one of California's 58, or — for a
   record whose county string is missing or unrecognised — when its
   coordinates fall inside the state's boundary. The boundary test uses
   the real border geometry in coarse form: the 42nd parallel (north),
   the Colorado River (south-east), and the Nevada line — the −120°
   meridian down to Lake Tahoe, then the diagonal to the river. Verified
   against the live feed 2026-10-22: every served record passes (the
   filter exists so a future ALERTWest expansion of the layer cannot
   silently put Nevada cameras on a page titled California). */

/** California's 58 counties, official names. */
export const CA_COUNTIES: readonly string[] = [
  'Alameda', 'Alpine', 'Amador', 'Butte', 'Calaveras', 'Colusa',
  'Contra Costa', 'Del Norte', 'El Dorado', 'Fresno', 'Glenn', 'Humboldt',
  'Imperial', 'Inyo', 'Kern', 'Kings', 'Lake', 'Lassen', 'Los Angeles',
  'Madera', 'Marin', 'Mariposa', 'Mendocino', 'Merced', 'Modoc', 'Mono',
  'Monterey', 'Napa', 'Nevada', 'Orange', 'Placer', 'Plumas', 'Riverside',
  'Sacramento', 'San Benito', 'San Bernardino', 'San Diego',
  'San Francisco', 'San Joaquin', 'San Luis Obispo', 'San Mateo',
  'Santa Barbara', 'Santa Clara', 'Santa Cruz', 'Shasta', 'Sierra',
  'Siskiyou', 'Solano', 'Sonoma', 'Stanislaus', 'Sutter', 'Tehama',
  'Trinity', 'Tulare', 'Tuolumne', 'Ventura', 'Yolo', 'Yuba',
];

/** Lookup key for a county string: lower-cased, letters only — the feed
 *  writes multi-word counties without spaces ("sanluisobispo"). */
export function countyKey(raw: string): string {
  return (raw ?? '').toLowerCase().replace(/[^a-z]/g, '');
}

const CA_COUNTY_BY_KEY = new Map(CA_COUNTIES.map((n) => [countyKey(n), n]));

/** The display name for a feed county value: the official California
 *  county name when it is one; otherwise the raw value, tidied. */
export function countyDisplayName(raw: string): string {
  const official = CA_COUNTY_BY_KEY.get(countyKey(raw));
  if (official) return official;
  const trimmed = (raw ?? '').trim();
  if (!trimmed) return 'Unknown county';
  return trimmed.replace(/\S+/g, (w) => w.charAt(0).toUpperCase() + w.slice(1));
}

/** The eastern border longitude at a latitude (see the note above). */
function eastBorderLng(lat: number): number {
  if (lat >= 39.3) return -120.0;
  if (lat >= 35.0) return -120.0 + ((39.3 - lat) * 5.37) / 4.3;
  return -114.63;
}

/** True when the camera is a California camera (county or coordinates). */
export function isCaliforniaCamera(cam: AlertCam): boolean {
  if (CA_COUNTY_BY_KEY.has(countyKey(cam.county))) return true;
  if (!Number.isFinite(cam.lat) || !Number.isFinite(cam.lng)) return false;
  if (cam.lat < 32.5 || cam.lat > 42.01) return false;
  // A small tolerance: border cameras sit on ridgetops the coarse line
  // only approximates, and Tahoe's shore bends east of the meridian.
  return cam.lng <= eastBorderLng(cam.lat) + 0.15;
}

/** The page's camera set: the feed, filtered to California. */
export function californiaCameras(cams: AlertCam[]): AlertCam[] {
  return cams.filter(isCaliforniaCamera);
}

/* ── Grouping + filtering (the explorer's view of the set) ────────────── */

export interface CountyGroup {
  /** countyKey() of the group — the filter value. */
  key: string;
  /** Display name, e.g. "San Luis Obispo". */
  name: string;
  count: number;
}

/** Counties present in the set, biggest first (name breaks ties). */
export function countyGroups(cams: AlertCam[]): CountyGroup[] {
  const byKey = new Map<string, CountyGroup>();
  for (const cam of cams) {
    const key = countyKey(cam.county);
    const g = byKey.get(key);
    if (g) g.count += 1;
    else byKey.set(key, { key, name: countyDisplayName(cam.county), count: 1 });
  }
  return [...byKey.values()].sort(
    (a, b) => b.count - a.count || a.name.localeCompare(b.name),
  );
}

/** Cameras ordered for the unfiltered grid: county groups biggest first
 *  (the country pages' "grouped by area, largest first"), name within a
 *  county. Returns a new array; the input is not mutated. */
export function sortForGrid(cams: AlertCam[]): AlertCam[] {
  const rank = new Map(countyGroups(cams).map((g, i) => [g.key, i]));
  return [...cams].sort((a, b) => {
    /* Working feeds first: ALERTCalifornia publishes a real online
       flag per camera (AlertCam.online) — online cameras ahead of
       offline ones, the county/name order preserved inside each. */
    if (a.online !== b.online) return a.online ? -1 : 1;
    const ra = rank.get(countyKey(a.county)) ?? Number.MAX_SAFE_INTEGER;
    const rb = rank.get(countyKey(b.county)) ?? Number.MAX_SAFE_INTEGER;
    if (ra !== rb) return ra - rb;
    return a.name.localeCompare(b.name);
  });
}

/** Search + county filter. The query matches the camera name and its
 *  county (raw or display form), case-insensitively. */
export function filterCameras(
  cams: AlertCam[],
  query: string,
  county: string | null,
): AlertCam[] {
  const q = query.trim().toLowerCase();
  return cams.filter((cam) => {
    if (county !== null && countyKey(cam.county) !== county) return false;
    if (!q) return true;
    return (
      cam.name.toLowerCase().includes(q) ||
      cam.county.toLowerCase().includes(q) ||
      countyDisplayName(cam.county).toLowerCase().includes(q)
    );
  });
}
