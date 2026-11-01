import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  CURRENT_IMAGERY_ATTRIBUTION,
  CURRENT_IMAGERY_TILE_URL,
  ESRI_SOURCE_MAXZOOM,
  FALLBACK_WAYBACK_RELEASES,
  SATELLITE_ALT_SOURCE_ID,
  SATELLITE_FADE_MS,
  SATELLITE_OPACITY,
  SATELLITE_SETTLE_MS,
  commitSatelliteOverlayFade,
  createSatelliteOverlayState,
  fetchWaybackReleases,
  handleSatelliteSourceData,
  isSatelliteOverlayLoadPending,
  formatReleaseDate,
  parseWaybackConfig,
  SATELLITE_SOURCE_ATTRIBUTION,
  satelliteSelectionLabel,
  satelliteTileUrl,
  selectionAtSliderIndex,
  sliderIndexForSelection,
  sliderPositionCount,
  sourceMaxzoomForTileUrl,
  syncSatelliteOverlay,
  waybackTileUrl,
  type SatelliteOverlayMap,
  type WaybackRelease,
} from './wayback-imagery';
import {
  LANDSAT_ATTRIBUTION,
  LANDSAT_MAXZOOM,
  landsatProtocolTileUrl,
} from './landsat-imagery';

// A trimmed slice of Esri's real config shape (entries as served by
// config.maptiles.arcgis.com/waybackconfig.json, 2026-10-27).
const SAMPLE_CONFIG = {
  '63116': {
    itemID: 'a62236fc41a941b58d22707dca28b1a3',
    itemTitle: 'World Imagery (Wayback 2026-09-24)',
    itemURL: 'https://wayback.maptiles.arcgis.com/arcgis/rest/services/World_Imagery/WMTS/1.0.0/default028mm/MapServer/tile/63116/{level}/{row}/{col}',
    layerIdentifier: 'WB_2026_R09',
  },
  '10': {
    itemID: '105d66d29cf04e5caac07c7dea92a2ee',
    itemTitle: 'World Imagery (Wayback 2014-02-20)',
    itemURL: 'https://wayback.maptiles.arcgis.com/arcgis/rest/services/World_Imagery/WMTS/1.0.0/default028mm/MapServer/tile/10/{level}/{row}/{col}',
    layerIdentifier: 'WB_2014_R01',
  },
  '12576': {
    itemID: 'aaaa',
    itemTitle: 'World Imagery (Wayback 2019-06-05)',
    itemURL: 'https://wayback.maptiles.arcgis.com/arcgis/rest/services/World_Imagery/WMTS/1.0.0/default028mm/MapServer/tile/12576/{level}/{row}/{col}',
    layerIdentifier: 'WB_2019_R05',
  },
};

const rel = (releaseNum: number, date: string): WaybackRelease => ({ releaseNum, date });
const threeReleases = [rel(10, '2014-02-20'), rel(12576, '2019-06-05'), rel(63116, '2026-09-24')];

describe('parseWaybackConfig', () => {
  it('parses Esri\u2019s config shape into releases, oldest first', () => {
    const parsed = parseWaybackConfig(SAMPLE_CONFIG);
    expect(parsed).toEqual([
      rel(10, '2014-02-20'),
      rel(12576, '2019-06-05'),
      rel(63116, '2026-09-24'),
    ]);
  });

  it('skips malformed entries instead of failing the whole list', () => {
    const parsed = parseWaybackConfig({
      ...SAMPLE_CONFIG,
      '999': { itemTitle: 'not a wayback title' },
      '998': null,
      '997': { itemTitle: 'World Imagery (Wayback 2020-01-15)' },
      junk: { itemTitle: 'World Imagery (Wayback 2021-01-01)' },
    });
    expect(parsed.map(r => r.releaseNum)).toEqual([10, 12576, 997, 63116]);
  });

  it('yields an empty list for anything that is not the config object', () => {
    expect(parseWaybackConfig(null)).toEqual([]);
    expect(parseWaybackConfig('nope')).toEqual([]);
    expect(parseWaybackConfig([1, 2])).toEqual([]);
    expect(parseWaybackConfig({})).toEqual([]);
  });
});

