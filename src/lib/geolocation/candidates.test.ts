import { describe, it, expect } from 'vitest';
import {
  AREA_DISPLAY_RADIUS_M,
  PRIVACY_RADIUS_FLOOR_M,
  candidatesFromRows,
  exifCandidate,
  isResidentialScene,
  radiusFromRow,
  rankCandidates,
  shortLabel,
  toPublicCandidate,
  type NominatimRowLike,
} from './candidates';

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

const townRow: NominatimRowLike = {
  lat: '48.8566',
  lon: '2.3522',
  display_name: 'Paris, Île-de-France, France',
  class: 'place',
  type: 'city',
  importance: 0.7,
  boundingbox: ['48.8155', '48.9021', '2.2241', '2.4699'],
  address: { city: 'Paris', country: 'France' },
};

describe('shortLabel / radiusFromRow', () => {
  it('builds a short label from name + context', () => {
    expect(shortLabel(eiffelRow)).toBe('Eiffel Tower, Paris, France');
  });

  it('derives a sane radius from a bounding box', () => {
    // Eiffel box is a few hundred metres across.
    const r = radiusFromRow(eiffelRow);
    expect(r).toBeGreaterThan(50);
    expect(r).toBeLessThan(1000);
    // Paris box is ~10 km across.
    expect(radiusFromRow(townRow)).toBeGreaterThan(3000);
  });
});

describe('ranking', () => {
  it('named-landmark matches outrank generic place-name matches', () => {
    const landmark = candidatesFromRows([eiffelRow], { kind: 'landmark', clue: 'Eiffel Tower' });
    const place = candidatesFromRows([townRow], { kind: 'place', clue: 'Paris' });
    const ranked = rankCandidates([...place, ...landmark]);
    expect(ranked[0].kind).toBe('landmark');
    expect(ranked[0].confidence).toBe('high');
  });

  it('EXIF outranks everything', () => {
    const landmark = candidatesFromRows([eiffelRow], { kind: 'landmark', clue: 'Eiffel Tower' });
    const exif = exifCandidate({ lat: 1, lng: 2, altitudeM: null, directionDeg: null }, 'Somewhere');
    const ranked = rankCandidates([...landmark, exif]);
    expect(ranked[0].kind).toBe('exif');
  });

  it('corroboration from an independent clue raises score and drops the unconfirmed caveat', () => {
    const a = candidatesFromRows([eiffelRow], { kind: 'landmark', clue: 'Eiffel Tower' });
    // ~275 m away: inside the 25 km corroboration range, outside the
    // 200 m same-spot merge.
    const nearRow: NominatimRowLike = {
      ...eiffelRow,
      lat: '48.8560000',
      lon: '2.2960000',
      display_name: 'Champ de Mars, Paris, France',
      name: 'Champ de Mars',
    };
    const b = candidatesFromRows([nearRow], { kind: 'place', clue: 'Champ de Mars' });
    const ranked = rankCandidates([...a, ...b]);
    const tower = ranked.find(c => c.origin === 'Eiffel Tower')!;
    expect(tower.evidenceFor.join(' ')).toContain('independent clue');
    expect(tower.evidenceAgainst.join(' ')).not.toContain('No second, independent clue');
  });

  it('same-spot duplicates merge instead of listing twice', () => {
    const a = candidatesFromRows([eiffelRow], { kind: 'landmark', clue: 'Eiffel Tower' });
    const b = candidatesFromRows([eiffelRow], { kind: 'place', clue: 'Tour Eiffel' });
    const ranked = rankCandidates([...a, ...b]);
    const dupes = ranked.filter(
      c => Math.abs(c.lat - 48.85826) < 0.001 && Math.abs(c.lng - 2.294501) < 0.001,
    );
    expect(dupes.length).toBe(1);
  });
});

