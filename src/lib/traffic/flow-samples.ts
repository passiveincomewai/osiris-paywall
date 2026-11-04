/**
 * WorldEye — Traffic: multi-source flow samples, provenance and merging.
 *
 * TomTom's vector tiles are one flow source, not the only one. The
 * server route /api/traffic/flow-segments returns additional measured
 * sources in two shapes this module unifies:
 *   • line features (HERE flow shapes, WSDOT travel-time corridors) —
 *     consumed by matchFlowToRoads in ./flow, which reads
 *     properties.relative_speed;
 *   • point samples (NDW detector sites) — matched here by proximity.
 *
 * Every ratio that reaches the speed model carries the source that
 * produced it (provenance), and when several sources cover the same
 * road the FRESHEST sample wins — mergeTimedFlowMaps below is the one
 * place that decision is made, so the map chip never has to guess.
 *
 * The simulated model (./congestion) remains the fallback for roads no
 * measured source covers; nothing here invents coverage.
 */

import { pointAt, type TrafficRoad } from './roads';
import { FREE_FLOW_KMH } from './congestion';
import { FLOW_MATCH_RADIUS_M } from './config';
import type { HereIncident } from './here';

export type FlowSourceId = 'tomtom' | 'here' | 'wsdot' | 'ndw';

/** A measured speed observation at a point (detector-style sources). */
export interface PointFlowSample {
  lng: number;
  lat: number;
  source: FlowSourceId;
  /** Measured mean speed at the point, km/h (e.g. NDW loop detectors). */
  speedKmh?: number;
  /** Ready-made speed ratio 0..1 (e.g. WSDOT corridor travel times). */
  ratio?: number;
}

/** Road id → ratio, plus which source each road's ratio came from. */
export interface MatchedFlow {
  ratios: Map<string, number>;
  provenance: Map<string, FlowSourceId>;
}

const M_PER_DEG_LAT = 110_540;
const M_PER_DEG_LNG = 111_320;

function pointDistanceM(
  a: [number, number],
  b: [number, number],
): number {
  const cosLat = Math.cos((a[1] * Math.PI) / 180);
  const dx = (b[0] - a[0]) * M_PER_DEG_LNG * cosLat;
  const dy = (b[1] - a[1]) * M_PER_DEG_LAT;
  return Math.hypot(dx, dy);
}

/** The ratio a point sample implies for a road of this class. */
function sampleRatioForRoad(sample: PointFlowSample, road: TrafficRoad): number | null {
  if (typeof sample.ratio === 'number' && Number.isFinite(sample.ratio)) {
    return Math.max(0, Math.min(1, sample.ratio));
  }
  if (typeof sample.speedKmh === 'number' && Number.isFinite(sample.speedKmh) && sample.speedKmh > 0) {
    const free = FREE_FLOW_KMH[road.roadClass];
    return Math.max(0, Math.min(1, sample.speedKmh / free));
  }
  return null;
}

/** Default catchment for a detector point: freeway loops sit on their
 *  road; 250 m keeps a parallel frontage road out of most matches. */
export const POINT_MATCH_RADIUS_M = 250;

/**
 * Match point samples onto roads. Each road samples its quarter points;
 * the nearest sample inside `radiusM` of a quarter point contributes
 * its ratio, and the road adopts the mean of its contributions.
 * Provenance is the source of the closest contribution.
 */
export function matchPointSamplesToRoads(
  roads: TrafficRoad[],
  samples: PointFlowSample[],
  radiusM: number = POINT_MATCH_RADIUS_M,
): MatchedFlow {
  const ratios = new Map<string, number>();
  const provenance = new Map<string, FlowSourceId>();
  if (!roads.length || !samples.length) return { ratios, provenance };

  for (const road of roads) {
    const matched: { ratio: number; d: number; source: FlowSourceId }[] = [];
    for (const frac of [0.25, 0.5, 0.75]) {
      const p = pointAt(road, road.lengthM * frac);
      let best: { ratio: number; d: number; source: FlowSourceId } | null = null;
      for (const s of samples) {
        const d = pointDistanceM([p.lng, p.lat], [s.lng, s.lat]);
        if (d > radiusM) continue;
        const ratio = sampleRatioForRoad(s, road);
        if (ratio === null) continue;
        if (!best || d < best.d) best = { ratio, d, source: s.source };
      }
      if (best) matched.push(best);
    }
    if (matched.length) {
      ratios.set(road.id, matched.reduce((a, b) => a + b.ratio, 0) / matched.length);
      let closest = matched[0];
      for (const m of matched) if (m.d < closest.d) closest = m;
      provenance.set(road.id, closest.source);
    }
  }
  return { ratios, provenance };
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
  return Math.hypot(ax + t * dx, ay + t * dy);
}