describe('tile URLs and attribution', () => {
  it('latest is the live World_Imagery service the globe already uses', () => {
    expect(satelliteTileUrl({ kind: 'latest' })).toBe(CURRENT_IMAGERY_TILE_URL);
    expect(CURRENT_IMAGERY_TILE_URL).toContain('server.arcgisonline.com/ArcGIS/rest/services/World_Imagery');
  });

  it('an archive selection points at that release\u2019s Wayback tiles', () => {
    expect(waybackTileUrl(12576)).toBe(
      'https://wayback.maptiles.arcgis.com/arcgis/rest/services/World_Imagery/MapServer/tile/12576/{z}/{y}/{x}',
    );
    expect(satelliteTileUrl({ kind: 'wayback', release: rel(10, '2014-02-20') })).toBe(waybackTileUrl(10));
  });

  it('a Landsat selection points at the Landsat protocol template', () => {
    expect(satelliteTileUrl({ kind: 'landsat', year: 1990 })).toBe(landsatProtocolTileUrl(1990));
    expect(satelliteTileUrl({ kind: 'landsat', year: 1990 })).toBe(
      'osiris-landsat://1990/{z}/{x}/{y}',
    );
  });

  it('the source attribution carries Esri\u2019s credit line plus the Landsat credit, for every selection', () => {
    expect(CURRENT_IMAGERY_ATTRIBUTION).toBe(
      'Source: Esri, Vantor, Earthstar Geographics, and the GIS User Community',
    );
    // One constant for every selection (the displayed source is never
    // rebuilt on a slider step), so it credits both imagery families.
    expect(SATELLITE_SOURCE_ATTRIBUTION).toBe(
      `${CURRENT_IMAGERY_ATTRIBUTION} \u00b7 Historical (1984\u20132013): ${LANDSAT_ATTRIBUTION}`,
    );
  });
});

describe('labels', () => {
  it('formats ISO release dates without timezone day-shift', () => {
    expect(formatReleaseDate('2014-02-20')).toBe('20 Feb 2014');
    expect(formatReleaseDate('2026-09-24')).toBe('24 Sep 2026');
    expect(formatReleaseDate('2026-01-01')).toBe('1 Jan 2026');
    expect(formatReleaseDate('garbage')).toBe('garbage');
  });

  it('never calls imagery live: latest is "Latest imagery", archive shows its date', () => {
    expect(satelliteSelectionLabel({ kind: 'latest' })).toBe('Latest imagery');
    expect(satelliteSelectionLabel({ kind: 'latest' }).toLowerCase()).not.toContain('live');
    expect(satelliteSelectionLabel({ kind: 'wayback', release: rel(12576, '2019-06-05') })).toBe(
      'Imagery release · 5 Jun 2019',
    );
  });

  it('a Landsat selection is labelled by source and YEAR only — no fake precise date', () => {
    expect(satelliteSelectionLabel({ kind: 'landsat', year: 1990 })).toBe('Landsat · 1990');
    expect(satelliteSelectionLabel({ kind: 'landsat', year: 1984 })).toBe('Landsat · 1984');
  });
});

