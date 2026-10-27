import { NextRequest, NextResponse } from 'next/server';
import { agencyById } from '@/lib/transit/agencies';
import { networkFor, routeDaySummary, ymdInZone } from '@/lib/transit/network';
import { alertsForAgency } from '@/lib/transit/alertsServer';
import { alertsForRoute } from '@/lib/transit/alerts';

/**
 * OSIRIS — one route, checked: today's directions with their ordered
 * stop lists and service summary (first/last departure, trip count,
 * typical headway — all computed from the agency's static GTFS for
 * the agency-local day), plus the active service alerts touching it.
 * Accepts the public route number ("701") or the internal route_id.
 */

export const dynamic = 'force-dynamic';

const creditFor = (a: { id: string; attribution: string }) =>
  a.id === 'uta' ? 'Data: Utah Transit Authority (UTA Open Data)' : `Data: ${a.attribution}`;

export async function GET(req: NextRequest) {
  const agency = agencyById(req.nextUrl.searchParams.get('agency'));
  const wanted = req.nextUrl.searchParams.get('route');
  if (!agency?.staticGtfsUrl || !wanted) {
    return NextResponse.json({ error: 'agency and route required' }, { status: 400 });
  }
  try {
    const net = await networkFor(agency.id, agency.staticGtfsUrl);
    const route = net.routeByShort.get(wanted) ?? net.routeById.get(wanted);
    if (!route) {
      return NextResponse.json({ error: 'unknown route' }, { status: 404 });
    }
    const tz = agency.timezone ?? 'UTC';
    const today = ymdInZone(tz, new Date());
    const summary = routeDaySummary(net, route.id, today, tz);
    const alerts = alertsForRoute(await alertsForAgency(agency), route);
    return NextResponse.json(
      {
        agency: agency.id,
        credit: creditFor(agency),
        day: today,
        route: {
          id: route.id, short: route.short, long: route.long,
          mode: route.mode, color: route.color,
          ...(route.url ? { url: route.url } : {}),
        },
        directions: summary.map(d => ({
          dir: d.dir,
          headsign: d.headsign,
          stops: d.stopIds
            .map(id => net.stopById.get(id))
            .filter((s): s is NonNullable<typeof s> => !!s)
            .map(s => ({ id: s.id, name: s.name, lat: s.lat, lng: s.lng })),
          summary: {
            trips: d.trips,
            firstDep: d.firstDepMs ? new Date(d.firstDepMs).toISOString() : null,
            lastDep: d.lastDepMs ? new Date(d.lastDepMs).toISOString() : null,
            headwayMin: d.headwayMin,
          },
        })),
        alerts: alerts.map(a => ({
          id: a.id, header: a.header,
          ...(a.description ? { description: a.description } : {}),
          ...(a.effect ? { effect: a.effect } : {}),
          routes: a.routes,
          periods: a.periods,
        })),
      },
      { headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300' } },
    );
  } catch {
    return NextResponse.json(
      { agency: agency.id, error: 'route unavailable' },
      { status: 502, headers: { 'Cache-Control': 'public, s-maxage=15' } },
    );
  }
}
