import { NextResponse } from 'next/server';
import { getPlows, getPlowFeedStatus } from '@/lib/plows';

/**
 * OSIRIS — Snow Plows: live winter-maintenance vehicle positions.
 *
 * Iowa DOT's public AVL FeatureServer is the one verified keyless plow
 * feed (see lib/plows for the probe record: the IBI 511 sibling
 * endpoints and Finland's Digitraffic were both checked). The pipeline
 * lives in lib/plows — this route keeps the response shape:
 * { plows, total, stale, source, timestamp }.
 *
 * `stale` is the honesty flag: true when the latest upstream refresh
 * failed (and any plows present are the cache's last good set), or
 * when nothing has ever been fetched. A down feed yields an empty
 * set, never invented positions. Source: Iowa DOT —
 * https://data.iowadot.gov/ (Snow Plow Truck Location AVL)
 */

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const plows = await getPlows();
    const status = getPlowFeedStatus();
    const stale = status.ok !== true;
    return NextResponse.json(
      {
        plows,
        total: plows.length,
        stale,
        source: 'Iowa DOT',
        timestamp: status.fetchedAt ?? new Date().toISOString(),
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=60',
        },
      },
    );
  } catch {
    return NextResponse.json(
      { plows: [], total: 0, stale: true, source: 'Iowa DOT', timestamp: new Date().toISOString() },
      { status: 200, headers: { 'Cache-Control': 'public, s-maxage=30' } },
    );
  }
}
