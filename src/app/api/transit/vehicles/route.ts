import { NextRequest, NextResponse } from 'next/server';
import GtfsRealtimeBindings from 'gtfs-realtime-bindings';
import { cachedSource } from '@/lib/sourceCache';
import { agencyById, resolveMode, type TransitAgency } from '@/lib/transit/agencies';
import { staticGtfsFor, type StaticGtfsData } from '@/lib/transit/staticGtfs';
import { indexTripDelays, vehicleDelayAndStop, type TripDelay } from '@/lib/transit/tripUpdates';

/**
 * OSIRIS — Live Transit vehicles: per-agency GTFS-Realtime proxy.
 *
 * Fetches the agency's VehiclePositions protobuf (see the keyless-only
 * config in lib/transit/agencies), parses it server-side, and returns
 * compact JSON. Where the agency also publishes a keyless TripUpdates
 * feed, the delay at the vehicle's current stop is joined in by trip
 * id; where a static GTFS join is configured (UTA), route long names,
 * trip headsigns and stop names join from the same zip. Results are cached
 * 8 s per agency: measured feed cadence (2026-10-19) — UTA republishes
 * ~5 s with per-vehicle GPS fixes every ~10 s, MBTA fixes ~6 s, RTD
 * republishes and fixes every 30 s — so an 8 s TTL + the client's 10 s
 * poll keeps fast feeds genuinely fresh, while slow feeds are bounded
 * by their own cadence no matter what we do. The cache is shared
 * across viewers, so upstream load stays bounded at one pull per
 * agency per TTL window no matter how many clients poll.
 */

export const dynamic = 'force-dynamic';

const { FeedMessage } = GtfsRealtimeBindings.transit_realtime;
const UA = { 'User-Agent': 'OSIRIS-Intelligence-Platform/3.5' };
const STALE_MS = 30 * 60_000;

interface Vehicle {
  id: string;
  lat: number;
  lng: number;
  route: string;
  mode: string;
  dir?: number;
  bearing?: number;
  speedKmh?: number;
  label?: string;
  status?: number; // GTFS-RT VehicleStopStatus: 0 incoming, 1 stopped, 2 in transit
  occ?: number; // GTFS-RT OccupancyStatus, only when 1..6 (0/>6 are unreliable)
  delay?: number; // seconds, from TripUpdates, when joined
  ts?: number; // epoch seconds of the vehicle's own timestamp
  // Enrichment — present ONLY where a real source provides them (today:
  // the static-GTFS join, i.e. UTA). Never synthesized for other feeds.
  routeName?: string; // GTFS route_long_name, e.g. "Blue Line"
  headsign?: string; // GTFS trip_headsign — destination on the vehicle
  stopName?: string; // name of the stop the vehicle is at / heading to (see vehicleDelayAndStop)
}

function toSeconds(ts: any): number | null {
  if (ts == null) return null;
  if (typeof ts === 'number') return ts;
  if (typeof ts?.toNumber === 'function') return ts.toNumber();
  const n = Number(ts);
  return Number.isFinite(n) ? n : null;
}

