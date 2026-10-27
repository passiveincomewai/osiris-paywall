import { describe, it, expect, vi } from 'vitest';
import {
  normalizeIowaFeature, normalizeIowaFeed, bladeStatus, type IowaAvlFeature,
  normalizeUtahFeature, normalizeUtahFeed, utahRecencyCutoffLiteral, type UtahAvlFeature,
  normalizeVermontVehicle, normalizeVermontFeed, parseVermontTimestamp, type VermontVehicle,
  getPlows, getPlowFeedStatus,
} from './plows';
import { clearSourceCache } from './sourceCache';

// The first three features of a live pull from the Iowa DOT AVL
// FeatureServer, taken 2026-10-27T00:04:48Z (48 trucks reporting).
// The fields the normalizer reads, values verbatim — tested against
// what the feed really sends, including its 9999 "no data" blade-state
// sentinel.
const liveFeatures: IowaAvlFeature[] = [
  {
    "type": "Feature",
    "geometry": {
      "type": "Point",
      "coordinates": [
        -94.426886,
        43.385251
      ]
    },
    "properties": {
      "OBJECTID": 2,
      "LABEL": "A31332",
      "XPOSITION": -94.426886,
      "YPOSITION": 43.385251,
      "HEADING": 89,
      "VELOCITY": 55.296,
      "FRONTPLOWSTATE": 9999,
      "RIGHTWINGPLOWSTATE": 9999,
      "LEFTWINGPLOWSTATE": 9999,
      "UNDERBELLYPLOWSTATE": 9999,
      "MODIFIEDDT": 1793026261513
    }
  },
  {
    "type": "Feature",
    "geometry": {
      "type": "Point",
      "coordinates": [
        -94.02683,
        42.029689
      ]
    },
    "properties": {
      "OBJECTID": 3,
      "LABEL": "A31831",
      "XPOSITION": -94.02683,
      "YPOSITION": 42.029689,
      "HEADING": 269,
      "VELOCITY": 67.734,
      "FRONTPLOWSTATE": 9999,
      "RIGHTWINGPLOWSTATE": 9999,
      "LEFTWINGPLOWSTATE": 9999,
      "UNDERBELLYPLOWSTATE": 9999,
      "MODIFIEDDT": 1793026258513
    }
  },
  {
    "type": "Feature",
    "geometry": {
      "type": "Point",
      "coordinates": [
        -91.953378,
        42.847323
      ]
    },
    "properties": {
      "OBJECTID": 4,
      "LABEL": "A32823",
      "XPOSITION": -91.953378,
      "YPOSITION": 42.847323,
      "HEADING": 90,
      "VELOCITY": 9.931,
      "FRONTPLOWSTATE": 9999,
      "RIGHTWINGPLOWSTATE": 9999,
      "LEFTWINGPLOWSTATE": 9999,
      "UNDERBELLYPLOWSTATE": 9999,
      "MODIFIEDDT": 1793026256513
    }
  }
];

describe('normalizeIowaFeed (live fixture)', () => {
  it('maps every live feature to a placeable plow', () => {
    const plows = normalizeIowaFeed({ features: liveFeatures });
    expect(plows.length).toBe(liveFeatures.length);
    for (const p of plows) {
      expect(p.agency).toBe('Iowa DOT');
      expect(p.lat).toBeGreaterThan(40.2);
      expect(p.lat).toBeLessThan(43.7);
      expect(p.lng).toBeGreaterThan(-96.9);
      expect(p.lng).toBeLessThan(-89.9);
      expect(Number.isNaN(Date.parse(p.updatedAt))).toBe(false);
    }
  });

  it('carries label, heading and rounded speed from the first live truck', () => {
    const first = liveFeatures[0];
    const p = normalizeIowaFeature(first)!;
    expect(p).not.toBeNull();
    expect(p.id).toBe(`iowa-${first.properties!.LABEL}`);
    expect(p.label).toBe(first.properties!.LABEL!);
    expect(p.heading).toBe(first.properties!.HEADING);
    expect(p.speed).toBe(Math.round(first.properties!.VELOCITY!));
    // updatedAt is MODIFIEDDT (the UTC ping time), as an ISO string.
    expect(p.updatedAt).toBe(new Date(first.properties!.MODIFIEDDT!).toISOString());
  });

  it('omits status when every blade state is the 9999 no-data sentinel', () => {
    // True of all 48 trucks in the live pull (no storm in progress).
    for (const f of liveFeatures) {
      expect(normalizeIowaFeature(f)!.status).toBeUndefined();
    }
  });
});

