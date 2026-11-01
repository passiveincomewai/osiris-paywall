/**
 * OSIRIS — Satellite imagery time slider (Esri World Imagery Wayback).
 *
 * The globe's satellite view has always been Esri's World Imagery
 * basemap, served live from the ArcGIS `World_Imagery` MapServer.
 * Esri also publishes **Wayback**: a free, keyless archive of that same
 * basemap — every version of World Imagery Esri has published since
 * 2014, served as tiles. This module is the slider's whole model:
 *
 *   - the release list (197 releases at build time, 2014-02-20 →
 *     2026-09-24), enumerated AT RUNTIME from Esri's own config
 *     document — the same `waybackconfig.json` Esri's
 *     `@vannizhang/wayback-core` library reads — so new releases
 *     appear as Esri publishes them, with a bundled sampled fallback
 *     if the config cannot be fetched;
 *   - the tile URL for any selection. A selection is either `latest`
 *     (the live World_Imagery service the globe already uses — its
 *     newest Wayback snapshot is byte-identical to it, verified
 *     2026-10-27) or one archive release;
 *   - the honest labels and attribution. Archive imagery is NEVER
 *     called live: a Wayback selection is labelled with its release
 *     date in the slider readout, and the source carries Esri's own
 *     credit line (the previous code set no attribution at all);
 *   - `syncSatelliteOverlay`, the map-side sync, written to the exact
 *     pattern `syncDayOverlay` (lib/basemap-mode) established: the
 *     satellite raster is an overlay on the CARTO style, never a
 *     style swap, so the ~55 custom sources survive.
 *
 * The slider's pre-2014 segment is NOT Esri's — Wayback's archive
 * starts 2014-02-20. Stops left of the oldest release are Landsat
 * years 1984–2013 (lib/landsat-imagery: USGS/NASA scenes served by
 * the Planetary Computer mosaic tiler through a custom protocol).
 * The selection type, the slider geometry and the overlay below
 * treat the two families as one continuous timeline; each family
 * keeps its own honest label (release date for Wayback, year +
 * source + 30 m for Landsat), and a Landsat vintage's raster
 * source is capped at Landsat's native zoom (see
 * `sourceMaxzoomForTileUrl`).
 *
 * Access stays what the 2026-10-26 chrome ship made it: the satellite
 * basemap — now including its whole archive — is FREE FOR EVERYONE.
 * Nothing here gates, and nothing here touches the satellite
 * *tracking* layers, which keep their own rules.
 *
 * Wayback facts verified 2026-10-27 (see the build report):
 *   - config: https://s3-us-west-2.amazonaws.com/config.maptiles.arcgis.com/waybackconfig.json
 *     (CORS `Access-Control-Allow-Origin: *`; keyed by release number;
 *     each entry's itemTitle carries the release date);
 *   - tiles: https://wayback.maptiles.arcgis.com/arcgis/rest/services/World_Imagery/MapServer/tile/{releaseNum}/{z}/{y}/{x}
 *     (the REST form of the config's WMTS itemURL; same {z}/{y}/{x}
 *     order as the live service template);
 *   - attribution (the live service's own copyrightText):
 *     "Source: Esri, Vantor, Earthstar Geographics, and the GIS User Community".
 */

import {
  LANDSAT_ATTRIBUTION,
  LANDSAT_FIRST_YEAR,
  LANDSAT_MAXZOOM,
  LANDSAT_PROTOCOL_NAME,
  LANDSAT_STOP_COUNT,
  clampLandsatYear,
  landsatProtocolTileUrl,
} from './landsat-imagery';

/** The live Esri World Imagery tiles — the satellite view's original
 *  source, and the slider's "latest" position. */
export const CURRENT_IMAGERY_TILE_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

/** Attribution for the live service, verbatim from its service
 *  document's copyrightText (fetched 2026-10-27). Vantor is the 2025
 *  rename of Maxar, the imagery provider. */
