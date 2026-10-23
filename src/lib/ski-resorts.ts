/**
 * OSIRIS — ski resort pages: which resorts have pages, and which cameras
 * belong to each.
 *
 * The resort list is generated (tools/build-ski-resorts.mjs →
 * src/data/ski-resorts.json) from the same per-country camera chunks the
 * country pages serve: a resort earns a page only when the served
 * catalogue holds at least one camera within RESORT_RADIUS_KM of its base
 * and at least four within NEARBY_RADIUS_KM, and its counts are computed
 * there, never hand-written. This module holds the dataset types, the
 * pure selection geometry (radius + route corridor) the pages and the
 * route-cameras API share, and the server-side record loader.
 */
import type { CountryCamera } from './country-cameras';
import { dedupeCountryCameras, sortWorkingFeedsFirst } from './country-cameras';
import resortsData from '@/data/ski-resorts.json';

export interface SkiResort {
  slug: string;
  name: string;
  town: string;
  region: string;
  country: string;
  /** Slug of the per-country catalogue chunk this resort's cameras live in. */
  countrySlug: string;
  lat: number;
  lng: number;
  /** Cameras within RESORT_RADIUS_KM, counted by the generator. */
  resortCameraCount: number;
  /** Cameras between RESORT_RADIUS_KM and NEARBY_RADIUS_KM, same source. */
  nearbyCameraCount: number;
}

/** A resort's own cameras: slopes, base areas and the resort town. */
export const RESORT_RADIUS_KM = 10;
/** "Nearby" for traffic/access cameras around a resort. */
export const NEARBY_RADIUS_KM = 40;
/**
 * Route corridor half-width: a camera counts as "on your route" when it
 * sits within this distance of the road the router actually chose. Wide
 * enough to catch the DOT cameras at the interchanges and canyon mouths a
 * driver passes, narrow enough to leave parallel-valley cameras out.
 */
export const ROUTE_CORRIDOR_KM = 2.5;

/**
 * A snow-stake camera: the measuring-stake feeds skiers actually plan
 * around ("how much fell overnight?"). Matched on the camera's own
 * name/label — operators name them plainly ("Alta Snow Stake",
 * "Snow Stake — SR-210"). Name-only on purpose: a stake is a labelled
 * instrument, and guessing from position would mislabel slope cams.
 */
const SNOW_STAKE_PATTERN = /snow[-\s]?stake/i;

export function isSnowStakeCamera(cam: CountryCamera): boolean {
  return SNOW_STAKE_PATTERN.test(cam.name ?? '');
}

export const SKI_RESORTS: SkiResort[] = (resortsData as { resorts: SkiResort[] }).resorts;
export const SKI_DATASET_GENERATED_AT: string = (resortsData as { generatedAt: string }).generatedAt;

export function getSkiResort(slug: string): SkiResort | undefined {
  return SKI_RESORTS.find(r => r.slug === slug);
}

/** URL slug for a resort name — the generator slugifies the same way. */
export function skiResortSlug(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const EARTH_RADIUS_KM = 6371;

export function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(s));
}

function hasCoords(cam: CountryCamera): cam is CountryCamera & { lat: number; lng: number } {
  return typeof cam.lat === 'number' && typeof cam.lng === 'number';
}

export interface ResortCameras {
  /** Within RESORT_RADIUS_KM of the base, nearest first. */
  resort: CountryCamera[];
  /** Between the two radii, nearest first — access roads and the valley towns. */
  nearby: CountryCamera[];
}

/**
 * Split one country's records into a resort's own cameras and its nearby
 * ring. Records without coordinates cannot be placed and take no part.
 * Deduped with the country pages' own rule so a resort page and its
 * country page never disagree about a doubled record.
 */
export function selectResortCameras(records: readonly CountryCamera[], resort: SkiResort): ResortCameras {
  const placed: { cam: CountryCamera; d: number }[] = [];
  for (const cam of dedupeCountryCameras(records.filter(hasCoords))) {
    const d = haversineKm(resort.lat, resort.lng, cam.lat as number, cam.lng as number);
    if (d <= NEARBY_RADIUS_KM) placed.push({ cam, d });
  }
  placed.sort((a, b) => a.d - b.d);
  /* Working feeds first within each list (stable — nearest-first order
     survives inside each playability tier). */
  const resortCams = sortWorkingFeedsFirst(
    placed.filter(p => p.d <= RESORT_RADIUS_KM).map(p => p.cam),
  );
  const nearbyCams = sortWorkingFeedsFirst(
    placed.filter(p => p.d > RESORT_RADIUS_KM).map(p => p.cam),
  );
  /* Snow stakes lead the resort's own grid: the stake is the overnight
     snowfall answer, so it pins ahead of even a nearer slope cam (the
     tier order is preserved inside the stake group and the rest). */
  return {
    resort: [
      ...resortCams.filter(isSnowStakeCamera),
      ...resortCams.filter(c => !isSnowStakeCamera(c)),
    ],
    nearby: nearbyCams,
  };
}