describe('slider geometry', () => {
  // The timeline is Landsat years 1984–2013 (30 stops), then the
  // Wayback releases, then latest. With threeReleases the positions
  // are 0..33: 0–29 Landsat, 30–32 releases, 33 latest.
  it('positions are the Landsat years, then one per release, then latest at the end', () => {
    expect(sliderPositionCount(threeReleases)).toBe(34);
    expect(selectionAtSliderIndex(threeReleases, 0)).toEqual({ kind: 'landsat', year: 1984 });
    expect(selectionAtSliderIndex(threeReleases, 29)).toEqual({ kind: 'landsat', year: 2013 });
    expect(selectionAtSliderIndex(threeReleases, 30)).toEqual({ kind: 'wayback', release: threeReleases[0] });
    expect(selectionAtSliderIndex(threeReleases, 32)).toEqual({ kind: 'wayback', release: threeReleases[2] });
    expect(selectionAtSliderIndex(threeReleases, 33)).toEqual({ kind: 'latest' });
  });

  it('the 2013/2014 boundary is a single step inside the same slider', () => {
    expect(selectionAtSliderIndex(threeReleases, 29)).toEqual({ kind: 'landsat', year: 2013 });
    expect(selectionAtSliderIndex(threeReleases, 30)).toEqual({
      kind: 'wayback',
      release: rel(10, '2014-02-20'),
    });
  });

  it('clamps out-of-range positions to the ends', () => {
    expect(selectionAtSliderIndex(threeReleases, -5)).toEqual({ kind: 'landsat', year: 1984 });
    expect(selectionAtSliderIndex(threeReleases, 99)).toEqual({ kind: 'latest' });
    expect(selectionAtSliderIndex([], 0)).toEqual({ kind: 'landsat', year: 1984 });
    expect(selectionAtSliderIndex([], 30)).toEqual({ kind: 'latest' });
  });

  it('index lookup round-trips, and an unknown release resolves to latest', () => {
    expect(sliderIndexForSelection(threeReleases, { kind: 'latest' })).toBe(33);
    expect(sliderIndexForSelection(threeReleases, { kind: 'landsat', year: 1984 })).toBe(0);
    expect(sliderIndexForSelection(threeReleases, { kind: 'landsat', year: 2013 })).toBe(29);
    expect(sliderIndexForSelection(threeReleases, { kind: 'landsat', year: 1990 })).toBe(6);
    expect(sliderIndexForSelection(threeReleases, { kind: 'wayback', release: threeReleases[1] })).toBe(31);
    expect(sliderIndexForSelection(threeReleases, { kind: 'wayback', release: rel(424242, '2000-01-01') })).toBe(33);
  });
});

describe('the bundled fallback', () => {
  it('is a real, ascending spread of Esri releases from 2014 to the newest', () => {
    expect(FALLBACK_WAYBACK_RELEASES.length).toBeGreaterThanOrEqual(30);
    expect(FALLBACK_WAYBACK_RELEASES[0]).toEqual(rel(10, '2014-02-20'));
    const dates = FALLBACK_WAYBACK_RELEASES.map(r => r.date);
    expect([...dates].sort()).toEqual(dates);
    const nums = new Set(FALLBACK_WAYBACK_RELEASES.map(r => r.releaseNum));
    expect(nums.size).toBe(FALLBACK_WAYBACK_RELEASES.length);
  });
});

describe('fetchWaybackReleases', () => {
  it('returns the parsed remote list when the config loads', async () => {
    const list = await fetchWaybackReleases(async () => ({ ok: true, json: async () => SAMPLE_CONFIG }));
    expect(list).toEqual(threeReleases);
  });

  it('falls back when the fetch fails, errors, or parses empty — never rejects', async () => {
    const notOk = await fetchWaybackReleases(async () => ({ ok: false, json: async () => ({}) }));
    expect(notOk).toBe(FALLBACK_WAYBACK_RELEASES);
    const threw = await fetchWaybackReleases(async () => { throw new Error('offline'); });
    expect(threw).toBe(FALLBACK_WAYBACK_RELEASES);
    const empty = await fetchWaybackReleases(async () => ({ ok: true, json: async () => ({ nope: 1 }) }));
    expect(empty).toBe(FALLBACK_WAYBACK_RELEASES);
  });
});

