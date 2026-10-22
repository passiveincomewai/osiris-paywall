import { recordsForDef, resolveExploreDef } from '@/lib/explore-data';
import { sliceExplore } from '@/lib/explore-scopes';

/**
 * OSIRIS — directory explorer batches for the non-country directory
 * pages (region hubs, category hubs, the traffic family, city pages).
 *
 * GET /api/cctv/explore?scope=<registry key>&offset=0&limit=48&area=<city>&q=<text>
 * GET /api/cctv/explore?country=<slug>&city=<city>&offset=0&limit=48&q=<text>
 *   → { scope: { label }, total, offset, limit, cities, cameras }
 *
 * The country endpoint (/api/cctv/country/<slug>) serves one country;
 * this is its sibling for the scopes defined in lib/explore-data —
 * unions of country chunks (regions), theme-filtered sets over the
 * catalogue (traffic / coast / airport rules in lib/explore-scopes),
 * and exact-city sets for the city pages. Filtering and slicing share
 * the country pages' semantics exactly (lib/country-slices), so a city
 * filter behaves the same wherever a visitor meets it.
 *
 * An unknown scope or country is a real 404 — a page for a scope the
 * catalogue doesn't hold should not pretend to exist.
 */

const fail = (status: number, error: string) =>
  Response.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } });

function numParam(raw: string | null): number | undefined {
  if (raw === null || raw.trim() === '') return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const def = resolveExploreDef({
    scope: url.searchParams.get('scope'),
    country: url.searchParams.get('country'),
    city: url.searchParams.get('city'),
    theme: url.searchParams.get('theme'),
  });
  if (!def) return fail(404, 'No explorer scope matches those parameters');

  let slice;
  try {
    const records = await recordsForDef(def);
    slice = sliceExplore(records, {}, def.groupBy, {
      offset: numParam(url.searchParams.get('offset')),
      limit: numParam(url.searchParams.get('limit')),
      city: url.searchParams.get('area'),
      query: url.searchParams.get('q') ?? undefined,
    });
  } catch {
    return fail(500, 'The camera list could not be loaded');
  }

  return Response.json(
    {
      scope: { label: def.label },
      total: slice.total,
      offset: slice.offset,
      limit: slice.limit,
      cities: slice.cities,
      cameras: slice.cameras,
    },
    {
      headers: {
        // The data changes only when the catalogue is regenerated and
        // the site redeployed; an hour of shared cache is honest freshness.
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    },
  );
}
