/**
 * White Label demo generator — the shared logic behind /white-label/demo.
 *
 * A prospect picks a location and sees an ILLUSTRATIVE branded preview:
 * their name/logo over a wall of cameras near that location. Two honesty
 * rules shape everything here:
 *
 *  1. The camera pool is ONLY the public-embed eligible set
 *     (src/lib/embed/public — the rights registry's redistribution
 *     verdict plus the playable check). A white-label preview may never
 *     show a camera WorldEye couldn't actually redistribute.
 *  2. Locations are derived from real data — cities grouped from that
 *     same eligible set, plus the ski-resort dataset (src/lib/ski-resorts)
 *     — and a location is only offered when at least one eligible camera
 *     sits within the preview radius of it. No invented places, no
 *     invented counts.
 *
 * Server-only (imports the resort dataset + node crypto); the pure
 * helpers are unit-tested directly.
 */
import { randomBytes } from "node:crypto";
import type { PublicEmbedCamera } from "@/lib/embed/public";
import { SKI_RESORTS } from "@/lib/ski-resorts";
import {
  WHITE_LABEL_PREVIEW_ORG_MIN,
  WHITE_LABEL_PREVIEW_ORG_MAX,
} from "@/lib/white-label";

/** How far from the picked location a camera may sit and still appear. */
export const PREVIEW_RADIUS_KM = 50;
/** Wall size: enough to feel like a portal, few enough to stay fast. */
export const PREVIEW_CAMERA_LIMIT = 12;
/** Organisation name bounds for a preview — the values live in
 *  client-safe src/lib/white-label; aliased here for server use. */
export const PREVIEW_ORG_NAME_MIN = WHITE_LABEL_PREVIEW_ORG_MIN;
export const PREVIEW_ORG_NAME_MAX = WHITE_LABEL_PREVIEW_ORG_MAX;

export interface DemoLocation {
  /** Stable id the create call posts back: "city:…" or "resort:<slug>". */
  id: string;
  kind: "city" | "resort";
  /** "Park City" / "Alta Ski Area" */
  label: string;
  /** "United States" / "Little Cottonwood Canyon, Utah, United States" */
  detail: string;
  lat: number;
  lng: number;
  /** Eligible cameras within the preview radius (the wall itself
   *  shows the nearest PREVIEW_CAMERA_LIMIT of them). */
  cameraCount: number;
}

export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

function hasCoords(cam: PublicEmbedCamera): boolean {
  return Number.isFinite(cam.lat) && Number.isFinite(cam.lng) && !(cam.lat === 0 && cam.lng === 0);
}

/* ── Coarse grid over the eligible set ───────────────────────────────────
 * The eligible catalogue is ~80k cameras; building the location index
 * naively (every city × every camera) would be far too slow. Cameras are
 * bucketed into 0.5° cells once, and a radius query only haversine-checks
 * the cells its bounding box overlaps. */
const CELL_DEG = 0.5;
type CamGrid = Map<string, PublicEmbedCamera[]>;

function cellKey(lat: number, lng: number): string {
  return `${Math.floor(lat / CELL_DEG)}:${Math.floor(lng / CELL_DEG)}`;
}

function buildGrid(cameras: PublicEmbedCamera[]): CamGrid {
  const grid: CamGrid = new Map();
  for (const cam of cameras) {
    if (!hasCoords(cam)) continue;
    const key = cellKey(cam.lat, cam.lng);
    const cell = grid.get(key);
    if (cell) cell.push(cam);
    else grid.set(key, [cam]);
  }
  return grid;
}

function candidatesNear(
  grid: CamGrid,
  lat: number,
  lng: number,
  radiusKm: number,
): PublicEmbedCamera[] {
  const dLat = radiusKm / 111;
  const cos = Math.max(0.2, Math.cos((lat * Math.PI) / 180));
  const dLng = radiusKm / (111 * cos);
  const out: PublicEmbedCamera[] = [];
  const x0 = Math.floor((lat - dLat) / CELL_DEG);
  const x1 = Math.floor((lat + dLat) / CELL_DEG);
  const y0 = Math.floor((lng - dLng) / CELL_DEG);
  const y1 = Math.floor((lng + dLng) / CELL_DEG);
  for (let x = x0; x <= x1; x++) {
    for (let y = y0; y <= y1; y++) {
      const cell = grid.get(`${x}:${y}`);
      if (cell) out.push(...cell);
    }
  }
  return out;
}

function countNear(grid: CamGrid, lat: number, lng: number, radiusKm: number): number {
  const here = { lat, lng };
  let n = 0;
  for (const cam of candidatesNear(grid, lat, lng, radiusKm)) {
    if (haversineKm(here, cam) <= radiusKm) n++;
  }
  return n;
}

/**
 * Cameras for one preview: eligible cameras within `radiusKm` of the
 * point, nearest first (name breaks ties), capped at `limit`. Cameras
 * without real coordinates never appear — a wall slot must be a place.
 */