export const CURRENT_IMAGERY_ATTRIBUTION =
  'Source: Esri, Vantor, Earthstar Geographics, and the GIS User Community';

/** Esri's Wayback release config — the enumeration source. */
export const WAYBACK_CONFIG_URL =
  'https://s3-us-west-2.amazonaws.com/config.maptiles.arcgis.com/waybackconfig.json';

export const WAYBACK_TILE_BASE =
  'https://wayback.maptiles.arcgis.com/arcgis/rest/services/World_Imagery/MapServer/tile';

/** Source/layer ids — the SAME ids the satellite view has always used
 *  (lib/basemap-mode's day overlay anchors itself under
 *  'satellite-layer'; that layering must not move). */
export const SATELLITE_SOURCE_ID = 'satellite-tiles';
export const SATELLITE_LAYER_ID = 'satellite-layer';

export interface WaybackRelease {
  /** Esri's release number — the tile URL's time parameter. */
  releaseNum: number;
  /** Esri's release date for the archive snapshot, ISO `YYYY-MM-DD`.
   *  This is when Esri published that version of the basemap; the
   *  imagery over any one place can be older. Labels must say
   *  "release", never imply a capture date. */
  date: string;
}

/** What the satellite basemap is showing: the live service, one
 *  dated Esri archive release, or one Landsat year (1984–2013 —
 *  the pre-Wayback segment, served by lib/landsat-imagery). */
export type SatelliteImagerySelection =
  | { kind: 'latest' }
  | { kind: 'wayback'; release: WaybackRelease }
  | { kind: 'landsat'; year: number };

export const LATEST_SELECTION: SatelliteImagerySelection = { kind: 'latest' };

/** The tile template for an archive release (Esri tile order
 *  {z}/{y}/{x}, matching the live service's template). */
export function waybackTileUrl(releaseNum: number): string {
  return `${WAYBACK_TILE_BASE}/${releaseNum}/{z}/{y}/{x}`;
}

/** The tile template for a selection: `latest` is the live service —
 *  byte-identical to the newest archive snapshot, and the thing the
 *  satellite view has always shown; a Landsat year is the custom
 *  protocol template lib/landsat-imagery serves. */
export function satelliteTileUrl(selection: SatelliteImagerySelection): string {
  if (selection.kind === 'latest') return CURRENT_IMAGERY_TILE_URL;
  if (selection.kind === 'landsat') return landsatProtocolTileUrl(selection.year);
  return waybackTileUrl(selection.release.releaseNum);
}

/** The attribution the satellite source carries. One constant for
 *  every selection on purpose: keeping it constant means a slider
 *  step never has to rebuild the displayed source, so its place in
 *  the layer stack never moves. It therefore carries BOTH credit
 *  lines: Esri's own (verbatim above — the Wayback tiles are the
 *  same World Imagery product, current or archived) and, appended,
 *  the Landsat credit for the pre-2014 vintages. The vintage itself
 *  is disclosed by the slider's readout (release date + "archive
 *  release", or year + "Landsat"), which is on screen whenever
 *  satellite is. */
export const SATELLITE_SOURCE_ATTRIBUTION =
  `${CURRENT_IMAGERY_ATTRIBUTION} · Historical (1984–2013): ${LANDSAT_ATTRIBUTION}`;

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** `2026-09-24` → `24 Sep 2026`. Parsed by hand on purpose: `new Date`
 *  would interpret the ISO date as UTC midnight and a local-time
 *  render could shift the day for users west of Greenwich. */
export function formatReleaseDate(isoDate: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!m) return isoDate;
  const month = MONTHS_SHORT[Number(m[2]) - 1];
  if (!month) return isoDate;
  return `${Number(m[3])} ${month} ${m[1]}`;
}

