import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

/**
 * The country tier's reconciliation, asserted against the generated data
 * itself (tools/build-country-pages.mjs enforces the same identity at
 * generation time and hard-fails there): per-country counts + the
 * unattributed bucket + dropped near-duplicates must equal the unique-id
 * catalogue total the generator assembled, and every country's chunk file
 * must hold exactly the cameras its count claims — in page order.
 */

const DATA_DIR = join(process.cwd(), 'src', 'data');

interface CountryEntry {
  slug: string;
  name: string;
  count: number;
  aliases: string[];
  topCities: Array<{ name: string; count: number }>;
  cityCount: number;
  samples: Array<{ id: string; name: string; city: string }>;
}

interface CountriesIndex {
  generatedAt: string;
  catalogueTotal: number;
  attributedTotal: number;
  unattributed: number;
  droppedNearDuplicates: number;
  countries: CountryEntry[];
}

const index = JSON.parse(
  readFileSync(join(DATA_DIR, 'camera-countries.json'), 'utf8'),
) as CountriesIndex;

function chunk(slug: string): Array<Record<string, unknown>> {
  return JSON.parse(readFileSync(join(DATA_DIR, 'countries', `${slug}.json`), 'utf8'));
}

describe('camera-countries generated data', () => {
  it('reconciles: country counts + unattributed + near-duplicates == catalogue total', () => {
    const sum = index.countries.reduce((n, c) => n + c.count, 0);
    expect(sum).toBe(index.attributedTotal);
    expect(sum + index.unattributed + index.droppedNearDuplicates).toBe(index.catalogueTotal);
  });

  it('has unique, URL-safe slugs and one chunk file per country', () => {
    const slugs = index.countries.map(c => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    const files = readdirSync(join(DATA_DIR, 'countries'))
      .filter(f => f.endsWith('.json'))
      .map(f => f.replace(/\.json$/, ''));
    expect(new Set(files)).toEqual(new Set(slugs));
  });

  it('every chunk holds exactly the cameras its count claims, all of that country', () => {
    for (const c of index.countries) {
      const records = chunk(c.slug);
      expect(records.length, c.slug).toBe(c.count);
      const ids = new Set(records.map(r => r.id));
      expect(ids.size, c.slug).toBe(records.length);
      for (const r of records) expect(r.country, c.slug).toBe(c.name);
    }
  });

  it('chunks are in page order: city groups biggest first, names inside a group', () => {
    for (const c of index.countries) {
      const records = chunk(c.slug) as Array<{ city?: string; name: string }>;
      const sizes = new Map<string, number>();
      for (const r of records) if (r.city) sizes.set(r.city, (sizes.get(r.city) ?? 0) + 1);
      let lastCity: string | undefined;
      let lastSize = Infinity;
      let lastName = '';
      let inTail = false;
      for (const r of records) {
        const city = r.city ?? '';
        if (city === '') {
          inTail = true;
          continue;
        }
        // no named city may appear once the no-city tail has begun
        expect(inTail, `${c.slug}: ${city} after the no-city tail`).toBe(false);
        if (city !== lastCity) {
          const size = sizes.get(city) ?? 0;
          expect(size, `${c.slug}: group ${city}`).toBeLessThanOrEqual(lastSize);
          lastCity = city;
          lastSize = size;
          lastName = '';
        }
        expect(r.name.localeCompare(lastName), `${c.slug}/${city}`).toBeGreaterThanOrEqual(0);
        lastName = r.name;
      }
    }
  });

  it('keeps the Thailand alias pair that the catalogue depends on', () => {
    const thailand = index.countries.find(c => c.slug === 'thailand');
    expect(thailand).toBeDefined();
    expect(thailand?.aliases).toContain('TH');
    expect(thailand?.aliases).toContain('Thailand');
    expect(thailand?.count).toBeGreaterThan(0);
  });

  it('samples are real cameras from the country chunk', () => {
    for (const c of index.countries) {
      const ids = new Set((chunk(c.slug) as Array<{ id: string }>).map(r => r.id));
      for (const s of c.samples) expect(ids.has(s.id), `${c.slug}:${s.id}`).toBe(true);
    }
  });
});
