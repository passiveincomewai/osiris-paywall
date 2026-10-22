import type { CctvCamera } from './types';
import { stealthFetch } from '@/lib/stealthFetch';
import { cachedSource } from '@/lib/sourceCache';

/**
 * OSIRIS — Arkansas CCTV Cameras (ARDOT / IDriveArkansas)
 * Source: https://layers.idrivearkansas.com/cameras.geojson — the camera
 * layer file IDriveArkansas's own map loads (its layer_base_url, published
 * in https://layers.idrivearkansas.com/staticapi.js). 550 statewide traffic
 * cameras, all reporting `online` — NO API KEY NEEDED. ARDOT's own ITS page
 * counts "almost 440 department-owned PTZ cameras"; the layer carries more
 * than that because IDriveArkansas also republishes partner cameras
 * (adjacent states, cities, TV stations) that view the state highway system.
 *
 * Every camera in the layer carries an `hls_stream_protected` playlist on
 * cdn.idrivearkansas.com, and none of them is imported as video: the CDN is
 * CloudFront signed-cookie gated (a bare request answers 403 `MissingKey —
 * Missing Key-Pair-Id query parameter or cookie value`), and the session
 * that mints those cookies, https://api.idrivearkansas.com/vend, sits
 * behind an AWS WAF challenge (202, `x-amzn-waf-action: challenge`) and
 * answers CORS only for https://www.idrivearkansas.com. A tile on any other
 * origin can never hold that session, so the playlist would be dead weight.
 *
 * The stills are open. The site's poster URL,
 * actis.idrivearkansas.com/index.php/api/cameras/image?camera={id}, is only
 * a redirector — it hands back a page that bounces to
 * https://layers.idrivearkansas.com/cameras/{id}.jpg — so `feed_url` uses
 * the layers address directly. Despite the `.jpg` name the bytes are a
 * 720×405 PNG; browsers sniff the content, and the declared type the server
 * sends is image/png.
 *
 * Generation-time audit (2026-10-22, against the 76,313-record served
 * catalogue): 550 found, 26 duplicates — 19 same-location (≤10 m) and 7
 * geo-name (≤120 m, name containment ≥ 0.5), every one of them a Tennessee
 * partner camera at the Memphis/West Memphis interchanges already served
 * via OpenCCTV / arcgis_cams — plus 6 near-distinct (≤120 m, names do not
 * match; still imported). The other 518 are new. Snapshots were
 * probe-verified with curl (browser UA, Range bytes=0-2047): every
 * completed transfer returned HTTP 206 image/png with PNG magic bytes and
 * a per-camera distinct fingerprint — no dead and no placeholder cameras
 * were observed.
 */

const FEED = 'https://layers.idrivearkansas.com/cameras.geojson';
const SNAPSHOT_BASE = 'https://layers.idrivearkansas.com/cameras';

/** Arkansas bounding box — drops any stray/placeholder coordinates. */
const AR_BOUNDS = { minLat: 33.0, maxLat: 36.5, minLng: -94.7, maxLng: -89.6 };

/** One feature from the IDriveArkansas camera layer (only fields we consume). */
export interface ArdotFeature {
  type?: string | null;
  properties?: {
    id?: number | string | null;
    status?: string | null;
    name?: string | null;
  } | null;
  geometry?: {
    type?: string | null;
    coordinates?: [number, number] | null;
  } | null;
}

/** The snapshot address for a camera id. Exported for tests. */
export function snapshotUrl(id: number | string): string {
  return `${SNAPSHOT_BASE}/${id}.jpg`;
}

/** Map one layer feature to a camera, or null if unusable. Exported for tests. */
export function mapFeature(f: ArdotFeature): CctvCamera | null {
  const props = f?.properties;
  if (!props) return null;

  /* The site's own player treats anything but `online` as unavailable. */
  if (props.status && props.status !== 'online') return null;

  const id = props.id;
  if (id === null || id === undefined || id === '') return null;

  const coords = f.geometry?.coordinates;
  if (!coords) return null;
  const [lng, lat] = coords;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < AR_BOUNDS.minLat || lat > AR_BOUNDS.maxLat) return null;
  if (lng < AR_BOUNDS.minLng || lng > AR_BOUNDS.maxLng) return null;

  const name = (props.name || '').trim();

  return {
    id: `ardot-${id}`,
    lat,
    lng,
    name: name || `ARDOT Camera ${id}`,
    city: 'Arkansas',
    country: 'US',
    feed_url: snapshotUrl(id),
    stream_type: 'jpg',
    external_url: 'https://www.idrivearkansas.com/',
    source: 'Arkansas DOT',
  };
}

async function loadArkansasCameras(): Promise<CctvCamera[]> {
  const res = await stealthFetch(FEED, {
    signal: AbortSignal.timeout(20000),
    headers: { Accept: 'application/json', Referer: 'https://www.idrivearkansas.com/' },
  });
  if (!res.ok) throw new Error(`IDriveArkansas HTTP ${res.status}`);

  const json = await res.json();
  const feats = json?.features;
  if (!Array.isArray(feats)) throw new Error('IDriveArkansas returned no features');

  const cams: CctvCamera[] = [];
  const seen = new Set<string>();
  for (const f of feats) {
    const cam = mapFeature(f);
    if (!cam || seen.has(cam.id)) continue;
    seen.add(cam.id);
    cams.push(cam);
  }

  console.log(`[OSIRIS] Arkansas cameras — Arkansas DOT: ${cams.length}`);
  return cams;
}

export const fetchArkansasCameras = cachedSource('arkansas', loadArkansasCameras);