/** The short label for a selection — the slider's readout and its
 *  aria value text. `latest` is "Latest imagery", never "live
 *  imagery": the basemap is a published mosaic, not a live feed.
 *  A Landsat year is labelled by YEAR only: the year's mosaic is
 *  assembled from that year's clearest scenes, so a month or a
 *  date would be a false precision. */
export function satelliteSelectionLabel(selection: SatelliteImagerySelection): string {
  if (selection.kind === 'latest') return 'Latest imagery';
  if (selection.kind === 'landsat') return `Landsat · ${clampLandsatYear(selection.year)}`;
  return `Imagery release · ${formatReleaseDate(selection.release.date)}`;
}

/** The slider's one-line hint while a Landsat vintage is on screen
 *  AND the view is zoomed past Landsat's native zoom: there the map
 *  is stretching z13 tiles, so the coarse blocks are as sharp as
 *  that era's imagery ever gets — the hint says so before they read
 *  as a rendering bug, and points at the remedy. At or below the
 *  native zoom the imagery speaks for itself; no hint. */
export const LANDSAT_OVERZOOM_HINT =
  'Landsat 30 m \u2014 this is the sharpest 1984\u20132013 gets. Zoom out for the clearest view.';

export function landsatZoomHintVisible(
  selection: SatelliteImagerySelection,
  mapZoom: number | null | undefined,
): boolean {
  return (
    selection.kind === 'landsat' &&
    typeof mapZoom === 'number' &&
    Number.isFinite(mapZoom) &&
    mapZoom > LANDSAT_MAXZOOM
  );
}

/**
 * Parse Esri's Wayback config into the release list, oldest first.
 * The config is an object keyed by release number whose values carry
 * `itemTitle` ("World Imagery (Wayback 2026-09-24)"); the date is
 * read from the title. Malformed entries are skipped, and
 * anything that isn't the expected shape yields an empty list (the
 * caller then keeps the bundled fallback).
 */
export function parseWaybackConfig(data: unknown): WaybackRelease[] {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return [];
  const out: WaybackRelease[] = [];
  const seen = new Set<number>();
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    const releaseNum = Number(key);
    if (!Number.isFinite(releaseNum) || seen.has(releaseNum)) continue;
    if (!value || typeof value !== 'object') continue;
    const v = value as { itemTitle?: unknown };
    const date = dateFromTitle(typeof v.itemTitle === 'string' ? v.itemTitle : '');
    if (!date) continue;
    seen.add(releaseNum);
    out.push({ releaseNum, date });
  }
  out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.releaseNum - b.releaseNum));
  return out;
}

function dateFromTitle(title: string): string | null {
  const m = /Wayback (\d{4})-(\d{2})-(\d{2})\)?\s*$/.exec(title);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

/**
 * Bundled fallback releases — a sampled spread (every ~6th release)
 * of Esri's real archive as enumerated 2026-10-27, used only if the
 * config fetch fails. Every entry is a genuine release (number +
 * Esri's date for it); the runtime list replaces this wholesale when
 * it lands, and every fallback entry exists in the full list, so a
 * selection made against the fallback keeps its meaning.
 */
export const FALLBACK_WAYBACK_RELEASES: WaybackRelease[] = [
  [10, '2014-02-20'], [3026, '2014-07-02'], [23383, '2014-12-03'], [2730, '2015-03-25'],
  [28219, '2015-08-19'], [8781, '2015-11-18'], [19085, '2016-03-16'], [5097, '2016-07-20'],
  [21750, '2016-11-16'], [31026, '2017-02-27'], [14342, '2017-05-31'], [18358, '2017-09-13'],
  [10768, '2018-01-31'], [32337, '2018-05-16'], [14426, '2018-09-26'], [25944, '2019-01-31'],
  [12576, '2019-06-05'], [11351, '2019-10-09'], [16062, '2020-03-23'], [9549, '2020-07-22'],
  [29260, '2020-12-16'], [15423, '2021-05-19'], [51313, '2021-09-28'], [26083, '2022-02-02'],
  [44710, '2022-06-08'], [44988, '2022-10-12'], [37890, '2023-04-05'], [1034, '2023-10-11'],
  [13968, '2024-03-28'], [56450, '2024-10-10'], [27982, '2025-04-24'], [20512, '2025-10-23'],
  [49059, '2026-04-30'], [63116, '2026-09-24'],
].map(([releaseNum, date]) => ({ releaseNum: releaseNum as number, date: date as string }));

