/**
 * OSIRIS — sensor viewing effects (SIMULATED visual effects).
 *
 * These are CSS/SVG-filter looks applied to the MAP CANVAS ONLY — MapLibre
 * keeps popups, controls and attribution as siblings of the canvas, so the
 * interface stays unfiltered and readable, and the camera viewer (a
 * separate component entirely) can never be touched. Nothing here is real
 * sensor data: night vision is a green-tinted filter, "thermal" is an
 * SVG feComponentTransfer false-colour lookup over luminance, and the UI
 * labels every mode as simulated for as long as it is active.
 *
 * WebGL shader post-processing was evaluated and rejected (see the Wave 1
 * feasibility audit): MapLibre exposes no supported post-processing
 * pipeline, and forking its render loop would risk the production globe.
 * CSS filters are GPU-composited and structurally incapable of reaching
 * live camera footage — which is precisely why this route is the safe one.
 */

export type SensorEffectMode =
  | 'off'
  | 'night-vision'
  | 'thermal'
  | 'monochrome'
  | 'high-contrast'
  | 'crt'
  | 'cinematic-dark';

export interface SensorEffectState {
  mode: SensorEffectMode;
  /** 0..1 — how far between "no effect" and the mode's full look. */
  intensity: number;
}

export const DEFAULT_SENSOR_EFFECT: SensorEffectState = { mode: 'off', intensity: 1 };

export const THERMAL_FILTER_ID = 'we-thermal-lut';

export interface SensorEffectOption {
  mode: SensorEffectMode;
  label: string;
}

export const SENSOR_EFFECT_OPTIONS: SensorEffectOption[] = [
  { mode: 'off', label: 'Off' },
  { mode: 'night-vision', label: 'Night Vision' },
  { mode: 'thermal', label: 'Thermal (false colour)' },
  { mode: 'monochrome', label: 'Monochrome' },
  { mode: 'high-contrast', label: 'High Contrast' },
  { mode: 'crt', label: 'CRT Monitor' },
  { mode: 'cinematic-dark', label: 'Cinematic Dark' },
];

const MODES = new Set<SensorEffectMode>(SENSOR_EFFECT_OPTIONS.map((o) => o.mode));

export function sensorEffectLabel(mode: SensorEffectMode): string {
  return SENSOR_EFFECT_OPTIONS.find((o) => o.mode === mode)?.label ?? 'Off';
}

export function clampIntensity(v: unknown): number {
  const n = typeof v === 'number' && Number.isFinite(v) ? v : 1;
  return Math.min(1, Math.max(0, n));
}

