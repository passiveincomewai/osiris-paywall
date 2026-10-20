import { NextRequest, NextResponse } from 'next/server';
import GtfsRealtimeBindings from 'gtfs-realtime-bindings';
import { agencyById, type TransitAgency } from '@/lib/transit/agencies';
import { networkFor } from '@/lib/transit/network';
import { indexTripPredictions, nextArrivals, type TripPredictions } from '@/lib/transit/arrivals';

/**
 * OSIRIS — one stop: its routes and NEXT ARRIVALS. Arrivals are the
 * static timetable upgraded by TripUpdates wherever the feed carries
 * a fresh prediction for that trip at that stop (joined by stop
 * sequence — UTA's TripUpdates carry no stopIds); every arrival is
 * labeled 'realtime' or 'scheduled' so a timetable time is never
 * dressed as live (lib/transit/arrivals).
 */

export const dynamic = 'force-dynamic';

const { FeedMessage } = GtfsRealtimeBindings.transit_realtime;
const UA = { 'User-Agent': 'OSIRIS-Intelligence-Platform/3.5' };
const creditFor = (a: { id: string; attribution: string }) =>
  a.id === 'uta' ? 'Data: Utah Transit Authority (UTA Open Data)' : `Data: ${a.attribution}`;

/* TripUpdates are fetched per stop-request but shared across viewers:
 * a 20 s in-process cache + an 8 s budget, so a slow feed degrades the
 * stop to scheduled times instead of holding the popup hostage. */
const predCache = new Map<string, { at: number; preds: TripPredictions | null }>();

async function fetchPredictions(agency: TransitAgency): Promise<TripPredictions | null> {
  if (!agency.tripUpdatesUrl) return null;
  const hit = predCache.get(agency.id);
  if (hit && Date.now() - hit.at < 20_000) return hit.preds;
  const work = (async (): Promise<TripPredictions | null> => {
    try {
      const res = await fetch(agency.tripUpdatesUrl!, {
        headers: { ...UA, ...(agency.headers ?? {}) },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) return null;
      const msg = FeedMessage.decode(new Uint8Array(await res.arrayBuffer()));
      return indexTripPredictions(msg);
    } catch {
      return null;
    }
  })();
  const preds = await Promise.race([
    work,
    new Promise<null>(resolve => setTimeout(() => resolve(null), 8000)),
  ]);
  predCache.set(agency.id, { at: Date.now(), preds });
  return preds;
}

export async function GET(req: NextRequest) {
  const agency = agencyById(req.nextUrl.searchParams.get('agency'));
  const stopId = req.nextUrl.searchParams.get('id');
  if (!agency?.staticGtfsUrl || !stopId) {
    return NextResponse.json({ error: 'agency and id required' }, { status: 400 });
  }
  try {
    const net = await networkFor(agency.id, agency.staticGtfsUrl);
    const stop = net.stopById.get(stopId);
    if (!stop) {
      return NextResponse.json({ error: 'unknown stop' }, { status: 404 });
    }
    const tz = agency.timezone ?? 'UTC';
    const preds = await fetchPredictions(agency);
    const now = Date.now();
    const { arrivals, rtLive, rtAgeS } = nextArrivals(net, stopId, preds, now, tz);
    return NextResponse.json(
      {
        agency: agency.id,
        credit: creditFor(agency),
        stop: {
          id: stop.id, name: stop.name, lat: stop.lat, lng: stop.lng,
          ...(stop.code ? { code: stop.code } : {}),
          routes: stop.routes.map(short => {
            const r = net.routeByShort.get(short);
            return { short, long: r?.long ?? short, color: r?.color ?? '#B0BEC5', mode: r?.mode ?? 'bus' };
          }),
        },
        arrivals: arrivals.map(a => ({
          route: a.routeShort,
          headsign: a.headsign,
          time: new Date(a.timeMs).toISOString(),
          inMin: Math.max(0, Math.round((a.timeMs - now) / 60000)),
          basis: a.basis,
          ...(a.delayS !== undefined ? { delayS: a.delayS } : {}),
        })),
        rt: { live: rtLive, ageS: rtAgeS },
        servedAt: new Date(now).toISOString(),
      },
      { headers: { 'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=20' } },
    );
  } catch {
    return NextResponse.json(
      { agency: agency.id, error: 'stop unavailable' },
      { status: 502, headers: { 'Cache-Control': 'public, s-maxage=15' } },
    );
  }
}
