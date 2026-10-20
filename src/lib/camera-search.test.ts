import { describe, expect, it } from 'vitest';
import {
  applyCameraFilters,
  cameraFiltersActive,
  canonicalCountry,
  countryFacets,
  EMPTY_CAMERA_FILTERS,
  matchCameras,
  searchFiltersAccess,
  type SearchableCamera,
} from './camera-search';

/**
 * Fixtures in the shapes the catalogue actually serves: curated sources
 * spell the country out ("Japan"), harvest/FAA sources use ISO alpha-2
 * ("US", "CA"); the type signal is stream_type/URLs, and no record
 * anywhere carries a status or scene-category field.
 */
const CAMERAS: SearchableCamera[] = [
  // Curated baseline: video, Japan (name form)
  {
    id: 'jp-shibuya', name: 'Shibuya Crossing', city: 'Tokyo', country: 'Japan',
    lat: 35.6595, lng: 139.7005, stream_url: 'https://example.com/shibuya.m3u8', stream_type: 'hls', source: 'World Live',
  },
  // Curated baseline: snapshot via feed_url, United States (name form)
  {
    id: 'us-yellowstone', name: 'Old Faithful Geyser', city: 'Yellowstone', country: 'United States',
    lat: 44.4605, lng: -110.8281, feed_url: 'https://example.com/of.jpg', source: 'NPS',
  },
  // Harvest: same country as above, ISO spelling; snapshot
  {
    id: 'occ-utah-001', name: 'I-15 @ 9000 S', city: 'Sandy', country: 'US',
    lat: 40.59, lng: -111.9, feed_url: 'https://example.com/i15.jpg', source: 'OpenCCTV / udot',
  },
  // Harvest: Canada by ISO code; video
  {
    id: 'occ-alberta-002', name: 'Riverfront Avenue / 1 Street SE', city: 'Calgary', country: 'CA',
    lat: 51.05, lng: -114.06, stream_url: 'https://example.com/cgy.m3u8', stream_type: 'hls', source: 'OpenCCTV / alberta',
  },
  // FAA-style: Canada by name; snapshot
  {
    id: 'faa-991', name: 'Birchwood — Camera 2 (East)', city: 'Birchwood', country: 'Canada',
    lat: 61.41, lng: -149.51, feed_url: '/api/cctv/faa-image/faa-991', stream_type: 'jpg', source: 'FAA WeatherCams',
  },
  // Embed (YouTube iframe), Japan
  {
    id: 'jp-kyoto-yt', name: 'Kyoto Station Live', city: 'Kyoto', country: 'Japan',
    lat: 34.985, lng: 135.758, stream_url: 'https://www.youtube.com/embed/abc123', stream_type: 'iframe', source: 'Skyline',
  },
  // Listing only: no feed of its own → media kind 'link', Japan
  {
    id: 'jp-listing', name: 'Mount Fuji Viewpoint', city: 'Fujiyoshida', country: 'Japan',
    lat: 35.487, lng: 138.808, external_url: 'https://example.com/listing', source: 'Directory',
  },
];

const ids = (cams: SearchableCamera[]) => cams.map((c) => c.id);

describe('canonicalCountry', () => {
  it('passes full names through', () => {
    expect(canonicalCountry('Japan')).toEqual({ key: 'japan', label: 'Japan' });
    expect(canonicalCountry('  South   Korea ')).toEqual({ key: 'south korea', label: 'South Korea' });
  });

  it('expands ISO alpha-2 codes to the name other sources use', () => {
    expect(canonicalCountry('US')).toEqual({ key: 'united states', label: 'United States' });
    expect(canonicalCountry('CA')).toEqual({ key: 'canada', label: 'Canada' });
    expect(canonicalCountry('JP')).toEqual({ key: 'japan', label: 'Japan' });
    expect(canonicalCountry('UK')).toEqual({ key: 'united kingdom', label: 'United Kingdom' });
  });

  it('returns null for an empty value', () => {
    expect(canonicalCountry('')).toBeNull();
    expect(canonicalCountry(undefined)).toBeNull();
    expect(canonicalCountry(null)).toBeNull();
  });
});

describe('countryFacets', () => {
  it('unifies the code and name spellings of one country', () => {
    const facets = countryFacets(CAMERAS);
    const byKey = Object.fromEntries(facets.map((f) => [f.key, f]));
    expect(byKey['united states']).toEqual({ key: 'united states', label: 'United States', count: 2 });
    expect(byKey['canada']).toEqual({ key: 'canada', label: 'Canada', count: 2 });
    expect(byKey['japan']).toEqual({ key: 'japan', label: 'Japan', count: 3 });
  });

  it('sorts biggest first', () => {
    const facets = countryFacets(CAMERAS);
    expect(facets[0].key).toBe('japan');
    expect(facets.map((f) => f.count)).toEqual([...facets.map((f) => f.count)].sort((a, b) => b - a));
  });
});

