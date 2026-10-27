/**
 * OSIRIS — U.S. border crossing wait times (CBP Border Wait Times feed).
 *
 * One verified public feed, integrated the way the plow and transit
 * sources are: a server-side fetch behind a TTL cache with in-flight
 * dedup, stale-on-error bridging, and a health record the API route
 * surfaces as an honesty flag. (Survey + probe record:
 * ~/workspace/worldeye-border-pages/REPORT.md, 2026-10-26/27.)
 *
 *  • U.S. Customs and Border Protection — `GET
 *    https://bwt.cbp.gov/api/waittimes`, keyless, no registration,
 *    probed live from this codebase's sandbox on 2026-10-26: HTTP 200,
 *    a JSON array of 85 port records (55 Mexican-border entries
 *    including facility splits and a few agency duplicates, 30
 *    Canadian-border entries — one per bridge). The same data powers
 *    CBP's own border wait times pages.
 *
 * Shape notes, from the live payload (all values arrive as strings):
 *  • Each port carries three lane groups — passenger_vehicle_lanes,
 *    commercial_vehicle_lanes, pedestrian_lanes — each with a
 *    maximum_lanes plus lane entries (standard_lanes everywhere;
 *    NEXUS_SENTRI_lanes on passenger, FAST_lanes on commercial,
 *    ready_lanes on passenger + pedestrian).
 *  • A lane entry is { update_time, operational_status, delay_minutes,
 *    lanes_open }; any field may be an empty string. Statuses seen
 *    live: "no delay", "delay", "Lanes Closed", "Update Pending",
 *    "N/A". "Update Pending" dominates overnight — the port has not
 *    published a fresh reading, and the page must say exactly that
 *    rather than dress it up as a zero wait.
 *  • `update_time` is CBP's own words ("At 11:00 pm PDT") — port-local
 *    phrasing, carried verbatim. The page renders it as "as reported
 *    by CBP", never converted or re-timestamped.
 *  • The port-level `date`/`time` pair is the feed's stamp for that
 *    record. How current it is varies by port; it is carried through
 *    untouched for the same reason.
 *  • Known agency duplicates (Paso Del Norte 240202 vs 202401,
 *    Ysleta 240203 vs "YSLETA" 240104, Naco 260301 vs 260305, Roma
 *    231001 vs "ROMA TEXAS" 231002): the crossing registry in
 *    lib/border/crossings names the canonical port_number for each
 *    crossing, so the duplicates never surface as separate crossings.
 *    Fort Hancock's port_number literally reads "l24501" in the feed
 *    (lowercase L) — preserved as-is in fixtures as a reminder that
 *    this feed is hand-maintained upstream.
 *
 * Honesty rules, same as the other layers: if the feed is down the
 * crossing pages render their cameras and facts with an explicit
 * "wait times unavailable" state — never a fabricated number, and
 * never a stale figure presented as current. The cache only bridges
 * a failed refresh with the last good payload, and the health flag
 * reports that this happened (`stale`).
 */

export const CBP_WAIT_TIMES_URL = 'https://bwt.cbp.gov/api/waittimes';

/** How long a fetched payload is treated as current on the server. */
export const BORDER_CACHE_TTL_MS = 4 * 60 * 1000;

export interface BorderLane {
  /** CBP's lane key: 'standard' | 'nexusSentri' | 'ready' | 'fast'. */
  key: string;
  /** Display label, in CBP's own terms. */
  label: string;
  /** CBP's status words, verbatim ("no delay", "delay", ...). */
  status: string;
  /** Minutes of delay, or null when CBP publishes none. */
  delayMinutes: number | null;
  /** Lanes open, or null when CBP publishes none. */
  lanesOpen: number | null;
  /** CBP's update phrasing, verbatim ("At 11:00 pm PDT"), or null. */
  updateTime: string | null;
}

