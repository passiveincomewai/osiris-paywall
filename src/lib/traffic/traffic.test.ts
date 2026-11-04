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
  createRng, nextFloat, reconcileVehicles, advanceVehicles, vehicleFeature, vehiclePointAt,
  KIND_PARAMS, TRUCK_SHARE_BY_CLASS, type SimVehicle,
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

describe('reconcile across a re-clipped rebuild', () => {
  it('re-homes a vehicle onto the re-clipped twin of its road instead of respawning it', () => {
    const before = buildRoadNetwork([line([[0, 0], [0.01, 0]], { name: 'A Street' })], 14);
    // Same physical street, re-simplified by the tiles: an extra vertex a
    // couple of metres off the original line — a different geometry hash,
    // therefore a different road id.
    const after = buildRoadNetwork([line([[0, 0], [0.004, 0.00002], [0.01, 0]], { name: 'A Street' })], 14);
    expect(after.roads[0].id).not.toBe(before.roads[0].id);
    const road = before.roads[0];
    const v: SimVehicle = { roadId: road.id, roadIndex: 0, s: 500, dir: 1, v: 8, pace: 0.9 };
    const kept = reconcileVehicles([v], after, 1, createRng(7), () => 1, before);
    expect(kept).toHaveLength(1);
    expect(kept[0]).toBe(v); // same vehicle — not a random respawn
    expect(v.roadId).toBe(after.roads[0].id);
    expect(v.pace).toBe(0.9);
    const p0 = pointAt(road, 500);
    const p1 = pointAt(after.roads[0], v.s);
    expect(haversineM([p0.lng, p0.lat], [p1.lng, p1.lat])).toBeLessThan(5);
  });

  it('still drops a vehicle whose road vanished with no road nearby', () => {
    const before = buildRoadNetwork([line([[0, 0], [0.01, 0]], { name: 'A Street' })], 14);
    const after = buildRoadNetwork([line([[0.05, 0.05], [0.06, 0.05]], { name: 'Far Street' })], 14);
    const road = before.roads[0];
    const v: SimVehicle = { roadId: road.id, roadIndex: 0, s: 500, dir: 1, v: 8, pace: 0.9 };
    const kept = reconcileVehicles([v], after, 1, createRng(7), () => 1, before);
    expect(kept).toHaveLength(1); // topped back up with a fresh spawn
    expect(kept[0]).not.toBe(v);
  });

  it('keeps world direction when the twin returns with reversed vertices', () => {
    const before = buildRoadNetwork([line([[0, 0], [0.01, 0]], { name: 'A Street' })], 14);
    // Same physical street, vertices in the opposite order — tile clips
    // do this; the id differs and the polyline's forward is now west.
    const after = buildRoadNetwork([line([[0.01, 0], [0, 0]], { name: 'A Street' })], 14);
    expect(after.roads[0].id).not.toBe(before.roads[0].id);
    const road = before.roads[0];
    const v: SimVehicle = { roadId: road.id, roadIndex: 0, s: 300, dir: 1, v: 8, pace: 0.9 };
    const kept = reconcileVehicles([v], after, 1, createRng(7), () => 1, before);
    expect(kept[0]).toBe(v);
    expect(v.roadId).toBe(after.roads[0].id);
    // Along-track direction flips so the car keeps driving EAST.
    expect(v.dir).toBe(-1);
    expect(vehicleFeature(v, after, () => 1)!.properties.bearing).toBe(90);
    const p0 = pointAt(road, 300);
    const p1 = pointAt(after.roads[0], v.s);
    expect(haversineM([p0.lng, p0.lat], [p1.lng, p1.lat])).toBeLessThan(5);
  });

  it('re-homes onto the same street, not a nearer parallel road', () => {
    const before = buildRoadNetwork([line([[0, 0], [0.01, 0]], { name: 'A Street' })], 14);
    const after = buildRoadNetwork([
      // The street itself, re-drawn ~4 m north under a new id…
      line([[0, 0.00004], [0.01, 0.00004]], { name: 'A Street' }),
      // …and a different street running parallel ~1 m north — nearer to
      // the vehicle than its own street is. Nearest-distance matching
      // (the old behaviour) put the car on the frontage road.
      line([[0, 0.00001], [0.01, 0.00001]], { name: 'Frontage Road' }),
    ], 14);
    const twin = after.roads.find(r => r.name === 'A Street')!;
    const road = before.roads[0];
    const v: SimVehicle = { roadId: road.id, roadIndex: 0, s: 500, dir: 1, v: 8, pace: 0.9 };
    const kept = reconcileVehicles([v], after, 1, createRng(7), () => 1, before);
    expect(kept[0]).toBe(v);
    expect(v.roadId).toBe(twin.id);
  });

  it('survives on a road a couple of hundred metres away when its street is gone', () => {
    const before = buildRoadNetwork([line([[0, 0], [0.01, 0]], { name: 'A Street' })], 14);
    // The rebuild's extraction lost A Street entirely (tile still
    // loading / class filtered); the nearest street is ~150 m north.
    const after = buildRoadNetwork([line([[0, 0.00135], [0.01, 0.00135]], { name: 'Near Street' })], 14);
    const road = before.roads[0];
    const v: SimVehicle = { roadId: road.id, roadIndex: 0, s: 500, dir: 1, v: 8, pace: 0.9 };
    const kept = reconcileVehicles([v], after, 1, createRng(7), () => 1, before);
    expect(kept[0]).toBe(v); // glides to the nearby street instead of vanishing
    expect(v.roadId).toBe(after.roads[0].id);
  });
});

