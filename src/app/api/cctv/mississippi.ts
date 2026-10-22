import type { CctvCamera } from './types';
import { stealthFetch } from '@/lib/stealthFetch';
import { cachedSource } from '@/lib/sourceCache';

/**
 * OSIRIS — Mississippi CCTV Cameras (Mississippi DOT / MDOTtraffic)
 * Source: https://mdottraffic.com — MDOT's own public traffic map.
 * 457 camera sites statewide — NO API KEY NEEDED.
 *
 * Why this clears: MDOTtraffic is the Mississippi Department of
 * Transportation's public traveler-information site; the camera index and
 * the per-site camera pages below are the exact requests its own map makes,
 * served to anonymous visitors with no key, login or licence gate.
 *
 * The channel is two-step, because that is how the site itself works:
 *   1. `POST default.aspx/LoadCameraData` — the ASP.NET page method behind
 *      the map's camera layer — returns every site: id, tooltip, lat/lon.
 *      (Counted 2026-10-22: 457 sites.)
 *   2. Each site's `mapbubbles/camerasite.aspx?site={id}` page lists the
 *      site's views (a site is one pole, usually 2–5 cameras) as
 *      `switchImage('<thumbnail>', '<streamId>', '<title>', …)` calls.
 *      The thumbnail is a Wowza snapshot on a regional edge host
 *      (`streaming*.mdottraffic.com/thumbnail?application=rtplive&
 *      streamname={id}.stream…`); the live feed is the same edge's HLS
 *      playlist, `/{app}/{streamname}/playlist.m3u8` — the address the
 *      site's own `streamcam.aspx` player uses.
 *
 * A view whose thumbnail is the site's `novideo.jpg` placeholder is a
 * camera MDOT itself shows as down — those are dropped, the same way
 * Indiana drops its placeholder-icon views. Site pages are fetched with
 * bounded concurrency and a failed page only loses that one site.
 */

const BASE = 'https://mdottraffic.com';
const CAMERA_DATA = `${BASE}/default.aspx/LoadCameraData`;
const SITE_PAGE = (siteId: string) => `${BASE}/mapbubbles/camerasite.aspx?site=${siteId}`;
const SITE_CONCURRENCY = 16;

/** Mississippi bounding box — drops any stray/placeholder coordinates. */
const MS_BOUNDS = { minLat: 30.1, maxLat: 35.1, minLng: -91.7, maxLng: -88.05 };

/** One marker from LoadCameraData (only the fields we consume). */
export interface MdotSite {
  markerid?: string | null;
  tooltip?: string | null;
  lat?: number | null;
  lon?: number | null;
}

/** One camera view parsed out of a site page. */
export interface MdotView {
  streamId: string;
  title: string;
  /** Wowza edge host, e.g. https://streamingjxn1.mdottraffic.com */
  host: string;
  /** Wowza application name from the thumbnail URL (rtplive). */
  app: string;
  /** Wowza stream name, e.g. 010406.stream */
  streamName: string;
  /** The snapshot URL exactly as the site page carries it. */
  thumbnail: string;
}

/** The numeric site id inside a `camsite_123` marker id, or null. */
export function siteIdOf(site: MdotSite): string | null {
  return site?.markerid?.match(/^camsite_(\d+)$/)?.[1] ?? null;
}

const THUMBNAIL = /^https?:\/\/([^/]+)\/thumbnail\?application=([^&]+)&streamname=([^&]+)/;

/** The parts of a Wowza thumbnail URL, or null if it is not one. */
export function parseThumbnail(url: string): Pick<MdotView, 'host' | 'app' | 'streamName'> | null {
  const m = (url || '').match(THUMBNAIL);
  if (!m) return null;
  return { host: `https://${m[1]}`, app: m[2], streamName: m[3] };
}

/** The HLS playlist for a view — the address streamcam.aspx plays. */
export function streamUrl(view: Pick<MdotView, 'host' | 'app' | 'streamName'>): string {
  return `${view.host}/${view.app}/${view.streamName}/playlist.m3u8`;
}

