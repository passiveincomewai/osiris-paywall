import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import cityPages from '../data/city-pages.json';
import { CITY_PAGE_SLUGS } from './place-answers';
import { UNIVERSITIES, universityBySlug } from './universities';

/**
 * University campus pages — the reconciliation the
 * /university-webcams family publishes by. The audit rule: a page
 * exists only where the camera's OWN data names the institution AND
 * makes the campus the subject. This test pins the accept side
 * against the raw chunks (src/data/countries/*.json, catalogue
 * generated 2026-10-20): every pinned id exists in its named chunk,
 * and every record's name contains the institution token the page
 * claims. Rejection pins hold the line the audit drew: field
 * stations, energy farms, road junctions and the name/city-conflicted
 * Appalachian State record stay out, however famous the institution.
 *
 * The yield is deliberately modest — 25 institutions, 31 records,
 * out of ~440 university/college-flavoured catalogue hits, most of
 * which are road furniture. If the catalogue regenerates and a record
 * moves, this test fails loudly rather than letting a page claim a
 * campus its data no longer names.
 */

const DATA_DIR = join(process.cwd(), 'src', 'data');

interface Rec {
  id: string;
  name?: string;
  city?: string;
  lat?: number;
  lng?: number;
  source?: string;
}

const chunkCache = new Map<string, Rec[]>();
function chunk(slug: string): Rec[] {
  let hit = chunkCache.get(slug);
  if (!hit) {
    hit = JSON.parse(
      readFileSync(join(DATA_DIR, 'countries', `${slug}.json`), 'utf8'),
    ) as Rec[];
    chunkCache.set(slug, hit);
  }
  return hit;
}

const ALL_IDS = UNIVERSITIES.flatMap((u) => u.ids);

describe('university registry — scale and shape', () => {
  it('holds exactly the audited 25 institutions and 31 records', () => {
    expect(UNIVERSITIES).toHaveLength(25);
    expect(ALL_IDS).toHaveLength(31);
    expect(new Set(ALL_IDS).size).toBe(31);
    expect(new Set(UNIVERSITIES.map((u) => u.slug)).size).toBe(25);
    const byCountry = new Map<string, number>();
    for (const u of UNIVERSITIES) {
      byCountry.set(u.country, (byCountry.get(u.country) ?? 0) + u.ids.length);
    }
    expect(byCountry.get('United States')).toBe(15);
    expect(byCountry.get('South Korea')).toBe(10);
  });

  it('every page carries real copy and resolves by slug', () => {
    for (const u of UNIVERSITIES) {
      expect(universityBySlug(u.slug), u.slug).toBe(u);
      expect(u.intro[0].length, u.slug).toBeGreaterThan(100);
      expect(u.intro[1].length, u.slug).toBeGreaterThan(80);
      expect(u.faqs.length, u.slug).toBeGreaterThanOrEqual(1);
      expect(u.token.length, u.slug).toBeGreaterThan(3);
    }
    expect(universityBySlug('harvard-university')).toBeNull();
    expect(universityBySlug('appalachian-state-university')).toBeNull();
  });
});

describe('university registry ↔ raw catalogue', () => {
  it("every pinned record exists in its chunk and its name names the institution", () => {
    for (const u of UNIVERSITIES) {
      const records = u.ids.map((id) => chunk(u.chunk).find((r) => r.id === id));
      for (const [i, rec] of records.entries()) {
        expect(rec, `${u.slug}:${u.ids[i]}`).toBeDefined();
        expect(rec?.name ?? '', `${u.slug}:${u.ids[i]}`).toContain(u.token);
      }
      // The page's pin is its first record's own coordinates.
      expect(records[0]?.lat, u.slug).toBe(u.lat);
      expect(records[0]?.lng, u.slug).toBe(u.lng);
    }
  });

  it('no pinned record is a road scene, a field station or a hospital junction', () => {
    for (const u of UNIVERSITIES) {
      for (const id of u.ids) {
        const rec = chunk(u.chunk).find((r) => r.id === id);
        expect(rec?.name ?? '', `${u.slug}:${id}`).not.toMatch(
          /field station|intersection|junction|interchange|hospital|energy farm/i,
        );
      }
    }
  });

  it('the audited rejections stay out', () => {
    const reg = new Set(ALL_IDS);
    // Appalachian State: the name claims Boone, the record sits in
    // Banner Elk — an off-campus site the audit rejected on the
    // record's own internal conflict.
    expect(reg.has('occ-phenocam-asuhighlands')).toBe(false);
    // University of Illinois Energy Farm — a research farm, not a campus.
    expect(reg.has('occ-phenocam-uiefmaize2')).toBe(false);
    // UW-Milwaukee Field Station — a field station, not the campus.
    expect(reg.has('occ-phenocam-downerwoods')).toBe(false);
    // Toronto's UNIVERSITY AVE / ADELAIDE ST W — a road junction whose
    // name is a street, not an institution.
    expect(reg.has('tor-open-8014')).toBe(false);
    const asu = chunk('united-states').find((r) => r.id === 'occ-phenocam-asuhighlands');
    expect(asu?.name).toContain('Boone');
    expect(asu?.city).toBe('Banner Elk');
  });
});

describe('university city-page links', () => {
  it('every claimed city slug is a real city page in the same country', () => {
    const generated = new Map(
      (cityPages as { cities: Array<{ slug: string; countrySlug: string }> }).cities.map(
        (c) => [c.slug, c.countrySlug],
      ),
    );
    for (const u of UNIVERSITIES) {
      if (!u.citySlug) continue;
      // The New York flagship is a static route outside CITY_PAGE_SLUGS.
      if (u.citySlug === 'new-york-city') {
        expect(u.slug).toBe('cuny');
        continue;
      }
      expect(CITY_PAGE_SLUGS.has(u.citySlug), `${u.slug} → ${u.citySlug}`).toBe(true);
      expect(generated.get(u.citySlug), `${u.slug} → ${u.citySlug}`).toBe(u.countrySlug);
    }
    // Spot-pin the links the audit verified.
    expect(universityBySlug('vanderbilt-university')?.citySlug).toBe('nashville');
    expect(universityBySlug('yonsei-university')?.citySlug).toBe('seoul');
    expect(universityBySlug('newcastle-university')?.citySlug).toBe('newcastle');
    expect(universityBySlug('uc-santa-barbara')?.citySlug).toBeUndefined();
  });
});
