import { describe, expect, it } from 'vitest';
import type { CountryCamera } from './country-cameras';
import {
  guessCountries,
  playableRouletteCameras,
  sampleRoulettePool,
  scoreGuess,
  shuffled,
  toRouletteCamera,
  VERDICT_POINTS,
  type RouletteCamera,
} from './random-camera';

const rec = (partial: Partial<CountryCamera> & { id: string }): CountryCamera => ({
  name: partial.id,
  country: 'Japan',
  city: 'Kyoto',
  lat: 35.0,
  lng: 135.7,
  ...partial,
});

/** Deterministic RNG for sampling tests: cycles through the given values. */
const cycleRng = (values: number[]) => {
  let i = 0;
  return () => values[i++ % values.length];
};

describe('toRouletteCamera', () => {
  it('deals a snapshot camera (feed_url only)', () => {
    const cam = toRouletteCamera(rec({ id: 'a', feed_url: 'https://cam.example/1.jpg' }));
    expect(cam).not.toBeNull();
    expect(cam?.feed).toBe('snapshot');
    expect(cam?.url).toBe('https://cam.example/1.jpg');
    expect(cam?.countrySlug).toBe('japan');
    expect(cam?.region).toBe('asia');
    expect(cam?.regionLabel).toBe('Asia');
    expect(cam?.city).toBe('Kyoto');
  });

  it('deals an HLS stream and classifies it', () => {
    const cam = toRouletteCamera(
      rec({ id: 'b', stream_url: 'https://cam.example/live.m3u8', stream_type: 'hls' }),
    );
    expect(cam?.feed).toBe('hls');
    expect(cam?.url).toBe('https://cam.example/live.m3u8');
  });

  it('classifies declared mp4 and mjpeg streams', () => {
    expect(
      toRouletteCamera(rec({ id: 'c', stream_url: 'https://x/v.mp4', stream_type: 'mp4' }))?.feed,
    ).toBe('mp4');
    expect(
      toRouletteCamera(rec({ id: 'd', stream_url: 'https://x/mjpg', stream_type: 'mjpeg' }))?.feed,
    ).toBe('mjpeg');
    expect(toRouletteCamera(rec({ id: 'e', stream_url: 'https://x/v.mp4' }))?.feed).toBe('mp4');
  });

  it('never deals embeds, listing-only records, or records without a playable feed', () => {
    expect(
      toRouletteCamera(rec({ id: 'f', stream_url: 'https://youtube.com/embed/x', stream_type: 'iframe' })),
    ).toBeNull();
    expect(toRouletteCamera(rec({ id: 'g', external_url: 'https://example.com/cam' }))).toBeNull();
    expect(toRouletteCamera(rec({ id: 'h' }))).toBeNull();
  });

  it('never deals records missing a country, coordinates, or a region mapping', () => {
    expect(toRouletteCamera(rec({ id: 'i', country: undefined, feed_url: 'https://x/1.jpg' }))).toBeNull();
    expect(toRouletteCamera(rec({ id: 'j', lat: undefined, feed_url: 'https://x/1.jpg' }))).toBeNull();
    expect(toRouletteCamera(rec({ id: 'k', lng: undefined, feed_url: 'https://x/1.jpg' }))).toBeNull();
    expect(
      toRouletteCamera(rec({ id: 'l', country: 'Atlantis', feed_url: 'https://x/1.jpg' })),
    ).toBeNull();
  });

  it('prefers the stream over a snapshot when both are present', () => {
    const cam = toRouletteCamera(
      rec({ id: 'm', stream_url: 'https://x/live.m3u8', feed_url: 'https://x/1.jpg' }),
    );
    expect(cam?.feed).toBe('hls');
  });
});

describe('playableRouletteCameras + guessCountries', () => {
  it('keeps only dealable records and derives sorted country options', () => {
    const records = [
      rec({ id: 'a', feed_url: 'https://x/1.jpg' }),
      rec({ id: 'b', external_url: 'https://x/page' }),
      rec({ id: 'c', country: 'Spain', city: 'Madrid', lat: 40.4, lng: -3.7, feed_url: 'https://x/2.jpg' }),
      rec({ id: 'd', country: 'Spain', city: 'Bilbao', lat: 43.3, lng: -3.0, feed_url: 'https://x/3.jpg' }),
    ];
    const playable = playableRouletteCameras(records);
    expect(playable.map((c) => c.id)).toEqual(['a', 'c', 'd']);
    const countries = guessCountries(playable);
    expect(countries.map((c) => c.slug)).toEqual(['japan', 'spain']);
    expect(countries[1]).toMatchObject({ name: 'Spain', region: 'europe', regionLabel: 'Europe' });
  });
});