const SWITCH_IMAGE = /switchImage\('([^']+)',\s*'([^']+)',\s*'([^']*)'/g;
const INITIAL_IMAGE = /<img id="camimg"[^>]*?src='([^']+)'/;

/**
 * Every view a site page offers. A page leads with one view already loaded
 * (the `camimg` snapshot) and lists the rest as switchImage buttons; the
 * lead view is normally also a button, but not always, so it is merged in
 * by stream name. Exported for tests.
 */
export function parseSiteViews(html: string): MdotView[] {
  const views: MdotView[] = [];
  const seen = new Set<string>();
  const add = (thumbnail: string, streamId: string, title: string) => {
    const parts = parseThumbnail(thumbnail);
    /* novideo.jpg (and anything else that is not a Wowza thumbnail) is the
       site's own "camera down" placeholder — not a feed. */
    if (!parts || seen.has(parts.streamName)) return;
    seen.add(parts.streamName);
    views.push({ streamId, title: title.trim(), thumbnail, ...parts });
  };
  for (const m of html.matchAll(SWITCH_IMAGE)) add(m[1], m[2], m[3]);
  const lead = html.match(INITIAL_IMAGE)?.[1];
  if (lead) {
    const parts = parseThumbnail(lead);
    const streamId = parts?.streamName.replace(/\.stream$/, '') ?? '';
    if (streamId) add(lead, streamId, '');
  }
  return views;
}

/** Map one site + view to a camera, or null if unusable. Exported for tests. */
export function mapView(site: MdotSite, view: MdotView): CctvCamera | null {
  const siteId = siteIdOf(site);
  if (!siteId || !view?.streamName) return null;

  const lat = site.lat;
  const lng = site.lon;
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < MS_BOUNDS.minLat || lat > MS_BOUNDS.maxLat) return null;
  if (lng < MS_BOUNDS.minLng || lng > MS_BOUNDS.maxLng) return null;

  return {
    id: `msdot-${view.streamId}`,
    lat,
    lng,
    name: view.title || site.tooltip?.trim() || `MDOT Camera ${view.streamId}`,
    city: 'Mississippi',
    country: 'US',
    feed_url: view.thumbnail,
    stream_url: streamUrl(view),
    stream_type: 'hls',
    external_url: SITE_PAGE(siteId),
    source: 'Mississippi DOT',
  };
}

async function loadMississippiCameras(): Promise<CctvCamera[]> {
  const res = await stealthFetch(CAMERA_DATA, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8', Accept: 'application/json' },
    body: '{}',
  });
  if (!res.ok) throw new Error(`MDOTtraffic LoadCameraData HTTP ${res.status}`);

  const json = await res.json();
  const sites: MdotSite[] = Array.isArray(json?.d) ? json.d : [];
  if (!sites.length) throw new Error('MDOTtraffic returned no camera sites');

  const cams: CctvCamera[] = [];
  const seen = new Set<string>();
  let cursor = 0;
  const worker = async () => {
    while (cursor < sites.length) {
      const site = sites[cursor++];
      const siteId = siteIdOf(site);
      if (!siteId) continue;
      try {
        const page = await stealthFetch(SITE_PAGE(siteId));
        if (!page.ok) continue;
        for (const view of parseSiteViews(await page.text())) {
          const cam = mapView(site, view);
          if (!cam || seen.has(cam.id)) continue;
          seen.add(cam.id);
          cams.push(cam);
        }
      } catch {
        /* One slow/dead site page loses that site only. */
        continue;
      }
    }
  };
  await Promise.all(Array.from({ length: SITE_CONCURRENCY }, worker));

  console.log(`[OSIRIS] Mississippi cameras — Mississippi DOT: ${cams.length}`);
  return cams;
}

export const fetchMississippiCameras = cachedSource('mississippi', loadMississippiCameras);
