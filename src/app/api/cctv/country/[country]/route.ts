import index from '@/data/camera-countries.json';
import { sliceCountryCameras, type CountrySlice } from '@/lib/country-slices';
import { unifyOklahomaChunkRecords } from '@/lib/oklahoma-unify';
import { derivedCityForCamera } from '@/lib/us-places';
import type { CountryCamera } from '@/lib/country-cameras';

/**
 * OSIRIS — one country's cameras, in batches.
 *
 * GET /api/cctv/country/<slug>?offset=0&limit=48&city=<city>&q=<text>
 *   → { country: { slug, name, count }, total, offset, limit, cities, cameras }
 *
 * The records come from the generated per-country data (tools/
 * build-country-pages.mjs — derived from the served catalogue, deduped,
 * stored in page order). Each country's file is imported only when that
 * country is asked for: the United States' ten megabytes never ride along
 * with a request for Thailand. Filtering (city, free text) happens here,
 * over the whole country, so finding one camera among forty thousand
 * costs one small response instead of the whole list.
 *
 * An unknown slug is a real 404 — a country page for a country the
 * catalogue doesn't hold should not pretend to exist.
 */

interface CountryIndexEntry {
  slug: string;
  name: string;
  count: number;
}

const COUNTRIES = (index as { countries: CountryIndexEntry[] }).countries;
const BY_SLUG = new Map(COUNTRIES.map(c => [c.slug, c]));

const chunkCache = new Map<string, Promise<CountryCamera[]>>();

function loadCountry(slug: string): Promise<CountryCamera[]> {
  let pending = chunkCache.get(slug);
  if (!pending) {
    pending = (async () => {
      const mod = await import(`@/data/countries/${slug}.json`);
      const records = ((mod as { default?: unknown }).default ?? mod) as CountryCamera[];
      /* Same Oklahoma unification as lib/explore-data: this route
         serves the country pages' playable grids, so its US records
         get the same live ODOT refresh (lib/oklahoma-unify). */
      return slug === 'united-states' ? unifyOklahomaChunkRecords(records) : records;
    })();
    chunkCache.set(slug, pending);
  }
  return pending;
}

const fail = (status: number, error: string) =>
  Response.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } });

function numParam(raw: string | null): number | undefined {
  if (raw === null || raw.trim() === '') return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ country: string }> },
) {
  const { country: slug } = await params;
  const entry = BY_SLUG.get(slug);
  if (!entry) return fail(404, `No country page for "${slug}"`);

  const url = new URL(request.url);
  let slice: CountrySlice;
  try {
    const records = await loadCountry(slug);
    slice = sliceCountryCameras(records, {
      offset: numParam(url.searchParams.get('offset')),
      limit: numParam(url.searchParams.get('limit')),
      city: url.searchParams.get('city'),
      query: url.searchParams.get('q') ?? undefined,
      // US DOT feeds file some cameras under the state name; the
      // derived-place resolver (src/data/us-camera-places.json) lets
      // those cameras group, filter and search under their real city.
      // Other countries pass no resolver and slice as before.
      placeFor: slug === 'united-states' ? derivedCityForCamera : undefined,
    });
  } catch {
    return fail(500, 'The country camera list could not be loaded');
  }

  return Response.json(
    {
      country: { slug: entry.slug, name: entry.name, count: entry.count },
      total: slice.total,
      offset: slice.offset,
      limit: slice.limit,
      cities: slice.cities,
      cameras: slice.cameras,
    },
    {
      headers: {
        // The data changes only when the catalogue is regenerated and the
        // site redeployed; an hour of shared cache is honest freshness.
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    },
  );
}
