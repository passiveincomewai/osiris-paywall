import { describe, expect, it } from 'vitest';
import {
  cameraAreas,
  cameraMediaKind,
  canonicalCountryName,
  COUNTRY_CAMERA_EXPLORERS,
  countrySlug,
  dedupeCountryCameras,
  filterCameras,
  selectCountryCameras,
  sortForCountryPage,
  youtubePosterUrl,
  type CountryCamera,
} from './country-cameras';

const thailand = COUNTRY_CAMERA_EXPLORERS.thailand;

const cam = (partial: Partial<CountryCamera> & { id: string }): CountryCamera => ({
  name: partial.id,
  country: 'Thailand',
  ...partial,
});

describe('selectCountryCameras', () => {
  it('keeps only records for the configured country, aliases included', () => {
    const out = selectCountryCameras(
      [
        cam({ id: 'a', country: 'Thailand' }),
        cam({ id: 'b', country: 'TH' }),
        cam({ id: 'c', country: ' thailand ' }),
        cam({ id: 'd', country: 'Vietnam' }),
        cam({ id: 'e', country: '' }),
      ],
      thailand,
    );
    expect(out.map(c => c.id)).toEqual(['a', 'b', 'c']);
  });

  it('dedupes by id when regions overlap', () => {
    const out = selectCountryCameras(
      [cam({ id: 'a', name: 'One' }), cam({ id: 'a', name: 'One again' }), cam({ id: 'b' })],
      thailand,
    );
    expect(out).toHaveLength(2);
    expect(out.find(c => c.id === 'a')?.name).toBe('One');
  });

  it('drops near-duplicates: same camera, punctuation-variant name, same spot', () => {
    const out = selectCountryCameras(
      [
        cam({ id: 'a', name: 'Chaweng - Soi Green Mango', lat: 9.5317, lng: 100.0609 }),
        cam({ id: 'b', name: 'Chaweng — Soi Green Mango', lat: 9.53175, lng: 100.06095 }),
      ],
      thailand,
    );
    expect(out.map(c => c.id)).toEqual(['a']);
  });

  it('keeps same-name cameras at genuinely different locations', () => {
    const out = selectCountryCameras(
      [
        cam({ id: 'a', name: 'Beach Road', lat: 9.5317, lng: 100.0609 }),
        cam({ id: 'b', name: 'Beach Road', lat: 9.6317, lng: 100.1609 }),
      ],
      thailand,
    );
    expect(out.map(c => c.id)).toEqual(['a', 'b']);
  });

  it('keeps same-name records when coordinates are missing (id dedupe only)', () => {
    const out = selectCountryCameras(
      [
        cam({ id: 'a', name: 'Chaweng - Soi Green Mango' }),
        cam({ id: 'b', name: 'Chaweng — Soi Green Mango', lat: 9.5317, lng: 100.0609 }),
        cam({ id: 'c', name: 'Chaweng — Soi Green Mango' }),
      ],
      thailand,
    );
    expect(out.map(c => c.id)).toEqual(['a', 'b', 'c']);
  });

  it('keeps different cameras that merely share a location', () => {
    const out = selectCountryCameras(
      [
        cam({ id: 'a', name: 'Pier North', lat: 9.5317, lng: 100.0609 }),
        cam({ id: 'b', name: 'Pier South', lat: 9.5317, lng: 100.0609 }),
      ],
      thailand,
    );
    expect(out.map(c => c.id)).toEqual(['a', 'b']);
  });

  it('sorts by city, then name', () => {
    const out = selectCountryCameras(
      [
        cam({ id: '1', city: 'Pattaya', name: 'B' }),
        cam({ id: '2', city: 'Bangkok', name: 'Z' }),
        cam({ id: '3', city: 'Bangkok', name: 'A' }),
      ],
      thailand,
    );
    expect(out.map(c => c.id)).toEqual(['3', '2', '1']);
  });
});

