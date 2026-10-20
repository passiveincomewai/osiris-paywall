import { NextRequest, NextResponse } from 'next/server';
import { agencyById } from '@/lib/transit/agencies';
import { alertsForAgency } from '@/lib/transit/alertsServer';

/**
 * OSIRIS — active service alerts for a transit agency with a keyless
 * GTFS-RT Alert feed (UTA in v1). Decoded + route-resolved server-side
 * (lib/transit/alertsServer, 60 s cache); an agency without an Alert
 * feed answers an honest empty list, not an error.
 */

export const dynamic = 'force-dynamic';

const creditFor = (a: { id: string; attribution: string }) =>
  a.id === 'uta' ? 'Data: Utah Transit Authority (UTA Open Data)' : `Data: ${a.attribution}`;

export async function GET(req: NextRequest) {
  const agency = agencyById(req.nextUrl.searchParams.get('agency'));
  if (!agency) {
    return NextResponse.json({ alerts: [], count: 0, error: 'unknown agency' }, { status: 400 });
  }
  try {
    const alerts = await alertsForAgency(agency);
    return NextResponse.json(
      {
        agency: agency.id,
        credit: agency.alertsUrl ? creditFor(agency) : undefined,
        supported: !!agency.alertsUrl,
        alerts: alerts.map(a => ({
          id: a.id,
          header: a.header,
          ...(a.description ? { description: a.description } : {}),
          ...(a.cause ? { cause: a.cause } : {}),
          ...(a.effect ? { effect: a.effect } : {}),
          routes: a.routes,
          periods: a.periods,
        })),
        count: alerts.length,
        updated: new Date().toISOString(),
      },
      { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' } },
    );
  } catch {
    return NextResponse.json(
      { agency: agency.id, alerts: [], count: 0 },
      { status: 200, headers: { 'Cache-Control': 'public, s-maxage=15' } },
    );
  }
}
