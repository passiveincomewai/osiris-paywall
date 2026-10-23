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
 * ── GATED OFF — landed 2026-10-22, NOT serving (DOT gap fills) ──────
 * This module is complete but deliberately dark, the nycdot precedent
 * from the OpenCCTV pass (the harvest's nycdot family is CLEAR in
 * families.ts yet contributed 0 records for the same reason): from this
 * sandbox, webcams.nyctmc.org is unreachable — the TLS handshake
 * completes and the connection is then dropped (curl: "empty reply from
 * server"; Node/Python: connection reset), for the list and for every
 * image, exactly reproducing the prior pass's 946/946-dead probe. The
 * upstream itself is alive: fetched through an off-sandbox path on
 * 2026-10-22, the official list returned all 893 cameras and sampled
 * stills returned real images. The block is this environment's egress,
 * not the agency — but a camera whose feed cannot be probe-verified
 * from the serving pipeline is not presented as serving. That is also
 * why this fetcher is NOT probe-filtered at runtime: while gated it
 * returns nothing at all.
 *
 * Re-enable with OSIRIS_CCTV_NYCDOT=on ONLY after the list and a sample
 * of image URLs probe-verify from the serving environment; then drop
 * the gate and this notice in the same change. The health rollup
 * reports this source as "gated", never as down (health.ts
 * GATED_SOURCES).
 *
 * Mapping notes: one record per camera; `area` is the borough and is
 * the most precise place name the feed offers, so it is the city.
 * Records the agency itself flags offline (isOnline !== "true") are
 * skipped — none existed at inspection.
 */

const LIST_URL = 'https://webcams.nyctmc.org/api/cameras';

/** New York City bounding box — drops any stray/placeholder coordinates. */
const NYC_BOUNDS = { minLat: 40.4, maxLat: 41.0, minLng: -74.3, maxLng: -73.6 };

const NYCDOT_ENABLED = process.env.OSIRIS_CCTV_NYCDOT === 'on';

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
  if (!NYCDOT_ENABLED) return [];

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
