/**
 * WorldEye — Traffic: road network extraction.
 *
 * Turns raw vector-tile features (the OpenMapTiles `transportation`
 * source-layer of the CARTO basemap tiles already loaded by the map —
 * see OsirisMap) into a simulation-ready network: drivable polylines
 * with cumulative lengths and a junction graph over shared endpoints.
 * Pure and MapLibre-free so it is unit-testable; the map component does
 * the querySourceFeatures call and hands features in.
 *
 * Tile-boundary note: a road crossing tiles arrives as several clipped
 * features. Exact-geometry duplicates (short roads delivered twice via
 * tile buffers) are deduped by hash; clipped siblings are NOT merged —
 * the junction graph reconnects them at their coincident endpoints,
 * which is where vehicles turn anyway.
 */

import { classesForZoom, type RoadClass } from './config';

export interface RawRoadFeature {
  geometry: { type: string; coordinates: unknown } | null;
  properties?: Record<string, unknown> | null;
}

export interface TrafficRoad {
  id: string;
  coords: [number, number][];
  /** Cumulative metres at each vertex; cumM[0] = 0, last = lengthM. */
  cumM: number[];
  lengthM: number;
  roadClass: RoadClass;
  name: string;
  oneway: boolean;
}

export interface JunctionLink {
  roadIndex: number;
  /** True when the road starts at this node, false when it ends there. */
  atStart: boolean;
}

export interface RoadNetwork {
  roads: TrafficRoad[];
  junctions: Map<string, JunctionLink[]>;
  totalLengthM: number;
}

const EARTH_R_M = 6_371_000;
const MIN_ROAD_LENGTH_M = 20;
/** Perf guard: at extreme zooms a dense downtown can exceed this. */
const MAX_ROADS = 4000;

const CLASS_RANK: Record<RoadClass, number> = {
  motorway: 0, trunk: 1, primary: 2, secondary: 3, tertiary: 4, minor: 5, service: 6,
};

