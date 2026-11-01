/**
 * OSIRIS — Aircraft follow camera: state machine + camera maths.
 *
 * Phase 3.1. When a user follows an aircraft, the globe camera rides with
 * it — chase (behind/above, aligned to heading), forward (at the aircraft,
 * looking along its heading) or orbit (slow external circuit). Every
 * position the camera consumes comes from FlightBlend's blended output —
 * the exact fixes the markers draw — so the camera can never show a
 * position the map itself doesn't. This module is the pure core: the map
 * component owns the MapLibre calls, this module owns the decisions, so
 * the state machine, the camera targets and the fix-age derivation are
 * unit-testable without a map.
 *
 * Honesty contract (brief 3.1): this is a TELEMETRY view. There is no
 * camera on the aircraft, and the copy must never imply one. Between the
 * 30 s polls the blend interpolates between two real fixes, dead-reckons
 * from a lone fix, or holds at the last fix — describeFix() names which,
 * and the HUD shows the age of the newest underlying fix alongside it.
 */
import { destinationPoint } from './motion';
import type { FlightBlendTiming } from './render';
import type { CinematicPreset } from '@/lib/cinematic/presets';

export type FollowMode = 'chase' | 'forward' | 'orbit';
export const FOLLOW_MODES: FollowMode[] = ['chase', 'forward', 'orbit'];
export const FOLLOW_MODE_LABELS: Record<FollowMode, string> = {
  chase: 'CHASE',
  forward: 'FORWARD',
  orbit: 'ORBIT',
};

/** The follow camera pitches past the terrain manager's 60° cap (forward
 *  view looks along the heading), so follow raises maxPitch to this while
 *  active and restores the previous limit on exit. */
export const FOLLOW_MAX_PITCH = 85;

/** How long the target may be absent from the blended output before the
 *  follow ends itself. One poll is 30 s; a single missed snapshot is a
 *  data hiccup, not a departure, so the grace spans a full poll cycle's
 *  worth of render ticks plus slack — the HUD shows SIGNAL LOST meanwhile. */
export const FOLLOW_LOST_GRACE_MS = 12_000;

/** The permanent honesty tag shown for the whole follow. */
export const FOLLOW_HONESTY_TAG = 'TELEMETRY VIEW — NOT AN ONBOARD CAMERA';

/** Cockpit View's imagery note, shown in the HUD while the cockpit
 *  camera is active: the ground under the aircraft is Esri's dated
 *  reference mosaic (the satellite view the cockpit entry turns on),
 *  never a live feed. */
export const COCKPIT_IMAGERY_TAG = 'GROUND: REFERENCE SATELLITE IMAGERY (DATED) — NOT A LIVE FEED';

export interface FollowTargetRef {
  icao24: string;
  callsign: string;
}

/** The camera state captured at engage time so Exit can restore it. */
export interface SavedCameraState {
  center: [number, number];
  zoom: number;
  pitch: number;
  bearing: number;
}

/** The blended fix shape the follow driver reads (a raw flight record). */
export interface FollowFix {
  lat: number;
  lng: number;
  heading?: number | null;
  alt?: number | null;
  speed_knots?: number | null;
  callsign?: string;
  grounded?: boolean;
  [key: string]: unknown;
}

export type FollowPhase = 'idle' | 'engaging' | 'following';

export interface FlightFollowState {
  phase: FollowPhase;
  target: FollowTargetRef | null;
  mode: FollowMode;
  /** Pre-follow camera, restored by an explicit Exit. */
  savedCamera: SavedCameraState | null;
  engagedAt: number;
  /** When the current mode began (orbit phase + transition timing). */
  modeSince: number;
  /** Last tick the target was present in the blended output. Starts at
   *  engagedAt so a never-seen target still gets the full grace window. */
  lastSeenAt: number;
  lastFix: FollowFix | null;
}

export const IDLE_FLIGHT_FOLLOW: FlightFollowState = {
  phase: 'idle',
  target: null,
  mode: 'chase',
  savedCamera: null,
  engagedAt: 0,
  modeSince: 0,
  lastSeenAt: 0,
  lastFix: null,
};

export function startFollow(
  target: FollowTargetRef,
  savedCamera: SavedCameraState,
  now: number,
  mode: FollowMode = 'chase',
): FlightFollowState {
  return {
    phase: 'engaging',
    target,
    mode,
    savedCamera,
    engagedAt: now,
    modeSince: now,
    lastSeenAt: now,
    lastFix: null,
  };
}

export function setFollowMode(
  state: FlightFollowState,
  mode: FollowMode,
  now: number,
): FlightFollowState {
  if (state.phase === 'idle' || state.mode === mode) return state;
  return { ...state, mode, modeSince: now };
}

export function noteFollowSeen(
  state: FlightFollowState,
  fix: FollowFix,
  now: number,
): FlightFollowState {
  return { ...state, lastSeenAt: now, lastFix: fix };
}

/** True when the target has been missing longer than the grace window. */
export function followLostExpired(state: FlightFollowState, now: number): boolean {
  return state.phase !== 'idle' && now - state.lastSeenAt > FOLLOW_LOST_GRACE_MS;
}

export function stopFollow(): FlightFollowState {
  return IDLE_FLIGHT_FOLLOW;
}

// ── Camera maths ──────────────────────────────────────────────────────

export interface FollowCameraTarget {
  center: [number, number];
  zoom: number;
  pitch: number;
  bearing: number;
}