export interface BorderLaneGroup {
  /** 'passenger' | 'commercial' | 'pedestrian'. */
  key: string;
  label: string;
  /** CBP's maximum lane count for the group ("N/A" upstream → null). */
  maximumLanes: number | null;
  lanes: BorderLane[];
}

export interface BorderPort {
  portNumber: string;
  border: 'Mexican Border' | 'Canadian Border';
  portName: string;
  crossingName: string;
  /** CBP's hours line, verbatim ("24 hrs/day"). */
  hours: string;
  portStatus: string;
  /** Feed record stamp, verbatim ("10/26/2026"). */
  feedDate: string;
  /** Feed record stamp, verbatim ("22:29:17"). */
  feedTime: string;
  constructionNotice: string;
  groups: BorderLaneGroup[];
}

export interface BorderWaitTimesResult {
  ports: BorderPort[];
  byPortNumber: Map<string, BorderPort>;
  /** ISO time of the successful upstream fetch behind this payload. */
  fetchedAt: string | null;
  /** True when this payload is the cache's last good set after a
   *  failed refresh, or when nothing has ever been fetched. */
  stale: boolean;
}

/* ── Raw feed shape (every value a string, any field omittable) ──── */

interface RawLane {
  update_time?: string;
  operational_status?: string;
  delay_minutes?: string;
  lanes_open?: string;
}

interface RawLaneGroup {
  maximum_lanes?: string;
  standard_lanes?: RawLane;
  NEXUS_SENTRI_lanes?: RawLane;
  FAST_lanes?: RawLane;
  ready_lanes?: RawLane;
}

export interface RawCbpPort {
  port_number?: string;
  border?: string;
  port_name?: string;
  crossing_name?: string;
  hours?: string;
  date?: string;
  time?: string;
  port_status?: string;
  commercial_vehicle_lanes?: RawLaneGroup;
  passenger_vehicle_lanes?: RawLaneGroup;
  pedestrian_lanes?: RawLaneGroup;
  construction_notice?: string;
}

/* ── Normalizer ──────────────────────────────────────────────────── */

