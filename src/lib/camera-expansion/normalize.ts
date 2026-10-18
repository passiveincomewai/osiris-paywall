import { proxiedImageUrl, type CctvCamera, type CctvStreamType } from '../../app/api/cctv/types';

/**
 * Camera expansion — OpenCCTV record normalization.
 *
 * A deliberate mirror of `mapRecord` in src/app/api/cctv/opencctv.ts (the
 * production Asia sampler): same skip rules, same id convention
 * (`occ-<upstream id>` — deterministic in (provider, upstream id), which is
 * what makes regenerating the harvest idempotent), same `OpenCCTV / <source>`
 * label. It lives here, dependency-free, so the offline harvest tool and the
 * unit tests can run it without the server module graph. Two harvest-only
 * tightenings, both recorded as skip reasons rather than silent drops:
 *   - feed URLs must be http(s) — OpenCCTV carries pseudo-URL families
 *     (faa-weathercam://…) that are not feeds at all (audit §2.1);
 *   - Windy-hosted feeds are refused whatever family they arrive under
 *     (audit §3.4 — Windy catalog terms).
 */

/** One row from OpenCCTV's /api/cameras/batch (only the fields we consume). */
export interface OccRawRecord {
  id?: string;
  name?: string | null;
  city?: string | null;
  country?: string | null;
  lat?: number;
  lng?: number;
  feed_url?: string | null;
  feed_type?: string | null;
  source?: string | null;
  active?: number;
  cache_buster_breaks_url?: boolean;
}

export type SkipReason =
  | 'inactive-or-missing-id'
  | 'missing-feed-url'
  | 'non-http-feed-url'
  | 'windy-host'
  | 'covered-host'
  | 'offline-placeholder-path'
  | 'unknown-feed-type'
  | 'invalid-coordinates'
  | 'cache-buster-breaks-still';

/** Hosts another module already fetches in full — mirrors opencctv.ts. */
const COVERED_ELSEWHERE = ['eismoinfo.lt'];

function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

export function isHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/** OpenCCTV's `feed_type` in the catalogue's vocabulary; null = unusable. */
export function occStreamKind(feedType?: string | null): CctvStreamType | 'jpg' | null {
  switch ((feedType || '').toLowerCase()) {
    case 'm3u8':
    case 'hls': return 'hls';
    case 'mjpeg': return 'mjpeg';
    case 'image': return 'jpg';
    case 'iframe': return 'iframe';
    default: return null;
  }
}

export interface NormalizedOcc {
  camera: CctvCamera;
  /** The OpenCCTV source family slug, e.g. `state511`. */
  family: string;
  /** The URL the generation-time probe should verify. */
  probeUrl: string;
  probeKind: 'image' | 'hls' | 'iframe' | 'mjpeg' | 'mp4';
}

/** Map one OpenCCTV record to a catalogue camera, or say why it is skipped. */
export function normalizeOccRecord(rec: OccRawRecord): { ok: true; value: NormalizedOcc } | { ok: false; reason: SkipReason } {
  if (!rec?.id || rec.active === 0) return { ok: false, reason: 'inactive-or-missing-id' };

  const url = rec.feed_url?.trim();
  if (!url) return { ok: false, reason: 'missing-feed-url' };
  if (!isHttpUrl(url)) return { ok: false, reason: 'non-http-feed-url' };

  const host = hostOf(url);
  if (host && (host === 'windy.com' || host.endsWith('.windy.com'))) return { ok: false, reason: 'windy-host' };
  if (host && COVERED_ELSEWHERE.some(h => host === h || host.endsWith('.' + h))) return { ok: false, reason: 'covered-host' };
  /* Malaysia's LLM cameras point at the operator's own "camera offline"
     placeholder while a camera is down, and that path 404s (opencctv.ts). */
  if (/\/offcam\//i.test(url)) return { ok: false, reason: 'offline-placeholder-path' };

  const kind = occStreamKind(rec.feed_type);
  if (!kind) return { ok: false, reason: 'unknown-feed-type' };

  const { lat, lng } = rec;
  if (typeof lat !== 'number' || typeof lng !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { ok: false, reason: 'invalid-coordinates' };
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180 || (lat === 0 && lng === 0)) {
    return { ok: false, reason: 'invalid-coordinates' };
  }

  /* A snapshot tile re-requests with `?_t=` on every refresh; where the
     source records that a query string breaks the URL, the tile would break
     on first refresh (opencctv.ts). */
  if (kind === 'jpg' && rec.cache_buster_breaks_url) return { ok: false, reason: 'cache-buster-breaks-still' };

  const name = rec.name?.trim() || rec.city?.trim() || 'Camera';
  const family = rec.source?.trim() || 'unknown';

  const camera: CctvCamera = {
    id: `occ-${rec.id}`,
    lat,
    lng,
    name,
    city: rec.city?.trim() || '',
    country: rec.country?.trim() || '',
    ...(kind === 'jpg' ? { feed_url: proxiedImageUrl(url) } : { stream_url: url, stream_type: kind }),
    source: rec.source?.trim() ? `OpenCCTV / ${rec.source.trim()}` : 'OpenCCTV',
  };

  return {
    ok: true,
    value: {
      camera,
      family,
      probeUrl: url,
      probeKind: kind === 'jpg' ? 'image' : kind,
    },
  };
}

/** Deterministic catalogue id for an OpenCCTV upstream id. */
export function occCameraId(upstreamId: string): string {
  return `occ-${upstreamId}`;
}
