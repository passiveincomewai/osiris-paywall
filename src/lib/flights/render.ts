/**
 * OSIRIS — Flight rendering: GeoJSON conversion + snapshot blending.
 *
 * Two pieces the map layer needs between /api/flights snapshots and the
 * GeoJSON sources it draws:
 *
 * 1. Feature conversion (flightToFeature / flightsToFeatures). This is a
 *    straight 1:1 map — every record the route classified becomes one
 *    feature. The map used to decimate before converting (every 10th
 *    commercial flight, every 2nd private/jet), which silently dropped
 *    ~86% of a healthy snapshot; at ~6–7k aircraft the full set is well
 *    inside what the same map already draws for the 36k-camera layer, so
 *    there is deliberately NO sampling and NO cap here. Received count ==
 *    rendered count is a property the tests pin.
 *
 * 2. FlightBlend — the snapshot-pair bookkeeping for motion.ts. The client
 *    polls every 30s; drawing each snapshot raw teleports aircraft between
 *    polls. Following the GEV pattern (see motion.ts): keep the last two
 *    snapshots, render one poll interval behind wall-clock, and blend
 *    between the bracketing fixes so markers glide and never extrapolate
 *    past a known fix. Before the second snapshot exists there is nothing
 *    to bracket with, so the lone snapshot is dead-reckoned along each
 *    aircraft's own velocity/track instead (advanceFlights, clamped to
 *    300s by the module).
 */
import { advanceFlights, blendSnapshots, type FlightLike } from './motion';

export interface FlightBuckets {
  commercial_flights: any[];
  private_flights: any[];
  private_jets: any[];
  military_flights: any[];
}

export const EMPTY_FLIGHT_BUCKETS: FlightBuckets = {
  commercial_flights: [],
  private_flights: [],
  private_jets: [],
  military_flights: [],
};

const BUCKET_KEYS = [
  'commercial_flights',
  'private_flights',
  'private_jets',
  'military_flights',
] as const;

/**
 * One flight record → one GeoJSON Point feature. Property set is the one
 * the map's flight layers and popups have always consumed — do not rename.
 */
export function flightToFeature(f: any) {
  return {
    type: 'Feature' as const,
    geometry: { type: 'Point' as const, coordinates: [f.lng, f.lat] },
    properties: {
      callsign: f.callsign,
      heading: f.heading || 0,
      alt: f.alt,
      model: f.model,
      speed_knots: f.speed_knots,
      registration: f.registration,
      icao24: f.icao24,
    },
  };
}

/** Every record becomes a feature — no decimation, no cap. */
export function flightsToFeatures(arr: any[] | undefined): any[] {
  return (arr || []).map(flightToFeature);
}

const MIN_INTERVAL_MS = 4_000;
const MAX_INTERVAL_MS = 180_000;
const DEFAULT_INTERVAL_MS = 30_000; // matches the client poll cadence

/**
 * Holds the last two snapshots per bucket and produces the set to draw
 * for a given wall-clock instant. Pure bookkeeping + motion.ts maths;
 * the map layer owns the clock and calls current() on its render tick.
 */
export class FlightBlend {
  private prev: FlightBuckets | null = null;
  private next: FlightBuckets | null = null;
  private nextAt = 0;
  private intervalMs = DEFAULT_INTERVAL_MS;

  /**
   * Offer a freshly polled payload. Re-offering the identical object
   * (same array references) is a no-op, as is an all-empty payload once
   * a real snapshot is held — a transient blank response must not empty
   * the sky between polls.
   */
  push(buckets: FlightBuckets, now: number): void {
    if (!buckets) return;
    const incoming: FlightBuckets = {
      commercial_flights: buckets.commercial_flights || [],
      private_flights: buckets.private_flights || [],
      private_jets: buckets.private_jets || [],
      military_flights: buckets.military_flights || [],
    };
    if (
      this.next &&
      BUCKET_KEYS.every((k) => incoming[k] === this.next![k])
    ) {
      return;
    }
    const incomingTotal = BUCKET_KEYS.reduce((n, k) => n + incoming[k].length, 0);
    if (incomingTotal === 0 && this.next) return;
    if (this.next && now > this.nextAt) {
      this.intervalMs = Math.max(
        MIN_INTERVAL_MS,
        Math.min(MAX_INTERVAL_MS, now - this.nextAt),
      );
      this.prev = this.next;
    }
    this.next = incoming;
    this.nextAt = now;
  }

  /** The buckets to draw at wall-clock `now`. */
  current(now: number): FlightBuckets {
    if (!this.next) return EMPTY_FLIGHT_BUCKETS;
    const out = {} as FlightBuckets;
    if (!this.prev) {
      // Nothing to bracket with yet: dead-reckon the lone snapshot from
      // its arrival time (advanceFlights clamps extrapolation to 300s).
      const dtS = Math.max(0, (now - this.nextAt) / 1000);
      for (const k of BUCKET_KEYS) {
        out[k] = advanceFlights(this.next[k] as FlightLike[], dtS);
      }
      return out;
    }
    // Render one interval behind: alpha goes 0→1 across the interval
    // FOLLOWING the newest snapshot's arrival, interpolating prev→next.
    // blendSnapshots treats alpha 0 as "return next verbatim", which at
    // the arrival instant would flash the newest fixes for one tick
    // before settling back to ≈prev — so with a prev held, alpha is
    // floored a hair above zero and the glide stays continuous.
    const alpha = Math.max(
      0.001,
      Math.min(1, (now - this.nextAt) / this.intervalMs),
    );
    for (const k of BUCKET_KEYS) {
      out[k] = blendSnapshots(
        this.prev[k] as FlightLike[],
        this.next[k] as FlightLike[],
        alpha,
      );
    }
    return out;
  }

  /** True once at least one real snapshot has been accepted. */
  get hasSnapshot(): boolean {
    return this.next !== null;
  }
}
