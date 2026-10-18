import { NextResponse } from 'next/server';
import { parseBboxParam } from '@/lib/streetlevel/bbox';
import { getStreetLevelBbox, getStreetLevelPicture, StreetLevelError } from '@/lib/streetlevel/server';
import { STREET_LEVEL_SOURCE_LABEL } from '@/lib/streetlevel/types';

/**
 * OSIRIS — Street Level: community street-level imagery from Panoramax,
 * proxied and cached server-side (lib/streetlevel).
 *
 *   GET /api/streetlevel?bbox=west,south,east,north — pictures in a
 *       street-scale viewport (span-guarded; the globe only asks at
 *       zoom ≥ 15).
 *   GET /api/streetlevel?picture={id} — one picture, for the viewer's
 *       sequence prev/next navigation.
 *
 * Imagery is community-contributed and dated — every record carries its
 * real capture time and per-picture licence, and the UI never presents
 * it as live.
 *
 * Failure honesty (the launches/airspace precedent): with no cached
 * copy and a provider that does not answer, this is a 502 with an error
 * field and no-store — never a cacheable 200-with-empty that would pose
 * as "no coverage here". An empty pictures array is a real answer only
 * when Panoramax itself answered.
 */

export const dynamic = 'force-dynamic';

const ID_SHAPE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;

  const pictureId = params.get('picture');
  if (pictureId) {
    if (!ID_SHAPE.test(pictureId)) {
      return NextResponse.json(
        { picture: null, source: STREET_LEVEL_SOURCE_LABEL, error: 'picture must be a Panoramax picture id (UUID)' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } },
      );
    }
    try {
      const payload = await getStreetLevelPicture(pictureId);
      return NextResponse.json(payload, {
        headers: { 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600' },
      });
    } catch (e) {
      const notFound = e instanceof StreetLevelError && e.kind === 'not-found';
      return NextResponse.json(
        {
          picture: null,
          source: STREET_LEVEL_SOURCE_LABEL,
          error: notFound
            ? 'That picture is not available on Panoramax.'
            : 'Street-level picture unavailable — Panoramax did not answer and no cached copy exists yet.',
        },
        { status: notFound ? 404 : 502, headers: { 'Cache-Control': 'no-store' } },
      );
    }
  }

  const bbox = parseBboxParam(params.get('bbox'));
  if (!bbox) {
    return NextResponse.json(
      { pictures: [], source: STREET_LEVEL_SOURCE_LABEL, error: 'bbox must be west,south,east,north with span ≤ 2°' },
      { status: 400, headers: { 'Cache-Control': 'public, s-maxage=60' } },
    );
  }
  try {
    const payload = await getStreetLevelBbox(bbox);
    return NextResponse.json(payload, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
    });
  } catch {
    return NextResponse.json(
      {
        pictures: [],
        truncated: false,
        source: STREET_LEVEL_SOURCE_LABEL,
        error: 'Street-level data unavailable — Panoramax did not answer and no cached copy exists yet.',
      },
      { status: 502, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
