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

/** What the satellite basemap is showing: the live service, or one
 *  dated archive release. */
export type SatelliteImagerySelection =
  | { kind: 'latest' }
  | { kind: 'wayback'; release: WaybackRelease };

export const LATEST_SELECTION: SatelliteImagerySelection = { kind: 'latest' };

/** The tile template for an archive release (Esri tile order
 *  {z}/{y}/{x}, matching the live service's template). */
export function waybackTileUrl(releaseNum: number): string {
  return `${WAYBACK_TILE_BASE}/${releaseNum}/{z}/{y}/{x}`;
}

/** The tile template for a selection: `latest` is the live service —
 *  byte-identical to the newest archive snapshot, and the thing the
 *  satellite view has always shown. */
export function satelliteTileUrl(selection: SatelliteImagerySelection): string {
  return selection.kind === 'latest'
    ? CURRENT_IMAGERY_TILE_URL
    : waybackTileUrl(selection.release.releaseNum);
}

/** The attribution the satellite source carries. One constant for
 *  every selection on purpose: it is the credit line Esri's service
 *  document specifies for this imagery, current or archived (the
 *  Wayback tiles are the same World Imagery product), and keeping it
 *  constant means a slider step is a pure tile swap — the source is
 *  never rebuilt, so its place in the layer stack never moves. The
 *  vintage itself is disclosed by the slider's readout (release date
 *  + "archive release"), which is on screen whenever satellite is. */
export const SATELLITE_SOURCE_ATTRIBUTION = CURRENT_IMAGERY_ATTRIBUTION;

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
 *  imagery": the basemap is a published mosaic, not a live feed. */
export function satelliteSelectionLabel(selection: SatelliteImagerySelection): string {
  return selection.kind === 'latest'
    ? 'Latest imagery'
    : `Imagery release · ${formatReleaseDate(selection.release.date)}`;
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

/** Slider geometry: positions `0 … releases.length` — one per
 *  archive release, oldest first, plus the final position, which is
 *  `latest`. The slider's default (and max) is `latest`. */
export function sliderPositionCount(releases: readonly WaybackRelease[]): number {
  return releases.length + 1;
}

export function selectionAtSliderIndex(
  releases: readonly WaybackRelease[],
  index: number,
): SatelliteImagerySelection {
  const clamped = Math.max(0, Math.min(Math.floor(index) || 0, releases.length));
  if (clamped >= releases.length) return { kind: 'latest' };
  return { kind: 'wayback', release: releases[clamped] };
}

export function sliderIndexForSelection(
  releases: readonly WaybackRelease[],
  selection: SatelliteImagerySelection,
): number {
  if (selection.kind === 'latest') return releases.length;
  const i = releases.findIndex(r => r.releaseNum === selection.release.releaseNum);
  return i >= 0 ? i : releases.length;
}

/** The minimal map surface syncSatelliteOverlay drives (MapLibre
 *  satisfies it; tests fake it, exactly as lib/basemap-mode does). */
export interface SatelliteOverlayMap {
  getSource(id: string): { setTiles(tiles: string[]): void } | undefined;
  addSource(id: string, source: unknown): void;
  getLayer(id: string): unknown;
  addLayer(layer: unknown, beforeId?: string): void;
  setLayoutProperty(layerId: string, name: string, value: unknown): void;
}

/** What the overlay last applied, held by the caller (a ref in
 *  OsirisMap) so repeat syncs are no-ops. */
export interface SatelliteOverlayState {
  tileUrl: string | null;
}

export function createSatelliteOverlayState(): SatelliteOverlayState {
  return { tileUrl: null };
}

/**
 * Bring the satellite overlay in line with (satelliteOn, selection):
 *
 *   - no source yet → create it (under `day-night-fill`, where the
 *     satellite layer has always sat, so the day overlay and every
 *     custom layer keep their stacking) with the selection's tiles
 *     and the imagery attribution;
 *   - source present, new selection → `setTiles` on the existing
 *     source (a pure tile swap; the layer, its opacity and its
 *     place in the stack are untouched);
 *   - then the layer's visibility follows satelliteOn.
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
  const source = map.getSource(SATELLITE_SOURCE_ID);
  if (!source) {
    map.addSource(SATELLITE_SOURCE_ID, {
      type: 'raster',
      tiles: [tileUrl],
      tileSize: 256,
      maxzoom: 18,
      attribution: SATELLITE_SOURCE_ATTRIBUTION,
    });
  } else if (state.tileUrl !== tileUrl) {
    source.setTiles([tileUrl]);
  }
  state.tileUrl = tileUrl;
  if (!map.getLayer(SATELLITE_LAYER_ID)) {
    map.addLayer(
      { id: SATELLITE_LAYER_ID, type: 'raster', source: SATELLITE_SOURCE_ID, paint: { 'raster-opacity': 0.85 } },
      'day-night-fill',
    );
  }
  map.setLayoutProperty(SATELLITE_LAYER_ID, 'visibility', satelliteOn ? 'visible' : 'none');
}
