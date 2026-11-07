/**
 * OSIRIS — the globe's standard (dark) basemap style.
 *
 * WHY THIS FILE EXISTS (2026-11-07): the base style used to be CARTO's
 * hosted Dark Matter GL style (basemaps.cartocdn.com/gl/dark-matter-gl-style),
 * fetched at map init with every CARTO request routed through
 * /api/proxy-tiles. On 2026-11-07 CARTO's keyless policy finished closing:
 * the production tile proxy began receiving HTTP 403 from CARTO for the
 * vector tiles (direct fetches still worked from some networks, the
 * Vercel-hosted proxy fetch did not), the style's tile pipeline died,
 * map 'load' never completed, and the globe rendered black in EVERY
 * mode — the Esri satellite/day overlays are added only after load, so
 * they never painted either. CARTO raster basemaps had already been
 * keyed on 2025-09-25 (see lib/basemap-mode.ts). There is no keyless
 * host for the Protomaps basemap schema the CARTO style used, so the
 * schema had to change, not just the host.
 *
 * THE REPLACEMENT: our own dark style (this file) over the OpenFreeMap
 * planet vector source — OpenMapTiles schema, keyless, no signup, CORS
 * `access-control-allow-origin: *` (verified 2026-11-07: TileJSON,
 * .pbf tiles at z2/z10/z14, glyph ranges and sprites all fetch 200).
 * Paints mirror the CARTO Dark Matter look (background #0e0e0e, water
 * #2C353C, gray road hierarchy, uppercase place labels); label filters
 * follow the OpenMapTiles conventions proven by the OSM Liberty style
 * served from the same tiles. Landcover/park/landuse fills are
 * deliberately absent: Dark Matter painted them the background colour,
 * i.e. the current look IS uniform land + water + roads + labels.
 *
 * CONTRACTS other code relies on (do not break):
 *  - The vector source id is `carto`. The traffic road network picks
 *    the first existing candidate from [{protomaps/roads},
 *    {carto/transportation}] (OsirisMap) and lib/traffic/roads'
 *    adapter passes OpenMapTiles features (string `class`) straight
 *    through — this source + the `transportation` source-layer is the
 *    pairing that keeps simulated traffic working with no code change.
 *  - The style has a `background` layer (day mode recolors all
 *    background layers generically) and symbol layers (the clouds
 *    layer anchors under the first symbol layer).
 *  - NO sprite: city dots are circle layers, road shields are omitted.
 *    One less external dependency to fail.
 *  - Glyphs are OpenFreeMap's Noto Sans (Regular/Bold/Italic — the
 *    only families it hosts; CARTO's Montserrat is not available
 *    keyless, so place labels render in Noto Sans Bold instead).
 *
 * FETCH PATH: MapLibre fetches the TileJSON, tiles and glyphs DIRECTLY
 * from tiles.openfreemap.org (ACAO:* verified) — the same direct path
 * the Esri satellite/day overlays have always used. They are NOT routed
 * through /api/proxy-tiles: the 2026-11-07 outage was a proxy-hop
 * failure, and the proxy's 1-year Next fetch cache would pin
 * OpenFreeMap's dated TileJSON snapshot path (the TileJSON is a living
 * pointer to planet snapshots; its URL must be re-read, not cached for
 * a year). The proxy allowlist still covers tiles.openfreemap.org, so
 * re-routing is a transformRequest away if ever wanted.
 *
 * Tiles: © OpenStreetMap contributors, © OpenMapTiles, served by
 * OpenFreeMap (attribution rides the TileJSON into the map's
 * attribution control automatically).
 */

import type { ExpressionSpecification, StyleSpecification } from 'maplibre-gl';

/** The basemap vector source id — see the contract note above. */
export const BASEMAP_SOURCE_ID = 'carto';

/** OpenFreeMap planet TileJSON (a living pointer — never hardcode the
 *  dated snapshot tile path it currently resolves to). */
export const BASEMAP_TILEJSON_URL = 'https://tiles.openfreemap.org/planet';

/** OpenFreeMap glyph service (Noto Sans Regular/Bold/Italic). */
export const BASEMAP_GLYPHS_URL = 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf';

/** Name label expression for OpenMapTiles tiles: latin + nonlatin when
 *  both exist, else the English name, else the local name. */
