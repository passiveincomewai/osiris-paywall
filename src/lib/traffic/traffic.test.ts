import { describe, it, expect } from 'vitest';
import {
  classesForZoom, targetVehicleCount, congestionBand,
  congestionDensityWeight, densityScaleForMeanRatio, trafficChipText,
  VEHICLE_CAP_DESKTOP, VEHICLE_CAP_MOBILE,
} from './config';
import {
  buildRoadNetwork, pointAt, haversineM, nodeKey, type RawRoadFeature,
} from './roads';
import {
  timeOfDayFactor, simulatedRatio, effectiveRatio, speedMps, FREE_FLOW_KMH,
} from './congestion';
import {
  createRng, nextFloat, reconcileVehicles, advanceVehicles, vehicleFeature, type SimVehicle,
} from './sim';
import { matchFlowToRoads, type RawFlowFeature } from './flow';

const line = (coords: [number, number][], props: Record<string, unknown> = {}): RawRoadFeature => ({
  geometry: { type: 'LineString', coordinates: coords },
  properties: { class: 'primary', ...props },
});

/** East road A (1.1 km) meeting north road B at (0.01, 0). */
function abNetwork(onewayB = false) {
  return buildRoadNetwork([
    line([[0, 0], [0.01, 0]], { name: 'A Street' }),
    line([[0.01, 0], [0.01, 0.01]], { name: 'B Street', oneway: onewayB ? 1 : 0 }),
  ], 14);
}

describe('config', () => {
  it('widens road classes with zoom, arterials first', () => {
    expect(classesForZoom(10.6)).toEqual(['motorway', 'trunk']);
    expect(classesForZoom(12)).toContain('primary');
    expect(classesForZoom(12)).not.toContain('secondary');
    expect(classesForZoom(14)).toContain('tertiary');
    expect(classesForZoom(14)).not.toContain('minor');
    expect(classesForZoom(15)).toContain('minor');
    expect(classesForZoom(15)).not.toContain('service');
    expect(classesForZoom(16)).toContain('service');
  });

  it('congestion band thresholds', () => {
    expect(congestionBand(1)).toBe('free');
    expect(congestionBand(0.7)).toBe('free');
    expect(congestionBand(0.69)).toBe('slow');
    expect(congestionBand(0.4)).toBe('slow');
    expect(congestionBand(0.39)).toBe('jam');
    expect(congestionBand(0)).toBe('jam');
  });

  it('vehicle targets respect hard caps and zoom thinning', () => {
    expect(targetVehicleCount(1e9, 16, false)).toBe(VEHICLE_CAP_DESKTOP);
    expect(targetVehicleCount(1e9, 16, true)).toBe(VEHICLE_CAP_MOBILE);
    expect(targetVehicleCount(0, 16, false)).toBe(0);
    expect(targetVehicleCount(42_000, 16, false)).toBe(100);
    expect(targetVehicleCount(42_000, 12, false)).toBeLessThan(targetVehicleCount(42_000, 16, false));
  });
});

describe('roads', () => {
  it('haversine: one degree of latitude ≈ 111.2 km', () => {
    expect(haversineM([0, 0], [0, 1])).toBeGreaterThan(110_000);
    expect(haversineM([0, 0], [0, 1])).toBeLessThan(112_500);
  });

  it('filters non-drivable classes and dedupes exact copies', () => {
    const net = buildRoadNetwork([
      line([[0, 0], [0.01, 0]]),
      line([[0, 0], [0.01, 0]]), // exact duplicate from a tile buffer
      line([[0, 0], [0.01, 0.01]], { class: 'path' }),
      line([[0, 0], [0.005, 0.005]], { class: 'service', subclass: 'parking_aisle' }),
    ], 16);
    expect(net.roads).toHaveLength(1);
    expect(net.roads[0].roadClass).toBe('primary');
  });

  it('splits MultiLineString and enforces the zoom class filter', () => {
    const multi: RawRoadFeature = {
      geometry: { type: 'MultiLineString', coordinates: [[[0, 0], [0.01, 0]], [[0.02, 0], [0.03, 0]]] },
      properties: { class: 'minor' },
    };
    expect(buildRoadNetwork([multi], 12).roads).toHaveLength(0); // minor not loaded at z12
    expect(buildRoadNetwork([multi], 15).roads).toHaveLength(2);
  });

  it('culls features outside the viewport bounds and drops slivers', () => {
    const net = buildRoadNetwork([
      line([[5, 5], [5.01, 5]]),
      line([[0, 0], [0.00002, 0]]), // ~2 m sliver
      line([[0, 0], [0.01, 0]]),
    ], 14, { west: -0.005, south: -0.005, east: 0.02, north: 0.02 });
    expect(net.roads).toHaveLength(1);
  });

  it('parses oneway and builds the junction graph over shared endpoints', () => {
    const net = abNetwork(true);
    const b = net.roads.find(r => r.name === 'B Street')!;
    expect(b.oneway).toBe(true);
    const links = net.junctions.get(nodeKey(0.01, 0))!;
    expect(links).toHaveLength(2);
    expect(links.some(l => l.atStart)).toBe(true);
    expect(links.some(l => !l.atStart)).toBe(true);
  });

  it('pointAt interpolates and reports bearing', () => {
    const road = abNetwork().roads.find(r => r.name === 'A Street')!;
    const mid = pointAt(road, road.lengthM / 2);
    expect(mid.lng).toBeCloseTo(0.005, 4);
    expect(mid.lat).toBeCloseTo(0, 6);
    expect(mid.bearing).toBeCloseTo(90, 0); // east
    const north = pointAt(abNetwork().roads.find(r => r.name === 'B Street')!, 10);
    expect(north.bearing).toBeCloseTo(0, 0);
    expect(pointAt(road, -50).lng).toBe(0); // clamped
    expect(pointAt(road, 1e9).lng).toBeCloseTo(0.01, 6);
  });
});

