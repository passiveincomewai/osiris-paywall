import { describe, it, expect } from 'vitest';
import { buildRoadNetwork, type RawRoadFeature } from './roads';
import {
  matchPointSamplesToRoads, mergeTimedFlowMaps,
  type PointFlowSample, type MatchedFlow,
} from './flow-samples';

const line = (coords: [number, number][], props: Record<string, unknown> = {}): RawRoadFeature => ({
  geometry: { type: 'LineString', coordinates: coords },
  properties: { class: 'primary', ...props },
});

/** One east-west primary road, ~1.1 km along the equator. */
function oneRoad() {
  const net = buildRoadNetwork([line([[0, 0], [0.01, 0]], { name: 'A Street' })], 14);
  return net.roads;
}

describe('matchPointSamplesToRoads', () => {
  it('converts a measured speed with the road class free-flow speed', () => {
    const roads = oneRoad();
    // Primary free flow is 50 km/h; a detector reading 25 → ratio 0.5.
    const samples: PointFlowSample[] = [{ lng: 0.005, lat: 0, source: 'ndw', speedKmh: 25 }];
    const m = matchPointSamplesToRoads(roads, samples);
    expect(m.ratios.get(roads[0].id)).toBeCloseTo(0.5, 5);
    expect(m.provenance.get(roads[0].id)).toBe('ndw');
  });

  it('passes a ready-made ratio through untouched', () => {
    const roads = oneRoad();
    const samples: PointFlowSample[] = [{ lng: 0.005, lat: 0, source: 'wsdot', ratio: 0.3 }];
    const m = matchPointSamplesToRoads(roads, samples);
    expect(m.ratios.get(roads[0].id)).toBeCloseTo(0.3, 5);
    expect(m.provenance.get(roads[0].id)).toBe('wsdot');
  });

  it('ignores samples beyond the match radius and unusable samples', () => {
    const roads = oneRoad();
    const far: PointFlowSample[] = [{ lng: 0.005, lat: 0.01, source: 'ndw', speedKmh: 10 }]; // ~1.1 km north
    expect(matchPointSamplesToRoads(roads, far).ratios.size).toBe(0);
    const dead: PointFlowSample[] = [{ lng: 0.005, lat: 0, source: 'ndw', speedKmh: 0 }];
    expect(matchPointSamplesToRoads(roads, dead).ratios.size).toBe(0);
    expect(matchPointSamplesToRoads(roads, []).ratios.size).toBe(0);
  });
});

describe('mergeTimedFlowMaps', () => {
  const matched = (entries: [string, number, 'tomtom' | 'here'][]): MatchedFlow => ({
    ratios: new Map(entries.map(([id, r]) => [id, r])),
    provenance: new Map(entries.map(([id, , s]) => [id, s])),
  });

  it('prefers the freshest source per road and keeps provenance', () => {
    const older = { source: 'tomtom' as const, at: 1_000, matched: matched([['r1', 0.9, 'tomtom'], ['r2', 0.8, 'tomtom']]) };
    const newer = { source: 'here' as const, at: 2_000, matched: matched([['r1', 0.4, 'here']]) };
    const merged = mergeTimedFlowMaps([older, newer]);
    expect(merged.ratios.get('r1')).toBe(0.4);
    expect(merged.provenance.get('r1')).toBe('here');
    // A road only the older source covers keeps the older data.
    expect(merged.ratios.get('r2')).toBe(0.8);
    expect(merged.provenance.get('r2')).toBe('tomtom');
  });

  it('is order-independent for the freshness rule', () => {
    const older = { source: 'tomtom' as const, at: 1_000, matched: matched([['r1', 0.9, 'tomtom']]) };
    const newer = { source: 'here' as const, at: 2_000, matched: matched([['r1', 0.4, 'here']]) };
    expect(mergeTimedFlowMaps([newer, older]).ratios.get('r1')).toBe(0.4);
    expect(mergeTimedFlowMaps([]).ratios.size).toBe(0);
  });
});
