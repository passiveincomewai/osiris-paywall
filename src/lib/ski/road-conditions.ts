/**
 * Powder Pass — road conditions from state DOT feeds (keyless v1).
 *
 * ONLY the feeds verified keyless in the f10 recon are used:
 *   - California: Caltrans CWWP2 chain-control + lane-closure JSON
 *     (documented, integration invited, per-district files).
 *   - Montana: MDT 511 map layers published as Iteris CDN GeoJSON
 *     (events / restrictions / construction — undocumented map plumbing,
 *     so every payload is schema-checked and a bad shape marks the
 *     state unavailable rather than silently empty).
 *   - Idaho: ITD WZDx GeoJSON — WORK ZONES ONLY. It carries no
 *     incidents, closures-as-events or chain/pass conditions, and is
 *     labelled work-zones-only everywhere it surfaces.
 *
 * Utah, Colorado, Washington, Oregon and Arizona DOT feeds all require
 * a (free) API key; no key has been registered, so those states are NOT
 * covered and this module never pretends otherwise — callers must show
 * the coverage block so an uncovered route's silence never reads as
 * "all clear".
 *
 * Everything here is a live DOT report, never a model or forecast.
 * Normalisers are pure (fixture-tested); the fetch layer uses Next's
 * data cache (revalidate) which doubles as the last-good cache: a
 * failed or stale feed marks its state unavailable and its events are
 * dropped, never served as if current.
 */

export type RoadEventCategory =
  | "chain"
  | "closure"
  | "lane-closure"
  | "restriction"
  | "incident"
  | "workzone";

export interface RoadEvent {
  state: string;
  /** Human source label, e.g. "Caltrans (California DOT)". */
  source: string;
  sourceId: string;
  category: RoadEventCategory;
  route: string;
  description: string;
  statusText: string;
  lat: number;
  lon: number;
  /** Epoch ms of the newest source timestamp for this event. */
  updatedTs: number;
}

export interface RoadFeedResult {
  events: RoadEvent[];
  /** Epoch ms of the feed's own clock (null when the payload has none). */
  feedUpdatedTs: number | null;
}

export interface RoadCoverage {
  state: string;
  source: string;
  /** What this feed covers, stated honestly (e.g. ID = work zones only). */
  label: string;
  status: "ok" | "unavailable";
  feedUpdatedTs: number | null;
  eventCount: number;
}

export interface RoadConditionsPayload {
  events: RoadEvent[];
  coverage: RoadCoverage[];
  fetchedAt: string;
}

/** A feed whose own clock is older than this is treated as stale. */
export const ROAD_FEED_STALE_MS = 30 * 60 * 1000;

/** Corridor half-width for matching an event point to a saved route. */
export const ROAD_CORRIDOR_MILES = 2;

export function isStaleFeed(
  feedUpdatedTs: number | null,
  nowMs: number,
): boolean {
  if (feedUpdatedTs === null) return false;
  return nowMs - feedUpdatedTs > ROAD_FEED_STALE_MS;
}

/* ------------------------------------------------------------------ */
/* Small helpers                                                       */
/* ------------------------------------------------------------------ */

function num(v: unknown): number | null {
  const n = typeof v === "string" ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

export function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s;
}

/** Parse a Caltrans Pacific-local "YYYY-MM-DD" + "HH:MM:SS" to epoch ms. */
export function parsePacificTimestamp(date: string, time: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const t = /^(\d{2}):(\d{2}):(\d{2})$/.exec(time);
  if (!m || !t) return null;
  const asUtc = Date.UTC(+m[1], +m[2] - 1, +m[3], +t[1], +t[2], +t[3]);
  // Offset of America/Los_Angeles at that instant, via Intl round-trip.
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date(asUtc));
  const p: Record<string, number> = {};
  for (const part of parts) if (part.type !== "literal") p[part.type] = +part.value;
  const pacificAsUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour % 24, p.minute, p.second);
  return asUtc + (asUtc - pacificAsUtc);
}

/* ------------------------------------------------------------------ */
/* California — Caltrans CWWP2 chain control                           */
/* {data:[{cc:{index, recordTimestamp{recordDate,recordTime},          */
/*   location{route,latitude,longitude,locationName}, inService,       */
/*   statusData{status,statusDescription,statusTimestamp{...}}}}]}     */
/* ------------------------------------------------------------------ */

export const CALTRANS_SOURCE = "Caltrans (California DOT)";

