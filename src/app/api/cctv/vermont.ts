import { stealthFetch } from '@/lib/stealthFetch';
import { cachedSource } from '@/lib/sourceCache';
import { buildQuery, parseWkt, cameraLabel, cameraCity } from './ibi511';
import type { CctvCamera } from './types';

/**
 * OSIRIS — Vermont CCTV Cameras (VTrans, via New England 511)
 * Source: https://www.newengland511.org — the official tri-state 511 service
 * run for the Vermont Agency of Transportation (VTrans), NHDOT and MaineDOT.
 * VTrans's own RWIS page sends the public here for its CCTV images ("Closed
 * circuit TV images can also be found on the New England 511 website"), so
 * this is the agency's own publishing channel, not a third-party harvest.
 * Data endpoint: /List/GetData/Cameras (the IBI 511 DataTables endpoint Utah,
 * Nevada, Florida and Georgia run on), 100 rows/page — NO API KEY NEEDED.
 *
 * The feed is tri-state: 406 cameras published in total, of which 89 carry
 * areaId 'VT' (read 2026-10-22). The loader pages through all of them and
 * keeps Vermont only — a bounds filter alone cannot do that job, because
 * western New Hampshire sits inside Vermont's longitude range.
 *
 * Every Vermont camera is snapshot-only: no row in the feed carries a
 * videoUrl. The still at /map/Cctv/{imageId} refreshes about every 10 s
 * (the feed's own refreshRateMs), which is what a tile shows.
 */

const BASE = 'https://www.newengland511.org';
const PAGE_SIZE = 100; // the server caps a response at 100 rows whatever we ask for
const MAX_PAGES = 10; // safety bound (~1,000 cameras) so a bad total can't fan out forever

/** Vermont bounding box — drops any mis-geocoded rows. */
const VT_BOUNDS = { minLat: 42.7, maxLat: 45.1, minLng: -73.5, maxLng: -71.4 };

/**
 * Camera sites whose snapshot endpoint served the platform's shared
 * placeholder on 2026-10-22 — a static 540×330 PNG (Adobe ImageReady stock)
 * returned byte-identically by four different cameras, instead of a JPEG of
 * the road. The feed flags none of them blocked or disabled, so the site id
 * is the only signal there is. Sites, not image ids: the image id is the
 * per-view row and changes when a site is re-provisioned.
 *   58  FAIR HAVEN VT-22A North   (image 960)
 *   282 FAIR HAVEN 22A NB South   (image 1003)
 *   814 BENNINGTON US-7 North     (image 1422)
 *   1672 Readsboro VT-8           (image 2280)
 */
const PLACEHOLDER_SITE_IDS = new Set([58, 282, 814, 1672]);

/** One row from /List/GetData/Cameras (only the fields we consume). */
export interface VermontCameraRecord {
  id: number;
  /** Which state's cameras this row belongs to: 'VT' | 'NH' | 'ME'. */
  areaId?: string | null;
  roadway?: string | null;
  direction?: string | null;
  location?: string | null;
  city?: string | null;
  county?: string | null;
  latLng?: { geography?: { wellKnownText?: string | null } | null } | null;
  images?: Array<{
    imageUrl?: string | null;
    videoUrl?: string | null;
    isVideoAuthRequired?: boolean;
    blocked?: boolean;
    disabled?: boolean;
    videoDisabled?: boolean;
  }> | null;
}

/** Map a raw record to a camera, or null if it should be skipped. Exported for tests. */
export function mapRecord(rec: VermontCameraRecord): CctvCamera | null {
  if (!rec || typeof rec.id !== 'number') return null;

  /* Tri-state feed — Vermont rows only. */
  if (rec.areaId !== 'VT') return null;

  if (PLACEHOLDER_SITE_IDS.has(rec.id)) return null;

  const img = rec.images?.[0];
  if (!img || img.blocked || img.disabled) return null;

  const coords = parseWkt(rec.latLng?.geography?.wellKnownText);
  if (!coords) return null;

  const { lat, lng } = coords;
  if (lat < VT_BOUNDS.minLat || lat > VT_BOUNDS.maxLat) return null;
  if (lng < VT_BOUNDS.minLng || lng > VT_BOUNDS.maxLng) return null;

  const snapshot = img.imageUrl ? `${BASE}${img.imageUrl}` : undefined;
  /* No Vermont row publishes a videoUrl today, and the platform gates the
     ones it does publish behind a session (see ibi511.ts) — take a stream
     only if one ever appears ungated. */
  const video = !img.videoDisabled && img.isVideoAuthRequired !== true
    ? img.videoUrl?.trim() || undefined
    : undefined;
  const hls = video && /\.m3u8(\?|$)/i.test(video) ? video : undefined;
  if (!snapshot && !hls) return null;

  return {
    id: `vtrans-${rec.id}`,
    lat,
    lng,
    name: cameraLabel(rec) || `Vermont Camera ${rec.id}`,
    city: cameraCity(rec, 'Vermont'),
    country: 'US',
    ...(snapshot ? { feed_url: snapshot } : {}),
    ...(hls ? { stream_url: hls, stream_type: 'hls' as const } : {}),
    source: 'Vermont Agency of Transportation',
  };
}

async function fetchPage(start: number): Promise<{ rows: VermontCameraRecord[]; total: number }> {
  const url = `${BASE}/List/GetData/Cameras?query=${buildQuery(start, PAGE_SIZE)}&lang=en`;
  const res = await stealthFetch(url, {
    signal: AbortSignal.timeout(15000),
    headers: { 'X-Requested-With': 'XMLHttpRequest', Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`New England 511 HTTP ${res.status}`);
  const data = await res.json();
  return {
    rows: Array.isArray(data?.data) ? data.data : [],
    total: Number(data?.recordsTotal) || 0,
  };
}

async function loadVermontCameras(): Promise<CctvCamera[]> {
  // The first page also tells us how many rows there are in total.
  const first = await fetchPage(0);
  const seen = new Map<number, CctvCamera>();
  let rowsRead = 0;

  const ingest = (rows: VermontCameraRecord[]) => {
    rowsRead += rows.length;
    for (const rec of rows) {
      const cam = mapRecord(rec);
      if (cam) seen.set(rec.id, cam);
    }
  };
  ingest(first.rows);

  const starts: number[] = [];
  for (let s = PAGE_SIZE; s < first.total && s < PAGE_SIZE * MAX_PAGES; s += PAGE_SIZE) {
    starts.push(s);
  }

  /* The 511 edge throttles bursts rather than refusing them — pages dropped
     in the parallel batch usually succeed one at a time a moment later, so
     whatever failed gets a second, sequential pass (same pattern as the
     shared IBI loader). */
  const failed: number[] = [];
  const results = await Promise.allSettled(starts.map(s => fetchPage(s)));
  results.forEach((r, j) => {
    if (r.status === 'fulfilled') ingest(r.value.rows);
    else failed.push(starts[j]);
  });
  for (const s of failed) {
    try {
      ingest((await fetchPage(s)).rows);
    } catch {
      /* the short-read guard below decides whether what we have is usable */
    }
  }

  /* A short read is a failed refresh, not a smaller state: the tri-state
     total is the guard, since Vermont rows are spread across every page. */
  if (first.total > 0 && rowsRead < first.total * 0.95) {
    throw new Error(`New England 511 short read: ${rowsRead} of ${first.total} rows`);
  }

  const cams = [...seen.values()];
  console.log(`[OSIRIS] Vermont cameras — Vermont Agency of Transportation: ${cams.length}`);
  return cams;
}

export const fetchVermontCameras = cachedSource('vermont', loadVermontCameras);
