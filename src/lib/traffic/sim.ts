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
 *
 * Redeploy note (2026-11-04): this commit exists to trigger a fresh
 * production build of the current tip — the previous deployment race
 * left the production alias serving the pre-car-sprite build while
 * this code was already at the tip.
 *
 * Round 4 (2026-11-04): behavioural fidelity. Vehicles follow the
 * vehicle ahead (stand gap + headway caps), slow for real junctions
 * and dead ends, and come in two kinds — cars and semi trucks with
 * heavier-vehicle parameters (see KIND_PARAMS / TRUCK_SHARE_BY_CLASS).
 * Rendering is decoupled from physics: advance() records the pre-step
 * state and vehiclePointAt interpolates between steps, and a vehicle
 * re-homed by a rebuild GLIDES from its actual world position to its
 * new line instead of snapping sideways. Roads reported closed by
 * incident data (SimOpts.closedRoadIds) are never spawned on, never
 * entered, and are vacated at the next reconcile. The vehicles remain
 * a model: speeds and density follow measured flow, but no simulated
 * vehicle corresponds to any real vehicle in any camera feed.
 */

import { nodeKey, pointAt, type RoadNetwork, type TrafficRoad } from './roads';
import { speedMps } from './congestion';
import { CLASS_SPAWN_WEIGHT, congestionDensityWeight, type RoadClass } from './config';

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

/** What the vehicle is. One fleet, one tracking-number sequence. */
export type VehicleKind = 'car' | 'truck';

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
  /** Vehicle kind; absent reads as 'car' (hand-built fixtures). */
  kind?: VehicleKind;
  /**
   * Render-interpolation state: `s` / road / direction as they were
   * BEFORE the most recent advance step. The component runs physics at
   * a fixed step and renders between steps (see vehiclePointAt), so
   * motion is continuous instead of quantised to the push rate.
   */
  ps?: number;
  pr?: number;
  pd?: 1 | -1;
  /**
   * Re-home glide: when a rebuild re-seats the vehicle on a different
   * line (its street re-drawn a few metres off, or the far-tier
   * survival road), the rendered position eases from the world point
   * it was actually driving at (gx, gy) to the new on-road point over
   * gDur seconds (gt = elapsed) instead of jumping sideways instantly.
   */
  gx?: number;
  gy?: number;
  gt?: number;
  gDur?: number;
}

/** Behaviour parameters per kind. Trucks are heavier in every sense:
 *  gentler acceleration and braking, a cruise a notch below cars, a
 *  longer body, bigger following gaps, and slower junction approaches. */
export interface KindParams {
  accelMps2: number;
  decelMps2: number;
  /** Cruise target multiplier on top of the road's model speed. */
  cruiseFactor: number;
  /** Vehicle body length, metres (following gaps are bumper to bumper). */
  lengthM: number;
  /** Stopped gap to the leader's rear bumper, metres. */
  standGapM: number;
  /** Extra desired gap per m/s of own speed (time headway). */
  headwayS: number;
  /** Junction approach: cruise multiplier at the road end itself. */
  junctionMinFactor: number;
  /** Junction approach: how far out the slowdown begins, metres. */
  junctionZoneM: number;
}

export const KIND_PARAMS: Record<VehicleKind, KindParams> = {
  car: {
    accelMps2: 2.2, decelMps2: 4.5, cruiseFactor: 1,
    lengthM: 4.6, standGapM: 2.2, headwayS: 1.0,
    junctionMinFactor: 0.5, junctionZoneM: 40,
  },
  truck: {
    accelMps2: 1.1, decelMps2: 2.8, cruiseFactor: 0.9,
    lengthM: 16, standGapM: 4.0, headwayS: 1.4,
    junctionMinFactor: 0.38, junctionZoneM: 55,
  },
};

export function kindOf(v: SimVehicle): VehicleKind {
  return v.kind === 'truck' ? 'truck' : 'car';
}

export function kindParams(v: SimVehicle): KindParams {
  return KIND_PARAMS[kindOf(v)];
}

/**
 * Share of spawns on each road class that are semi trucks. Freight
 * lives on the corridors: a meaningful minority of motorway/trunk
 * traffic, a few percent on primary/secondary streets, and none on
 * residential or service roads.
 */
