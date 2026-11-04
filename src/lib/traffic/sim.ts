/**
 * WorldEye — Traffic: pure vehicle simulation engine.
 *
 * Vehicles are agents on the road network from roads.ts: each rides a
 * polyline at a speed set by the congestion model (congestion.ts),
 * accelerates/decelerates smoothly toward it, and at a polyline end
 * turns onto a connected road from the junction graph — respecting
 * oneway (a oneway road is only ever entered at its start and travelled
 * forward). Dead ends reverse two-way traffic and respawn oneway
 * traffic. All randomness flows through a seeded RNG, so a run is
 * reproducible and unit-testable. No map, no DOM, no timers in here:
 * the component owns the clock and calls advance() per frame.
 */

import { nodeKey, pointAt, type RoadNetwork, type TrafficRoad } from './roads';
import { speedMps } from './congestion';
import { CLASS_SPAWN_WEIGHT, congestionDensityWeight } from './config';

/**
 * Deterministic RNG (mulberry32) carried as plain state. `seq` is the
 * tracking-number counter: every vehicle ever spawned takes the next
 * number, so a vehicle's number is unique and never recycled while the
 * fleet lives (numbers of retired vehicles leave gaps, never dupes).
 */
export interface Rng { state: number; seq: number }

export function createRng(seed: number): Rng {
  return { state: seed >>> 0, seq: 0 };
}