// ── syncSatelliteOverlay against a fake map ────────────────────────
// The switch contract (2026-10-30 fix for the past-imagery delay):
// the displayed source is NEVER reloaded in place. A selection loads
// on the standby source after a short settle, and only crossfades in
// once the standby reports loaded (handleSatelliteSourceData).
function fakeSatelliteMap(existingLayers: string[] = []) {
  const sources = new Map<string, { spec: unknown; tilesSet: string[][] }>();
  const layers = new Set(existingLayers);
  const added: Array<{ layer: any; beforeId?: string }> = [];
  const removedSources: string[] = [];
  const removedLayers: string[] = [];
  const visibility: Record<string, unknown> = {};
  const paint: Record<string, Record<string, unknown>> = {};
  const map: SatelliteOverlayMap = {
    getSource: (id) => {
      const s = sources.get(id);
      return s ? { setTiles: (tiles: string[]) => { s.tilesSet.push(tiles); } } : undefined;
    },
    addSource: (id, spec) => { sources.set(id, { spec, tilesSet: [] }); },
    removeSource: (id) => { sources.delete(id); removedSources.push(id); },
    getLayer: (id) => (layers.has(id) ? {} : undefined),
    addLayer: (layer: any, beforeId?: string) => { layers.add(layer.id); added.push({ layer, beforeId }); },
    removeLayer: (id) => { layers.delete(id); removedLayers.push(id); },
    setLayoutProperty: (id, _name, value) => { visibility[id] = value; },
    setPaintProperty: (id, name, value) => { (paint[id] ??= {})[name] = value; },
  };
  return { map, sources, layers, added, removedSources, removedLayers, visibility, paint };
}

