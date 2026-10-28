import { describe, it, expect } from 'vitest';
import { geolocationOutcomeDetail } from './outcome';
import { exifCandidate, candidatesFromRows, rankCandidates, toPublicCandidate, type NominatimRowLike } from './candidates';

const pub = (c: Parameters<typeof toPublicCandidate>[0]) => toPublicCandidate(c, { residential: false });

describe('geolocationOutcomeDetail — coarse analytics token, never a place', () => {
  it('is "exif" when the top candidate came from file GPS', () => {
    const top = pub(exifCandidate({ lat: 1, lng: 2, altitudeM: null, directionDeg: null }, 'X'));
    expect(geolocationOutcomeDetail({ status: 'located', candidates: [top] })).toBe('exif');
  });

  it('is "vision" when the top candidate came from a clue match', () => {
    const row: NominatimRowLike = {
      lat: '48.8582600',
      lon: '2.2945010',
      display_name: 'Eiffel Tower, Paris, France',
      name: 'Eiffel Tower',
      class: 'tourism',
      type: 'attraction',
      importance: 0.9,
      boundingbox: ['48.8579', '48.8586', '2.2941', '2.2949'],
      address: { city: 'Paris', country: 'France' },
    };
    const ranked = rankCandidates(candidatesFromRows([row], { kind: 'landmark', clue: 'Eiffel Tower' }));
    expect(geolocationOutcomeDetail({ status: 'located', candidates: ranked.map(c => pub(c)) })).toBe('vision');
  });

  it('is "none" when nothing could be determined — and defensively when a located result has no candidates', () => {
    expect(geolocationOutcomeDetail({ status: 'undetermined', candidates: [] })).toBe('none');
    expect(geolocationOutcomeDetail({ status: 'located', candidates: [] })).toBe('none');
  });

  it('only ever yields the three coarse tokens (safe as an analytics detail)', () => {
    for (const token of ['exif', 'vision', 'none']) {
      expect(token).toMatch(/^[a-z0-9_]{1,24}$/);
    }
  });
});
