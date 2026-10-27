import { cachedSource } from '@/lib/sourceCache';

/**
 * OSIRIS — Snow plow / winter maintenance vehicles.
 *
 * Seven verified public feeds, merged into a single payload by
 * `getPlows` below. Each source is cached and tracked
 * independently, so one state going down never takes the others with
 * it. (Survey + probe record: ~/workspace/plow-expansion/REPORT.md,
 * 2026-10-26/27; expansion audit: ~/workspace/worldeye-plows-expand/
 * REPORT.md, 2026-10-27.)
 *
 *  • Iowa DOT — "Snow Plow Truck Location (AVL)" ArcGIS Online
 *    FeatureServer, keyless, republished every ~2 minutes, carrying
 *    every active Iowa DOT plow with heading, speed (mph), blade
 *    states and material activity. Verified live from this codebase's
 *    sandbox on 2026-10-26 (48 trucks in the sample pull).
 *  • Utah DOT — `SnowPlow_AVL_Public` on ArcGIS Online (UDOT's UPlan
 *    org), keyless, 906 vehicles with heading + speed + ping
 *    timestamps. Unlike Iowa this is a LAST-KNOWN-POSITION table (it
 *    never purges), so the adapter filters by ping recency server-side
 *    and again in the normalizer — see UTAH_RECENCY_WINDOW_MS.
 *    PRIVACY: the layer's `vehiclefleet`/`username` fields contain
 *    driver first names. They are never requested (`outFields`) and
 *    never mapped; a truck's public identity is its `vehicleid` only.
 *  • Vermont AOT — the Plow Finder app's public vehicle JSON (236
 *    named trucks). The file carries up to 90 minutes of trail per
 *    truck (~4.7 MB); the adapter slims it server-side to the latest
 *    position + heading and drops trucks whose newest ping is older
 *    than the app's own 90-minute trail window, so the file sitting
 *    dormant off-season yields an empty layer, not last January's
 *    fleet. The URL is an unofficial `/test/` path — it lives in
 *    VERMONT_PLOW_FEED_URL so it can move without a code hunt.
 *  • IBI 511 "Track My Plow" — Ontario, Manitoba, Saskatchewan and
 *    Alaska run the same IBI platform this site already reads
 *    cameras from, and their public maps expose the winter fleet via
 *    `/map/mapIcons/ServiceVehicles` (active vehicles) +
 *    `/map/data/ServiceVehicles/{id}` (each vehicle's 2-hour
 *    breadcrumb trail with real UTC timestamps). Verified live
 *    2026-10-27: Ontario and Alaska plowing that night, Saskatchewan
 *    reporting, Manitoba answering with an empty active set. The
 *    marker feed has no timestamps, so a vehicle is only kept once
 *    its trail bounds its recency — see the IBI section below.
 *
 * Held, deliberately NOT integrated (plow-expansion survey +
 * 2026-10-27 expansion audit): Indiana (live on the Castle Rock 511
 * GraphQL platform, but no published reuse terms — a
 * permission/courtesy email to INDOT comes first), Michigan
 * (MiDrive JSON re-probed 2026-10-27: endpoint alive, `[]`
 * pre-season, and the contract still carries NO timestamp field, so
 * staleness cannot be bounded from the data — probationary until
 * re-verified against live trucks in a storm), Nebraska / Colorado /
 * Minnesota (Castle Rock data-feed agreement territory), Alberta
 * (same IBI endpoints as its integrated neighbours, but its detail
 * records carry zero trail states — no timestamp exists anywhere in
 * the payload, so recency cannot be bounded).
 *
 * The IBI 511 family's LIST resources were probed for a sibling plow
 * resource (2026-10-26): every plausible resource name returns the
 * platform's HTTP 500 for unknown resources. The fleets live on the
 * MAP endpoints instead (above); the other IBI deployments probed
 * (WI, New England 511, ID, QC, NB, NS, PE, NL, YT) return 404 or an
 * HTML shell for the map endpoint, and WV/MA return HTML — no plow
 * feed is claimed for any of them. Finland's Digitraffic maintenance
 * tracking answers keyless, but its REST shape is driven-route
 * history (LineStrings, ~80k features / 4 MB), not latest vehicle
 * points.
 *
 * Honesty rules, same as the other layers: if a feed is down the layer
 * is empty for that state and the route says `stale` — positions are
 * never fabricated or carried forward as if current. The cache below
 * only bridges a failed refresh with the last good set, and the
 * feed-status flag reports that this happened. For Utah and Vermont
 * the aggregator additionally re-applies the recency window at read
 * time, so a bridged set can never resurrect trucks whose pings have
 * aged past the window.
 */

