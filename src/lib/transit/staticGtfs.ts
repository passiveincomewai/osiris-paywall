import { inflateRawSync } from 'zlib';
import type { TransitMode } from './agencies';

/**
 * OSIRIS — static-GTFS trip→route resolution for realtime feeds that omit
 * route ids. UTA's GTFS-RT vehicle positions are the motivating case: the
 * feed carries only a tripId, and UTA's public route numbers (701 Blue
 * Line, 750 FrontRunner…) live in the static feed's routes.txt as
 * route_short_name under internal route_ids. Joining tripId → route_id →
 * (short name, route_type) restores both the displayed route and an exact
 * mode from the GTFS route_type — no guessing from the trip id.
 *
 * The agency's static zip is downloaded at most once per cache window
 * (12 h — agencies republish on schedule changes, not intraday), parsed
 * in memory, and never blocks vehicle positions for long: callers race
 * it against a timeout and fall back to the feed's own fields.
 */

export interface TripRouteInfo {
  /** Public route label (route_short_name when the feed provides one). */
  route: string;
  /** Mode derived from GTFS route_type — authoritative, not a heuristic. */
  mode: TransitMode;
}

/** GTFS route_type → our mode set. 0 tram, 1 subway/metro, 2 rail,
 *  3 bus, 4 ferry, 5/6/7 cable/gondola/funicular (tram is the closest). */
export function routeTypeMode(routeType: string | undefined): TransitMode {
  switch ((routeType ?? '').trim()) {
    case '0':
    case '5':
    case '6':
    case '7':
      return 'tram';
    case '1':
      return 'metro';
    case '2':
      return 'train';
    case '4':
      return 'ferry';
    default:
      return 'bus';
  }
}

/** Minimal RFC-4180 CSV reader (quoted fields, embedded commas/quotes,
 *  CRLF) — enough for GTFS text tables, which are plain CSV. */
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  const src = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') { field += '"'; i++; } else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field); field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    } else field += ch;
  }
  if (field !== '' || row.length > 0) { row.push(field); rows.push(row); }
  if (rows.length === 0) return [];
  const head = rows[0].map(h => h.trim());
  return rows
    .slice(1)
    .filter(r => r.length > 1 || (r[0] ?? '') !== '')
    .map(r => {
      const o: Record<string, string> = {};
      head.forEach((h, i) => { o[h] = (r[i] ?? '').trim(); });
      return o;
    });
}

/** Extract one text file from a ZIP archive (stored or deflate entries)
 *  using only Node's zlib — the GTFS zips we consume are single-level. */
export function extractZipText(buf: Uint8Array, filename: string): string | null {
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  let eocd = -1;
  const floor = Math.max(0, buf.length - 65_557);
  for (let i = buf.length - 22; i >= floor; i--) {
    if (view.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) return null;
  const count = view.getUint16(eocd + 10, true);
  let off = view.getUint32(eocd + 16, true);
  for (let n = 0; n < count; n++) {
    if (off + 46 > buf.length || view.getUint32(off, true) !== 0x02014b50) break;
    const method = view.getUint16(off + 10, true);
    const compSize = view.getUint32(off + 20, true);
    const nameLen = view.getUint16(off + 28, true);
    const extraLen = view.getUint16(off + 30, true);
    const commentLen = view.getUint16(off + 32, true);
    const localOff = view.getUint32(off + 42, true);
    const name = new TextDecoder().decode(buf.subarray(off + 46, off + 46 + nameLen));
    if (name === filename) {
      const lNameLen = view.getUint16(localOff + 26, true);
      const lExtraLen = view.getUint16(localOff + 28, true);
      const start = localOff + 30 + lNameLen + lExtraLen;
      const comp = buf.subarray(start, start + compSize);
      const raw = method === 8 ? inflateRawSync(comp) : comp;
      return new TextDecoder().decode(raw);
    }
    off += 46 + nameLen + extraLen + commentLen;
  }
  return null;
}

/** Join routes.txt + trips.txt into tripId → { route label, mode }. */
export function parseTripRouteMap(routesCsv: string, tripsCsv: string): Map<string, TripRouteInfo> {
  const byRoute = new Map<string, TripRouteInfo>();
  for (const r of parseCsv(routesCsv)) {
    if (!r.route_id) continue;
    byRoute.set(r.route_id, {
      route: r.route_short_name || r.route_id,
      mode: routeTypeMode(r.route_type),
    });
  }
  const out = new Map<string, TripRouteInfo>();
  for (const t of parseCsv(tripsCsv)) {
    const info = t.route_id ? byRoute.get(t.route_id) : undefined;
    if (t.trip_id && info) out.set(t.trip_id, info);
  }
  return out;
}

export async function loadTripRouteMap(url: string): Promise<Map<string, TripRouteInfo>> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'OSIRIS-Intelligence-Platform/3.5' },
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`GTFS static ${res.status}`);
  const buf = new Uint8Array(await res.arrayBuffer());
  const routes = extractZipText(buf, 'routes.txt');
  const trips = extractZipText(buf, 'trips.txt');
  if (!routes || !trips) throw new Error('GTFS zip missing routes.txt/trips.txt');
  return parseTripRouteMap(routes, trips);
}

const MAP_TTL_MS = 12 * 3600_000;
interface MapEntry {
  at: number;
  map: Map<string, TripRouteInfo> | null;
  inflight: Promise<Map<string, TripRouteInfo>> | null;
}
const mapStore = new Map<string, MapEntry>();

/**
 * Cached accessor: 12 h TTL, in-flight dedup, stale-on-error (a failed
 * refresh keeps serving the last good map; a cold failure yields an
 * empty map so positions still flow, just without resolved routes).
 */
export async function tripRouteMapFor(agencyId: string, url: string): Promise<Map<string, TripRouteInfo>> {
  const now = Date.now();
  let entry = mapStore.get(agencyId);
  if (!entry) {
    entry = { at: 0, map: null, inflight: null };
    mapStore.set(agencyId, entry);
  }
  if (entry.map && now - entry.at < MAP_TTL_MS) return entry.map;
  if (entry.inflight) return entry.inflight;
  const e = entry;
  e.inflight = loadTripRouteMap(url)
    .then(m => {
      e.map = m;
      e.at = Date.now();
      e.inflight = null;
      return m;
    })
    .catch(() => {
      e.inflight = null;
      return e.map ?? new Map<string, TripRouteInfo>();
    });
  return e.inflight;
}
