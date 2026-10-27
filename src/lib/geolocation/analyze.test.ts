import { describe, it, expect } from 'vitest';
import { analyzePhoto, type AnalyzeDeps } from './analyze';
import { EMPTY_CLUES, type PhotoClues } from './clues';
import type { NominatimRowLike } from './candidates';
import { BARE_JPEG, EIFFEL_GPS, buildExifJpeg } from './exif-fixtures';

const eiffelRow: NominatimRowLike = {
  lat: '48.8582600',
  lon: '2.2945010',
  display_name: 'Eiffel Tower, Avenue Anatole France, Paris, France',
  name: 'Eiffel Tower',
  class: 'tourism',
  type: 'attraction',
  importance: 0.9,
  boundingbox: ['48.8579', '48.8586', '2.2941', '2.2949'],
  address: { city: 'Paris', country: 'France' },
};

const cluesWithLandmark: PhotoClues = {
  ...EMPTY_CLUES,
  landmarks: ['Eiffel Tower'],
  visibleText: ['Tour Eiffel'],
  languages: ['French'],
  sceneType: 'landmark',
};

function deps(overrides: Partial<AnalyzeDeps> = {}): AnalyzeDeps {
  return {
    extractClues: null,
    visionOffReason: 'vision off in test',
    searchPlaces: async () => [],
    reverseLabel: async () => 'Eiffel Tower, Paris, France',
    ...overrides,
  };
}

describe('analyzePhoto — EXIF path', () => {
  it('locates from EXIF GPS alone, labelled as metadata, in exif-only mode', async () => {
    const result = await analyzePhoto(
      { buffer: buildExifJpeg({ gps: EIFFEL_GPS, make: 'Canon' }), kind: 'jpeg' },
      deps(),
    );
    expect(result.status).toBe('located');
    expect(result.mode).toBe('exif-only');
    expect(result.degradedReasons.join(' ')).toContain('vision off in test');
    expect(result.candidates[0].kind).toBe('exif');
    expect(result.candidates[0].label).toBe('Eiffel Tower, Paris, France');
    expect(result.candidates[0].lat).toBeCloseTo(48.8583917, 5);
    expect(result.candidates[0].radiusM).toBeGreaterThanOrEqual(250);
    expect(result.exif?.hasGps).toBe(true);
  });

  it('still locates from EXIF when the vision pass throws', async () => {
    const result = await analyzePhoto(
      { buffer: buildExifJpeg({ gps: EIFFEL_GPS }), kind: 'jpeg' },
      deps({
        extractClues: async () => {
          throw new Error('provider down');
        },
      }),
    );
    expect(result.status).toBe('located');
    expect(result.mode).toBe('exif-only');
    expect(result.candidates[0].kind).toBe('exif');
  });
});

describe('analyzePhoto — clue path', () => {
  it('locates a landmark match from clues when the file has no GPS', async () => {
    const result = await analyzePhoto(
      { buffer: BARE_JPEG, kind: 'jpeg' },
      deps({
        extractClues: async () => cluesWithLandmark,
        searchPlaces: async (q) => (q === 'Eiffel Tower' ? [eiffelRow] : []),
      }),
    );
    expect(result.status).toBe('located');
    expect(result.mode).toBe('full');
    expect(result.candidates[0].kind).toBe('landmark');
    expect(result.candidates[0].label).toContain('Eiffel Tower');
    expect(result.clues?.landmarks).toEqual(['Eiffel Tower']);
  });

  it('answers "couldn\'t determine" — with the clues — when nothing matches', async () => {
    const result = await analyzePhoto(
      { buffer: BARE_JPEG, kind: 'jpeg' },
      deps({
        extractClues: async () => ({ ...EMPTY_CLUES, vegetationClimate: 'temperate forest', sceneType: 'natural' }),
        searchPlaces: async () => [],
      }),
    );
    expect(result.status).toBe('undetermined');
    expect(result.candidates).toEqual([]);
    expect(result.notes.join(' ')).toContain('no GPS coordinates');
    expect(result.clues?.vegetationClimate).toBe('temperate forest');
  });

  it('treats a whole-country match as too broad to call a location', async () => {
    const countryRow: NominatimRowLike = {
      lat: '46.6',
      lon: '2.5',
      display_name: 'France',
      class: 'boundary',
      type: 'country',
      boundingbox: ['41.0', '51.2', '-5.2', '9.7'],
      address: { country: 'France' },
    };
    const result = await analyzePhoto(
      { buffer: BARE_JPEG, kind: 'jpeg' },
      deps({
        extractClues: async () => ({ ...EMPTY_CLUES, placeNames: ['France'], sceneType: 'natural' }),
        searchPlaces: async () => [countryRow],
      }),
    );
    expect(result.status).toBe('undetermined');
    expect(result.notes.join(' ')).toContain('whole-country');
  });
});

describe('analyzePhoto — privacy clamp end to end', () => {
  it('suppresses the point when the scene is a likely private residence', async () => {
    const result = await analyzePhoto(
      { buffer: buildExifJpeg({ gps: EIFFEL_GPS }), kind: 'jpeg' },
      deps({
        extractClues: async () => ({
          ...EMPTY_CLUES,
          sceneType: 'residential',
          privateResidenceLikely: true,
        }),
        reverseLabel: async () => 'A street in Paris, France',
      }),
    );
    expect(result.status).toBe('located');
    expect(result.candidates[0].precision).toBe('area');
    expect(result.candidates[0].lat).toBeNull();
    expect(result.candidates[0].lng).toBeNull();
    expect(result.notes.join(' ')).toContain('private residence');
  });
});
