import { describe, expect, it } from 'vitest';
import {
  cameraAreas,
  cameraMediaKind,
  COUNTRY_CAMERA_EXPLORERS,
  filterCameras,
  selectCountryCameras,
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
