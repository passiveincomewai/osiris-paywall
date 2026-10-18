import { NextRequest, NextResponse } from 'next/server';
import GtfsRealtimeBindings from 'gtfs-realtime-bindings';
import { cachedSource } from '@/lib/sourceCache';
import { agencyById, resolveMode, type TransitAgency } from '@/lib/transit/agencies';

/**
 * OSIRIS — Live Transit vehicles: per-agency GTFS-Realtime proxy.
 *
 * Fetches the agency's VehiclePositions protobuf (see the keyless-only
 * config in lib/transit/agencies), parses it server-side, and returns
 * compact JSON. Where the agency also publishes a keyless TripUpdates
 * feed, the next-stop delay is joined in by trip id. Results are cached
 * ~25 s per agency — GTFS-RT feeds republish every 10–30 s, so clients
 * polling faster than that would only re-serve the same snapshot.
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

async function fetchDelays(agency: TransitAgency): Promise<Map<string, number>> {
  const delays = new Map<string, number>();
  if (!agency.tripUpdatesUrl) return delays;
  try {
    const msg = await fetchFeed(agency.tripUpdatesUrl, agency);
    for (const e of msg.entity ?? []) {
      const tu = e.tripUpdate;
      const tripId = tu?.trip?.tripId;
      if (!tripId || delays.has(tripId)) continue;
      for (const stu of tu.stopTimeUpdate ?? []) {
        const d = stu.arrival?.delay ?? stu.departure?.delay;
        if (typeof d === 'number') { delays.set(tripId, d); break; }
      }
    }
  } catch { /* delays are best-effort; positions still serve */ }
  return delays;
}

async function fetchVehicles(agency: TransitAgency): Promise<Vehicle[]> {
  // Delays are best-effort: a slow TripUpdates feed (OVapi's can crawl)
  // must never hold vehicle positions hostage, so it gets an 8 s budget.
  const delaysPromise = Promise.race([
    fetchDelays(agency),
    new Promise<Map<string, number>>(resolve => setTimeout(() => resolve(new Map()), 8000)),
  ]);
  const [msg, delays] = await Promise.all([
    fetchFeed(agency.feedUrl, agency),
    delaysPromise,
  ]);
  const now = Date.now();
  const vehicles: Vehicle[] = [];
  for (const e of msg.entity ?? []) {
    const v = e.vehicle;
    const pos = v?.position;
    if (!v || !pos || typeof pos.latitude !== 'number' || typeof pos.longitude !== 'number') continue;
    const ts = toSeconds(v.timestamp);
    // Feeds carry ghost vehicles long after they stop reporting.
    if (ts != null && now - ts * 1000 > STALE_MS) continue;
    const route = v.trip?.routeId ?? '';
    const tripId = v.trip?.tripId;
    const veh: Vehicle = {
      id: String(v.vehicle?.id ?? e.id ?? ''),
      lat: Math.round(pos.latitude * 100000) / 100000,
      lng: Math.round(pos.longitude * 100000) / 100000,
      route,
      mode: resolveMode(agency, route),
    };
    if (typeof v.trip?.directionId === 'number') veh.dir = v.trip.directionId;
    if (typeof pos.bearing === 'number' && pos.bearing !== 0) veh.bearing = Math.round(pos.bearing);
    if (typeof pos.speed === 'number' && pos.speed > 0) veh.speedKmh = Math.round(pos.speed * 3.6);
    if (v.vehicle?.label) veh.label = v.vehicle.label;
    if (typeof v.currentStatus === 'number') veh.status = v.currentStatus;
    if (typeof v.occupancyStatus === 'number' && v.occupancyStatus >= 1 && v.occupancyStatus <= 6) veh.occ = v.occupancyStatus;
    if (tripId && delays.has(tripId)) veh.delay = delays.get(tripId);
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
      25_000,
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
      { headers: { 'Cache-Control': 'public, s-maxage=25, stale-while-revalidate=30' } },
    );
  } catch {
    return NextResponse.json(
      { agency: agency.id, vehicles: [], count: 0 },
      { status: 200, headers: { 'Cache-Control': 'public, s-maxage=15' } },
    );
  }
}