/**
 * Is this incident a road closure? HERE v7 incident types are a small
 * vocabulary ('accident', 'congestion', 'roadworks', 'roadClosure',
 * 'roadHazard', …); only a closure removes the road from the sim —
 * everything else is information, not a barrier, and must not empty a
 * street the data merely says is slow or busy.
 */
export function isClosureIncident(incident: HereIncident): boolean {
  return (incident.type ?? '').toLowerCase().includes('clos');
}

/**
 * Match closure incidents onto roads: a road is closed when a closure
 * incident's geometry runs within `radiusM` of one of the road's
 * quarter points — the same proximity rule the flow matchers use, so a
 * closure lands on the roads its line actually covers and not on a
 * parallel street two blocks away. Returns road ids for
 * SimOpts.closedRoadIds (the sim never spawns on them, never enters
 * them, and vacates them at the next reconcile).
 */
export function matchIncidentsToRoads(
  roads: TrafficRoad[],
  incidents: HereIncident[],
  radiusM: number = FLOW_MATCH_RADIUS_M,
): Set<string> {
  const closed = new Set<string>();
  const segments: { a: [number, number]; b: [number, number] }[] = [];
  for (const inc of incidents) {
    if (!isClosureIncident(inc)) continue;
    for (const line of inc.lines) {
      for (let i = 1; i < line.length; i++) segments.push({ a: line[i - 1], b: line[i] });
    }
  }
  if (!roads.length || !segments.length) return closed;

  // Vertex grid over the incident segments so road samples only test
  // nearby segments (same pattern as matchFlowToRoads).
  const midLat = roads[0].coords[0][1];
  const cellLat = radiusM / M_PER_DEG_LAT;
  const cellLng = radiusM / (M_PER_DEG_LNG * Math.max(0.2, Math.cos((midLat * Math.PI) / 180)));
  const cellKey = (lng: number, lat: number) => `${Math.floor(lng / cellLng)},${Math.floor(lat / cellLat)}`;
  const grid = new Map<string, number[]>();
  segments.forEach((seg, si) => {
    const registered = new Set<string>();
    const register = (lng: number, lat: number) => {
      const key = cellKey(lng, lat);
      if (registered.has(key)) return;
      registered.add(key);
      const arr = grid.get(key);
      if (arr) arr.push(si); else grid.set(key, [si]);
    };
    const step = Math.min(cellLat, cellLng) * 0.9;
    const span = Math.max(Math.abs(seg.b[0] - seg.a[0]), Math.abs(seg.b[1] - seg.a[1]));
    const steps = Math.max(1, Math.ceil(span / step));
    for (let k = 0; k <= steps; k++) {
      register(seg.a[0] + ((seg.b[0] - seg.a[0]) * k) / steps, seg.a[1] + ((seg.b[1] - seg.a[1]) * k) / steps);
    }
  });

  for (const road of roads) {
    for (const frac of [0.25, 0.5, 0.75]) {
      const p = pointAt(road, road.lengthM * frac);
      const cx = Math.floor(p.lng / cellLng);
      const cy = Math.floor(p.lat / cellLat);
      let hit = false;
      for (let ix = cx - 1; ix <= cx + 1 && !hit; ix++) {
        for (let iy = cy - 1; iy <= cy + 1 && !hit; iy++) {
          const arr = grid.get(`${ix},${iy}`);
          if (!arr) continue;
          for (const si of arr) {
            if (pointSegmentM([p.lng, p.lat], segments[si].a, segments[si].b) <= radiusM) {
              hit = true;
              break;
            }
          }
        }
      }
      if (hit) { closed.add(road.id); break; }
    }
  }
  return closed;
}

/** A matched map stamped with the time its source data was produced. */
export interface TimedFlowMap {
  source: FlowSourceId;
  /** Epoch ms when the source produced this data (not when we fetched). */
  at: number;
  matched: MatchedFlow;
}

/**
 * Merge matched maps from several sources: for each road, the map with
 * the freshest `at` that covers the road wins. Roads covered by only
 * one source keep that source regardless of age — fresher beats older,
 * but some data beats none.
 */
export function mergeTimedFlowMaps(maps: TimedFlowMap[]): MatchedFlow {
  const ratios = new Map<string, number>();
  const provenance = new Map<string, FlowSourceId>();
  const winnerAt = new Map<string, number>();
  for (const m of maps) {
    for (const [roadId, ratio] of m.matched.ratios) {
      const prev = winnerAt.get(roadId);
      if (prev === undefined || m.at >= prev) {
        winnerAt.set(roadId, m.at);
        ratios.set(roadId, ratio);
        provenance.set(roadId, m.matched.provenance.get(roadId) ?? m.source);
      }
    }
  }
  return { ratios, provenance };
}
