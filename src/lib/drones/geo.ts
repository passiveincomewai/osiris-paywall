/**
 * WorldEye — Live Drone Tracking: pure geometry helpers.
 * Client-safe (no node imports) — used by the map for coverage rendering
 * and by tests. Coordinates are [lng, lat] unless named otherwise.
 */

export interface LngLatBounds {
  west: number;
  south: number;
  east: number;
  north: number;
}

const EARTH_R_M = 6_371_000;

export function haversineM(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_R_M * Math.asin(Math.min(1, Math.sqrt(s)));
}

/** Polygon approximating a circle of radiusM around a point (for coverage fill). */
export function circlePolygon(
  lng: number,
  lat: number,
  radiusM: number,
  steps = 48,
): [number, number][] {
  const pts: [number, number][] = [];
  const dLat = (radiusM / EARTH_R_M) * (180 / Math.PI);
  const dLng = dLat / Math.max(0.2, Math.cos((lat * Math.PI) / 180));
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * 2 * Math.PI;
    pts.push([lng + dLng * Math.cos(t), lat + dLat * Math.sin(t)]);
  }
  return pts;
}

/**
 * Is any part of this viewport inside live receiver coverage?
 * "Covered" means at least one active receiver whose detection circle
 * intersects the viewport — the honest test behind the UI's
 * "no receiver coverage here" state.
 */
export function viewportCovered(
  bounds: LngLatBounds,
  receivers: { lat: number; lng: number; radiusM: number; active: boolean }[],
): boolean {
  const center = { lat: (bounds.south + bounds.north) / 2, lng: (bounds.west + bounds.east) / 2 };
  for (const r of receivers) {
    if (!r.active) continue;
    // Distance from the receiver to the closest point of the viewport.
    const nearLat = Math.min(bounds.north, Math.max(bounds.south, r.lat));
    const nearLng = Math.min(bounds.east, Math.max(bounds.west, r.lng));
    if (haversineM(r, { lat: nearLat, lng: nearLng }) <= r.radiusM) return true;
    // Viewport fully inside the circle also counts (center check).
    if (haversineM(r, center) <= r.radiusM) return true;
  }
  return false;
}
