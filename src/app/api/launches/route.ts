import { NextResponse } from 'next/server';
import { getLaunchesPayload } from '@/lib/launches/server';
import { LAUNCH_SOURCE_LABEL } from '@/lib/launches/types';

/**
 * OSIRIS — Space Missions: rocket launch data from Launch Library 2
 * (The Space Devs), proxied and cached server-side.
 *
 * LL2's anonymous tier is 15 calls/hour across ALL consumers, so clients
 * never call it directly: lib/launches/server caps upstream traffic at
 * ~5 calls/hour (15-min upcoming cache, 60-min previous cache,
 * stale-on-error) and this route adds a CDN cache on top. Terms permit
 * use with value added; attribution ships in the payload and the UI:
 * "Launch Library 2 · The Space Devs".
 *
 * Failure honesty (the drones/airspace precedent): with no cached copy
 * and a dead upstream this is a 502 with an error field and no-store —
 * never a cacheable 200-with-empty that would pose as "no launches".
 */

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const payload = await getLaunchesPayload();
    return NextResponse.json(payload, {
      headers: {
        'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=1800',
      },
    });
  } catch {
    return NextResponse.json(
      {
        upcoming: [],
        previous: [],
        source: LAUNCH_SOURCE_LABEL,
        error: 'Launch data unavailable — Launch Library 2 did not answer and no cached copy exists yet.',
      },
      { status: 502, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
