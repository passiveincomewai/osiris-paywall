import { NextResponse } from 'next/server';
import { loadSunriseSelection } from '@/lib/sunrise-server';
import type { SunMode } from '@/lib/sunrise';

/**
 * The Sunrise Around the World selection, live: the cameras whose sunrise
 * (or sunset, ?mode=sunset) is happening within the window around the
 * request moment, computed from the served catalogue and the site's solar
 * model (lib/sunrise). The page polls this every minute; the dawn line
 * moves 0.25° of longitude per minute, so a 60-second cache keeps the
 * answer honest without re-running the selection per visitor.
 */
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode: SunMode = url.searchParams.get('mode') === 'sunset' ? 'sunset' : 'sunrise';
  const selection = await loadSunriseSelection(mode, new Date(), url.origin);
  return NextResponse.json(selection, {
    headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' },
  });
}
