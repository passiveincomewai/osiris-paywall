import { NextResponse } from 'next/server';
import { loadDirectoryIndex } from '@/lib/camera-directory-lookup';
import { searchCameras, toCameraPick, type CameraPick } from '@/lib/camera-distance';

/**
 * Camera Distance Finder — picker search over the real catalogue.
 *
 * GET /api/tools/camera-distance?q=<text> → { results: CameraPick[] }
 *
 * The catalogue searched is the directory dataset (src/data/countries
 * chunks) — the same records the country/city pages are built from and
 * the globe's by-id fallback resolves — loaded once per server
 * instance through lib/camera-directory-lookup, the site's existing
 * loader. Only records with usable coordinates can be picked (a
 * distance needs two points), and results carry city + country so
 * same-named cameras in different places can be told apart.
 */

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_QUERY_CHARS = 80;
const RESULT_LIMIT = 12;

let searchablePromise: Promise<CameraPick[]> | null = null;

/** Every pickable catalogue record, built once from the directory index. */
function loadSearchable(): Promise<CameraPick[]> {
  if (!searchablePromise) {
    searchablePromise = loadDirectoryIndex().then(byId => {
      const picks: CameraPick[] = [];
      for (const cam of byId.values()) {
        const pick = toCameraPick(cam);
        if (pick) picks.push(pick);
      }
      return picks;
    });
  }
  return searchablePromise;
}

export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get('q') ?? '').slice(0, MAX_QUERY_CHARS);
  if (q.trim().length < 2) {
    return NextResponse.json(
      { results: [] },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  }
  const catalogue = await loadSearchable();
  const results = searchCameras(catalogue, q, RESULT_LIMIT);
  return NextResponse.json(
    { results },
    { headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600' } },
  );
}