type Fetcher = (url: string) => Promise<{ ok: boolean; json: () => Promise<unknown> }>;

/**
 * The release list for the slider: Esri's config when it can be
 * fetched and parsed, the bundled fallback otherwise. Never rejects —
 * the slider must work (degraded) even with Esri's config host down.
 */
export async function fetchWaybackReleases(fetcher?: Fetcher): Promise<WaybackRelease[]> {
  const doFetch: Fetcher =
    fetcher ?? ((url: string) => fetch(url) as Promise<{ ok: boolean; json: () => Promise<unknown> }>);
  try {
    const res = await doFetch(WAYBACK_CONFIG_URL);
    if (!res.ok) return FALLBACK_WAYBACK_RELEASES;
    const parsed = parseWaybackConfig(await res.json());
    return parsed.length > 0 ? parsed : FALLBACK_WAYBACK_RELEASES;
  } catch {
    return FALLBACK_WAYBACK_RELEASES;
  }
}

/** Slider geometry, oldest → newest: the Landsat years 1984–2013
 *  (one stop per year, lib/landsat-imagery), then one stop per
 *  Wayback archive release, then the final position, which is
 *  `latest`. The slider's default (and max) is `latest`. The
 *  2013 → 2014 boundary is just a step: the stops are adjacent, so
 *  scrubbing across it walks from the last Landsat year onto the
 *  first Esri release in the same drag. */
export function sliderPositionCount(releases: readonly WaybackRelease[]): number {
  return LANDSAT_STOP_COUNT + releases.length + 1;
}

export function selectionAtSliderIndex(
  releases: readonly WaybackRelease[],
  index: number,
): SatelliteImagerySelection {
  const clamped = Math.max(
    0,
    Math.min(Math.floor(index) || 0, LANDSAT_STOP_COUNT + releases.length),
  );
  if (clamped < LANDSAT_STOP_COUNT) {
    return { kind: 'landsat', year: LANDSAT_FIRST_YEAR + clamped };
  }
  const releaseIndex = clamped - LANDSAT_STOP_COUNT;
  if (releaseIndex >= releases.length) return { kind: 'latest' };
  return { kind: 'wayback', release: releases[releaseIndex] };
}

export function sliderIndexForSelection(
  releases: readonly WaybackRelease[],
  selection: SatelliteImagerySelection,
): number {
  if (selection.kind === 'latest') return LANDSAT_STOP_COUNT + releases.length;
  if (selection.kind === 'landsat') {
    return clampLandsatYear(selection.year) - LANDSAT_FIRST_YEAR;
  }
  const i = releases.findIndex(r => r.releaseNum === selection.release.releaseNum);
  return i >= 0 ? LANDSAT_STOP_COUNT + i : LANDSAT_STOP_COUNT + releases.length;
}

/** The minimal map surface the satellite overlay drives (MapLibre
 *  satisfies it; tests fake it, exactly as lib/basemap-mode does). */
export interface SatelliteOverlayMap {
  getSource(id: string): { setTiles(tiles: string[]): void } | undefined;
  addSource(id: string, source: unknown): void;
  removeSource(id: string): void;
  getLayer(id: string): unknown;
  addLayer(layer: unknown, beforeId?: string): void;
  removeLayer(id: string): void;
  setLayoutProperty(layerId: string, name: string, value: unknown): void;
  setPaintProperty(layerId: string, name: string, value: unknown): void;
}

/** The Esri sources' maxzoom — the satellite view's long-standing
 *  cap for the live service and its Wayback snapshots. */
