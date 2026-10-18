/**
 * OSIRIS — Street Level server-side fetch + cache (Panoramax).
 *
 * Every WorldEye client talks to /api/streetlevel, never to Panoramax
 * directly: the federation meta-catalogue is a shared community
 * resource, so this service is the only code that calls upstream and it
 * behaves like a good citizen —
 *
 *   • viewport results cache for 10 min on a quantized bbox grid (the
 *     fetch is margined + filtered back to the exact request bbox, so
 *     nearby pans share one upstream call without ever showing
 *     pictures from outside the area asked for);
 *   • single pictures cache for 30 min (a published picture does not
 *     change);
 *   • concurrent misses share one in-flight request;
 *   • stale-on-error: a failed refresh serves the last good copy,
 *     flagged `stale` with its original fetch time. Only a cold cache
 *     plus a dead upstream is an error — and it is an ERROR (the route
 *     answers 502), never a cacheable empty success posing as
 *     "no coverage here". Coverage emptiness is a real answer only
 *     when the provider itself said so.
 */
import { bboxCacheKey, bboxContains, expandBbox, type LngLatBbox } from './bbox';
import { PANORAMAX_DEFAULT_BASE, panoramaxProvider } from './panoramax';
import {
  STREET_LEVEL_MAX_RESULTS,
  STREET_LEVEL_SOURCE_LABEL,
  type StreetLevelBboxPayload,
  type StreetPicture,
  type StreetPicturePayload,
} from './types';

export const BBOX_TTL_MS = 10 * 60_000;
export const PICTURE_TTL_MS = 30 * 60_000;
const MAX_BBOX_ENTRIES = 200;
const MAX_PICTURE_ENTRIES = 500;
/** Fetch margin behind the quantized cache key (fraction of span). */
const FETCH_MARGIN = 0.5;

export class StreetLevelError extends Error {
  kind: 'unavailable' | 'not-found';
  constructor(kind: 'unavailable' | 'not-found', message: string) {
    super(message);
    this.kind = kind;
  }
}

export interface StreetLevelServiceDeps {
  fetchJson: (url: string) => Promise<unknown>;
  now?: () => number;
  base?: string;
}

interface BboxEntry {
  pictures: StreetPicture[];
  truncated: boolean;
  fetchedAt: number;
  hasData: boolean;
  inflight: Promise<void> | null;
}

export function createStreetLevelService(deps: StreetLevelServiceDeps) {
  const now = deps.now ?? (() => Date.now());
  const base = (deps.base ?? PANORAMAX_DEFAULT_BASE).replace(/\/+$/, '');
  const provider = panoramaxProvider;
  let upstreamCalls = 0;

  const bboxCache = new Map<string, BboxEntry>();
  const pictureCache = new Map<string, { picture: StreetPicture; fetchedAt: number }>();

  const rememberPicture = (pic: StreetPicture, fetchedAt: number) => {
    pictureCache.set(pic.id, { picture: pic, fetchedAt });
    if (pictureCache.size > MAX_PICTURE_ENTRIES) {
      for (const key of pictureCache.keys()) {
        if (pictureCache.size <= MAX_PICTURE_ENTRIES) break;
        pictureCache.delete(key);
      }
    }
  };

  async function refreshBbox(key: string, requestBbox: LngLatBbox): Promise<void> {
    const entry = bboxCache.get(key);
    if (!entry || entry.inflight) return;
    entry.inflight = (async () => {
      try {
        upstreamCalls++;
        const fetchArea = expandBbox(requestBbox, FETCH_MARGIN);
        const json = await deps.fetchJson(provider.searchUrl(base, fetchArea, STREET_LEVEL_MAX_RESULTS));
        const { pictures, truncated } = provider.normalizeSearch(json, STREET_LEVEL_MAX_RESULTS, base);
        entry.pictures = pictures;
        entry.truncated = truncated;
        entry.fetchedAt = now();
        entry.hasData = true;
        pictures.forEach((p) => rememberPicture(p, entry.fetchedAt));
      } finally {
        entry.inflight = null;
      }
    })();
    return entry.inflight;
  }

  async function getPicturesInBbox(requestBbox: LngLatBbox): Promise<StreetLevelBboxPayload> {
    const key = bboxCacheKey(requestBbox);
    let entry = bboxCache.get(key);
    if (!entry) {
      entry = { pictures: [], truncated: false, fetchedAt: 0, hasData: false, inflight: null };
      bboxCache.set(key, entry);
      if (bboxCache.size > MAX_BBOX_ENTRIES) {
        for (const k of bboxCache.keys()) {
          if (bboxCache.size <= MAX_BBOX_ENTRIES) break;
          if (k !== key) bboxCache.delete(k);
        }
      }
    }
    const fresh = entry.hasData && now() - entry.fetchedAt < BBOX_TTL_MS;
    let stale = false;
    if (!fresh) {
      try {
        await refreshBbox(key, requestBbox);
      } catch {
        if (!entry.hasData) {
          throw new StreetLevelError('unavailable', 'Panoramax did not answer and no cached copy exists yet');
        }
        stale = true; // last-good copy carries on, flagged
      }
    }
    return {
      pictures: entry.pictures.filter((p) => bboxContains(requestBbox, p.lng, p.lat)),
      truncated: entry.truncated,
      source: STREET_LEVEL_SOURCE_LABEL,
      provider: provider.id,
      fetchedAt: entry.fetchedAt,
      stale,
    };
  }

  async function getPicture(id: string): Promise<StreetPicturePayload> {
    const cached = pictureCache.get(id);
    if (cached && now() - cached.fetchedAt < PICTURE_TTL_MS) {
      return { picture: cached.picture, source: STREET_LEVEL_SOURCE_LABEL, provider: provider.id, fetchedAt: cached.fetchedAt, stale: false };
    }
    try {
      upstreamCalls++;
      const json = await deps.fetchJson(provider.pictureUrl(base, id));
      const picture = provider.normalizePicture(json, base);
      if (!picture) throw new StreetLevelError('unavailable', 'Panoramax returned an unreadable picture record');
      rememberPicture(picture, now());
      return { picture, source: STREET_LEVEL_SOURCE_LABEL, provider: provider.id, fetchedAt: now(), stale: false };
    } catch (e) {
      if (cached) {
        return { picture: cached.picture, source: STREET_LEVEL_SOURCE_LABEL, provider: provider.id, fetchedAt: cached.fetchedAt, stale: true };
      }
      if (e instanceof StreetLevelError) throw e;
      const status = (e as { status?: number })?.status;
      if (status === 404) throw new StreetLevelError('not-found', 'Picture not found on Panoramax');
      throw new StreetLevelError('unavailable', 'Panoramax did not answer and no cached copy exists yet');
    }
  }

  return { getPicturesInBbox, getPicture, upstreamCallCount: () => upstreamCalls };
}

/** The process-wide service the route uses (real fetch, real clock). */
async function fetchJsonReal(url: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'WorldEye/1.0 (worldeye.app; street-level layer)' },
    signal: AbortSignal.timeout(25_000),
  });
  if (!res.ok) {
    const err = new Error(`${url} → ${res.status}`) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return res.json();
}

const singleton = createStreetLevelService({
  fetchJson: fetchJsonReal,
  base: process.env.PANORAMAX_API_BASE || PANORAMAX_DEFAULT_BASE,
});

export function getStreetLevelBbox(bbox: LngLatBbox): Promise<StreetLevelBboxPayload> {
  return singleton.getPicturesInBbox(bbox);
}

export function getStreetLevelPicture(id: string): Promise<StreetPicturePayload> {
  return singleton.getPicture(id);
}