/** Validate untrusted state (localStorage) back into a known-good shape. */
export function normalizeSensorEffect(v: unknown): SensorEffectState {
  if (!v || typeof v !== 'object') return { ...DEFAULT_SENSOR_EFFECT };
  const s = v as Partial<SensorEffectState>;
  return {
    mode: typeof s.mode === 'string' && MODES.has(s.mode as SensorEffectMode) ? (s.mode as SensorEffectMode) : 'off',
    intensity: clampIntensity(s.intensity),
  };
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const f2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Whether this browser engine actually APPLIES an SVG filter reference
 * (`filter: url(#…)`) to an HTML element. WebKit — Safari on macOS/iOS and
 * EVERY browser on iOS, since they are all WebKit under the hood — parses
 * the declaration but paints nothing for HTML elements (SVG filter
 * references only work on SVG elements there). Chromium and Firefox apply
 * them. Detection is by engine tokens in the UA: a WebKit UA without a
 * Chromium token is an engine that will silently ignore the reference.
 */
export function supportsSvgFilterReference(userAgent: string): boolean {
  const ua = userAgent || '';
  const webkit = /AppleWebKit/i.test(ua);
  const chromium = /Chrome\/|Chromium\/|Edg\/|OPR\//i.test(ua);
  return !(webkit && !chromium);
}

/**
 * The CSS `filter` value for a state ('' = no filter). Every numeric
 * parameter is lerped from its identity value by intensity, so intensity 0
 * is a true no-op look even with a mode selected. Thermal rides the SVG
 * lookup table where the engine applies SVG references; on engines that
 * don't (WebKit — see supportsSvgFilterReference) it falls back to a
 * heat-tint chain over luminance so the preset still visibly does
 * something instead of silently painting nothing.
 */
export function sensorFilterCss(state: SensorEffectState, opts?: { svgFilters?: boolean }): string {
  const t = clampIntensity(state.intensity);
  switch (state.mode) {
    case 'off':
      return '';
    case 'night-vision':
      // Sepia → hue-rotate into the greens → push saturation: phosphor NV.
      return `brightness(${f2(lerp(1, 1.15, t))}) contrast(${f2(lerp(1, 1.2, t))}) sepia(${f2(t)}) hue-rotate(${Math.round(lerp(0, 68, t))}deg) saturate(${f2(lerp(1, 2.6, t))})`;
    case 'thermal':
      if (opts && opts.svgFilters === false) {
        // WebKit fallback: luminance → hot orange/yellow tint (single-hue
        // approximation of the false-colour ramp — still brightness-driven,
        // still labelled false colour).
        return `grayscale(${f2(t)}) contrast(${f2(lerp(1, 1.15, t))}) brightness(${f2(lerp(1, 1.02, t))}) sepia(${f2(t)}) hue-rotate(${Math.round(lerp(0, -24, t))}deg) saturate(${f2(lerp(1, 3.2, t))})`;
      }
      return `url(#${THERMAL_FILTER_ID}) contrast(${f2(lerp(1, 1.08, t))})`;
    case 'monochrome':
      return `grayscale(${f2(t)}) contrast(${f2(lerp(1, 1.1, t))})`;
    case 'high-contrast':
      return `contrast(${f2(lerp(1, 1.9, t))}) brightness(${f2(lerp(1, 1.05, t))}) saturate(${f2(lerp(1, 0.7, t))})`;
    case 'crt':
      return `contrast(${f2(lerp(1, 1.15, t))}) brightness(${f2(lerp(1, 1.08, t))}) saturate(${f2(lerp(1, 1.25, t))})`;
    case 'cinematic-dark':
      return `brightness(${f2(lerp(1, 0.75, t))}) contrast(${f2(lerp(1, 1.15, t))}) saturate(${f2(lerp(1, 0.8, t))})`;
    default:
      return '';
  }
}

/**
 * Inferno-style false-colour ramp (6 stops over luminance), expressed as
 * feComponentTransfer `discrete` table values, lerped toward the identity
 * ramp by intensity. This APPROXIMATES a thermal palette for appearance
 * only — it is driven by pixel brightness, not temperature.
 */
const THERMAL_RAMP: Array<[number, number, number]> = [
  [0.0, 0.0, 0.016],
  [0.231, 0.059, 0.31],
  [0.541, 0.133, 0.416],
  [0.804, 0.251, 0.443],
  [0.976, 0.557, 0.035],
  [0.988, 0.992, 0.749],
];

export function thermalTableValues(intensity: number): { r: string; g: string; b: string } {
  const t = clampIntensity(intensity);
  const stops = THERMAL_RAMP.map((rgb, i) => {
    const identity = i / (THERMAL_RAMP.length - 1);
    return rgb.map((c) => Math.round(lerp(identity, c, t) * 1000) / 1000);
  });
  return {
    r: stops.map((s) => s[0]).join(' '),
    g: stops.map((s) => s[1]).join(' '),
    b: stops.map((s) => s[2]).join(' '),
  };
}

/**
 * The low-power guard's signal: the same small-viewport heuristic the
 * traffic layer uses for its mobile caps, combined with a very low core
 * count. Only the conjunction refuses an effect — either signal alone is
 * a device that can very likely still composite a CSS filter.
 */
export function isLowPowerDevice(signals: {
  innerWidth: number;
  innerHeight: number;
  hardwareConcurrency?: number;
}): boolean {
  const mobileLike = signals.innerWidth < 768 || (signals.innerHeight < 500 && signals.innerWidth < 1024);
  const cores = typeof signals.hardwareConcurrency === 'number' ? signals.hardwareConcurrency : 8;
  return mobileLike && cores <= 4;
}

export type SensorApplyResult = 'off' | 'applied' | 'refused';

export interface SensorEffectPlan {
  result: SensorApplyResult;
  /** CSS filter for the map SURFACE element ('' = clear the inline filter). */
  filterCss: string;
  /** Whether the CRT scanline overlay should be visible. */
  crtOverlay: boolean;
  /** Overlay opacity when shown (intensity-driven). */
  crtOpacity: number;
}

/**
 * The pure decision behind applying an effect to the DOM — kept separate
 * from the DOM writes so the whole behaviour (refusal, thermal fallback,
 * CRT overlay) is unit-testable without a browser.
 *
 * IMPORTANT — the DOM target this plan is written for is the map's canvas
 * CONTAINER element (MapLibre's `.maplibregl-canvas-container`), NOT the
 * <canvas> itself. Popups, controls and attribution are siblings of the
 * canvas container inside the map container, so filtering it still leaves
 * the interface untouched — and a plain HTML element is filtered reliably
 * by every engine, including iOS Safari/WebKit, where a CSS filter on a
 * full-screen WebGL canvas is not composited (the canvas is a texture
 * layer; the original f87acef applier targeted the canvas and the effect
 * silently never painted on iPhones while working on desktop Chrome).
 */
export function sensorEffectPlan(
  state: SensorEffectState,
  env: { lowPower: boolean; svgFilters: boolean },
): SensorEffectPlan {
  if (state.mode === 'off') {
    return { result: 'off', filterCss: '', crtOverlay: false, crtOpacity: 0 };
  }
  if (env.lowPower) {
    return { result: 'refused', filterCss: '', crtOverlay: false, crtOpacity: 0 };
  }
  return {
    result: 'applied',
    filterCss: sensorFilterCss(state, { svgFilters: env.svgFilters }),
    crtOverlay: state.mode === 'crt',
    crtOpacity: 0.35 + 0.65 * clampIntensity(state.intensity),
  };
}
