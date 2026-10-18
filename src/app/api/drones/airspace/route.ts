import { NextResponse } from 'next/server';
import { bboxUsable, getAirspace } from '@/lib/drones/airspace';

/**
 * GET /api/drones/airspace?bbox=west,south,east,north — FAA airspace
 * reference data for the drone layer's overlay: LAANC facility-map grid
 * ceilings + national-security UAS flight restrictions, proxied from the
 * FAA's public ArcGIS services and cached server-side (10 min/bbox).
 *
 * Reference data only — NOT an authorization to fly. Authorization goes
 * through LAANC / FAA DroneZone.
 */

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const raw = new URL(req.url).searchParams.get('bbox') ?? '';
  const parts = raw.split(',').map((v) => Number(v));
  const [west, south, east, north] = parts;
  const bbox = { west, south, east, north };
  if (parts.length !== 4 || !bboxUsable(bbox)) {
    return NextResponse.json(
      { grids: [], restrictions: [], error: 'bbox must be west,south,east,north with span ≤ 3°' },
      { status: 400, headers: { 'Cache-Control': 'public, s-maxage=60' } },
    );
  }
  try {
    const data = await getAirspace(bbox);
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
    });
  } catch {
    return NextResponse.json(
      { grids: [], restrictions: [], source: 'FAA ArcGIS (unavailable)' },
      { status: 200, headers: { 'Cache-Control': 'public, s-maxage=60' } },
    );
  }
}
