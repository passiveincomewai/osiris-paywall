import { stealthFetch } from '@/lib/stealthFetch';
import { cachedSource } from '@/lib/sourceCache';
import { buildQuery, mapIbi511Record, type Ibi511Record, type Ibi511Source } from './ibi511';
import type { CctvCamera } from './types';

/**
 * OSIRIS — Maine CCTV Cameras (MaineDOT via New England 511)
 * Source: https://newengland511.org/List/GetData/Cameras — the IBI 511
 * traveler-information platform, the same stack Florida/Georgia/Nevada run.
 * ~406 tri-state cameras (ME/NH/VT), of which 134 are Maine's — NO API KEY.
 *
 * New England 511 is the three DOTs' own joint publishing channel: MaineDOT,
 * NHDOT and VTrans operate it together, and MaineDOT's site routes camera
 * seekers there. There is no Maine-only endpoint — one DataTables list
 * carries all three states — so the loader pages the whole list and keeps
 * the rows whose `state` is Maine (`areaId: 'ME'`). MaineDOT publishes no
 * separate camera feed of its own; its Map Viewer's "511 Traffic Camera
 * Viewer" shows this same network.
 *
 * Maine's cameras are stills, not video: no row publishes a `videoUrl`, so
 * each camera is the snapshot at /map/Cctv/{imageId}, which the feed says
 * refreshes every 10 s (`refreshRateMs`). Counts verified 2026-10-22:
 * recordsTotal 406 = 134 Maine + 183 New Hampshire + 89 Vermont; all 134
 * Maine rows in-bounds, none blocked or disabled. Of the 85 Maine cameras
 * not already in the catalogue, 31 served a unique live JPEG on probe; the
 * other 54 served New England 511's shared 15,136-byte placeholder PNG
 * (the platform's offline slate — it carries no row-level flag, so this
 * module cannot filter it without fetching every image; the feed is
 * imported as published, as with the other IBI states).
 */

const BASE = 'https://newengland511.org';
const PAGE_SIZE = 100; // the server caps a response at 100 rows whatever we ask for
const MAX_PAGES = 10; // safety bound (~1,000 rows) so a bad total can't fan out forever
const CONCURRENCY = 5; // NE511 throttles bursts harder than the southern IBI sites

/** Maine bounding box — drops any stray/placeholder coordinates. */
const ME_BOUNDS = { minLat: 43.0, maxLat: 47.5, minLng: -71.1, maxLng: -66.9 };

export const MAINE_CFG: Ibi511Source = {
  base: BASE,
  idPrefix: 'medot',
  source: 'MaineDOT',
  state: 'Maine',
  bounds: ME_BOUNDS,
};

/** One row from /List/GetData/Cameras, with the fields Maine filtering needs. */
export interface MaineCameraRecord extends Ibi511Record {
  state?: string | null;
  areaId?: string | null;
}

/**
 * Map a raw row to a camera, or null if it should be skipped. Only Maine's
 * own rows pass — the same list interleaves New Hampshire and Vermont, and
 * the bounds box alone would keep New Hampshire's border cameras.
 * Exported for tests.
 */
export function mapRecord(rec: MaineCameraRecord): CctvCamera | null {
  if (!rec || (rec.state !== 'Maine' && rec.areaId !== 'ME')) return null;
  return mapIbi511Record(rec, MAINE_CFG);
}

async function fetchPage(start: number): Promise<{ rows: MaineCameraRecord[]; total: number }> {
  const url = `${BASE}/List/GetData/Cameras?query=${buildQuery(start, PAGE_SIZE)}&lang=en`;
  const res = await stealthFetch(url, {
    signal: AbortSignal.timeout(15000),
    headers: { 'X-Requested-With': 'XMLHttpRequest', Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`MaineDOT (New England 511) HTTP ${res.status}`);
  const data = await res.json();
  return {
    rows: Array.isArray(data?.data) ? data.data : [],
    total: Number(data?.recordsTotal) || 0,
  };
}

async function loadMaineCameras(): Promise<CctvCamera[]> {
  // The first page also tells us how many tri-state rows there are in total.
  const first = await fetchPage(0);
  const seen = new Map<number, CctvCamera>();
  let rowsSeen = 0;

  const ingest = (rows: MaineCameraRecord[]) => {
    rowsSeen += rows.length;
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

  const failed: number[] = [];
  for (let i = 0; i < starts.length; i += CONCURRENCY) {
    const batch = starts.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(batch.map(s => fetchPage(s)));
    results.forEach((r, j) => (r.status === 'fulfilled' ? ingest(r.value.rows) : failed.push(batch[j])));
  }

  // One more go at whatever dropped — NE511 throttles a burst rather than
  // refusing it outright, so a failed page usually succeeds on its own.
  if (failed.length) {
    const retried = await Promise.allSettled(failed.map(s => fetchPage(s)));
    for (const r of retried) if (r.status === 'fulfilled') ingest(r.value.rows);
  }

  const cams = [...seen.values()];

  /* A short read is a failed refresh, not a smaller state — same rule as the
     shared IBI loader: throwing hands the decision to sourceCache, which
     keeps the last good index. The tri-state total is the yardstick because
     that is what the paging actually has to cover. */
  if (first.total > 0 && rowsSeen < first.total * 0.95) {
    throw new Error(`MaineDOT (New England 511) short read: ${rowsSeen} of ${first.total} rows`);
  }

  console.log(`[OSIRIS] Maine cameras — MaineDOT (New England 511): ${cams.length}`);
  return cams;
}

export const fetchMaineCameras = cachedSource('maine', loadMaineCameras);