describe('bladeStatus', () => {
  const base = liveFeatures[0].properties!;
  it('reads a down front blade as Plowing', () => {
    expect(bladeStatus({ ...base, FRONTPLOWSTATE: 1 })).toBe('Plowing');
  });
  it('reads a down wing blade as Plowing even with the front blade up', () => {
    expect(bladeStatus({ ...base, FRONTPLOWSTATE: 0, LEFTWINGPLOWSTATE: 1 })).toBe('Plowing');
  });
  it('reads all-up real readings as Blade up', () => {
    expect(bladeStatus({ ...base, FRONTPLOWSTATE: 0, RIGHTWINGPLOWSTATE: 0, LEFTWINGPLOWSTATE: 9999, UNDERBELLYPLOWSTATE: null })).toBe('Blade up');
  });
  it('says nothing when no blade reports a real reading', () => {
    expect(bladeStatus({ ...base, FRONTPLOWSTATE: 9999, RIGHTWINGPLOWSTATE: null, LEFTWINGPLOWSTATE: null, UNDERBELLYPLOWSTATE: 9999 })).toBeUndefined();
  });
});

describe('normalizeIowaFeature (rejections)', () => {
  const good = liveFeatures[0];
  it('drops a feature with no geometry and no X/Y position', () => {
    expect(normalizeIowaFeature({ properties: { ...good.properties, XPOSITION: null, YPOSITION: null }, geometry: null })).toBeNull();
  });
  it('falls back to XPOSITION/YPOSITION when geometry is absent', () => {
    const p = normalizeIowaFeature({ properties: good.properties, geometry: null });
    expect(p).not.toBeNull();
    expect(p!.lng).toBe(good.properties!.XPOSITION);
    expect(p!.lat).toBe(good.properties!.YPOSITION);
  });
  it('drops a feature geocoded outside Iowa', () => {
    expect(normalizeIowaFeature({ properties: good.properties, geometry: { type: 'Point', coordinates: [-0.1276, 51.5074] } })).toBeNull();
  });
  it('drops a feature with no ping time — a position without a time is not a live claim', () => {
    expect(normalizeIowaFeature({ ...good, properties: { ...good.properties, MODIFIEDDT: null } })).toBeNull();
  });
  it('de-duplicates repeated trucks in one feed', () => {
    expect(normalizeIowaFeed({ features: [good, good] }).length).toBe(1);
  });
});

/* ── Utah DOT — SnowPlow_AVL_Public ──────────────────────────────── */

// Feature 601 of probe/utah-sample.geojson (UDOT SnowPlow_AVL_Public,
// pulled 2026-10-27), fields verbatim — including the layer's
// driver-name fields, which the adapter must never surface.
const UTAH_TS = 1793062872000; // 2026-10-27T04:41:12Z per the probe sample
const utahRawFeature = {
  type: 'Feature',
  geometry: { type: 'Point', coordinates: [-111.895431, 40.574364] },
  properties: {
    vehicleid: '02-22004',
    heading: 128,
    speedmph: 0.621371,
    location_timestamp: UTAH_TS,
    // Present in the real layer: driver first names live in
    // `vehiclefleet` / `username`. They are not in the adapter's
    // outFields and must not survive mapping even if a row carries them.
    vehiclefleet: 'FO22004 - ALAN',
    username: ' ',
    servicetype: 'Moving',
    locationsource: '150 W Alta View Way, Sandy, UT 84070, USA',
  },
};
const utahFeature = utahRawFeature as unknown as UtahAvlFeature;
const FRESH = UTAH_TS + 30 * 60 * 1000; // 30 min after the ping — inside the window

describe('normalizeUtahFeature (probe fixture)', () => {
  it('maps a fresh row: vehicleid is both id and label, agency is Utah DOT', () => {
    const p = normalizeUtahFeature(utahFeature, FRESH)!;
    expect(p).not.toBeNull();
    expect(p.id).toBe('utah-02-22004');
    expect(p.label).toBe('02-22004');
    expect(p.agency).toBe('Utah DOT');
    expect(p.lat).toBe(40.574364);
    expect(p.lng).toBe(-111.895431);
    expect(p.heading).toBe(128);
    expect(p.speed).toBe(Math.round(0.621371));
    expect(p.updatedAt).toBe(new Date(UTAH_TS).toISOString());
  });

  it('never maps a status — servicetype is a motion state, not a blade state', () => {
    expect(normalizeUtahFeature(utahFeature, FRESH)!.status).toBeUndefined();
  });

  it('PRIVACY: no driver-name field survives mapping', () => {
    const p = normalizeUtahFeature(utahFeature, FRESH)!;
    const json = JSON.stringify(p);
    expect(json).not.toContain('ALAN');
    expect(json).not.toContain('FO22004');
    expect(json).not.toContain('Alta View');
    expect(Object.keys(p).sort()).toEqual(
      ['agency', 'heading', 'id', 'label', 'lat', 'lng', 'speed', 'updatedAt'].sort(),
    );
  });
});

