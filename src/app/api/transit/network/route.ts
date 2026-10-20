import { NextRequest, NextResponse } from 'next/server';
import { agencyById } from '@/lib/transit/agencies';
import { networkFor, routeLineFeatures } from '@/lib/transit/network';

/**
 * OSIRIS — transit network: route index + line geometry for an agency
 * with a static GTFS (UTA in v1). Built server-side from the agency's
 * own GTFS zip (lib/transit/network — cached 12 h, stale-on-error) so
 * the client never sees a raw GTFS file, only the compact served form.
 * `?shapes=0` omits the line geometry (the panel's route index).
 */

export const dynamic = 'force-dynamic';

const creditFor = (a: { id: string; attribution: string }) =>
  a.id === 'uta' ? 'Data: Utah Transit Authority (UTA Open Data)' : `Data: ${a.attribution}`;

export async function GET(req: NextRequest) {
  const agency = agencyById(req.nextUrl.searchParams.get('agency'));
  if (!agency?.staticGtfsUrl) {
    return NextResponse.json({ error: 'no static network for agency' }, { status: 400 });
  }
  const withShapes = req.nextUrl.searchParams.get('shapes') !== '0';
  try {
    const net = await networkFor(agency.id, agency.staticGtfsUrl);
    return NextResponse.json(
      {
        agency: agency.id,
        name: agency.name,
        attribution: agency.attribution,
        credit: creditFor(agency),
        feedVersion: net.feedVersion ?? null,
        servedAt: new Date().toISOString(),
        routeCount: net.routes.length,
        stopCount: net.stops.length,
        routes: net.routes.map(r => ({
          id: r.id,
          short: r.short,
          long: r.long,
          mode: r.mode,
          color: r.color,
          ...(r.url ? { url: r.url } : {}),
          directions: (net.directions.get(r.id) ?? []).map(d => ({
            dir: d.dir,
            headsign: d.headsign,
            stopCount: d.stopIds.length,
          })),
        })),
        ...(withShapes ? { lines: routeLineFeatures(net) } : {}),
      },
      { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } },
    );
  } catch {
    return NextResponse.json(
      { agency: agency.id, error: 'network unavailable' },
      { status: 502, headers: { 'Cache-Control': 'public, s-maxage=30' } },
    );
  }
}