export function normaliseCaChainControl(payload: unknown): RoadFeedResult {
  const data = (payload as { data?: unknown })?.data;
  if (!Array.isArray(data)) {
    throw new Error("Caltrans chain-control payload failed schema check");
  }
  const events: RoadEvent[] = [];
  let feedUpdatedTs: number | null = null;
  for (const rec of data) {
    const cc = (rec as { cc?: Record<string, unknown> })?.cc;
    if (!cc) continue;
    const rt = cc.recordTimestamp as { recordDate?: string; recordTime?: string } | undefined;
    const recTs = rt ? parsePacificTimestamp(str(rt.recordDate), str(rt.recordTime)) : null;
    if (recTs !== null) {
      feedUpdatedTs = feedUpdatedTs === null ? recTs : Math.max(feedUpdatedTs, recTs);
    }
    const statusData = cc.statusData as
      | { status?: string; statusDescription?: string }
      | undefined;
    const status = str(statusData?.status);
    // R-0 means "no chain controls in effect" — that is the absence of
    // an event, not an event. Only active controls are alerts.
    if (!status || status === "R-0") continue;
    const loc = cc.location as Record<string, unknown> | undefined;
    const lat = num(loc?.latitude);
    const lon = num(loc?.longitude);
    if (lat === null || lon === null) continue;
    const route = str(loc?.route);
    const place = str(loc?.locationName);
    const desc = str(statusData?.statusDescription);
    events.push({
      state: "CA",
      source: CALTRANS_SOURCE,
      sourceId: `ca-cc:${str(cc.index)}`,
      category: "chain",
      route,
      description: truncate(`${place ? `${place} on ` : ""}${route} — ${desc}`, 400),
      statusText: truncate(`${status}: ${desc}`, 300),
      lat,
      lon,
      updatedTs: recTs ?? 0,
    });
  }
  return { events, feedUpdatedTs };
}

/* ------------------------------------------------------------------ */
/* California — Caltrans CWWP2 lane closures                           */
/* {data:[{lcs:{index, recordTimestamp{recordEpoch},                   */
/*   location{begin{beginRoute,beginLatitude,beginLongitude,           */
/*   beginLocationName}, end{...}}, closure{typeOfClosure,             */
/*   lanesClosed, typeOfWork}}}]}                                      */
/* ------------------------------------------------------------------ */

export function normaliseCaLaneClosures(payload: unknown): RoadFeedResult {
  const data = (payload as { data?: unknown })?.data;
  if (!Array.isArray(data)) {
    throw new Error("Caltrans lane-closure payload failed schema check");
  }
  const events: RoadEvent[] = [];
  let feedUpdatedTs: number | null = null;
  for (const rec of data) {
    const lcs = (rec as { lcs?: Record<string, unknown> })?.lcs;
    if (!lcs) continue;
    const rt = lcs.recordTimestamp as { recordEpoch?: string } | undefined;
    const epochSec = num(rt?.recordEpoch);
    const recTs = epochSec !== null ? epochSec * 1000 : null;
    if (recTs !== null) {
      feedUpdatedTs = feedUpdatedTs === null ? recTs : Math.max(feedUpdatedTs, recTs);
    }
    const loc = lcs.location as { begin?: Record<string, unknown> } | undefined;
    const begin = loc?.begin;
    const lat = num(begin?.beginLatitude);
    const lon = num(begin?.beginLongitude);
    if (lat === null || lon === null) continue;
    const closure = lcs.closure as Record<string, unknown> | undefined;
    const typeOfClosure = str(closure?.typeOfClosure);
    const lanesClosed = str(closure?.lanesClosed);
    const typeOfWork = str(closure?.typeOfWork);
    const route = str(begin?.beginRoute);
    const place = str(begin?.beginLocationName);
    const full = /full/i.test(typeOfClosure);
    events.push({
      state: "CA",
      source: CALTRANS_SOURCE,
      sourceId: `ca-lcs:${str(lcs.index)}`,
      category: full ? "closure" : "lane-closure",
      route,
      description: truncate(
        `${typeOfWork || "Road work"} near ${place || route} on ${route}`,
        400,
      ),
      statusText: truncate(
        `${typeOfClosure || "Closure"}${lanesClosed ? ` — lanes closed: ${lanesClosed}` : ""}`,
        300,
      ),
      lat,
      lon,
      updatedTs: recTs ?? 0,
    });
  }
  return { events, feedUpdatedTs };
}

/* ------------------------------------------------------------------ */
/* Montana — MDT via Iteris CDN GeoJSON (events/restrictions/          */
/* construction). Point coordinates arrive as strings.                 */
/* ------------------------------------------------------------------ */