export interface Plow {
  id: string;
  /** The truck's public label (Iowa "A-name", Utah vehicle id, Vermont's public plow name, IBI 511 vehicle asset id), when given. */
  label?: string;
  lat: number;
  lng: number;
  /** Degrees clockwise from north, when the truck reports it. */
  heading?: number;
  /** Ground speed, mph, rounded. */
  speed?: number;
  /**
   * Blade state in words — present only when the truck reports a real
   * blade reading. Iowa codes the four blade-state fields 9999 for
   * "no data", which most trucks report outside an active storm.
   * Utah and Vermont publish no blade/material fields at all, so
   * their trucks never carry a status — none is inferred.
   */
  status?: string;
  agency: string;
  /** ISO timestamp of the truck's last AVL ping (UTC at the source). */
  updatedAt: string;
}

/* ── Shared helpers ──────────────────────────────────────────────── */

function finiteIn(v: unknown, min: number, max: number): number | null {
  return typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max ? v : null;
}

/** Parse a coordinate that may arrive as a string (Vermont) or number. */
function coordIn(v: unknown, min: number, max: number): number | null {
  const n = typeof v === 'string' ? parseFloat(v) : v;
  return finiteIn(n, min, max);
}

function dedupe(plows: Plow[]): Plow[] {
  const seen = new Set<string>();
  const out: Plow[] = [];
  for (const p of plows) {
    if (!seen.has(p.id)) {
      seen.add(p.id);
      out.push(p);
    }
  }
  return out;
}

/* Per-source feed health, recorded by each fetcher itself — it only
   runs on a real upstream attempt, which is exactly when the answer
   changes. The route reads the aggregate via getPlowFeedStatus(). */
type PlowSourceId = 'iowa' | 'utah' | 'vermont' | 'ontario' | 'manitoba' | 'saskatchewan' | 'alaska';
const sourceHealth: Record<PlowSourceId, { ok: boolean | null; fetchedAt: string | null }> = {
  iowa: { ok: null, fetchedAt: null },
  utah: { ok: null, fetchedAt: null },
  vermont: { ok: null, fetchedAt: null },
  ontario: { ok: null, fetchedAt: null },
  manitoba: { ok: null, fetchedAt: null },
  saskatchewan: { ok: null, fetchedAt: null },
  alaska: { ok: null, fetchedAt: null },
};

function recordAttempt(source: PlowSourceId, ok: boolean): void {
  sourceHealth[source].ok = ok;
  if (ok) sourceHealth[source].fetchedAt = new Date().toISOString();
}

/**
 * Aggregate feed health for the route's `stale` flag: `ok` is true only
 * when every source that has been attempted succeeded on its latest
 * attempt — one state down makes the combined set incomplete, which is
 * exactly what `stale` exists to say. `fetchedAt` is the most recent
 * successful fetch across sources.
 */
export function getPlowFeedStatus(): { ok: boolean | null; fetchedAt: string | null } {
  const states = Object.values(sourceHealth);
  const attempted = states.filter(s => s.ok !== null);
  const ok = attempted.length === 0 ? null : attempted.every(s => s.ok === true);
  const times = states.map(s => s.fetchedAt).filter((t): t is string => t != null).sort();
  return { ok, fetchedAt: times.length ? times[times.length - 1] : null };
}

/* ── Iowa DOT — ArcGIS AVL FeatureServer ─────────────────────────── */

/** One feature of the ArcGIS GeoJSON response — only the fields we read. */
export interface IowaAvlFeature {
  type?: string;
  geometry?: { type?: string; coordinates?: [number, number] } | null;
  properties?: {
    OBJECTID?: number | null;
    LABEL?: string | null;
    XPOSITION?: number | null;
    YPOSITION?: number | null;
    HEADING?: number | null;
    VELOCITY?: number | null;
    FRONTPLOWSTATE?: number | null;
    RIGHTWINGPLOWSTATE?: number | null;
    LEFTWINGPLOWSTATE?: number | null;
    UNDERBELLYPLOWSTATE?: number | null;
    MODIFIEDDT?: number | null;
  } | null;
}

/* Iowa's state bounds, slightly padded — drops the occasional
   mis-geocoded row the way the camera loaders drop theirs. */
const IOWA_BOUNDS = { minLat: 40.2, maxLat: 43.7, minLng: -96.9, maxLng: -89.9 };

/**
 * Blade wording from the four blade-state fields. Iowa documents 1 as
 * blade down / engaged and 0 as up; 9999 (and null) mean the truck is
 * not reporting. A truck with no real reading gets no status at all —
 * "unknown" rendered as a status would be a claim the feed didn't make.
 */
export function bladeStatus(props: NonNullable<IowaAvlFeature['properties']>): string | undefined {
  const states = [props.FRONTPLOWSTATE, props.RIGHTWINGPLOWSTATE, props.LEFTWINGPLOWSTATE, props.UNDERBELLYPLOWSTATE]
    .filter((s): s is number => typeof s === 'number' && Number.isFinite(s) && s !== 9999);
  if (!states.length) return undefined;
  return states.some(s => s === 1) ? 'Plowing' : 'Blade up';
}

