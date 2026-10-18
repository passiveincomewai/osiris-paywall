import { NextResponse } from 'next/server';

/**
 * OSIRIS — Traffic layer capability status.
 *
 * Tells the client whether a TomTom API key is configured SERVER-side
 * (its value is never sent — only the boolean). With a key, the traffic
 * layer samples live TomTom flow and labels congestion accordingly;
 * without one it runs the clearly-labeled simulated model. See
 * docs/traffic.md.
 */

export const dynamic = 'force-dynamic';

export async function GET() {
  const tomtom = typeof process.env.TOMTOM_API_KEY === 'string' && process.env.TOMTOM_API_KEY.length > 0;
  return NextResponse.json(
    { tomtom, congestion: tomtom ? 'tomtom' : 'simulated' },
    { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } },
  );
}
