/**
 * OSIRIS — resolve a camera id against the static directory dataset.
 *
 * The site keeps two views of the same catalogue:
 *  - the live runtime catalogue behind /api/cctv's region fetchers, and
 *  - the generated per-country chunks (src/data/countries/*.json) the
 *    directory, country, city and ski pages are built from.
 *
 * They do not always agree on ids. An upstream can renumber its whole
 * inventory (UDOT did: the chunk's udot ids run 112731–168351, the live
 * list now starts at 170390) while the cameras themselves — and the
 * feed URLs keyed by the old ids — keep serving. A "View on globe" deep
 * link minted from a directory page carries the chunk's id; when the
 * globe's by-id fallback searched only the live catalogue, that link
 * silently landed on the plain globe and the button looked dead.
 *
 * This module is the second half of the by-id resolution: an exact id
 * match over the directory chunks — the same records the pages that mint
 * the links are built from. No fuzzy matching: an id in neither
 * catalogue is an honest miss, exactly as before.
 */
import index from '@/data/camera-countries.json';
import type { CountryCamera } from './country-cameras';

interface CountryIndexEntry {
  slug: string;
  name: string;
  count: number;
}

const COUNTRY_SLUGS = ((index as { countries: CountryIndexEntry[] }).countries ?? []).map(
  c => c.slug,
);

/** Exact-match id index over directory chunks. First record wins on a
 *  duplicate id — the same dedupe-by-id convention the country pages
 *  apply — so a doubled record can never shadow another country's. */
export function buildDirectoryIndex(
  chunks: readonly (readonly CountryCamera[])[],
): Map<string, CountryCamera> {
  const byId = new Map<string, CountryCamera>();
  for (const chunk of chunks) {
    for (const cam of chunk) {
      if (!cam?.id) continue;
      const key = String(cam.id);
      if (!byId.has(key)) byId.set(key, cam);
    }
  }
  return byId;
}

/** The directory record for an id, or undefined — matching is exact on
 *  the string form of the id, the same key findCameraById uses. */
export function findInDirectoryIndex(
  byId: ReadonlyMap<string, CountryCamera>,
  id: string | null | undefined,
): CountryCamera | undefined {
  if (!id) return undefined;
  return byId.get(String(id));
}

let indexPromise: Promise<Map<string, CountryCamera>> | null = null;

/** Lazily build (once per server instance) the id index over every
 *  country chunk the directory serves. Chunks load with the same
 *  dynamic-import pattern /api/cctv/country uses; a chunk that fails to
 *  load is skipped rather than failing every lookup. */
export function loadDirectoryIndex(): Promise<Map<string, CountryCamera>> {
  if (!indexPromise) {
    indexPromise = (async () => {
      const chunks = await Promise.all(
        COUNTRY_SLUGS.map(slug =>
          import(`@/data/countries/${slug}.json`)
            .then(mod => ((mod as { default?: unknown }).default ?? mod) as CountryCamera[])
            .catch(() => [] as CountryCamera[]),
        ),
      );
      return buildDirectoryIndex(chunks);
    })();
  }
  return indexPromise;
}

/** Resolve one id against the directory dataset, or null on a miss. */
export async function findDirectoryCameraById(
  id: string | null | undefined,
): Promise<CountryCamera | null> {
  if (!id) return null;
  const byId = await loadDirectoryIndex();
  return findInDirectoryIndex(byId, id) ?? null;
}
