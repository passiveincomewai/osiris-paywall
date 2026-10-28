/**
 * Matching tracked ships to the live AIS feed, and shaping the result
 * for display. Pure functions — the feed entries are the cache records
 * written by src/app/api/maritime/route.ts.
 *
 * Honesty rules baked in here:
 * - Identity is MMSI first, AIS broadcast name second. Never position.
 * - A report older than LIVE_WINDOW_MS is NOT a live position: the
 *   maritime route drops ships at the same 10-minute cutoff, and this
 *   layer double-guards it, so a stale record can never be dressed up
 *   as "where the ship is now".
 * - AIS sentinel values are not data: heading 511 means "not
 *   available", speed 102.3 kn means "not available". Both become null.
 */

import type { TrackedShip } from "./registry";

/** Shape of one record in the maritime route's ships cache. */
export interface FeedShip {
  mmsi?: number;
  name?: string;
  lat?: number;
  lng?: number;
  speed?: number;
  heading?: number;
  destination?: string;
  type?: string;
  timestamp?: number;
}

export const LIVE_WINDOW_MS = 10 * 60 * 1000;

export type ShipLiveView =
  | {
      status: "live";
      /** The name the ship is broadcasting (falls back to registry name). */
      name: string;
      lat: number;
      lng: number;
      speedKnots: number | null;
      headingDeg: number | null;
      headingPoint: string | null;
      /** Destination exactly as broadcast by the ship, or null. */
      destination: string | null;
      /** ISO timestamp of the ship's last report in the feed. */
      reportedAt: string;
      ageSeconds: number;
    }
  | { status: "not-reporting" };

export const NOT_REPORTING: ShipLiveView = { status: "not-reporting" };

/** AIS names arrive padded and in inconsistent case; compare canonically. */
export function normalizeShipName(name: string): string {
  return name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

const COMPASS_POINTS = [
  "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
  "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW",
] as const;

/** 16-point compass label for a heading in degrees, or null if invalid. */
export function compassPoint(headingDeg: number): string | null {
  if (!Number.isFinite(headingDeg) || headingDeg < 0 || headingDeg >= 360) {
    return null;
  }
  return COMPASS_POINTS[Math.round(headingDeg / 22.5) % 16];
}

function saneHeading(raw: number | undefined): number | null {
  if (raw === undefined || !Number.isFinite(raw)) return null;
  // AIS: 511 = heading not available. Anything >= 360 is not a heading.
  if (raw < 0 || raw >= 360) return null;
  return raw;
}

function saneSpeed(raw: number | undefined): number | null {
  if (raw === undefined || !Number.isFinite(raw)) return null;
  // AIS SOG: 102.3 kn is the "not available" sentinel, not a speed.
  if (raw < 0 || raw >= 102.3) return null;
  return Math.round(raw * 10) / 10;
}

function toView(ship: TrackedShip, feed: FeedShip, now: number): ShipLiveView {
  if (feed.lat === undefined || feed.lng === undefined) return NOT_REPORTING;
  if (!Number.isFinite(feed.lat) || !Number.isFinite(feed.lng)) return NOT_REPORTING;
  const ts = feed.timestamp ?? 0;
  if (now - ts > LIVE_WINDOW_MS) return NOT_REPORTING;
  const headingDeg = saneHeading(feed.heading);
  return {
    status: "live",
    name: feed.name?.trim() || ship.name,
    lat: feed.lat,
    lng: feed.lng,
    speedKnots: saneSpeed(feed.speed),
    headingDeg,
    headingPoint: headingDeg === null ? null : compassPoint(headingDeg),
    destination: feed.destination?.trim() ? feed.destination.trim() : null,
    reportedAt: new Date(ts).toISOString(),
    ageSeconds: Math.max(0, Math.round((now - ts) / 1000)),
  };
}

/**
 * Find a tracked ship in the feed. MMSI is the identity; the broadcast
 * name is only a fallback for a feed record whose MMSI is missing or
 * recorded differently. A stale chosen record yields "not-reporting" —
 * never a fallback to some other vessel that happens to share the name.
 */
export function matchShipToFeed(
  ship: TrackedShip,
  feed: FeedShip[],
  now: number,
): ShipLiveView {
  const byMmsi = feed.find((f) => f.mmsi === ship.mmsi);
  if (byMmsi) return toView(ship, byMmsi, now);

  const wanted = new Set(ship.aisNames.map(normalizeShipName));
  const byName = feed.find(
    (f) => f.name !== undefined && wanted.has(normalizeShipName(f.name)),
  );
  if (byName) return toView(ship, byName, now);

  return NOT_REPORTING;
}

/** "25.7617° N, 80.1918° W" — coordinates as text, hemisphere-labelled. */
export function formatCoordinates(lat: number, lng: number): string {
  const la = `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? "N" : "S"}`;
  const lo = `${Math.abs(lng).toFixed(4)}° ${lng >= 0 ? "E" : "W"}`;
  return `${la}, ${lo}`;
}

/** "12 min ago" / "just now" — for the live card's freshness line. */
export function formatAge(ageSeconds: number): string {
  if (ageSeconds < 45) return "just now";
  const minutes = Math.round(ageSeconds / 60);
  if (minutes <= 1) return "1 min ago";
  return `${minutes} min ago`;
}