describe('ranking + radius explanations (the detail layer)', () => {
  it('ranked candidates carry a plain-language reason with position and score', () => {
    const landmark = candidatesFromRows([eiffelRow], { kind: 'landmark', clue: 'Eiffel Tower' });
    const exif = exifCandidate({ lat: 1, lng: 2, altitudeM: null, directionDeg: null }, 'Somewhere');
    const ranked = rankCandidates([...landmark, exif]);
    expect(ranked[0].rankReason).toContain('Ranked first');
    expect(ranked[0].rankReason).toContain('evidence score 1000');
    expect(ranked[0].rankReason).toContain('strongest evidence');
    expect(ranked[1].rankReason).toContain('Ranked #2');
    expect(ranked[1].rankReason).toContain('Named-landmark matches');
  });

  it('a corroborated candidate says so in its rank reason', () => {
    const a = candidatesFromRows([eiffelRow], { kind: 'landmark', clue: 'Eiffel Tower' });
    const nearRow: NominatimRowLike = {
      ...eiffelRow,
      lat: '48.8560000',
      lon: '2.2960000',
      display_name: 'Champ de Mars, Paris, France',
      name: 'Champ de Mars',
    };
    const b = candidatesFromRows([nearRow], { kind: 'place', clue: 'Champ de Mars' });
    const ranked = rankCandidates([...a, ...b]);
    const tower = ranked.find(c => c.origin === 'Eiffel Tower')!;
    expect(tower.rankReason).toContain('independent clue');
  });

  it('an unranked candidate still gets a kind-level reason via the clamp', () => {
    const pub = toPublicCandidate(
      exifCandidate({ lat: 1, lng: 2, altitudeM: null, directionDeg: null }, 'X'),
      { residential: false },
    );
    expect(pub.rankReason).toContain('strongest evidence');
  });

  it('the radius reason names the privacy floor for an EXIF point', () => {
    const pub = toPublicCandidate(
      exifCandidate({ lat: 1, lng: 2, altitudeM: null, directionDeg: null }, 'X'),
      { residential: false },
    );
    expect(pub.radiusReason).toContain('250 m privacy floor');
  });

  it('the radius reason names the privacy floor when the matched place is smaller than it', () => {
    const [c] = candidatesFromRows([eiffelRow], { kind: 'landmark', clue: 'Eiffel Tower' });
    const pub = toPublicCandidate(c, { residential: false });
    expect(pub.radiusM).toBe(PRIVACY_RADIUS_FLOOR_M);
    expect(pub.radiusReason).toContain('smaller than');
    expect(pub.radiusReason).toContain('privacy floor');
  });

  it('the radius reason explains a wide radius as the matched place\u2019s own size', () => {
    const [c] = candidatesFromRows([townRow], { kind: 'place', clue: 'Paris' });
    const pub = toPublicCandidate(c, { residential: false });
    expect(pub.radiusM).toBeGreaterThan(PRIVACY_RADIUS_FLOOR_M);
    expect(pub.radiusReason).toContain('mapped outline spans about');
  });

  it('the radius reason explains residential suppression as deliberate', () => {
    const pub = toPublicCandidate(
      exifCandidate({ lat: 40.1, lng: -111.9, altitudeM: null, directionDeg: null }, 'Home'),
      { residential: true },
    );
    expect(pub.radiusReason).toContain('suppressed');
    expect(pub.radiusReason).toContain('general area');
    // The explanation must not leak the suppressed point either.
    expect(pub.radiusReason).not.toContain('40.1');
  });
});

describe('the privacy clamp', () => {
  it('never displays a radius tighter than 250 m', () => {
    const tight = { ...exifCandidate({ lat: 1, lng: 2, altitudeM: null, directionDeg: null }, 'X'), baseRadiusM: 12 };
    const pub = toPublicCandidate(tight, { residential: false });
    expect(pub.radiusM).toBe(PRIVACY_RADIUS_FLOOR_M);
    expect(pub.precision).toBe('point');
    expect(pub.lat).toBe(1);
  });

  it('suppresses the point entirely for a residential scene', () => {
    const c = exifCandidate({ lat: 40.1, lng: -111.9, altitudeM: null, directionDeg: null }, 'Home');
    const pub = toPublicCandidate(c, { residential: true });
    expect(pub.precision).toBe('area');
    expect(pub.lat).toBeNull();
    expect(pub.lng).toBeNull();
    expect(pub.radiusM).toBeGreaterThanOrEqual(AREA_DISPLAY_RADIUS_M);
    // The label may stay — it is area-level text — but no coordinates leak.
    expect(JSON.stringify(pub)).not.toContain('40.1');
    expect(JSON.stringify(pub)).not.toContain('-111.9');
  });

  it('recognises residential scenes from either signal', () => {
    expect(isResidentialScene({ sceneType: 'residential', privateResidenceLikely: false })).toBe(true);
    expect(isResidentialScene({ sceneType: 'urban', privateResidenceLikely: true })).toBe(true);
    expect(isResidentialScene({ sceneType: 'landmark', privateResidenceLikely: false })).toBe(false);
    expect(isResidentialScene(null)).toBe(false);
  });
});
