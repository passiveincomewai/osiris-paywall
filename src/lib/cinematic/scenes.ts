/**
 * OSIRIS — cinematic scene model.
 *
 * A scene is a list of camera keyframes executed with the plain MapLibre
 * camera API (flyTo/easeTo chained on moveend) — no renderer work, no new
 * engine. Scenes persist to localStorage (the app's established
 * client-persistence pattern), so everything here is serialisable plain
 * data plus validation for data coming back out of storage.
 */

export interface CameraKeyframe {
  /** [lng, lat] */
  center: [number, number];
  zoom: number;
  pitch: number;
  /** Degrees clockwise from north. */
  bearing: number;
  /** Fly time INTO this keyframe. */
  durationMs: number;
  /** Pause at this keyframe before flying to the next. */
  holdMs: number;
  label?: string;
}

export interface CinematicScene {
  id: string;
  name: string;
  keyframes: CameraKeyframe[];
  createdAt: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function finite(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

/** Validate one untrusted keyframe (storage / imports); null if unusable. */
export function normalizeKeyframe(v: unknown): CameraKeyframe | null {
  if (!v || typeof v !== 'object') return null;
  const k = v as Partial<CameraKeyframe>;
  if (!Array.isArray(k.center) || k.center.length !== 2) return null;
  const [lng, lat] = k.center;
  if (typeof lng !== 'number' || typeof lat !== 'number' || !Number.isFinite(lng) || !Number.isFinite(lat)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return {
    center: [lng, lat],
    zoom: clamp(finite(k.zoom, 2.5), 0, 22),
    pitch: clamp(finite(k.pitch, 0), 0, 85),
    bearing: finite(k.bearing, 0),
    durationMs: clamp(finite(k.durationMs, 5000), 0, 120_000),
    holdMs: clamp(finite(k.holdMs, 0), 0, 60_000),
    ...(typeof k.label === 'string' && k.label ? { label: k.label.slice(0, 60) } : {}),
  };
}

/** Validate one untrusted scene; null if it has no usable keyframes. */
export function normalizeScene(v: unknown): CinematicScene | null {
  if (!v || typeof v !== 'object') return null;
  const s = v as Partial<CinematicScene>;
  if (!Array.isArray(s.keyframes)) return null;
  const keyframes = s.keyframes.map(normalizeKeyframe).filter((k): k is CameraKeyframe => k !== null);
  if (!keyframes.length) return null;
  return {
    id: typeof s.id === 'string' && s.id ? s.id : `scn_${Date.now().toString(36)}`,
    name: typeof s.name === 'string' && s.name.trim() ? s.name.trim().slice(0, 80) : 'Untitled scene',
    keyframes,
    createdAt: typeof s.createdAt === 'number' && Number.isFinite(s.createdAt) ? s.createdAt : Date.now(),
  };
}

/** Total wall-clock duration of a scene at a playback speed (for UI labels). */
export function totalSceneDurationMs(scene: CinematicScene, speed = 1): number {
  const s = speed > 0 ? speed : 1;
  return scene.keyframes.reduce((sum, k) => sum + (k.durationMs + k.holdMs) / s, 0);
}

export function makeScene(name: string, keyframes: CameraKeyframe[]): CinematicScene {
  return {
    id: `scn_${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`,
    name: name.trim() || 'Untitled scene',
    keyframes,
    createdAt: Date.now(),
  };
}
