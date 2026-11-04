import type { CctvCamera } from './types';
import { stealthFetch } from '@/lib/stealthFetch';
import { cachedSource } from '@/lib/sourceCache';

/**
 * OSIRIS — New York City CCTV Cameras (NYC DOT / Traffic Management Center)
 * Source: https://webcams.nyctmc.org/api/cameras — NYC DOT's own camera
 * list, the same JSON the TMC's public map loads. 893 cameras at the
 * 2026-10-22 inspection (all five boroughs, every one flagged
 * isOnline "true" by the agency), each with official DOT coordinates and
 * a still at https://webcams.nyctmc.org/api/cameras/<id>/image —
 * NO API KEY NEEDED.
 *
 * ── ENABLED 2026-11-04 (was gated off at landing, 2026-10-22) ──────
 * This module landed deliberately dark, the nycdot precedent from the
 * OpenCCTV pass (the harvest's nycdot family is CLEAR in families.ts
 * yet contributed 0 records for the same reason): from the development
 * sandbox, webcams.nyctmc.org is unreachable — the TLS handshake
 * completes and the connection is then dropped (curl: "empty reply
 * from server"; Node/Python: connection reset), for the list and for
 * every image, exactly reproducing the prior pass's 946/946-dead
 * probe. The upstream itself is alive: fetched through an off-sandbox
 * path on 2026-10-22, the official list returned all 893 cameras and
 * sampled stills returned real images.
 *
 * The gate's condition was probe-verification from the SERVING
 * environment, and the block turned out to be a property of the
 * sandbox's egress (broadly impaired — unrelated hosts reset from it
 * too), not of the production (Vercel) egress the serving pipeline
 * actually uses. The module is therefore enabled by default and this
 * flip is verified from production itself (empty-regions NOTES,
 * 2026-11-04); the fetch is fail-soft, so a blocked fetch would leave
 * the region empty exactly as the gate did. Kill switch:
 * OSIRIS_CCTV_NYCDOT=off restores the dark state without a deploy of
 * anything else. The fetcher is NOT probe-filtered at runtime: it
 * trusts the agency's own isOnline flags, like the other DOT modules.
 *
 * Mapping notes: one record per camera; `area` is the borough and is
 * the most precise place name the feed offers, so it is the city.
 * Records the agency itself flags offline (isOnline !== "true") are
 * skipped — none existed at inspection.
 */

const LIST_URL = 'https://webcams.nyctmc.org/api/cameras';

/** New York City bounding box — drops any stray/placeholder coordinates. */
const NYC_BOUNDS = { minLat: 40.4, maxLat: 41.0, minLng: -74.3, maxLng: -73.6 };

/** Enabled by default since 2026-11-04 (see header); OSIRIS_CCTV_NYCDOT=off
 *  is the kill switch. Read at call time so the switch takes effect
 *  without a restart of anything else. Exported for tests. */
export const nycDotEnabled = (): boolean => process.env.OSIRIS_CCTV_NYCDOT !== 'off';

export interface NycDotRecord {
  id?: string | null;
  name?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  area?: string | null;
  isOnline?: string | null;
  imageUrl?: string | null;
}

/** Map one NYC DOT camera record to a catalogue camera. Exported for tests. */
export function mapCamera(record: NycDotRecord): CctvCamera | null {
  const id = record?.id?.trim();
  if (!id) return null;
  if (record.isOnline !== 'true') return null;

  const lat = record.latitude;
  const lng = record.longitude;
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < NYC_BOUNDS.minLat || lat > NYC_BOUNDS.maxLat) return null;
  if (lng < NYC_BOUNDS.minLng || lng > NYC_BOUNDS.maxLng) return null;

  const url = (record.imageUrl || `https://webcams.nyctmc.org/api/cameras/${id}/image`).trim();
  if (!url) return null;

  return {
    id: `nycdot-${id}`,
    lat,
    lng,
    name: (record.name || 'NYC DOT Camera').trim(),
    city: (record.area || 'New York').trim(),
    country: 'US',
    feed_url: url,
    source: 'NYC DOT',
  };
}

async function loadNycDotCameras(): Promise<CctvCamera[]> {
  if (!nycDotEnabled()) return [];

  const res = await stealthFetch(LIST_URL, {
    signal: AbortSignal.timeout(20000),
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`NYC DOT HTTP ${res.status}`);

  const data = await res.json();
  const cams: CctvCamera[] = [];
  const seen = new Set<string>();
  for (const record of (Array.isArray(data) ? data : []) as NycDotRecord[]) {
    const cam = mapCamera(record);
    if (!cam || seen.has(cam.id)) continue;
    seen.add(cam.id);
    cams.push(cam);
  }

  console.log(`[OSIRIS] NYC cameras — NYC DOT TMC: ${cams.length}`);
  return cams;
}

export const fetchNycDotCameras = cachedSource('nycdot', loadNycDotCameras);
