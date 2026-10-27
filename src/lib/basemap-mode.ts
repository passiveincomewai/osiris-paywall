/**
 * OSIRIS — Day / Auto / Night basemap mode (the globe's sun–moon switch).
 *
 * The globe's standard basemap is CARTO Dark Matter ("night") — a GL
 * *vector* style, still served keyless. "Day" mode lays a light raster
 * street basemap over it as a raster overlay. That is deliberately the
 * SAME mechanism the satellite view uses (an ArcGIS raster overlay
 * toggled by an effect in OsirisMap): this codebase has no
 * map.setStyle swap, because a style swap would wipe the ~55 custom
 * sources the map builds once at load. An overlay leaves every custom
 * layer exactly where it was.
 *
 * The switch has THREE positions (owner's artwork + order, 2026-10-26):
 *
 *   day   (sun, knob right)  — the light Esri street overlay, and the
 *           page background behind the globe turns WHITE (OsirisMap
 *           drives the style's background layer + the map container).
 *           Day is NOT the satellite view: satellite imagery is a
 *           separate switch that overrides day/night while it is on.
 *   auto  (half sun / half moon, knob centre) — the live solar
 *           terminator blend: the dark basemap with the real day/night
 *           terminator shading (OsirisMap's computeSolarTerminator)
 *           shown, i.e. the globe as it actually is right now. AUTO is
 *           also the fresh-load default position, and its look is the
 *           long-standing default look: the terminator layer has always
 *           defaulted on (page.tsx activeLayers.day_night: true).
 *   night (moon, knob left) — the dark basemap. The terminator shading
 *           here follows the existing "Day / Night Cycle" layer toggle,
 *           exactly as it always has.
 *
 * The day tiles are Esri's World Street Map — the same keyless public
 * ArcGIS service family (and tile template shape, {z}/{y}/{x}) as the
 * satellite view's World_Imagery, fetched direct from the browser just
 * like the imagery. They are NOT CARTO's light_all raster tiles: since
 * 2026-09-25 CARTO no longer serves its raster basemaps without an API
 * key — every keyless light_all request returns an "API KEY REQUIRED"
 * placeholder tile. That placeholder is what filled the map when the
 * satellite view (which had been covering the day layer) was toggled
 * off in day mode, and it is why the day toggle appeared to do nothing:
 * the overlay switched, but the tiles it fetched were the placeholder.
 * CARTO's vector GL styles were not keyed, so the night basemap never
 * broke. Do not point the day overlay back at a CARTO raster endpoint
 * without a key plan.
 *
 * Interaction rule: the day overlay and the satellite overlay stack —
 * satellite sits above day. While satellite view is on, the day layer
 * hides; flipping the sun switch in that state still updates the
 * persisted choice, and it takes visible effect the moment satellite
 * view turns off. Turning satellite off returns to whichever of
 * day/auto/night the user last chose.
 *
 * Satellite view is FREE FOR EVERYONE (owner's explicit order,
 * 2026-10-26): there is no lock on the satellite basemap switch any
 * more. That unlock covers the basemap imagery only — the satellite
 * *tracking* layers (LayerPanel's SAT category) and every other Pro
 * feature keep their own gates, untouched.
 *
 * Day/auto/night is free for everyone and persists per device.
 */

export type BasemapMode = 'day' | 'auto' | 'night';

/** The switch's positions, left (knob left) to right (knob right),
 *  matching the owner's artwork: moon — half-and-half — sun. */
export const BASEMAP_MODE_ORDER: BasemapMode[] = ['night', 'auto', 'day'];

export const BASEMAP_MODE_STORAGE_KEY = 'we_basemap_mode';

/** Esri World Street Map raster tiles — keyless public ArcGIS service,
 *  the street sibling of the satellite view's World_Imagery. Esri tile
 *  URLs are {z}/{y}/{x} (note the order — same as the imagery template
 *  in OsirisMap). CARTO's light_all raster is NOT used: keyless CARTO
 *  raster requests return "API KEY REQUIRED" placeholder tiles since
 *  2026-09-25 (see the header note). */
export const DAY_TILE_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}';

/** Attribution for the day source, shown by the map's attribution
 *  control while the day layer is visible (Esri World Street Map
 *  credits, per Esri's tile attribution guidance). */
export const DAY_TILE_ATTRIBUTION = 'Esri, HERE, Garmin, © OpenStreetMap contributors, and the GIS User Community';

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

/** The persisted mode. Stored "day" and "night" are honoured exactly
 *  (choices made before AUTO existed keep their position); anything
 *  else — a stored "auto", nothing stored, an unreadable value — is
 *  AUTO, the fresh-load default position (whose resolved look is the
 *  long-standing default look: dark basemap + terminator shading). */
export function readBasemapMode(storage: StorageLike | null = defaultStorage()): BasemapMode {
  try {
    const stored = storage?.getItem(BASEMAP_MODE_STORAGE_KEY);
    if (stored === 'day') return 'day';
    if (stored === 'night') return 'night';
    return 'auto';
  } catch {
    return 'auto';
  }
}

export function writeBasemapMode(mode: BasemapMode, storage: StorageLike | null = defaultStorage()): void {
  try {
    storage?.setItem(BASEMAP_MODE_STORAGE_KEY, mode);
  } catch {
    /* private mode / storage off — the switch still works for the session */
  }
}

/** The basemap a mode resolves to for overlay + background purposes:
 *  day shows the light basemap; auto and night both sit on the dark
 *  basemap (auto differs from night only in the terminator rule). */
export function resolvedBasemapMode(mode: BasemapMode): 'day' | 'night' {
  return mode === 'day' ? 'day' : 'night';
}

/** Whether the solar terminator shading (day-night-fill) shows. AUTO is
 *  the terminator blend view, so the shading is on there by definition;
 *  in day and night the existing "Day / Night Cycle" layer toggle stays
 *  sovereign, exactly as before the three-position switch existed. */
export function terminatorVisible(mode: BasemapMode, layerToggleOn: boolean): boolean {
  return mode === 'auto' ? true : layerToggleOn;
}

/** The day overlay shows only in day mode with satellite view off —
 *  satellite imagery overrides the standard basemap while active. */
export function dayOverlayVisible(mode: BasemapMode, satelliteOn: boolean): boolean {
  return resolvedBasemapMode(mode) === 'day' && !satelliteOn;
}

/** The effective basemap the user is looking at: the persisted choice
 *  resolved, overridden by satellite imagery while satellite view is on. */
export type BasemapView = 'night' | 'day' | 'satellite';

export function basemapView(mode: BasemapMode, satelliteOn: boolean): BasemapView {
  return satelliteOn ? 'satellite' : resolvedBasemapMode(mode);
}

export type SatelliteSwitchAction = 'turn-on' | 'turn-off';

/**
 * What flipping the satellite switch does. Satellite view is free for
 * everyone (owner's order, 2026-10-26) — the switch simply toggles, for
 * every user, with no TrialPicker detour and no lock badge. Turning
 * satellite OFF is of course always allowed too: nobody gets trapped
 * in a view they cannot exit.
 */
export function satelliteSwitchAction(satelliteOn: boolean): SatelliteSwitchAction {
  return satelliteOn ? 'turn-off' : 'turn-on';
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
      attribution: DAY_TILE_ATTRIBUTION,
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