/** Map one ArcGIS GeoJSON feature to a plow, or null if it can't be placed. */
export function normalizeIowaFeature(f: IowaAvlFeature): Plow | null {
  const props = f?.properties ?? {};
  const coords = f?.geometry?.coordinates;
  const lng = finiteIn(coords?.[0], -180, 180) ?? finiteIn(props.XPOSITION, -180, 180);
  const lat = finiteIn(coords?.[1], -90, 90) ?? finiteIn(props.YPOSITION, -90, 90);
  if (lat == null || lng == null) return null;
  if (lat < IOWA_BOUNDS.minLat || lat > IOWA_BOUNDS.maxLat || lng < IOWA_BOUNDS.minLng || lng > IOWA_BOUNDS.maxLng) return null;

  const updatedMs = typeof props.MODIFIEDDT === 'number' && Number.isFinite(props.MODIFIEDDT) ? props.MODIFIEDDT : null;
  if (updatedMs == null) return null;

  const label = typeof props.LABEL === 'string' && props.LABEL.trim() ? props.LABEL.trim() : undefined;
  const heading = finiteIn(props.HEADING, 0, 360);
  const speed = finiteIn(props.VELOCITY, 0, 120);
  const status = bladeStatus(props);

  return {
    id: `iowa-${label ?? props.OBJECTID ?? `${lat},${lng}`}`,
    ...(label ? { label } : {}),
    lat,
    lng,
    ...(heading != null ? { heading } : {}),
    ...(speed != null ? { speed: Math.round(speed) } : {}),
    ...(status ? { status } : {}),
    agency: 'Iowa DOT',
    updatedAt: new Date(updatedMs).toISOString(),
  };
}

/** Map a whole ArcGIS GeoJSON FeatureCollection, dropping unplaceable rows. */
export function normalizeIowaFeed(fc: { features?: IowaAvlFeature[] } | null | undefined): Plow[] {
  const out: Plow[] = [];
  for (const f of fc?.features ?? []) {
    const plow = normalizeIowaFeature(f);
    if (plow) out.push(plow);
  }
  return dedupe(out);
}

const IOWA_AVL_QUERY =
  'https://services.arcgis.com/8lRhdTsQyJpO52F1/arcgis/rest/services/AVL_Direct_View/FeatureServer/0/query' +
  '?where=1%3D1&outFields=OBJECTID,LABEL,XPOSITION,YPOSITION,HEADING,VELOCITY,' +
  'FRONTPLOWSTATE,RIGHTWINGPLOWSTATE,LEFTWINGPLOWSTATE,UNDERBELLYPLOWSTATE,MODIFIEDDT' +
  '&outSR=4326&f=geojson&resultRecordCount=2000&orderByFields=OBJECTID';

async function fetchIowaPlows(): Promise<Plow[]> {
  try {
    const res = await fetch(IOWA_AVL_QUERY, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`Iowa DOT AVL HTTP ${res.status}`);
    const fc = await res.json();
    const plows = normalizeIowaFeed(fc);
    recordAttempt('iowa', true);
    return plows;
  } catch (e) {
    recordAttempt('iowa', false);
    throw e;
  }
}

/* ── Utah DOT — SnowPlow_AVL_Public (ArcGIS Online, UPlan org) ───── */

/**
 * One feature of the UDOT GeoJSON response — ONLY the fields we read.
 * The layer also carries `vehiclefleet` and `username`, which contain
 * driver first names: they are deliberately absent here, excluded from
 * the query's `outFields`, and never mapped. A truck's public identity
 * is its `vehicleid`, nothing else.
 */
export interface UtahAvlFeature {
  type?: string;
  geometry?: { type?: string; coordinates?: [number, number] } | null;
  properties?: {
    vehicleid?: string | null;
    heading?: number | null;
    speedmph?: number | null;
    location_timestamp?: number | null;
  } | null;
}

/**
 * Utah's table is last-known-position: all 906 vehicles, freshest ping
 * 38 min old at the October probe and only 2 rows under 60 min. The
 * survey recommends a 60-minute recency window (tuned in-season), and
 * that is what ships — applied in the query's `where` AND in the
 * normalizer, so a stale row can't reach the client by either door.
 */
export const UTAH_RECENCY_WINDOW_MS = 60 * 60 * 1000;

/* Utah's state bounds, slightly padded — same mis-geocode guard as Iowa. */
const UTAH_BOUNDS = { minLat: 36.8, maxLat: 42.2, minLng: -114.2, maxLng: -108.9 };

