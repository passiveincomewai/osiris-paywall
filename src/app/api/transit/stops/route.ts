import { NextRequest, NextResponse } from 'next/server';
import { agencyById } from '@/lib/transit/agencies';
import { networkFor } from '@/lib/transit/network';

/**
 * OSIRIS — transit stops: the compact stop list for an agency with a
 * static GTFS (UTA in v1): id, name, coordinates, and the public route
 * labels serving each stop. The client gates rendering by viewport +
 * zoom (lib/transit/relevance pattern); the full list is one cached
 * fetch per session, never a raw GTFS file.
 */

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const agency = agencyById(req.nextUrl.searchParams.get('agency'));
  if (!agency?.staticGtfsUrl) {
    return NextResponse.json({ error: 'no static network for agency' }, { status: 400 });
  }
  try {
    const net = await networkFor(agency.id, agency.staticGtfsUrl);
    return NextResponse.json(
      {
        agency: agency.id,
        count: net.stops.length,
        stops: net.stops.map(s => ({
          id: s.id, name: s.name, lat: s.lat, lng: s.lng, routes: s.routes,
          ...(s.code ? { code: s.code } : {}),
        })),
      },
      { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } },
    );
  } catch {
    return NextResponse.json(
      { agency: agency.id, error: 'network unavailable', stops: [], count: 0 },
      { status: 502, headers: { 'Cache-Control': 'public, s-maxage=30' } },
    );
  }
}
