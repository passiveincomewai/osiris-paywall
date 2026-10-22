import { NextResponse } from 'next/server';
import { getAlertCameras } from '@/lib/alert-cameras';

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
 * The fetch itself lives in lib/alert-cameras (shared with the
 * /california-fire-cameras page) — server-cached for 10 minutes
 * (positions are fixed; only the frames change, and the client pulls
 * those straight from ALERTCalifornia).
 * Source: ALERTCalifornia / ALERTWest — https://alertcalifornia.org/
 */

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const cameras = await getAlertCameras();
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