describe('normalizeUtahFeature (recency + rejections)', () => {
  it('keeps a ping 59 minutes old, drops one 61 minutes old (60-min window)', () => {
    expect(normalizeUtahFeature(utahFeature, UTAH_TS + 59 * 60 * 1000)).not.toBeNull();
    expect(normalizeUtahFeature(utahFeature, UTAH_TS + 61 * 60 * 1000)).toBeNull();
  });

  it('drops the probe row at real-world now — it is a last-known position, not live', () => {
    // The whole 906-row table at probe time: freshest ping 38 min old,
    // most rows days old. A day later, nothing from it may render.
    expect(normalizeUtahFeature(utahFeature, UTAH_TS + 24 * 60 * 60 * 1000)).toBeNull();
  });

  it('drops a row with no ping time', () => {
    const f = { ...utahFeature, properties: { ...utahFeature.properties, location_timestamp: null } };
    expect(normalizeUtahFeature(f, FRESH)).toBeNull();
  });

  it('drops a row with no vehicleid — no fallback to the driver-name fields', () => {
    const f = { ...utahFeature, properties: { ...utahFeature.properties, vehicleid: null } };
    expect(normalizeUtahFeature(f, FRESH)).toBeNull();
  });

  it('drops a row geocoded outside Utah', () => {
    const f = { ...utahFeature, geometry: { type: 'Point', coordinates: [-0.1276, 51.5074] as [number, number] } };
    expect(normalizeUtahFeature(f, FRESH)).toBeNull();
  });

  it('normalizeUtahFeed keeps the fresh rows and drops the stale ones in a mixed pull', () => {
    const stale = {
      ...utahFeature,
      properties: { ...utahFeature.properties, vehicleid: '02-99999', location_timestamp: UTAH_TS - 3 * 60 * 60 * 1000 },
    };
    const plows = normalizeUtahFeed({ features: [utahFeature, stale] }, FRESH);
    expect(plows.map(p => p.id)).toEqual(['utah-02-22004']);
  });

  it('de-duplicates repeated trucks in one feed', () => {
    expect(normalizeUtahFeed({ features: [utahFeature, utahFeature] }, FRESH).length).toBe(1);
  });
});

describe('utahRecencyCutoffLiteral', () => {
  it('renders the cutoff as a UTC TIMESTAMP literal one window before now', () => {
    expect(utahRecencyCutoffLiteral(Date.UTC(2026, 9, 27, 12, 0, 0))).toBe('2026-10-27 11:00:00');
  });
});

/* ── Vermont AOT — Plow Finder vehicle JSON ──────────────────────── */

// The first vehicles of probe/vt-vehicles.json (236 trucks, pulled
// 2026-10-27; the file itself is the fleet's January snapshot). Coord
// triples verbatim: [lat, lng, "M/D/YYYY h:mm:ss AM"], newest first.
const woodfordSands: VermontVehicle = {
  id: 'Woodford Sands',
  name: '16188',
  heading: '64',
  coords: [
    ['42.8895226', '-73.1867676', '1/8/2026 7:20:25 AM'],
    ['42.8855286', '-73.0759201', '1/7/2026 12:50:22 AM'],
  ],
};
const wolfpack: VermontVehicle = {
  id: 'Wolfpack',
  name: '16238',
  heading: '190',
  coords: [
    ['44.0032272', '-73.1601944', '1/7/2026 2:02:20 PM'],
    ['44.0003586', '-73.1599579', '1/7/2026 3:47:17 AM'],
  ],
};
// "1/8/2026 7:20:25 AM" in America/New_York (EST, UTC-5 in January).
const WOODFORD_LATEST_UTC = Date.UTC(2026, 0, 8, 12, 20, 25);

describe('parseVermontTimestamp', () => {
  it('converts a winter (EST) wall time to UTC', () => {
    expect(parseVermontTimestamp('1/8/2026 7:20:25 AM')).toBe(WOODFORD_LATEST_UTC);
  });
  it('converts a summer (EDT) wall time to UTC', () => {
    expect(parseVermontTimestamp('7/8/2026 7:20:25 AM')).toBe(Date.UTC(2026, 6, 8, 11, 20, 25));
  });
  it('handles PM and the 12 AM / 12 PM edges', () => {
    expect(parseVermontTimestamp('1/7/2026 2:02:20 PM')).toBe(Date.UTC(2026, 0, 7, 19, 2, 20));
    expect(parseVermontTimestamp('1/8/2026 12:00:00 AM')).toBe(Date.UTC(2026, 0, 8, 5, 0, 0));
    expect(parseVermontTimestamp('1/8/2026 12:00:00 PM')).toBe(Date.UTC(2026, 0, 8, 17, 0, 0));
  });
  it('rejects garbage and non-strings', () => {
    expect(parseVermontTimestamp('not a date')).toBeNull();
    expect(parseVermontTimestamp('2026-01-08T07:20:25Z')).toBeNull();
    expect(parseVermontTimestamp(null)).toBeNull();
    expect(parseVermontTimestamp(1793062872000)).toBeNull();
  });
});

