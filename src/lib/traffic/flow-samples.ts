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
