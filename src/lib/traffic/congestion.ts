/**
 * WorldEye — Traffic: congestion & speed model.
 *
 * A road's live speed comes from, in priority order:
 *   1. TomTom Traffic Flow `relative_speed` sampled onto the road
 *      (only when a server-side TomTom key is configured — see
 *      src/app/api/traffic/flow and docs/traffic.md), or
 *   2. this deterministic simulated model: class free-flow speed × a
 *      time-of-day factor (rush-hour dips on arterials, quiet nights)
 *      × a stable per-road variation. Same inputs → same output, so the
 *      model is unit-testable and doesn't shimmer between frames.
 *
 * Either way the RESULT is a speed ratio rendered green/amber/red. The
 * model never claims to observe real vehicles.
 */

import { fnv1a, type TrafficRoad } from './roads';
import { type RoadClass } from './config';

/** Free-flow speeds by road class, km/h. */
export const FREE_FLOW_KMH: Record<RoadClass, number> = {
  motorway: 105, trunk: 80, primary: 50, secondary: 40, tertiary: 34, minor: 28, service: 15,
};

/** How deep the rush-hour dip cuts, per class — arterials suffer most. */
const RUSH_DEPTH: Record<RoadClass, number> = {
  motorway: 0.55, trunk: 0.5, primary: 0.5, secondary: 0.42, tertiary: 0.34, minor: 0.24, service: 0.14,
};

function gauss(x: number, mean: number, sd: number): number {
  const d = (x - mean) / sd;
  return Math.exp(-0.5 * d * d);
}

/**
 * Time-of-day throughput factor in (0.3, 1]. Local hour as a float
 * (8.5 = 08:30). Weekends keep a shallower midday dip instead of twin
 * commuter peaks. Pure function of its inputs.
 */
export function timeOfDayFactor(roadClass: RoadClass, hour: number, weekend: boolean): number {
  const depth = RUSH_DEPTH[roadClass] * (weekend ? 0.5 : 1);
  let dip: number;
  if (weekend) {
    dip = depth * 0.7 * gauss(hour, 12.5, 2.6);
  } else {
    dip = depth * (gauss(hour, 8, 1.5) + gauss(hour, 17.2, 1.7));
  }
  // Late night runs a touch over the nominal pace (emptier roads).
  const nightBoost = hour < 5.5 || hour >= 22.5 ? 0.05 : 0;
  return Math.max(0.3, Math.min(1, 1 - dip + nightBoost));
}

/** Stable per-road variation in [0.82, 1] — not every street jams alike. */
export function roadVariation(roadId: string): number {
  return 0.82 + 0.18 * ((fnv1a(roadId) % 1000) / 1000);
}

/**
 * Simulated congestion ratio for a road at a given local time.
 * `date` is read for local hour + weekend so tests can pin it.
 */
export function simulatedRatio(road: TrafficRoad, date: Date): number {
  const hour = date.getHours() + date.getMinutes() / 60;
  const weekend = date.getDay() === 0 || date.getDay() === 6;
  const ratio = timeOfDayFactor(road.roadClass, hour, weekend) * roadVariation(road.id);
  return Math.max(0.22, Math.min(1, ratio));
}

/**
 * The ratio actually used: TomTom's sampled relative speed when the
 * road has a fresh match, else the simulated model. `flow` maps road id
 * → relative speed (0..1) as sampled from TomTom vector tiles.
 */
export function effectiveRatio(
  road: TrafficRoad,
  date: Date,
  flow?: ReadonlyMap<string, number>,
): number {
  const sampled = flow?.get(road.id);
  if (typeof sampled === 'number' && Number.isFinite(sampled)) {
    return Math.max(0, Math.min(1, sampled));
  }
  return simulatedRatio(road, date);
}

/** Current speed (m/s) for a vehicle cruising this road at this ratio. */
export function speedMps(road: TrafficRoad, ratio: number): number {
  return (FREE_FLOW_KMH[road.roadClass] / 3.6) * Math.max(0.06, ratio);
}