const NAME_FIELD = [
  'case',
  ['has', 'name:nonlatin'],
  ['concat', ['get', 'name:latin'], ' ', ['get', 'name:nonlatin']],
  ['coalesce', ['get', 'name_en'], ['get', 'name']],
] as unknown as ExpressionSpecification;

const FONT_REGULAR = ['Noto Sans Regular'];
const FONT_BOLD = ['Noto Sans Bold'];
const FONT_ITALIC = ['Noto Sans Italic'];

const LABEL_HALO_DARK = '#111';
const WATER_LABEL_COLOR = 'rgba(109, 123, 129, 1)';

export const BASEMAP_STYLE: StyleSpecification = {
  version: 8,
  name: 'WorldEye Dark (OpenFreeMap)',
  glyphs: BASEMAP_GLYPHS_URL,
  sources: {
    [BASEMAP_SOURCE_ID]: {
      type: 'vector',
      url: BASEMAP_TILEJSON_URL,
    },
  },
  layers: [
    {
      id: 'background',
      type: 'background',
      paint: { 'background-color': '#0e0e0e' },
    },
    {
      id: 'water',
      type: 'fill',
      source: BASEMAP_SOURCE_ID,
      'source-layer': 'water',
      filter: ['!=', ['get', 'brunnel'], 'tunnel'],
      paint: { 'fill-color': '#2C353C' },
    },
    {
      id: 'waterway',
      type: 'line',
      source: BASEMAP_SOURCE_ID,
      'source-layer': 'waterway',
      filter: ['!=', ['get', 'brunnel'], 'tunnel'],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': 'rgba(63, 90, 109, 1)',
        'line-width': ['interpolate', ['linear'], ['zoom'], 8, 0.5, 12, 1.2, 15, 2, 16, 3],
      },
    },
    {
      id: 'aeroway-fill',
      type: 'fill',
      source: BASEMAP_SOURCE_ID,
      'source-layer': 'aeroway',
      minzoom: 11,
      filter: ['match', ['geometry-type'], ['MultiPolygon', 'Polygon'], true, false],
      paint: { 'fill-color': '#1c1f26' },
    },
    {
      id: 'aeroway-runway',
      type: 'line',
      source: BASEMAP_SOURCE_ID,
      'source-layer': 'aeroway',
      minzoom: 11,
      filter: [
        'all',
        ['match', ['geometry-type'], ['LineString', 'MultiLineString'], true, false],
        ['==', ['get', 'class'], 'runway'],
      ],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': '#3a3f4a',
        'line-width': ['interpolate', ['linear'], ['zoom'], 11, 1, 15, 6],
      },
    },
    {
      id: 'aeroway-taxiway',
      type: 'line',
      source: BASEMAP_SOURCE_ID,
      'source-layer': 'aeroway',
      minzoom: 13,
      filter: [
        'all',
        ['match', ['geometry-type'], ['LineString', 'MultiLineString'], true, false],
        ['==', ['get', 'class'], 'taxiway'],
      ],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': '#2c3038',
        'line-width': ['interpolate', ['linear'], ['zoom'], 13, 0.5, 16, 3],
      },
    },
    {
      // The wide translucent country line doubles as the coastline
      // glow Dark Matter draws around landmasses.
      id: 'boundary-country-outline',
      type: 'line',
      source: BASEMAP_SOURCE_ID,
      'source-layer': 'boundary',
      minzoom: 6,
      filter: ['==', ['get', 'admin_level'], 2],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': '#2C353C', 'line-opacity': 0.5, 'line-width': 8 },
    },
    {
      id: 'boundary-country',
      type: 'line',
      source: BASEMAP_SOURCE_ID,
      'source-layer': 'boundary',
      filter: ['==', ['get', 'admin_level'], 2],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': '#646668',
        'line-width': ['interpolate', ['linear'], ['zoom'], 3, 1, 6, 1.5, 12, 3],
      },
    },
    {
      id: 'boundary-state',
      type: 'line',
      source: BASEMAP_SOURCE_ID,
      'source-layer': 'boundary',
      minzoom: 4,
      filter: [
        'all',
        ['>=', ['get', 'admin_level'], 3],
        ['<=', ['get', 'admin_level'], 6],
        ['!=', ['get', 'maritime'], 1],
      ],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': 'rgba(103, 103, 114, 1)',
        'line-dasharray': [1, 2, 3],
        'line-width': ['interpolate', ['linear'], ['zoom'], 4, 0.5, 9, 1.2],
      },
    },
    {
      // Tunnels: one dim pass under every surface road (Dark Matter
      // drew them per-class; a single pass reads the same at map zooms).
      id: 'road-tunnel',
      type: 'line',
      source: BASEMAP_SOURCE_ID,
      'source-layer': 'transportation',
      minzoom: 10,
      filter: [
        'all',
        ['==', ['get', 'brunnel'], 'tunnel'],
        ['match', ['get', 'class'], ['motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'minor', 'service', 'track', 'path', 'pedestrian'], true, false],
      ],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': '#262a33',
        'line-opacity': 0.5,
        'line-width': ['interpolate', ['linear'], ['zoom'], 10, 0.5, 15, 3, 18, 8],
      },
    },
    {
      id: 'rail',
      type: 'line',
      source: BASEMAP_SOURCE_ID,
      'source-layer': 'transportation',
      minzoom: 13,
      filter: [
        'all',
        ['match', ['get', 'brunnel'], ['bridge', 'tunnel'], false, true],
        ['match', ['get', 'class'], ['rail', 'transit'], true, false],
      ],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': '#1a1a1a',
        'line-width': ['interpolate', ['linear'], ['zoom'], 13, 0.5, 16, 3],
      },
    },
    {
      id: 'road-path',
      type: 'line',
      source: BASEMAP_SOURCE_ID,
      'source-layer': 'transportation',
      minzoom: 15,
      filter: [
        'all',
        ['match', ['geometry-type'], ['LineString', 'MultiLineString'], true, false],
        ['match', ['get', 'brunnel'], ['bridge', 'tunnel'], false, true],
        ['match', ['get', 'class'], ['path', 'pedestrian', 'track'], true, false],
      ],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': '#262626',
        'line-dasharray': [2, 2],
        'line-width': ['interpolate', ['linear'], ['zoom'], 15, 0.5, 18, 3],
      },
    },
    {
      id: 'road-service-case',
      type: 'line',
      source: BASEMAP_SOURCE_ID,
      'source-layer': 'transportation',
      minzoom: 14,
      filter: [
        'all',
        ['match', ['get', 'brunnel'], ['bridge', 'tunnel'], false, true],
        ['==', ['get', 'class'], 'service'],
      ],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': '#050506',
        'line-width': ['interpolate', ['linear'], ['zoom'], 14, 2, 16, 4.5, 18, 10.5],
      },
    },
    {
      id: 'road-service',
      type: 'line',
      source: BASEMAP_SOURCE_ID,
      'source-layer': 'transportation',
      minzoom: 14,
      filter: [
        'all',
        ['match', ['get', 'brunnel'], ['bridge', 'tunnel'], false, true],
        ['==', ['get', 'class'], 'service'],
      ],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': 'rgba(65, 71, 88, 1)',
        'line-width': ['interpolate', ['linear'], ['zoom'], 14, 1, 16, 3, 18, 9],
      },
    },
    {
      id: 'road-minor-case',
      type: 'line',
      source: BASEMAP_SOURCE_ID,
      'source-layer': 'transportation',
      minzoom: 13,
      filter: [
        'all',
        ['match', ['geometry-type'], ['LineString', 'MultiLineString'], true, false],
        ['match', ['get', 'brunnel'], ['bridge', 'tunnel'], false, true],
        ['==', ['get', 'class'], 'minor'],
        ['!=', ['get', 'ramp'], 1],
      ],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': '#050506',
        'line-width': ['interpolate', ['linear'], ['zoom'], 13, 2, 15, 4.5, 16, 5.5, 18, 13.5],
      },
    },
    {
      id: 'road-minor',
      type: 'line',
      source: BASEMAP_SOURCE_ID,
      'source-layer': 'transportation',
      minzoom: 13,
      filter: [
        'all',
        ['match', ['geometry-type'], ['LineString', 'MultiLineString'], true, false],
        ['match', ['get', 'brunnel'], ['bridge', 'tunnel'], false, true],
        ['==', ['get', 'class'], 'minor'],
      ],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': 'rgba(65, 71, 88, 1)',
        'line-width': ['interpolate', ['linear'], ['zoom'], 13, 1, 15, 3, 16, 4, 18, 12],
      },
    },
    {
      id: 'road-secondary-tertiary-case',
      type: 'line',
      source: BASEMAP_SOURCE_ID,
      'source-layer': 'transportation',
      minzoom: 11,
      filter: [
        'all',
        ['match', ['get', 'brunnel'], ['bridge', 'tunnel'], false, true],
        ['match', ['get', 'class'], ['secondary', 'tertiary'], true, false],
        ['!=', ['get', 'ramp'], 1],
      ],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': '#050506',
        'line-width': ['interpolate', ['linear'], ['zoom'], 11, 3, 13, 3.5, 15, 5.5, 16, 7.5, 18, 15.5],
      },
    },
    {
      id: 'road-secondary-tertiary',
      type: 'line',
      source: BASEMAP_SOURCE_ID,
      'source-layer': 'transportation',
      minzoom: 11,
      filter: [
        'all',
        ['match', ['get', 'brunnel'], ['bridge', 'tunnel'], false, true],
        ['match', ['get', 'class'], ['secondary', 'tertiary'], true, false],
      ],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': 'rgba(65, 71, 88, 1)',
        'line-width': ['interpolate', ['linear'], ['zoom'], 11, 1.5, 13, 2, 15, 4, 16, 6, 18, 14],
      },
    },
    {
      id: 'road-primary-case',
      type: 'line',
      source: BASEMAP_SOURCE_ID,
      'source-layer': 'transportation',
      minzoom: 9,
      filter: [
        'all',
        ['match', ['get', 'brunnel'], ['bridge', 'tunnel'], false, true],
        ['==', ['get', 'class'], 'primary'],
      ],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': '#050506',
        'line-width': ['interpolate', ['linear'], ['zoom'], 9, 2, 13, 3.5, 14, 5.5, 16, 9.5, 18, 17.5],
      },
    },
    {
      id: 'road-primary',
      type: 'line',
      source: BASEMAP_SOURCE_ID,
      'source-layer': 'transportation',
      minzoom: 9,
      filter: [
        'all',
        ['match', ['get', 'brunnel'], ['bridge', 'tunnel'], false, true],
        ['==', ['get', 'class'], 'primary'],
      ],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': 'rgba(83, 86, 102, 1)',
        'line-width': ['interpolate', ['linear'], ['zoom'], 9, 0.5, 13, 2, 14, 4, 16, 8, 18, 16],
      },
    },
    {
      id: 'road-trunk-case',
      type: 'line',
      source: BASEMAP_SOURCE_ID,
      'source-layer': 'transportation',
      minzoom: 6,
      filter: [
        'all',
        ['match', ['get', 'brunnel'], ['bridge', 'tunnel'], false, true],
        ['==', ['get', 'class'], 'trunk'],
      ],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': '#050506',
        'line-width': ['interpolate', ['linear'], ['zoom'], 6, 2, 10, 3, 14, 6.5, 16, 10.5, 18, 19.5],
      },
    },
    {
      id: 'road-trunk',
      type: 'line',
      source: BASEMAP_SOURCE_ID,
      'source-layer': 'transportation',
      minzoom: 6,
      filter: [
        'all',
        ['match', ['get', 'brunnel'], ['bridge', 'tunnel'], false, true],
        ['==', ['get', 'class'], 'trunk'],
      ],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': 'rgba(83, 86, 102, 1)',
        'line-width': ['interpolate', ['linear'], ['zoom'], 6, 0.5, 10, 1.5, 14, 5, 16, 9, 18, 18],
      },
    },
    {
      id: 'road-motorway-case',
      type: 'line',
      source: BASEMAP_SOURCE_ID,
      'source-layer': 'transportation',
      minzoom: 5,
      filter: [
        'all',
        ['match', ['get', 'brunnel'], ['bridge', 'tunnel'], false, true],
        ['==', ['get', 'class'], 'motorway'],
      ],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': '#050506',
        'line-width': ['interpolate', ['linear'], ['zoom'], 5, 2, 10, 3.5, 14, 7.5, 16, 11.5, 18, 21.5],
      },
    },
    {
      id: 'road-motorway',
      type: 'line',
      source: BASEMAP_SOURCE_ID,
      'source-layer': 'transportation',
      minzoom: 5,
      filter: [
        'all',
        ['match', ['get', 'brunnel'], ['bridge', 'tunnel'], false, true],
        ['==', ['get', 'class'], 'motorway'],
      ],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': 'rgba(96, 99, 115, 1)',
        'line-width': ['interpolate', ['linear'], ['zoom'], 5, 0.5, 10, 2, 14, 6, 16, 10, 18, 20],
      },
    },
    {
      // Dark Matter's building-top: quiet gray slabs fading in over
      // z14–16 with a background-coloured outline.
      id: 'building',
      type: 'fill',
      source: BASEMAP_SOURCE_ID,
      'source-layer': 'building',
      minzoom: 14,
      paint: {
        'fill-color': 'rgba(57, 57, 57, 1)',
        'fill-opacity': ['interpolate', ['linear'], ['zoom'], 14, 0, 16, 1],
        'fill-outline-color': '#0e0e0e',
      },
    },
    {
      id: 'water-name-point',
      type: 'symbol',
      source: BASEMAP_SOURCE_ID,
      'source-layer': 'water_name',
      filter: ['match', ['geometry-type'], ['MultiPoint', 'Point'], true, false],
      layout: {
        'text-field': NAME_FIELD,
        'text-font': FONT_ITALIC,
        'text-letter-spacing': 0.1,
        'text-max-width': 6,
        'text-size': ['interpolate', ['linear'], ['zoom'], 0, 12, 4, 17],
      },
      paint: {
        'text-color': WATER_LABEL_COLOR,
        'text-halo-color': 'rgba(0, 0, 0, 0.7)',
        'text-halo-width': 1,
      },
    },
    {
      id: 'water-name-line',
      type: 'symbol',
      source: BASEMAP_SOURCE_ID,
      'source-layer': 'water_name',
      filter: ['match', ['geometry-type'], ['LineString', 'MultiLineString'], true, false],
      layout: {
        'symbol-placement': 'line',
        'symbol-spacing': 350,
        'text-field': NAME_FIELD,
        'text-font': FONT_ITALIC,
        'text-letter-spacing': 0.1,
        'text-max-width': 5,
        'text-size': 13,
      },
      paint: {
        'text-color': WATER_LABEL_COLOR,
        'text-halo-color': 'rgba(0, 0, 0, 0.7)',
        'text-halo-width': 1,
      },
    },
    {
      id: 'waterway-label',
      type: 'symbol',
      source: BASEMAP_SOURCE_ID,
      'source-layer': 'waterway',
      minzoom: 12,
      filter: ['match', ['geometry-type'], ['LineString', 'MultiLineString'], true, false],
      layout: {
        'symbol-placement': 'line',
        'symbol-spacing': 350,
        'text-field': NAME_FIELD,
        'text-font': FONT_ITALIC,
        'text-size': 10,
      },
      paint: {
        'text-color': 'rgba(109, 123, 129, 0.9)',
        'text-halo-color': 'rgba(0, 0, 0, 0.7)',
        'text-halo-width': 1,
      },
    },
    {
      id: 'road-label-major',
      type: 'symbol',
      source: BASEMAP_SOURCE_ID,
      'source-layer': 'transportation_name',
      minzoom: 11,
      filter: [
        'all',
        ['match', ['geometry-type'], ['LineString', 'MultiLineString'], true, false],
        ['match', ['get', 'class'], ['motorway', 'trunk', 'primary'], true, false],
      ],
      layout: {
        'symbol-placement': 'line',
        'text-field': NAME_FIELD,
        'text-font': FONT_REGULAR,
        'text-size': ['interpolate', ['linear'], ['zoom'], 12, 10, 15, 12],
      },
      paint: {
        'text-color': 'rgba(181, 180, 180, 1)',
        'text-halo-color': LABEL_HALO_DARK,
        'text-halo-width': 1,
      },
    },
    {
      id: 'road-label-medium',
      type: 'symbol',
      source: BASEMAP_SOURCE_ID,
      'source-layer': 'transportation_name',
      minzoom: 13,
      filter: [
        'all',
        ['match', ['geometry-type'], ['LineString', 'MultiLineString'], true, false],
        ['match', ['get', 'class'], ['secondary', 'tertiary'], true, false],
      ],
      layout: {
        'symbol-placement': 'line',
        'text-field': NAME_FIELD,
        'text-font': FONT_REGULAR,
        'text-size': ['interpolate', ['linear'], ['zoom'], 13, 10, 16, 12],
      },
      paint: {
        'text-color': 'rgba(181, 180, 180, 1)',
        'text-halo-color': LABEL_HALO_DARK,
        'text-halo-width': 1,
      },
    },
    {
      id: 'road-label-minor',
      type: 'symbol',
      source: BASEMAP_SOURCE_ID,
      'source-layer': 'transportation_name',
      minzoom: 15,
      filter: [
        'all',
        ['match', ['geometry-type'], ['LineString', 'MultiLineString'], true, false],
        ['match', ['get', 'class'], ['minor', 'service'], true, false],
      ],
      layout: {
        'symbol-placement': 'line',
        'text-field': NAME_FIELD,
        'text-font': FONT_REGULAR,
        'text-size': ['interpolate', ['linear'], ['zoom'], 15, 9.5, 17, 11],
      },
      paint: {
        'text-color': 'rgba(181, 180, 180, 1)',
        'text-halo-color': LABEL_HALO_DARK,
        'text-halo-width': 1,
      },
    },
    {
      id: 'road-label-path',
      type: 'symbol',
      source: BASEMAP_SOURCE_ID,
      'source-layer': 'transportation_name',
      minzoom: 15.5,
      filter: ['==', ['get', 'class'], 'path'],
      layout: {
        'symbol-placement': 'line',
        'text-field': NAME_FIELD,
        'text-font': FONT_REGULAR,
        'text-size': 10,
      },
      paint: {
        'text-color': 'rgba(160, 160, 160, 1)',
        'text-halo-color': LABEL_HALO_DARK,
        'text-halo-width': 1,
      },
    },
    {
      // City/town dots: Dark Matter used sprite dots; circles are the
      // same mark with no sprite dependency. They fade out as street
      // zooms take over.
      id: 'place-city-dot',
      type: 'circle',
      source: BASEMAP_SOURCE_ID,
      'source-layer': 'place',
      minzoom: 3,
      maxzoom: 10,
      filter: ['==', ['get', 'class'], 'city'],
      paint: {
        'circle-radius': ['interpolate', ['exponential', 1.2], ['zoom'], 3, 1.5, 7, 2.5, 10, 3.5],
        'circle-color': '#9aa4a8',
        'circle-stroke-color': '#0e0e0e',
        'circle-stroke-width': 1,
        'circle-opacity': ['interpolate', ['linear'], ['zoom'], 8, 1, 10, 0],
      },
    },
    {
      id: 'place-town-dot',
      type: 'circle',
      source: BASEMAP_SOURCE_ID,
      'source-layer': 'place',
      minzoom: 6,
      maxzoom: 10,
      filter: ['==', ['get', 'class'], 'town'],
      paint: {
        'circle-radius': ['interpolate', ['exponential', 1.2], ['zoom'], 6, 1.2, 10, 2.5],
        'circle-color': '#8a9296',
        'circle-stroke-color': '#0e0e0e',
        'circle-stroke-width': 1,
        'circle-opacity': ['interpolate', ['linear'], ['zoom'], 8.5, 1, 10, 0],
      },
    },
    {
      id: 'place-continent',
      type: 'symbol',
      source: BASEMAP_SOURCE_ID,
      'source-layer': 'place',
      maxzoom: 4,
      filter: ['==', ['get', 'class'], 'continent'],
      layout: {
        'text-field': NAME_FIELD,
        'text-font': FONT_BOLD,
        'text-transform': 'uppercase',
        'text-letter-spacing': 0.15,
        'text-max-width': 9,
        'text-size': ['interpolate', ['linear'], ['zoom'], 0, 11, 3, 14],
      },
      paint: {
        'text-color': 'rgba(120, 141, 147, 1)',
        'text-halo-color': LABEL_HALO_DARK,
        'text-halo-width': 1,
      },
    },
    {
      id: 'place-country',
      type: 'symbol',
      source: BASEMAP_SOURCE_ID,
      'source-layer': 'place',
      maxzoom: 8,
      filter: ['==', ['get', 'class'], 'country'],
      layout: {
        'text-field': NAME_FIELD,
        'text-font': FONT_BOLD,
        'text-transform': 'uppercase',
        'text-max-width': 9,
        'text-size': ['interpolate', ['linear'], ['zoom'], 1, 10, 4, 13, 7, 16],
        'symbol-sort-key': ['coalesce', ['get', 'rank'], 99],
      },
      paint: {
        'text-color': 'rgba(135, 152, 160, 1)',
        'text-halo-color': LABEL_HALO_DARK,
        'text-halo-width': 1,
      },
    },
    {
      id: 'place-state',
      type: 'symbol',
      source: BASEMAP_SOURCE_ID,
      'source-layer': 'place',
      minzoom: 4,
      maxzoom: 8,
      filter: ['==', ['get', 'class'], 'state'],
      layout: {
        'text-field': NAME_FIELD,
        'text-font': FONT_REGULAR,
        'text-transform': 'uppercase',
        'text-letter-spacing': 0.15,
        'text-max-width': 9,
        'text-size': ['interpolate', ['linear'], ['zoom'], 4, 10, 8, 14],
      },
      paint: {
        'text-color': 'rgba(160, 175, 180, 1)',
        'text-halo-color': LABEL_HALO_DARK,
        'text-halo-width': 1,
      },
    },
    {
      id: 'place-city-capital',
      type: 'symbol',
      source: BASEMAP_SOURCE_ID,
      'source-layer': 'place',
      filter: ['all', ['==', ['get', 'class'], 'city'], ['==', ['get', 'capital'], 2]],
      layout: {
        'text-field': NAME_FIELD,
        'text-font': FONT_BOLD,
        'text-transform': 'uppercase',
        'text-max-width': 10,
        'text-size': ['interpolate', ['exponential', 1.2], ['zoom'], 4, 12, 7, 14, 11, 20],
        'symbol-sort-key': ['coalesce', ['get', 'rank'], 99],
      },
      paint: {
        'text-color': 'rgba(190, 198, 202, 1)',
        'text-halo-color': '#222',
        'text-halo-width': 1,
      },
    },
    {
      id: 'place-city',
      type: 'symbol',
      source: BASEMAP_SOURCE_ID,
      'source-layer': 'place',
      filter: ['all', ['==', ['get', 'class'], 'city'], ['!=', ['get', 'capital'], 2]],
      layout: {
        'text-field': NAME_FIELD,
        'text-font': FONT_REGULAR,
        'text-transform': 'uppercase',
        'text-max-width': 10,
        'text-size': ['interpolate', ['exponential', 1.2], ['zoom'], 4, 11, 7, 13, 11, 18],
        'symbol-sort-key': ['coalesce', ['get', 'rank'], 99],
      },
      paint: {
        'text-color': 'rgba(168, 176, 180, 1)',
        'text-halo-color': '#222',
        'text-halo-width': 1,
      },
    },
    {
      id: 'place-town',
      type: 'symbol',
      source: BASEMAP_SOURCE_ID,
      'source-layer': 'place',
      minzoom: 6,
      filter: ['==', ['get', 'class'], 'town'],
      layout: {
        'text-field': NAME_FIELD,
        'text-font': FONT_REGULAR,
        'text-transform': 'uppercase',
        'text-max-width': 9,
        'text-size': ['interpolate', ['exponential', 1.2], ['zoom'], 7, 11, 11, 14],
      },
      paint: {
        'text-color': 'rgba(150, 156, 160, 1)',
        'text-halo-color': '#222',
        'text-halo-width': 1,
      },
    },
    {
      id: 'place-village',
      type: 'symbol',
      source: BASEMAP_SOURCE_ID,
      'source-layer': 'place',
      minzoom: 9,
      filter: ['==', ['get', 'class'], 'village'],
      layout: {
        'text-field': NAME_FIELD,
        'text-font': FONT_REGULAR,
        'text-max-width': 8,
        'text-size': ['interpolate', ['exponential', 1.2], ['zoom'], 9, 10, 12, 12],
      },
      paint: {
        'text-color': 'rgba(140, 146, 150, 1)',
        'text-halo-color': '#222',
        'text-halo-width': 1,
      },
    },
    {
      id: 'place-suburb',
      type: 'symbol',
      source: BASEMAP_SOURCE_ID,
      'source-layer': 'place',
      minzoom: 11,
      filter: ['match', ['get', 'class'], ['suburb', 'hamlet', 'neighbourhood', 'quarter'], true, false],
      layout: {
        'text-field': NAME_FIELD,
        'text-font': FONT_REGULAR,
        'text-max-width': 8,
        'text-size': ['interpolate', ['linear'], ['zoom'], 11, 10, 14, 13],
      },
      paint: {
        'text-color': 'rgba(130, 136, 140, 1)',
        'text-halo-color': '#222',
        'text-halo-width': 1,
      },
    },
  ],
};
