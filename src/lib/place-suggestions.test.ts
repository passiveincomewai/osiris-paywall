import { describe, it, expect } from 'vitest';
import { buildSuggestionOptions, typedOverPick } from './place-suggestions';

const RECENT = [
  { label: 'Powder Mountain', lat: 41.38, lng: -111.78, kind: 'poi' },
  { label: 'Ogden, UT', lat: 41.22, lng: -111.97, kind: 'city' },
];
const RESULTS = [{ label: 'Park City, UT', lat: 40.65, lng: -111.5, kind: 'city' }];

describe('buildSuggestionOptions — the pinned composition', () => {
  it('a live fix pins "Your location" first, labeled as live', () => {
    const opts = buildSuggestionOptions({
      fix: { lat: 41.3, lng: -111.9, live: true }, empty: true, recent: RECENT, results: RESULTS,
    });
    expect(opts[0]).toMatchObject({ label: 'Your location', kind: 'current', context: 'Live position', lat: 41.3 });
    expect(opts.slice(1).map((o) => o.label)).toEqual(['Powder Mountain', 'Ogden, UT']);
    expect(opts[1].recent).toBe(true);
  });

  it('a captured one-shot fix pins too — honestly labeled as a fix, not live', () => {
    const opts = buildSuggestionOptions({
      fix: { lat: 41.3, lng: -111.9, live: false }, empty: true, recent: [], results: [],
    });
    expect(opts).toHaveLength(1);
    expect(opts[0].context).toBe('Position fix');
  });

  it('no fix: recents while empty, geocoder results once typing', () => {
    const empty = buildSuggestionOptions({ fix: null, empty: true, recent: RECENT, results: RESULTS });
    expect(empty.map((o) => o.label)).toEqual(['Powder Mountain', 'Ogden, UT']);
    const typed = buildSuggestionOptions({ fix: null, empty: false, recent: RECENT, results: RESULTS });
    expect(typed.map((o) => o.label)).toEqual(['Park City, UT']);
    expect(typed[0].recent).toBeUndefined();
  });

  it('the fix stays pinned ahead of typed results too', () => {
    const opts = buildSuggestionOptions({
      fix: { lat: 41.3, lng: -111.9, live: false }, empty: false, recent: RECENT, results: RESULTS,
    });
    expect(opts.map((o) => o.label)).toEqual(['Your location', 'Park City, UT']);
  });

  it('nothing known, nothing offered', () => {
    expect(buildSuggestionOptions({ fix: null, empty: true, recent: [], results: [] })).toEqual([]);
  });
});

describe('typedOverPick — typing replaces a picked origin', () => {
  it('divergent text invalidates the pick', () => {
    expect(typedOverPick('Current location', 'Denver')).toBe(true);
    expect(typedOverPick('Ogden, UT', 'Ogden, U')).toBe(true);
    expect(typedOverPick('Ogden, UT', '')).toBe(true);
  });

  it('the pick stands while the text still matches it', () => {
    expect(typedOverPick('Ogden, UT', 'Ogden, UT')).toBe(false);
    expect(typedOverPick(null, 'anything')).toBe(false);
    expect(typedOverPick(undefined, 'anything')).toBe(false);
    expect(typedOverPick('', 'anything')).toBe(false);
  });
});