export const MDT_SOURCE = "Montana DOT (MDT 511)";

const MT_CATEGORY: Record<string, RoadEventCategory> = {
  warn: "incident",
  restr: "restriction",
  cnstr: "workzone",
};

export function normaliseMtGeoJson(payload: unknown): RoadFeedResult {
  const features = (payload as { features?: unknown })?.features;
  if (!Array.isArray(features)) {
    throw new Error("Montana GeoJSON payload failed schema check");
  }
  const events: RoadEvent[] = [];
  let feedUpdatedTs: number | null = null;
  for (const f of features) {
    const feat = f as {
      properties?: Record<string, unknown>;
      geometry?: { coordinates?: unknown };
    };
    const props = feat.properties;
    if (!props) continue;
    const coords = feat.geometry?.coordinates;
    if (!Array.isArray(coords) || coords.length < 2) continue;
    const lon = num(coords[0]);
    const lat = num(coords[1]);
    if (lat === null || lon === null) continue;
    const lastUpdateSec = num(props.last_update);
    const updatedTs = lastUpdateSec !== null ? lastUpdateSec * 1000 : 0;
    if (lastUpdateSec !== null) {
      feedUpdatedTs =
        feedUpdatedTs === null ? updatedTs : Math.max(feedUpdatedTs, updatedTs);
    }
    const category = MT_CATEGORY[str(props.category)] ?? "incident";
    const headline = str(props.headline);
    const report = stripHtml(str(props.report));
    events.push({
      state: "MT",
      source: MDT_SOURCE,
      sourceId: `mt:${str(props.event_id)}`,
      category,
      route: str(props.route),
      description: truncate(
        report || str(props.location_description) || headline,
        400,
      ),
      statusText: truncate(headline || category, 300),
      lat,
      lon,
      updatedTs,
    });
  }
  // NB: MT's payload carries no feed clock — last_update is per-event
  // and standing advisories can be weeks old on a healthy feed. The
  // fetch layer therefore judges MT availability on fetch + schema
  // success, and feedUpdatedTs here is only "newest event update".
  return { events, feedUpdatedTs };
}

/* ------------------------------------------------------------------ */
/* Idaho — ITD WZDx GeoJSON. WORK ZONES ONLY (see header).             */
/* ------------------------------------------------------------------ */

export const ITD_SOURCE = "Idaho Transportation Department (511 WZDx)";

export function normaliseIdWzdx(payload: unknown): RoadFeedResult {
  const root = payload as {
    feed_info?: { update_date?: string };
    features?: unknown;
  };
  if (!Array.isArray(root?.features)) {
    throw new Error("Idaho WZDx payload failed schema check");
  }
  const feedTs = root.feed_info?.update_date
    ? Date.parse(root.feed_info.update_date)
    : NaN;
  const feedUpdatedTs = Number.isFinite(feedTs) ? feedTs : null;
  const events: RoadEvent[] = [];
  for (const f of root.features as Array<Record<string, unknown>>) {
    const props = f.properties as Record<string, unknown> | undefined;
    const core = props?.core_details as Record<string, unknown> | undefined;
    if (!core || core.event_type !== "work-zone") continue;
    const geom = f.geometry as { coordinates?: unknown } | undefined;
    let coords: unknown = geom?.coordinates;
    // MultiPoint / LineString: take the first point.
    while (Array.isArray(coords) && Array.isArray(coords[0])) {
      coords = (coords as unknown[])[0];
    }
    if (!Array.isArray(coords) || coords.length < 2) continue;
    const lon = num(coords[0]);
    const lat = num(coords[1]);
    if (lat === null || lon === null) continue;
    const upd = core.update_date ? Date.parse(str(core.update_date)) : NaN;
    const roadNames = Array.isArray(core.road_names)
      ? (core.road_names as unknown[]).filter(
          (r): r is string => typeof r === "string",
        )
      : [];
    events.push({
      state: "ID",
      source: ITD_SOURCE,
      sourceId: `id-wzdx:${str(f.id as string) || str(props?.road_event_id)}`,
      category: "workzone",
      route: roadNames[0] ?? "",
      description: truncate(str(core.description).trim(), 400),
      statusText: truncate(
        `Work zone${props?.vehicle_impact ? ` — vehicle impact: ${str(props.vehicle_impact)}` : ""}`,
        300,
      ),
      lat,
      lon,
      updatedTs: Number.isFinite(upd) ? upd : (feedUpdatedTs ?? 0),
    });
  }
  return { events, feedUpdatedTs };
}

