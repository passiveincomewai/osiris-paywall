import type { Map, MapSourceDataEvent, ErrorEvent } from 'maplibre-gl';
import { batchTerrainLayers } from './terrain-layer-order';

export const TERRAIN_SOURCE = 'osiris-terrain-dem';
export type TerrainStatus = 'idle' | 'waiting' | 'loading' | 'ready' | 'error';

// Hysteresis prevents reloading tiles when hovering around the activation zoom.
export const TERRAIN_MIN_ZOOM = 10;
const DISABLE_ZOOM = 9.5;
export const TERRAIN_SETTLE_MS = 500;

export interface TerrainAttachOptions {
  /** Cap applied to the map's maxPitch while terrain is attached.
   *  Default 60: terrain's standing rule that enabling it never has to
   *  flatten a camera the visitor already placed. Flight follow passes
   *  its own max (85) — its cameras fly past 60 by design, and clamping
   *  one mid-ride would cut the ride's pitch out from under it. */
  pitchCap?: number;
  /** Activate as soon as zoom and visibility allow instead of waiting
   *  for the camera to settle. A follow camera is driven on a tick and
   *  never settles, so the settle gate would starve it indefinitely.
   *  Default false. */
  eager?: boolean;
  /** Relief multiplier handed to setTerrain. Default 1 (true height). */
  exaggeration?: number;
}

/** Lazy, bounded terrain using the existing renderer; no second map or imagery. */
export function attachTerrain(map: Map, onStatus: (status: TerrainStatus) => void, opts?: TerrainAttachOptions) {
  let disposed = false;
  let active = false;
  let failed = false;
  let restoreLayerOrder: (() => void) | undefined;
  let status: TerrainStatus | undefined;
  let activationTimer: ReturnType<typeof setTimeout> | undefined;
  const pitchCap = opts?.pitchCap ?? 60;
  const eager = opts?.eager ?? false;
  const exaggeration = opts?.exaggeration ?? 1;
  const originalPitchLimit = map.getMaxPitch();
  const originalPixelRatio = map.getPixelRatio();
  map.setMaxPitch(Math.min(originalPitchLimit, pitchCap));
  // Retina screens otherwise multiply the terrain framebuffers' pixel count.
  if (originalPixelRatio > 1.5) map.setPixelRatio(1.5);

  const report = (next: TerrainStatus) => {
    if (disposed || next === status) return;
    status = next;
    onStatus(next);
  };
  const release = () => {
    active = false;
    if (map.getTerrain()?.source === TERRAIN_SOURCE) map.setTerrain(null);
    if (map.getSource(TERRAIN_SOURCE)) map.removeSource(TERRAIN_SOURCE);
    restoreLayerOrder?.();
    restoreLayerOrder = undefined;
  };
  const cancelActivation = () => {
    clearTimeout(activationTimer);
    activationTimer = undefined;
  };
  const hidden = () => typeof document !== 'undefined' && document.hidden;
  const activate = () => {
    activationTimer = undefined;
    if (disposed || active || failed || hidden() || map.getZoom() < TERRAIN_MIN_ZOOM) return;
    // The settle path never activates under a moving camera; an eager
    // attach (flight follow) is driven continuously, so it must.
    if (!eager && map.isMoving()) return;
    active = true;
    report('loading');
    try {
      map.addSource(TERRAIN_SOURCE, {
        type: 'raster-dem',
        tiles: ['osiris-dem://{z}/{x}/{y}'],
        encoding: 'terrarium',
        tileSize: 256,
        maxzoom: 10,
        attribution: '<a href="https://github.com/tilezen/joerd/blob/master/docs/attribution.md">Terrain data credits</a>',
      });
      // DEM maxzoom only limits downloads, not terrain render-tile density.
      // Bound the latter too, especially the distant tiles in a pitched view.
      map.setSourceTileLodParams(10, 1.25, TERRAIN_SOURCE);
      restoreLayerOrder = batchTerrainLayers(map);
      map.setTerrain({ source: TERRAIN_SOURCE, exaggeration });
    } catch (error) {
      failed = true;
      release();
      report('error');
      console.warn('[OSIRIS] Terrain unavailable:', error);
    }
  };
  const update = () => {
    if (disposed || active || failed) return;
    cancelActivation();
    if (map.getZoom() < TERRAIN_MIN_ZOOM) {
      report('idle');
      return;
    }
    report('waiting');
    // Eager attaches skip the settle timer (and with it the movestart
    // cancel's whole purpose): activate now; activate() still enforces
    // the zoom floor and the visible-tab rule itself.
    if (eager) { activate(); return; }
    if (!map.isMoving() && !hidden()) activationTimer = setTimeout(activate, TERRAIN_SETTLE_MS);
  };
  const onZoom = () => {
    if (!active && map.getZoom() < TERRAIN_MIN_ZOOM) {
      cancelActivation();
      if (!failed) report('idle');
    }
    // Stop terrain requests during the zoom-out, before reaching the globe.
    if (active && map.getZoom() < DISABLE_ZOOM) {
      release();
      report('idle');
    }
  };
  const onData = (event: MapSourceDataEvent) => {
    // Individual raster tile completions carry `tile`, not sourceDataType:
    // 'content'. Waiting for 'content' alone leaves the indicator spinning.
    if (active && !failed && event.sourceId === TERRAIN_SOURCE &&
        event.isSourceLoaded && (event.tile || event.sourceDataType === 'idle')) report('ready');
  };
  const onError = (event: ErrorEvent & { sourceId?: string }) => {
    if (!active || event.sourceId !== TERRAIN_SOURCE) return;
    failed = true;
    report('error');
    // Let MapLibre finish its source callback before removing its resources.
    queueMicrotask(() => { if (!disposed) release(); });
  };

  map.on('movestart', cancelActivation);
  map.on('zoom', onZoom);
  map.on('moveend', update);
  map.on('sourcedata', onData);
  map.on('error', onError);
  const onVisibility = () => { if (hidden()) cancelActivation(); else update(); };
  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisibility);
  // React removes the map before running this effect's cleanup on a theme
  // change. Cancel deferred work without touching its already-destroyed style.
  const onRemove = () => {
    disposed = true;
    cancelActivation();
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisibility);
  };
  map.on('remove', onRemove);
  report('idle');
  update();

  return () => {
    if (disposed) return;
    disposed = true;
    cancelActivation();
    map.off('remove', onRemove);
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisibility);
    map.off('movestart', cancelActivation);
    map.off('zoom', onZoom);
    map.off('moveend', update);
    map.off('sourcedata', onData);
    map.off('error', onError);
    release();
    map.setMaxPitch(originalPitchLimit);
    if (originalPixelRatio > 1.5) map.setPixelRatio(originalPixelRatio);
  };
}
