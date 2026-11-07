/**
 * The globe's dark basemap style (lib/basemap-style) — the contracts
 * the rest of the map silently relies on. The style replaced CARTO's
 * hosted Dark Matter style on 2026-11-07 after CARTO's keyless tile
 * access closed and the globe went black in every mode; these tests
 * pin the properties that must not regress:
 *  - the vector source id stays `carto`, so the traffic road network's
 *    {carto, transportation} candidate (OsirisMap) keeps resolving;
 *  - no CARTO host appears anywhere in the style;
 *  - every source-layer the style paints exists in the OpenMapTiles
 *    planet build OpenFreeMap serves (the TileJSON vector_layers list,
 *    verified live 2026-11-07);
 *  - the style keeps a background layer (day mode recolors background
 *    layers generically) and symbol layers (clouds anchor under the
 *    first symbol layer), and carries no sprite dependency.
 */
import { describe, expect, it } from 'vitest';
import { BASEMAP_GLYPHS_URL, BASEMAP_SOURCE_ID, BASEMAP_STYLE, BASEMAP_TILEJSON_URL } from './basemap-style';

/** OpenMapTiles source-layers in OpenFreeMap's planet TileJSON
 *  (GET https://tiles.openfreemap.org/planet, 2026-11-07). */
const OPENMAPTILES_LAYERS = new Set([
  'aerodrome_label', 'aeroway', 'boundary', 'building', 'housenumber',
  'landcover', 'landuse', 'mountain_peak', 'park', 'place', 'poi',
  'transportation', 'transportation_name', 'water', 'water_name', 'waterway',
]);

describe('basemap style — the post-CARTO dark basemap', () => {
  it('is a style-spec v8 object with the OpenFreeMap vector source', () => {
    expect(BASEMAP_STYLE.version).toBe(8);
    const source = BASEMAP_STYLE.sources[BASEMAP_SOURCE_ID] as { type?: string; url?: string };
    expect(source.type).toBe('vector');
    expect(source.url).toBe(BASEMAP_TILEJSON_URL);
    expect(source.url).toBe('https://tiles.openfreemap.org/planet');
  });

  it('keeps the source id the traffic road network looks up', () => {
    expect(BASEMAP_SOURCE_ID).toBe('carto');
    const roadLayers = BASEMAP_STYLE.layers.filter(
      (l) => 'source-layer' in l && (l as { 'source-layer'?: string })['source-layer'] === 'transportation',
    );
    expect(roadLayers.length).toBeGreaterThan(0);
  });

  it('contains no CARTO host anywhere', () => {
    expect(JSON.stringify(BASEMAP_STYLE)).not.toContain('cartocdn');
    expect(JSON.stringify(BASEMAP_STYLE)).not.toContain('carto.com');
  });

  it('glyphs come from OpenFreeMap and there is no sprite dependency', () => {
    expect(BASEMAP_GLYPHS_URL).toBe('https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf');
    expect(BASEMAP_STYLE.glyphs).toBe(BASEMAP_GLYPHS_URL);
    expect('sprite' in BASEMAP_STYLE ? BASEMAP_STYLE.sprite : undefined).toBeUndefined();
  });

  it('every painted layer reads the one source and a real OpenMapTiles layer', () => {
    for (const layer of BASEMAP_STYLE.layers) {
      if (layer.type === 'background') continue;
      const l = layer as { source?: string; 'source-layer'?: string };
      expect(l.source).toBe(BASEMAP_SOURCE_ID);
      expect(OPENMAPTILES_LAYERS.has(l['source-layer'] ?? '')).toBe(true);
    }
  });

  it('keeps a background layer and at least one symbol (label) layer', () => {
    expect(BASEMAP_STYLE.layers.some((l) => l.type === 'background')).toBe(true);
    expect(BASEMAP_STYLE.layers.some((l) => l.type === 'symbol')).toBe(true);
  });

  it('layer ids are unique', () => {
    const ids = BASEMAP_STYLE.layers.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