describe('congestion', () => {
  it('rush hour cuts arterials deeper than the small hours', () => {
    expect(timeOfDayFactor('primary', 8, false)).toBeLessThan(timeOfDayFactor('primary', 3, false));
    expect(timeOfDayFactor('primary', 17.2, false)).toBeLessThan(0.75);
    expect(timeOfDayFactor('service', 8, false)).toBeGreaterThan(timeOfDayFactor('primary', 8, false));
  });

  it('weekends have a shallower morning than weekdays', () => {
    expect(timeOfDayFactor('primary', 8, true)).toBeGreaterThan(timeOfDayFactor('primary', 8, false));
  });

  it('simulated ratio is deterministic and in range', () => {
    const road = abNetwork().roads[0];
    const when = new Date(2026, 9, 14, 8, 0); // Wednesday 08:00 local
    const a = simulatedRatio(road, when);
    expect(a).toBe(simulatedRatio(road, when));
    expect(a).toBeGreaterThanOrEqual(0.22);
    expect(a).toBeLessThanOrEqual(1);
  });

  it('TomTom samples override the model; speed math is sane', () => {
    const road = abNetwork().roads.find(r => r.name === 'A Street')!;
    const flow = new Map([[road.id, 0.31]]);
    expect(effectiveRatio(road, new Date(), flow)).toBeCloseTo(0.31);
    expect(effectiveRatio(road, new Date(), new Map())).toBeGreaterThan(0);
    expect(speedMps(road, 1)).toBeCloseTo(FREE_FLOW_KMH.primary / 3.6, 5);
    expect(speedMps(road, 0.5)).toBeCloseTo(FREE_FLOW_KMH.primary / 7.2, 5);
  });
});

