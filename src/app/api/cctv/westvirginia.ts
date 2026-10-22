import type { CctvCamera } from './types';
import { stealthFetch } from '@/lib/stealthFetch';
import { cachedSource } from '@/lib/sourceCache';

/**
 * OSIRIS — West Virginia CCTV Cameras (WVDOH / West Virginia 511)
 * Source: https://wv511.org — the West Virginia Division of Highways'
 * official traveler-information site ("511WV"). The map's own camera layer
 * is a JavaScript payload from the site's map service:
 *   https://wv511.org/wsvc/gmap.asmx/buildCamerasJSONjs
 * which publishes `camera_data = { count, cams[] }` — 133 cameras statewide
 * when read on 2026-10-22 — NO API KEY NEEDED. Public agency open data: the
 * DOT publishes these feeds for public traveler information.
 *
 * WV 511 is NOT the IBI 511 platform (its /List/GetData/Cameras path returns
 * the homepage HTML); it is an older ASP.NET site whose per-camera player is
 * /flowplayeri.aspx?CAMID=<id>. That player page names the real stream: an
 * HLS playlist on the DOT's streaming edge,
 *   https://vtc1.roadsummary.com/rtplive/<CAMID>/playlist.m3u8
 * keyed by the same camera id (`md5` in the feed, e.g. CAM117). The feed
 * carries no stream URL itself — every camera is flagged STREAMING:1 and the
 * playlist address is rebuilt here, the same way indiana.ts rebuilds its
 * playlist from the poster token.
 *
 * Catalogue check (2026-10-22): 130 of the 133 are new; the other 3 are the
 * OpenCCTV harvest's wv511 records (occ-wv511-CAM029/CAM056/CAM106, matched
 * by stream URL) and are superseded by this direct module. The ~305
 * 'state511' records inside the WV bbox are VA/MD border bleed — the nearest
 * is 139 m from any WVDOH camera — so they stay.
 *
 * Probe note: the sandbox egress proxy cannot open a tunnel to
 * vtc1.roadsummary.com (CONNECT times out at any budget, while wv511.org
 * itself answers fine), so per-camera playlist probing could not be run from
 * here. A sample checked through an independent fetcher on 2026-10-22 found
 * live #EXTM3U playlists (e.g. CAM029) and HTTP 204s — the edge answering
 * with an offline encoder — on others; the three superseded harvest records
 * were probe-verified when harvested and use this identical URL pattern.
 */

const FEED = 'https://wv511.org/wsvc/gmap.asmx/buildCamerasJSONjs';
const STREAM_BASE = 'https://vtc1.roadsummary.com/rtplive';

/** West Virginia bounding box — drops any stray/placeholder coordinates. */
const WV_BOUNDS = { minLat: 37.2, maxLat: 40.6, minLng: -82.7, maxLng: -77.7 };

/** One camera from the feed's `camera_data.cams` array. */
export interface WvCameraRecord {
  md5?: string | null;
  title?: string | null;
  description?: string | null;
  start_lat?: string | number | null;
  start_lng?: string | number | null;
}

/** The HLS playlist for a camera id. Exported for tests. */
export function streamUrl(camId: string): string {
  return `${STREAM_BASE}/${camId}/playlist.m3u8`;
}

const ENTITIES: Record<string, string> = {
  '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&apos;': "'",
};

function decodeEntities(s: string): string {
  return s.replace(/&(?:amp|lt|gt|quot|#39|apos);/g, m => ENTITIES[m] ?? m);
}

/**
 * The camera's display name, from the feed's `description` HTML.
 *
 * The label lives in the camDescription div as `[BER]I-81 @ 13 King Street`
 * — a three-letter county code in brackets, then the place. The bracket is
 * an internal county shorthand, so it goes; the trailing
 * `<span>West Virginia DOT</span>` is the operator credit, not the name.
 * Falls back to the record's `title` (just the route) when the div is empty.
 */
export function cameraName(rec: WvCameraRecord): string {
  const div = rec.description?.match(/camDescription">([\s\S]*?)(?:<span|<\/div>)/)?.[1] ?? '';
  const text = decodeEntities(div.replace(/<[^>]+>/g, ''))
    .replace(/^\[[A-Z]{3}\]\s*/, '')
    .replace(/\s+/g, ' ')
    .trim();
  return text || (rec.title ?? '').trim();
}

/** Map one feed record to a camera, or null if unusable. Exported for tests. */
export function mapCamera(rec: WvCameraRecord): CctvCamera | null {
  const camId = rec?.md5?.trim();
  if (!camId) return null;

  /* A camera the DOT is not streaming has no playlist to hand the player:
     the feed flags live ones with a STREAMING:1 marker in the description. */
  if (!rec.description?.includes('STREAMING:1')) return null;

  const lat = Number(rec.start_lat);
  const lng = Number(rec.start_lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < WV_BOUNDS.minLat || lat > WV_BOUNDS.maxLat) return null;
  if (lng < WV_BOUNDS.minLng || lng > WV_BOUNDS.maxLng) return null;

  return {
    id: `wvdot-${camId.toLowerCase()}`,
    lat,
    lng,
    name: cameraName(rec) || `West Virginia 511 Camera ${camId}`,
    city: 'West Virginia',
    country: 'US',
    stream_url: streamUrl(camId),
    stream_type: 'hls',
    external_url: `https://wv511.org/flowplayeri.aspx?CAMID=${camId}`,
    source: 'West Virginia 511',
  };
}

/**
 * Pull the `camera_data` object out of the feed's JavaScript payload.
 * The payload is style/icon declarations followed by
 * `var camera_data = { … };` — the object is brace-matched (string-aware)
 * rather than regex-cut, so a `}` inside a description can't truncate it.
 * Exported for tests.
 */
export function parseCameraData(js: string): WvCameraRecord[] {
  const marker = js.indexOf('var camera_data');
  if (marker < 0) throw new Error('WV511 feed has no camera_data');
  const start = js.indexOf('{', marker);
  if (start < 0) throw new Error('WV511 camera_data is not an object');

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < js.length; i++) {
    const ch = js[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === '{') depth++;
    else if (ch === '}' && --depth === 0) {
      const data = JSON.parse(js.slice(start, i + 1));
      return Array.isArray(data?.cams) ? data.cams : [];
    }
  }
  throw new Error('WV511 camera_data is unterminated');
}

async function loadWestVirginiaCameras(): Promise<CctvCamera[]> {
  const res = await stealthFetch(FEED, {
    signal: AbortSignal.timeout(20000),
    headers: { Accept: 'application/javascript, text/javascript, */*', Referer: 'https://wv511.org/' },
  });
  if (!res.ok) throw new Error(`WV511 HTTP ${res.status}`);

  const records = parseCameraData(await res.text());

  const cams: CctvCamera[] = [];
  const seen = new Set<string>();
  for (const rec of records) {
    const cam = mapCamera(rec);
    if (!cam || seen.has(cam.id)) continue;
    seen.add(cam.id);
    cams.push(cam);
  }

  console.log(`[OSIRIS] West Virginia cameras — West Virginia 511: ${cams.length}`);
  return cams;
}

export const fetchWestVirginiaCameras = cachedSource('westvirginia', loadWestVirginiaCameras);
