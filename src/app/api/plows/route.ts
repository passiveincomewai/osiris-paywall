import { NextResponse } from 'next/server';
import { getPlows, getPlowFeedStatus } from '@/lib/plows';

/**
 * OSIRIS — Snow Plows: live winter-maintenance vehicle positions.
 *
 * Three verified keyless plow feeds, merged in lib/plows: Iowa DOT's
 * AVL FeatureServer, UDOT's `SnowPlow_AVL_Public` (recency-filtered —
 * it is a last-known-position table), and Vermont AOT's Plow Finder
 * vehicle JSON (slimmed to latest positions, 90-minute staleness
 * gate). Each source is cached and fails independently. The pipeline
 * lives in lib/plows — this route keeps the response shape:
 * { plows, total, stale, source, timestamp }.
 *
 * `stale` is the honesty flag: true when any source's latest upstream
 * refresh failed (and any plows from it are the cache's last good
 * set), or when nothing has ever been fetched. A down feed yields an
 * empty set for its state, never invented positions.
 * Sources: Iowa DOT — https://data.iowadot.gov/ (Snow Plow Truck
 * Location AVL) · Utah DOT — UDOT SnowPlow_AVL_Public (ArcGIS Online)
 * · Vermont AOT — VTrans Plow Finder vehicle JSON.
 */

export const dynamic = 'force-dynamic';

const SOURCE_LABEL = 'Iowa DOT · Utah DOT · Vermont AOT';

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
        source: SOURCE_LABEL,
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
      { plows: [], total: 0, stale: true, source: SOURCE_LABEL, timestamp: new Date().toISOString() },
      { status: 200, headers: { 'Cache-Control': 'public, s-maxage=30' } },
    );
  }
}