export const ESRI_SOURCE_MAXZOOM = 18;

/** The maxzoom a raster source must be created with for a vintage:
 *  Landsat tiles (the `osiris-landsat://` protocol) cap at
 *  Landsat's native-resolution zoom; everything else is Esri's.
 *  A source's maxzoom is fixed at creation in MapLibre, and the
 *  two overlay sources swap roles between vintages of BOTH
 *  families — so when the standby is asked to load a vintage of
 *  the other family, it is rebuilt (see startSatelliteLoad). The
 *  rebuild only ever touches the standby, which is invisible
 *  (opacity 0) while it loads: the crossfade contract — the
 *  displayed source is never reloaded in place — is untouched. */
export function sourceMaxzoomForTileUrl(tileUrl: string): number {
  return tileUrl.startsWith(`${LANDSAT_PROTOCOL_NAME}://`)
    ? LANDSAT_MAXZOOM
    : ESRI_SOURCE_MAXZOOM;
}

/** The raster resampling a satellite layer must paint with, by
 *  family — or null for "leave MapLibre's default". MapLibre's
 *  default is 'linear': right for Esri's near-native tiles, wrong
 *  for Landsat. A 30 m pixel's edge is real data, and linear
 *  interpolation blends ACROSS it; past LANDSAT_MAXZOOM, where the
 *  map stretches z13 tiles to fill deeper zooms, that blending
 *  smears the blocks into structureless mush — on a phone at city
 *  zoom the pre-2014 imagery read as "totally blurred" even though
 *  the tiles themselves carry clear block structure (verified
 *  against direct Planetary Computer z12/z13 Las Vegas tile
 *  fetches, 2026-11-01: street grid, blocks and the freeway
 *  corridor are all legible at native zoom). 'nearest' keeps each
 *  30 m pixel a crisp block at every zoom: pixelated but legible,
 *  the honest look of the data. Esri returns null so its layers'
 *  paint stays exactly what it has always been — no key at all
 *  (a test pins that).
 *
 *  The family bookkeeping is the same argument as the standby
 *  maxzoom rebuild: a layer is only ever (re)created alongside its
 *  source, and a family switch rebuilds both — so a layer's
 *  resampling always matches the vintage its source holds. */
export function satelliteResamplingForTileUrl(tileUrl: string): 'nearest' | null {
  return tileUrl.startsWith(`${LANDSAT_PROTOCOL_NAME}://`) ? 'nearest' : null;
}

/** The standby source/layer ids. A vintage switch loads the target
 *  release on the STANDBY source — stacked directly above the active
 *  satellite layer, both under `day-night-fill`, at opacity 0 — and
 *  only crossfades once MapLibre reports the standby fully loaded.
 *  The previously displayed imagery therefore stays on screen for the
 *  whole load: no blank basemap, no half-swapped tiles. (The old
 *  behaviour — `setTiles` on the one visible source — is a full
 *  source reload in MapLibre: every visible tile is invalidated and
 *  re-fetched from the archive host before the new vintage can
 *  paint, which read as a long freeze on the switch.) */
export const SATELLITE_ALT_SOURCE_ID = 'satellite-tiles-alt';
export const SATELLITE_ALT_LAYER_ID = 'satellite-layer-alt';

/** The satellite layer's long-standing opacity. */
export const SATELLITE_OPACITY = 0.85;
/** How long a selection must settle before its tiles start loading.
 *  A drag across a dozen releases loads only the stop it lands on,
 *  not every release it passed over. */
export const SATELLITE_SETTLE_MS = 180;
/** Crossfade length once the incoming vintage has loaded. */
export const SATELLITE_FADE_MS = 350;

/** What the overlay last applied, held by the caller (a ref in
 *  OsirisMap) so repeat syncs are no-ops. */
