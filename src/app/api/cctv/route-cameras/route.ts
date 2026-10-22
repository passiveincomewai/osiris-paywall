import { NextResponse } from 'next/server';
import { loadAllRecords } from '@/lib/explore-data';
import { routeCameraResults } from '@/lib/explore-scopes';

/**
 * OSIRIS — cameras along a route, for the public directory pages'
 * route finder (the globe's directions panel has the same feature
 * over its in-memory catalogue; these pages don't load one, so the
 * corridor maths — lib/route-cameras, unchanged — runs here over the
 * generated catalogue the directory pages serve).
 *
 * POST { coordinates: [[lng, lat], …] }   (a route geometry, e.g. the
 *   `geometry.coordinates` of a /api/directions result)
 *   → { total, shown, corridorM, cameras }
 *
 * Only cameras with a playable feed count (lib/camera-preview's rule,
 * the same the globe's route strip applies), within the shared
 * 1.5 km corridor, ordered along the route. The response carries the
 * full catalogue records so the page renders the standard feed cards.
 */

export const runtime = 'nodejs';
/* A cold instance may first have to load the catalogue chunks. */
export const maxDuration = 60;

const MAX_POINTS = 4000;
/** Corridor maths is O(cameras × segments); very long geometries are
 *  sampled down to this many vertices — at driving scale the sampled
 *  polyline is the same road. */
const MAX_SEGMENTS = 1500;

const fail = (status: number, error: string) =>
  NextResponse.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } });

function parseCoordinates(raw: unknown): [number, number][] | null {
  if (!Array.isArray(raw) || raw.length < 2 || raw.length > MAX_POINTS) return null;
  const out: [number, number][] = [];
  for (const p of raw) {
    if (!Array.isArray(p) || p.length !== 2) return null;
    const [lng, lat] = p;
    if (typeof lng !== 'number' || typeof lat !== 'number') return null;
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
    out.push([lng, lat]);
  }
  if (out.length > MAX_SEGMENTS + 1) {
    const step = Math.ceil(out.length / (MAX_SEGMENTS + 1));
    const sampled: [number, number][] = [];
    for (let i = 0; i < out.length; i += step) sampled.push(out[i]);
    if (sampled[sampled.length - 1] !== out[out.length - 1]) sampled.push(out[out.length - 1]);
    return sampled;
  }
  return out;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail(400, 'Request body must be JSON');
  }
  const coordinates = parseCoordinates(
    (body as { coordinates?: unknown } | null)?.coordinates,
  );
  if (!coordinates) {
    return fail(400, 'coordinates must be an array of 2–4000 [lng, lat] pairs');
  }

  try {
    const records = await loadAllRecords();
    const results = routeCameraResults(records, coordinates);
    return NextResponse.json(
      {
        total: results.total,
        shown: results.cameras.length,
        corridorM: results.corridorM,
        cameras: results.cameras,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return fail(500, 'The camera catalogue could not be loaded');
  }
}
