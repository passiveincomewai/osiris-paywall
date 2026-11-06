import { NextResponse } from 'next/server';
import { cachedSource } from '@/lib/sourceCache';
import {
  fetchNaturalEvents,
  type NaturalEvent,
} from '@/lib/events/eonet';

export const dynamic = 'force-dynamic';

/**
 * OSIRIS — Natural Events API (NASA EONET)
 *
 * The globe's Natural Events layer reads here. EONET's open-events feed
 * is normalized by lib/events/eonet (ten additive categories — wildfires
 * and earthquakes stay with their dedicated FIRMS/USGS layers) and held
 * in the shared source cache: one upstream read per window however many
 * dashboards ask, and the last good list survives an upstream outage.
 * Fail-soft by contract: readers always get 200 with an events array —
 * `stale` says whether it came from a live read inside the TTL.
 */

const TTL_MS = 10 * 60_000;

/** When the upstream last answered successfully IN THIS PROCESS. */
let lastLiveFetchAt: number | null = null;

const loadEvents = cachedSource<NaturalEvent>(
  'eonet:events',
  async () => {
    const events = await fetchNaturalEvents();
    lastLiveFetchAt = Date.now();
    return events;
  },
  TTL_MS,
);

export async function GET() {
  const events = await loadEvents();
  const stale = lastLiveFetchAt === null || Date.now() - lastLiveFetchAt > TTL_MS;
  return NextResponse.json(
    {
      events,
      total: events.length,
      source: 'NASA EONET',
      stale,
      fetchedAt: lastLiveFetchAt ? new Date(lastLiveFetchAt).toISOString() : null,
      timestamp: new Date().toISOString(),
    },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1200',
      },
    },
  );
}
