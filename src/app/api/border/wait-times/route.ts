import { NextResponse } from 'next/server';
import { getBorderFeedStatus, getBorderWaitTimes } from '@/lib/border/wait-times';

/**
 * OSIRIS — Border Wait Times: CBP's published crossing delays.
 *
 * One verified keyless feed, normalized in lib/border/wait-times:
 * U.S. Customs and Border Protection's Border Wait Times JSON (the
 * data behind bwt.cbp.gov) — 85 port records with per-lane delay
 * minutes, lanes open and CBP's own update phrasing, cached 4 minutes
 * server-side with stale-on-error bridging.
 *
 * `?ports=250401,250407` narrows the response to the given CBP port
 * numbers (the crossing pages' shape); without it, every port in the
 * feed is returned. `stale` is the honesty flag: true when the latest
 * upstream refresh failed (and any ports shown are the cache's last
 * good set) or when nothing has ever been fetched — a down feed
 * yields an empty set, never invented waits.
 * Source: U.S. Customs and Border Protection —
 * https://bwt.cbp.gov/api/waittimes
 */

export const dynamic = 'force-dynamic';

const SOURCE_LABEL = 'U.S. Customs and Border Protection (Border Wait Times)';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const portsParam = url.searchParams.get('ports');
  const wanted = portsParam
    ? new Set(
        portsParam
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      )
    : null;
  try {
    const result = await getBorderWaitTimes();
    const ports = wanted
      ? result.ports.filter((p) => wanted.has(p.portNumber))
      : result.ports;
    return NextResponse.json(
      {
        ports,
        total: ports.length,
        stale: result.stale,
        source: SOURCE_LABEL,
        timestamp: result.fetchedAt ?? new Date().toISOString(),
        fetchedAt: result.fetchedAt,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      },
    );
  } catch {
    const status = getBorderFeedStatus();
    return NextResponse.json(
      {
        ports: [],
        total: 0,
        stale: true,
        source: SOURCE_LABEL,
        timestamp: new Date().toISOString(),
        fetchedAt: status.fetchedAt,
      },
      { status: 200, headers: { 'Cache-Control': 'public, s-maxage=30' } },
    );
  }
}
