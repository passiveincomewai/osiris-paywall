import { describe, expect, it } from 'vitest';
import type { CountryCamera } from './country-cameras';
import {
  applyScope,
  matchesTheme,
  routeCameraResults,
  sliceExplore,
  sortForExplore,
} from './explore-scopes';

function cam(partial: Partial<CountryCamera> & { id: string }): CountryCamera {
  return { name: partial.id, ...partial } as CountryCamera;
}

describe('matchesTheme', () => {
  it('traffic: matches road names even from a non-road source', () => {
    const c = cam({ id: 'a', name: 'I-5 at MP 159.7: S Rose St', source: 'Some City' });
    expect(matchesTheme(c, 'traffic')).toBe(true);
  });

  it('traffic: matches place-named cameras from road authorities', () => {
    /* The Scandinavian networks name cameras by place, not road — the
       source is what makes them road cameras. */
    expect(
      matchesTheme(cam({ id: 'a', name: 'Ålkistan norra', source: 'Trafikverket' }), 'traffic'),
    ).toBe(true);
    expect(
      matchesTheme(
        cam({ id: 'b', name: 'Aidejavri (E45)', source: 'OpenCCTV / vegvesen' }),
        'traffic',
      ),
    ).toBe(true);
    expect(
      matchesTheme(cam({ id: 'c', name: 'B14 Ansbach - Nürnberg', source: 'OpenCCTV / bayerninfo' }), 'traffic'),
    ).toBe(true);
    expect(
      matchesTheme(cam({ id: 'd', name: 'A-1 km 12.4 (Ascending)', source: 'DGT' }), 'traffic'),
    ).toBe(true);
  });

  it('traffic: rejects river, weather and scenic cameras', () => {
    expect(
      matchesTheme(
        cam({ id: 'a', name: 'Ashiyagawa River, Ashiya', source: 'OpenCCTV / rivergojp' }),
        'traffic',
      ),
    ).toBe(false);
    expect(
      matchesTheme(cam({ id: 'b', name: 'Airport West Windsock', source: 'FAA WeatherCams' }), 'traffic'),
    ).toBe(false);
    expect(
      matchesTheme(cam({ id: 'c', name: 'Chaweng Beach', source: 'SkylineWebcams' }), 'traffic'),
    ).toBe(false);
  });

  it('coast: matches beach/coastal names only', () => {
    expect(matchesTheme(cam({ id: 'a', name: 'Daytona Beach Pier' }), 'coast')).toBe(true);
    expect(matchesTheme(cam({ id: 'b', name: 'Marina Bay Boardwalk' }), 'coast')).toBe(true);
    expect(matchesTheme(cam({ id: 'c', name: 'Downtown Square' }), 'coast')).toBe(false);
  });

  it('airport: matches airport names, not other transport', () => {
    expect(matchesTheme(cam({ id: 'a', name: 'Heathrow Airport North Runway' }), 'airport')).toBe(true);
    expect(matchesTheme(cam({ id: 'b', name: 'Central Station Platform 2' }), 'airport')).toBe(false);
    expect(matchesTheme(cam({ id: 'c', name: 'Ferry Terminal Cam' }), 'airport')).toBe(false);
  });
});

describe('applyScope', () => {
  const records = [
    cam({ id: '1', name: 'Beach Blvd', city: 'Bondi', source: 'City' }),
    cam({ id: '2', name: 'I-90 Bridge', city: 'Seattle', source: 'OpenCCTV / wsdot' }),
    cam({ id: '3', name: 'Beach North', city: 'Bondi ', source: 'City' }),
  ];

  it('filters by exact city, whitespace-normalised', () => {
    expect(applyScope(records, { city: 'Bondi' }).map((r) => r.id)).toEqual(['1', '3']);
  });

  it('filters by theme', () => {
    expect(applyScope(records, { theme: 'coast' }).map((r) => r.id)).toEqual(['1', '3']);
    expect(applyScope(records, { theme: 'traffic' }).map((r) => r.id)).toEqual(['2']);
  });

  it('combines theme and city', () => {
    expect(applyScope(records, { theme: 'traffic', city: 'Bondi' })).toEqual([]);
  });
});

describe('sortForExplore', () => {
  it('country grouping: biggest country first, cities inside', () => {
    const records = [
      cam({ id: '1', name: 'B', country: 'Smalland', city: 'Zed' }),
      cam({ id: '2', name: 'A', country: 'Bigland', city: 'York' }),
      cam({ id: '3', name: 'C', country: 'Bigland', city: 'York' }),
      cam({ id: '4', name: 'D', country: 'Bigland', city: 'Alpha' }),
    ];
    expect(sortForExplore(records, 'country').map((r) => r.id)).toEqual(['4', '2', '3', '1']);
  });
});

describe('sliceExplore', () => {
  it('slices and reports the scoped total, not the catalogue total', () => {
    const records = Array.from({ length: 60 }, (_, i) =>
      cam({
        id: `c${i}`,
        name: i % 2 ? `Beach ${i}` : `Inland ${i}`,
        city: 'Bondi',
        source: 'City',
      }),
    );
    const slice = sliceExplore(records, { theme: 'coast' }, 'city', { offset: 0, limit: 10 });
    expect(slice.total).toBe(30);
    expect(slice.cameras).toHaveLength(10);
    expect(slice.cities).toEqual([{ name: 'Bondi', count: 30 }]);
  });
});

describe('routeCameraResults', () => {
  /* A straight east–west route along the equator, ~11 km long. */
  const coords: [number, number][] = [
    [0, 0],
    [0.1, 0],
  ];
  const feed = 'https://example.com/cam.jpg';

  it('returns corridor cameras as full records, ordered along the route', () => {
    const records = [
      cam({ id: 'far', name: 'Far End', lat: 0, lng: 0.09, feed_url: feed }),
      cam({ id: 'near-start', name: 'Start', lat: 0.0005, lng: 0.01, feed_url: feed }),
      cam({ id: 'off-route', name: 'Elsewhere', lat: 0.05, lng: 0.05, feed_url: feed }),
      cam({ id: 'no-feed', name: 'Listing only', lat: 0, lng: 0.02 }),
    ];
    const out = routeCameraResults(records, coords);
    expect(out.total).toBe(2);
    expect(out.cameras.map((c) => c.id)).toEqual(['near-start', 'far']);
    expect(out.cameras[0].feed_url).toBe(feed);
    expect(out.cameras[0].alongRouteM).toBeLessThan(out.cameras[1].alongRouteM);
    expect(out.corridorM).toBeGreaterThan(0);
  });

  it('caps the rendered list but quotes the full total', () => {
    const records = Array.from({ length: 10 }, (_, i) =>
      cam({ id: `c${i}`, name: `Cam ${i}`, lat: 0, lng: 0.005 + i * 0.01, feed_url: feed }),
    );
    const out = routeCameraResults(records, coords, 3);
    expect(out.total).toBe(10);
    expect(out.cameras).toHaveLength(3);
  });

  it('handles a degenerate route', () => {
    expect(routeCameraResults([], [[0, 0]]).total).toBe(0);
    expect(routeCameraResults([], null).cameras).toEqual([]);
  });
});