export interface SatelliteOverlayState {
  /** The vintage actually on screen (the committed selection's tile
   *  URL), or null before the first sync. */
  tileUrl: string | null;
  /** Which source is the committed/displayed one; the other source
   *  is the standby that loads the next vintage. */
  activeSourceId: string;
  /** The tile URL each source was last pointed at. */
  sourceUrls: Record<string, string | null>;
  /** The maxzoom each source was CREATED with (MapLibre fixes it
   *  at creation). Drives the standby rebuild when a vintage of
   *  the other imagery family targets the source. */
  sourceMaxzooms: Record<string, number | null>;
  /** The vintage the standby is settling into / loading, or null. */
  pendingUrl: string | null;
  settleTimer: ReturnType<typeof setTimeout> | null;
  fadeTimer: ReturnType<typeof setTimeout> | null;
}

export function createSatelliteOverlayState(): SatelliteOverlayState {
  return {
    tileUrl: null,
    activeSourceId: SATELLITE_SOURCE_ID,
    sourceUrls: { [SATELLITE_SOURCE_ID]: null, [SATELLITE_ALT_SOURCE_ID]: null },
    sourceMaxzooms: { [SATELLITE_SOURCE_ID]: null, [SATELLITE_ALT_SOURCE_ID]: null },
    pendingUrl: null,
    settleTimer: null,
    fadeTimer: null,
  };
}

export function satelliteLayerIdForSource(sourceId: string): string {
  return sourceId === SATELLITE_SOURCE_ID ? SATELLITE_LAYER_ID : SATELLITE_ALT_LAYER_ID;
}

/** The source that is NOT currently displayed — the one a switch
 *  loads its target vintage onto. */
export function satelliteStandbySourceId(state: SatelliteOverlayState): string {
  return state.activeSourceId === SATELLITE_SOURCE_ID
    ? SATELLITE_ALT_SOURCE_ID
    : SATELLITE_SOURCE_ID;
}

/** True while a chosen vintage is still on its way in (settling or
 *  loading on the standby) — the slider's loading readout keys off
 *  this. The committed imagery stays up the whole time. */
export function isSatelliteOverlayLoadPending(state: SatelliteOverlayState): boolean {
  return state.pendingUrl !== null;
}

function ensureSatelliteSourceAndLayer(
  map: SatelliteOverlayMap,
  state: SatelliteOverlayState,
  sourceId: string,
  tileUrl: string,
  opacity: number,
): void {
  if (!map.getSource(sourceId)) {
    map.addSource(sourceId, {
      type: 'raster',
      tiles: [tileUrl],
      tileSize: 256,
      maxzoom: sourceMaxzoomForTileUrl(tileUrl),
      attribution: SATELLITE_SOURCE_ATTRIBUTION,
    });
    state.sourceUrls[sourceId] = tileUrl;
    state.sourceMaxzooms[sourceId] = sourceMaxzoomForTileUrl(tileUrl);
  }
  const layerId = satelliteLayerIdForSource(sourceId);
  if (!map.getLayer(layerId)) {
    const resampling = satelliteResamplingForTileUrl(tileUrl);
    map.addLayer(
      {
        id: layerId,
        type: 'raster',
        source: sourceId,
        paint: {
          'raster-opacity': opacity,
          'raster-opacity-transition': { duration: SATELLITE_FADE_MS, delay: 0 },
          // Landsat layers only: crisp nearest-neighbour pixels
          // (see satelliteResamplingForTileUrl). Esri's paint
          // object stays exactly what it has always been.
          ...(resampling ? { 'raster-resampling': resampling } : {}),
        },
      },
      'day-night-fill',
    );
  }
}

/** Point the standby source at `url` and let its tiles load under
 *  the still-displayed vintage. Runs when a selection has settled
 *  (see SATELLITE_SETTLE_MS); a selection superseded while settling
 *  never reaches the network. */