describe('normalizeVermontVehicle (probe fixture)', () => {
  const fresh = WOODFORD_LATEST_UTC + 45 * 60 * 1000; // 45 min after the latest ping

  it('maps the latest position only: public name is the label, truck number the id', () => {
    const p = normalizeVermontVehicle(woodfordSands, fresh)!;
    expect(p).not.toBeNull();
    expect(p.id).toBe('vermont-16188');
    expect(p.label).toBe('Woodford Sands');
    expect(p.agency).toBe('Vermont AOT');
    expect(p.lat).toBe(42.8895226);
    expect(p.lng).toBe(-73.1867676);
    expect(p.heading).toBe(64);
    expect(p.updatedAt).toBe(new Date(WOODFORD_LATEST_UTC).toISOString());
    // No speed or status in the file — none is inferred.
    expect(p.speed).toBeUndefined();
    expect(p.status).toBeUndefined();
  });

  it('SLIMMING: no trail point beyond coords[0] reaches the plow shape', () => {
    const p = normalizeVermontVehicle(woodfordSands, fresh)!;
    const json = JSON.stringify(p);
    expect(json).not.toContain('42.8855286'); // second trail point
    expect(json).not.toContain('-73.0759201'); // second trail point
    expect(Object.keys(p).sort()).toEqual(
      ['agency', 'heading', 'id', 'label', 'lat', 'lng', 'updatedAt'].sort(),
    );
  });

  it('drops a truck whose newest ping is past the 90-minute gate', () => {
    expect(normalizeVermontVehicle(woodfordSands, WOODFORD_LATEST_UTC + 91 * 60 * 1000)).toBeNull();
    expect(normalizeVermontVehicle(woodfordSands, WOODFORD_LATEST_UTC + 89 * 60 * 1000)).not.toBeNull();
  });

  it('the dormant January file normalizes to an empty layer in October', () => {
    const october = Date.UTC(2026, 9, 27, 1, 20, 0);
    expect(normalizeVermontFeed([woodfordSands, wolfpack], october)).toEqual([]);
  });

  it('drops vehicles with no trail, no truck number, or an unparseable ping', () => {
    expect(normalizeVermontVehicle({ ...woodfordSands, coords: [] }, fresh)).toBeNull();
    expect(normalizeVermontVehicle({ ...woodfordSands, name: null }, fresh)).toBeNull();
    const badTime: VermontVehicle = {
      ...woodfordSands,
      coords: [['42.8895226', '-73.1867676', 'yesterday-ish']],
    };
    expect(normalizeVermontVehicle(badTime, fresh)).toBeNull();
  });

  it('de-duplicates repeated trucks in one file', () => {
    expect(normalizeVermontFeed([woodfordSands, woodfordSands], fresh).length).toBe(1);
  });
});

/* ── Aggregation: per-source failure isolation ───────────────────── */

describe('getPlows (per-source failure isolation)', () => {
  it('keeps the healthy states when one feed is down, and says so in the status', async () => {
    // 30 minutes after Woodford Sands' latest ping — Vermont is fresh,
    // and the Iowa fixture is re-pinged to "now" as well.
    const fixedNow = WOODFORD_LATEST_UTC + 30 * 60 * 1000;
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(fixedNow);
    clearSourceCache();
    const iowaFc = {
      features: [{
        ...liveFeatures[0],
        properties: { ...liveFeatures[0].properties, MODIFIEDDT: fixedNow - 5 * 60 * 1000 },
      }],
    };
    const fetchStub = vi.fn(async (url: unknown) => {
      const u = String(url);
      if (u.includes('AVL_Direct_View')) return { ok: true, status: 200, json: async () => iowaFc };
      if (u.includes('SnowPlow_AVL_Public')) return { ok: false, status: 503, json: async () => ({}) };
      if (u.includes('vehicleJSON')) return { ok: true, status: 200, json: async () => [woodfordSands] };
      throw new Error(`unexpected fetch: ${u}`);
    });
    vi.stubGlobal('fetch', fetchStub);
    try {
      const plows = await getPlows();
      expect(plows.map(p => p.id).sort()).toEqual(['iowa-A31332', 'vermont-16188']);
      // Utah's outage is reported honestly: the combined set is incomplete.
      expect(getPlowFeedStatus().ok).toBe(false);
    } finally {
      vi.unstubAllGlobals();
      nowSpy.mockRestore();
      clearSourceCache();
    }
  });
});
