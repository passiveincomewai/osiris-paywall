/**
 * OSIRIS — Day / Night basemap mode.
 *
 * The globe's standard basemap is CARTO Dark Matter ("night"). "Day"
 * mode lays CARTO's light raster basemap (Positron's light_all tiles —
 * the same provider, the same keyless CDN, proxied through
 * /api/proxy-tiles like every cartocdn request) over it as a raster
 * overlay. That is deliberately the SAME mechanism the Pro satellite
 * view uses (an ArcGIS raster overlay toggled by an effect in
 * OsirisMap): this codebase has no map.setStyle swap, because a style
 * swap would wipe the ~55 custom sources the map builds once at load.
 * An overlay leaves every custom layer exactly where it was.
 *
 * Interaction rule: the day overlay and the satellite overlay stack —
 * satellite sits above day. While satellite view is on, the day layer
 * hides; turning satellite off returns to whichever of day/night the
 * user last chose. Day/night itself is free for everyone and persists
 * per device; the satellite view stays Pro and untouched.
 */

export type BasemapMode = 'night' | 'day';

export const BASEMAP_MODE_STORAGE_KEY = 'we_basemap_mode';

/** CARTO light raster tiles — the light sibling of the dark style. */
export const DAY_TILE_URL = 'https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png';

export const DAY_SOURCE_ID = 'day-tiles';
export const DAY_LAYER_ID = 'day-layer';

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

function defaultStorage(): StorageLike | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

/** The persisted mode. Anything unreadable or unknown is night — the
 *  long-standing look a first-time visitor has always seen. */
export function readBasemapMode(storage: StorageLike | null = defaultStorage()): BasemapMode {
  try {
    return storage?.getItem(BASEMAP_MODE_STORAGE_KEY) === 'day' ? 'day' : 'night';
  } catch {
    return 'night';
  }
}

export function writeBasemapMode(mode: BasemapMode, storage: StorageLike | null = defaultStorage()): void {
  try {
    storage?.setItem(BASEMAP_MODE_STORAGE_KEY, mode);
  } catch {
    /* private mode / storage off — the toggle still works for the session */
  }
}

export function nextBasemapMode(mode: BasemapMode): BasemapMode {
  return mode === 'day' ? 'night' : 'day';
}

/** The day overlay shows only in day mode with satellite view off —
 *  satellite imagery overrides the standard basemap while active. */
export function dayOverlayVisible(mode: BasemapMode, satelliteOn: boolean): boolean {
  return mode === 'day' && !satelliteOn;
}

/** The effective basemap the user is looking at: the persisted day/night
 *  choice, overridden by satellite imagery while satellite view is on. */
export type BasemapView = 'night' | 'day' | 'satellite';

export function basemapView(mode: BasemapMode, satelliteOn: boolean): BasemapView {
  return satelliteOn ? 'satellite' : mode;
}

export type SatelliteSwitchAction = 'show-trial-picker' | 'turn-on' | 'turn-off';

/**
 * What flipping the satellite switch does. Satellite view is Pro: a
 * locked (non-Pro) user gets the standard TrialPicker path — the same
 * one every other Pro lock in the chrome uses — never the view.
 * Turning satellite OFF is always allowed, even for a locked user:
 * nobody gets trapped in a view they cannot exit (the assistant's
 * map_view tool could historically switch it on without a gate).
 */
export function satelliteSwitchAction(locked: boolean, satelliteOn: boolean): SatelliteSwitchAction {
  if (satelliteOn) return 'turn-off';
  return locked ? 'show-trial-picker' : 'turn-on';
}

/** The minimal map surface syncDayOverlay drives (MapLibre satisfies it). */
export interface DayOverlayMap {
  getSource(id: string): unknown;
  addSource(id: string, source: unknown): void;
  getLayer(id: string): unknown;
  addLayer(layer: unknown, beforeId?: string): void;
  setLayoutProperty(layerId: string, name: string, value: unknown): void;
}

/**
 * Bring the day overlay in line with (mode, satelliteOn): create the
 * source/layer once (under the satellite layer when it exists, else
 * under the day/night terminator — the same anchor the satellite view
 * uses, so every custom layer stays above both), then set visibility.
 * Idempotent; safe to call from an effect on every relevant change.
 */
export function syncDayOverlay(map: DayOverlayMap, mode: BasemapMode, satelliteOn: boolean): void {
  if (!map.getSource(DAY_SOURCE_ID)) {
    map.addSource(DAY_SOURCE_ID, {
      type: 'raster',
      tiles: [DAY_TILE_URL],
      tileSize: 256,
      maxzoom: 18,
    });
  }
  if (!map.getLayer(DAY_LAYER_ID)) {
    const beforeId = map.getLayer('satellite-layer') ? 'satellite-layer' : 'day-night-fill';
    map.addLayer(
      { id: DAY_LAYER_ID, type: 'raster', source: DAY_SOURCE_ID, paint: { 'raster-opacity': 1 } },
      beforeId,
    );
  }
  map.setLayoutProperty(DAY_LAYER_ID, 'visibility', dayOverlayVisible(mode, satelliteOn) ? 'visible' : 'none');
}
