import { loadAllRecords } from '@/lib/explore-data';
import {
  playableRouletteCameras,
  sampleRoulettePool,
  type RouletteCamera,
} from '@/lib/random-camera';

/**
 * OSIRIS — Random Camera Roulette pool dealer.
 *
 * GET /api/random-cameras?count=24 → { cameras: RouletteCamera[] }
 *
 * Deals a fresh country-stratified pool of playable catalogue cameras
 * for the /random game (see lib/random-camera for the dealing rules:
 * only feeds the site's viewer plays natively, never two cameras from
 * the same country back to back). The page server-renders its first
 * pool; the game tops up from here as the player burns through it, so
 * a session is not limited to the pool baked at page load.
 *
 * The playable set is computed once per instance from the same
 * generated catalogue the country pages serve — every dealt camera is
 * a real catalogue record with its real feed URL.
 */

let playableCache: Promise<RouletteCamera[]> | null = null;

function playable(): Promise<RouletteCamera[]> {
  if (!playableCache) {
    playableCache = loadAllRecords().then((records) =>
      playableRouletteCameras(records),
    );
  }
  return playableCache;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const raw = Number(url.searchParams.get('count'));
  const count = Number.isFinite(raw)
    ? Math.min(48, Math.max(1, Math.floor(raw)))
    : 24;
  const cameras = sampleRoulettePool(await playable(), count);
  return Response.json(
    { cameras },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