export function nextFloat(rng: Rng): number {
  rng.state = (rng.state + 0x6d2b79f5) >>> 0;
  let t = rng.state;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export interface SimVehicle {
  roadId: string;
  roadIndex: number;
  /** Metres along the road from its first vertex. */
  s: number;
  /** +1 toward the last vertex, -1 toward the first. Oneway roads are always +1. */
  dir: 1 | -1;
  /** Current speed, m/s. */
  v: number;
  /** Individual pace, 0.75–1.1 — drivers differ. */
  pace: number;
  /**
   * Tracking number ("Car #N"): assigned at spawn from the fleet's
   * sequence, stable for the vehicle's whole lifetime — it survives
   * rebuilds, re-homing, and even the oneway-dead-end respawn. Optional
   * only so hand-built fixtures stay terse; every spawned vehicle has one.
   */
  num?: number;
}

const ACCEL_MPS2 = 2.2;
const DECEL_MPS2 = 4.5;

export type RatioFor = (road: TrafficRoad) => number;

function spawnVehicle(network: RoadNetwork, rng: Rng, ratioFor: RatioFor): SimVehicle | null {
  const { roads } = network;
  if (!roads.length) return null;
  let total = 0;
  const cum: number[] = new Array(roads.length);
  for (let i = 0; i < roads.length; i++) {
    // Spawn weight: length × road class × how backed-up the road is.
    // A crawling arterial accumulates vehicles; the same road at free
    // flow carries fewer — density follows the measured congestion.
    total += roads[i].lengthM * CLASS_SPAWN_WEIGHT[roads[i].roadClass]
      * congestionDensityWeight(ratioFor(roads[i]));
    cum[i] = total;
  }
  const pick = nextFloat(rng) * total;
  let idx = cum.findIndex(c => pick <= c);
  if (idx < 0) idx = roads.length - 1;
  const road = roads[idx];
  const dir: 1 | -1 = road.oneway ? 1 : nextFloat(rng) < 0.5 ? -1 : 1;
  const pace = 0.75 + nextFloat(rng) * 0.35;
  return {
    roadId: road.id,
    roadIndex: idx,
    s: nextFloat(rng) * road.lengthM,
    dir,
    v: speedMps(road, ratioFor(road)) * pace * 0.7,
    pace,
    num: ++rng.seq,
  };
}

/**
 * Keep `vehicles` riding the (possibly rebuilt) network and top the fleet
 * up to `target`. Vehicles whose road survived the rebuild keep driving —
 * panning doesn't reset the city. Extras are dropped from the tail.
 *
 * A rebuild can also hand back the SAME physical road under a NEW id:
 * the id hashes the exact tile-clipped vertex string (roads.ts), and the
 * tiles re-clip / re-simplify geometry whenever the tile set or tile zoom
 * changes. Keyed on id alone, every such rebuild dropped the road's
 * vehicles and respawned them at random positions — the fleet visibly
 * teleported on every pan/zoom and tile refresh. When the caller passes
 * the previous network, a vehicle whose road id vanished is therefore
 * re-homed onto the nearest road of the new network at its current world
 * position (projected along-track), keeping its speed and pace: the dot
 * stays where it was. Only a vehicle with no road within
 * REHOME_RADIUS_M of where it was driving is actually dropped.
 */
export function reconcileVehicles(
  vehicles: SimVehicle[],
  network: RoadNetwork,
  target: number,
  rng: Rng,
  ratioFor: RatioFor,
  prevNetwork?: RoadNetwork,
): SimVehicle[] {
  const indexById = new Map(network.roads.map((r, i) => [r.id, i] as const));
  const kept: SimVehicle[] = [];
  let rehomeCtx: RehomeContext | null = null;
  for (const v of vehicles) {
    const idx = indexById.get(v.roadId);
    if (idx !== undefined) {
      const road = network.roads[idx];
      v.roadIndex = idx;
      v.s = Math.max(0, Math.min(road.lengthM, v.s));
      if (road.oneway) v.dir = 1;
      kept.push(v);
    } else if (prevNetwork) {
      if (!rehomeCtx) rehomeCtx = createRehomeContext(network, prevNetwork);
      if (rehomeVehicle(v, rehomeCtx)) kept.push(v);
    }
    if (kept.length >= target) break;
  }
  while (kept.length < target) {
    const v = spawnVehicle(network, rng, ratioFor);
    if (!v) break;
    kept.push(v);
  }
  return kept;
}

/** How far (m) a vehicle may be re-homed across a rebuild — same street, not the next one over. */
const REHOME_RADIUS_M = 75;
const M_PER_DEG_LAT = 110_540;
const M_PER_DEG_LNG = 111_320;

interface RehomeContext {
  next: RoadNetwork;
  prevById: Map<string, TrafficRoad>;
  cellLat: number;
  cellLng: number;
  grid: Map<string, number[]>;
}

/**
 * Candidate index over the NEW network for re-homing: road indices
 * registered into ~REHOME_RADIUS_M cells along every segment (not just
 * at vertices — a long segment spans cells its endpoints never touch).
 */
function createRehomeContext(next: RoadNetwork, prev: RoadNetwork): RehomeContext {
  const midLat = next.roads.length ? next.roads[0].coords[0][1] : 0;
  const cellLat = REHOME_RADIUS_M / M_PER_DEG_LAT;
  const cellLng = REHOME_RADIUS_M / (M_PER_DEG_LNG * Math.max(0.2, Math.cos((midLat * Math.PI) / 180)));
  const key = (lng: number, lat: number) => `${Math.floor(lng / cellLng)},${Math.floor(lat / cellLat)}`;
  const grid = new Map<string, number[]>();
  next.roads.forEach((road, ri) => {
    const registered = new Set<string>();
    const register = (lng: number, lat: number) => {
      const k = key(lng, lat);
      if (registered.has(k)) return;
      registered.add(k);
      const arr = grid.get(k);
      if (arr) arr.push(ri); else grid.set(k, [ri]);
    };
    const step = Math.min(cellLat, cellLng) * 0.9;
    for (let i = 1; i < road.coords.length; i++) {
      const [ax, ay] = road.coords[i - 1];
      const [bx, by] = road.coords[i];
      const span = Math.max(Math.abs(bx - ax), Math.abs(by - ay));
      const steps = Math.max(1, Math.ceil(span / step));
      for (let k = 0; k <= steps; k++) register(ax + ((bx - ax) * k) / steps, ay + ((by - ay) * k) / steps);
    }
  });
  return {
    next,
    prevById: new Map(prev.roads.map(r => [r.id, r] as const)),
    cellLat,
    cellLng,
    grid,
  };
}

/** Closest point on `road` to (lng, lat): along-track metres + gap in metres. */
function projectOntoRoad(road: TrafficRoad, lng: number, lat: number): { s: number; distM: number } {
  const cosLat = Math.cos((lat * Math.PI) / 180);
  let bestS = 0;
  let bestD2 = Infinity;
  for (let i = 1; i < road.coords.length; i++) {
    const a = road.coords[i - 1];
    const b = road.coords[i];
    const ax = (a[0] - lng) * M_PER_DEG_LNG * cosLat;
    const ay = (a[1] - lat) * M_PER_DEG_LAT;
    const bx = (b[0] - lng) * M_PER_DEG_LNG * cosLat;
    const by = (b[1] - lat) * M_PER_DEG_LAT;
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    let t = len2 > 0 ? -(ax * dx + ay * dy) / len2 : 0;
    t = Math.max(0, Math.min(1, t));
    const cx = ax + t * dx;
    const cy = ay + t * dy;
    const d2 = cx * cx + cy * cy;
    if (d2 < bestD2) {
      bestD2 = d2;
      bestS = road.cumM[i - 1] + t * (road.cumM[i] - road.cumM[i - 1]);
    }
  }
  return { s: bestS, distM: Math.sqrt(bestD2) };
}

/**
 * Move `v` onto the new network's nearest road to where it was driving on
 * the previous network. Returns false when it was nowhere near any road
 * of the new network (it genuinely left the simulated area).
 */
function rehomeVehicle(v: SimVehicle, ctx: RehomeContext): boolean {
  const oldRoad = ctx.prevById.get(v.roadId);
  if (!oldRoad) return false;
  const pos = pointAt(oldRoad, v.s);
  const cx = Math.floor(pos.lng / ctx.cellLng);
  const cy = Math.floor(pos.lat / ctx.cellLat);
  const candidates = new Set<number>();
  for (let ix = cx - 1; ix <= cx + 1; ix++) {
    for (let iy = cy - 1; iy <= cy + 1; iy++) {
      const arr = ctx.grid.get(`${ix},${iy}`);
      if (arr) for (const ri of arr) candidates.add(ri);
    }
  }
  let best: { idx: number; s: number; distM: number } | null = null;
  for (const ri of candidates) {
    const road = ctx.next.roads[ri];
    const proj = projectOntoRoad(road, pos.lng, pos.lat);
    if (proj.distM > REHOME_RADIUS_M) continue;
    // Nearest wins; within a metre, prefer the same road class (keeps a
    // vehicle off a parallel frontage road when its own street ties).
    const better = !best
      || proj.distM < best.distM - 1
      || (proj.distM <= best.distM + 1
        && road.roadClass === oldRoad.roadClass
        && ctx.next.roads[best.idx].roadClass !== oldRoad.roadClass);
    if (better) best = { idx: ri, s: proj.s, distM: proj.distM };
  }
  if (!best) return false;
  const road = ctx.next.roads[best.idx];
  v.roadId = road.id;
  v.roadIndex = best.idx;
  v.s = Math.max(0, Math.min(road.lengthM, best.s));
  if (road.oneway) v.dir = 1;
  return true;
}

/** Move one vehicle off the end it just crossed, or turn it around / respawn it. */
function exitRoad(
  v: SimVehicle,
  network: RoadNetwork,
  atStartEnd: boolean,
  overflow: number,
  rng: Rng,
  ratioFor: RatioFor,
): void {
  const road = network.roads[v.roadIndex];
  const node = atStartEnd ? road.coords[0] : road.coords[road.coords.length - 1];
  const links = network.junctions.get(nodeKey(node[0], node[1])) ?? [];
  const options: { roadIndex: number; enterAtStart: boolean }[] = [];
  for (const link of links) {
    if (link.roadIndex === v.roadIndex) continue;
    const target = network.roads[link.roadIndex];
    if (link.atStart) options.push({ roadIndex: link.roadIndex, enterAtStart: true });
    else if (!target.oneway) options.push({ roadIndex: link.roadIndex, enterAtStart: false });
  }
  if (options.length) {
    const choice = options[Math.floor(nextFloat(rng) * options.length) % options.length];
    const target = network.roads[choice.roadIndex];
    v.roadId = target.id;
    v.roadIndex = choice.roadIndex;
    if (choice.enterAtStart) {
      v.dir = 1;
      v.s = Math.min(overflow, target.lengthM);
    } else {
      v.dir = -1;
      v.s = Math.max(0, target.lengthM - overflow);
    }
    return;
  }
  if (!road.oneway) {
    // Dead end on a two-way road: turn around.
    v.dir = atStartEnd ? 1 : -1;
    v.s = atStartEnd ? 0 : road.lengthM;
    v.v *= 0.4;
    return;
  }
  // Oneway dead end (e.g. a tile-clipped motorway stub): respawn elsewhere.
  const fresh = spawnVehicle(network, rng, ratioFor);
  if (fresh) {
    // The tracking number identifies the vehicle for its whole lifetime,
    // so it is carried across the respawn; the fresh spawn's number is
    // discarded with it (a gap in the sequence, never a duplicate).
    const num = v.num;
    Object.assign(v, fresh);
    v.num = num;
  }
}

/** Advance every vehicle by dt seconds. Mutates in place (hot loop). */
export function advanceVehicles(
  vehicles: SimVehicle[],
  network: RoadNetwork,
  dt: number,
  rng: Rng,
  ratioFor: RatioFor,
): void {
  if (dt <= 0) return;
  for (const v of vehicles) {
    const road = network.roads[v.roadIndex];
    if (!road) continue;
    const target = speedMps(road, ratioFor(road)) * v.pace;
    if (v.v < target) v.v = Math.min(target, v.v + ACCEL_MPS2 * dt);
    else v.v = Math.max(target, v.v - DECEL_MPS2 * dt);
    v.s += v.dir * v.v * dt;
    if (v.s >= road.lengthM) {
      exitRoad(v, network, false, v.s - road.lengthM, rng, ratioFor);
    } else if (v.s <= 0) {
      exitRoad(v, network, true, -v.s, rng, ratioFor);
    }
  }
}

/** GeoJSON point for one vehicle, bearing flipped when travelling backwards. */
export function vehicleFeature(
  v: SimVehicle,
  network: RoadNetwork,
  ratioFor: RatioFor,
): { type: 'Feature'; geometry: { type: 'Point'; coordinates: [number, number] }; properties: Record<string, unknown> } | null {
  const road = network.roads[v.roadIndex];
  if (!road) return null;
  const p = pointAt(road, v.s);
  const bearing = v.dir === 1 ? p.bearing : (p.bearing + 180) % 360;
  const ratio = ratioFor(road);
  return {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
    properties: {
      bearing: Math.round(bearing),
      ratio: Math.round(ratio * 100) / 100,
      roadClass: road.roadClass,
      num: v.num ?? 0,
    },
  };
}
