/**
 * OSIRIS — server-side record loading for the directory explorers.
 *
 * The country endpoint loads one country's chunk per request; the
 * region / category / traffic hubs and the city pages need unions and
 * theme-filtered sets over the same generated catalogue
 * (src/data/countries/*.json, indexed by camera-countries.json). This
 * module is the one loader for those scopes: chunks are imported
 * lazily, cached per instance, and every scope's filtered record set
 * is computed once and reused — pages read counts and search options
 * from the same sets the /api/cctv/explore endpoint slices, so a page
 * can never quote a number its own grid disagrees with.
 *
 * Scopes are a fixed registry (below), not arbitrary client input: a
 * key names a page family, and the page and the endpoint resolve the
 * same key to the same records. City scopes arrive as country+city
 * params instead (46+ generated cities are data, not registry rows),
 * validated against the country index.
 */

import index from '@/data/camera-countries.json';
import { cameraAreas, type CameraArea, type CountryCamera } from './country-cameras';
import { COUNTRY_REGION, type RegionKey } from './country-page-content';
import {
  applyScope,
  sortForExplore,
  type ExploreGroupBy,
  type ExploreScope,
  type ExploreThemeKey,
} from './explore-scopes';

export interface CountryIndexEntry {
  slug: string;
  name: string;
  count: number;
  topCities: Array<{ name: string; count: number }>;
  cityCount: number;
}

export const COUNTRY_INDEX = (
  index as unknown as { countries: CountryIndexEntry[] }
).countries;
export const CATALOGUE_GENERATED_AT = (index as unknown as { generatedAt: string })
  .generatedAt;
const BY_SLUG = new Map(COUNTRY_INDEX.map((c) => [c.slug, c]));

export function countryEntry(slug: string): CountryIndexEntry | null {
  return BY_SLUG.get(slug) ?? null;
}

/* ------------------------------------------------------------------ */
/* Chunk loading (the country route's lazy pattern, shared)            */
/* ------------------------------------------------------------------ */

const chunkCache = new Map<string, Promise<CountryCamera[]>>();

export function loadCountryChunk(slug: string): Promise<CountryCamera[]> {
  let pending = chunkCache.get(slug);
  if (!pending) {
    pending = import(`@/data/countries/${slug}.json`).then(
      (mod) => ((mod as { default?: unknown }).default ?? mod) as CountryCamera[],
    );
    chunkCache.set(slug, pending);
  }
  return pending;
}

let allRecords: Promise<CountryCamera[]> | null = null;

export function loadAllRecords(): Promise<CountryCamera[]> {
  if (!allRecords) {
    allRecords = Promise.all(COUNTRY_INDEX.map((c) => loadCountryChunk(c.slug))).then(
      (chunks) => chunks.flat(),
    );
  }
  return allRecords;
}

async function loadUnion(slugs: readonly string[]): Promise<CountryCamera[]> {
  const chunks = await Promise.all(slugs.map((s) => loadCountryChunk(s)));
  return chunks.flat();
}

/* ------------------------------------------------------------------ */
/* Scope registry                                                      */
/* ------------------------------------------------------------------ */

export interface ExploreScopeDef {
  /** Human label, used in count lines and section headings. */
  label: string;
  slugs: string[] | 'all';
  theme?: ExploreThemeKey;
  city?: string;
  groupBy: ExploreGroupBy;
}

function regionSlugs(region: RegionKey): string[] {
  return Object.entries(COUNTRY_REGION)
    .filter(([, r]) => r === region)
    .map(([slug]) => slug)
    .filter((slug) => BY_SLUG.has(slug));
}

function trafficCountry(slug: string, label: string): ExploreScopeDef {
  return { label, slugs: [slug], theme: 'traffic', groupBy: 'city' };
}

