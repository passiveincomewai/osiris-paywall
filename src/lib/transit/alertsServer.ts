import GtfsRealtimeBindings from 'gtfs-realtime-bindings';
import { cachedSource } from '@/lib/sourceCache';
import type { TransitAgency } from './agencies';
import { parseAlerts, type ServiceAlert } from './alerts';
import { networkFor } from './network';

/**
 * OSIRIS — service-alerts fetch for agencies with a keyless GTFS-RT
 * Alert feed (UTA today). Decoded server-side, route ids resolved to
 * public numbers through the agency's static network, cached 60 s via
 * the shared source cache (alerts change on the order of minutes;
 * vehicles keep their own 8 s cadence and never wait on this).
 */

const { FeedMessage } = GtfsRealtimeBindings.transit_realtime;
const UA = { 'User-Agent': 'OSIRIS-Intelligence-Platform/3.5' };

async function fetchAlerts(agency: TransitAgency): Promise<ServiceAlert[]> {
  if (!agency.alertsUrl) return [];
  const res = await fetch(agency.alertsUrl, {
    headers: { ...UA, ...(agency.headers ?? {}) },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`GTFS-RT alerts ${res.status}`);
  const msg = FeedMessage.decode(new Uint8Array(await res.arrayBuffer()));
  let shortByRouteId = new Map<string, string>();
  if (agency.staticGtfsUrl) {
    try {
      const net = await networkFor(agency.id, agency.staticGtfsUrl);
      shortByRouteId = new Map(net.routes.map(r => [r.id, r.short]));
    } catch { /* alerts still serve; routes stay as internal ids in routeIds only */ }
  }
  return parseAlerts(msg, shortByRouteId);
}

/** Cached alerts for an agency ([] when it publishes no Alert feed). */
export async function alertsForAgency(agency: TransitAgency): Promise<ServiceAlert[]> {
  if (!agency.alertsUrl) return [];
  return cachedSource<ServiceAlert>(
    `transit-alerts:${agency.id}`,
    () => fetchAlerts(agency),
    60_000,
  )();
}
