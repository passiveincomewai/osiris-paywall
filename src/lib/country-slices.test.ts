import { describe, expect, it } from 'vitest';
import { sliceCountryCameras } from './country-slices';
import type { CountryCamera } from './country-cameras';

const cam = (partial: Partial<CountryCamera> & { id: string }): CountryCamera => ({
  name: partial.id,
  country: 'Freedonia',
  ...partial,
});

const records: CountryCamera[] = [
  ...Array.from({ length: 60 }, (_, i) =>
    cam({ id: `b${i}`, name: `Bigton Cam ${String(i).padStart(2, '0')}`, city: 'Bigton' }),
  ),
  cam({ id: 's1', name: 'Harbor Light', city: 'Smallville' }),
  cam({ id: 's2', name: 'Harbor Dark', city: 'Smallville' }),
  cam({ id: 'n1', name: 'Nowhere Cam' }),
];

describe('sliceCountryCameras', () => {
  it('serves the first batch of 48 by default', () => {
    const out = sliceCountryCameras(records, {});
    expect(out.total).toBe(63);
    expect(out.cameras).toHaveLength(48);
    expect(out.offset).toBe(0);
    expect(out.limit).toBe(48);
  });

  it('walks the whole country in batches with no overlap', () => {
    const seen = new Set<string>();
    for (let offset = 0; offset < 63; offset += 48) {
      const out = sliceCountryCameras(records, { offset });
      for (const c of out.cameras) {
        expect(seen.has(c.id)).toBe(false);
        seen.add(c.id);
      }
    }
    expect(seen.size).toBe(63);
  });

  it('clamps limit to the stated maximum and offset at zero', () => {
    const out = sliceCountryCameras(records, { offset: -5, limit: 5000 });
    expect(out.offset).toBe(0);
    expect(out.limit).toBe(96);
  });

  it('filters by city before slicing', () => {
    const out = sliceCountryCameras(records, { city: 'Smallville' });
    expect(out.total).toBe(2);
    expect(out.cameras.map(c => c.id)).toEqual(['s1', 's2']);
  });

  it('searches name, city and source across the whole country', () => {
    const withSource = records.map(c => (c.id === 'n1' ? { ...c, source: 'Harbor Authority' } : c));
    const out = sliceCountryCameras(withSource, { query: 'harbor' });
    expect(out.cameras.map(c => c.id)).toEqual(['s1', 's2', 'n1']);
  });

  it('combines city and query, and reports the filtered total', () => {
    const out = sliceCountryCameras(records, { city: 'Bigton', query: 'cam 07' });
    expect(out.total).toBe(1);
    expect(out.cameras[0].id).toBe('b7');
  });

  it('returns the biggest cities as chips, unfiltered', () => {
    const out = sliceCountryCameras(records, { city: 'Smallville' });
    expect(out.cities[0]).toEqual({ name: 'Bigton', count: 60 });
    expect(out.cities).toHaveLength(2);
  });

  it('answers an out-of-range offset with an empty slice, not an error', () => {
    const out = sliceCountryCameras(records, { offset: 10000 });
    expect(out.total).toBe(63);
    expect(out.cameras).toEqual([]);
  });
});

describe('sliceCountryCameras with a derived-city resolver', () => {
  /* US-style records: the DOT feed files them under the state name;
     the resolver (lib/us-places in production) knows two of them sit
     in Ogden. */
  const usRecords: CountryCamera[] = [
    cam({ id: 'u1', name: 'Washington Blvd Cam', city: 'Utah' }),
    cam({ id: 'u2', name: '12th Street Cam', city: 'Utah' }),
    cam({ id: 'u3', name: 'I-15 Cam', city: 'Houston' }),
  ];
  const placeFor = (r: CountryCamera) => (r.id === 'u1' || r.id === 'u2' ? 'Ogden' : null);

  it('groups, filters and searches by the derived city', () => {
    const out = sliceCountryCameras(usRecords, { city: 'Ogden', placeFor });
    expect(out.total).toBe(2);
    expect(out.cameras.map(c => c.id)).toEqual(['u1', 'u2']);
    expect(out.cameras[0].city).toBe('Ogden');

    const chips = sliceCountryCameras(usRecords, { placeFor });
    expect(chips.cities).toEqual([
      { name: 'Ogden', count: 2 },
      { name: 'Houston', count: 1 },
    ]);

    const byText = sliceCountryCameras(usRecords, { query: 'ogden', placeFor });
    expect(byText.total).toBe(2);
  });

  it('without a resolver the same records keep their feed labels', () => {
    const out = sliceCountryCameras(usRecords, { city: 'Ogden' });
    expect(out.total).toBe(0);
    const byLabel = sliceCountryCameras(usRecords, { city: 'Utah' });
    expect(byLabel.total).toBe(2);
    expect(byLabel.cities).toEqual([
      { name: 'Utah', count: 2 },
      { name: 'Houston', count: 1 },
    ]);
  });

  it('does not mutate the input records', () => {
    sliceCountryCameras(usRecords, { placeFor });
    expect(usRecords[0].city).toBe('Utah');
  });
});