/** Map one UDOT GeoJSON feature to a plow, or null if stale/unplaceable. */
export function normalizeUtahFeature(f: UtahAvlFeature, nowMs: number = Date.now()): Plow | null {
  const props = f?.properties ?? {};
  const coords = f?.geometry?.coordinates;
  const lng = finiteIn(coords?.[0], -180, 180);
  const lat = finiteIn(coords?.[1], -90, 90);
  if (lat == null || lng == null) return null;
  if (lat < UTAH_BOUNDS.minLat || lat > UTAH_BOUNDS.maxLat || lng < UTAH_BOUNDS.minLng || lng > UTAH_BOUNDS.maxLng) return null;

  const updatedMs = typeof props.location_timestamp === 'number' && Number.isFinite(props.location_timestamp)
    ? props.location_timestamp
    : null;
  if (updatedMs == null) return null;
  if (nowMs - updatedMs > UTAH_RECENCY_WINDOW_MS) return null; // parked truck, not a live claim
  if (updatedMs - nowMs > 5 * 60 * 1000) return null; // ping from the future — source clock is wrong

  /* The vehicle id is both the plow's id and its label. There is no
     fallback: the only other identity fields in this layer are the
     driver-name fields, which never reach the client. */
  const vehicleId = typeof props.vehicleid === 'string' && props.vehicleid.trim() ? props.vehicleid.trim() : null;
  if (vehicleId == null) return null;

  const heading = finiteIn(props.heading, 0, 360);
  const speed = finiteIn(props.speedmph, 0, 120);
  /* No `status`: `servicetype` is a motion state (Idle/Moving/Stop),
     not a blade or material state, and this layer has no blade or
     material fields — per the conservative status rule, none is mapped. */

  return {
    id: `utah-${vehicleId}`,
    label: vehicleId,
    lat,
    lng,
    ...(heading != null ? { heading } : {}),
    ...(speed != null ? { speed: Math.round(speed) } : {}),
    agency: 'Utah DOT',
    updatedAt: new Date(updatedMs).toISOString(),
  };
}

/** Map a whole UDOT GeoJSON FeatureCollection, dropping stale/unplaceable rows. */
export function normalizeUtahFeed(
  fc: { features?: UtahAvlFeature[] } | null | undefined,
  nowMs: number = Date.now(),
): Plow[] {
  const out: Plow[] = [];
  for (const f of fc?.features ?? []) {
    const plow = normalizeUtahFeature(f, nowMs);
    if (plow) out.push(plow);
  }
  return dedupe(out);
}

const UTAH_AVL_QUERY_BASE =
  'https://services.arcgis.com/pA2nEVnB6tquxgOW/arcgis/rest/services/SnowPlow_AVL_Public/FeatureServer/0/query';
/* The layer's maxRecordCount — one page. Paging below is defensive:
   with the recency `where` the result is normally a handful of rows. */
const UTAH_PAGE_SIZE = 1000;
const UTAH_MAX_PAGES = 10;

/**
 * The recency cutoff as an ArcGIS TIMESTAMP literal ('YYYY-MM-DD
 * HH:MM:SS', UTC). Hosted-service date fields reject epoch-ms
 * comparisons — the literal form is required.
 */
export function utahRecencyCutoffLiteral(nowMs: number): string {
  return new Date(nowMs - UTAH_RECENCY_WINDOW_MS).toISOString().slice(0, 19).replace('T', ' ');
}

async function fetchUtahPlows(): Promise<Plow[]> {
  try {
    const nowMs = Date.now();
    const features: UtahAvlFeature[] = [];
    for (let page = 0; page < UTAH_MAX_PAGES; page++) {
      const params = new URLSearchParams({
        where: `location_timestamp > TIMESTAMP '${utahRecencyCutoffLiteral(nowMs)}'`,
        /* Only the fields the normalizer reads — the driver-name fields
           stay on UDOT's server. */
        outFields: 'vehicleid,heading,speedmph,location_timestamp',
        outSR: '4326',
        f: 'geojson',
        resultRecordCount: String(UTAH_PAGE_SIZE),
        resultOffset: String(page * UTAH_PAGE_SIZE),
      });
      const res = await fetch(`${UTAH_AVL_QUERY_BASE}?${params}`, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) throw new Error(`Utah DOT AVL HTTP ${res.status}`);
      const fc = await res.json();
      const batch = (fc?.features ?? []) as UtahAvlFeature[];
      features.push(...batch);
      if (batch.length === 0 || fc?.properties?.exceededTransferLimit !== true) break;
    }
    const plows = normalizeUtahFeed({ features }, nowMs);
    recordAttempt('utah', true);
    return plows;
  } catch (e) {
    recordAttempt('utah', false);
    throw e;
  }
}

/* ── Vermont AOT — Plow Finder vehicle JSON ──────────────────────── */

/**
 * The data file behind VTrans' public Plow Finder app. The `/test/`
 * path is unofficial and could move, so the URL lives here as config —
 * one line to change, and a dead URL degrades to an empty Vermont set
 * via the per-source cache, never an error for the other states.
 */
export const VERMONT_PLOW_FEED_URL =
  'https://resources.vtrans.vermont.gov/test/plows/assets/vehicleJSON.json';

/**
 * Staleness gate: the app renders the last 90 minutes of trail, and
 * trucks transmit about once a minute in-season. A truck whose newest
 * ping is older than this is not shown — which is also what makes the
 * off-season dormant file (a January snapshot) read as an empty layer.
 */
export const VERMONT_STALE_WINDOW_MS = 90 * 60 * 1000;

/* Vermont's state bounds, slightly padded — same mis-geocode guard. */
const VERMONT_BOUNDS = { minLat: 42.6, maxLat: 45.1, minLng: -73.5, maxLng: -71.4 };

