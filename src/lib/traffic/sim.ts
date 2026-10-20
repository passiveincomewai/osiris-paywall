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

/** Deterministic RNG (mulberry32) carried as plain state. */
export interface Rng { state: number }

export function createRng(seed: number): Rng {
  return { state: seed >>> 0 };
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
  };
}

/**
 * Keep `vehicles` riding the (possibly rebuilt) network and top the fleet
 * up to `target`. Vehicles whose road survived the rebuild keep driving —
 * panning doesn't reset the city. Extras are dropped from the tail.
 */
export function reconcileVehicles(
  vehicles: SimVehicle[],
  network: RoadNetwork,
  target: number,
  rng: Rng,
  ratioFor: RatioFor,
): SimVehicle[] {
  const indexById = new Map(network.roads.map((r, i) => [r.id, i] as const));
  const kept: SimVehicle[] = [];
  for (const v of vehicles) {
    const idx = indexById.get(v.roadId);
    if (idx === undefined) continue;
    const road = network.roads[idx];
    v.roadIndex = idx;
    v.s = Math.max(0, Math.min(road.lengthM, v.s));
    if (road.oneway) v.dir = 1;
    kept.push(v);
    if (kept.length >= target) break;
  }
  while (kept.length < target) {
    const v = spawnVehicle(network, rng, ratioFor);
    if (!v) break;
    kept.push(v);
  }
  return kept;
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
  if (fresh) Object.assign(v, fresh);
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
    },
  };
}
