import { NextRequest, NextResponse } from 'next/server';
import {
  TOMTOM_PROXY_MIN_ZOOM, TOMTOM_PROXY_MAX_ZOOM, TOMTOM_TILE_TTL_MS,
} from '@/lib/traffic/config';

/**
 * OSIRIS — TomTom Traffic Flow vector-tile proxy.
 *
 * The browser's MapLibre instance requests /api/traffic/flow/{z}/{x}/{y};
 * the TomTom key lives only in the TOMTOM_API_KEY server env var and is
 * attached here, upstream of the client. Layers of restraint, in order:
 *   • No key configured → 204 (the layer runs its simulated model; the
 *     client learns this from /api/traffic/status and never adds the
 *     source in the first place — this is the belt-and-braces path).
 *   • Zoom outside the city band → 204 (bounds monthly tile spend).
 *   • Per-IP rate limit → 429 (a pan across a city is ~100 tiles; the
 *     allowance is several times that per minute).
 *   • In-instance tile cache (60 s, bounded) on top of the CDN's
 *     s-maxage=60, so a popular viewport costs one upstream pull.
 *   • Upstream failure (bad key, outage) → 502 JSON; tiles simply don't
 *     render and the client falls back to the simulated model. The key
 *     never appears in any response, header, or error.
 */

export const dynamic = 'force-dynamic';

const MAX_CACHE_ENTRIES = 1500;
const RATE_LIMIT_PER_MIN = 900;

interface TileEntry { body: ArrayBuffer; contentType: string; expiresAt: number }
const tileCache = new Map<string, TileEntry>();
const rateWindows = new Map<string, { windowStart: number; count: number }>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const w = rateWindows.get(ip);
  if (!w || now - w.windowStart >= 60_000) {
    rateWindows.set(ip, { windowStart: now, count: 1 });
    if (rateWindows.size > 5000) {
      for (const [k, v] of rateWindows) if (now - v.windowStart >= 60_000) rateWindows.delete(k);
    }
    return false;
  }
  w.count += 1;
  return w.count > RATE_LIMIT_PER_MIN;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ z: string; x: string; y: string }> }) {
  const { z: zs, x: xs, y: ys } = await params;
  const z = Number(zs);
  const x = Number(xs);
  const y = Number(ys);
  if (!Number.isInteger(z) || !Number.isInteger(x) || !Number.isInteger(y) || z < 0 || z > 22 || x < 0 || y < 0 || x >= 2 ** z || y >= 2 ** z) {
    return new NextResponse(null, { status: 400 });
  }
  const key = process.env.TOMTOM_API_KEY;
  if (!key) return new NextResponse(null, { status: 204 });
  if (z < TOMTOM_PROXY_MIN_ZOOM || z > TOMTOM_PROXY_MAX_ZOOM) {
    return new NextResponse(null, { status: 204 });
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (rateLimited(ip)) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429, headers: { 'Retry-After': '30' } });
  }

  const cacheKey = `${z}/${x}/${y}`;
  const cached = tileCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    return new NextResponse(cached.body, {
      status: 200,
      headers: { 'Content-Type': cached.contentType, 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120', 'X-Traffic-Cache': 'hit' },
    });
  }

  let upstream: Response;
  try {
    upstream = await fetch(
      `https://api.tomtom.com/maps/orbis/traffic/flow/vector/tile/${z}/${x}/${y}?apiVersion=2&key=${encodeURIComponent(key)}`,
      { headers: { 'User-Agent': 'WorldEye-Traffic/1.0' }, signal: AbortSignal.timeout(8000) },
    );
  } catch {
    return NextResponse.json({ error: 'upstream_unreachable' }, { status: 502 });
  }
  if (!upstream.ok) {
    return NextResponse.json({ error: 'upstream', status: upstream.status }, { status: 502 });
  }

  const body = await upstream.arrayBuffer();
  const contentType = upstream.headers.get('content-type') ?? 'application/x-protobuf';
  tileCache.set(cacheKey, { body, contentType, expiresAt: Date.now() + TOMTOM_TILE_TTL_MS });
  if (tileCache.size > MAX_CACHE_ENTRIES) {
    for (const k of tileCache.keys()) {
      tileCache.delete(k);
      if (tileCache.size <= MAX_CACHE_ENTRIES) break;
    }
  }
  return new NextResponse(body, {
    status: 200,
    headers: { 'Content-Type': contentType, 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120', 'X-Traffic-Cache': 'miss' },
  });
}