async function fetchFeed(url: string, agency: TransitAgency): Promise<any> {
  const res = await fetch(url, {
    headers: { ...UA, ...(agency.headers ?? {}) },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`GTFS-RT ${res.status}`);
  const buf = new Uint8Array(await res.arrayBuffer());
  return FeedMessage.decode(buf);
}

async function fetchDelayIndex(agency: TransitAgency): Promise<Map<string, TripDelay>> {
  if (!agency.tripUpdatesUrl) return new Map();
  try {
    const msg = await fetchFeed(agency.tripUpdatesUrl, agency);
    return indexTripDelays(msg);
  } catch { /* delays are best-effort; positions still serve */ }
  return new Map();
}

async function fetchVehicles(agency: TransitAgency): Promise<Vehicle[]> {
  // Delays are best-effort: a slow TripUpdates feed (OVapi's can crawl)
  // must never hold vehicle positions hostage, so it gets an 8 s budget.
  const delayIndexPromise = Promise.race([
    fetchDelayIndex(agency),
    new Promise<Map<string, TripDelay>>(resolve => setTimeout(() => resolve(new Map()), 8000)),
  ]);
  // Static GTFS resolution (UTA-style feeds with no routeId in the
  // vehicle feed) is likewise best-effort: 10 s budget, then positions
  // serve unresolved rather than not at all. Agencies without a
  // staticGtfsUrl skip this entirely — their path is unchanged.
  const staticPromise: Promise<StaticGtfsData | null> = agency.staticGtfsUrl
    ? Promise.race([
        staticGtfsFor(agency.id, agency.staticGtfsUrl),
        new Promise<null>(resolve => setTimeout(() => resolve(null), 10000)),
      ])
    : Promise.resolve(null);
  const [msg, delayIndex, staticData] = await Promise.all([
    fetchFeed(agency.feedUrl, agency),
    delayIndexPromise,
    staticPromise,
  ]);
  const tripMap = staticData?.trips ?? null;
  const now = Date.now();
  const vehicles: Vehicle[] = [];
  for (const e of msg.entity ?? []) {
    const v = e.vehicle;
    const pos = v?.position;
    if (!v || !pos || typeof pos.latitude !== 'number' || typeof pos.longitude !== 'number') continue;
    const ts = toSeconds(v.timestamp);
    // Feeds carry ghost vehicles long after they stop reporting.
    if (ts != null && now - ts * 1000 > STALE_MS) continue;
    const tripId = v.trip?.tripId;
    // Feeds that omit routeId (UTA) resolve it — and an exact mode from
    // GTFS route_type — through the static trip map when configured.
    const mapped = tripId && tripMap ? tripMap.get(tripId) : undefined;
    const route = v.trip?.routeId || mapped?.route || '';
    const veh: Vehicle = {
      id: String(v.vehicle?.id ?? e.id ?? ''),
      lat: Math.round(pos.latitude * 100000) / 100000,
      lng: Math.round(pos.longitude * 100000) / 100000,
      route,
      mode: mapped?.mode ?? resolveMode(agency, route),
    };
    if (typeof v.trip?.directionId === 'number') veh.dir = v.trip.directionId;
    if (typeof pos.bearing === 'number' && pos.bearing !== 0) veh.bearing = Math.round(pos.bearing);
    if (typeof pos.speed === 'number' && pos.speed > 0) veh.speedKmh = Math.round(pos.speed * 3.6);
    if (v.vehicle?.label) veh.label = v.vehicle.label;
    if (typeof v.currentStatus === 'number') veh.status = v.currentStatus;
    if (typeof v.occupancyStatus === 'number' && v.occupancyStatus >= 1 && v.occupancyStatus <= 6) veh.occ = v.occupancyStatus;
    // One resolution drives both the delay (the delay AT the relevant
    // stop, not at the trip's first stop) and which stop that is: the
    // vehicle's own stop sequence when the feed reports a real one,
    // else the upcoming stop from the trip's predicted arrivals (UTA
    // reports sequence 0 fleet-wide, so it always takes this path).
    const seq = typeof v.currentStopSequence === 'number' ? v.currentStopSequence : undefined;
    const { delay, stopSeq } = vehicleDelayAndStop(delayIndex, tripId, seq, now / 1000);
    if (delay !== undefined) veh.delay = delay;
    // Static-join enrichment (UTA today): long route name, the
    // destination headsign, and the name of the stop the vehicle is
    // at / heading to — all read from the agency's own GTFS.
    if (mapped?.routeName && mapped.routeName !== route) veh.routeName = mapped.routeName;
    if (mapped?.headsign) veh.headsign = mapped.headsign;
    if (tripId && stopSeq != null && stopSeq >= 1 && staticData) {
      const stopName = staticData.stopNames.get(tripId)?.[stopSeq - 1];
      if (stopName) veh.stopName = stopName;
    }
    if (ts != null) veh.ts = ts;
    vehicles.push(veh);
    if (vehicles.length >= 8000) break;
  }
  return vehicles;
}

export async function GET(req: NextRequest) {
  const agency = agencyById(req.nextUrl.searchParams.get('agency'));
  if (!agency) {
    return NextResponse.json({ vehicles: [], count: 0, error: 'unknown agency' }, { status: 400 });
  }
  try {
    const vehicles = await cachedSource<Vehicle>(
      `transit:${agency.id}`,
      () => fetchVehicles(agency),
      8_000,
    )();
    return NextResponse.json(
      {
        agency: agency.id,
        name: agency.name,
        attribution: agency.attribution,
        vehicles,
        count: vehicles.length,
        updated: new Date().toISOString(),
      },
      { headers: { 'Cache-Control': 'public, s-maxage=8, stale-while-revalidate=10' } },
    );
  } catch {
    return NextResponse.json(
      { agency: agency.id, vehicles: [], count: 0 },
      { status: 200, headers: { 'Cache-Control': 'public, s-maxage=15' } },
    );
  }
}