function startSatelliteLoad(
  map: SatelliteOverlayMap,
  state: SatelliteOverlayState,
  url: string,
): void {
  if (state.pendingUrl !== url) return; // superseded while settling
  // A fade-out timer for this layer must not hide it mid-load.
  if (state.fadeTimer) {
    clearTimeout(state.fadeTimer);
    state.fadeTimer = null;
  }
  const standbyId = satelliteStandbySourceId(state);
  // A source's maxzoom is fixed at creation. If the standby was
  // created for the other imagery family (Esri 18 vs Landsat 13),
  // rebuild it before pointing it at this vintage — the standby is
  // invisible (opacity 0, mid-load), so removing and re-adding it
  // disturbs nothing on screen.
  if (
    map.getSource(standbyId) &&
    state.sourceMaxzooms[standbyId] !== null &&
    state.sourceMaxzooms[standbyId] !== sourceMaxzoomForTileUrl(url)
  ) {
    const standbyLayerId = satelliteLayerIdForSource(standbyId);
    if (map.getLayer(standbyLayerId)) map.removeLayer(standbyLayerId);
    map.removeSource(standbyId);
    state.sourceUrls[standbyId] = null;
    state.sourceMaxzooms[standbyId] = null;
  }
  ensureSatelliteSourceAndLayer(map, state, standbyId, url, 0);
  if (state.sourceUrls[standbyId] !== url) {
    map.getSource(standbyId)?.setTiles([url]);
    state.sourceUrls[standbyId] = url;
  }
  const layerId = satelliteLayerIdForSource(standbyId);
  map.setLayoutProperty(layerId, 'visibility', 'visible');
  map.setPaintProperty(layerId, 'raster-opacity', 0);
}

/**
 * Crossfade to the standby's vintage once it has fully loaded:
 * standby fades up to the satellite opacity, the old layer fades
 * out and is hidden once the fade lands, and the two sources swap
 * roles — the retired one becomes the next switch's standby, still
 * holding the previous vintage (so switching straight back is a
 * fade, not a reload). Returns false when there is nothing coherent
 * to commit (no pending load, or the standby was re-targeted since).
 */
export function commitSatelliteOverlayFade(
  map: SatelliteOverlayMap,
  state: SatelliteOverlayState,
): boolean {
  const url = state.pendingUrl;
  if (!url) return false;
  const standbyId = satelliteStandbySourceId(state);
  if (state.sourceUrls[standbyId] !== url) return false;
  const standbyLayerId = satelliteLayerIdForSource(standbyId);
  const retiredLayerId = satelliteLayerIdForSource(state.activeSourceId);
  map.setPaintProperty(standbyLayerId, 'raster-opacity', SATELLITE_OPACITY);
  map.setPaintProperty(retiredLayerId, 'raster-opacity', 0);
  state.activeSourceId = standbyId;
  state.tileUrl = url;
  state.pendingUrl = null;
  if (state.fadeTimer) clearTimeout(state.fadeTimer);
  state.fadeTimer = setTimeout(() => {
    state.fadeTimer = null;
    // Hide the retired layer — unless a role swap since made it the
    // active one again (its fade timer is cleared on commit, so this
    // is belt-and-braces).
    if (satelliteLayerIdForSource(state.activeSourceId) !== retiredLayerId) {
      map.setLayoutProperty(retiredLayerId, 'visibility', 'none');
    }
  }, SATELLITE_FADE_MS + 60);
  return true;
}

/**
 * The map-event half of the crossfade: OsirisMap forwards MapLibre
 * `sourcedata` events here; when the STANDBY source reports itself
 * loaded, the fade commits. Events for any other source, or a
 * standby that is still loading, are ignored.
 */
export function handleSatelliteSourceData(
  map: SatelliteOverlayMap,
  state: SatelliteOverlayState,
  sourceId: string | undefined,
  isSourceLoaded: boolean | undefined,
): boolean {
  if (!isSourceLoaded || !state.pendingUrl) return false;
  if (sourceId !== satelliteStandbySourceId(state)) return false;
  return commitSatelliteOverlayFade(map, state);
}

