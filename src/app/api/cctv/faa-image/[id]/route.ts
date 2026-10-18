import { NextResponse } from 'next/server';
import { stealthFetch } from '@/lib/stealthFetch';
import { faaLastImageUrl, parseFaaLastImage } from '../../faa';

export const dynamic = 'force-dynamic';
export const maxDuration = 15;

/**
 * Resolves an FAA WeatherCams camera to its current frame.
 *
 * The FAA publishes no stable "latest image" URL — every frame lives at a
 * timestamped address that only its API can name. FAA catalogue records
 * therefore carry this route as their feed_url; the viewer's periodic
 * refresh re-asks here, and each answer is a redirect to the frame the FAA
 * most recently captured. Nothing is proxied or copied: the browser loads
 * the image from the FAA's own host, exactly as it does for every other
 * camera in the catalogue.
 *
 * Resolutions are cached briefly (a weather camera's frame changes on the
 * order of minutes), so a popular camera costs the FAA one lookup a minute
 * rather than one per viewer refresh.
 */

const OK_TTL_MS = 60_000;
const MISS_TTL_MS = 30_000; // 'no frame right now' and network failures are
                            // both weaker claims than a frame URL — revisit
                            // them sooner rather than freezing a camera.

const cache = new Map<number, { at: number; ttl: number; imageUri: string | null }>();

async function resolveImage(cameraId: number): Promise<string | null> {
  const hit = cache.get(cameraId);
  if (hit && Date.now() - hit.at <= hit.ttl) return hit.imageUri;

  let imageUri: string | null = null;
  try {
    const res = await stealthFetch(faaLastImageUrl(cameraId), {
      signal: AbortSignal.timeout(10000),
      headers: { Referer: 'https://weathercams.faa.gov/', Accept: 'application/json' },
    });
    if (res.ok) imageUri = parseFaaLastImage(await res.json());
  } catch {
    imageUri = null;
  }

  cache.set(cameraId, {
    at: Date.now(),
    ttl: imageUri ? OK_TTL_MS : MISS_TTL_MS,
    imageUri,
  });
  if (cache.size > 2000) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  return imageUri;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!/^\d{1,10}$/.test(id)) {
    return NextResponse.json({ error: 'invalid camera id' }, { status: 400 });
  }

  const imageUri = await resolveImage(Number(id));
  if (!imageUri) {
    return NextResponse.json(
      { error: 'no current frame for this camera' },
      { status: 404, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  return NextResponse.redirect(imageUri, {
    status: 302,
    headers: { 'Cache-Control': 'public, max-age=60, s-maxage=60' },
  });
}
