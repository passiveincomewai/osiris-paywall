/**
 * OSIRIS — built-in cinematic presets.
 *
 * Each preset is a scene FACTORY over a small context (current view centre,
 * the loaded camera catalogue) so a preset always reflects the real globe
 * state when pressed — a Camera Tour flies between cameras that are
 * actually loaded, and returns null (→ disabled control, honest note) when
 * none are.
 *
 * Dynamic presets that need another system — Aircraft Follow (Wave 2's
 * follow camera) and Space Mission (Phase 7's launch data) — register
 * through the same CinematicPreset shape via the Director's extraPresets
 * prop when those systems exist. They are deliberately ABSENT here: a
 * preset that cannot run is not listed, never faked.
 */
import { makeScene, type CameraKeyframe, type CinematicScene } from './scenes';

export interface CinematicPresetContext {
  /** [lng, lat] at the centre of the current view. */
  currentCenter: [number, number];
  /** The loaded camera catalogue (may be empty until the CCTV data lands). */
  cameras: Array<{ lat?: unknown; lng?: unknown; name?: unknown }>;
  /** The aircraft the user last selected on the globe, when one is
   *  followable (drives the Aircraft Follow action preset). */
  followTarget?: { icao24: string; callsign?: string } | null;
}

export interface CinematicPreset {
  id: string;
  label: string;
  description: string;
  /** Build the scene, or null when this preset cannot run right now. */
  build: (ctx: CinematicPresetContext) => CinematicScene | null;
  /** Shown when the preset cannot run, so the disabled control explains itself. */
  unavailableNote?: string;
  /**
   * Action presets drive another live system (aircraft follow) instead
   * of playing a keyframe scene. When `action` is set the Director runs
   * it on press and never feeds a scene to the player; `build` is then
   * unused and `available` decides whether the control is enabled.
   */
  action?: (ctx: CinematicPresetContext) => void;
  /** For action presets: whether the action can run right now. */
  available?: (ctx: CinematicPresetContext) => boolean;
}

/** Slow orbit: six long legs around the equator, bearing advancing with longitude. */
export function globalOverviewScene(): CinematicScene {
  const keyframes: CameraKeyframe[] = [-120, -60, 0, 60, 120, 180].map((lng, i) => ({
    center: [lng, 18] as [number, number],
    zoom: 2.3,
    pitch: 0,
    bearing: i * 12,
    durationMs: 9000,
    holdMs: 400,
    label: `Orbit ${i + 1}/6`,
  }));
  return makeScene('Global Overview', keyframes);
}

/** Descend from a regional view into the city at the current view centre. */
export function cityFlyoverScene(center: [number, number]): CinematicScene {
  return makeScene('City Flyover', [
    { center, zoom: 4.5, pitch: 0, bearing: 0, durationMs: 3500, holdMs: 400, label: 'Approach' },
    { center, zoom: 11, pitch: 42, bearing: 24, durationMs: 8000, holdMs: 600, label: 'Descent' },
    { center, zoom: 14.2, pitch: 58, bearing: 68, durationMs: 6500, holdMs: 2200, label: 'City pass' },
  ]);
}

const TOUR_STOPS = 6;

/**
 * Fly between real loaded cameras. Stops are sampled evenly across the
 * catalogue so the tour reads as a journey, not six pins in one city.
 * The tour does NOT open the camera viewer at stops: viewing a camera is
 * a user click (the free-camera gate counts opens), so the tour flies the
 * globe between camera locations and leaves opening to the viewer.
 */
export function cameraTourScene(cameras: CinematicPresetContext['cameras']): CinematicScene | null {
  const valid = (cameras ?? []).filter(
    (c) => typeof c?.lat === 'number' && typeof c?.lng === 'number' && Number.isFinite(c.lat) && Number.isFinite(c.lng),
  ) as Array<{ lat: number; lng: number; name?: unknown }>;
  if (!valid.length) return null;
  const stops: typeof valid = [];
  if (valid.length <= TOUR_STOPS) {
    stops.push(...valid);
  } else {
    for (let i = 0; i < TOUR_STOPS; i++) {
      stops.push(valid[Math.floor((i / TOUR_STOPS) * valid.length)]);
    }
  }
  const keyframes: CameraKeyframe[] = stops.map((c, i) => ({
    center: [c.lng, c.lat],
    zoom: 13.5,
    pitch: 45,
    bearing: (i * 35) % 360,
    durationMs: i === 0 ? 8000 : 6500,
    holdMs: 2400,
    label: typeof c.name === 'string' && c.name ? c.name.slice(0, 40) : `Camera ${i + 1}`,
  }));
  return makeScene('Camera Tour', keyframes);
}

export const BUILT_IN_PRESETS: CinematicPreset[] = [
  {
    id: 'global-overview',
    label: 'Global Overview',
    description: 'Slow orbit around the Earth at globe zoom.',
    build: () => globalOverviewScene(),
  },
  {
    id: 'city-flyover',
    label: 'City Flyover',
    description: 'Descend from a regional view into the city at the centre of your current view.',
    build: (ctx) => cityFlyoverScene(ctx.currentCenter),
  },
  {
    id: 'camera-tour',
    label: 'Camera Tour',
    description: 'Fly between live camera locations from the loaded index (the viewer stays yours to open).',
    build: (ctx) => cameraTourScene(ctx.cameras),
    unavailableNote: 'Needs the camera catalogue — it loads with the CCTV layer.',
  },
];
