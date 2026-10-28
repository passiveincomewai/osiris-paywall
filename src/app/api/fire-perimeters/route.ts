import { NextResponse } from 'next/server';
import { getFirePerimeters } from '@/lib/fire-perimeters';

/**
 * OSIRIS — Fire Perimeters: current US wildfire perimeters from NIFC's
 * WFIGS Interagency Fire Perimeters (Current) service on ArcGIS.
 *
 * The fetch, field mapping and cache live in src/lib/fire-perimeters
 * (shared with the /wildfires pages); this route is the globe
 * layer's JSON shape over that same read. Public, keyless,
 * refreshed upstream about every 5 minutes. Source: NIFC / WFIGS —
 * https://www.nifc.gov/ (data via ArcGIS FeatureServer).
 */

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const features = await getFirePerimeters();
    return NextResponse.json(
      { type: 'FeatureCollection', features, count: features.length, source: 'NIFC WFIGS' },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      },
    );
  } catch {
    return NextResponse.json(
      { type: 'FeatureCollection', features: [], count: 0, source: 'NIFC WFIGS' },
      { status: 200, headers: { 'Cache-Control': 'public, s-maxage=60' } },
    );
  }
}
