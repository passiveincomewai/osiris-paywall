import { NextResponse } from 'next/server';
import {
  parsePlanespottersPhoto, planespottersHexUrl, planespottersRegUrl,
  PLANESPOTTERS_USER_AGENT, type AircraftPhoto,
} from '@/lib/aircraft-photo';

export const maxDuration = 15;

/**
 * OSIRIS — Aircraft photo lookup (Planespotters.net).
 *
 * Powers the photo at the top of the aircraft panel. Tail-specific
 * only: hex first, registration second, and NO type fallback — the
 * public API has no type search, and a type photo dressed as the
 * airframe would be a lie. Every failure is a quiet { found: false }:
 * a missing photo must never error or block the panel.
 *
 * Caching: hits are cached a day in-process (photos don't change),
 * misses an hour (a new upload shouldn't wait a day to appear), and
 * the response itself is browser-cacheable for an hour.
 */

const HIT_TTL_MS = 24 * 60 * 60 * 1000;
const MISS_TTL_MS = 60 * 60 * 1000;
const CACHE_CAP = 500;
const cache = new Map<string, { at: number; photo: AircraftPhoto | null }>();

function cacheGet(key: string): AircraftPhoto | null | undefined {
  const hit = cache.get(key);
  if (!hit) return undefined;
  const ttl = hit.photo ? HIT_TTL_MS : MISS_TTL_MS;
  if (Date.now() - hit.at > ttl) { cache.delete(key); return undefined; }
  return hit.photo;
}

function cacheSet(key: string, photo: AircraftPhoto | null): void {
  if (cache.size >= CACHE_CAP) cache.delete(cache.keys().next().value as string);
  cache.set(key, { at: Date.now(), photo });
}

async function lookup(url: string, via: 'hex' | 'reg'): Promise<AircraftPhoto | null> {
  try {
    const r = await fetch(url, {
      headers: { Accept: 'application/json', 'User-Agent': PLANESPOTTERS_USER_AGENT },
      signal: AbortSignal.timeout(6000),
    });
    if (!r.ok) return null;
    return parsePlanespottersPhoto(await r.json(), via);
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const hex = (q.get('hex') || '').trim().toLowerCase();
  const reg = (q.get('reg') || '').trim().toUpperCase();
  const headers = { 'Cache-Control': 'public, max-age=3600' };
  if (!hex && !reg) return NextResponse.json({ found: false }, { headers });

  const key = hex ? `hex:${hex}` : `reg:${reg}`;
  const cached = cacheGet(key);
  if (cached !== undefined) {
    return NextResponse.json(cached ? { found: true, ...cached } : { found: false }, { headers });
  }

  let photo: AircraftPhoto | null = null;
  if (hex) photo = await lookup(planespottersHexUrl(hex), 'hex');
  if (!photo && reg) photo = await lookup(planespottersRegUrl(reg), 'reg');

  cacheSet(key, photo);
  return NextResponse.json(photo ? { found: true, ...photo } : { found: false }, { headers });
}
