/**
 * OSIRIS — Transit vehicle motion: snapshot blending + dead reckoning.
 *
 * The transit client polls every 15 s (the fastest feeds republish on
 * that cadence; the server cache is 12 s). Drawing each poll raw made
 * buses teleport ~170 m at a time at city speeds. This module applies
 * the same pattern the flights layer uses (lib/flights/motion +
 * FlightBlend): keep the last two snapshots, render one interval
 * behind wall-clock, and interpolate between the bracketing fixes —
 * positions are always BETWEEN two real reported fixes, never
 * extrapolated past the newest one. The single exception mirrors
 * flights too: before a second snapshot exists, the lone snapshot is
 * dead-reckoned along the vehicle's own reported bearing/speed,
 * clamped hard (ground vehicles turn; 45 s is the honest limit).
 *
 * Two ground-vehicle differences from the flight blender:
 *  - a fix pair more than 1.5 km apart is a feed correction or a
 *    vehicle reassignment, not motion (a real bus covers ≤ ~550 m in
 *    15 s) — the dot snaps instead of gliding across town;
 *  - interpolation is keyed on the vehicle id within one agency.
 */

import { wrapLng, lerpAngleDeg, destinationPoint } from '@/lib/flights/motion';

export interface TransitVehicleLike {
  id: string;
  lat: number;
  lng: number;
  bearing?: number;
  speedKmh?: number;
  /** Epoch seconds of the vehicle's own GPS fix. */
  ts?: number;
  [key: string]: unknown;
}

const DEFAULT_INTERVAL_MS = 10_000;
const MIN_INTERVAL_MS = 5_000;
const MAX_INTERVAL_MS = 60_000;
/** Above this prev→next distance, snap — do not glide. */
const TELEPORT_M = 1_500;
/** Dead reckoning (lone snapshot only) never projects beyond this. */
const MAX_DR_S = 45;

function distanceM(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const dy = (bLat - aLat) * 111_320;
  const dx = ((bLng - aLng + 540) % 360 - 180) * 111_320 * Math.cos((aLat * Math.PI) / 180);
  return Math.hypot(dx, dy);
}

/**
 * Blend two snapshots of one agency's fleet: vehicles in both are
 * interpolated (position on the shortest lng arc, bearing on the
 * shortest angular arc); vehicles only in `next` pass through at
 * their reported fix; vehicles only in `prev` are dropped — the
 * newest snapshot defines the rendered set. alpha 0 returns `next`
 * verbatim (flights convention; the blend class floors alpha above
 * zero when a pair is held).
 */
export function blendTransitSnapshots<T extends TransitVehicleLike>(prev: T[], next: T[], alpha: number): T[] {
  const t = Math.max(0, Math.min(1, alpha));
  if (t === 0) return [...next];
  const prevById = new Map<string, T>();
  for (const v of prev || []) if (v.id) prevById.set(v.id, v);
  return (next || []).map(v => {
    const p = v.id ? prevById.get(v.id) : undefined;
    if (!p) return v;
    if (distanceM(p.lat, p.lng, v.lat, v.lng) > TELEPORT_M) return v;
    const lngDelta = ((v.lng - p.lng + 540) % 360) - 180;
    return {
      ...v,
      lat: Math.round((p.lat + (v.lat - p.lat) * t) * 1e6) / 1e6,
      lng: Math.round(wrapLng(p.lng + lngDelta * t) * 1e6) / 1e6,
      bearing:
        typeof p.bearing === 'number' && typeof v.bearing === 'number'
          ? Math.round(lerpAngleDeg(p.bearing, v.bearing, t))
          : v.bearing,
    };
  });
}

/**
 * Advance one vehicle along its own reported bearing at its own
 * reported speed — dead reckoning for the lone-snapshot window only.
 * Vehicles with no usable speed/bearing hold their reported position.
 */
export function advanceVehicle<T extends TransitVehicleLike>(v: T, dtSeconds: number): T {
  const dt = Math.max(0, Math.min(MAX_DR_S, dtSeconds));
  if (
    dt === 0 ||
    typeof v.speedKmh !== 'number' || !(v.speedKmh > 0) ||
    typeof v.bearing !== 'number' ||
    !Number.isFinite(v.lat) || !Number.isFinite(v.lng)
  ) {
    return v;
  }
  const next = destinationPoint(v.lat, v.lng, v.bearing, (v.speedKmh / 3.6) * dt);
  return { ...v, lat: Math.round(next.lat * 1e6) / 1e6, lng: Math.round(next.lng * 1e6) / 1e6 };
}

interface AgencyTrack {
  prev: TransitVehicleLike[] | null;
  next: TransitVehicleLike[] | null;
  nextAt: number;
  intervalMs: number;
}

/**
 * Per-agency snapshot-pair bookkeeping, mirroring FlightBlend: a poll
 * lands in push(); the render loop samples current(now). An empty
 * payload never clears a held snapshot (a transient blank response
 * must not empty the map between polls).
 */
export class TransitBlend {
  private tracks = new Map<string, AgencyTrack>();

  push(agencyId: string, vehicles: TransitVehicleLike[], now: number): void {
    if (!Array.isArray(vehicles)) return;
    let track = this.tracks.get(agencyId);
    if (!track) {
      track = { prev: null, next: null, nextAt: 0, intervalMs: DEFAULT_INTERVAL_MS };
      this.tracks.set(agencyId, track);
    }
    if (vehicles.length === 0 && track.next) return;
    if (track.next && vehicles === track.next) return;
    // Same fixes re-served (the server cache regenerates its payload
    // on its own TTL even when the feed has not moved — RTD's fixes
    // only advance every 30 s): not a new snapshot. Rotating the pair
    // here would measure a fake interval and burst-glide later.
    if (track.next && vehicles.length === track.next.length) {
      const heldTs = new Map(track.next.map(v => [v.id, v.ts]));
      // Only a real timestamp comparison counts — a feed that omits
      // timestamps must keep rotating, never freeze on its first fix.
      if (vehicles.every(v => typeof v.ts === 'number' && heldTs.get(v.id) === v.ts)) return;
    }
    if (track.next && now > track.nextAt) {
      track.intervalMs = Math.max(MIN_INTERVAL_MS, Math.min(MAX_INTERVAL_MS, now - track.nextAt));
      track.prev = track.next;
    }
    track.next = vehicles;
    track.nextAt = now;
  }

  /** The vehicles to draw for an agency at wall-clock `now`. */
  current(agencyId: string, now: number): TransitVehicleLike[] {
    const track = this.tracks.get(agencyId);
    if (!track || !track.next) return [];
    if (!track.prev) {
      const dtS = Math.max(0, (now - track.nextAt) / 1000);
      return track.next.map(v => advanceVehicle(v, dtS));
    }
    // One interval behind: alpha runs 0→1 across the interval AFTER
    // the newest snapshot arrived, gliding prev→next. Floored a hair
    // above zero so the arrival instant doesn't flash the new fixes
    // (blendTransitSnapshots treats 0 as "next verbatim").
    const alpha = Math.max(0.001, Math.min(1, (now - track.nextAt) / track.intervalMs));
    return blendTransitSnapshots(track.prev, track.next, alpha);
  }

  forget(agencyId: string): void {
    this.tracks.delete(agencyId);
  }

  agencies(): string[] {
    return [...this.tracks.keys()];
  }
}
