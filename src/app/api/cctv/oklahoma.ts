import type { CctvCamera } from './types';
import { stealthFetch } from '@/lib/stealthFetch';
import { cachedSource } from '@/lib/sourceCache';

/**
 * OSIRIS — Oklahoma CCTV Cameras (Oklahoma DOT / OK Traffic)
 * Source: https://oktraffic.org/api/CameraPoles — the LoopBack API behind
 * ODOT's public Drive Oklahoma map (oktraffic.org), run by the Oklahoma
 * Department of Transportation. NO API KEY NEEDED for the public web view.
 *
 * Why this clears the bar: it is the agency's own channel, not an
 * aggregator. ODOT's newsroom describes oktraffic.org as its metro camera
 * map with "more than 400 camera views" (ok.gov); measured live on
 * 2026-10-22 the API's own count endpoint reports 228 camera poles, and
 * the public filter below returns 468 cameras across 158 of those poles
 * (OKC, Tulsa, Lawton, Norman and the I-35 / I-40 / I-44 corridors) — every
 * record inside Oklahoma, so the bounds filter is a safety net, not a cut.
 *
 * The site's public view is a filter, and this uses the same one its own
 * map uses: MapCameras with type "Web", status not "Out Of Service" and
 * blockAtis not "1", each with its streamDictionary. A pole is a location;
 * the cameras on it (usually one per direction) are the catalogue rows.
 *
 * Every camera is HLS. The playlist lives in
 * `streamDictionary.streamSrc` (`stream.oktraffic.org/delay-stream/…`) —
 * and the stream key in that URL is NOT a stable identifier: for all 150
 * cameras this feed shares with the OpenCCTV harvest, the key differs
 * from the harvest's copy, so nothing may key or dedupe on the URL. The
 * MapCamera `id` is the stable key.
 *
 * Supersede note: this direct feed supersedes the OpenCCTV harvest's
 * `oktraffic` family outright. Dedupe against the served catalogue
 * (2026-10-22, audit matchers in order) matched 449 of 468 candidates to
 * a harvest record — 435 same-location, 14 geo+name, 0 by id or URL (see
 * the stream-key note) — collapsing to all 152 unique
 * `OpenCCTV / oktraffic` catalogue ids, which the coordinator drops from
 * the harvest file. The remaining 19 are new poles the harvest never
 * carried (I-40 & Douglas, I-244 & US-75 S, US-62 & Sheridan in Lawton,
 * I-40 & Kickapoo, and the Creek Turnpike poles in Tulsa). Because most
 * poles carry several directional cameras the harvest kept only ~1 view
 * per pole, so the direct feed is also a large net expansion.
 */

const API = 'https://oktraffic.org/api/CameraPoles';

/** Oklahoma bounding box — drops any stray/placeholder coordinates. */
const OK_BOUNDS = { minLat: 33.6, maxLat: 37.1, minLng: -103.1, maxLng: -94.4 };

/**
 * The filter the OK Traffic map itself sends for its public camera layer
 * (from the site's own client): Web-type cameras that are in service and
 * not blocked from the ATIS map, with their stream dictionary.
 */
const FILTER = {
  include: [
    {
      relation: 'mapCameras',
      scope: {
        include: 'streamDictionary',
        where: { status: { neq: 'Out Of Service' }, type: 'Web', blockAtis: { neq: '1' } },
      },
    },
  ],
};

/** One MapCamera row from the CameraPoles response (fields we consume). */
export interface OkMapCamera {
  id?: number | null;
  latitude?: string | number | null;
  longitude?: string | number | null;
  location?: string | null;
  city?: string | null;
  status?: string | null;
  type?: string | null;
  blockAtis?: string | null;
  streamDictionary?: { streamSrc?: string | null } | null;
}

/** One CameraPole — a location holding one or more directional cameras. */
export interface OkCameraPole {
  id?: number | null;
  name?: string | null;
  mapCameras?: OkMapCamera[] | null;
}

/** Map one MapCamera row to a camera, or null if unusable. Exported for tests. */
export function mapCamera(cam: OkMapCamera, poleName?: string | null): CctvCamera | null {
  if (!cam || typeof cam.id !== 'number') return null;

  /* Defence in depth: the API filter already excludes these, but a row
     that arrives anyway must not reach the map. */
  if (cam.status === 'Out Of Service') return null;
  if (cam.blockAtis === '1') return null;
  if (cam.type && cam.type !== 'Web') return null;

  const streamUrl = cam.streamDictionary?.streamSrc?.trim() || '';
  if (!/\.m3u8(\?|$)/i.test(streamUrl)) return null;

  const lat = typeof cam.latitude === 'string' ? parseFloat(cam.latitude) : cam.latitude;
  const lng = typeof cam.longitude === 'string' ? parseFloat(cam.longitude) : cam.longitude;
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < OK_BOUNDS.minLat || lat > OK_BOUNDS.maxLat) return null;
  if (lng < OK_BOUNDS.minLng || lng > OK_BOUNDS.maxLng) return null;

  const city = cam.city?.trim();
  return {
    id: `okdot-${cam.id}`,
    lat,
    lng,
    name: cam.location?.trim() || poleName?.trim() || `Oklahoma DOT Camera ${cam.id}`,
    city: city && city !== 'N/A' ? city : 'Oklahoma',
    country: 'US',
    stream_url: streamUrl,
    stream_type: 'hls',
    external_url: 'https://oktraffic.org/',
    source: 'Oklahoma DOT',
  };
}

/** Map one pole to its cameras (usually several directions). Exported for tests. */
export function mapPole(pole: OkCameraPole): CctvCamera[] {
  if (!pole || !Array.isArray(pole.mapCameras)) return [];
  const out: CctvCamera[] = [];
  for (const cam of pole.mapCameras) {
    const mapped = mapCamera(cam, pole.name);
    if (mapped) out.push(mapped);
  }
  return out;
}

async function loadOklahomaCameras(): Promise<CctvCamera[]> {
  const url = `${API}?filter=${encodeURIComponent(JSON.stringify(FILTER))}`;
  const res = await stealthFetch(url, {
    signal: AbortSignal.timeout(20000),
    headers: { Accept: 'application/json', Referer: 'https://oktraffic.org/' },
  });
  if (!res.ok) throw new Error(`OK Traffic HTTP ${res.status}`);

  const poles = await res.json();
  if (!Array.isArray(poles)) throw new Error('OK Traffic returned no CameraPoles');

  const cams: CctvCamera[] = [];
  const seen = new Set<string>();
  for (const pole of poles) {
    for (const cam of mapPole(pole)) {
      if (seen.has(cam.id)) continue;
      seen.add(cam.id);
      cams.push(cam);
    }
  }

  console.log(`[OSIRIS] Oklahoma cameras — Oklahoma DOT: ${cams.length}`);
  return cams;
}

export const fetchOklahomaCameras = cachedSource('oklahoma', loadOklahomaCameras);
