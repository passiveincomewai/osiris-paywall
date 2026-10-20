/**
 * OSIRIS — the cameras a plotted route actually passes.
 *
 * Pure corridor math over the client-side catalogue: a camera counts
 * when it sits within ROUTE_CAMERA_CORRIDOR_M of the route polyline
 * (point-to-segment distance, so a camera near a corner is measured
 * against both legs), and results come back in the order the driver
 * meets them — distance along the route, start to destination.
 *
 * Only cameras the preview machinery can actually show are returned
 * (lib/camera-preview): the strip this feeds promises live feeds, so
 * a record with no playable media is not a feed and does not inflate
 * the count the locked teaser quotes either. Distances are computed
 * in a local equirectangular frame, the same approximation
 * lib/navigation uses for its progress maths.
 */

import { previewMedia, type PreviewKind } from './camera-preview';

/** How far off the line a camera may sit and still be "on this route". */
export const ROUTE_CAMERA_CORRIDOR_M = 1500;
/** Feeds the strip renders at most — beyond this the panel is a phone book. */
export const ROUTE_CAMERA_CAP = 24;

export interface RouteCamera {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
  source: string | null;
  lat: number;
  lng: number;
  media: { kind: PreviewKind; url: string };
  /** Perpendicular distance from the route line, metres. */
  distanceFromRouteM: number;
  /** Distance from the route's start to the nearest point on the line, metres. */
  alongRouteM: number;
}

/** The catalogue fields this module reads; records arrive loosely typed. */
export interface RouteCameraCandidate {
  id?: unknown;
  name?: unknown;
  city?: unknown;
  country?: unknown;
  source?: unknown;
  lat?: unknown;
  lng?: unknown;
  stream_type?: string;
  feed_url?: string;
  stream_url?: string;
  external_url?: string;
}

const R = 6371000;
const P = Math.PI / 180;

function cleanLabel(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

function cleanCoord(v: unknown): number | null {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
}

/**
 * Distance from a point to one segment, and how far along the route
 * the closest point on that segment sits. All in metres, in the
 * segment's own local frame.
 */
export function pointToSegment(
  lat: number,
  lng: number,
  a: [number, number],
  b: [number, number],
  alongStartM: number,
): { distanceM: number; alongM: number } {
  const midLat = (a[1] + b[1]) / 2;
  const mx = Math.cos(midLat * P) * R * P;
  const my = R * P;
  const ax = a[0] * mx;
  const ay = a[1] * my;
  const bx = b[0] * mx;
  const by = b[1] * my;
  const px = lng * mx;
  const py = lat * my;
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  const segLen = Math.sqrt(lenSq);
  // Degenerate segment (a duplicated vertex): the point's distance to
  // the vertex is the whole answer, at the vertex's own along mark.
  if (segLen === 0) {
    return { distanceM: Math.hypot(px - ax, py - ay), alongM: alongStartM };
  }
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return { distanceM: Math.hypot(px - cx, py - cy), alongM: alongStartM + t * segLen };
}

/** Segment lengths + cumulative marks for a [lng, lat] polyline. */
function segmentFrame(coords: [number, number][]): { lengths: number[]; cumulative: number[] } {
  const lengths: number[] = [];
  const cumulative: number[] = [0];
  for (let i = 0; i < coords.length - 1; i++) {
    const a = coords[i];
    const b = coords[i + 1];
    const midLat = (a[1] + b[1]) / 2;
    const mx = Math.cos(midLat * P) * R * P;
    const my = R * P;
    const len = Math.hypot((b[0] - a[0]) * mx, (b[1] - a[1]) * my);
    lengths.push(len);
    cumulative.push(cumulative[i] + len);
  }
  return { lengths, cumulative };
}

/**
 * Every previewable catalogue camera within the corridor, in the
 * order the route meets them. Uncapped — the caller decides how many
 * to render (ROUTE_CAMERA_CAP) and may quote the full length as the
 * route's camera count.
 */
export function findRouteCameras(
  cameras: readonly RouteCameraCandidate[] | undefined | null,
  coords: readonly [number, number][] | undefined | null,
  corridorM: number = ROUTE_CAMERA_CORRIDOR_M,
): RouteCamera[] {
  if (!cameras?.length || !coords || coords.length < 2) return [];
  const { cumulative } = segmentFrame(coords as [number, number][]);
  const byId = new Map<string, RouteCamera>();

  for (const cam of cameras) {
    const idRaw = cam?.id;
    if (typeof idRaw !== 'string' && typeof idRaw !== 'number') continue;
    const id = String(idRaw).trim();
    if (!id) continue;
    const lat = cleanCoord(cam.lat);
    const lng = cleanCoord(cam.lng);
    if (lat == null || lng == null) continue;
    const media = previewMedia(cam);
    if (!media) continue;

    let best: { distanceM: number; alongM: number } | null = null;
    for (let i = 0; i < coords.length - 1; i++) {
      const hit = pointToSegment(lat, lng, coords[i], coords[i + 1], cumulative[i]);
      if (!best || hit.distanceM < best.distanceM) best = hit;
    }
    if (!best || best.distanceM > corridorM) continue;

    const entry: RouteCamera = {
      id,
      name: cleanLabel(cam.name) ?? id,
      city: cleanLabel(cam.city),
      country: cleanLabel(cam.country),
      source: cleanLabel(cam.source),
      lat,
      lng,
      media,
      distanceFromRouteM: Math.round(best.distanceM),
      alongRouteM: Math.round(best.alongM),
    };
    const held = byId.get(id);
    if (!held || entry.distanceFromRouteM < held.distanceFromRouteM) byId.set(id, entry);
  }

  return [...byId.values()].sort((a, b) => a.alongRouteM - b.alongRouteM || a.distanceFromRouteM - b.distanceFromRouteM);
}

/** The feeds a route panel should render: corridor matches, capped. */
export function camerasAlongRoute(
  cameras: readonly RouteCameraCandidate[] | undefined | null,
  coords: readonly [number, number][] | undefined | null,
  corridorM: number = ROUTE_CAMERA_CORRIDOR_M,
  cap: number = ROUTE_CAMERA_CAP,
): RouteCamera[] {
  return findRouteCameras(cameras, coords, corridorM).slice(0, cap);
}