/**
 * Warm the Wayback tile origin (DNS + TLS) so the first switch to a
 * past release doesn't pay connection setup inside the switch. The
 * current imagery is served from a different host
 * (server.arcgisonline.com), so without this the archive host is
 * cold until first use. Idempotent; a no-op off-browser.
 */
export function preconnectWaybackOrigin(): void {
  if (typeof document === 'undefined') return;
  const href = 'https://wayback.maptiles.arcgis.com';
  if (document.querySelector(`link[rel="preconnect"][href="${href}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'preconnect';
  link.href = href;
  link.crossOrigin = 'anonymous';
  document.head?.appendChild(link);
}

/**
 * Bring the satellite overlay in line with (satelliteOn, selection):
 *
 *   - first sync → create the primary source/layer (under
 *     `day-night-fill`, where the satellite layer has always sat, so
 *     the day overlay and every custom layer keep their stacking)
 *     with the selection's tiles and the imagery attribution;
 *   - selection change → the new vintage loads on the standby
 *     source after a short settle (see startSatelliteLoad) and
 *     crossfades in via commitSatelliteOverlayFade when loaded —
 *     the displayed imagery is never invalidated mid-switch;
 *   - the active layer's visibility follows satelliteOn; turning
 *     satellite off also cancels any pending load and resets both
 *     layers to their committed steady state.
 *
 * Idempotent; safe to call from an effect on every relevant change.
 */
export function syncSatelliteOverlay(
  map: SatelliteOverlayMap,
  state: SatelliteOverlayState,
  satelliteOn: boolean,
  selection: SatelliteImagerySelection,
): void {
  const tileUrl = satelliteTileUrl(selection);
  ensureSatelliteSourceAndLayer(map, state, SATELLITE_SOURCE_ID, tileUrl, SATELLITE_OPACITY);
  if (state.tileUrl === null) {
    // First sync: the primary source was just created holding this
    // selection — it IS the committed vintage.
    state.tileUrl = state.sourceUrls[state.activeSourceId] ?? tileUrl;
  }
  const activeLayerId = satelliteLayerIdForSource(state.activeSourceId);
  const standbyLayerId = satelliteLayerIdForSource(satelliteStandbySourceId(state));

  if (!satelliteOn) {
    if (state.settleTimer) {
      clearTimeout(state.settleTimer);
      state.settleTimer = null;
    }
    if (state.fadeTimer) {
      clearTimeout(state.fadeTimer);
      state.fadeTimer = null;
    }
    state.pendingUrl = null;
    if (map.getLayer(activeLayerId)) {
      map.setPaintProperty(activeLayerId, 'raster-opacity', SATELLITE_OPACITY);
      map.setLayoutProperty(activeLayerId, 'visibility', 'none');
    }
    if (map.getLayer(standbyLayerId)) {
      map.setPaintProperty(standbyLayerId, 'raster-opacity', 0);
      map.setLayoutProperty(standbyLayerId, 'visibility', 'none');
    }
    return;
  }

  map.setLayoutProperty(activeLayerId, 'visibility', 'visible');

  if (tileUrl === state.tileUrl) {
    // Back at the committed vintage (e.g. dragged away and returned
    // before the new one landed): abandon the pending load.
    if (state.pendingUrl !== null) {
      if (state.settleTimer) {
        clearTimeout(state.settleTimer);
        state.settleTimer = null;
      }
      state.pendingUrl = null;
    }
    return;
  }
  if (tileUrl === state.pendingUrl) return; // already settling/loading it
  state.pendingUrl = tileUrl;
  if (state.settleTimer) clearTimeout(state.settleTimer);
  state.settleTimer = setTimeout(() => {
    state.settleTimer = null;
    startSatelliteLoad(map, state, tileUrl);
  }, SATELLITE_SETTLE_MS);
}