/**
 * One vehicle of the VTrans file. `coords` is the truck's trail,
 * newest first, as [lat, lng, "M/D/YYYY h:mm:ss AM"] triples (lat
 * first, strings, America/New_York wall time). The normalizer reads
 * coords[0] ONLY — the trail never reaches the client payload.
 */
export interface VermontVehicle {
  /** The truck's public plow name ("Woodford Sands") — the label. */
  id?: string | null;
  /** The truck number ("16188") — the id. */
  name?: string | null;
  /** Degrees, as a string in the file; present on every truck. */
  heading?: string | number | null;
  coords?: [unknown, unknown, unknown][] | null;
}

/* The file's timestamps are naive America/New_York wall times. Parsing
   them as if they were UTC would misplace every ping by 4–5 hours, so
   they are converted through the real zone rules (EST/EDT aware). */
const nyWallFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York',
  hourCycle: 'h23',
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit',
});

function tzOffsetMs(utcMs: number): number {
  const parts: Record<string, number> = {};
  for (const p of nyWallFormat.formatToParts(new Date(utcMs))) {
    if (p.type !== 'literal') parts[p.type] = Number(p.value);
  }
  const wallAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return wallAsUtc - Math.floor(utcMs / 1000) * 1000;
}

function nyWallTimeToUtcMs(year: number, monthIdx: number, day: number, hour: number, minute: number, second: number): number {
  const wallAsUtc = Date.UTC(year, monthIdx, day, hour, minute, second);
  const first = wallAsUtc - tzOffsetMs(wallAsUtc);
  return wallAsUtc - tzOffsetMs(first); // re-check the offset at the candidate instant (DST edges)
}

const VT_TIMESTAMP_RE = /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})\s*(AM|PM)$/i;

/** Parse one VTrans trail timestamp ("1/8/2026 7:20:25 AM") to epoch ms, or null. */
export function parseVermontTimestamp(raw: unknown): number | null {
  if (typeof raw !== 'string') return null;
  const m = VT_TIMESTAMP_RE.exec(raw.trim());
  if (!m) return null;
  const month = Number(m[1]);
  const day = Number(m[2]);
  const year = Number(m[3]);
  const hour12 = Number(m[4]);
  const minute = Number(m[5]);
  const second = Number(m[6]);
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour12 < 1 || hour12 > 12 || minute > 59 || second > 59) return null;
  let hour = hour12 % 12;
  if (m[7].toUpperCase() === 'PM') hour += 12;
  return nyWallTimeToUtcMs(year, month - 1, day, hour, minute, second);
}

/** Map one VTrans vehicle to a plow (latest position only), or null. */
export function normalizeVermontVehicle(v: VermontVehicle, nowMs: number = Date.now()): Plow | null {
  const latest = Array.isArray(v?.coords) ? v.coords[0] : undefined;
  if (!latest) return null;

  const lat = coordIn(latest[0], -90, 90);
  const lng = coordIn(latest[1], -180, 180);
  if (lat == null || lng == null) return null;
  if (lat < VERMONT_BOUNDS.minLat || lat > VERMONT_BOUNDS.maxLat || lng < VERMONT_BOUNDS.minLng || lng > VERMONT_BOUNDS.maxLng) return null;

  const updatedMs = parseVermontTimestamp(latest[2]);
  if (updatedMs == null) return null;
  if (nowMs - updatedMs > VERMONT_STALE_WINDOW_MS) return null; // dormant file / parked truck
  if (updatedMs - nowMs > 5 * 60 * 1000) return null; // ping from the future — source clock is wrong

  const truckNo = typeof v.name === 'string' && v.name.trim() ? v.name.trim() : null;
  if (truckNo == null) return null;

  const label = typeof v.id === 'string' && v.id.trim() ? v.id.trim() : undefined;
  const heading = finiteIn(typeof v.heading === 'string' ? parseInt(v.heading, 10) : v.heading, 0, 360);
  /* No speed (never inferred from trail deltas) and no status — the
     file carries neither, per the conservative rules. */

  return {
    id: `vermont-${truckNo}`,
    ...(label ? { label } : {}),
    lat,
    lng,
    ...(heading != null ? { heading } : {}),
    agency: 'Vermont AOT',
    updatedAt: new Date(updatedMs).toISOString(),
  };
}

/** Map the whole VTrans file, dropping stale/unplaceable vehicles. */
export function normalizeVermontFeed(vehicles: VermontVehicle[] | null | undefined, nowMs: number = Date.now()): Plow[] {
  const out: Plow[] = [];
  for (const v of vehicles ?? []) {
    const plow = normalizeVermontVehicle(v, nowMs);
    if (plow) out.push(plow);
  }
  return dedupe(out);
}