/* ------------------------------------------------------------------ */
/* Corridor matching                                                   */
/* ------------------------------------------------------------------ */

const KM_PER_DEG_LAT = 110.574;
const MILES_PER_KM = 0.621371;

function pointToSegmentMiles(
  lat: number,
  lon: number,
  a: [number, number],
  b: [number, number],
): number {
  const kx = 111.32 * Math.cos((lat * Math.PI) / 180);
  const px = lon * kx;
  const py = lat * KM_PER_DEG_LAT;
  const ax = a[0] * kx;
  const ay = a[1] * KM_PER_DEG_LAT;
  const bx = b[0] * kx;
  const by = b[1] * KM_PER_DEG_LAT;
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  const t =
    lenSq === 0
      ? 0
      : Math.min(1, Math.max(0, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return Math.hypot(px - cx, py - cy) * MILES_PER_KM;
}

/** Distance in miles from a point to a [lng, lat] polyline, plus the
 *  index of the closest segment (a rough along-route ordering). */
export function pointToPolylineMiles(
  lat: number,
  lon: number,
  route: [number, number][],
): { miles: number; segment: number } {
  let best = { miles: Number.POSITIVE_INFINITY, segment: 0 };
  for (let i = 0; i < route.length - 1; i++) {
    const miles = pointToSegmentMiles(lat, lon, route[i], route[i + 1]);
    if (miles < best.miles) best = { miles, segment: i };
  }
  return best;
}

export interface MatchedRoadEvent {
  event: RoadEvent;
  distanceMiles: number;
}

/** Events within `maxMiles` of the route polyline, in driving order. */
export function matchEventsToRoute(
  events: RoadEvent[],
  route: [number, number][],
  maxMiles: number = ROAD_CORRIDOR_MILES,
): MatchedRoadEvent[] {
  if (route.length < 2) return [];
  const matched: Array<MatchedRoadEvent & { segment: number }> = [];
  for (const event of events) {
    const { miles, segment } = pointToPolylineMiles(event.lat, event.lon, route);
    if (miles <= maxMiles) {
      matched.push({ event, distanceMiles: miles, segment });
    }
  }
  matched.sort((a, b) => a.segment - b.segment || a.distanceMiles - b.distanceMiles);
  return matched.map(({ event, distanceMiles }) => ({ event, distanceMiles }));
}

/* ------------------------------------------------------------------ */
/* Which states does a route pass through? (bounding boxes — used     */
/* ONLY for the coverage label, never for matching events)             */
/* ------------------------------------------------------------------ */

const STATE_BOXES: Array<{ state: string; lat: [number, number]; lng: [number, number] }> = [
  { state: "CA", lat: [32.5, 42.0], lng: [-124.5, -114.1] },
  { state: "MT", lat: [44.3, 49.0], lng: [-116.1, -104.0] },
  { state: "ID", lat: [41.9, 49.0], lng: [-117.3, -111.0] },
  { state: "UT", lat: [36.9, 42.0], lng: [-114.1, -109.0] },
  { state: "CO", lat: [36.9, 41.0], lng: [-109.1, -102.0] },
  { state: "WA", lat: [45.5, 49.0], lng: [-124.8, -116.9] },
  { state: "OR", lat: [41.9, 46.3], lng: [-124.6, -116.4] },
  { state: "NV", lat: [35.0, 42.0], lng: [-120.0, -114.0] },
  { state: "AZ", lat: [31.3, 37.0], lng: [-114.9, -109.0] },
  { state: "WY", lat: [40.9, 45.0], lng: [-111.1, -104.0] },
];

/** States the route's polyline passes through, in first-seen order. */
export function statesForRoute(route: [number, number][]): string[] {
  const seen: string[] = [];
  for (const [lng, lat] of route) {
    for (const box of STATE_BOXES) {
      if (
        lat >= box.lat[0] &&
        lat <= box.lat[1] &&
        lng >= box.lng[0] &&
        lng <= box.lng[1] &&
        !seen.includes(box.state)
      ) {
        seen.push(box.state);
      }
    }
  }
  return seen;
}

/** States with a keyless feed in v1. ID is work-zones-only. */
export const COVERED_STATES = ["CA", "MT", "ID"] as const;

/* ------------------------------------------------------------------ */
/* Fetch layer (server only)                                           */
/* ------------------------------------------------------------------ */

const CA_DISTRICTS = ["03", "09", "10"] as const;
const MT_FILES = ["events", "restrictions", "construction"] as const;

const FEED_REVALIDATE_SECONDS = 300;

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, {
    next: { revalidate: FEED_REVALIDATE_SECONDS },
    headers: { "User-Agent": "WorldEye road-conditions (worldeye.app)" },
  });
  if (!res.ok) throw new Error(`Feed HTTP ${res.status} for ${url}`);
  return (await res.json()) as unknown;
}

