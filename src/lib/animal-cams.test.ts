import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { EXPLORE_SCOPES, resolveExploreDef } from './explore-data';
import { matchesTheme } from './explore-scopes';
import type { CountryCamera } from './country-cameras';
import {
  ANIMAL_GROUPS,
  ANIMAL_IDS,
  ANIMAL_STARS,
  animalStarBySlug,
} from './animal-cams';

/**
 * Animal cams — the reconciliation the /animal-webcams family
 * publishes by. The hub's universe is the 'animals' theme rule
 * (lib/explore-scopes matchesAnimalCam); this test recomputes that
 * rule's yield from the raw generated chunks (src/data/countries/
 * *.json, catalogue generated 2026-10-20) and pins it to the audited
 * 43-record set in lib/animal-cams, exactly, both ways. The registry's
 * groups must partition the yield; every star page's records must sit
 * inside it. Gap pins cover the famous absences and the traps the
 * audit rejected (the Katmai FAA weather camera, the landmark-named
 * river "aquarium", the Zoo Bridge road camera).
 *
 * If the catalogue regenerates and a yield moves, this test fails
 * loudly — the pages' computed numbers follow the data automatically,
 * but their hard-coded copy ("43 cameras", the group blurbs' counts)
 * must then be re-checked by hand rather than drifting silently.
 */

const DATA_DIR = join(process.cwd(), 'src', 'data');