describe('scoreGuess', () => {
  const japan = { countrySlug: 'japan', region: 'asia' as const };

  it('nails an exact country guess', () => {
    expect(scoreGuess(japan, { slug: 'japan', region: 'asia' })).toEqual({
      verdict: 'nailed',
      points: VERDICT_POINTS.nailed,
    });
  });

  it('scores a same-region guess as close', () => {
    expect(scoreGuess(japan, { slug: 'taiwan', region: 'asia' })).toEqual({
      verdict: 'close',
      points: VERDICT_POINTS.close,
    });
  });

  it('scores a different-region guess as way off', () => {
    expect(scoreGuess(japan, { slug: 'spain', region: 'europe' })).toEqual({
      verdict: 'way-off',
      points: 0,
    });
  });
});

describe('sampleRoulettePool', () => {
  const cam = (id: string, country: string, slug: string, region: RouletteCamera['region']): RouletteCamera => ({
    id,
    name: id,
    city: null,
    country,
    countrySlug: slug,
    region,
    regionLabel: region,
    lat: 0,
    lng: 0,
    feed: 'snapshot',
    url: `https://x/${id}.jpg`,
  });

  const catalogue = [
    ...Array.from({ length: 6 }, (_, i) => cam(`us-${i}`, 'United States', 'united-states', 'north-america')),
    ...Array.from({ length: 3 }, (_, i) => cam(`jp-${i}`, 'Japan', 'japan', 'asia')),
    ...Array.from({ length: 2 }, (_, i) => cam(`es-${i}`, 'Spain', 'spain', 'europe')),
  ];

  it('deals the requested count with unique ids', () => {
    const pool = sampleRoulettePool(catalogue, 8, cycleRng([0.13, 0.57, 0.91, 0.34]));
    expect(pool).toHaveLength(8);
    expect(new Set(pool.map((c) => c.id)).size).toBe(8);
  });

  it('stratifies by country instead of clustering on the biggest catalogue', () => {
    const pool = sampleRoulettePool(catalogue, 6, cycleRng([0.42, 0.05, 0.77]));
    // Round-robin over 3 countries: the first 3 dealt are one per country,
    // and 6 dealt means exactly 2 per country — never 6 from the US pile.
    expect(new Set(pool.slice(0, 3).map((c) => c.countrySlug)).size).toBe(3);
    const counts = pool.reduce<Record<string, number>>((acc, c) => {
      acc[c.countrySlug] = (acc[c.countrySlug] ?? 0) + 1;
      return acc;
    }, {});
    expect(counts).toEqual({ 'united-states': 2, japan: 2, spain: 2 });
  });

  it('returns everything dealable when asked for more than exists', () => {
    const pool = sampleRoulettePool(catalogue, 50, cycleRng([0.5]));
    expect(pool).toHaveLength(catalogue.length);
    expect(new Set(pool.map((c) => c.id)).size).toBe(catalogue.length);
  });

  it('handles edge cases', () => {
    expect(sampleRoulettePool([], 5)).toEqual([]);
    expect(sampleRoulettePool(catalogue, 0)).toEqual([]);
  });

  it('does not mutate its input', () => {
    const before = catalogue.map((c) => c.id);
    sampleRoulettePool(catalogue, 5, cycleRng([0.99, 0.01]));
    expect(catalogue.map((c) => c.id)).toEqual(before);
  });
});

describe('shuffled', () => {
  it('returns a permutation without mutating the input', () => {
    const input = [1, 2, 3, 4, 5];
    const out = shuffled(input, cycleRng([0.2, 0.8, 0.4, 0.6]));
    expect([...out].sort()).toEqual(input);
    expect(input).toEqual([1, 2, 3, 4, 5]);
  });
});
