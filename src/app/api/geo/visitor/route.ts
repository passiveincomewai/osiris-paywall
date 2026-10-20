import { NextResponse } from 'next/server';
import { parseVercelGeoHeaders } from '@/lib/visitor-geo';

/* The answer is one visitor's location. No cache, shared or otherwise, may
   hand it to the next visitor — same rule as /api/geo. */
const NO_STORE = { 'Cache-Control': 'private, no-store' };

/**
 * The visitor's approximate location from the platform's geo headers
 * (x-vercel-ip-*), stamped by Vercel's edge on every request. No
 * third-party lookup, no IP handling, no permission prompt: when the
 * headers are absent (local dev, non-Vercel hosting, an unlocatable
 * network) the answer is simply { status: 'fail' } and the client keeps
 * its previous behaviour. Precision is city level at best — consumers
 * must label accordingly (see lib/visitor-geo.ts).
 */
export async function GET(request: Request) {
  const loc = parseVercelGeoHeaders((name) => request.headers.get(name));
  if (!loc) {
    return NextResponse.json({ status: 'fail' }, { headers: NO_STORE });
  }
  return NextResponse.json(
    {
      status: 'success',
      lat: loc.lat,
      lon: loc.lng,
      city: loc.city,
      region: loc.region,
      country: loc.country,
    },
    { headers: NO_STORE },
  );
}