async function fetchVermontPlows(): Promise<Plow[]> {
  try {
    const res = await fetch(VERMONT_PLOW_FEED_URL, {
      headers: { Accept: 'application/json' },
      /* The dormant file is ~4.7 MB — give it more room than the
         ArcGIS queries, but fetch it server-side only; the client
         only ever sees the slimmed latest positions. */
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) throw new Error(`Vermont AOT plow JSON HTTP ${res.status}`);
    const vehicles = await res.json();
    const plows = normalizeVermontFeed(Array.isArray(vehicles) ? vehicles : [], Date.now());
    recordAttempt('vermont', true);
    return plows;
  } catch (e) {
    recordAttempt('vermont', false);
    throw e;
  }
}

/* ── IBI 511 "Track My Plow" — Ontario · Manitoba · Saskatchewan · Alaska ──
 *
 * Four deployments of the IBI 511 platform (the same vendor stack
 * this site already reads cameras from) publish their winter fleets
 * through two public map endpoints, verified live 2026-10-27:
 *
 *   GET {base}/map/mapIcons/ServiceVehicles
 *     → { item2: [{ itemId, location: [lat, lng] }] } — the ACTIVE set.
 *       The platform drops a vehicle after ~2 h inactive (each site's
 *       own winter-terminology page says so), but the markers carry
 *       NO timestamps.
 *   GET {base}/map/data/ServiceVehicles/{itemId}
 *     → { id, name, states: [{ latitude, longitude, speed, bearing,
 *       updated }] } — the vehicle's breadcrumb trail for the same
 *       ~2 h, oldest first, `updated` in UTC with no suffix
 *       (Saskatchewan adds fractional seconds).
 *
 * So presence in the marker feed is never by itself a live claim: a
 * vehicle is kept only when its trail's latest state lands inside
 * IBI_PLOW_RECENCY_MS. A vehicle whose detail record can't be read
 * (or has no states — Alberta's deployment, which is why Alberta is
 * NOT integrated) is dropped, never stamped with fetch time.
 *
 * Labels are the agencies' published vehicle asset ids — Ontario
 * "2021-02-191-1625", Saskatchewan "M4308", Alaska "40204" —
 * equipment ids, not people. These payloads carry no driver field at
 * all, and the interfaces below still declare only the fields read.
 * No blade/material field exists in the trail → no status is mapped.
 * Trail speeds on the Canadian deployments are km/h and are
 * converted to this layer's mph; Alaska's deployment does not
 * document its unit, so Alaska speed is omitted rather than guessed.
 */

/** One marker of the mapIcons response — only the fields we read. */
export interface IbiPlowMarker {
  itemId?: string | number | null;
  /** [lat, lng] — the platform's order. Used only as a fallback if a
      trail state lacks coordinates. */
  location?: [number, number] | null;
}

/** One breadcrumb of a vehicle's trail — only the fields we read. */
export interface IbiPlowState {
  latitude?: number | null;
  longitude?: number | null;
  speed?: number | null;
  bearing?: number | null;
  /** UTC, ISO-shaped but suffix-less: "2026-10-27T04:51:03" (SK: ".36"). */
  updated?: string | null;
}

/** One vehicle's detail record — only the fields we read. */
export interface IbiPlowDetail {
  id?: number | null;
  /** The vehicle's public asset id (a fleet number, never a person). */
  name?: string | null;
  states?: IbiPlowState[] | null;
}

/** What separates one province/state deployment from another. */
export interface IbiPlowConfig {
  source: PlowSourceId;
  /** Origin, e.g. `https://511on.ca`. */
  base: string;
  agency: string;
  /** Prefixes every plow id, so two deployments can't collide. */
  idPrefix: string;
  /** True when the deployment's trail speeds are km/h (Canada). */
  speedKmh: boolean;
  /** Drops mis-geocoded rows — every one of these feeds has a few. */
  bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number };
}

/** The platform's own activity window: no pings for ~2 h and the
    vehicle leaves the public map. Our recency gate matches it. */
export const IBI_PLOW_RECENCY_MS = 120 * 60 * 1000;

export const IBI_PLOW_CONFIGS: Record<'ontario' | 'manitoba' | 'saskatchewan' | 'alaska', IbiPlowConfig> = {
  ontario: {
    source: 'ontario', base: 'https://511on.ca', agency: 'Ontario 511', idPrefix: 'ontario',
    speedKmh: true, bounds: { minLat: 41.0, maxLat: 57.5, minLng: -96.0, maxLng: -73.0 },
  },
  manitoba: {
    source: 'manitoba', base: 'https://www.manitoba511.ca', agency: 'Manitoba 511', idPrefix: 'manitoba',
    speedKmh: true, bounds: { minLat: 48.9, maxLat: 60.1, minLng: -102.2, maxLng: -88.4 },
  },
  saskatchewan: {
    source: 'saskatchewan', base: 'https://hotline.gov.sk.ca', agency: 'Saskatchewan Highway Hotline', idPrefix: 'saskatchewan',
    speedKmh: true, bounds: { minLat: 48.9, maxLat: 60.1, minLng: -110.1, maxLng: -101.2 },
  },
  alaska: {
    source: 'alaska', base: 'https://511.alaska.gov', agency: 'Alaska 511', idPrefix: 'alaska',
    speedKmh: false, bounds: { minLat: 51.0, maxLat: 72.5, minLng: -180.0, maxLng: -128.0 },
  },
};

