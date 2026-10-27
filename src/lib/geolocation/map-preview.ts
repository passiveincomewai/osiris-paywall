/**
 * Photo Geolocation (Beta) — map preview math (Esri tiles) and the
 * nearby-camera helpers. Pure functions, shared by the result UI and
 * its tests.
 *
 * The preview is a static slippy-map mosaic: a grid of Esri World
 * Imagery tiles (the same source the globe's satellite view uses —
 * audit decision: Esri, never scraped Google tiles) with the candidate
 * point and its uncertainty circle drawn over it. No map library, no
 * tiles key: the tiles are addressed exactly as OsirisMap addresses
 * them.
 */
import { haversine } from "@/lib/geo";

export const ESRI_WORLD_IMAGERY =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

export const TILE_SIZE = 256;
/** Web-Mercator metres per pixel at the equator at zoom 0. */
const MPP_0 = 156543.03392;

export function tileX(lng: number, z: number): number {
  return ((lng + 180) / 360) * 2 ** z;
}

export function tileY(lat: number, z: number): number {
  const rad = (lat * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * 2 ** z;
}

export function metersPerPixel(lat: number, z: number): number {
  return (MPP_0 * Math.cos((lat * Math.PI) / 180)) / 2 ** z;
}

/** Radius (m) → on-screen diameter (px) at a latitude and zoom. */
export function radiusToPixels(radiusM: number, lat: number, z: number): number {
  return (2 * radiusM) / metersPerPixel(lat, z);
}

/**
 * The zoom at which the uncertainty circle fills `fill` of the
 * viewport's smaller dimension — wide enough to read, tight enough to
 * be honest about what "within this circle" means.
 */
export function zoomForRadius(radiusM: number, lat: number, viewportPx = 480, fill = 0.78): number {
  const mppNeeded = (2 * Math.max(radiusM, 25)) / (viewportPx * fill);
  const z = Math.log2((MPP_0 * Math.cos((lat * Math.PI) / 180)) / mppNeeded);
  return Math.min(18, Math.max(3, Math.floor(z)));
}

export interface PlacedTile {
  x: number;
  y: number;
  /** Pixel position of the tile's top-left corner inside the container. */
  left: number;
  top: number;
  url: string;
}

export interface TileGrid {
  tiles: PlacedTile[];
  zoom: number;
  /** Pixel position of the exact centre point inside the container. */
  centerPx: { x: number; y: number };
}

/**
 * The tile mosaic for a centre point in a width×height container.
 * Tiles wrap horizontally (the world repeats) and clamp vertically.
 */
export function tileGrid(lat: number, lng: number, z: number, width: number, height: number): TileGrid {
  const worldPx = 2 ** z * TILE_SIZE;
  const cx = tileX(lng, z) * TILE_SIZE;
  const cy = tileY(lat, z) * TILE_SIZE;
  const originX = cx - width / 2;
  const originY = Math.min(Math.max(cy - height / 2, 0), Math.max(0, worldPx - height));
  const firstTx = Math.floor(originX / TILE_SIZE);
  const firstTy = Math.floor(originY / TILE_SIZE);
  const tiles: PlacedTile[] = [];
  for (let ty = firstTy; ty * TILE_SIZE < originY + height; ty++) {
    if (ty < 0 || ty >= 2 ** z) continue;
    for (let tx = firstTx; tx * TILE_SIZE < originX + width; tx++) {
      const wrapped = ((tx % 2 ** z) + 2 ** z) % 2 ** z;
      tiles.push({
        x: wrapped,
        y: ty,
        left: Math.round(tx * TILE_SIZE - originX),
        top: Math.round(ty * TILE_SIZE - originY),
        url: ESRI_WORLD_IMAGERY.replace('{z}', String(z)).replace('{y}', String(ty)).replace('{x}', String(wrapped)),
      });
    }
  }
  return { tiles, zoom: z, centerPx: { x: Math.round(cx - originX), y: Math.round(cy - originY) } };
}

/** A lat/lng bounding box around a point, for the /api/cctv bbox query. */
export function bboxAround(lat: number, lng: number, radiusKm: number): { west: number; south: number; east: number; north: number } {
  const dLat = radiusKm / 111.32;
  const dLng = radiusKm / (111.32 * Math.max(0.2, Math.cos((lat * Math.PI) / 180)));
  return {
    west: Math.max(-180, lng - dLng),
    south: Math.max(-90, lat - dLat),
    east: Math.min(180, lng + dLng),
    north: Math.min(90, lat + dLat),
  };
}

export interface NearbyCamera {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
  distanceKm: number;
}

/** The nearest catalogue records to a point, nearest first. */
export function nearestCameras(
  cameras: Array<Record<string, unknown>>,
  lat: number,
  lng: number,
  limit = 6,
  maxKm = 25,
): NearbyCamera[] {
  const found: NearbyCamera[] = [];
  for (const cam of cameras) {
    const cLat = typeof cam.lat === 'number' ? cam.lat : Number(cam.lat);
    const cLng = typeof cam.lng === 'number' ? cam.lng : Number(cam.lng);
    if (!Number.isFinite(cLat) || !Number.isFinite(cLng)) continue;
    const distanceKm = haversine([lng, lat], [cLng, cLat]);
    if (distanceKm > maxKm) continue;
    found.push({
      id: String(cam.id ?? ''),
      name: typeof cam.name === 'string' && cam.name.trim() ? cam.name.trim() : 'Live camera',
      city: typeof cam.city === 'string' && cam.city.trim() ? cam.city.trim() : null,
      country: typeof cam.country === 'string' && cam.country.trim() ? cam.country.trim() : null,
      distanceKm: Math.round(distanceKm * 10) / 10,
    });
  }
  return found
    .filter(c => c.id)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, limit);
}
