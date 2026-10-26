/**
 * OSIRIS — Sunrise Around the World, server side: feed the pure selection
 * in lib/sunrise with the served camera catalogue.
 *
 * The catalogue source is the one the rest of the site reads: the saved
 * snapshot the /api/cctv assembly writes to disk and restores at boot
 * (lib/cctv-snapshot — the same read the Camera Network dashboard uses).
 * Reading it never triggers an upstream fetch. On a cold instance with no
 * snapshot yet, the loader falls back to the public sparse sample of the
 * same catalogue over HTTP, so the page degrades to a thinner selection
 * instead of an empty one — and says so via `source`.
 */

import { appBaseUrl } from './app-url';
import { readSnapshot, type Camera } from './cctv-snapshot';
import {
  selectSunCameras,
  sunBandCenterLng,
  type SunCameraInput,
  type SunMode,
  type SunriseSelection,
} from './sunrise';

export type { SunriseSelection };

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

/** Coerce a raw catalogue record into the selection's input shape. */
export function toSunCameraInput(record: Camera): SunCameraInput | null {
  const lat = typeof record.lat === 'number' ? record.lat : NaN;
  const lng = typeof record.lng === 'number' ? record.lng : NaN;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const id = record.id;
  if (typeof id !== 'string' && typeof id !== 'number') return null;
  return {
    id,
    name: asString(record.name) ?? null,
    city: asString(record.city) ?? null,
    country: asString(record.country) ?? null,
    lat,
    lng,
    feed_url: asString(record.feed_url) ?? null,
    stream_url: asString(record.stream_url) ?? null,
    stream_type: asString(record.stream_type) ?? null,
    external_url: asString(record.external_url) ?? null,
    source: asString(record.source) ?? null,
  };
}

async function snapshotCameras(): Promise<SunCameraInput[] | null> {
  const snapshot = await readSnapshot().catch(() => null);
  if (!snapshot) return null;
  const out: SunCameraInput[] = [];
  for (const region of Object.values(snapshot.regions)) {
    for (const record of region) {
      const input = toSunCameraInput(record);
      if (input) out.push(input);
    }
  }
  return out.length ? out : null;
}

async function sparseCameras(base: string): Promise<SunCameraInput[]> {
  try {
    const res = await fetch(`${base}/api/cctv?sparse=1`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { cameras?: Camera[] };
    const out: SunCameraInput[] = [];
    for (const record of data.cameras ?? []) {
      const input = toSunCameraInput(record);
      if (input) out.push(input);
    }
    return out;
  } catch {
    return [];
  }
}

/**
 * The selection for `mode` at `now`. `baseUrl` is the origin the sparse
 * fallback should call (the page passes the canonical app URL; the API
 * route passes its own request origin).
 */
export async function loadSunriseSelection(
  mode: SunMode,
  now: Date = new Date(),
  baseUrl: string = appBaseUrl(),
): Promise<SunriseSelection> {
  const fromSnapshot = await snapshotCameras();
  const source: SunriseSelection['source'] = fromSnapshot ? 'snapshot' : 'sparse';
  const cameras = fromSnapshot ?? (await sparseCameras(baseUrl));
  return {
    generatedAt: now.toISOString(),
    mode,
    bandCenterLng: Math.round(sunBandCenterLng(now, mode) * 10) / 10,
    source,
    considered: cameras.length,
    picks: selectSunCameras(cameras, now, { mode }),
  };
}