const IBI_TIMESTAMP_RE = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?)(Z)?$/;

/** Parse one trail timestamp to epoch ms. The stamps are UTC with the
    suffix omitted (the platform's own map parses them with
    moment.utc()), so a missing suffix means UTC, not local time. */
export function parseIbiPlowTimestamp(raw: unknown): number | null {
  if (typeof raw !== 'string') return null;
  const m = IBI_TIMESTAMP_RE.exec(raw.trim());
  if (!m) return null;
  const ms = Date.parse(`${m[1]}Z`);
  return Number.isFinite(ms) ? ms : null;
}

/** Map one IBI vehicle (marker + its trail detail) to a plow, or null. */
export function normalizeIbiPlowVehicle(
  marker: IbiPlowMarker | null | undefined,
  detail: IbiPlowDetail | null | undefined,
  cfg: IbiPlowConfig,
  nowMs: number = Date.now(),
): Plow | null {
  const itemId = marker?.itemId == null ? '' : String(marker.itemId).trim();
  if (!itemId) return null;

  /* The latest state by its own timestamp — trail order is the
     platform's claim, not ours, so it is not trusted. */
  let latest: { state: IbiPlowState; ms: number } | null = null;
  for (const s of Array.isArray(detail?.states) ? detail.states : []) {
    const ms = parseIbiPlowTimestamp(s?.updated);
    if (ms == null) continue;
    if (!latest || ms > latest.ms) latest = { state: s, ms };
  }
  if (!latest) return null; // no timestamped state — recency cannot be bounded
  if (nowMs - latest.ms > IBI_PLOW_RECENCY_MS) return null; // inactive past the platform's own window
  if (latest.ms - nowMs > 5 * 60 * 1000) return null; // ping from the future — source clock is wrong

  const lat = finiteIn(latest.state.latitude, -90, 90) ?? finiteIn(marker?.location?.[0], -90, 90);
  const lng = finiteIn(latest.state.longitude, -180, 180) ?? finiteIn(marker?.location?.[1], -180, 180);
  if (lat == null || lng == null) return null;
  const b = cfg.bounds;
  if (lat < b.minLat || lat > b.maxLat || lng < b.minLng || lng > b.maxLng) return null;

  const name = typeof detail?.name === 'string' && detail.name.trim() && detail.name.trim().length <= 40
    ? detail.name.trim()
    : undefined;
  const heading = finiteIn(latest.state.bearing, 0, 360);
  const rawSpeed = finiteIn(latest.state.speed, 0, 200);
  /* km/h → mph on the Canadian deployments; Alaska's unit is
     undocumented, so its speed is not mapped at all. */
  const speed = cfg.speedKmh && rawSpeed != null ? Math.round(rawSpeed * 0.621371) : undefined;

  return {
    id: `${cfg.idPrefix}-${itemId}`,
    ...(name ? { label: name } : {}),
    lat,
    lng,
    ...(heading != null ? { heading: Math.round(heading) } : {}),
    ...(speed != null ? { speed } : {}),
    agency: cfg.agency,
    updatedAt: new Date(latest.ms).toISOString(),
  };
}

/** Map a whole marker set with its per-vehicle detail records. */
export function normalizeIbiPlowFeed(
  markers: IbiPlowMarker[] | null | undefined,
  details: ReadonlyMap<string, IbiPlowDetail | null>,
  cfg: IbiPlowConfig,
  nowMs: number = Date.now(),
): Plow[] {
  const out: Plow[] = [];
  for (const m of markers ?? []) {
    const key = m?.itemId == null ? '' : String(m.itemId).trim();
    if (!key) continue;
    const plow = normalizeIbiPlowVehicle(m, details.get(key) ?? null, cfg, nowMs);
    if (plow) out.push(plow);
  }
  return dedupe(out);
}

/* Detail records are fetched a page at a time, the way the IBI camera
   loader batches: ten at once brought every sibling deployment well
   inside its budget, and these records are a few KB each. */
const IBI_PLOW_DETAIL_CONCURRENCY = 10;
/** Safety bound so a pathological marker set can't fan out forever.
    Province-wide simultaneous actives run to a few hundred in a
    major storm — comfortably under this. */
const IBI_PLOW_MAX_VEHICLES = 600;