export const EXPLORE_SCOPES: Record<string, ExploreScopeDef> = {
  /* Region hubs — the country pages' own continental grouping
     (lib/country-page-content COUNTRY_REGION). */
  asia: { label: 'Asia', slugs: regionSlugs('asia'), groupBy: 'country' },
  europe: { label: 'Europe', slugs: regionSlugs('europe'), groupBy: 'country' },
  /* The whole catalogue, for the /live-webcams hub. */
  all: { label: 'the world', slugs: 'all', groupBy: 'country' },
  /* Category hubs — theme rules over the whole catalogue. */
  beach: { label: 'beaches & coasts', slugs: 'all', theme: 'coast', groupBy: 'country' },
  airport: { label: 'airports', slugs: 'all', theme: 'airport', groupBy: 'country' },
  /* Traffic family. */
  traffic: { label: 'traffic & roads', slugs: 'all', theme: 'traffic', groupBy: 'country' },
  'traffic-us': {
    label: 'United States traffic',
    slugs: ['united-states'],
    theme: 'traffic',
    groupBy: 'city',
  },
  'traffic-japan': trafficCountry('japan', 'Japan traffic'),
  'traffic-canada': trafficCountry('canada', 'Canada traffic'),
  'traffic-spain': trafficCountry('spain', 'Spain traffic'),
  'traffic-south-korea': trafficCountry('south-korea', 'South Korea traffic'),
  'traffic-sweden': trafficCountry('sweden', 'Sweden traffic'),
  'traffic-norway': trafficCountry('norway', 'Norway traffic'),
  'traffic-germany': trafficCountry('germany', 'Germany traffic'),
};

/** A scope definition from request params: either a registry key, or
 *  a country with an optional exact city and/or theme (the city pages'
 *  shape). Null when the params name nothing real. */
export function resolveExploreDef(params: {
  scope?: string | null;
  country?: string | null;
  city?: string | null;
  theme?: string | null;
}): ExploreScopeDef | null {
  if (params.scope) {
    return EXPLORE_SCOPES[params.scope] ?? null;
  }
  if (params.country) {
    const entry = BY_SLUG.get(params.country);
    if (!entry) return null;
    let theme: ExploreThemeKey | undefined;
    if (params.theme) {
      if (params.theme !== 'traffic' && params.theme !== 'coast' && params.theme !== 'airport') {
        return null;
      }
      theme = params.theme;
    }
    const city = params.city?.trim() ? params.city : undefined;
    return {
      label: city ? `${city}, ${entry.name}` : entry.name,
      slugs: [entry.slug],
      theme,
      city,
      groupBy: 'city',
    };
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Resolved record sets (computed once per instance)                   */
/* ------------------------------------------------------------------ */

const defCache = new Map<string, Promise<CountryCamera[]>>();

function defKey(def: ExploreScopeDef): string {
  const slugs = def.slugs === 'all' ? 'all' : [...def.slugs].sort().join(',');
  return `${slugs}|${def.theme ?? ''}|${def.city ?? ''}|${def.groupBy}`;
}

/** The scope's records, theme/city-filtered and in page order. */
export function recordsForDef(def: ExploreScopeDef): Promise<CountryCamera[]> {
  const key = defKey(def);
  let pending = defCache.get(key);
  if (!pending) {
    pending = (async () => {
      const base =
        def.slugs === 'all' ? await loadAllRecords() : await loadUnion(def.slugs);
      const scope: ExploreScope = { theme: def.theme, city: def.city };
      return sortForExplore(applyScope(base, scope), def.groupBy);
    })();
    defCache.set(key, pending);
  }
  return pending;
}

export async function countForDef(def: ExploreScopeDef): Promise<number> {
  return (await recordsForDef(def)).length;
}

/** The scope's areas (the records' own city values) with counts —
 *  what the top-of-page search offers and the explorer chips show. */
export async function areasForDef(
  def: ExploreScopeDef,
  limit?: number,
): Promise<CameraArea[]> {
  const areas = cameraAreas(await recordsForDef(def));
  return typeof limit === 'number' ? areas.slice(0, limit) : areas;
}
