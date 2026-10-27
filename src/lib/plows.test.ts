import { describe, it, expect } from 'vitest';
import { normalizeIowaFeature, normalizeIowaFeed, bladeStatus, type IowaAvlFeature } from './plows';

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
