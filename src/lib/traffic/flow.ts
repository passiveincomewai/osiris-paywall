/**
 * WorldEye — Traffic: match TomTom flow segments onto OSM roads.
 *
 * When a TomTom key is configured, the map carries TomTom's vector flow
 * tiles (proxied server-side, key never client-side). Their geometry is
 * TomTom's own road network, not OSM's, so influence travels by
 * proximity: each simulated road samples TomTom segments near its
 * quarter points and adopts the mean `relative_speed` of segments
 * within FLOW_MATCH_RADIUS_M. Unmatched roads keep the simulated model.
 * Pure and unit-testable; the component supplies features from
 * querySourceFeatures and consumes the road-id → ratio map.
 */

import { pointAt, type TrafficRoad } from './roads';
import { FLOW_MATCH_RADIUS_M } from './config';

export interface RawFlowFeature {
  geometry: { type: string; coordinates: unknown } | null;
  properties?: Record<string, unknown> | null;
}

const M_PER_DEG_LAT = 110_540;
const M_PER_DEG_LNG = 111_320;

function flowSpeedOf(props: Record<string, unknown> | null | undefined): number | null {
  if (!props) return null;
  const raw = props.relative_speed ?? props.traffic_level;
  const n = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw) : NaN;
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(1, n));
}

function linesOf(f: RawFlowFeature): [number, number][][] {
  if (!f?.geometry) return [];
  const out: [number, number][][] = [];
  const push = (raw: unknown) => {
    if (!Array.isArray(raw)) return;
    const line: [number, number][] = [];
    for (const p of raw) {
      if (Array.isArray(p) && typeof p[0] === 'number' && typeof p[1] === 'number') line.push([p[0], p[1]]);
    }
    if (line.length >= 2) out.push(line);
  };
  if (f.geometry.type === 'LineString') push(f.geometry.coordinates);
  else if (f.geometry.type === 'MultiLineString' && Array.isArray(f.geometry.coordinates)) {
    for (const l of f.geometry.coordinates) push(l);
  }
  return out;
}

/** Distance from point p to segment a–b, in metres (local equirectangular). */
function pointSegmentM(p: [number, number], a: [number, number], b: [number, number]): number {
  const cosLat = Math.cos((p[1] * Math.PI) / 180);
  const ax = (a[0] - p[0]) * M_PER_DEG_LNG * cosLat;
  const ay = (a[1] - p[1]) * M_PER_DEG_LAT;
  const bx = (b[0] - p[0]) * M_PER_DEG_LNG * cosLat;
  const by = (b[1] - p[1]) * M_PER_DEG_LAT;
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 > 0 ? -(ax * dx + ay * dy) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return Math.hypot(cx, cy);
}

/**
 * Sample TomTom relative speeds onto roads.
 * Returns road id → mean relative speed for roads with at least one
 * flow segment inside the match radius of a sample point.
 */
export function matchFlowToRoads(
  roads: TrafficRoad[],
  flowFeatures: RawFlowFeature[],
  radiusM: number = FLOW_MATCH_RADIUS_M,
): Map<string, number> {
  const result = new Map<string, number>();
  if (!roads.length || !flowFeatures.length) return result;

  interface FlowLine { pts: [number, number][]; speed: number }
  const lines: FlowLine[] = [];
  for (const f of flowFeatures) {
    const speed = flowSpeedOf(f.properties);
    if (speed === null) continue;
    for (const pts of linesOf(f)) lines.push({ pts, speed });
  }
  if (!lines.length) return result;

  // Vertex grid over flow lines so road samples only test nearby lines.
  const midLat = roads[0].coords[0][1];
  const cellLat = radiusM / M_PER_DEG_LAT;
  const cellLng = radiusM / (M_PER_DEG_LNG * Math.max(0.2, Math.cos((midLat * Math.PI) / 180)));
  const cellKey = (lng: number, lat: number) => `${Math.floor(lng / cellLng)},${Math.floor(lat / cellLat)}`;
  const grid = new Map<string, number[]>();
  lines.forEach((line, li) => {
    const registered = new Set<string>();
    const register = (lng: number, lat: number) => {
      const key = cellKey(lng, lat);
      if (registered.has(key)) return;
      registered.add(key);
      const arr = grid.get(key);
      if (arr) arr.push(li); else grid.set(key, [li]);
    };
    // Register along each segment, not just at vertices: a long segment
    // spans many cells its endpoints never touch, and a road sample in a
    // middle cell would otherwise find no candidates at all.
    const step = Math.min(cellLat, cellLng) * 0.9;
    for (let i = 1; i < line.pts.length; i++) {
      const [ax, ay] = line.pts[i - 1];
      const [bx, by] = line.pts[i];
      const span = Math.max(Math.abs(bx - ax), Math.abs(by - ay));
      const steps = Math.max(1, Math.ceil(span / step));
      for (let k = 0; k <= steps; k++) register(ax + ((bx - ax) * k) / steps, ay + ((by - ay) * k) / steps);
    }
  });

  const candidatesNear = (lng: number, lat: number): Set<number> => {
    const cx = Math.floor(lng / cellLng);
    const cy = Math.floor(lat / cellLat);
    const out = new Set<number>();
    for (let ix = cx - 1; ix <= cx + 1; ix++) {
      for (let iy = cy - 1; iy <= cy + 1; iy++) {
        const arr = grid.get(`${ix},${iy}`);
        if (arr) for (const li of arr) out.add(li);
      }
    }
    return out;
  };

  for (const road of roads) {
    const matched: number[] = [];
    for (const frac of [0.25, 0.5, 0.75]) {
      const p = pointAt(road, road.lengthM * frac);
      let best: { d: number; speed: number } | null = null;
      for (const li of candidatesNear(p.lng, p.lat)) {
        const line = lines[li];
        let d = Infinity;
        for (let i = 1; i < line.pts.length; i++) {
          d = Math.min(d, pointSegmentM([p.lng, p.lat], line.pts[i - 1], line.pts[i]));
          if (d === 0) break;
        }
        if (d <= radiusM && (!best || d < best.d)) best = { d, speed: line.speed };
      }
      if (best) matched.push(best.speed);
    }
    if (matched.length) {
      result.set(road.id, matched.reduce((a, b) => a + b, 0) / matched.length);
    }
  }
  return result;
}