describe('matchCameras (basic search)', () => {
  it('matches name, city, country and source', () => {
    expect(ids(matchCameras(CAMERAS, 'shibuya'))).toEqual(['jp-shibuya']);
    expect(ids(matchCameras(CAMERAS, 'calgary'))).toEqual(['occ-alberta-002']);
    expect(ids(matchCameras(CAMERAS, 'canada'))).toEqual(expect.arrayContaining(['occ-alberta-002', 'faa-991']));
    expect(ids(matchCameras(CAMERAS, 'japan'))).toEqual(
      expect.arrayContaining(['jp-shibuya', 'jp-kyoto-yt', 'jp-listing']),
    );
  });

  it('ranks a name prefix above a name mention above a city match', () => {
    const ranked = matchCameras(
      [
        { id: 'city', name: 'Harbor Rd', city: 'Yorktown', country: 'US', lat: 0, lng: 0 },
        { id: 'contains', name: 'New York Diner Cam', city: 'Albany', country: 'US', lat: 0, lng: 0 },
        { id: 'prefix', name: 'York Minster', city: 'York', country: 'UK', lat: 0, lng: 0 },
      ],
      'york',
    );
    expect(ids(ranked)).toEqual(['prefix', 'contains', 'city']);
  });

  it('needs at least two characters', () => {
    expect(matchCameras(CAMERAS, 'j')).toEqual([]);
    expect(matchCameras(CAMERAS, '')).toEqual([]);
  });
});

describe('searchFiltersAccess', () => {
  it('mirrors the product-wide definition of Pro', () => {
    expect(searchFiltersAccess({ user: { subscriptionStatus: 'active' } })).toBe('pro');
    expect(searchFiltersAccess({ user: { subscriptionStatus: 'canceled' } })).toBe('free');
    expect(searchFiltersAccess({ user: {} })).toBe('free');
    expect(searchFiltersAccess({})).toBe('signed-out');
    expect(searchFiltersAccess(null)).toBe('unknown');
    expect(searchFiltersAccess('garbage')).toBe('unknown');
  });
});

describe('applyCameraFilters — the gate', () => {
  const japanOnly = { ...EMPTY_CAMERA_FILTERS, countryKey: 'japan' };

  it('is inert for everyone who is not Pro, however the state is set', () => {
    for (const access of ['free', 'signed-out', 'unknown'] as const) {
      expect(ids(applyCameraFilters(CAMERAS, japanOnly, access))).toEqual(ids(CAMERAS));
    }
  });

  it('passes everything through for Pro with no filters set', () => {
    expect(ids(applyCameraFilters(CAMERAS, EMPTY_CAMERA_FILTERS, 'pro'))).toEqual(ids(CAMERAS));
    expect(cameraFiltersActive(EMPTY_CAMERA_FILTERS)).toBe(false);
    expect(cameraFiltersActive(japanOnly)).toBe(true);
  });
});

describe('applyCameraFilters — filtering for Pro', () => {
  it('country: keeps one country across both spellings', () => {
    const us = applyCameraFilters(CAMERAS, { ...EMPTY_CAMERA_FILTERS, countryKey: 'united states' }, 'pro');
    expect(ids(us).sort()).toEqual(['occ-utah-001', 'us-yellowstone']);
    const jp = applyCameraFilters(CAMERAS, { ...EMPTY_CAMERA_FILTERS, countryKey: 'japan' }, 'pro');
    expect(ids(jp).sort()).toEqual(['jp-kyoto-yt', 'jp-listing', 'jp-shibuya']);
  });

  it('type: keeps one media kind', () => {
    const video = applyCameraFilters(CAMERAS, { ...EMPTY_CAMERA_FILTERS, kind: 'video' }, 'pro');
    expect(ids(video).sort()).toEqual(['jp-shibuya', 'occ-alberta-002']);
    const snapshot = applyCameraFilters(CAMERAS, { ...EMPTY_CAMERA_FILTERS, kind: 'snapshot' }, 'pro');
    expect(ids(snapshot).sort()).toEqual(['faa-991', 'occ-utah-001', 'us-yellowstone']);
    const embed = applyCameraFilters(CAMERAS, { ...EMPTY_CAMERA_FILTERS, kind: 'embed' }, 'pro');
    expect(ids(embed)).toEqual(['jp-kyoto-yt']);
    const link = applyCameraFilters(CAMERAS, { ...EMPTY_CAMERA_FILTERS, kind: 'link' }, 'pro');
    expect(ids(link)).toEqual(['jp-listing']);
  });

  it('live-only: drops listing-only records, keeps every feed carrier', () => {
    const live = applyCameraFilters(CAMERAS, { ...EMPTY_CAMERA_FILTERS, liveOnly: true }, 'pro');
    expect(ids(live)).not.toContain('jp-listing');
    expect(live).toHaveLength(CAMERAS.length - 1);
  });

  it('combines country + type + live-only', () => {
    const out = applyCameraFilters(
      CAMERAS,
      { countryKey: 'japan', kind: 'video', liveOnly: true },
      'pro',
    );
    expect(ids(out)).toEqual(['jp-shibuya']);
  });
});
