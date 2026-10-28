/**
 * Shared helpers for the narrow public tracking endpoints (ferry
 * systems, cruise-port boards). The vessel records come from the
 * maritime feed's in-memory cache (src/app/api/maritime/route.ts,
 * read through its getLiveShipsForTracking seam): each record is
 * what a vessel itself broadcasts on AIS — name, position, speed,
 * heading, destination, AIS type — plus the local time the feed
 * last heard from it. Nothing here invents a field the feed does
 * not carry.
 */

export interface FeedShip {
  mmsi?: number;
  name?: string;
  lat?: number;
  lng?: number;
  /** Speed over ground, knots. */
  speed?: number;
  heading?: number;
  destination?: string;
  /** OSIRIS category from getOsirisShipType ('passenger' = AIS 60-69). */
  type?: string;
  /** Local epoch ms when the feed last heard from this vessel. */
  timestamp?: number;
}

/** The feed's own freshness window: reports older than this are dropped. */
export const FEED_FRESHNESS_MS = 10 * 60 * 1000;

export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const t = (x: number) => (x * Math.PI) / 180;
  const h =
    Math.sin(t(lat2 - lat1) / 2) ** 2 +
    Math.cos(t(lat1)) * Math.cos(t(lat2)) * Math.sin(t(lng2 - lng1) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Public view of one vessel — only fields the vessel itself broadcasts. */
export interface VesselView {
  name: string;
  lat: number;
  lng: number;
  speedKn: number | null;
  heading: number | null;
  destination: string | null;
  /** Seconds since the feed last heard from this vessel. */
  reportAgeSec: number;
}

export function toVesselView(ship: FeedShip, now: number): VesselView | null {
  if (
    typeof ship.lat !== 'number' ||
    typeof ship.lng !== 'number' ||
    typeof ship.timestamp !== 'number' ||
    now - ship.timestamp > FEED_FRESHNESS_MS
  ) {
    return null;
  }
  return {
    name: (ship.name ?? '').trim() || 'Unnamed vessel',
    lat: ship.lat,
    lng: ship.lng,
    speedKn: typeof ship.speed === 'number' ? ship.speed : null,
    heading: typeof ship.heading === 'number' ? ship.heading : null,
    destination: ship.destination?.trim() ? ship.destination.trim() : null,
    reportAgeSec: Math.max(0, Math.round((now - ship.timestamp) / 1000)),
  };
}