/* ------------------------------------------------------------------ */
/* Route corridor                                                      */
/* ------------------------------------------------------------------ */

export interface RouteCamera {
  cam: CountryCamera;
  /** Kilometres along the route at the camera's closest approach. */
  alongKm: number;
  /** Kilometres from the camera to the route line at that point. */
  offKm: number;
}

/**
 * Project a point onto a route polyline in a local equirectangular frame
 * centred on the point (accurate at corridor scale). Returns the
 * along-route distance and the off-route distance of the closest point.
 * Route coordinates are [lng, lat] pairs, the directions API's shape.
 */
export function projectOntoRoute(
  lat: number,
  lng: number,
  route: readonly (readonly [number, number])[],
): { alongKm: number; offKm: number } | null {
  if (route.length === 0) return null;
  const kx = (Math.PI / 180) * EARTH_RADIUS_KM * Math.cos((lat * Math.PI) / 180);
  const ky = (Math.PI / 180) * EARTH_RADIUS_KM;
  const px = (x: number) => (x - lng) * kx;
  const py = (y: number) => (y - lat) * ky;

  let best: { alongKm: number; offKm: number } | null = null;
  let travelled = 0;
  for (let i = 0; i < route.length; i++) {
    const [x1, y1] = [px(route[i][0]), py(route[i][1])];
    if (i === route.length - 1) {
      const d = Math.hypot(x1, y1);
      if (!best || d < best.offKm) best = { alongKm: travelled, offKm: d };
      break;
    }
    const [x2, y2] = [px(route[i + 1][0]), py(route[i + 1][1])];
    const dx = x2 - x1;
    const dy = y2 - y1;
    const segLen = Math.hypot(dx, dy);
    /* The point sits at the local origin; t is where its projection
       falls along this segment, clamped to the segment's ends. */
    const t = segLen === 0 ? 0 : Math.min(1, Math.max(0, -(x1 * dx + y1 * dy) / (segLen * segLen)));
    const off = Math.hypot(x1 + t * dx, y1 + t * dy);
    if (!best || off < best.offKm) best = { alongKm: travelled + t * segLen, offKm: off };
    travelled += segLen;
  }
  return best;
}

/**
 * Every camera within the corridor of a route, ordered by progress along
 * the route (the order a driver meets them), each carrying its
 * along-route and off-route distances. The same physical camera reported
 * twice at the same spot is collapsed by the country dedupe rule first.
 */
export function selectRouteCameras(
  records: readonly CountryCamera[],
  route: readonly (readonly [number, number])[],
  corridorKm: number = ROUTE_CORRIDOR_KM,
): RouteCamera[] {
  const out: RouteCamera[] = [];
  for (const cam of dedupeCountryCameras(records.filter(hasCoords))) {
    const p = projectOntoRoute(cam.lat as number, cam.lng as number, route);
    if (p && p.offKm <= corridorKm) out.push({ cam, alongKm: p.alongKm, offKm: p.offKm });
  }
  return out.sort((a, b) => a.alongKm - b.alongKm);
}

/* ------------------------------------------------------------------ */
/* Server-side record loading (the country chunks, cached per slug)    */
/* ------------------------------------------------------------------ */

const chunkCache = new Map<string, Promise<CountryCamera[]>>();

/** One country's catalogue records — the same chunks the country pages
 *  and /api/cctv/country serve, loaded identically. */
export function loadCountryChunk(countrySlug: string): Promise<CountryCamera[]> {
  let pending = chunkCache.get(countrySlug);
  if (!pending) {
    pending = import(`@/data/countries/${countrySlug}.json`).then(
      mod => ((mod as { default?: unknown }).default ?? mod) as CountryCamera[],
    );
    chunkCache.set(countrySlug, pending);
  }
  return pending;
}
