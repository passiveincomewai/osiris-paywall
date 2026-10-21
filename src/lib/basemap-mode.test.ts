import { describe, it, expect, vi } from 'vitest';
import {
  readBasemapMode, writeBasemapMode, nextBasemapMode, dayOverlayVisible,
  basemapView, satelliteSwitchAction,
  syncDayOverlay, BASEMAP_MODE_STORAGE_KEY, DAY_TILE_URL,
  type DayOverlayMap,
} from './basemap-mode';

function fakeStorage(initial: Record<string, string> = {}) {
  const box = { ...initial };
  return {
    box,
    getItem: (k: string) => (k in box ? box[k] : null),
    setItem: (k: string, v: string) => { box[k] = v; },
  };
}

describe('basemap mode persistence', () => {
  it('defaults to night when nothing is stored', () => {
    expect(readBasemapMode(fakeStorage())).toBe('night');
    expect(readBasemapMode(null)).toBe('night');
  });

  it('reads back a stored day choice, and only day means day', () => {
    expect(readBasemapMode(fakeStorage({ [BASEMAP_MODE_STORAGE_KEY]: 'day' }))).toBe('day');
    expect(readBasemapMode(fakeStorage({ [BASEMAP_MODE_STORAGE_KEY]: 'night' }))).toBe('night');
    expect(readBasemapMode(fakeStorage({ [BASEMAP_MODE_STORAGE_KEY]: 'sepia' }))).toBe('night');
  });

  it('round-trips through storage under the we_ key', () => {
    const s = fakeStorage();
    writeBasemapMode('day', s);
    expect(s.box[BASEMAP_MODE_STORAGE_KEY]).toBe('day');
    expect(readBasemapMode(s)).toBe('day');
    writeBasemapMode('night', s);
    expect(readBasemapMode(s)).toBe('night');
  });

  it('a throwing storage never breaks the read or the write', () => {
    const hostile = {
      getItem: () => { throw new Error('denied'); },
      setItem: () => { throw new Error('denied'); },
    };
    expect(readBasemapMode(hostile)).toBe('night');
    expect(() => writeBasemapMode('day', hostile)).not.toThrow();
  });

  it('toggles night → day → night', () => {
    expect(nextBasemapMode('night')).toBe('day');
    expect(nextBasemapMode('day')).toBe('night');
  });
});

describe('day × satellite selection', () => {
  it('the day overlay shows only in day mode with satellite off', () => {
    expect(dayOverlayVisible('day', false)).toBe(true);
    expect(dayOverlayVisible('day', true)).toBe(false);   // satellite overrides
    expect(dayOverlayVisible('night', false)).toBe(false);
    expect(dayOverlayVisible('night', true)).toBe(false);
  });

  it('the day tiles are the keyless Esri street basemap — never a CARTO raster endpoint', () => {
    // Regression guard for the 2026-10-20 live bug: CARTO stopped
    // serving its raster basemaps keyless on 2026-09-25 — every
    // light_all request returns an "API KEY REQUIRED" placeholder tile,
    // which filled the map whenever the day layer showed (and when
    // satellite view was toggled off over it). The day overlay must
    // stay on the keyless Esri World Street Map service the satellite
    // view's imagery already proves out.
    expect(DAY_TILE_URL).toBe('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}');
    expect(DAY_TILE_URL).not.toContain('cartocdn.com');
    expect(DAY_TILE_URL).not.toContain('light_all');
  });
});

function fakeMap(existing: string[] = []) {
  const sources = new Set<string>();
  const sourceSpecs: Record<string, any> = {};
  const layers = new Set(existing);
  const added: Array<{ layer: any; beforeId?: string }> = [];
  const visibility: Record<string, unknown> = {};
  const map: DayOverlayMap = {
    getSource: (id) => (sources.has(id) ? {} : undefined),
    addSource: (id, spec) => { sources.add(id); sourceSpecs[id] = spec; },
    getLayer: (id) => (layers.has(id) ? {} : undefined),
    addLayer: (layer: any, beforeId?: string) => { layers.add(layer.id); added.push({ layer, beforeId }); },
    setLayoutProperty: (id, _name, value) => { visibility[id] = value; },
  };
  return { map, added, visibility, sources, layers, sourceSpecs };
}

describe('syncDayOverlay — the satellite path’s overlay pattern', () => {
  it('creates the source + layer once, under the terminator anchor', () => {
    const f = fakeMap(['day-night-fill']);
    syncDayOverlay(f.map, 'day', false);
    syncDayOverlay(f.map, 'day', false);
    expect(f.added).toHaveLength(1);
    expect(f.added[0].layer.id).toBe('day-layer');
    expect(f.added[0].layer.source).toBe('day-tiles');
    expect(f.added[0].beforeId).toBe('day-night-fill');
    expect(f.visibility['day-layer']).toBe('visible');
  });

  it('the day source spec carries the Esri street tiles + attribution', () => {
    const f = fakeMap(['day-night-fill']);
    syncDayOverlay(f.map, 'day', false);
    expect(f.sourceSpecs['day-tiles'].type).toBe('raster');
    expect(f.sourceSpecs['day-tiles'].tiles).toEqual([DAY_TILE_URL]);
    expect(f.sourceSpecs['day-tiles'].attribution).toContain('Esri');
  });

  it('stacks under the satellite layer when it already exists', () => {
    const f = fakeMap(['day-night-fill', 'satellite-layer']);
    syncDayOverlay(f.map, 'day', false);
    expect(f.added[0].beforeId).toBe('satellite-layer');
  });

  it('satellite on hides the day layer; satellite off restores the choice', () => {
    const f = fakeMap(['day-night-fill']);
    syncDayOverlay(f.map, 'day', false);
    expect(f.visibility['day-layer']).toBe('visible');
    syncDayOverlay(f.map, 'day', true);
    expect(f.visibility['day-layer']).toBe('none');
    syncDayOverlay(f.map, 'day', false);
    expect(f.visibility['day-layer']).toBe('visible');
    syncDayOverlay(f.map, 'night', false);
    expect(f.visibility['day-layer']).toBe('none');
  });
});

describe('the three-way basemap state machine (day/night × satellite)', () => {
  it('the effective view: satellite overrides, otherwise the persisted choice shows', () => {
    expect(basemapView('night', false)).toBe('night');
    expect(basemapView('day', false)).toBe('day');
    expect(basemapView('night', true)).toBe('satellite');
    expect(basemapView('day', true)).toBe('satellite');
  });

  it('a satellite round-trip returns to the exact day/night choice underneath', () => {
    // On from day → view is satellite; off again → day, not night.
    expect(basemapView('day', true)).toBe('satellite');
    expect(basemapView('day', false)).toBe('day');
    expect(basemapView('night', true)).toBe('satellite');
    expect(basemapView('night', false)).toBe('night');
    // And the day overlay tracks the same machine.
    expect(dayOverlayVisible('day', true)).toBe(false);
    expect(dayOverlayVisible('day', false)).toBe(true);
  });
});

describe('satelliteSwitchAction — the Pro gate on the switch', () => {
  it('Pro users toggle freely', () => {
    expect(satelliteSwitchAction(false, false)).toBe('turn-on');
    expect(satelliteSwitchAction(false, true)).toBe('turn-off');
  });

  it('a locked user hitting the switch gets the TrialPicker, never the view', () => {
    expect(satelliteSwitchAction(true, false)).toBe('show-trial-picker');
  });

  it('turning satellite OFF is always allowed — nobody is trapped in the view', () => {
    expect(satelliteSwitchAction(true, true)).toBe('turn-off');
  });
});
