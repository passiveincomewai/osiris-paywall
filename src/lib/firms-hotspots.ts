/**
 * OSIRIS — NASA FIRMS hotspot detections for the /wildfires pages.
 *
 * Same public 24h CSVs the globe's fires layer reads in
 * src/app/api/fires/route.ts (VIIRS first, MODIS fallback), parsed
 * here WITHOUT the route's rendering sample: the route samples to
 * ~2,000 points so the globe stays smooth, but a page that counts
 * detections near an incident must count them all. The two readers
 * share the source, not the sample.
 *
 * What a hotspot IS, stated on every page that uses this lib: a
 * satellite thermal detection (VIIRS/MODIS) from the last 24 hours.
 * It is not an incident — it carries no name, no perimeter and no
 * confirmation that what burned is a wildfire at all (the feed
 * includes prescribed burns, agricultural burns and industrial
 * heat). Named incidents come only from NIFC WFIGS
 * (src/lib/fire-perimeters); this lib never promotes a detection
 * into one.
 *
 * Public, keyless (NASA FIRMS open data files). Cached 10 minutes
 * in-process, matching the /api/fires response cache.
 */

import { cachedSource } from './sourceCache';

export const FIRMS_SOURCES = [
  {
    label: 'NASA FIRMS (VIIRS)',
    url: 'https://firms.modaps.eosdis.nasa.gov/data/active_fire/suomi-npp-viirs-c2/csv/SUOMI_VIIRS_C2_Global_24h.csv',
  },
  {
    label: 'NASA FIRMS (MODIS)',
    url: 'https://firms.modaps.eosdis.nasa.gov/data/active_fire/modis-c6.1/csv/MODIS_C6_1_Global_24h.csv',
  },
] as const;

export interface FirmsHotspot {
  lat: number;
  lng: number;
  brightness: number;
  confidence: string;
  /** Acquisition date, YYYY-MM-DD (UTC), as the CSV states it. */
  acqDate: string;
  /** Acquisition time, HHMM (UTC), as the CSV states it. */
  acqTime: string;
  /** Fire radiative power (MW). */
  frp: number;
}

/** The route's column mapping, unsampled. Exported for tests. */
export function parseFirmsCsv(csv: string): FirmsHotspot[] {
  const lines = csv.trim().split('\n');
  if (lines.length < 2) return [];
  const header = lines[0].split(',');
  const latIdx = header.indexOf('latitude');
  const lngIdx = header.indexOf('longitude');
  const brightIdx =
    header.indexOf('bright_ti4') !== -1 ? header.indexOf('bright_ti4') : header.indexOf('brightness');
  const confIdx = header.indexOf('confidence');
  const dateIdx = header.indexOf('acq_date');
  const timeIdx = header.indexOf('acq_time');
  const frpIdx = header.indexOf('frp');
  if (latIdx === -1 || lngIdx === -1) return [];

  const out: FirmsHotspot[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    const lat = parseFloat(cols[latIdx]);
    const lng = parseFloat(cols[lngIdx]);
    if (isNaN(lat) || isNaN(lng)) continue;
    out.push({
      lat,
      lng,
      brightness: parseFloat(cols[brightIdx]) || 0,
      confidence: cols[confIdx] || 'unknown',
      acqDate: cols[dateIdx] || '',
      acqTime: cols[timeIdx] || '',
      frp: parseFloat(cols[frpIdx]) || 0,
    });
  }
  return out;
}

let lastFetchSource: string | null = null;

async function fetchHotspots(): Promise<FirmsHotspot[]> {
  for (const src of FIRMS_SOURCES) {
    try {
      const res = await fetch(src.url, {
        signal: AbortSignal.timeout(20000),
        headers: { 'User-Agent': 'OSIRIS-Intelligence-Platform/3.5' },
      });
      if (!res.ok) continue;
      const text = await res.text();
      if (text && text.includes('latitude') && text.length > 200) {
        const parsed = parseFirmsCsv(text);
        if (parsed.length > 0) {
          lastFetchSource = src.label;
          return parsed;
        }
      }
    } catch {
      continue;
    }
  }
  lastFetchSource = null;
  return [];
}

const getCachedHotspots = cachedSource<FirmsHotspot>(
  'firms-hotspots',
  fetchHotspots,
  10 * 60_000,
);

/** All detections from the last good fetch + which feed they came
 *  from (null when no feed has answered — callers render "not
 *  available" rather than a zero that would be a lie). */
export async function getFirmsHotspots(): Promise<{
  hotspots: FirmsHotspot[];
  source: string | null;
}> {
  const hotspots = await getCachedHotspots();
  return { hotspots, source: hotspots.length > 0 ? lastFetchSource : null };
}

/* ------------------------------------------------------------------ */

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const t = (x: number) => (x * Math.PI) / 180;
  const h =
    Math.sin(t(lat2 - lat1) / 2) ** 2 +
    Math.cos(t(lat1)) * Math.cos(t(lat2)) * Math.sin(t(lng2 - lng1) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export interface HotspotSummary {
  count: number;
  /** Strongest detection by fire radiative power, when any. */
  maxFrp: number | null;
  /** Latest acquisition stamp among the set, "YYYY-MM-DD HH:MM" UTC. */
  latest: string | null;
}

/** Detections within `radiusKm` of a point, summarised. The radius
 *  is part of the caller's stated rule and is printed on the page. */
export function summariseHotspotsNear(
  hotspots: FirmsHotspot[],
  lat: number,
  lng: number,
  radiusKm: number,
): HotspotSummary {
  let count = 0;
  let maxFrp: number | null = null;
  let latestKey = '';
  let latest: string | null = null;
  for (const h of hotspots) {
    if (haversineKm(lat, lng, h.lat, h.lng) > radiusKm) continue;
    count += 1;
    if (maxFrp === null || h.frp > maxFrp) maxFrp = h.frp;
    const key = `${h.acqDate} ${h.acqTime.padStart(4, '0')}`;
    if (key > latestKey) {
      latestKey = key;
      const t = h.acqTime.padStart(4, '0');
      latest = `${h.acqDate} ${t.slice(0, 2)}:${t.slice(2)}`;
    }
  }
  return { count, maxFrp, latest };
}