describe('syncSatelliteOverlay', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('creates the satellite source + layer once, under day-night-fill, with attribution', () => {
    const f = fakeSatelliteMap(['day-night-fill']);
    const state = createSatelliteOverlayState();
    syncSatelliteOverlay(f.map, state, true, { kind: 'latest' });
    syncSatelliteOverlay(f.map, state, true, { kind: 'latest' });
    expect(f.added).toHaveLength(1);
    expect(f.added[0].layer.id).toBe('satellite-layer');
    expect(f.added[0].layer.source).toBe('satellite-tiles');
    expect(f.added[0].layer.paint).toEqual({
      'raster-opacity': SATELLITE_OPACITY,
      'raster-opacity-transition': { duration: SATELLITE_FADE_MS, delay: 0 },
    });
    expect(f.added[0].beforeId).toBe('day-night-fill');
    const spec = f.sources.get('satellite-tiles')!.spec as any;
    expect(spec.type).toBe('raster');
    expect(spec.tiles).toEqual([CURRENT_IMAGERY_TILE_URL]);
    expect(spec.tileSize).toBe(256);
    expect(spec.maxzoom).toBe(18);
    expect(spec.attribution).toBe(SATELLITE_SOURCE_ATTRIBUTION);
    expect(f.visibility['satellite-layer']).toBe('visible');
    expect(isSatelliteOverlayLoadPending(state)).toBe(false);
  });

  it('visibility follows satelliteOn without rebuilding the source', () => {
    const f = fakeSatelliteMap(['day-night-fill']);
    const state = createSatelliteOverlayState();
    syncSatelliteOverlay(f.map, state, true, { kind: 'latest' });
    syncSatelliteOverlay(f.map, state, false, { kind: 'latest' });
    expect(f.visibility['satellite-layer']).toBe('none');
    expect(f.sources.size).toBe(1);
    expect(f.sources.get('satellite-tiles')!.tilesSet).toHaveLength(0);
    syncSatelliteOverlay(f.map, state, true, { kind: 'latest' });
    expect(f.visibility['satellite-layer']).toBe('visible');
  });

  it('a selection change never reloads the displayed source — the standby takes the load after a settle', () => {
    const f = fakeSatelliteMap(['day-night-fill']);
    const state = createSatelliteOverlayState();
    syncSatelliteOverlay(f.map, state, true, { kind: 'latest' });
    syncSatelliteOverlay(f.map, state, true, { kind: 'wayback', release: threeReleases[1] });
    expect(isSatelliteOverlayLoadPending(state)).toBe(true);
    // Nothing has been fetched yet (settle), and the active source is untouched.
    expect(f.sources.size).toBe(1);
    expect(f.sources.get('satellite-tiles')!.tilesSet).toHaveLength(0);
    vi.advanceTimersByTime(SATELLITE_SETTLE_MS);
    // The standby source now exists, created holding the target tiles,
    // stacked under day-night-fill at opacity 0; the active source has
    // STILL never been reloaded.
    expect(f.sources.size).toBe(2);
    const altSpec = f.sources.get(SATELLITE_ALT_SOURCE_ID)!.spec as any;
    expect(altSpec.tiles).toEqual([waybackTileUrl(12576)]);
    expect(altSpec.attribution).toBe(SATELLITE_SOURCE_ATTRIBUTION);
    expect(f.sources.get(SATELLITE_ALT_SOURCE_ID)!.tilesSet).toHaveLength(0);
    expect(f.sources.get('satellite-tiles')!.tilesSet).toHaveLength(0);
    const altAdded = f.added.find(a => a.layer.id === 'satellite-layer-alt')!;
    expect(altAdded.beforeId).toBe('day-night-fill');
    expect(altAdded.layer.paint['raster-opacity']).toBe(0);
    expect(f.visibility['satellite-layer-alt']).toBe('visible');
    expect(f.visibility['satellite-layer']).toBe('visible');
  });

  it('the fade commits only when the STANDBY source reports loaded — then roles swap and the old layer retires', () => {
    const f = fakeSatelliteMap(['day-night-fill']);
    const state = createSatelliteOverlayState();
    syncSatelliteOverlay(f.map, state, true, { kind: 'latest' });
    syncSatelliteOverlay(f.map, state, true, { kind: 'wayback', release: threeReleases[1] });
    vi.advanceTimersByTime(SATELLITE_SETTLE_MS);
    // Events for the wrong source, or a not-yet-loaded standby, do nothing.
    expect(handleSatelliteSourceData(f.map, state, 'satellite-tiles', true)).toBe(false);
    expect(handleSatelliteSourceData(f.map, state, SATELLITE_ALT_SOURCE_ID, false)).toBe(false);
    expect(isSatelliteOverlayLoadPending(state)).toBe(true);
    expect(handleSatelliteSourceData(f.map, state, SATELLITE_ALT_SOURCE_ID, true)).toBe(true);
    expect(isSatelliteOverlayLoadPending(state)).toBe(false);
    expect(f.paint['satellite-layer-alt']?.['raster-opacity']).toBe(SATELLITE_OPACITY);
    expect(f.paint['satellite-layer']?.['raster-opacity']).toBe(0);
    expect(state.tileUrl).toBe(waybackTileUrl(12576));
    // After the fade lands, the retired layer hides.
    vi.advanceTimersByTime(SATELLITE_FADE_MS + 60);
    expect(f.visibility['satellite-layer']).toBe('none');
    // Switching straight back reuses the retired source (it still holds
    // the latest tiles) — a fade, not a reload: no setTiles anywhere.
    syncSatelliteOverlay(f.map, state, true, { kind: 'latest' });
    vi.advanceTimersByTime(SATELLITE_SETTLE_MS);
    expect(f.sources.get('satellite-tiles')!.tilesSet).toHaveLength(0);
    expect(f.sources.get(SATELLITE_ALT_SOURCE_ID)!.tilesSet).toHaveLength(0);
    expect(commitSatelliteOverlayFade(f.map, state)).toBe(true);
    expect(state.tileUrl).toBe(CURRENT_IMAGERY_TILE_URL);
  });

  it('a drag across several releases loads only the stop it lands on', () => {
    const f = fakeSatelliteMap(['day-night-fill']);
    const state = createSatelliteOverlayState();
    syncSatelliteOverlay(f.map, state, true, { kind: 'latest' });
    syncSatelliteOverlay(f.map, state, true, { kind: 'wayback', release: threeReleases[0] });
    vi.advanceTimersByTime(50);
    syncSatelliteOverlay(f.map, state, true, { kind: 'wayback', release: threeReleases[1] });
    vi.advanceTimersByTime(50);
    syncSatelliteOverlay(f.map, state, true, { kind: 'wayback', release: threeReleases[2] });
    vi.advanceTimersByTime(SATELLITE_SETTLE_MS);
    // Exactly one standby, holding ONLY the final stop's tiles.
    expect(f.sources.size).toBe(2);
    const altSpec = f.sources.get(SATELLITE_ALT_SOURCE_ID)!.spec as any;
    expect(altSpec.tiles).toEqual([waybackTileUrl(63116)]);
    expect(f.sources.get(SATELLITE_ALT_SOURCE_ID)!.tilesSet).toHaveLength(0);
  });

  it('dragging back to the committed vintage before the settle abandons the load', () => {
    const f = fakeSatelliteMap(['day-night-fill']);
    const state = createSatelliteOverlayState();
    syncSatelliteOverlay(f.map, state, true, { kind: 'latest' });
    syncSatelliteOverlay(f.map, state, true, { kind: 'wayback', release: threeReleases[0] });
    expect(isSatelliteOverlayLoadPending(state)).toBe(true);
    syncSatelliteOverlay(f.map, state, true, { kind: 'latest' });
    expect(isSatelliteOverlayLoadPending(state)).toBe(false);
    vi.advanceTimersByTime(SATELLITE_SETTLE_MS * 3);
    expect(f.sources.size).toBe(1); // standby never created, nothing fetched
  });

  it('turning satellite off mid-load cancels the pending switch and resets both layers', () => {
    const f = fakeSatelliteMap(['day-night-fill']);
    const state = createSatelliteOverlayState();
    syncSatelliteOverlay(f.map, state, true, { kind: 'latest' });
    syncSatelliteOverlay(f.map, state, true, { kind: 'wayback', release: threeReleases[1] });
    vi.advanceTimersByTime(SATELLITE_SETTLE_MS);
    expect(f.sources.size).toBe(2);
    syncSatelliteOverlay(f.map, state, false, { kind: 'wayback', release: threeReleases[1] });
    expect(isSatelliteOverlayLoadPending(state)).toBe(false);
    expect(f.visibility['satellite-layer']).toBe('none');
    expect(f.visibility['satellite-layer-alt']).toBe('none');
    expect(f.paint['satellite-layer']?.['raster-opacity']).toBe(SATELLITE_OPACITY);
    // A late "loaded" event for the cancelled load must not commit.
    expect(handleSatelliteSourceData(f.map, state, SATELLITE_ALT_SOURCE_ID, true)).toBe(false);
    // Re-entering satellite still shows the committed vintage.
    syncSatelliteOverlay(f.map, state, true, { kind: 'latest' });
    expect(f.visibility['satellite-layer']).toBe('visible');
    expect(state.tileUrl).toBe(CURRENT_IMAGERY_TILE_URL);
  });
});

