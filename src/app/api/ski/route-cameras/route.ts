import { NextResponse } from 'next/server';
import index from '@/data/camera-countries.json';
import {
  isSnowStakeCamera,
  loadCountryChunk,
  selectRouteCameras,
  ROUTE_CORRIDOR_KM,
} from '@/lib/ski-resorts';

export const maxDuration = 30;

/**
 * OSIRIS — cameras along a driving route, for the ski resort pages'
 * route tool.
 *
 * POST { countries: string[], route: [lng, lat][] }
 *   → { total, corridorKm, cameras: [{ ...record, alongKm, offKm }] }
 *
 * The client plans the route with the site's own /api/directions
 * (Valhalla/OSRM, keyless) and posts the resulting polyline here. The
 * records come from the same generated per-country chunks the country
 * pages serve — there is no second camera database — restricted to the
 * country chunks the caller names (a ski trip's origin and destination
 * share one in all but a few border cases, and the resort page knows
 * its own). Selection is the corridor rule in lib/ski-resorts: within
 * ROUTE_CORRIDOR_KM of the line, ordered by progress along it.
 */

const KNOWN_COUNTRIES = new Set(
  (index as { countries: Array<{ slug: string }> }).countries.map(c => c.slug),
);

/** A long drive is a few thousand shape points; past this the corridor
 *  answer stops changing and the payload is just bulk. */
const MAX_ROUTE_POINTS = 6000;
const MAX_CAMERAS = 300;

interface RouteCamerasBody {
  countries?: unknown;
  route?: unknown;
}

function isRoutePoint(p: unknown): p is [number, number] {
  return (
    Array.isArray(p) &&
    p.length === 2 &&
    Number.isFinite(p[0]) &&
    Number.isFinite(p[1]) &&
    (p[1] as number) >= -90 &&
    (p[1] as number) <= 90 &&
    (p[0] as number) >= -180 &&
    (p[0] as number) <= 180
  );
}

export async function POST(request: Request) {
  let body: RouteCamerasBody;
  try {
    body = (await request.json()) as RouteCamerasBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const countries = Array.isArray(body.countries)
    ? [...new Set(body.countries.filter((c): c is string => typeof c === 'string' && KNOWN_COUNTRIES.has(c)))].slice(0, 3)
    : [];
  if (countries.length === 0) {
    return NextResponse.json({ error: 'countries must name at least one known country slug' }, { status: 400 });
  }

  if (!Array.isArray(body.route) || body.route.length < 2 || !body.route.every(isRoutePoint)) {
    return NextResponse.json({ error: 'route must be an array of at least two [lng, lat] points' }, { status: 400 });
  }
  const route = body.route.slice(0, MAX_ROUTE_POINTS) as [number, number][];

  try {
    const chunks = await Promise.all(countries.map(loadCountryChunk));
    const found = selectRouteCameras(chunks.flat(), route);
    return NextResponse.json(
      {
        total: found.length,
        corridorKm: ROUTE_CORRIDOR_KM,
        cameras: found.slice(0, MAX_CAMERAS).map(f => ({
          ...f.cam,
          alongKm: Math.round(f.alongKm * 10) / 10,
          offKm: Math.round(f.offKm * 100) / 100,
          /* Classified here, with the canonical name rule, so the
             route tool can give snow stakes their own section without
             re-implementing the pattern client-side. */
          snowStake: isSnowStakeCamera(f.cam),
        })),
      },
      { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } },
    );
  } catch {
    return NextResponse.json({ error: 'The camera index could not be loaded' }, { status: 500 });
  }
}
