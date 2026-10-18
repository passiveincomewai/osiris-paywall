import { NextResponse } from 'next/server';
import { cachedSource } from '@/lib/sourceCache';

/**
 * OSIRIS — ALERT Fire Cameras: the ALERTCalifornia / ALERTWest wildfire
 * camera network, from its public ArcGIS FeatureServer (the same layer
 * Esri's Living Atlas publishes). Public and keyless.
 *
 * Each camera is a PTZ fire-watch camera whose latest still frame is
 * republished about every 15 seconds at a stable URL. These are live
 * IMAGES, not video streams — the globe shows the point and the popup
 * shows the latest frame, labeled as such.
 *
 * Server-cached for 10 minutes (positions are fixed; only the frames
 * change, and the client pulls those straight from ALERTCalifornia).
 * Source: ALERTCalifornia / ALERTWest — https://alertcalifornia.org/
 */

export const dynamic = 'force-dynamic';

const SERVICE =
  'https://services8.arcgis.com/X84q166Srnyl4JMV/arcgis/rest/services/' +
  'ALERTCalifornia_Camera_Feed/FeatureServer/0/query';

interface AlertCam {
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

const getCameras = cachedSource<AlertCam>('alertwest-cameras', fetchCameras, 10 * 60_000);

export async function GET() {
  try {
    const cameras = await getCameras();
    return NextResponse.json(
      { cameras, count: cameras.length, source: 'ALERTCalifornia / ALERTWest' },
      { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } },
    );
  } catch {
    return NextResponse.json(
      { cameras: [], count: 0, source: 'ALERTCalifornia / ALERTWest' },
      { status: 200, headers: { 'Cache-Control': 'public, s-maxage=60' } },
    );
  }
}