export function selectPreviewCameras(
  cameras: PublicEmbedCamera[],
  lat: number,
  lng: number,
  radiusKm: number = PREVIEW_RADIUS_KM,
  limit: number = PREVIEW_CAMERA_LIMIT,
): PublicEmbedCamera[] {
  const here = { lat, lng };
  return candidatesNear(buildGrid(cameras), lat, lng, radiusKm)
    .map((cam) => ({ cam, d: haversineKm(here, cam) }))
    .filter(({ d }) => d <= radiusKm)
    .sort((x, y) => x.d - y.d || x.cam.name.localeCompare(y.cam.name))
    .slice(0, limit)
    .map(({ cam }) => cam);
}

function cityId(city: string, country: string): string {
  const slug = `${city}-${country}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `city:${slug || "unknown"}`;
}

/**
 * The searchable location index. Cities come from the eligible cameras
 * themselves (grouped by city+country, centroid of their coordinates);
 * resorts come from the ski dataset. A location is listed only when a
 * preview built on it would show at least one camera.
 */
export function buildDemoLocations(cameras: PublicEmbedCamera[]): DemoLocation[] {
  const grid = buildGrid(cameras);
  const groups = new Map<string, { city: string; country: string; pts: { lat: number; lng: number }[] }>();
  for (const cam of cameras) {
    if (!hasCoords(cam)) continue;
    const city = (cam.city ?? "").trim();
    if (!city) continue;
    const country = (cam.country ?? "").trim();
    const key = `${city.toLowerCase()}|${country.toLowerCase()}`;
    const g = groups.get(key) ?? { city, country, pts: [] };
    g.pts.push({ lat: cam.lat, lng: cam.lng });
    groups.set(key, g);
  }

  const out: DemoLocation[] = [];
  for (const g of groups.values()) {
    const lat = g.pts.reduce((s, p) => s + p.lat, 0) / g.pts.length;
    const lng = g.pts.reduce((s, p) => s + p.lng, 0) / g.pts.length;
    const cameraCount = countNear(grid, lat, lng, PREVIEW_RADIUS_KM);
    if (cameraCount === 0) continue;
    out.push({
      id: cityId(g.city, g.country),
      kind: "city",
      label: g.city,
      detail: g.country,
      lat,
      lng,
      cameraCount,
    });
  }

  for (const r of SKI_RESORTS) {
    const cameraCount = countNear(grid, r.lat, r.lng, PREVIEW_RADIUS_KM);
    if (cameraCount === 0) continue;
    const detail = [r.town, r.region, r.country].filter(Boolean).join(", ");
    out.push({
      id: `resort:${r.slug}`,
      kind: "resort",
      label: r.name,
      detail,
      lat: r.lat,
      lng: r.lng,
      cameraCount,
    });
  }

  return out.sort((a, b) => a.label.localeCompare(b.label));
}

/* The index build walks the whole eligible set; cache it against the
 * (already 5-minute-cached) eligible list's identity. */
let locationCache: { src: PublicEmbedCamera[]; list: DemoLocation[] } | null = null;

export function getDemoLocations(cameras: PublicEmbedCamera[]): DemoLocation[] {
  if (locationCache && locationCache.src === cameras) return locationCache.list;
  const list = buildDemoLocations(cameras);
  locationCache = { src: cameras, list };
  return list;
}

/** Ranked substring search over the index: label prefix beats label
 *  substring beats detail substring; bigger camera sets win ties. */
export function searchDemoLocations(
  locations: DemoLocation[],
  q: string,
  limit = 8,
): DemoLocation[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return [];
  const tier = (loc: DemoLocation): number => {
    const label = loc.label.toLowerCase();
    if (label.startsWith(needle)) return 0;
    if (label.includes(needle)) return 1;
    if (loc.detail.toLowerCase().includes(needle)) return 2;
    return 3;
  };
  return locations
    .filter((loc) => tier(loc) < 3)
    .sort(
      (a, b) =>
        tier(a) - tier(b) ||
        b.cameraCount - a.cameraCount ||
        a.label.localeCompare(b.label),
    )
    .slice(0, limit);
}

export function findDemoLocation(
  locations: DemoLocation[],
  id: string,
): DemoLocation | null {
  return locations.find((l) => l.id === id) ?? null;
}

/**
 * The cameras a stored preview shows TODAY: the stored id list filtered
 * through the current eligible set (order preserved). A camera that has
 * lost clearance or left the catalogue drops out silently — the preview
 * can shrink, never leak.
 */
export function resolvePreviewCameras(
  eligible: PublicEmbedCamera[],
  storedIds: string[],
): PublicEmbedCamera[] {
  const byId = new Map(eligible.map((c) => [c.id, c]));
  const out: PublicEmbedCamera[] = [];
  for (const id of storedIds) {
    const cam = byId.get(id);
    if (cam) out.push(cam);
  }
  return out;
}

const SLUG_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

/** Unguessable share token for a preview URL (16 chars, ~79 bits). */
export function makePreviewSlug(): string {
  const bytes = randomBytes(16);
  let slug = "";
  for (const b of bytes) slug += SLUG_ALPHABET[b % SLUG_ALPHABET.length];
  return slug;
}

/** Normalize + bound an organisation name for a preview. */
export function parsePreviewOrgName(raw: unknown): string | null {
  const name = String(raw ?? "").trim().replace(/\s+/g, " ");
  if (name.length < PREVIEW_ORG_NAME_MIN || name.length > PREVIEW_ORG_NAME_MAX) {
    return null;
  }
  return name;
}