export const TRUCK_SHARE_BY_CLASS: Record<RoadClass, number> = {
  motorway: 0.22, trunk: 0.18, primary: 0.08, secondary: 0.05,
  tertiary: 0.02, minor: 0, service: 0,
};

/** Optional simulation inputs that come from live data, not the model. */
export interface SimOpts {
  /**
   * Roads reported closed by incident data. The sim never spawns on
   * them, never turns onto them, and re-homes vehicles off them at the
   * next reconcile — a closure is ground truth, not a speed hint.
   */
  closedRoadIds?: ReadonlySet<string>;
}

export type RatioFor = (road: TrafficRoad) => number;

/** A fresh spawn never materialises within this travel distance (m)
 *  of a same-direction vehicle already on the road — it would appear
 *  inside that vehicle's braking distance and drive through it. */
const SPAWN_MIN_GAP_M = 30;
const SPAWN_AVOID_ATTEMPTS = 5;

function spawnVehicle(
  network: RoadNetwork,
  rng: Rng,
  ratioFor: RatioFor,
  opts?: SimOpts,
  avoid?: readonly SimVehicle[],
): SimVehicle | null {
  const { roads } = network;
  if (!roads.length) return null;
  const closed = opts?.closedRoadIds;
  let total = 0;
  const cum: number[] = new Array(roads.length);
  for (let i = 0; i < roads.length; i++) {
    // Spawn weight: length × road class × how backed-up the road is.
    // A crawling arterial accumulates vehicles; the same road at free
    // flow carries fewer — density follows the measured congestion.
    // A road reported closed carries nobody at all.
    total += closed?.has(roads[i].id)
      ? 0
      : roads[i].lengthM * CLASS_SPAWN_WEIGHT[roads[i].roadClass]
        * congestionDensityWeight(ratioFor(roads[i]));
    cum[i] = total;
  }
  if (total <= 0) return null;
  let rolled: SimVehicle | null = null;
  for (let attempt = 0; attempt < SPAWN_AVOID_ATTEMPTS; attempt++) {
    const pick = nextFloat(rng) * total;
    let idx = cum.findIndex(c => pick <= c);
    if (idx < 0) idx = roads.length - 1;
    const road = roads[idx];
    const dir: 1 | -1 = road.oneway ? 1 : nextFloat(rng) < 0.5 ? -1 : 1;
    const pace = 0.75 + nextFloat(rng) * 0.35;
    const kind: VehicleKind = nextFloat(rng) < TRUCK_SHARE_BY_CLASS[road.roadClass] ? 'truck' : 'car';
    rolled = {
      roadId: road.id,
      roadIndex: idx,
      s: nextFloat(rng) * road.lengthM,
      dir,
      v: speedMps(road, ratioFor(road)) * pace * 0.7,
      pace,
      kind,
    };
    const conflict = avoid?.some(
      a => a.roadId === rolled!.roadId && a.dir === rolled!.dir
        && Math.abs(a.s - rolled!.s) < SPAWN_MIN_GAP_M,
    );
    if (!conflict) break;
    rolled = attempt === SPAWN_AVOID_ATTEMPTS - 1 ? rolled : null;
  }
  if (!rolled) return null;
  rolled.num = ++rng.seq;
  return rolled;
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
 * re-homed onto the new network's best continuation of its street
 * (see rehomeVehicle: geometry-overlap match first, direction-aware,
 * far-radius survival as a last resort), keeping its speed and pace.
 * Only a vehicle with no road within REHOME_FAR_RADIUS_M of where it
 * was driving is actually dropped.
 */
export function reconcileVehicles(
  vehicles: SimVehicle[],
  network: RoadNetwork,
  target: number,
  rng: Rng,
  ratioFor: RatioFor,
  prevNetwork?: RoadNetwork,
  opts?: SimOpts,
): SimVehicle[] {
  const indexById = new Map(network.roads.map((r, i) => [r.id, i] as const));
  const closed = opts?.closedRoadIds;
  const kept: SimVehicle[] = [];
  let rehomeCtx: RehomeContext | null = null;
  for (const v of vehicles) {
    const idx = indexById.get(v.roadId);
    if (idx !== undefined && !closed?.has(v.roadId)) {
      const road = network.roads[idx];
      v.roadIndex = idx;
      v.s = Math.max(0, Math.min(road.lengthM, v.s));
      if (road.oneway) v.dir = 1;
      // Reconcile does not move the vehicle (beyond the clamp), so the
      // render interpolation restarts from exactly where it is.
      v.ps = v.s; v.pr = v.roadIndex; v.pd = v.dir;
      kept.push(v);
    } else if (prevNetwork || idx !== undefined) {
      // The road vanished from the rebuild — or it is still there but
      // has been reported closed, which amounts to the same thing for
      // the vehicle on it: re-home onto the best continuation, with
      // closed roads (and, in the closure case, its own road) excluded
      // from the candidates.
      if (!rehomeCtx) rehomeCtx = createRehomeContext(network, prevNetwork ?? network);
      const exclude = new Set<string>(closed ?? []);
      exclude.add(v.roadId);
      if (rehomeVehicle(v, rehomeCtx, exclude)) {
        v.ps = v.s; v.pr = v.roadIndex; v.pd = v.dir;
        kept.push(v);
      }
    }
    if (kept.length >= target) break;
  }
  while (kept.length < target) {
    const v = spawnVehicle(network, rng, ratioFor, opts, kept);
    if (!v) break;
    kept.push(v);
  }
  return kept;
}

/** Near tier for re-homing (m): the same street or its immediate continuation. */
const REHOME_RADIUS_M = 75;
/**
 * Far tier for re-homing (m): last resort. A rebuild whose extraction
 * dropped the vehicle's street entirely (tiles still loading, class
 * filtered out at a lower zoom) used to delete the vehicle outright;
 * gliding it onto a road a couple of hundred metres away reads far
 * better than the whole fleet blinking out, so survival wins.
 */
const REHOME_FAR_RADIUS_M = 250;
/** A candidate within this distance (m) gets its same-street overlap sampled. */
const REHOME_OVERLAP_MAX_DIST_M = 40;
/** Sampled points of the old road this close (m) to a candidate count as overlap. */
const REHOME_OVERLAP_TOLERANCE_M = 15;
/** Fraction of sampled points that must overlap for "same physical street". */
const REHOME_OVERLAP_MIN = 0.5;
/** Half-window (m) around the vehicle over which overlap is sampled. */
const REHOME_OVERLAP_WINDOW_M = 60;
/** A near-tier candidate whose bearing is off by more than this is a crossing, not a continuation. */
const REHOME_NEAR_MAX_BEARING_DEG = 60;
const M_PER_DEG_LAT = 110_540;
const M_PER_DEG_LNG = 111_320;

/** Smallest absolute angular distance between two bearings, degrees (0–180). */
function angularDiffDeg(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

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
 * Fraction of the old road around the vehicle (±REHOME_OVERLAP_WINDOW_M)
 * whose sampled points project onto `road` within
 * REHOME_OVERLAP_TOLERANCE_M. A re-clipped twin of the same street
 * scores ~1 even when it was also split at a tile seam (only the window
 * around the vehicle is sampled, not the whole road); a crossing street
 * scores ~0 because the old road only touches it at one point.
 */
function overlapNearVehicle(oldRoad: TrafficRoad, s: number, road: TrafficRoad): number {
  const SAMPLES = 8;
  const lo = Math.max(0, s - REHOME_OVERLAP_WINDOW_M);
  const hi = Math.min(oldRoad.lengthM, s + REHOME_OVERLAP_WINDOW_M);
  let hits = 0;
  for (let k = 0; k <= SAMPLES; k++) {
    const p = pointAt(oldRoad, lo + ((hi - lo) * k) / SAMPLES);
    if (projectOntoRoad(road, p.lng, p.lat).distM <= REHOME_OVERLAP_TOLERANCE_M) hits++;
  }
  return hits / (SAMPLES + 1);
}

interface RehomeChoice {
  idx: number;
  s: number;
  dir: 1 | -1;
  /** 0 = same physical street, 1 = near continuation, 2 = far last resort. */
  tier: number;
  nameMatch: number;
  bearingDiff: number;
  distM: number;
}

function rehomeChoiceBetter(a: RehomeChoice, b: RehomeChoice | null): boolean {
  if (!b) return true;
  if (a.tier !== b.tier) return a.tier < b.tier;
  if (a.tier === 0 && a.nameMatch !== b.nameMatch) return a.nameMatch < b.nameMatch;
  if (Math.abs(a.bearingDiff - b.bearingDiff) > 1) return a.bearingDiff < b.bearingDiff;
  return a.distM < b.distM;
}

/**
 * Move `v` onto the new network's road that best continues where it was
 * driving on the previous network. Returns false only when no road of
 * the new network is within REHOME_FAR_RADIUS_M (it genuinely left the
 * simulated area).
 *
 * The previous implementation took the NEAREST road by projection
 * distance alone. On real rebuilds — where tile re-clipping re-draws
 * every line a few metres and can reverse a polyline's vertex order —
 * that snapped vehicles sideways onto parallel carriageways and
 * frontage roads, and onto re-drawn twins with the travel direction
 * silently flipped: the fleet jittered, reversed, and landed on the
 * wrong street (the owner's "still glitchy, doesn't seem accurate").
 * Candidates are now ranked: (0) the same physical street, proven by
 * sampled geometry overlap around the vehicle (or an exact name match
 * up close); (1) a near road whose bearing continues the vehicle's
 * travel direction; (2) any road within the far radius. Within a tier
 * the winner is the one whose direction of travel best matches the
 * vehicle's current bearing — and the vehicle's `dir` is set to that
 * orientation, so a twin whose vertices came back reversed flips the
 * along-track direction instead of the car's heading on the map.
 */
/** Below this re-home distance (m) the seat change is sub-visible: no glide. */
const GLIDE_MIN_M = 1.5;
/** Glide speed (m/s): a re-homed vehicle visibly drives to its new line. */
const GLIDE_SPEED_MPS = 28;

function rehomeVehicle(v: SimVehicle, ctx: RehomeContext, exclude?: ReadonlySet<string>): boolean {
  const oldRoad = ctx.prevById.get(v.roadId);
  if (!oldRoad) return false;
  const pos = pointAt(oldRoad, v.s);
  const travelBearing = v.dir === 1 ? pos.bearing : (pos.bearing + 180) % 360;
  const cx = Math.floor(pos.lng / ctx.cellLng);
  const cy = Math.floor(pos.lat / ctx.cellLat);
  // Grid cells are ~REHOME_RADIUS_M across; the far tier needs a wider ring.
  const ring = Math.max(1, Math.ceil(REHOME_FAR_RADIUS_M / REHOME_RADIUS_M));
  const candidates = new Set<number>();
  for (let ix = cx - ring; ix <= cx + ring; ix++) {
    for (let iy = cy - ring; iy <= cy + ring; iy++) {
      const arr = ctx.grid.get(`${ix},${iy}`);
      if (arr) for (const ri of arr) candidates.add(ri);
    }
  }
  let best: RehomeChoice | null = null;
  for (const ri of candidates) {
    const road = ctx.next.roads[ri];
    if (exclude?.has(road.id)) continue;
    const proj = projectOntoRoad(road, pos.lng, pos.lat);
    if (proj.distM > REHOME_FAR_RADIUS_M) continue;
    // Orientation: travelling the candidate forward gives its geometric
    // bearing at the projection; backwards (two-way only) the opposite.
    const geomBearing = pointAt(road, proj.s).bearing;
    let dir: 1 | -1 = 1;
    let bearingDiff = angularDiffDeg(travelBearing, geomBearing);
    if (!road.oneway) {
      const backDiff = angularDiffDeg(travelBearing, (geomBearing + 180) % 360);
      if (backDiff < bearingDiff) { bearingDiff = backDiff; dir = -1; }
    }
    const nameMatch = road.name !== '' && road.name === oldRoad.name ? 0 : 1;
    let tier = 2;
    // The bearing clause only ever bites oneway candidates: for a
    // two-way road bearingDiff is the best of both orientations, hence
    // always ≤ 90. A oneway candidate pointing the other way is the
    // OPPOSING carriageway of the same named road, not its twin — the
    // name match must not promote it.
    if (proj.distM <= REHOME_OVERLAP_MAX_DIST_M && bearingDiff <= 90
      && (nameMatch === 0 || overlapNearVehicle(oldRoad, v.s, road) >= REHOME_OVERLAP_MIN)) {
      tier = 0;
    } else if (proj.distM <= REHOME_RADIUS_M && bearingDiff <= REHOME_NEAR_MAX_BEARING_DEG) {
      tier = 1;
    }
    const choice: RehomeChoice = { idx: ri, s: proj.s, dir, tier, nameMatch, bearingDiff, distM: proj.distM };
    if (rehomeChoiceBetter(choice, best)) best = choice;
  }
  if (!best) return false;
  const road = ctx.next.roads[best.idx];
  v.roadId = road.id;
  v.roadIndex = best.idx;
  v.s = Math.max(0, Math.min(road.lengthM, best.s));
  v.dir = road.oneway ? 1 : best.dir;
  // The seat change moves the rendered point by best.distM sideways —
  // instantly, that is the visible "slide/teleport" the owner kept
  // reporting even after the road CHOICE was fixed. Instead the render
  // glides from the world point the vehicle was actually at, over a
  // distance-scaled fraction of a second (see vehiclePointAt).
  if (best.distM > GLIDE_MIN_M) {
    v.gx = pos.lng;
    v.gy = pos.lat;
    v.gt = 0;
    v.gDur = Math.max(0.3, Math.min(1.5, best.distM / GLIDE_SPEED_MPS));
  } else {
    v.gx = undefined; v.gy = undefined; v.gt = undefined; v.gDur = undefined;
  }
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
  opts?: SimOpts,
  fleet?: readonly SimVehicle[],
): void {
  const road = network.roads[v.roadIndex];
  const node = atStartEnd ? road.coords[0] : road.coords[road.coords.length - 1];
  const links = network.junctions.get(nodeKey(node[0], node[1])) ?? [];
  const closed = opts?.closedRoadIds;
  let options: { roadIndex: number; enterAtStart: boolean }[] = [];
  for (const link of links) {
    if (link.roadIndex === v.roadIndex) continue;
    const target = network.roads[link.roadIndex];
    if (closed?.has(target.id)) continue; // never turn onto a closed road
    if (link.atStart) options.push({ roadIndex: link.roadIndex, enterAtStart: true });
    else if (!target.oneway) options.push({ roadIndex: link.roadIndex, enterAtStart: false });
  }
  if (options.length && kindOf(v) === 'truck') {
    // Freight stays on freight roads while it has the choice: a semi
    // only wanders onto minor/service streets when the junction gives
    // it no truck-class exit at all.
    const truckOptions = options.filter(
      o => TRUCK_SHARE_BY_CLASS[network.roads[o.roadIndex].roadClass] > 0,
    );
    if (truckOptions.length) options = truckOptions;
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
  const fresh = spawnVehicle(network, rng, ratioFor, opts, fleet);
  if (fresh) {
    // The tracking number identifies the vehicle for its whole lifetime,
    // so it is carried across the respawn; the fresh spawn's number is
    // discarded with it (a gap in the sequence, never a duplicate).
    // The vehicle's kind is part of that identity too.
    const num = v.num;
    const kind = v.kind;
    Object.assign(v, fresh);
    v.num = num;
    v.kind = kind;
    // A respawn is a genuine teleport (the disclosed case): no
    // interpolation or glide may streak in from the previous life.
    v.ps = v.s; v.pr = v.roadIndex; v.pd = v.dir;
    v.gx = undefined; v.gy = undefined; v.gt = undefined; v.gDur = undefined;
  }
}

/** How far ahead (bumper gap, m) a vehicle watches for a leader. */
const FOLLOW_SCAN_M = 70;
/** Bumper gap (m) the braking-safety cap is anchored to. */
const FOLLOW_HARD_GAP_M = 1.0;
/** Relaxation rate (1/s) of the gap-holding cap — deliberately slower
 *  than any vehicle's braking ability, so a follower can TRACK the cap
 *  curve smoothly all the way in to the stand gap. */
const FOLLOW_GAIN = 0.25;
/** Comfortable braking (m/s²) assumed by the braking-safety cap. */
const BRAKE_COMFORT_MPS2 = 2.2;
/** An onward road counts as "straight on" within this bearing change. */
const STRAIGHT_TOLERANCE_DEG = 30;

/**
 * Speed caps imposed by the vehicle ahead, per vehicle. Vehicles are
 * grouped by road + direction and ordered along travel; each vehicle's
 * leader is the next one in front of it on the same line. The cap is
 * the lower of two terms:
 *   • a gap-holding term — the speed that relaxes the gap toward the
 *     desired gap (stand gap + speed headway) at FOLLOW_GAIN; at the
 *     desired gap it equals the leader's speed exactly, inside it the
 *     follower eases back, outside it the follower may close in;
 *   • a braking-safety term — the fastest speed from which the
 *     follower could still stop at the hard gap behind the leader
 *     under comfortable braking, whatever the leader does.
 * Routed through the ordinary accel/decel limits, queues form, hold,
 * and discharge progressively — stop-and-go bunching where flow is
 * slow, instead of vehicles driving through each other. Local checks
 * only: a leader that has already turned onto the next road is not
 * tracked across the junction.
 */
function followCaps(vehicles: SimVehicle[], network: RoadNetwork): Map<SimVehicle, number> {
  const caps = new Map<SimVehicle, number>();
  const groups = new Map<string, SimVehicle[]>();
  for (const v of vehicles) {
    if (!network.roads[v.roadIndex]) continue;
    const key = `${v.roadIndex}:${v.dir}`;
    const arr = groups.get(key);
    if (arr) arr.push(v); else groups.set(key, [v]);
  }
  for (const arr of groups.values()) {
    // Travel order: ascending along-track position in the direction of
    // travel, so each vehicle's leader is the NEXT entry.
    arr.sort((a, b) => (a.s - b.s) * a.dir);
    for (let i = 0; i + 1 < arr.length; i++) {
      const v = arr[i];
      const leader = arr[i + 1];
      const params = kindParams(v);
      const gap = (leader.s - v.s) * v.dir
        - (kindParams(leader).lengthM + params.lengthM) / 2;
      if (gap >= FOLLOW_SCAN_M) continue;
      const desiredGap = params.standGapM + v.v * params.headwayS;
      const gapTerm = leader.v + (gap - desiredGap) * FOLLOW_GAIN;
      const brakeTerm = Math.sqrt(
        leader.v * leader.v + 2 * BRAKE_COMFORT_MPS2 * Math.max(0, gap - FOLLOW_HARD_GAP_M),
      );
      const cap = Math.max(0, Math.min(gapTerm, brakeTerm));
      const prev = caps.get(v);
      if (prev === undefined || cap < prev) caps.set(v, cap);
    }
  }
  return caps;
}

/**
 * Speed cap for approaching the end of the current road, or null when
 * the approach runs at cruise. Extraction splits streets at tile
 * seams, so most road ends are not real junctions: when an onward road
 * continues within STRAIGHT_TOLERANCE_DEG of the travel bearing the
 * vehicle is effectively driving straight on and does not slow. With
 * no straight continuation (a real junction turn, or a dead end) the
 * cap eases from cruise at the zone edge down to the kind's junction
 * factor at the end itself — cars check their speed for the turn,
 * trucks (longer zone, deeper factor) check it earlier and harder.
 */
function junctionCap(
  v: SimVehicle,
  road: TrafficRoad,
  network: RoadNetwork,
  cruise: number,
  closed?: ReadonlySet<string>,
): number | null {
  const params = kindParams(v);
  const distToEnd = v.dir === 1 ? road.lengthM - v.s : v.s;
  if (distToEnd >= params.junctionZoneM) return null;
  const node = v.dir === 1 ? road.coords[road.coords.length - 1] : road.coords[0];
  const travelBearing = (pointAt(road, v.dir === 1 ? road.lengthM : 0).bearing + (v.dir === 1 ? 0 : 180)) % 360;
  const links = network.junctions.get(nodeKey(node[0], node[1])) ?? [];
  let hasStraight = false;
  for (const link of links) {
    if (link.roadIndex === v.roadIndex) continue;
    const target = network.roads[link.roadIndex];
    if (!target || closed?.has(target.id)) continue;
    if (!link.atStart && target.oneway) continue; // cannot be entered there
    const entryBearing = link.atStart
      ? pointAt(target, 0).bearing
      : (pointAt(target, target.lengthM).bearing + 180) % 360;
    if (angularDiffDeg(travelBearing, entryBearing) <= STRAIGHT_TOLERANCE_DEG) {
      hasStraight = true;
      break;
    }
  }
  if (hasStraight) return null;
  const t = Math.max(0, Math.min(1, distToEnd / params.junctionZoneM));
  const factor = params.junctionMinFactor + (1 - params.junctionMinFactor) * t;
  return cruise * factor;
}

/** Advance every vehicle by dt seconds. Mutates in place (hot loop). */
export function advanceVehicles(
  vehicles: SimVehicle[],
  network: RoadNetwork,
  dt: number,
  rng: Rng,
  ratioFor: RatioFor,
  opts?: SimOpts,
): void {
  if (dt <= 0) return;
  // Caps are computed from the state at the START of the step, so a
  // queue's behaviour doesn't depend on iteration order.
  const caps = followCaps(vehicles, network);
  for (const v of vehicles) {
    const road = network.roads[v.roadIndex];
    if (!road) continue;
    const params = kindParams(v);
    // Previous render state, for the component's between-steps
    // interpolation. Recorded before anything moves this vehicle.
    v.ps = v.s; v.pr = v.roadIndex; v.pd = v.dir;
    const cruise = speedMps(road, ratioFor(road)) * v.pace * params.cruiseFactor;
    let target = cruise;
    const follow = caps.get(v);
    if (follow !== undefined && follow < target) target = follow;
    const junction = junctionCap(v, road, network, cruise, opts?.closedRoadIds);
    if (junction !== null && junction < target) target = junction;
    if (v.v < target) v.v = Math.min(target, v.v + params.accelMps2 * dt);
    else v.v = Math.max(target, v.v - params.decelMps2 * dt);
    v.s += v.dir * v.v * dt;
    if (v.s >= road.lengthM) {
      exitRoad(v, network, false, v.s - road.lengthM, rng, ratioFor, opts, vehicles);
    } else if (v.s <= 0) {
      exitRoad(v, network, true, -v.s, rng, ratioFor, opts, vehicles);
    }
    if (v.roadIndex !== v.pr || v.dir !== v.pd) {
      // Turned onto another road (or around at a dead end): position
      // is continuous through the node itself, and interpolation
      // restarts from the new state rather than streaking across it.
      v.ps = v.s; v.pr = v.roadIndex; v.pd = v.dir;
    }
    if (v.gDur !== undefined && v.gt !== undefined) {
      v.gt += dt;
      if (v.gt >= v.gDur) {
        v.gx = undefined; v.gy = undefined; v.gt = undefined; v.gDur = undefined;
      }
    }
  }
}

/**
 * The point a vehicle should be DRAWN at, given `alpha` — the fraction
 * of the current physics step that has elapsed in real time (0..1).
 * Between the previous and current step states the position is
 * interpolated along the road, so rendering at frame rate shows
 * continuous motion even though physics steps at a fixed rate. While
 * a re-home glide is in flight, the interpolated on-road point is
 * itself eased in from the world point the vehicle was re-homed away
 * from (an ease-out cubic over the glide's duration). At alpha = 1
 * with no glide this is exactly pointAt(road, v.s).
 */
export function vehiclePointAt(
  v: SimVehicle,
  network: RoadNetwork,
  alpha = 1,
): { lng: number; lat: number; bearing: number } | null {
  const road = network.roads[v.roadIndex];
  if (!road) return null;
  let s = v.s;
  if (alpha < 1 && v.ps !== undefined && v.pr === v.roadIndex && v.pd === v.dir) {
    s = v.ps + (v.s - v.ps) * Math.max(0, alpha);
  }
  const p = pointAt(road, s);
  let { lng, lat } = p;
  if (v.gDur !== undefined && v.gt !== undefined && v.gx !== undefined && v.gy !== undefined && v.gt < v.gDur) {
    const t = Math.max(0, Math.min(1, v.gt / v.gDur));
    const e = 1 - Math.pow(1 - t, 3);
    lng = v.gx + (lng - v.gx) * e;
    lat = v.gy + (lat - v.gy) * e;
  }
  const bearing = v.dir === 1 ? p.bearing : (p.bearing + 180) % 360;
  return { lng, lat, bearing };
}

/** GeoJSON point for one vehicle, bearing flipped when travelling backwards. */
export function vehicleFeature(
  v: SimVehicle,
  network: RoadNetwork,
  ratioFor: RatioFor,
  alpha = 1,
): { type: 'Feature'; geometry: { type: 'Point'; coordinates: [number, number] }; properties: Record<string, unknown> } | null {
  const road = network.roads[v.roadIndex];
  if (!road) return null;
  const p = vehiclePointAt(v, network, alpha);
  if (!p) return null;
  const ratio = ratioFor(road);
  return {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
    properties: {
      bearing: Math.round(p.bearing),
      ratio: Math.round(ratio * 100) / 100,
      roadClass: road.roadClass,
      num: v.num ?? 0,
      kind: kindOf(v),
    },
  };
}