describe('tracking numbers', () => {
  it('spawned vehicles carry unique numbers that reconcile keeps', () => {
    const net = abNetwork();
    const rng = createRng(5);
    const first = reconcileVehicles([], net, 12, rng, () => 1);
    const nums = first.map(v => v.num);
    expect(nums.every(n => typeof n === 'number' && n > 0)).toBe(true);
    expect(new Set(nums).size).toBe(12);
    const again = reconcileVehicles(first, net, 12, rng, () => 1);
    expect(again.map(v => v.num)).toEqual(nums);
  });

  it('a vehicle respawned at a oneway dead end keeps its tracking number', () => {
    const net = buildRoadNetwork([line([[0, 0], [0.01, 0]], { oneway: 1 })], 14);
    const road = net.roads[0];
    const v: SimVehicle = { roadId: road.id, roadIndex: 0, s: road.lengthM - 2, dir: 1, v: speedMps(road, 1), pace: 1, num: 42 };
    const rng = createRng(3);
    for (let i = 0; i < 20; i++) advanceVehicles([v], net, 0.5, rng, () => 1);
    expect(v.num).toBe(42);
  });

  it('vehicleFeature exposes the tracking number', () => {
    const net = abNetwork();
    const road = net.roads.find(r => r.name === 'A Street')!;
    const v: SimVehicle = { roadId: road.id, roadIndex: net.roads.indexOf(road), s: 100, dir: 1, v: 5, pace: 1, num: 7 };
    expect(vehicleFeature(v, net, () => 1)!.properties.num).toBe(7);
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

// ── Round 4: interpolation, glide, following, junctions, closures, trucks ──

/** One long straight primary road (~3.3 km), alone in its network. */
function longRoadNet(props: Record<string, unknown> = {}) {
  return buildRoadNetwork([line([[0, 0], [0.03, 0]], { name: 'Long Road', ...props })], 14);
}

describe('render interpolation', () => {
  it('vehicleFeature interpolates between the previous and current step states', () => {
    const net = longRoadNet();
    const road = net.roads[0];
    const v: SimVehicle = {
      roadId: road.id, roadIndex: 0, s: 1000, dir: 1, v: speedMps(road, 1), pace: 1,
    };
    advanceVehicles([v], net, 1 / 30, createRng(1), () => 1);
    expect(v.ps).toBe(1000);
    expect(v.s).toBeGreaterThan(1000);
    const at0 = vehicleFeature(v, net, () => 1, 0)!;
    const atHalf = vehicleFeature(v, net, () => 1, 0.5)!;
    const at1 = vehicleFeature(v, net, () => 1, 1)!;
    expect(at0.geometry.coordinates[0]).toBeCloseTo(pointAt(road, 1000).lng, 9);
    expect(at1.geometry.coordinates[0]).toBeCloseTo(pointAt(road, v.s).lng, 9);
    // Straight road: the halfway render is the midpoint of the step.
    expect(atHalf.geometry.coordinates[0]).toBeCloseTo(
      (at0.geometry.coordinates[0] + at1.geometry.coordinates[0]) / 2, 9,
    );
    // Default alpha (1) is the plain current position — old callers unchanged.
    expect(vehicleFeature(v, net, () => 1)!.geometry.coordinates).toEqual(at1.geometry.coordinates);
  });

  it('interpolation never streaks across a road change', () => {
    const net = abNetwork();
    const a = net.roads.find(r => r.name === 'A Street')!;
    const v: SimVehicle = {
      roadId: a.id, roadIndex: net.roads.indexOf(a),
      s: a.lengthM - 1, dir: 1, v: speedMps(a, 1), pace: 1,
    };
    const rng = createRng(7);
    for (let i = 0; i < 10 && v.roadId === a.id; i++) advanceVehicles([v], net, 0.25, rng, () => 1);
    expect(v.roadId).not.toBe(a.id); // turned onto B Street
    const p = vehiclePointAt(v, net, 0)!;
    const road = net.roads[v.roadIndex];
    expect(haversineM([p.lng, p.lat], (() => { const q = pointAt(road, v.s); return [q.lng, q.lat]; })())).toBeLessThan(1);
  });
});

describe('re-home glide', () => {
  it('a re-homed vehicle renders where it actually was, then glides to its new line', () => {
    const before = buildRoadNetwork([line([[0, 0], [0.01, 0]], { name: 'A Street' })], 14);
    // The same street re-drawn ~22 m north under a new id.
    const after = buildRoadNetwork([line([[0, 0.0002], [0.01, 0.0002]], { name: 'A Street' })], 14);
    const oldRoad = before.roads[0];
    const v: SimVehicle = { roadId: oldRoad.id, roadIndex: 0, s: 500, dir: 1, v: 8, pace: 0.9 };
    const kept = reconcileVehicles([v], after, 1, createRng(7), () => 1, before);
    expect(kept[0]).toBe(v);
    expect(v.gDur).toBeGreaterThan(0);
    // At the moment of the rebuild the drawn point is the OLD position —
    // no sideways jump, however far the new line sits.
    const atOnce = vehiclePointAt(v, after, 1)!;
    const was = pointAt(oldRoad, 500);
    expect(haversineM([atOnce.lng, atOnce.lat], [was.lng, was.lat])).toBeLessThan(0.5);
    // Mid-glide it is most of the way across (ease-out cubic).
    advanceVehicles([v], after, (v.gDur ?? 0) / 2, createRng(7), () => 1);
    const mid = vehiclePointAt(v, after, 1)!;
    expect(haversineM([mid.lng, mid.lat], [was.lng, was.lat])).toBeGreaterThan(12);
    const onRoadNow = pointAt(after.roads[0], v.s);
    expect(haversineM([mid.lng, mid.lat], [onRoadNow.lng, onRoadNow.lat])).toBeLessThan(8);
    // After the glide the vehicle is exactly on its road and the glide is done.
    advanceVehicles([v], after, 2, createRng(7), () => 1);
    expect(v.gDur).toBeUndefined();
    const done = vehiclePointAt(v, after, 1)!;
    const onRoad = pointAt(after.roads[0], v.s);
    expect(haversineM([done.lng, done.lat], [onRoad.lng, onRoad.lat])).toBeLessThan(0.5);
  });
});

describe('car following', () => {
  it('a follower queues behind a stopped leader instead of driving through it', () => {
    const net = longRoadNet();
    const road = net.roads[0];
    const cruise = speedMps(road, 1);
    const leader: SimVehicle = {
      roadId: road.id, roadIndex: 0, s: 1600, dir: 1, v: 0, pace: 0.75, kind: 'car',
    };
    const follower: SimVehicle = {
      roadId: road.id, roadIndex: 0, s: 1480, dir: 1, v: cruise, pace: 1, kind: 'car',
    };
    // The "leader" is held stopped by giving it a hand on the brake:
    // its pace target is cruise, so pin it each step to model a queue head.
    const rng = createRng(2);
    for (let i = 0; i < 60 * 30; i++) {
      advanceVehicles([leader, follower], net, 1 / 30, rng, () => 1);
      leader.v = 0; leader.s = 1600; // the queue ahead is not moving
      const gap = leader.s - follower.s - KIND_PARAMS.car.lengthM;
      expect(gap).toBeGreaterThan(0); // never overlaps, never passes through
    }
    const finalGap = leader.s - follower.s - KIND_PARAMS.car.lengthM;
    expect(finalGap).toBeGreaterThan(0.5);
    expect(finalGap).toBeLessThan(8); // pulled up to roughly the stand gap
    expect(follower.v).toBeLessThan(0.5); // and it is stopped, not creeping through
  });

  it('the queue discharges when the leader pulls away', () => {
    const net = longRoadNet();
    const road = net.roads[0];
    const cruise = speedMps(road, 1);
    const leader: SimVehicle = {
      roadId: road.id, roadIndex: 0, s: 1600, dir: 1, v: 0, pace: 1, kind: 'car',
    };
    const follower: SimVehicle = {
      roadId: road.id, roadIndex: 0, s: 1590, dir: 1, v: 0, pace: 1, kind: 'car',
    };
    const rng = createRng(2);
    for (let i = 0; i < 30 * 30; i++) advanceVehicles([leader, follower], net, 1 / 30, rng, () => 1);
    expect(leader.v).toBeGreaterThan(cruise * 0.8);
    expect(follower.v).toBeGreaterThan(cruise * 0.5); // followed it away
    const gap = leader.s - follower.s - KIND_PARAMS.car.lengthM;
    expect(gap).toBeGreaterThan(1);
    expect(follower.s).toBeGreaterThan(1590 + 100); // real distance covered
  });

  it('opposite-direction vehicles do not brake for each other', () => {
    const net = longRoadNet();
    const road = net.roads[0];
    const cruise = speedMps(road, 1);
    const east: SimVehicle = { roadId: road.id, roadIndex: 0, s: 1400, dir: 1, v: cruise, pace: 1 };
    const west: SimVehicle = { roadId: road.id, roadIndex: 0, s: 1700, dir: -1, v: cruise, pace: 1 };
    const rng = createRng(2);
    for (let i = 0; i < 30; i++) advanceVehicles([east, west], net, 1 / 30, rng, () => 1);
    expect(east.v).toBeGreaterThan(cruise * 0.95);
    expect(west.v).toBeGreaterThan(cruise * 0.95);
  });
});

describe('junction approach', () => {
  function teeNet(withContinuation: boolean) {
    const feats: RawRoadFeature[] = [
      line([[0, 0], [0.02, 0]], { name: 'A Street' }),
      line([[0.02, 0], [0.02, 0.01]], { name: 'B Street' }),
    ];
    if (withContinuation) feats.push(line([[0.02, 0], [0.04, 0]], { name: 'A Street' }));
    return buildRoadNetwork(feats, 14);
  }

  it('slows for a junction with no straight continuation', () => {
    const net = teeNet(false);
    const a = net.roads.find(r => r.name === 'A Street')!;
    const cruise = speedMps(a, 1);
    const v: SimVehicle = {
      roadId: a.id, roadIndex: net.roads.indexOf(a),
      s: a.lengthM - 35, dir: 1, v: cruise, pace: 1,
    };
    const rng = createRng(4);
    for (let i = 0; i < 20; i++) advanceVehicles([v], net, 0.1, rng, () => 1);
    expect(v.roadId).toBe(a.id); // still approaching, has not blown through
    expect(v.v).toBeLessThan(cruise * 0.75);
  });

  it('does not slow where the road continues straight (a tile-seam junction)', () => {
    const net = teeNet(true);
    const a = net.roads.find(r => r.name === 'A Street' && r.coords[0][0] === 0)!;
    const cruise = speedMps(a, 1);
    const v: SimVehicle = {
      roadId: a.id, roadIndex: net.roads.indexOf(a),
      s: a.lengthM - 35, dir: 1, v: cruise, pace: 1,
    };
    const rng = createRng(4);
    for (let i = 0; i < 20; i++) advanceVehicles([v], net, 0.1, rng, () => 1);
    expect(v.v).toBeGreaterThan(cruise * 0.95);
  });
});

describe('closed roads', () => {
  function twoRoadNet() {
    return buildRoadNetwork([
      line([[0, 0], [0.02, 0]], { name: 'Open Street', class: 'primary' }),
      line([[0, 0.0005], [0.02, 0.0005]], { name: 'Shut Street', class: 'motorway' }),
    ], 14);
  }

  it('never spawns on a closed road', () => {
    const net = twoRoadNet();
    const shut = net.roads.find(r => r.name === 'Shut Street')!;
    const vehicles = reconcileVehicles([], net, 40, createRng(9), () => 1, undefined,
      { closedRoadIds: new Set([shut.id]) });
    expect(vehicles).toHaveLength(40);
    expect(vehicles.every(v => v.roadId !== shut.id)).toBe(true);
  });

  it('re-homes a vehicle off a road that has been reported closed', () => {
    const net = twoRoadNet();
    const shut = net.roads.find(r => r.name === 'Shut Street')!;
    const open = net.roads.find(r => r.name === 'Open Street')!;
    const v: SimVehicle = {
      roadId: shut.id, roadIndex: net.roads.indexOf(shut), s: 500, dir: 1, v: 8, pace: 0.9, num: 3,
    };
    const kept = reconcileVehicles([v], net, 1, createRng(9), () => 1, net,
      { closedRoadIds: new Set([shut.id]) });
    expect(kept[0]).toBe(v);
    expect(v.roadId).toBe(open.id);
    expect(v.num).toBe(3);
  });

  it('never turns onto a closed road at a junction', () => {
    const net = buildRoadNetwork([
      line([[0, 0], [0.01, 0]], { name: 'A Street', oneway: 1 }),
      line([[0.01, 0], [0.01, 0.01]], { name: 'B Street', oneway: 1 }),
    ], 14);
    const a = net.roads.find(r => r.name === 'A Street')!;
    const b = net.roads.find(r => r.name === 'B Street')!;
    const v: SimVehicle = {
      roadId: a.id, roadIndex: net.roads.indexOf(a),
      s: a.lengthM - 2, dir: 1, v: speedMps(a, 1), pace: 1, num: 5,
    };
    const rng = createRng(3);
    const opts = { closedRoadIds: new Set([b.id]) };
    for (let i = 0; i < 60; i++) {
      advanceVehicles([v], net, 0.25, rng, () => 1, opts);
      expect(v.roadId).not.toBe(b.id);
    }
    expect(v.num).toBe(5); // it respawned on A, still itself
  });
});

describe('semi trucks', () => {
  it('freight share by road class: meaningful on motorways, none on minor streets', () => {
    expect(TRUCK_SHARE_BY_CLASS.motorway).toBeGreaterThanOrEqual(0.15);
    expect(TRUCK_SHARE_BY_CLASS.motorway).toBeLessThanOrEqual(0.25);
    expect(TRUCK_SHARE_BY_CLASS.trunk).toBeGreaterThanOrEqual(0.15);
    expect(TRUCK_SHARE_BY_CLASS.minor).toBe(0);
    expect(TRUCK_SHARE_BY_CLASS.service).toBe(0);

    const motorway = buildRoadNetwork([line([[0, 0], [0.05, 0]], { class: 'motorway' })], 14);
    const fleet = reconcileVehicles([], motorway, 200, createRng(21), () => 1);
    const trucks = fleet.filter(v => v.kind === 'truck');
    expect(trucks.length).toBeGreaterThan(20);
    expect(trucks.length).toBeLessThan(70);
    // One fleet, one number sequence: trucks take numbers from the same pool.
    expect(new Set(fleet.map(v => v.num)).size).toBe(200);

    const minor = buildRoadNetwork([line([[0, 0], [0.05, 0]], { class: 'minor' })], 16);
    const local = reconcileVehicles([], minor, 60, createRng(21), () => 1);
    expect(local.every(v => v.kind !== 'truck')).toBe(true);
  });

  it('a truck cruises below a car on the same road and accelerates more gently', () => {
    const net = longRoadNet();
    const road = net.roads[0];
    const carCruise = speedMps(road, 1);
    const truck: SimVehicle = {
      roadId: road.id, roadIndex: 0, s: 1200, dir: 1, v: 0, pace: 1, kind: 'truck',
    };
    const rng = createRng(6);
    advanceVehicles([truck], net, 1, rng, () => 1);
    expect(truck.v).toBeCloseTo(KIND_PARAMS.truck.accelMps2, 5); // 1 s of truck acceleration
    for (let i = 0; i < 60; i++) advanceVehicles([truck], net, 0.5, rng, () => 1);
    expect(truck.v).toBeLessThan(carCruise * 0.95);
    expect(truck.v).toBeGreaterThan(carCruise * 0.8);
  });

  it('a truck keeps a larger stand gap than a car behind the same stopped leader', () => {
    const finalGapFor = (kind: 'car' | 'truck') => {
      const net = longRoadNet();
      const road = net.roads[0];
      const leader: SimVehicle = {
        roadId: road.id, roadIndex: 0, s: 1600, dir: 1, v: 0, pace: 0.75, kind: 'car',
      };
      const follower: SimVehicle = {
        roadId: road.id, roadIndex: 0, s: 1480, dir: 1, v: speedMps(road, 1), pace: 1, kind,
      };
      const rng = createRng(2);
      for (let i = 0; i < 60 * 30; i++) {
        advanceVehicles([leader, follower], net, 1 / 30, rng, () => 1);
        leader.v = 0; leader.s = 1600;
      }
      return leader.s - follower.s
        - (KIND_PARAMS.car.lengthM + KIND_PARAMS[kind].lengthM) / 2;
    };
    const carGap = finalGapFor('car');
    const truckGap = finalGapFor('truck');
    expect(carGap).toBeGreaterThan(0.5);
    expect(truckGap).toBeGreaterThan(carGap + 1);
  });

  it('vehicleFeature reports the kind', () => {
    const net = longRoadNet();
    const road = net.roads[0];
    const car: SimVehicle = { roadId: road.id, roadIndex: 0, s: 100, dir: 1, v: 5, pace: 1 };
    const truck: SimVehicle = { ...car, kind: 'truck' };
    expect(vehicleFeature(car, net, () => 1)!.properties.kind).toBe('car');
    expect(vehicleFeature(truck, net, () => 1)!.properties.kind).toBe('truck');
  });
});
