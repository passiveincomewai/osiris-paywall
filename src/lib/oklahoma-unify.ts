/**
 * OSIRIS — Oklahoma catalogue unification (2026-10-31).
 *
 * The generated per-country chunks are snapshots (the US chunk was
 * built 2026-10-20). Two days later the direct Oklahoma DOT feed
 * (src/app/api/cctv/oklahoma.ts) superseded the OpenCCTV harvest's
 * `oktraffic` family outright: the runtime catalogue dropped all 152
 * harvest records and serves the same physical cameras as
 * `okdot-<MapCamera id>` — the numeric MapCamera id is shared by both
 * layers. The chunk kept the superseded copies: `occ-ok-` ids whose
 * snapshot stream keys ODOT has since rotated (all 152 keys differed
 * from the live feed when re-measured 2026-10-31; the McAlester test
 * camera's snapshot playlist 404s while its okdot- twin plays).
 *
 * The chunk's identity was unified in the data itself (the 150 records
 * whose MapCamera ids ODOT still publishes were rewritten to their
 * okdot- form), but a snapshot cannot stay fresh: ODOT rotates the
 * delay-stream keys on a roughly daily cadence, so the durable half of
 * the fix lives here — the loaders that serve chunk records for
 * playback refresh the Oklahoma records from the live ODOT feed at
 * load time:
 *
 *   - an oktraffic record whose twin is live is rewritten to the
 *     twin's identity (okdot- id, "Oklahoma DOT" source) and the
 *     twin's current stream URL;
 *   - an okdot- record's stream URL is refreshed to the live one;
 *   - a record whose twin is NOT in the live feed is left exactly as
 *     the snapshot carries it — dropping it would silently change the
 *     counts the directory pages quote, and a stale record is the
 *     honest state for a camera ODOT no longer publishes;
 *   - any failure of the live feed serves the snapshot untouched
 *     (fail-open: the pre-unification behaviour, never worse).
 *
 * Only the identity/stream fields ever change. Names, cities and
 * coordinates are the directory's own record of the camera and are
 * never taken from the feed — ODOT's city field disagrees with the
 * directory's geocoded city for a dozen cameras, and moving a record
 * between city hubs would change published per-city counts.
 */

import { clean, type CountryCamera } from './country-cameras';

/** The harvest source string the superseded records carry. */
export const OKTRAFFIC_SOURCE = 'OpenCCTV / oktraffic';

/** The source the live Oklahoma layer serves under. */
export const OKLAHOMA_DOT_SOURCE = 'Oklahoma DOT';

const OCC_OK_ID = /^occ-ok-(\d+)$/;

/**
 * The id the live catalogue serves for a superseded oktraffic id —
 * `occ-ok-<MapCamera id>` becomes `okdot-<MapCamera id>`; every other
 * id passes through unchanged. The occ-ok- prefix belongs to this one
 * family (the harvest's Oklahoma records), so the translation is safe
 * to apply to a bare id with no record at hand — the by-id resolver
 * uses it for stale deep links minted before the unification.
 */
export function translateSupersededCameraId(id: string): string {
  const m = OCC_OK_ID.exec(id);
  return m ? `okdot-${m[1]}` : id;
}

/** The live-feed fields the refresh reads (the Oklahoma fetcher's
 *  record shape satisfies it). */
export interface LiveStreamEntry {
  id: string;
  stream_url?: string | null;
}

/**
 * Refresh a chunk record set's Oklahoma records against the live ODOT
 * feed. Pure: returns the input array itself when nothing changes, so
 * callers' memoised sets keep their identity. See the module header
 * for the exact rules.
 */
export function refreshOklahomaRecords(
  records: readonly CountryCamera[],
  live: readonly LiveStreamEntry[],
): CountryCamera[] {
  if (records.length === 0 || live.length === 0) {
    return records as CountryCamera[];
  }
  const liveStreamById = new Map<string, string>();
  for (const cam of live) {
    const url = typeof cam.stream_url === 'string' ? cam.stream_url.trim() : '';
    if (cam.id && url) liveStreamById.set(cam.id, url);
  }
  if (liveStreamById.size === 0) return records as CountryCamera[];

  let changed = false;
  const out = records.map((record) => {
    const occ =
      clean(record.source) === OKTRAFFIC_SOURCE ? OCC_OK_ID.exec(record.id) : null;
    const unifiedId = occ ? `okdot-${occ[1]}` : record.id;
    const liveUrl = liveStreamById.get(unifiedId);
    if (liveUrl === undefined) {
      /* No live twin: an unrelated record, or a superseded record
         whose camera ODOT no longer publishes — either way the
         snapshot record stands, untouched. */
      return record;
    }
    if (!occ && liveUrl === record.stream_url) return record;
    changed = true;
    return {
      ...record,
      id: unifiedId,
      ...(occ ? { source: OKLAHOMA_DOT_SOURCE } : null),
      stream_url: liveUrl,
    };
  });
  return changed ? out : (records as CountryCamera[]);
}

/**
 * Load-time unification for the US chunk: refresh its Oklahoma records
 * from the live ODOT feed (the region system's own cached fetcher —
 * 30-minute TTL, stale-on-error — so this adds no upstream load of its
 * own). Fail-open: any failure returns the snapshot records unchanged.
 */
export async function unifyOklahomaChunkRecords(
  records: CountryCamera[],
): Promise<CountryCamera[]> {
  try {
    const { fetchOklahomaCameras } = await import('@/app/api/cctv/oklahoma');
    const live = await fetchOklahomaCameras();
    return refreshOklahomaRecords(records, live);
  } catch {
    return records;
  }
}