interface Rec {
  id: string;
  name?: string;
  city?: string;
  country?: string;
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

let allCache: Rec[] | null = null;
function allRecords(): Rec[] {
  if (!allCache) {
    const slugs = readdirSync(join(DATA_DIR, 'countries'))
      .filter((f) => f.endsWith('.json'))
      .map((f) => f.replace(/\.json$/, ''));
    allCache = slugs.flatMap((s) =>
      chunk(s).map((r) => ({ ...r, _chunk: s }) as Rec & { _chunk: string }),
    );
  }
  return allCache;
}

function byId(id: string): (Rec & { _chunk?: string }) | undefined {
  return allRecords().find((r) => r.id === id);
}

/** The theme rule's yield, recomputed from the raw chunks. */
function rawYield(): Rec[] {
  return allRecords().filter((r) =>
    matchesTheme(r as unknown as CountryCamera, 'animals'),
  );
}

describe('animals theme rule (raw-chunk recomputation)', () => {
  it('is wired as a scope and a per-country theme', () => {
    expect(EXPLORE_SCOPES['animals']).toEqual({
      label: 'animal webcams',
      slugs: 'all',
      theme: 'animals',
      groupBy: 'country',
    });
    const parsed = resolveExploreDef({ country: 'japan', theme: 'animals' });
    expect(parsed?.theme).toBe('animals');
  });

  it('yields exactly the audited 43 records, no more, no fewer', () => {
    const got = rawYield().map((r) => r.id).sort();
    expect(got).toEqual([...ANIMAL_IDS].sort());
    expect(got).toHaveLength(43);
  });

  it('every genuine identity the audit found is in the yield', () => {
    const got = new Set(rawYield().map((r) => r.id));
    for (const id of [
      'pubcam-united-states-san-diego-zoo-san-diego-zoo', // San Diego Zoo
      'sky-south-africa-tembe-elephant-park-1795', // Tembe Elephant Park
      'sky-kenya-masai-mara-kenya-4905', // the Masai Mara-named feed
      'occ-sakura-EeU_fG7pmX4', // Kumamoto City Zoo Giraffe
      'occ-camstreamer-759391847-live-hula-nature-reserve-bird-cam-2', // Hula Bird CAM 2
      'occ-biodic-51', // Kushimoto Marine Park Underwater
    ]) {
      expect(got.has(id), id).toBe(true);
    }
  });

  it('the traps stay out: road scenes and landmark-named river cams', () => {
    const got = new Set(rawYield().map((r) => r.id));
    // FAA weather camera at a lodge airstrip — the catalogue's only
    // Katmai record, and NOT a bear cam.
    expect(got.has('faa-13067')).toBe(false);
    // rivergojp river-gauge camera named for the aquarium landmark.
    expect(got.has('occ-rivergojp-221531039')).toBe(false);
    // "US26 at Zoo Bridge" — a highway camera, not a zoo.
    expect(got.has('odot-281')).toBe(false);
    // "IH20 @ Osprey" & the Puffin Roundabout — road furniture, not birds.
    expect(got.has('txdot-FTW-IH20 @ Osprey')).toBe(false);
    expect(got.has('occ-trafficwales-TSWA00599')).toBe(false);
  });

  it('the famous absences are real: no bear, eagle-nest, panda, osprey or puffin cams exist', () => {
    const names = allRecords().map((r) => (r.name ?? '').toLowerCase());
    const animalSubject = names.filter((n) =>
      /brooks falls|katmai.*\bbear\b|eagle nest|eagle cam|\bpanda\b|osprey (nest|cam)|puffin (cam|colony)|penguin cam/.test(n),
    );
    expect(animalSubject).toEqual([]);
    const yielded = rawYield();
    expect(yielded.some((r) => /katmai|brooks/i.test(r.name ?? ''))).toBe(false);
  });
});

describe('animal registry ↔ catalogue', () => {
  it('the hub groups partition the yield exactly', () => {
    const grouped = ANIMAL_GROUPS.flatMap((g) => g.ids);
    expect(new Set(grouped).size).toBe(grouped.length);
    expect([...grouped].sort()).toEqual([...ANIMAL_IDS].sort());
    expect(ANIMAL_GROUPS).toHaveLength(6);
    for (const g of ANIMAL_GROUPS) {
      expect(g.ids.length, g.key).toBeGreaterThanOrEqual(5);
      expect(g.blurb.length, g.key).toBeGreaterThan(80);
    }
  });

  it('every grouped record exists in its chunk with a name', () => {
    for (const g of ANIMAL_GROUPS) {
      for (const id of g.ids) {
        const rec = byId(id);
        expect(rec, id).toBeDefined();
        expect((rec?.name ?? '').length, id).toBeGreaterThan(3);
      }
    }
  });

  it('star pages: 12, unique slugs, records inside the yield and the named chunk', () => {
    expect(ANIMAL_STARS).toHaveLength(12);
    expect(new Set(ANIMAL_STARS.map((s) => s.slug)).size).toBe(12);
    const yieldIds = new Set(ANIMAL_IDS);
    for (const s of ANIMAL_STARS) {
      expect(animalStarBySlug(s.slug), s.slug).toBe(s);
      expect(s.ids.length, s.slug).toBeGreaterThanOrEqual(1);
      for (const id of s.ids) {
        expect(yieldIds.has(id), `${s.slug}:${id}`).toBe(true);
        const rec = chunk(s.chunk).find((r) => r.id === id);
        expect(rec, `${s.slug}:${id}`).toBeDefined();
      }
      // The star's pin is its first record's own coordinates.
      const first = chunk(s.chunk).find((r) => r.id === s.ids[0]);
      expect(first?.lat, s.slug).toBe(s.lat);
      expect(first?.lng, s.slug).toBe(s.lng);
      expect(s.intro[0].length, s.slug).toBeGreaterThan(100);
      expect(s.intro[1].length, s.slug).toBeGreaterThan(100);
      expect(s.watch.length, s.slug).toBeGreaterThan(60);
      expect(s.faqs.length, s.slug).toBeGreaterThanOrEqual(2);
      expect(
        () => new Intl.DateTimeFormat('en-US', { timeZone: s.tz }),
        s.slug,
      ).not.toThrow();
    }
    expect(animalStarBySlug('brooks-falls')).toBeNull();
    expect(animalStarBySlug('decorah-eagles')).toBeNull();
  });

  it('the Masai Mara record quirk is pinned, not hidden', () => {
    // The feed is published under the Masai Mara name while the
    // record's own city field reads Nakuru — the registry flags it
    // (weather: false) and the page copy states it.
    const mara = animalStarBySlug('masai-mara');
    expect(mara?.weather).toBe(false);
    const rec = byId('sky-kenya-masai-mara-kenya-4905');
    expect(rec?.name).toContain('Masai Mara');
    expect(rec?.city).toBe('Nakuru');
    for (const s of ANIMAL_STARS) {
      if (s.slug !== 'masai-mara') expect(s.weather, s.slug).toBe(true);
    }
  });
});