describe('sim', () => {
  it('RNG is deterministic per seed', () => {
    const a = createRng(42);
    const b = createRng(42);
    for (let i = 0; i < 5; i++) expect(nextFloat(a)).toBe(nextFloat(b));
    expect(nextFloat(createRng(43))).not.toBe(nextFloat(createRng(42)));
  });

  it('a vehicle cruises at model speed once settled', () => {
    const net = abNetwork();
    const road = net.roads.find(r => r.name === 'A Street')!;
    const v: SimVehicle = {
      roadId: road.id, roadIndex: net.roads.indexOf(road),
      s: 100, dir: 1, v: speedMps(road, 1), pace: 1,
    };
    advanceVehicles([v], net, 10, createRng(1), () => 1);
    expect(v.roadId).toBe(road.id);
    expect(v.s).toBeCloseTo(100 + speedMps(road, 1) * 10, 3);
  });

  it('turns onto the connected road at a junction', () => {
    const net = abNetwork();
    const a = net.roads.find(r => r.name === 'A Street')!;
    const v: SimVehicle = {
      roadId: a.id, roadIndex: net.roads.indexOf(a),
      s: a.lengthM - 5, dir: 1, v: speedMps(a, 1), pace: 1,
    };
    const rng = createRng(7);
    for (let i = 0; i < 40 && v.roadId === a.id; i++) advanceVehicles([v], net, 0.5, rng, () => 1);
    expect(v.roadId).not.toBe(a.id); // ended up on B Street
  });

  it('reverses at a two-way dead end instead of leaving the road', () => {
    const net = buildRoadNetwork([line([[0, 0], [0.01, 0]])], 14);
    const road = net.roads[0];
    const v: SimVehicle = {
      roadId: road.id, roadIndex: 0, s: road.lengthM - 2, dir: 1, v: speedMps(road, 1), pace: 1,
    };
    const rng = createRng(3);
    for (let i = 0; i < 10; i++) advanceVehicles([v], net, 0.5, rng, () => 1);
    expect(v.dir).toBe(-1);
    expect(v.s).toBeLessThan(road.lengthM);
  });

  it('oneway vehicles never travel backwards', () => {
    const net = abNetwork(true);
    const rng = createRng(11);
    const vehicles = reconcileVehicles([], net, 12, rng, () => 1);
    expect(vehicles.length).toBe(12);
    const bId = net.roads.find(r => r.name === 'B Street')!.id;
    for (let i = 0; i < 300; i++) {
      advanceVehicles(vehicles, net, 0.5, rng, () => 1);
      for (const v of vehicles) {
        if (v.roadId === bId) expect(v.dir).toBe(1);
        expect(v.s).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('reconcile keeps surviving vehicles and tops up to target', () => {
    const net = abNetwork();
    const rng = createRng(5);
    const first = reconcileVehicles([], net, 6, rng, () => 1);
    expect(first).toHaveLength(6);
    const again = reconcileVehicles(first, net, 6, rng, () => 1);
    expect(again).toHaveLength(6);
    expect(again.every(v => first.includes(v))).toBe(true); // same objects, still driving
    const shrunk = reconcileVehicles(again, net, 2, rng, () => 1);
    expect(shrunk).toHaveLength(2);
  });

  it('vehicleFeature flips bearing for reverse travel', () => {
    const net = abNetwork();
    const road = net.roads.find(r => r.name === 'A Street')!;
    const fwd: SimVehicle = { roadId: road.id, roadIndex: net.roads.indexOf(road), s: 100, dir: 1, v: 5, pace: 1 };
    const rev: SimVehicle = { ...fwd, dir: -1 };
    expect(vehicleFeature(fwd, net, () => 1)!.properties.bearing).toBe(90);
    expect(vehicleFeature(rev, net, () => 1)!.properties.bearing).toBe(270);
  });
});

describe('flow matching', () => {
  const roadOf = () => abNetwork().roads.find(r => r.name === 'A Street')!;

  it('adopts the relative speed of a nearby TomTom segment', () => {
    const flow: RawFlowFeature[] = [{
      geometry: { type: 'LineString', coordinates: [[0, 0.0002], [0.01, 0.0002]] }, // ~22 m north
      properties: { relative_speed: 0.3, road_category: 'primary' },
    }];
    const matched = matchFlowToRoads([roadOf()], flow);
    expect(matched.get(roadOf().id)).toBeCloseTo(0.3, 5);
  });

  it('ignores distant segments and unparseable speeds', () => {
    const far: RawFlowFeature[] = [{
      geometry: { type: 'LineString', coordinates: [[0, 0.01], [0.01, 0.01]] },
      properties: { relative_speed: 0.3 },
    }];
    expect(matchFlowToRoads([roadOf()], far).size).toBe(0);
    const junk: RawFlowFeature[] = [{
      geometry: { type: 'LineString', coordinates: [[0, 0.0002], [0.01, 0.0002]] },
      properties: {},
    }];
    expect(matchFlowToRoads([roadOf()], junk).size).toBe(0);
    expect(matchFlowToRoads([], far).size).toBe(0);
  });

  it('falls back to traffic_level when relative_speed is absent', () => {
    const flow: RawFlowFeature[] = [{
      geometry: { type: 'LineString', coordinates: [[0, 0.0002], [0.01, 0.0002]] },
      properties: { traffic_level: '0.55' },
    }];
    expect(matchFlowToRoads([roadOf()], flow).get(roadOf().id)).toBeCloseTo(0.55, 5);
  });
});

describe('density follows measured congestion', () => {
  it('density weights fall as roads run freer, within clamps', () => {
    expect(congestionDensityWeight(0.15)).toBeGreaterThan(congestionDensityWeight(0.5));
    expect(congestionDensityWeight(0.5)).toBeGreaterThan(congestionDensityWeight(0.95));
    expect(congestionDensityWeight(0)).toBeLessThanOrEqual(1.45);
    expect(congestionDensityWeight(1)).toBeGreaterThanOrEqual(0.6);
    expect(densityScaleForMeanRatio(0.25)).toBeGreaterThan(1);
    expect(densityScaleForMeanRatio(0.95)).toBeLessThan(0.65);
  });

  it('fleet target: gridlock packs more vehicles than the same network free-flowing', () => {
    const neutral = targetVehicleCount(42_000, 16, false);
    expect(targetVehicleCount(42_000, 16, false, 0.25)).toBeGreaterThan(neutral);
    expect(targetVehicleCount(42_000, 16, false, 0.95)).toBeLessThan(neutral);
    expect(targetVehicleCount(1e9, 16, false, 0.1)).toBe(VEHICLE_CAP_DESKTOP); // caps stay hard
  });

  it('spawning favours the crawling road over an equal free-flowing one', () => {
    const net = buildRoadNetwork([
      line([[0, 0], [0.01, 0]], { name: 'Jam Road' }),
      line([[0, 0.02], [0.01, 0.02]], { name: 'Free Road' }),
    ], 14);
    const jam = net.roads.find(r => r.name === 'Jam Road')!;
    const ratioFor = (road: (typeof net.roads)[number]) => (road.id === jam.id ? 0.15 : 0.95);
    const vehicles = reconcileVehicles([], net, 60, createRng(99), ratioFor);
    const onJam = vehicles.filter(v => v.roadId === jam.id).length;
    expect(onJam).toBeGreaterThan(36); // weights imply ~69% on the jammed road
  });
});

describe('vehicle speed follows the measured flow', () => {
  it('a vehicle settles at free-flow × the ratio of the road it is on', () => {
    const net = abNetwork();
    const road = net.roads.find(r => r.name === 'A Street')!;
    const settle = (ratio: number) => {
      const v: SimVehicle = {
        roadId: road.id, roadIndex: net.roads.indexOf(road), s: 200, dir: 1, v: 0, pace: 1,
      };
      const rng = createRng(4);
      for (let i = 0; i < 240; i++) advanceVehicles([v], net, 0.25, rng, () => ratio);
      return v.v;
    };
    const jammed = settle(0.12);
    const free = settle(0.95);
    expect(jammed).toBeCloseTo(speedMps(road, 0.12), 0);
    expect(free).toBeCloseTo(speedMps(road, 0.95), 0);
    expect(jammed).toBeLessThan(free * 0.2); // crawling vs flying — the data drives it
  });

  it('vehicles stay on their road polylines across junctions, turns and reversals', () => {
    const net = abNetwork();
    const rng = createRng(21);
    const vehicles = reconcileVehicles([], net, 10, rng, () => 0.8);
    const M_LNG = 111_320;
    const M_LAT = 110_540;
    const distToSegM = (p: [number, number], a: [number, number], b: [number, number]) => {
      const px = p[0] * M_LNG, py = p[1] * M_LAT;
      const ax = a[0] * M_LNG, ay = a[1] * M_LAT;
      const bx = b[0] * M_LNG, by = b[1] * M_LAT;
      const dx = bx - ax, dy = by - ay;
      const len2 = dx * dx + dy * dy;
      let t = len2 > 0 ? ((px - ax) * dx + (py - ay) * dy) / len2 : 0;
      t = Math.max(0, Math.min(1, t));
      return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
    };
    for (let step = 0; step < 400; step++) {
      advanceVehicles(vehicles, net, 0.25, rng, () => 0.8);
      for (const v of vehicles) {
        const f = vehicleFeature(v, net, () => 0.8)!;
        const road = net.roads[v.roadIndex];
        let d = Infinity;
        for (let i = 1; i < road.coords.length; i++) {
          d = Math.min(d, distToSegM(f.geometry.coordinates, road.coords[i - 1], road.coords[i]));
        }
        expect(d).toBeLessThan(1.5); // on the line, never drifting across the map
      }
    }
  });
});

describe('chip copy', () => {
  it('live flow ships the sanctioned line verbatim', () => {
    expect(trafficChipText('live', false)).toBe('Live traffic flow · vehicles modeled from road data');
  });

  it('no state says "simulated"; every state keeps the modeled disclaimer', () => {
    const all = [
      trafficChipText('live', false), trafficChipText('live', true),
      trafficChipText('unavailable', false), trafficChipText('unavailable', true),
    ];
    for (const t of all) {
      expect(t.toLowerCase()).not.toContain('simulated');
      expect(t).toContain('modeled from road data');
    }
  });

  it('the degraded state never claims live flow', () => {
    const t = trafficChipText('unavailable', false);
    expect(t).toContain('live traffic flow unavailable');
    expect(t.startsWith('Live traffic flow')).toBe(false);
  });

  it('below city zoom the chip still explains the zoom requirement', () => {
    expect(trafficChipText('live', true)).toContain('zoom in to city level');
    expect(trafficChipText('unavailable', true)).toContain('zoom in to city level');
  });
});