describe('cameraAreas', () => {
  it('counts real city values only, biggest first', () => {
    const areas = cameraAreas([
      cam({ id: '1', city: 'Ko Samui' }),
      cam({ id: '2', city: 'Ko Samui' }),
      cam({ id: '3', city: 'Bangkok' }),
      cam({ id: '4', city: '  ' }),
      cam({ id: '5' }),
    ]);
    expect(areas).toEqual([
      { name: 'Ko Samui', count: 2 },
      { name: 'Bangkok', count: 1 },
    ]);
  });
});

describe('filterCameras', () => {
  const cams = [
    cam({ id: '1', name: 'Chaweng Beach', city: 'Ko Samui', source: 'SkylineWebcams' }),
    cam({ id: '2', name: 'Sukhumvit Road', city: 'Bangkok', source: 'OpenCCTV' }),
    cam({ id: '3', name: 'Crystal Bay', city: 'Ko Samui', source: 'The Real Samui Webcam' }),
  ];

  it('filters by area', () => {
    expect(filterCameras(cams, { area: 'Ko Samui' }).map(c => c.id)).toEqual(['1', '3']);
  });

  it('searches name, city and source, case-insensitively', () => {
    expect(filterCameras(cams, { query: 'sukhumvit' }).map(c => c.id)).toEqual(['2']);
    expect(filterCameras(cams, { query: 'SAMUI' }).map(c => c.id)).toEqual(['1', '3']);
    expect(filterCameras(cams, { query: 'skyline' }).map(c => c.id)).toEqual(['1']);
  });

  it('combines area and query', () => {
    expect(filterCameras(cams, { area: 'Ko Samui', query: 'crystal' }).map(c => c.id)).toEqual(['3']);
    expect(filterCameras(cams, { area: 'Bangkok', query: 'crystal' })).toEqual([]);
  });
});

describe('cameraMediaKind', () => {
  it('classifies the playback forms the catalogue carries', () => {
    expect(cameraMediaKind(cam({ id: '1', stream_url: 'https://x/y.m3u8', stream_type: 'hls' }))).toBe('video');
    expect(cameraMediaKind(cam({ id: '2', stream_url: 'https://x/clip.mp4', stream_type: 'mp4' }))).toBe('video');
    expect(cameraMediaKind(cam({ id: '3', feed_url: 'https://x/still.jpg' }))).toBe('snapshot');
    expect(
      cameraMediaKind(cam({ id: '4', stream_url: 'https://www.youtube.com/embed/abc', stream_type: 'iframe' })),
    ).toBe('embed');
    expect(cameraMediaKind(cam({ id: '5', external_url: 'https://example.com/cam' }))).toBe('link');
  });

  it('infers a kind for untyped stream urls', () => {
    expect(cameraMediaKind(cam({ id: '1', stream_url: 'https://x/y.m3u8?token=1' }))).toBe('video');
    expect(cameraMediaKind(cam({ id: '2', stream_url: 'https://www.youtube.com/embed/abc123' }))).toBe('embed');
  });
});

describe('youtubePosterUrl', () => {
  it('builds a poster for embeds that name a video', () => {
    expect(
      youtubePosterUrl(cam({ id: '1', stream_url: 'https://www.youtube.com/embed/UemFRPrl1hk?autoplay=1&mute=1' })),
    ).toBe('https://i.ytimg.com/vi/UemFRPrl1hk/hqdefault.jpg');
  });

  it('returns null when no video is named', () => {
    expect(youtubePosterUrl(cam({ id: '1', external_url: 'https://www.youtube.com/@chan/live' }))).toBeNull();
    expect(youtubePosterUrl(cam({ id: '2', stream_url: 'https://x/y.m3u8' }))).toBeNull();
  });
});