/** Chase: centre sits behind the aircraft so it rides ahead in frame. */
export const CHASE_CAM = { backM: 1150, zoom: 15.4, pitch: 68 };
/** Forward: centre sits ahead of the aircraft, camera looking along the
 *  heading at near-horizon pitch — a forward view approximation from
 *  telemetry, not a cockpit (there is no cockpit). */
export const FORWARD_CAM = { aheadM: 480, zoom: 16.6, pitch: 85 };
/** Orbit: centre on the aircraft, bearing advancing slowly around it. */
export const ORBIT_CAM = { zoom: 15.9, pitch: 55, degPerSec: 5 };

/** A fix's heading, normalised; falls back when the fix carries none. */
export function headingOf(fix: FollowFix, fallback = 0): number {
  const h = typeof fix?.heading === 'number' && Number.isFinite(fix.heading)
    ? fix.heading
    : fallback;
  return ((h % 360) + 360) % 360;
}

export function chaseCameraTarget(fix: FollowFix, fallbackBearing = 0): FollowCameraTarget {
  const heading = headingOf(fix, fallbackBearing);
  const behind = destinationPoint(fix.lat, fix.lng, heading + 180, CHASE_CAM.backM);
  return {
    center: [behind.lng, behind.lat],
    zoom: CHASE_CAM.zoom,
    pitch: CHASE_CAM.pitch,
    bearing: heading,
  };
}

export function forwardCameraTarget(fix: FollowFix, fallbackBearing = 0): FollowCameraTarget {
  const heading = headingOf(fix, fallbackBearing);
  const ahead = destinationPoint(fix.lat, fix.lng, heading, FORWARD_CAM.aheadM);
  return {
    center: [ahead.lng, ahead.lat],
    zoom: FORWARD_CAM.zoom,
    pitch: FORWARD_CAM.pitch,
    bearing: heading,
  };
}

export function orbitCameraTarget(
  fix: FollowFix,
  elapsedMs: number,
  fallbackBearing = 0,
): FollowCameraTarget {
  const heading = headingOf(fix, fallbackBearing);
  const bearing = (heading + (Math.max(0, elapsedMs) / 1000) * ORBIT_CAM.degPerSec) % 360;
  return {
    center: [fix.lng, fix.lat],
    zoom: ORBIT_CAM.zoom,
    pitch: ORBIT_CAM.pitch,
    bearing,
  };
}

export function followCameraTarget(
  mode: FollowMode,
  fix: FollowFix,
  elapsedMs: number,
  fallbackBearing = 0,
): FollowCameraTarget {
  switch (mode) {
    case 'forward':
      return forwardCameraTarget(fix, fallbackBearing);
    case 'orbit':
      return orbitCameraTarget(fix, elapsedMs, fallbackBearing);
    case 'chase':
    default:
      return chaseCameraTarget(fix, fallbackBearing);
  }
}

// ── Fix age / interpolation honesty ───────────────────────────────────

export interface FixDescription {
  /** interpolated = gliding between two real fixes; extrapolated = the
   *  position is derived from the last fix alone (dead reckoning, or held
   *  at it while the next poll is outstanding). */
  kind: 'interpolated' | 'extrapolated';
  /** Age of the newest underlying telemetry fix, in seconds. */
  newestFixAgeS: number;
  label: string;
}

/**
 * Describe the telemetry underneath the rendered position, from the
 * blend's own timing. The age is measured from the feed snapshot's
 * generation time (the /api/flights payload timestamp the blend was fed),
 * not from client receipt, so a server-cached snapshot reads honestly old.
 */
export function describeFix(
  timing: FlightBlendTiming | null,
  now: number,
): FixDescription | null {
  if (!timing) return null;
  const ageS = Math.max(0, (now - timing.nextFixAt) / 1000);
  if (timing.hasPrev && timing.alpha < 1) {
    return {
      kind: 'interpolated',
      newestFixAgeS: ageS,
      label: 'POSITION INTERPOLATED BETWEEN FIXES',
    };
  }
  return {
    kind: 'extrapolated',
    newestFixAgeS: ageS,
    label: 'POSITION EXTRAPOLATED FROM THE LAST FIX',
  };
}

// ── HUD data (written by the map's render loop, read by the HUD) ──────

export interface FollowHudData {
  callsign: string;
  icao24: string;
  lat: number;
  lng: number;
  alt: number | null;
  speedKnots: number | null;
  headingDeg: number;
  fix: FixDescription | null;
  /** Target absent from the current blended output — camera is holding. */
  missing: boolean;
}

// ── Cinematic Director preset ─────────────────────────────────────────

/**
 * The Aircraft Follow preset for the Cinematic Director's extraPresets
 * slot. It is an ACTION preset: it engages the follow camera on the
 * selected aircraft rather than playing a keyframe scene, and it is only
 * available while an aircraft is selected — otherwise the Director shows
 * the unavailable note instead of a dead button.
 */
export function aircraftFollowPreset(): CinematicPreset {
  return {
    id: 'aircraft-follow',
    label: 'Aircraft Follow',
    description:
      'Ride with the selected aircraft — a chase camera driven by its live telemetry (not an onboard camera).',
    build: () => null,
    available: (ctx) => !!ctx.followTarget?.icao24,
    action: (ctx) => {
      const t = ctx.followTarget;
      if (!t?.icao24 || typeof window === 'undefined') return;
      (window as unknown as {
        __weFlightFollowToggle?: (icao24: string, callsign?: string) => void;
      }).__weFlightFollowToggle?.(t.icao24, t.callsign);
    },
    unavailableNote: 'Select an aircraft on the globe first — this preset rides along with it.',
  };
}