describe('syncSatelliteOverlay with Landsat vintages', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('sourceMaxzoomForTileUrl separates the two imagery families', () => {
    expect(sourceMaxzoomForTileUrl(CURRENT_IMAGERY_TILE_URL)).toBe(ESRI_SOURCE_MAXZOOM);
    expect(sourceMaxzoomForTileUrl(waybackTileUrl(10))).toBe(ESRI_SOURCE_MAXZOOM);
    expect(sourceMaxzoomForTileUrl(landsatProtocolTileUrl(1990))).toBe(LANDSAT_MAXZOOM);
  });

  it('a Landsat vintage loads on the standby with maxzoom capped at Landsat\u2019s native zoom', () => {
    const f = fakeSatelliteMap(['day-night-fill']);
    const state = createSatelliteOverlayState();
    syncSatelliteOverlay(f.map, state, true, { kind: 'latest' });
    syncSatelliteOverlay(f.map, state, true, { kind: 'landsat', year: 1990 });
    expect(isSatelliteOverlayLoadPending(state)).toBe(true);
    vi.advanceTimersByTime(SATELLITE_SETTLE_MS);
    const altSpec = f.sources.get(SATELLITE_ALT_SOURCE_ID)!.spec as any;
    expect(altSpec.tiles).toEqual([landsatProtocolTileUrl(1990)]);
    expect(altSpec.maxzoom).toBe(LANDSAT_MAXZOOM);
    // The displayed Esri source is untouched, as always.
    expect(f.sources.get('satellite-tiles')!.tilesSet).toHaveLength(0);
    expect(handleSatelliteSourceData(f.map, state, SATELLITE_ALT_SOURCE_ID, true)).toBe(true);
    expect(state.tileUrl).toBe(landsatProtocolTileUrl(1990));
  });

  it('switching back to an Esri vintage REBUILDS the standby at maxzoom 18 (it was created for Landsat)', () => {
    const f = fakeSatelliteMap(['day-night-fill']);
    const state = createSatelliteOverlayState();
    syncSatelliteOverlay(f.map, state, true, { kind: 'latest' });
    syncSatelliteOverlay(f.map, state, true, { kind: 'landsat', year: 1990 });
    vi.advanceTimersByTime(SATELLITE_SETTLE_MS);
    expect(handleSatelliteSourceData(f.map, state, SATELLITE_ALT_SOURCE_ID, true)).toBe(true);
    // Now the primary source (holding latest, created at maxzoom
    // 18) is the standby, and the alt (Landsat, 13) is displayed.
    // Pick another Landsat year: the standby was created for the
    // OTHER family, so it is rebuilt at Landsat's maxzoom — while
    // invisible, holding nothing on screen.
    syncSatelliteOverlay(f.map, state, true, { kind: 'landsat', year: 2000 });
    vi.advanceTimersByTime(SATELLITE_SETTLE_MS);
    expect(f.removedSources).toEqual(['satellite-tiles']);
    expect(f.removedLayers).toEqual(['satellite-layer']);
    const primarySpec = f.sources.get('satellite-tiles')!.spec as any;
    expect(primarySpec.maxzoom).toBe(LANDSAT_MAXZOOM);
    expect(primarySpec.tiles).toEqual([landsatProtocolTileUrl(2000)]);
    expect(f.sources.get('satellite-tiles')!.tilesSet).toHaveLength(0);
    expect(handleSatelliteSourceData(f.map, state, 'satellite-tiles', true)).toBe(true);
    expect(state.tileUrl).toBe(landsatProtocolTileUrl(2000));
    // Back to Esri: the standby is now the alt, created at Landsat's
    // maxzoom 13 — it must be rebuilt at 18 before loading.
    syncSatelliteOverlay(f.map, state, true, { kind: 'wayback', release: threeReleases[1] });
    vi.advanceTimersByTime(SATELLITE_SETTLE_MS);
    expect(f.removedSources).toEqual(['satellite-tiles', SATELLITE_ALT_SOURCE_ID]);
    expect(f.removedLayers).toEqual(['satellite-layer', 'satellite-layer-alt']);
    const rebuilt = f.sources.get(SATELLITE_ALT_SOURCE_ID)!.spec as any;
    expect(rebuilt.maxzoom).toBe(ESRI_SOURCE_MAXZOOM);
    expect(rebuilt.tiles).toEqual([waybackTileUrl(12576)]);
    expect(handleSatelliteSourceData(f.map, state, SATELLITE_ALT_SOURCE_ID, true)).toBe(true);
    expect(state.tileUrl).toBe(waybackTileUrl(12576));
  });
});
