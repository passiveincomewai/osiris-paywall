import { NextResponse } from 'next/server';
import { TRANSIT_AGENCIES } from '@/lib/transit/agencies';

/**
 * OSIRIS — Live Transit agency directory: the client-side half of the
 * config in lib/transit/agencies (no feed URLs — vehicles are proxied
 * per agency by /api/transit/vehicles). Static; cached for an hour.
 */

export const dynamic = 'force-dynamic';

export async function GET() {
  const agencies = TRANSIT_AGENCIES.map(a => ({
    id: a.id,
    name: a.name,
    region: a.region,
    center: a.center,
    bounds: a.bounds,
    modes: [...new Set([a.defaultMode, ...(a.routeModeRules ?? []).map(r => r.mode)])],
    attribution: a.attribution,
  }));
  return NextResponse.json(
    { agencies, count: agencies.length },
    { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } },
  );
}
