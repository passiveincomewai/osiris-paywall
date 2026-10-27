/**
 * OSIRIS — Street Level: viewport bbox parsing + guard.
 *
 * Same bbox contract as the other viewport routes' guards (west,south,
 * east, north; finite; ordered; inside the world) with the tighter span cap
 * street-level queries are designed for. A bbox that fails the guard is
 * a client error (400), never an empty success.
 */
import { STREET_LEVEL_MAX_SPAN_DEG } from './types';

export interface LngLatBbox {
  west: number;
  south: number;
  east: number;
  north: number;
}

export function bboxUsable(b: LngLatBbox): boolean {
  const spanLng = Math.abs(b.east - b.west);
  const spanLat = Math.abs(b.north - b.south);
  return (
    Number.isFinite(spanLng + spanLat) &&
    spanLng > 0 && spanLat > 0 &&
    spanLng <= STREET_LEVEL_MAX_SPAN_DEG && spanLat <= STREET_LEVEL_MAX_SPAN_DEG &&
    b.west >= -180 && b.east <= 180 && b.south >= -90 && b.north <= 90 &&
    b.west < b.east && b.south < b.north
  );
}

/** Parse a `west,south,east,north` query value; null when unusable. */
export function parseBboxParam(raw: string | null | undefined): LngLatBbox | null {
  if (!raw) return null;
  const parts = raw.split(',').map((v) => Number(v));
  if (parts.length !== 4) return null;
  const [west, south, east, north] = parts;
  const bbox = { west, south, east, north };
  return bboxUsable(bbox) ? bbox : null;
}

export function bboxContains(b: LngLatBbox, lng: number, lat: number): boolean {
  return lng >= b.west && lng <= b.east && lat >= b.south && lat <= b.north;
}

/**
 * Cache key for a viewport: the bbox rounded to ~0.01° cells. Nearby
 * pans share a cache entry; the server fetches a margined area and
 * filters back to the exact request bbox, so sharing never shows
 * pictures from outside the area asked for.
 */
export function bboxCacheKey(b: LngLatBbox): string {
  const q = (v: number) => Math.round(v * 100) / 100;
  return `${q(b.west)},${q(b.south)},${q(b.east)},${q(b.north)}`;
}

/** Grow a bbox by a fraction of its own span on every side (clamped to
 *  the world) — the fetch margin behind bboxCacheKey. */
export function expandBbox(b: LngLatBbox, fraction: number): LngLatBbox {
  const dx = (b.east - b.west) * fraction;
  const dy = (b.north - b.south) * fraction;
  return {
    west: Math.max(-180, b.west - dx),
    south: Math.max(-90, b.south - dy),
    east: Math.min(180, b.east + dx),
    north: Math.min(90, b.north + dy),
  };
}
