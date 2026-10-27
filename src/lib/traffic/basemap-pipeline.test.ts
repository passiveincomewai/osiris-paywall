/**
 * Regression suite for the traffic-layer outage of 2026-10-27.
 *
 * CARTO migrated the dark-matter basemap to Protomaps-based
 * carto.streets v2 tiles (source `protomaps`, road layer `roads`,
 * class in `kind_detail`). The map queried source `carto` /
 * source-layer `transportation` with OpenMapTiles-shaped properties,
 * so extraction returned zero roads and zero vehicles at every zoom.
 *
 * The fixtures are the roads layer of REAL CARTO tiles (downtown Los
 * Angeles z12 + z14, Salt Lake City z12), decoded verbatim — the
 * pipeline below is the exact one OsirisMap runs:
 * adaptBasemapRoadFeatures → buildRoadNetwork → targetVehicleCount →
 * reconcileVehicles → vehicleFeature / advanceVehicles.
 */
import { describe, expect, it } from 'vitest';
import {
  adaptBasemapRoadFeatures,
  buildRoadNetwork,
  type RawRoadFeature,
  type RoadNetwork,
} from './roads';
import { createRng, reconcileVehicles, advanceVehicles, vehicleFeature } from './sim';
import { targetVehicleCount } from './config';

import laZ12 from './fixtures/la-z12-roads.json';
import laZ14 from './fixtures/la-z14-roads.json';
import slcZ12 from './fixtures/slc-z12-roads.json';

const asRaw = (v: unknown) => v as RawRoadFeature[];

function extentOf(features: RawRoadFeature[]) {
  let west = Infinity, south = Infinity, east = -Infinity, north = -Infinity;
  const walk = (c: unknown) => {
    if (Array.isArray(c) && typeof c[0] === 'number' && typeof c[1] === 'number') {
      west = Math.min(west, c[0]); east = Math.max(east, c[0]);
      south = Math.min(south, c[1]); north = Math.max(north, c[1]);
      return;
    }
    if (Array.isArray(c)) c.forEach(walk);
  };
  for (const f of features) walk(f.geometry?.coordinates);
  return { west, south, east, north };
}

function runPipeline(rawFeatures: RawRoadFeature[], zoom: number, mobile = false) {
  const adapted = adaptBasemapRoadFeatures(rawFeatures);
  const net = buildRoadNetwork(adapted, zoom, extentOf(rawFeatures));
  const ratioFor = () => 0.85;
  const target = targetVehicleCount(net.totalLengthM, zoom, mobile);
  const rng = createRng(20261027);
  const vehicles = reconcileVehicles([], net, target, rng, ratioFor);
  return { adapted, net, target, vehicles, rng, ratioFor };
}