async function fetchIbiPlowDetail(cfg: IbiPlowConfig, itemId: string): Promise<IbiPlowDetail | null> {
  try {
    const res = await fetch(`${cfg.base}/map/data/ServiceVehicles/${encodeURIComponent(itemId)}`, {
      headers: { 'User-Agent': 'WorldEye plow layer (worldeye.app)', 'X-Requested-With': 'XMLHttpRequest', Accept: 'application/json' },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    return data && typeof data === 'object' ? (data as IbiPlowDetail) : null;
  } catch {
    return null; // an unreadable trail drops the vehicle, never the source
  }
}

async function fetchIbiPlows(cfg: IbiPlowConfig): Promise<Plow[]> {
  try {
    const res = await fetch(`${cfg.base}/map/mapIcons/ServiceVehicles`, {
      headers: { 'User-Agent': 'WorldEye plow layer (worldeye.app)', 'X-Requested-With': 'XMLHttpRequest', Accept: 'application/json' },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`${cfg.agency} ServiceVehicles HTTP ${res.status}`);
    const data = await res.json().catch(() => null);
    const markers: IbiPlowMarker[] = Array.isArray(data?.item2) ? data.item2 : [];

    const ids: string[] = [];
    const seen = new Set<string>();
    for (const m of markers) {
      const id = m?.itemId == null ? '' : String(m.itemId).trim();
      if (id && !seen.has(id)) {
        seen.add(id);
        ids.push(id);
      }
    }
    const capped = ids.slice(0, IBI_PLOW_MAX_VEHICLES);

    const details = new Map<string, IbiPlowDetail | null>();
    for (let i = 0; i < capped.length; i += IBI_PLOW_DETAIL_CONCURRENCY) {
      const batch = capped.slice(i, i + IBI_PLOW_DETAIL_CONCURRENCY);
      const results = await Promise.all(batch.map(id => fetchIbiPlowDetail(cfg, id)));
      batch.forEach((id, j) => details.set(id, results[j]));
    }

    const plows = normalizeIbiPlowFeed(markers, details, cfg, Date.now());
    recordAttempt(cfg.source, true);
    return plows;
  } catch (e) {
    recordAttempt(cfg.source, false);
    throw e;
  }
}

/* ── Aggregation ─────────────────────────────────────────────────── */

/**
 * Every currently-reporting plow, per state. Cached 90 s server-side
 * per source — Iowa republishes about every 2 minutes, Utah's pings
 * are activity-driven and Vermont transmits about once a minute
 * in-season, so a shorter TTL would only re-ask for the same trucks.
 * On failure a source's cache keeps its last good set (and
 * `getPlowFeedStatus` reports the failure).
 */
const getIowaPlows = cachedSource<Plow>('plows-iowa-avl', fetchIowaPlows, 90_000);
const getUtahPlows = cachedSource<Plow>('plows-utah-avl', fetchUtahPlows, 90_000);
const getVermontPlows = cachedSource<Plow>('plows-vermont', fetchVermontPlows, 90_000);
/* The IBI sources cost one marker request plus one small detail
   request per active vehicle, and their trails advance on a
   multi-minute cadence — 120 s keeps the fan-out polite. */
const getOntarioPlows = cachedSource<Plow>('plows-ontario-tmp', () => fetchIbiPlows(IBI_PLOW_CONFIGS.ontario), 120_000);
const getManitobaPlows = cachedSource<Plow>('plows-manitoba-tmp', () => fetchIbiPlows(IBI_PLOW_CONFIGS.manitoba), 120_000);
const getSaskatchewanPlows = cachedSource<Plow>('plows-saskatchewan-tmp', () => fetchIbiPlows(IBI_PLOW_CONFIGS.saskatchewan), 120_000);
const getAlaskaPlows = cachedSource<Plow>('plows-alaska-tmp', () => fetchIbiPlows(IBI_PLOW_CONFIGS.alaska), 120_000);

/* Read-time recency enforcement for the windowed feeds: even when the
   cache bridges a failed refresh with a last good set, a truck whose
   ping has since aged past its window is not displayed. Iowa needs
   no window — its feed only ever carries currently-reporting trucks. */
const READ_WINDOWS: Partial<Record<string, number>> = {
  'Utah DOT': UTAH_RECENCY_WINDOW_MS,
  'Vermont AOT': VERMONT_STALE_WINDOW_MS,
  'Ontario 511': IBI_PLOW_RECENCY_MS + 5 * 60 * 1000,
  'Manitoba 511': IBI_PLOW_RECENCY_MS + 5 * 60 * 1000,
  'Saskatchewan Highway Hotline': IBI_PLOW_RECENCY_MS + 5 * 60 * 1000,
  'Alaska 511': IBI_PLOW_RECENCY_MS + 5 * 60 * 1000,
};

/**
 * All plows across the seven verified feeds. Sources are
 * isolated: cachedSource never rejects, so a failed feed contributes
 * its last good set or nothing — never an error that would empty the
 * other states.
 */
export async function getPlows(): Promise<Plow[]> {
  const [iowa, utah, vermont, ontario, manitoba, saskatchewan, alaska] = await Promise.all([
    getIowaPlows(), getUtahPlows(), getVermontPlows(),
    getOntarioPlows(), getManitobaPlows(), getSaskatchewanPlows(), getAlaskaPlows(),
  ]);
  const nowMs = Date.now();
  return dedupe([...iowa, ...utah, ...vermont, ...ontario, ...manitoba, ...saskatchewan, ...alaska]).filter(p => {
    const window = READ_WINDOWS[p.agency];
    if (window == null) return true;
    const pingMs = Date.parse(p.updatedAt);
    return Number.isFinite(pingMs) && nowMs - pingMs <= window;
  });
}
