import { NextResponse } from 'next/server';
import { hereConfigured } from '@/lib/traffic/here';
import { wsdotConfigured } from '@/lib/traffic/wsdot';

/**
 * OSIRIS — Traffic layer capability status.
 *
 * Tells the client whether a TomTom API key is configured SERVER-side
 * (its value is never sent — only the boolean). With a key, the traffic
 * layer samples live TomTom flow and labels congestion accordingly;
 * without one it runs the clearly-labeled simulated model. See
 * docs/traffic.md.
 *
 * `flowSources` (added 2026-11-04) reports which measured sources the
 * /api/traffic/flow-segments route can serve: tomtom/here/wsdot by
 * configured key, ndw unconditionally (open data, no key). It is
 * additive — `tomtom` and `congestion` keep their original meaning:
 * the tile overlay the client draws today is TomTom or simulated.
 */

export const dynamic = 'force-dynamic';

export async function GET() {
  const tomtom = typeof process.env.TOMTOM_API_KEY === 'string' && process.env.TOMTOM_API_KEY.length > 0;
  const here = hereConfigured();
  const wsdot = wsdotConfigured();
  return NextResponse.json(
    {
      tomtom,
      congestion: tomtom ? 'tomtom' : 'simulated',
      here,
      flowSources: { tomtom, here, wsdot, ndw: true },
    },
    { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } },
  );
}
