import { describe, expect, it } from 'vitest';
import {
  incidentSlug,
  isPageWorthyIncident,
  perimeterBbox,
  perimeterCentroid,
  toIncidents,
  type FirePerimeterFeature,
} from './fire-perimeters';

/**
 * WFIGS page-identity rules. The fixtures are shaped exactly like
 * the live feed's simplified GeoJSON (verified against the real
 * service on 2026-10-28: 107 features, fields poly_IncidentName /
 * attr_PercentContained / poly_GISAcres / attr_POOState /
 * poly_PolygonDateTime after the lib's mapping). No network: the
 * feed itself is the route's and pages' runtime concern; what is
 * pinned here is that a name in the feed becomes exactly one
 * addressable page identity, deterministically.
 */

function feature(
  name: string,
  state: string,
  geometry: unknown,
  extra: Partial<FirePerimeterFeature['properties']> = {},
): FirePerimeterFeature {
  return {
    type: 'Feature',
    geometry,
    properties: { name, acres: 100, contained: 50, state, updated: null, ...extra },
  };
}

const SQUARE = {
  type: 'Polygon',
  coordinates: [
    [
      [-105.0, 40.0],
      [-104.0, 40.0],
      [-104.0, 41.0],
      [-105.0, 41.0],
      [-105.0, 40.0],
    ],
  ],
};

const TWO_POLYS = {
  type: 'MultiPolygon',
  coordinates: [
    [
      [
        [-106.0, 39.0],
        [-105.9, 39.0],
        [-105.9, 39.1],
        [-106.0, 39.1],
        [-106.0, 39.0],
      ],
    ],
    [
      [
        [-104.5, 40.5],
        [-104.0, 40.5],
        [-104.0, 41.0],
        [-104.5, 41.0],
        [-104.5, 40.5],
      ],
    ],
  ],
};

describe('incidentSlug', () => {
  it('slugifies the feed name + state', () => {
    expect(incidentSlug('Aspen Acres', 'CO')).toBe('aspen-acres-co');
    expect(incidentSlug('Shell', 'FL')).toBe('shell-fl');
    expect(incidentSlug('Upper Smith', 'ID')).toBe('upper-smith-id');
  });

  it('folds punctuation and diacritics instead of dropping the name', () => {
    expect(incidentSlug("Devil's Head", 'CO')).toBe('devil-s-head-co');
    expect(incidentSlug('Peña Blanca', 'NM')).toBe('pena-blanca-nm');
  });

  it('omits the state suffix when the feed has no state', () => {
    expect(incidentSlug('Unknown incident', '')).toBe('unknown-incident');
  });
});

describe('toIncidents', () => {
  it('assigns unique slugs, suffixing collisions in feed order', () => {
    const out = toIncidents([
      feature('Elk', 'CO', SQUARE),
      feature('Elk', 'CO', TWO_POLYS),
      feature('Elk', 'OR', SQUARE),
    ]);
    expect(out.map((i) => i.slug)).toEqual(['elk-co', 'elk-co-2', 'elk-or']);
  });

  it('computes centroid + bbox from the geometry', () => {
    const [one] = toIncidents([feature('Square', 'CO', SQUARE)]);
    expect(one.centroid).toEqual({ lat: 40.4, lng: -104.6 });
    expect(one.bbox).toEqual({ minLat: 40, maxLat: 41, minLng: -105, maxLng: -104 });
  });

  it('takes the centroid from the largest polygon of a MultiPolygon', () => {
    const c = perimeterCentroid(TWO_POLYS);
    // Second polygon's ring has the same vertex count (5) — the
    // first largest wins ties; either way the point must sit inside
    // one of the two real polygons, never in empty space between.
    expect(c).not.toBeNull();
    const inside =
      (c!.lng >= -106 && c!.lng <= -105.9 && c!.lat >= 39 && c!.lat <= 39.1) ||
      (c!.lng >= -104.5 && c!.lng <= -104 && c!.lat >= 40.5 && c!.lat <= 41);
    expect(inside).toBe(true);
    expect(perimeterBbox(TWO_POLYS)).toEqual({
      minLat: 39,
      maxLat: 41,
      minLng: -106,
      maxLng: -104,
    });
  });

  it('returns nulls, not inventions, for missing geometry', () => {
    expect(perimeterCentroid(null)).toBeNull();
    expect(perimeterBbox(undefined)).toBeNull();
    const [one] = toIncidents([feature('Ghost', 'XX', null)]);
    expect(one.centroid).toBeNull();
    expect(one.slug).toBe('ghost-xx');
  });

  describe('page-worthiness thresholds (R39)', () => {
    const NOW = new Date('2026-10-31T00:00:00Z');
    const iso = (daysAgo: number) =>
      new Date(NOW.getTime() - daysAgo * 86_400_000).toISOString();

    it('keeps a material, current fire', () => {
      const f = feature('Big', 'CO', SQUARE, { acres: 500, updated: iso(2) });
      expect(isPageWorthyIncident(f, NOW)).toBe(true);
      expect(toIncidents([f], NOW)).toHaveLength(1);
    });

    it('drops sub-threshold and unknown-acreage fires', () => {
      expect(
        isPageWorthyIncident(feature('Spot', 'WI', SQUARE, { acres: 0 }), NOW),
      ).toBe(false);
      expect(
        isPageWorthyIncident(feature('Tiny', 'WI', SQUARE, { acres: 9 }), NOW),
      ).toBe(false);
      expect(
        isPageWorthyIncident(
          feature('Mystery', 'WI', SQUARE, { acres: null }),
          NOW,
        ),
      ).toBe(false);
      expect(
        isPageWorthyIncident(feature('Edge', 'WI', SQUARE, { acres: 10 }), NOW),
      ).toBe(true);
    });

    it('drops a fire whose perimeter stopped moving over 21 days ago', () => {
      const stale = feature('Old', 'CA', SQUARE, { acres: 800, updated: iso(95) });
      expect(isPageWorthyIncident(stale, NOW)).toBe(false);
      const fresh = feature('Old', 'CA', SQUARE, { acres: 800, updated: iso(21) });
      expect(isPageWorthyIncident(fresh, NOW)).toBe(true);
    });

    it('judges a fire with no perimeter date on acreage alone', () => {
      const f = feature('NoDate', 'TX', SQUARE, { acres: 42, updated: null });
      expect(isPageWorthyIncident(f, NOW)).toBe(true);
    });

    it('toIncidents filters before slug assignment', () => {
      const out = toIncidents(
        [
          feature('Spot', 'WI', SQUARE, { acres: 0 }),
          feature('Real', 'WI', SQUARE, { acres: 120 }),
        ],
        NOW,
      );
      expect(out.map((i) => i.slug)).toEqual(['real-wi']);
    });
  });
});