describe('adaptBasemapRoadFeatures', () => {
  const line = (props: Record<string, unknown>): RawRoadFeature => ({
    geometry: { type: 'LineString', coordinates: [[0, 0], [0.01, 0.01]] },
    properties: props,
  });

  it('maps Protomaps kind_detail onto the road classes the network consumes', () => {
    const out = adaptBasemapRoadFeatures([
      line({ kind: 'highway', kind_detail: 'motorway' }),
      line({ kind: 'highway', kind_detail: 'motorway_link' }),
      line({ kind: 'major_road', kind_detail: 'primary_link' }),
      line({ kind: 'major_road', kind_detail: 'secondary' }),
      line({ kind: 'major_road', kind_detail: 'tertiary' }),
      line({ kind: 'minor_road', kind_detail: 'residential' }),
      line({ kind: 'minor_road', kind_detail: 'unclassified' }),
      line({ kind: 'minor_road', kind_detail: 'service', service: 'driveway' }),
    ]);
    expect(out.map((f) => f.properties?.class)).toEqual([
      'motorway', 'motorway', 'primary', 'secondary', 'tertiary', 'minor', 'minor', 'service',
    ]);
    // The OSM service value must land in `subclass`, where the
    // parking_aisle/driveway exclusion reads it.
    expect(out[7].properties?.subclass).toBe('driveway');
  });

  it('falls back to the coarse kind group when kind_detail is absent', () => {
    const out = adaptBasemapRoadFeatures([
      line({ kind: 'major_road' }),
      line({ kind: 'minor_road' }),
    ]);
    expect(out.map((f) => f.properties?.class)).toEqual(['primary', 'minor']);
  });

  it('drops things that are not drivable roads', () => {
    const out = adaptBasemapRoadFeatures([
      line({ kind: 'rail', kind_detail: 'rail' }),
      line({ kind: 'path', kind_detail: 'footway' }),
      line({ kind: 'path', kind_detail: 'pedestrian' }),
      line({ kind: 'aeroway', kind_detail: 'runway' }),
      line({ kind: 'rail', kind_detail: 'light_rail' }),
    ]);
    expect(out).toEqual([]);
  });

  it('passes legacy OpenMapTiles features (props.class) through untouched', () => {
    const legacy = line({ class: 'primary', subclass: 'x', oneway: 1 });
    const out = adaptBasemapRoadFeatures([legacy]);
    expect(out).toHaveLength(1);
    expect(out[0]).toBe(legacy);
  });

  it('preserves oneway/name/ref for the network builder', () => {
    const out = adaptBasemapRoadFeatures([
      line({ kind: 'highway', kind_detail: 'motorway', oneway: 'yes', name: 'I 15', ref: 'I 15' }),
    ]);
    const net = buildRoadNetwork(out, 12);
    expect(net.roads).toHaveLength(1);
    expect(net.roads[0].oneway).toBe(true);
    expect(net.roads[0].name).toBe('I 15');
  });
});

describe('real CARTO tile fixtures — the outage regression', () => {
  it('WITHOUT the adapter the live schema yields zero roads (the bug, pinned)', () => {
    const net = buildRoadNetwork(asRaw(laZ12), 12, extentOf(asRaw(laZ12)));
    expect(net.roads).toHaveLength(0);
  });

  it.each([
    ['Los Angeles z12', laZ12, 12, true],
    // This single z14 tile sits between freeways — arterials only.
    ['Los Angeles z14', laZ14, 14, false],
    ['Salt Lake City z12', slcZ12, 12, true],
  ])('%s: roads extract and vehicles spawn', (_name, fixture, zoom, hasMotorway) => {
    const { net, target, vehicles } = runPipeline(asRaw(fixture), zoom);
    expect(net.roads.length).toBeGreaterThan(0);
    expect(net.roads.some((r) => r.roadClass === 'motorway')).toBe(hasMotorway);
    expect(target).toBeGreaterThan(0);
    expect(vehicles.length).toBe(target);
  });

  it('vehicles produce finite map features and keep driving', () => {
    const { net, vehicles, rng, ratioFor } = runPipeline(asRaw(laZ12), 12);
    for (const v of vehicles) {
      const f = vehicleFeature(v, net, ratioFor);
      expect(f).not.toBeNull();
      expect(Number.isFinite(f!.geometry.coordinates[0])).toBe(true);
      expect(Number.isFinite(f!.geometry.coordinates[1])).toBe(true);
    }
    // Two simulated minutes at 30 fps: nothing falls off the network.
    for (let i = 0; i < 3600 / 30; i++) advanceVehicles(vehicles, net, 1 / 30, rng, ratioFor);
    for (const v of vehicles) {
      const f = vehicleFeature(v, net, ratioFor);
      expect(f).not.toBeNull();
      expect(Number.isFinite(f!.geometry.coordinates[0])).toBe(true);
    }
  });

  it('tile-boundary clipped segments still connect into a junction graph', () => {
    const { net } = runPipeline(asRaw(laZ12), 12);
    expect(net.junctions.size).toBeGreaterThan(0);
    const linked = [...net.junctions.values()].filter((l) => l.length > 1).length;
    expect(linked).toBeGreaterThan(0);
  });
});
