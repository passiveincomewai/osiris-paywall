import type { CctvCamera } from './types';
import { stealthFetch } from '@/lib/stealthFetch';
import { cachedSource } from '@/lib/sourceCache';

/**
 * OSIRIS — Kansas CCTV Cameras (KDOT KanDrive)
 * Source: https://kandrive.gov/api/graphql — the Castle Rock CARS 511
 * platform's map query, the same public backend KDOT's own KanDrive map
 * uses (the Indiana / 511in.org precedent). ~535 statewide cameras on the
 * map — NO API KEY NEEDED. (The legacy kandrive.org host no longer
 * answers; KDOT's current site is kandrive.gov.)
 *
 * Why this clears: it is the DOT's own published traveller-information
 * feed, fetched live at runtime — the same channel the KanDrive website
 * and app read. The KC-metro cameras in the set ride along because KC
 * Scout is the bi-state KDOT/MoDOT programme and KanDrive publishes its
 * cameras as part of the Kansas map.
 *
 * Unlike Indiana, Kansas views are stills, not HLS: IMAGE views are
 * snapshots (KDOT's RWIS-style JPGs on kscam.carsprogram.org and KC
 * Scout's TransSuite snapshots), and VIDEO views expose only a
 * refreshing JPEG snapshot through the API — no playlist address is
 * published for them, so they are imported as stills too.
 *
 * Every image URL carries a per-request cache-buster (`?1792657620000`,
 * the server's clock in ms — it changes on every query). It is stripped:
 * the bare URL serves the same frame.
 *
 * KanDrive's GraphQL is slow — a statewide query measured 23–34 s — so
 * the timeout is generous and the source cache's stale-on-error keeps
 * the last good index serving between refreshes.
 *
 * Audit (2026-10-22, vs the served catalogue): 535 cameras published on
 * the map, 499 with a usable still (227 on kscam.carsprogram.org, 272 KC
 * Scout snapshots), the rest active but with no view URL at query time.
 * 282 of the 499 duplicate cameras already served via the OpenCCTV
 * 'castlerock' harvest family; 217 are net-new.
 */

const GRAPHQL = 'https://kandrive.gov/api/graphql';

/** Kansas bounding box — drops any stray/placeholder coordinates. */
const KS_BOUNDS = { minLat: 36.9, maxLat: 40.1, minLng: -102.1, maxLng: -94.5 };

/**
 * The only two hosts KanDrive publishes camera stills on: KDOT's own
 * CARS image server and KC Scout's snapshot server. Anything else in a
 * view URL — including the relative `/images/icon-*.svg` placeholder a
 * down camera gets — is not a feed.
 */
const IMAGE_URL = /^https:\/\/(?:kscam\.carsprogram\.org|www\.kcscout\.net)\/\S+\.jpe?g$/i;

/**
 * A view's `url` lives on CameraView, not on the interface `views`
 * returns, so it has to come through an inline fragment — same CARS
 * schema quirk as Indiana.
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

export interface KdotFeature {
  title?: string | null;
  uri?: string | null;
  features?: Array<{ geometry?: { coordinates?: [number, number] } | null }> | null;
  __typename?: string | null;
  active?: boolean | null;
  views?: Array<{ url?: string | null; category?: string | null }> | null;
}

/** Map one map feature to a camera, or null if unusable. Exported for tests. */
export function mapFeature(f: KdotFeature): CctvCamera | null {
  if (f?.__typename !== 'Camera' || f.active === false) return null;

  /* Cameras that are down come back with an icon in place of a feed, and
     some active cameras publish no view URL at all. */
  const rawUrl = f.views?.[0]?.url || '';
  const feedUrl = rawUrl.split('?')[0];
  if (!IMAGE_URL.test(feedUrl)) return null;

  const coords = f.features?.[0]?.geometry?.coordinates;
  if (!coords) return null;
  const [lng, lat] = coords;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < KS_BOUNDS.minLat || lat > KS_BOUNDS.maxLat) return null;
  if (lng < KS_BOUNDS.minLng || lng > KS_BOUNDS.maxLng) return null;

  const id = f.uri?.match(/camera\/(\d+)/)?.[1];
  if (!id) return null;

  return {
    id: `kdot-${id}`,
    lat,
    lng,
    name: (f.title || '').trim() || `KDOT Camera ${id}`,
    city: 'Kansas',
    country: 'US',
    feed_url: feedUrl,
    stream_type: 'jpg',
    external_url: `https://kandrive.gov/@${lat},${lng},14?show=${encodeURIComponent(f.uri || '')}`,
    source: 'Kansas DOT',
  };
}

async function loadKansasCameras(): Promise<CctvCamera[]> {
  const res = await stealthFetch(GRAPHQL, {
    method: 'POST',
    signal: AbortSignal.timeout(60000),
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', Referer: 'https://kandrive.gov/' },
    body: JSON.stringify({
      query: QUERY,
      /* One query for the whole state. `zoom` is what decides clustering, so it
         has to be high enough that the server returns cameras and not clusters. */
      variables: {
        input: {
          north: KS_BOUNDS.maxLat,
          south: KS_BOUNDS.minLat,
          east: KS_BOUNDS.maxLng,
          west: KS_BOUNDS.minLng,
          zoom: 16,
          layerSlugs: ['normalCameras'],
          nonClusterableUris: null,
        },
      },
    }),
  });
  if (!res.ok) throw new Error(`KanDrive HTTP ${res.status}`);

  const json = await res.json();
  const feats = json?.data?.mapFeaturesQuery?.mapFeatures;
  if (!Array.isArray(feats)) throw new Error('KanDrive returned no mapFeatures');

  const cams: CctvCamera[] = [];
  const seen = new Set<string>();
  for (const f of feats) {
    const cam = mapFeature(f);
    if (!cam || seen.has(cam.id)) continue;
    seen.add(cam.id);
    cams.push(cam);
  }

  console.log(`[OSIRIS] Kansas cameras — Kansas DOT (KanDrive): ${cams.length}`);
  return cams;
}

export const fetchKansasCameras = cachedSource('kansas', loadKansasCameras);