interface FeedOutcome {
  coverage: RoadCoverage;
  events: RoadEvent[];
}

async function runFeed(
  state: string,
  source: string,
  label: string,
  opts: { judgeStaleByFeedClock: boolean },
  load: () => Promise<RoadFeedResult>,
): Promise<FeedOutcome> {
  try {
    const { events, feedUpdatedTs } = await load();
    if (opts.judgeStaleByFeedClock && isStaleFeed(feedUpdatedTs, Date.now())) {
      return {
        coverage: {
          state,
          source,
          label,
          status: "unavailable",
          feedUpdatedTs,
          eventCount: 0,
        },
        events: [],
      };
    }
    return {
      coverage: {
        state,
        source,
        label,
        status: "ok",
        feedUpdatedTs,
        eventCount: events.length,
      },
      events,
    };
  } catch {
    return {
      coverage: {
        state,
        source,
        label,
        status: "unavailable",
        feedUpdatedTs: null,
        eventCount: 0,
      },
      events: [],
    };
  }
}

async function loadMerged<T>(
  urls: string[],
  normalise: (payload: unknown) => RoadFeedResult,
): Promise<RoadFeedResult> {
  const parts = await Promise.all(urls.map((u) => fetchJson(u).then(normalise)));
  return {
    events: parts.flatMap((p) => p.events),
    feedUpdatedTs: parts.reduce<number | null>(
      (acc, p) =>
        p.feedUpdatedTs === null
          ? acc
          : acc === null
            ? p.feedUpdatedTs
            : Math.max(acc, p.feedUpdatedTs),
      null,
    ),
  };
}

/**
 * Fetch + normalise every v1 feed. Feeds fail independently: a failed
 * or stale feed contributes NO events and an "unavailable" coverage
 * row, so the UI can say exactly that instead of implying "all clear".
 */
export async function fetchRoadConditions(): Promise<RoadConditionsPayload> {
  const [caChain, caClosures, mt, id] = await Promise.all([
    runFeed(
      "CA",
      CALTRANS_SOURCE,
      "Chain controls",
      { judgeStaleByFeedClock: true },
      () =>
        loadMerged(
          CA_DISTRICTS.map(
            (d) => `https://cwwp2.dot.ca.gov/data/d${Number(d)}/cc/ccStatusD${d}.json`,
          ),
          normaliseCaChainControl,
        ),
    ),
    runFeed(
      "CA",
      CALTRANS_SOURCE,
      "Lane closures & full closures",
      { judgeStaleByFeedClock: true },
      () =>
        loadMerged(
          CA_DISTRICTS.map(
            (d) => `https://cwwp2.dot.ca.gov/data/d${Number(d)}/lcs/lcsStatusD${d}.json`,
          ),
          normaliseCaLaneClosures,
        ),
    ),
    runFeed(
      "MT",
      MDT_SOURCE,
      "Road events, restrictions & construction",
      // MT payloads carry no feed clock (per-event last_update only);
      // availability = fetch + schema success. See normaliser note.
      { judgeStaleByFeedClock: false },
      () =>
        loadMerged(
          MT_FILES.map(
            (f) => `https://mt.cdn.iteris-atis.com/geojson/icons/metadata/icons.${f}.geojson`,
          ),
          normaliseMtGeoJson,
        ),
    ),
    runFeed(
      "ID",
      ITD_SOURCE,
      "Work zones ONLY — no incidents, closures or chain/pass conditions",
      { judgeStaleByFeedClock: true },
      async () => normaliseIdWzdx(await fetchJson("https://511.idaho.gov/api/wzdx")),
    ),
  ]);
  const outcomes = [caChain, caClosures, mt, id];
  const deduped = new Map<string, RoadEvent>();
  for (const o of outcomes) {
    for (const e of o.events) deduped.set(`${e.state}:${e.sourceId}`, e);
  }
  return {
    events: [...deduped.values()],
    coverage: outcomes.map((o) => o.coverage),
    fetchedAt: new Date().toISOString(),
  };
}