function cleanStr(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

/** "0" → 0, "" / "N/A" / junk → null. Never coerces a missing
 *  reading into a zero — a port that hasn't reported gets null. */
function numOrNull(v: unknown): number | null {
  const s = cleanStr(v);
  if (!s || s.toUpperCase() === 'N/A') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

const LANE_DEFS: Array<{ raw: keyof RawLaneGroup; key: string; label: string }> = [
  { raw: 'standard_lanes', key: 'standard', label: 'Standard lanes' },
  { raw: 'NEXUS_SENTRI_lanes', key: 'nexusSentri', label: 'NEXUS / SENTRI lanes' },
  { raw: 'ready_lanes', key: 'ready', label: 'Ready lanes' },
  { raw: 'FAST_lanes', key: 'fast', label: 'FAST lanes' },
];

export function normalizeLaneGroup(
  raw: RawLaneGroup | undefined,
  key: string,
  label: string,
): BorderLaneGroup | null {
  if (!raw || typeof raw !== 'object') return null;
  const lanes: BorderLane[] = [];
  for (const def of LANE_DEFS) {
    const entry = raw[def.raw] as RawLane | undefined;
    if (!entry || typeof entry !== 'object') continue;
    const status = cleanStr(entry.operational_status);
    if (!status) continue;
    lanes.push({
      key: def.key,
      label: def.label,
      status,
      delayMinutes: numOrNull(entry.delay_minutes),
      lanesOpen: numOrNull(entry.lanes_open),
      updateTime: cleanStr(entry.update_time) || null,
    });
  }
  if (lanes.length === 0 && raw.maximum_lanes == null) return null;
  return { key, label, maximumLanes: numOrNull(raw.maximum_lanes), lanes };
}

export function normalizePort(raw: RawCbpPort): BorderPort | null {
  if (!raw || typeof raw !== 'object') return null;
  const portNumber = cleanStr(raw.port_number);
  const portName = cleanStr(raw.port_name);
  if (!portNumber || !portName) return null;
  const groups = [
    normalizeLaneGroup(raw.passenger_vehicle_lanes, 'passenger', 'Passenger vehicles'),
    normalizeLaneGroup(raw.commercial_vehicle_lanes, 'commercial', 'Commercial vehicles'),
    normalizeLaneGroup(raw.pedestrian_lanes, 'pedestrian', 'Pedestrians'),
  ].filter((g): g is BorderLaneGroup => g !== null);
  return {
    portNumber,
    border: raw.border === 'Canadian Border' ? 'Canadian Border' : 'Mexican Border',
    portName,
    crossingName: cleanStr(raw.crossing_name),
    hours: cleanStr(raw.hours),
    portStatus: cleanStr(raw.port_status),
    feedDate: cleanStr(raw.date),
    feedTime: cleanStr(raw.time),
    constructionNotice: cleanStr(raw.construction_notice),
    groups,
  };
}

export function normalizeCbpPayload(raw: unknown): BorderPort[] {
  if (!Array.isArray(raw)) return [];
  const out: BorderPort[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const port = normalizePort(item as RawCbpPort);
    if (!port || seen.has(port.portNumber)) continue;
    seen.add(port.portNumber);
    out.push(port);
  }
  return out;
}

/* ── Cached fetch (plow/transit pattern: TTL, dedup, stale bridge) ── */

interface CacheEntry {
  ports: BorderPort[];
  fetchedAtMs: number;
  expiresAt: number;
  inflight: Promise<void> | null;
}

let cache: CacheEntry | null = null;
let lastAttemptOk: boolean | null = null;

async function fetchUpstream(): Promise<BorderPort[]> {
  const res = await fetch(CBP_WAIT_TIMES_URL, {
    headers: { 'User-Agent': 'WorldEye border wait times (+https://worldeye.app)' },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`CBP feed HTTP ${res.status}`);
  const ports = normalizeCbpPayload(await res.json());
  if (ports.length === 0) throw new Error('CBP feed parsed to zero ports');
  return ports;
}

/**
 * All ports from CBP's Border Wait Times feed. Never rejects: on a
 * failed refresh it serves the last good payload and flags it stale;
 * before the first successful fetch it serves an empty, stale set so
 * pages render their honest unavailable state.
 */
export async function getBorderWaitTimes(
  now: number = Date.now(),
): Promise<BorderWaitTimesResult> {
  if (!cache) {
    cache = { ports: [], fetchedAtMs: 0, expiresAt: 0, inflight: null };
  }
  const entry = cache;
  if (now >= entry.expiresAt && !entry.inflight) {
    entry.inflight = (async () => {
      try {
        const ports = await fetchUpstream();
        entry.ports = ports;
        entry.fetchedAtMs = now;
        entry.expiresAt = now + BORDER_CACHE_TTL_MS;
        lastAttemptOk = true;
      } catch {
        lastAttemptOk = false;
        // Bridge on the last good set; retry on the next call past a
        // short backoff rather than hammering a down feed.
        entry.expiresAt = now + 60_000;
      } finally {
        entry.inflight = null;
      }
    })();
  }
  if (entry.inflight) await entry.inflight;
  const byPortNumber = new Map(entry.ports.map((p) => [p.portNumber, p]));
  return {
    ports: entry.ports,
    byPortNumber,
    fetchedAt: entry.fetchedAtMs ? new Date(entry.fetchedAtMs).toISOString() : null,
    stale: lastAttemptOk !== true,
  };
}

/** Feed health for the API route's honesty flag. */
export function getBorderFeedStatus(): { ok: boolean | null; fetchedAt: string | null } {
  return {
    ok: lastAttemptOk,
    fetchedAt: cache?.fetchedAtMs ? new Date(cache.fetchedAtMs).toISOString() : null,
  };
}

/** Test hook: drop the module cache between cases. */
export function __resetBorderCacheForTests(): void {
  cache = null;
  lastAttemptOk = null;
}
