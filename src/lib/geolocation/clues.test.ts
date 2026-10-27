import { describe, it, expect } from 'vitest';
import { parseClueReply } from './clues';

describe('parseClueReply — whitelist discipline', () => {
  it('parses a well-formed clue set', () => {
    const clues = parseClueReply(JSON.stringify({
      visibleText: ['Tour Eiffel'],
      languages: ['French'],
      landmarks: ['Eiffel Tower'],
      placeNames: [],
      plateStyle: null,
      drivingSide: 'right',
      vegetationClimate: null,
      architecture: 'Haussmann stone facades',
      roadMarkings: null,
      sceneType: 'landmark',
      privateResidenceLikely: false,
    }));
    expect(clues?.landmarks).toEqual(['Eiffel Tower']);
    expect(clues?.drivingSide).toBe('right');
    expect(clues?.sceneType).toBe('landmark');
  });

  it('drops a smuggled location conclusion — the schema has no field for it', () => {
    const clues = parseClueReply(JSON.stringify({
      landmarks: ['Eiffel Tower'],
      location: 'Paris, France',
      coordinates: { lat: 48.8584, lng: 2.2945 },
      guess: 'This photo was taken in Paris',
    }));
    expect(clues).not.toBeNull();
    const flat = JSON.stringify(clues);
    expect(flat).not.toContain('48.8584');
    expect(flat).not.toContain('Paris, France');
    expect((clues as unknown as Record<string, unknown>).location).toBeUndefined();
  });

  it('forces the residential flag when the scene type says residential', () => {
    const clues = parseClueReply(JSON.stringify({ sceneType: 'residential', privateResidenceLikely: false }));
    expect(clues?.privateResidenceLikely).toBe(true);
  });

  it('returns null on unparseable output instead of a half-trusted object', () => {
    expect(parseClueReply('the photo shows a tower in paris')).toBeNull();
    expect(parseClueReply('')).toBeNull();
    expect(parseClueReply('{broken json')).toBeNull();
  });

  it('caps and cleans runaway lists', () => {
    const many = Array.from({ length: 40 }, (_, i) => `sign ${i}`);
    const clues = parseClueReply(JSON.stringify({ visibleText: many }));
    expect(clues?.visibleText.length).toBeLessThanOrEqual(8);
  });
});