describe('canonicalCountryName', () => {
  it('merges the Thailand name and its TH code (the load-bearing alias)', () => {
    expect(canonicalCountryName('Thailand')).toBe('Thailand');
    expect(canonicalCountryName('TH')).toBe('Thailand');
    expect(canonicalCountryName(' TH ')).toBe('Thailand');
  });

  it('merges code and name spellings of the same country', () => {
    expect(canonicalCountryName('US')).toBe('United States');
    expect(canonicalCountryName('United States')).toBe('United States');
    expect(canonicalCountryName('GB')).toBe('United Kingdom');
    expect(canonicalCountryName('UK')).toBe('United Kingdom');
    expect(canonicalCountryName('CA')).toBe('Canada');
    expect(canonicalCountryName('Canada')).toBe('Canada');
  });

  it('returns null for values that name no country', () => {
    expect(canonicalCountryName('XX')).toBeNull();
    expect(canonicalCountryName('Middle East')).toBeNull();
    expect(canonicalCountryName('Unknown')).toBeNull();
    expect(canonicalCountryName('')).toBeNull();
    expect(canonicalCountryName(undefined)).toBeNull();
  });

  it('lets an unmapped real value stand as its own country', () => {
    expect(canonicalCountryName('Freedonia')).toBe('Freedonia');
  });
});

describe('countrySlug', () => {
  it('slugifies like the other generated tiers', () => {
    expect(countrySlug('United States')).toBe('united-states');
    expect(countrySlug('South Korea')).toBe('south-korea');
    expect(countrySlug('Curaçao')).toBe('curacao');
    expect(countrySlug('US Virgin Islands')).toBe('us-virgin-islands');
  });
});

describe('dedupeCountryCameras', () => {
  it('dedupes by id, first record wins', () => {
    const out = dedupeCountryCameras([
      cam({ id: 'a', name: 'One' }),
      cam({ id: 'a', name: 'One again' }),
      cam({ id: 'b', name: 'Two' }),
    ]);
    expect(out.map(c => c.id)).toEqual(['a', 'b']);
    expect(out[0].name).toBe('One');
  });

  it('drops near-duplicates across the whole list, not just neighbours', () => {
    const out = dedupeCountryCameras([
      cam({ id: 'a', name: 'Beach Rd — Cam', lat: 9.7, lng: 100.0 }),
      cam({ id: 'x', name: 'Unrelated', lat: 13.7, lng: 100.5 }),
      cam({ id: 'b', name: 'Beach Rd - Cam', lat: 9.7005, lng: 100.0002 }),
    ]);
    expect(out.map(c => c.id)).toEqual(['a', 'x']);
  });

  it('keeps same-name cameras at real distance and records without coords', () => {
    const out = dedupeCountryCameras([
      cam({ id: 'a', name: 'Pier Cam', lat: 9.7, lng: 100.0 }),
      cam({ id: 'b', name: 'Pier Cam', lat: 10.7, lng: 101.0 }),
      cam({ id: 'c', name: 'Pier Cam' }),
      cam({ id: 'd', name: 'Pier Cam' }),
    ]);
    expect(out.map(c => c.id)).toEqual(['a', 'b', 'c', 'd']);
  });
});

describe('sortForCountryPage', () => {
  it('groups by city, biggest city first, names in order inside a city', () => {
    const out = sortForCountryPage([
      cam({ id: '1', name: 'Zebra', city: 'Smallville' }),
      cam({ id: '2', name: 'Beta', city: 'Bigton' }),
      cam({ id: '3', name: 'Alpha', city: 'Bigton' }),
      cam({ id: '4', name: 'Gamma', city: 'Bigton' }),
      cam({ id: '5', name: 'Mid', city: 'Midburg' }),
    ]);
    expect(out.map(c => c.id)).toEqual(['3', '2', '4', '5', '1']);
  });

  it('puts the no-city group last, labelled by absence', () => {
    const out = sortForCountryPage([
      cam({ id: '1', name: 'No place' }),
      cam({ id: '2', name: 'Placed', city: 'Somewhere' }),
    ]);
    expect(out.map(c => c.id)).toEqual(['2', '1']);
  });

  it('does not mutate its input', () => {
    const input = [cam({ id: '2', city: 'B' }), cam({ id: '1', city: 'A' })];
    sortForCountryPage(input);
    expect(input.map(c => c.id)).toEqual(['2', '1']);
  });
});
