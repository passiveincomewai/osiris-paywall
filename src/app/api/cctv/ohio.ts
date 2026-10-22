import type { CctvCamera } from './types';
import { stealthFetch } from '@/lib/stealthFetch';
import { cachedSource } from '@/lib/sourceCache';

/**
 * OSIRIS — Ohio CCTV Cameras (ODOT / OHGO)
 * Source: https://api.ohgo.com/cameras — the keyless API OHGO's own web
 * and mobile apps poll (their documented developer API,
 * publicapi.ohgo.com, is the same inventory behind a registration key;
 * this channel needs none). ~1,159 sites / ~1,163 views statewide,
 * verified live 2026-10-22 — NO API KEY NEEDED.
 *
 * One catalogue record per camera VIEW (a handful of sites carry several
 * directional views). Still JPEGs update about every 5 seconds per ODOT.
 *
 * The feed cross-lists 39 Kentucky (KYTC) sites around Cincinnati. Those
 * are served by the Kentucky module from KYTC's own inventory instead,
 * so the same physical cameras are not listed twice.
 *
 * Added 2026-10-22 (DOT completion): the catalogue previously carried
 * ~151 Ohio cameras (the harvest's ohgo family).
 */

const FEED = 'https://api.ohgo.com/cameras';

/** Ohio bounding box — drops any stray/placeholder coordinates. */
const OH_BOUNDS = { minLat: 38.3, maxLat: 42.0, minLng: -85.0, maxLng: -80.3 };

export interface OhgoSite {
  Id?: string | null;
  Latitude?: number | null;
  Longitude?: number | null;
  Location?: string | null;
  Description?: string | null;
  Provider?: string | null;
  Cameras?: Array<{
    Direction?: string | null;
    SmallURL?: string | null;
    LargeURL?: string | null;
  }> | null;
}

/** Map one OHGO site to one camera per view. Exported for tests. */
export function mapSite(site: OhgoSite): CctvCamera[] {
  if (!site?.Id) return [];
  if (site.Provider === 'KYTC') return []; // served by the Kentucky module

  const lat = site.Latitude;
  const lng = site.Longitude;
  if (typeof lat !== 'number' || typeof lng !== 'number') return [];
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return [];
  if (lat < OH_BOUNDS.minLat || lat > OH_BOUNDS.maxLat) return [];
  if (lng < OH_BOUNDS.minLng || lng > OH_BOUNDS.maxLng) return [];

  const base = (site.Location || site.Description || `ODOT Camera ${site.Id}`).trim();
  const views = site.Cameras || [];
  const out: CctvCamera[] = [];
  views.forEach((view, idx) => {
    const url = view?.LargeURL?.trim() || view?.SmallURL?.trim() || '';
    if (!url) return;
    const direction = (view.Direction || '').trim();
    const named = views.length > 1 && direction && direction !== 'View';
    out.push({
      id: `ohgo-${site.Id}-${idx}`,
      lat,
      lng,
      name: named ? `${base} (${direction})` : base,
      city: 'Ohio',
      country: 'US',
      feed_url: url,
      source: 'ODOT OHGO',
    });
  });
  return out;
}

async function loadOhioCameras(): Promise<CctvCamera[]> {
  const res = await stealthFetch(FEED, {
    signal: AbortSignal.timeout(20000),
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`OHGO HTTP ${res.status}`);

  const data = await res.json();
  if (!Array.isArray(data)) throw new Error('OHGO returned no camera array');

  const cams: CctvCamera[] = [];
  const seen = new Set<string>();
  for (const site of data as OhgoSite[]) {
    for (const cam of mapSite(site)) {
      if (seen.has(cam.id)) continue;
      seen.add(cam.id);
      cams.push(cam);
    }
  }

  console.log(`[OSIRIS] Ohio cameras — ODOT OHGO: ${cams.length}`);
  return cams;
}

export const fetchOhioCameras = cachedSource('ohio', loadOhioCameras);
