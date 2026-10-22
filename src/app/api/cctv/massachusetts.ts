import type { CctvCamera } from './types';
import { stealthFetch } from '@/lib/stealthFetch';
import { cachedSource } from '@/lib/sourceCache';

/**
 * OSIRIS — Massachusetts CCTV Cameras (MassDOT / Mass511)
 * Source: https://mass511.com/api/graphql — MassDOT's official traveler site,
 * which runs on Castle Rock's CARS platform, the same GraphQL MapFeatures API
 * Indiana's 511in.org module reads. ~309 statewide traffic cameras — NO API
 * KEY NEEDED, and the feed is the agency's own public map channel, so it
 * clears as a direct agency source.
 *
 * The IBI 511 helper (./ibi511) does NOT fit this deployment, checked before
 * writing anything new: mass511.com is a CARS single-page app (v3.20.0, its
 * bundle configures `graphqlUrl: "/api/graphql"` and the camera edge
 * `public.carsprogram.org/ma/prod`) with no `/List/GetData/Cameras`
 * DataTables endpoint. So this module mirrors ./indiana instead.
 *
 * Every MassDOT camera is a still, not a stream. Each record carries exactly
 * one view whose URL is a JPEG on public.carsprogram.org — even the views
 * categorised VIDEO — and there is no HLS playlist to rebuild (unlike
 * Indiana, whose poster token keys one). Mass.gov's developer page describes
 * the same imagery: live JPEG at one frame per 120 seconds. IMAGE-category
 * views append a `?`-timestamp to the URL; the mapper strips it, since the
 * bare address serves the current frame.
 */

const GRAPHQL = 'https://mass511.com/api/graphql';

/** Massachusetts bounding box — drops any stray/placeholder coordinates. */
const MA_BOUNDS = { minLat: 41.2, maxLat: 42.9, minLng: -73.5, maxLng: -69.9 };

/**
 * A live camera's only view: a numbered JPEG frame. Cameras that are down
 * come back with `ma-unavailable.png` in place of a frame, which this pattern
 * refuses — the same placeholder-icon drop Indiana applies.
 */
const FRAME = /^https:\/\/public\.carsprogram\.org\/cameras\/MA\/\d+-fullJpeg\.jpg(?:\?.*)?$/;

/**
 * Same query Indiana sends: a view's `url` lives on CameraView, so it has to
 * come through an inline fragment — selecting it bare validates as an error
 * and the server answers those with a 400, not a message.
 */
const QUERY = `query MapFeatures($input: MapFeaturesArgs!) {
  mapFeaturesQuery(input: $input) {
    mapFeatures {
      title
      uri
      features { geometry }
      __typename
      ... on Camera { active views(limit: 1) { category ... on CameraView { url } } }
    }
    error { message }
  }
}`;

export interface MassDotFeature {
  title?: string | null;
  uri?: string | null;
  features?: Array<{ geometry?: { coordinates?: [number, number] } | null }> | null;
  __typename?: string | null;
  active?: boolean | null;
  views?: Array<{ url?: string | null; category?: string | null }> | null;
}

/**
 * MassDOT titles read `I-90: I-90-WB-MM79.4-Charlton-@ MSP C10 West side` —
 * route, then the road, direction, milepost and town as one descriptive
 * string, with no internal asset number to strip (unlike INDOT's). The only
 * cleaning they need is whitespace: a few arrive with doubled or trailing
 * spaces.
 */
export function cleanTitle(title: string): string {
  return title.replace(/\s+/g, ' ').trim();
}

/** Map one map feature to a camera, or null if unusable. Exported for tests. */
export function mapFeature(f: MassDotFeature): CctvCamera | null {
  if (f?.__typename !== 'Camera' || f.active === false) return null;

  /* Cameras that are down come back with the unavailable placeholder. */
  const url = f.views?.[0]?.url || '';
  if (!FRAME.test(url)) return null;
  const feedUrl = url.split('?')[0];

  const coords = f.features?.[0]?.geometry?.coordinates;
  if (!coords) return null;
  const [lng, lat] = coords;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < MA_BOUNDS.minLat || lat > MA_BOUNDS.maxLat) return null;
  if (lng < MA_BOUNDS.minLng || lng > MA_BOUNDS.maxLng) return null;

  const id = f.uri?.match(/camera\/(\d+)/)?.[1];
  if (!id) return null;

  return {
    id: `massdot-${id}`,
    lat,
    lng,
    name: cleanTitle(f.title || '') || `MassDOT Camera ${id}`,
    city: 'Massachusetts',
    country: 'US',
    feed_url: feedUrl,
    external_url: `https://mass511.com/@${lat},${lng},14?show=${encodeURIComponent(f.uri || '')}`,
    source: 'MassDOT',
  };
}

async function loadMassachusettsCameras(): Promise<CctvCamera[]> {
  const res = await stealthFetch(GRAPHQL, {
    method: 'POST',
    /* Mass511 answers slowly — its own homepage can take ~20s to arrive —
       so this gets a longer leash than Indiana's 20s. */
    signal: AbortSignal.timeout(30000),
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', Referer: 'https://mass511.com/' },
    body: JSON.stringify({
      query: QUERY,
      /* One query for the whole state. `zoom` is what decides clustering, so it
         has to be high enough that the server returns cameras and not clusters. */
      variables: {
        input: {
          north: MA_BOUNDS.maxLat,
          south: MA_BOUNDS.minLat,
          east: MA_BOUNDS.maxLng,
          west: MA_BOUNDS.minLng,
          zoom: 16,
          layerSlugs: ['normalCameras'],
          nonClusterableUris: null,
        },
      },
    }),
  });
  if (!res.ok) throw new Error(`Mass511 HTTP ${res.status}`);

  const json = await res.json();
  const feats = json?.data?.mapFeaturesQuery?.mapFeatures;
  if (!Array.isArray(feats)) throw new Error('Mass511 returned no mapFeatures');

  const cams: CctvCamera[] = [];
  const seen = new Set<string>();
  for (const f of feats) {
    const cam = mapFeature(f);
    if (!cam || seen.has(cam.id)) continue;
    seen.add(cam.id);
    cams.push(cam);
  }

  console.log(`[OSIRIS] Massachusetts cameras — MassDOT: ${cams.length}`);
  return cams;
}

export const fetchMassachusettsCameras = cachedSource('massachusetts', loadMassachusettsCameras);
