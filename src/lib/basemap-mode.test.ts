import { describe, it, expect, vi } from 'vitest';
import {
  readBasemapMode, writeBasemapMode, dayOverlayVisible,
  basemapView, resolvedBasemapMode, terminatorVisible, satelliteSwitchAction,
  readSatelliteView, writeSatelliteView,
  syncDayOverlay, BASEMAP_MODE_STORAGE_KEY, BASEMAP_MODE_ORDER, DAY_TILE_URL,
  SATELLITE_VIEW_STORAGE_KEY,
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
  it('defaults to auto when nothing is stored — the fresh-load default position', () => {
    expect(readBasemapMode(fakeStorage())).toBe('auto');
    expect(readBasemapMode(null)).toBe('auto');
  });

  it('reads back stored day and night choices exactly; only exact values mean them', () => {
    expect(readBasemapMode(fakeStorage({ [BASEMAP_MODE_STORAGE_KEY]: 'day' }))).toBe('day');
    expect(readBasemapMode(fakeStorage({ [BASEMAP_MODE_STORAGE_KEY]: 'night' }))).toBe('night');
    expect(readBasemapMode(fakeStorage({ [BASEMAP_MODE_STORAGE_KEY]: 'auto' }))).toBe('auto');
    expect(readBasemapMode(fakeStorage({ [BASEMAP_MODE_STORAGE_KEY]: 'sepia' }))).toBe('auto');
  });

  it('round-trips every position through storage under the we_ key', () => {
    const s = fakeStorage();
    for (const mode of ['day', 'auto', 'night'] as const) {
      writeBasemapMode(mode, s);
      expect(s.box[BASEMAP_MODE_STORAGE_KEY]).toBe(mode);
      expect(readBasemapMode(s)).toBe(mode);
    }
  });

  it('a throwing storage never breaks the read or the write', () => {
    const hostile = {
      getItem: () => { throw new Error('denied'); },
      setItem: () => { throw new Error('denied'); },
    };
    expect(readBasemapMode(hostile)).toBe('auto');
    expect(() => writeBasemapMode('day', hostile)).not.toThrow();
  });

  it('the switch positions run moon — auto — sun, left to right', () => {
    expect(BASEMAP_MODE_ORDER).toEqual(['night', 'auto', 'day']);
  });
});

describe('satellite view persistence — satellite is the default (owner order 2026-10-31)', () => {
  it('defaults to ON when nothing is stored — the fresh-load default view', () => {
    expect(readSatelliteView(fakeStorage())).toBe(true);
    expect(readSatelliteView(null)).toBe(true);
  });

  it('only an exact stored "off" opens the standard basemap', () => {
    expect(readSatelliteView(fakeStorage({ [SATELLITE_VIEW_STORAGE_KEY]: 'off' }))).toBe(false);
    expect(readSatelliteView(fakeStorage({ [SATELLITE_VIEW_STORAGE_KEY]: 'on' }))).toBe(true);
    expect(readSatelliteView(fakeStorage({ [SATELLITE_VIEW_STORAGE_KEY]: 'sepia' }))).toBe(true);
  });

  it('round-trips through storage under the we_ key', () => {
    const s = fakeStorage();
    writeSatelliteView(false, s);
    expect(s.box[SATELLITE_VIEW_STORAGE_KEY]).toBe('off');
    expect(readSatelliteView(s)).toBe(false);
    writeSatelliteView(true, s);
    expect(s.box[SATELLITE_VIEW_STORAGE_KEY]).toBe('on');
    expect(readSatelliteView(s)).toBe(true);
  });

  it('a throwing storage never breaks the read or the write — and reads as the default (on)', () => {
    const hostile = {
      getItem: () => { throw new Error('denied'); },
      setItem: () => { throw new Error('denied'); },
    };
    expect(readSatelliteView(hostile)).toBe(true);
    expect(() => writeSatelliteView(false, hostile)).not.toThrow();
  });
});

describe('the three positions resolve honestly', () => {
  it('only day resolves to the light basemap; auto and night sit on the dark one', () => {
    expect(resolvedBasemapMode('day')).toBe('day');
    expect(resolvedBasemapMode('auto')).toBe('night');
    expect(resolvedBasemapMode('night')).toBe('night');
  });

  it('auto is the terminator blend: shading on there regardless of the layer toggle', () => {
    expect(terminatorVisible('auto', true)).toBe(true);
    expect(terminatorVisible('auto', false)).toBe(true);
  });

  it('in day and night the Day / Night Cycle layer toggle stays sovereign (pre-switch behaviour)', () => {
    expect(terminatorVisible('day', true)).toBe(true);
    expect(terminatorVisible('day', false)).toBe(false);
    expect(terminatorVisible('night', true)).toBe(true);
    expect(terminatorVisible('night', false)).toBe(false);
  });
});

describe('day × satellite selection', () => {
  it('the day overlay shows only in day mode with satellite off', () => {
    expect(dayOverlayVisible('day', false)).toBe(true);
    expect(dayOverlayVisible('day', true)).toBe(false);   // satellite overrides
    expect(dayOverlayVisible('auto', false)).toBe(false);
    expect(dayOverlayVisible('auto', true)).toBe(false);
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

  it('auto never shows the light overlay — it resolves to the dark basemap', () => {
    const f = fakeMap(['day-night-fill']);
    syncDayOverlay(f.map, 'auto', false);
    expect(f.visibility['day-layer']).toBe('none');
  });
});

describe('the basemap state machine (day/auto/night × satellite)', () => {
  it('the effective view: satellite overrides, otherwise the resolved choice shows', () => {
    expect(basemapView('night', false)).toBe('night');
    expect(basemapView('auto', false)).toBe('night');
    expect(basemapView('day', false)).toBe('day');
    expect(basemapView('night', true)).toBe('satellite');
    expect(basemapView('auto', true)).toBe('satellite');
    expect(basemapView('day', true)).toBe('satellite');
  });

  it('a satellite round-trip returns to the exact choice underneath', () => {
    // On from day → view is satellite; off again → day, not night.
    expect(basemapView('day', true)).toBe('satellite');
    expect(basemapView('day', false)).toBe('day');
    expect(basemapView('auto', true)).toBe('satellite');
    expect(basemapView('auto', false)).toBe('night');
    expect(basemapView('night', true)).toBe('satellite');
    expect(basemapView('night', false)).toBe('night');
    // And the day overlay tracks the same machine.
    expect(dayOverlayVisible('day', true)).toBe(false);
    expect(dayOverlayVisible('day', false)).toBe(true);
  });
});

describe('satelliteSwitchAction — satellite view is free for everyone', () => {
  it('the switch simply toggles, with no lock state at all', () => {
    expect(satelliteSwitchAction(false)).toBe('turn-on');
    expect(satelliteSwitchAction(true)).toBe('turn-off');
  });
});
