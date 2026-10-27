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
      model_name: f.model_name || '',
      speed_knots: f.speed_knots,
      registration: f.registration,
      icao24: f.icao24,
      // Drives the map's per-feature icon choice (plane vs helicopter
      // glyph). The route tags every record; anything unrecognised
      // renders as a plane — never guess a helicopter.
      aircraft_category: f.aircraft_category === 'heli' ? 'heli' : 'plane',
    },
  };
}

/** Every record becomes a feature — no decimation, no cap. */
export function flightsToFeatures(arr: any[] | undefined): any[] {
  return (arr || []).map(flightToFeature);
}

/**
 * The `icon-image` layout value for a flight class layer: a data
 * expression that resolves per feature — the helicopter glyph for
 * records the route tagged aircraft_category 'heli', the plane glyph
 * for everything else (an unrecognised tag never becomes a helicopter).
 * Both images must be registered on the map under the given names.
 * Pure and unit-tested so the layer wiring can't drift from the
 * feature contract above.
 */
export function flightIconImage(planeIcon: string, heliIcon: string): any {
  return ['case', ['==', ['get', 'aircraft_category'], 'heli'], heliIcon, planeIcon];
}

/** How much larger a helicopter marker renders than a plane at the
 *  same zoom. The heli photo's bright core — the part that reads
 *  against the dark basemap — is ~9% of its frame, against ~19% for
 *  the plane photos (measured on public/icons/*.png: opaque+bright
 *  pixel fraction), and its dark rotor blades go sub-pixel at the
 *  layers' size cap. Scaled by this factor the heli's readable mass
 *  lands at plane size; rotation and artwork are untouched. */
export const HELI_ICON_SCALE = 1.6;

/**
 * The `icon-size` layout value for a flight class layer: the layers'
 * long-standing zoom ramp for planes (0.4 → 0.7 → 1.0, capped from
 * zoom 10), and the same ramp × HELI_ICON_SCALE for helicopters.
 * Pure and unit-tested with MapLibre's own expression evaluator, so
 * the layer wiring can't drift from the feature contract above.
 */
export function flightIconSize(): any {
  return [
    'case', ['==', ['get', 'aircraft_category'], 'heli'],
    ['interpolate', ['linear'], ['zoom'], 1, 0.64, 5, 1.12, 10, HELI_ICON_SCALE],
    ['interpolate', ['linear'], ['zoom'], 1, 0.4, 5, 0.7, 10, 1],
  ];
}

const MIN_INTERVAL_MS = 4_000;
const MAX_INTERVAL_MS = 180_000;
const DEFAULT_INTERVAL_MS = 30_000; // matches the client poll cadence

/**
 * Holds the last two snapshots per bucket and produces the set to draw
 * for a given wall-clock instant. Pure bookkeeping + motion.ts maths;
 * the map layer owns the clock and calls current() on its render tick.
 */
/** Snapshot timing, exposed so consumers (the follow camera's HUD) can
 *  state honestly how old the telemetry under the rendered position is. */
export interface FlightBlendTiming {
  hasPrev: boolean;
  /** Blend position between the bracketing snapshots, 0.001–1. */
  alpha: number;
  /** Generation time of the older bracketing snapshot (feed timestamp). */
  prevFixAt: number;
  /** Generation time of the newest snapshot (feed timestamp). */
  nextFixAt: number;
}

export class FlightBlend {
  private prev: FlightBuckets | null = null;
  private next: FlightBuckets | null = null;
  private nextAt = 0;
  private prevFixAt = 0;
  private nextFixAt = 0;
  private intervalMs = DEFAULT_INTERVAL_MS;

  /**
   * Offer a freshly polled payload. Re-offering the identical object
   * (same array references) is a no-op, as is an all-empty payload once
   * a real snapshot is held — a transient blank response must not empty
   * the sky between polls. `fixAtMs` is when the feed generated the
   * snapshot (the /api/flights payload timestamp); it defaults to the
   * arrival time and is only used for fix-age reporting, never motion.
   */
  push(buckets: FlightBuckets, now: number, fixAtMs?: number): void {
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
    const fixAt = typeof fixAtMs === 'number' && Number.isFinite(fixAtMs) ? fixAtMs : now;
    // The same feed snapshot re-delivered is NOT a new bracket. The
    // server cache (90 s TTL) outlives the client poll (30 s), so most
    // polls re-deliver the identical payload — as freshly parsed JSON,
    // so the reference check above cannot see it. Taking each delivery
    // as a new snapshot made prev == next (motion froze), and when a
    // genuinely new snapshot landed, ~90 s of travel had to blend
    // inside one 30 s interval (aircraft sprinted). The result read as
    // glitchy stutter-step motion. Deduping on the feed timestamp keeps
    // the bracket spanning the true interval between distinct snapshots,
    // so alpha sweeps it at real speed and the glide is continuous.
    if (
      this.next &&
      typeof fixAtMs === 'number' &&
      Number.isFinite(fixAtMs) &&
      fixAt === this.nextFixAt
    ) {
      return;
    }
    if (this.next && now > this.nextAt) {
      this.intervalMs = Math.max(
        MIN_INTERVAL_MS,
        Math.min(MAX_INTERVAL_MS, now - this.nextAt),
      );
      this.prev = this.next;
      this.prevFixAt = this.nextFixAt;
    }
    this.next = incoming;
    this.nextAt = now;
    this.nextFixAt = fixAt;
  }

  /** Blend position between the bracketing snapshots at `now`. With no
   *  previous snapshot there is nothing to bracket — the lone snapshot
   *  is being dead-reckoned, which timing() reports as alpha 1. */
  private alphaAt(now: number): number {
    if (!this.prev) return 1;
    return Math.max(0.001, Math.min(1, (now - this.nextAt) / this.intervalMs));
  }

  /** Timing of the snapshot pair current() draws from, or null before
   *  the first snapshot. Lets the follow HUD derive fix age from the
   *  same numbers the renderer uses instead of a second clock. */
  timing(now: number): FlightBlendTiming | null {
    if (!this.next) return null;
    return {
      hasPrev: !!this.prev,
      alpha: this.alphaAt(now),
      prevFixAt: this.prevFixAt,
      nextFixAt: this.nextFixAt,
    };
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
    const alpha = this.alphaAt(now);
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