export function haversineM(a: [number, number], b: [number, number]): number {
  const dLat = ((b[1] - a[1]) * Math.PI) / 180;
  const dLng = ((b[0] - a[0]) * Math.PI) / 180;
  const lat1 = (a[1] * Math.PI) / 180;
  const lat2 = (b[1] * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_R_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** FNV-1a — small stable string hash for ids and per-road variation seeds. */
export function fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Junction node key. 5 decimals ≈ 1.1 m — tile-clip endpoints coincide well inside it. */
export function nodeKey(lng: number, lat: number): string {
  return `${lng.toFixed(5)},${lat.toFixed(5)}`;
}

function parseOneway(v: unknown): boolean {
  return v === 1 || v === '1' || v === true || v === 'yes' || v === 'true';
}

function isDrivableClass(cls: string, allowed: Set<string>): cls is RoadClass {
  return allowed.has(cls);
}

const EXCLUDED_SERVICE_SUBCLASS = new Set(['parking_aisle', 'driveway']);

function cleanCoords(raw: unknown): [number, number][] | null {
  if (!Array.isArray(raw)) return null;
  const out: [number, number][] = [];
  for (const p of raw) {
    if (!Array.isArray(p) || typeof p[0] !== 'number' || typeof p[1] !== 'number') return null;
    const pt: [number, number] = [p[0], p[1]];
    const prev = out[out.length - 1];
    if (!prev || prev[0] !== pt[0] || prev[1] !== pt[1]) out.push(pt);
  }
  return out.length >= 2 ? out : null;
}

/**
 * Build the network for one viewport extraction.
 * `features` are raw source features (LineString or MultiLineString);
 * `bounds` (padded viewport) keeps roads that merely clip a tile buffer out.
 */
export function buildRoadNetwork(
  features: RawRoadFeature[],
  zoom: number,
  bounds?: { west: number; south: number; east: number; north: number },
): RoadNetwork {
  const allowed = new Set<string>(classesForZoom(zoom));
  const seen = new Set<string>();
  const roads: TrafficRoad[] = [];

  const pushLine = (coordsRaw: unknown, props: Record<string, unknown>) => {
    const cls = String(props.class ?? '');
    if (!isDrivableClass(cls, allowed)) return;
    if (cls === 'service' && EXCLUDED_SERVICE_SUBCLASS.has(String(props.subclass ?? ''))) return;
    const coords = cleanCoords(coordsRaw);
    if (!coords) return;
    // Viewport culling: at least one vertex inside the padded bounds.
    if (bounds) {
      const inside = coords.some(([lng, lat]) => lng >= bounds.west && lng <= bounds.east && lat >= bounds.south && lat <= bounds.north);
      if (!inside) return;
    }
    let coordStr = '';
    for (const [lng, lat] of coords) coordStr += `${lng.toFixed(6)},${lat.toFixed(6)};`;
    const id = `${cls}:${fnv1a(coordStr).toString(36)}`;
    if (seen.has(id)) return;
    seen.add(id);

    const cumM = [0];
    for (let i = 1; i < coords.length; i++) cumM.push(cumM[i - 1] + haversineM(coords[i - 1], coords[i]));
    const lengthM = cumM[cumM.length - 1];
    if (lengthM < MIN_ROAD_LENGTH_M) return;

    roads.push({
      id,
      coords,
      cumM,
      lengthM,
      roadClass: cls,
      name: String(props.name ?? props.ref ?? ''),
      oneway: parseOneway(props.oneway),
    });
  };

  for (const f of features) {
    if (!f?.geometry) continue;
    const props = f.properties ?? {};
    if (f.geometry.type === 'LineString') pushLine(f.geometry.coordinates, props);
    else if (f.geometry.type === 'MultiLineString' && Array.isArray(f.geometry.coordinates)) {
      for (const line of f.geometry.coordinates) pushLine(line, props);
    }
  }

  // Biggest roads first when the perf cap bites, so arterials survive.
  roads.sort((a, b) => CLASS_RANK[a.roadClass] - CLASS_RANK[b.roadClass] || b.lengthM - a.lengthM);
  const kept = roads.slice(0, MAX_ROADS);

  const junctions = new Map<string, JunctionLink[]>();
  let totalLengthM = 0;
  kept.forEach((road, idx) => {
    totalLengthM += road.lengthM;
    const first = road.coords[0];
    const last = road.coords[road.coords.length - 1];
    const addLink = (key: string, link: JunctionLink) => {
      const arr = junctions.get(key);
      if (arr) arr.push(link); else junctions.set(key, [link]);
    };
    addLink(nodeKey(first[0], first[1]), { roadIndex: idx, atStart: true });
    addLink(nodeKey(last[0], last[1]), { roadIndex: idx, atStart: false });
  });

  return { roads: kept, junctions, totalLengthM };
}

/**
 * Point at distance `s` metres along a road, with travel bearing
 * (degrees clockwise from north) for the segment being traversed.
 */
export function pointAt(road: TrafficRoad, s: number): { lng: number; lat: number; bearing: number } {
  const { coords, cumM, lengthM } = road;
  const target = Math.max(0, Math.min(lengthM, s));
  // Binary search for the segment containing target.
  let lo = 0;
  let hi = cumM.length - 1;
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    if (cumM[mid] <= target) lo = mid; else hi = mid;
  }
  const a = coords[lo];
  const b = coords[hi];
  const segLen = cumM[hi] - cumM[lo];
  const t = segLen > 0 ? (target - cumM[lo]) / segLen : 0;
  const lng = a[0] + (b[0] - a[0]) * t;
  const lat = a[1] + (b[1] - a[1]) * t;
  const bearing = (Math.atan2(b[0] - a[0], b[1] - a[1]) * 180) / Math.PI;
  return { lng, lat, bearing: (bearing + 360) % 360 };
}
