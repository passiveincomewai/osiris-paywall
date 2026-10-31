/**
 * Powder Pass — road conditions from state DOT feeds.
 *
 * Keyless feeds (verified in the f10 recon, always on):
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
 * Key-gated feeds (free DOT keys, ENV-GATED — a feed is fetched ONLY
 * when its env var is set; unset means the state stays uncovered
 * exactly as before, so its silence never reads as "all clear"):
 *   - Utah: UDOT Traffic v2/v3 (ibi511) events + road conditions —
 *     UDOT_API_KEY.
 *   - Arizona: AZ511 (ibi511) alerts + events — AZ511_API_KEY.
 *   - Idaho main 511 (ibi511) winter roads + truck restrictions —
 *     ITD511_API_KEY. Adds to (never replaces) the keyless WZDx feed.
 *   - Washington: WSDOT Traveler API mountain-pass conditions +
 *     highway alerts — WSDOT_ACCESS_CODE.
 *   - Oregon: ODOT TripCheck Data API road & weather reports +
 *     incidents — ODOT_TRIPCHECK_API_KEY (subscription-key header).
 * Keys live only in env — never in code. Colorado's COtrip data plane
 * appears token-gated but the token path is UNVERIFIED, so Colorado
 * stays out entirely.
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
  /** Keyless states + every keyed state whose env var is configured,
   *  computed server-side so coverage truth travels with the payload. */
  coveredStates: string[];
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
/* Encoded polylines (ibi511 segment feeds carry geometry ONLY as a    */
/* Google encoded polyline — no lat/lon fields)                        */
/* ------------------------------------------------------------------ */

/** Decode a Google encoded polyline into [lat, lon] points. */
export function decodeEncodedPolyline(
  encoded: string,
): Array<[number, number]> {
  const points: Array<[number, number]> = [];
  let index = 0;
  let lat = 0;
  let lon = 0;
  while (index < encoded.length) {
    for (const which of [0, 1] as const) {
      let shift = 0;
      let result = 0;
      let byte = 0;
      do {
        if (index >= encoded.length) return points;
        byte = encoded.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20);
      const delta = result & 1 ? ~(result >> 1) : result >> 1;
      if (which === 0) lat += delta;
      else lon += delta;
    }
    points.push([lat / 1e5, lon / 1e5]);
  }
  return points;
}

/** Midpoint of an encoded-polyline segment (the payload may carry the
 *  polyline as a bare string or as a one-element array of strings). */
function polylineMidpoint(
  encoded: unknown,
): { lat: number; lon: number } | null {
  const raw = Array.isArray(encoded) ? encoded[0] : encoded;
  if (typeof raw !== "string" || raw.length === 0) return null;
  const pts = decodeEncodedPolyline(raw);
  if (pts.length === 0) return null;
  const [lat, lon] = pts[Math.floor(pts.length / 2)];
  return { lat, lon };
}

/* ------------------------------------------------------------------ */
/* ibi511 platform — Utah (UDOT), Arizona (AZ511), Idaho main 511.     */
/* One event schema across all three (verified against each DOT's own  */
/* developer docs 2026-10-30): unix-second timestamps, Latitude/       */
/* Longitude doubles, EventType roadwork|closures|accidentsAnd-        */
/* Incidents (Idaho restrictions use EventType restrictionClass).      */
/* ------------------------------------------------------------------ */

export const UDOT_SOURCE = "UDOT (Utah DOT)";
export const AZDOT_SOURCE = "Arizona DOT (AZ511)";
export const ITD_MAIN_SOURCE = "Idaho Transportation Department (511)";

function ibi511EventCategory(rec: Record<string, unknown>): RoadEventCategory {
  const type = str(rec.EventType).toLowerCase();
  const haystack =
    `${type} ${str(rec.EventCategory)} ${str(rec.EventSubType)}`.toLowerCase();
  if (
    rec.IsFullClosure === true ||
    type === "closures" ||
    /full closure/.test(haystack)
  ) {
    return "closure";
  }
  if (/chain|traction/.test(haystack)) return "chain";
  if (type === "restrictionclass" || /restriction/.test(type)) {
    return "restriction";
  }
  if (type === "roadwork") return "workzone";
  if (/lane closure/.test(haystack)) return "lane-closure";
  return "incident";
}

/**
 * Shared ibi511 events normaliser (UT events, AZ events, ID truck
 * restrictions). `idTag` namespaces sourceIds per resource so the
 * fetch layer's state:sourceId dedupe never collides across feeds.
 */
export function normaliseIbi511Events(
  payload: unknown,
  state: string,
  source: string,
  idTag: string,
): RoadFeedResult {
  if (!Array.isArray(payload)) {
    throw new Error(`ibi511 events payload failed schema check (${state})`);
  }
  const events: RoadEvent[] = [];
  let feedUpdatedTs: number | null = null;
  for (const raw of payload) {
    const rec = raw as Record<string, unknown>;
    if (!rec || typeof rec !== "object") continue;
    const updSec = num(rec.LastUpdated);
    const updatedTs = updSec !== null ? updSec * 1000 : 0;
    if (updSec !== null) {
      feedUpdatedTs =
        feedUpdatedTs === null ? updatedTs : Math.max(feedUpdatedTs, updatedTs);
    }
    const lat = num(rec.Latitude);
    const lon = num(rec.Longitude);
    if (lat === null || lon === null) continue;
    const sourceId =
      str(rec.SourceId) || (num(rec.ID) !== null ? String(rec.ID) : "");
    if (!sourceId) continue;
    const category = ibi511EventCategory(rec);
    const catLabel =
      str(rec.EventCategory) || str(rec.EventSubType) || category;
    events.push({
      state,
      source,
      sourceId: `${idTag}:${sourceId}`,
      category,
      route: str(rec.RoadwayName),
      description: truncate(
        str(rec.Description).trim() ||
          str(rec.Location).trim() ||
          catLabel,
        400,
      ),
      statusText: truncate(
        rec.IsFullClosure === true
          ? `${catLabel} — full closure`
          : catLabel,
        300,
      ),
      lat,
      lon,
      updatedTs,
    });
  }
  return { events, feedUpdatedTs };
}

/** Surface conditions that warrant an event on their own (a merely wet
 *  or dry segment is the absence of an event, like CA's R-0). */
const ADVERSE_SURFACE = /snow|ice|icy|slush|blizzard|whiteout|black ice/i;

interface Ibi511Segment {
  id: string;
  route: string;
  description: string;
  statusText: string;
  category: RoadEventCategory;
}

/** Shared loop for the ibi511 segment-condition resources (UDOT road
 *  conditions, Idaho winter roads): geometry arrives only as an
 *  encoded polyline, so the event point is the segment midpoint. The
 *  per-platform extractor returns null for a benign segment. */
function normaliseIbi511Segments(
  payload: unknown,
  state: string,
  source: string,
  feedName: string,
  extract: (rec: Record<string, unknown>) => Ibi511Segment | null,
): RoadFeedResult {
  if (!Array.isArray(payload)) {
    throw new Error(`${feedName} payload failed schema check (${state})`);
  }
  const events: RoadEvent[] = [];
  let feedUpdatedTs: number | null = null;
  for (const raw of payload) {
    const rec = raw as Record<string, unknown>;
    if (!rec || typeof rec !== "object") continue;
    const updSec = num(rec.LastUpdated);
    const updatedTs = updSec !== null ? updSec * 1000 : 0;
    if (updSec !== null) {
      feedUpdatedTs =
        feedUpdatedTs === null ? updatedTs : Math.max(feedUpdatedTs, updatedTs);
    }
    const seg = extract(rec);
    if (!seg || !seg.id) continue;
    const mid = polylineMidpoint(rec.EncodedPolyline);
    if (!mid) continue;
    events.push({
      state,
      source,
      sourceId: seg.id,
      category: seg.category,
      route: seg.route,
      description: truncate(seg.description, 400),
      statusText: truncate(seg.statusText, 300),
      lat: mid.lat,
      lon: mid.lon,
      updatedTs,
    });
  }
  return { events, feedUpdatedTs };
}

/** UDOT road conditions: {RoadCondition, WeatherCondition, Restriction,
 *  RoadwayName, EncodedPolyline, LastUpdated}. A segment emits an event
 *  only for a real restriction or an adverse (snow/ice) surface. */
export function normaliseIbi511RoadConditions(
  payload: unknown,
  state: string,
  source: string,
  idTag: string,
): RoadFeedResult {
  return normaliseIbi511Segments(
    payload,
    state,
    source,
    "ibi511 road-conditions",
    (rec) => {
      const restriction = str(rec.Restriction).trim();
      const hasRestriction =
        restriction !== "" && !/^none$/i.test(restriction);
      const roadCondition = str(rec.RoadCondition).trim();
      if (!hasRestriction && !ADVERSE_SURFACE.test(roadCondition)) {
        return null;
      }
      const sourceId =
        str(rec.SourceId) || (num(rec.Id) !== null ? String(rec.Id) : "");
      if (!sourceId) return null;
      const weather = str(rec.WeatherCondition).trim();
      const route = str(rec.RoadwayName);
      return {
        id: `${idTag}:${sourceId}`,
        route,
        description: `${route} — ${roadCondition}${weather ? `, ${weather.toLowerCase()}` : ""}`,
        statusText: hasRestriction ? restriction : roadCondition,
        category: hasRestriction
          ? /chain|traction/i.test(restriction)
            ? "chain"
            : "restriction"
          : "incident",
      };
    },
  );
}

/** Idaho winter roads: same segment shape, but the status keys contain
 *  SPACES in the real payload ("Overall Status", "Weather Conditions",
 *  "Special Conditions") — verified against ITD's own endpoint doc. */
export function normaliseIdWinterRoads(payload: unknown): RoadFeedResult {
  return normaliseIbi511Segments(
    payload,
    "ID",
    ITD_MAIN_SOURCE,
    "Idaho winter-roads",
    (rec) => {
      const status = str(rec["Overall Status"]).trim();
      const special = str(rec["Special Conditions"]).trim();
      if (!special && !ADVERSE_SURFACE.test(status)) return null;
      const sourceId = num(rec.Id) !== null ? String(rec.Id) : "";
      if (!sourceId) return null;
      const loc = str(rec.LocationDescription).trim();
      const route = str(rec.RoadwayName);
      return {
        id: `id-winter:${sourceId}`,
        route,
        description: `${loc || route}${status ? ` — ${status}` : ""}`,
        statusText: special || status,
        category: special
          ? /chain|traction/i.test(special)
            ? "chain"
            : "restriction"
          : "incident",
      };
    },
  );
}

/**
 * ibi511 alerts (AZ /get/alerts): {Id, Message, Notes, StartTime,
 * EndTime, LastUpdated, Regions}. The documented schema carries NO
 * coordinates, so an alert becomes an event only when the payload
 * actually carries Latitude/Longitude (some platform deployments do);
 * the rest still advance the feed clock. A location is never invented.
 */
export function normaliseIbi511Alerts(
  payload: unknown,
  state: string,
  source: string,
  idTag: string,
): RoadFeedResult {
  if (!Array.isArray(payload)) {
    throw new Error(`ibi511 alerts payload failed schema check (${state})`);
  }
  const events: RoadEvent[] = [];
  let feedUpdatedTs: number | null = null;
  for (const raw of payload) {
    const rec = raw as Record<string, unknown>;
    if (!rec || typeof rec !== "object") continue;
    const updSec = num(rec.LastUpdated);
    const updatedTs = updSec !== null ? updSec * 1000 : 0;
    if (updSec !== null) {
      feedUpdatedTs =
        feedUpdatedTs === null ? updatedTs : Math.max(feedUpdatedTs, updatedTs);
    }
    const lat = num(rec.Latitude);
    const lon = num(rec.Longitude);
    if (lat === null || lon === null) continue;
    const sourceId = num(rec.Id) !== null ? String(rec.Id) : "";
    if (!sourceId) continue;
    const message = str(rec.Message).trim();
    events.push({
      state,
      source,
      sourceId: `${idTag}:${sourceId}`,
      category: "incident",
      route: "",
      description: truncate(message || stripHtml(str(rec.Notes)), 400),
      statusText: truncate(
        rec.HighImportance === true ? `High-importance alert` : `DOT alert`,
        300,
      ),
      lat,
      lon,
      updatedTs,
    });
  }
  return { events, feedUpdatedTs };
}

/* ------------------------------------------------------------------ */
/* Washington — WSDOT Traveler API. Dates arrive in WCF JSON form      */
/* ("/Date(1388623238000-0800)/"). Schemas verified against WSDOT's    */
/* own class references 2026-10-30.                                    */
/* ------------------------------------------------------------------ */

export const WSDOT_SOURCE = "Washington State DOT (WSDOT)";

/** Parse a WCF "/Date(ms±offset)/" string, an ISO string, or epoch ms. */
export function parseWcfDateTime(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v !== "string") return null;
  const m = /\/Date\((-?\d+)(?:[+-]\d{4})?\)\//.exec(v);
  if (m) return Number(m[1]);
  const parsed = Date.parse(v);
  return Number.isFinite(parsed) ? parsed : null;
}

const NO_RESTRICTION = /^no restrictions?$/i;

/**
 * Mountain pass conditions — the most ski-relevant dataset in the
 * keyed set. A pass emits an event only when a real restriction is in
 * force, a travel advisory is active, or the road surface itself is
 * adverse; a bare pass is the absence of an event.
 */
export function normaliseWsdotPassConditions(payload: unknown): RoadFeedResult {
  if (!Array.isArray(payload)) {
    throw new Error("WSDOT pass-conditions payload failed schema check");
  }
  const events: RoadEvent[] = [];
  let feedUpdatedTs: number | null = null;
  for (const raw of payload) {
    const rec = raw as Record<string, unknown>;
    if (!rec || typeof rec !== "object") continue;
    const updatedTs = parseWcfDateTime(rec.DateUpdated) ?? 0;
    if (updatedTs) {
      feedUpdatedTs =
        feedUpdatedTs === null ? updatedTs : Math.max(feedUpdatedTs, updatedTs);
    }
    const lat = num(rec.Latitude);
    const lon = num(rec.Longitude);
    if (lat === null || lon === null) continue;
    const restrictions: string[] = [];
    for (const key of ["RestrictionOne", "RestrictionTwo"] as const) {
      const r = rec[key] as
        | { RestrictionText?: string; TravelDirection?: string }
        | undefined;
      const text = str(r?.RestrictionText).trim();
      if (!text || NO_RESTRICTION.test(text)) continue;
      const dir = str(r?.TravelDirection).trim();
      restrictions.push(
        dir && dir.toLowerCase() !== "all" ? `${dir}: ${text}` : text,
      );
    }
    const roadCondition = str(rec.RoadCondition).trim();
    const name = str(rec.MountainPassName).trim();
    let category: RoadEventCategory;
    let statusText: string;
    if (restrictions.length > 0) {
      const joined = restrictions.join(" · ");
      category = /chains?\s+required/i.test(joined) ? "chain" : "restriction";
      statusText = joined;
    } else if (
      rec.TravelAdvisoryActive === true ||
      ADVERSE_SURFACE.test(roadCondition)
    ) {
      category = "incident";
      statusText = roadCondition || "Travel advisory active";
    } else {
      continue;
    }
    events.push({
      state: "WA",
      source: WSDOT_SOURCE,
      sourceId: `wa-pass:${num(rec.MountainPassId) ?? name}`,
      category,
      route: "",
      description: truncate(
        `${name}${roadCondition ? ` — ${roadCondition}` : ""}`,
        400,
      ),
      statusText: truncate(statusText, 300),
      lat,
      lon,
      updatedTs,
    });
  }
  return { events, feedUpdatedTs };
}

/** Highway alerts. Closed alerts are history, not conditions — skipped. */
export function normaliseWsdotHighwayAlerts(payload: unknown): RoadFeedResult {
  if (!Array.isArray(payload)) {
    throw new Error("WSDOT highway-alerts payload failed schema check");
  }
  const events: RoadEvent[] = [];
  let feedUpdatedTs: number | null = null;
  for (const raw of payload) {
    const rec = raw as Record<string, unknown>;
    if (!rec || typeof rec !== "object") continue;
    const updatedTs =
      parseWcfDateTime(rec.LastUpdatedTime) ??
      parseWcfDateTime(rec.StartTime) ??
      0;
    if (updatedTs) {
      feedUpdatedTs =
        feedUpdatedTs === null ? updatedTs : Math.max(feedUpdatedTs, updatedTs);
    }
    if (/^closed$/i.test(str(rec.EventStatus).trim())) continue;
    const start = rec.StartRoadwayLocation as
      | Record<string, unknown>
      | undefined;
    const lat = num(start?.Latitude) ?? num(rec.DisplayLatitude);
    const lon = num(start?.Longitude) ?? num(rec.DisplayLongitude);
    if (lat === null || lon === null) continue;
    const catText = str(rec.EventCategory);
    const category: RoadEventCategory = /clos/i.test(catText)
      ? "closure"
      : /construction|maintenance|road work/i.test(catText)
        ? "workzone"
        : "incident";
    const headline = str(rec.HeadlineDescription).trim();
    const extended = stripHtml(str(rec.ExtendedDescription).trim());
    events.push({
      state: "WA",
      source: WSDOT_SOURCE,
      sourceId: `wa-alert:${num(rec.AlertID) ?? headline}`,
      category,
      route: str(start?.RoadName),
      description: truncate(extended || headline, 400),
      statusText: truncate(headline || catText, 300),
      lat,
      lon,
      updatedTs,
    });
  }
  return { events, feedUpdatedTs };
}

/* ------------------------------------------------------------------ */
/* Oregon — ODOT TripCheck Data API (Azure APIM, subscription-key      */
/* header). Normalisers follow the published XSDs (RWReports.xsd /     */
/* Incidents.xsd): kebab-case fields, a location block with start-     */
/* lat/start-long, ISO entry timestamps. The JSON form mirrors the     */
/* XML element names (the API serves both via the Accept header).      */
/* ------------------------------------------------------------------ */

export const ODOT_SOURCE = "Oregon DOT (TripCheck)";

function odotList(payload: unknown, keys: string[]): unknown[] | null {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object") {
    for (const k of keys) {
      const v = (payload as Record<string, unknown>)[k];
      if (Array.isArray(v)) return v;
    }
  }
  return null;
}

function odotStartPoint(
  rec: Record<string, unknown>,
): { lat: number; lon: number } | null {
  const loc = rec.location as Record<string, unknown> | undefined;
  const start = loc?.["start-location"] as
    | Record<string, unknown>
    | undefined;
  const lat = num(start?.["start-lat"]) ?? num(rec.latitude);
  const lon = num(start?.["start-long"]) ?? num(rec.longitude);
  return lat === null || lon === null ? null : { lat, lon };
}

/**
 * Road & weather reports. Oregon's driving-restriction ids ARE its
 * chain/traction law classes (0 = none, then A/B/B1/C/D per the XSD
 * enumeration), so an active driving restriction is a chain event.
 * A report with no active restriction emits nothing — the numeric
 * road-cond-id meanings live in ODOT's metadata feed and are NOT
 * guessed here.
 */
export function normaliseOdotRwReports(payload: unknown): RoadFeedResult {
  const list = odotList(payload, ["rw-report", "rwReports", "reports"]);
  if (!list) {
    throw new Error("ODOT road & weather payload failed schema check");
  }
  const events: RoadEvent[] = [];
  let feedUpdatedTs: number | null = null;
  for (const raw of list) {
    const rec = raw as Record<string, unknown>;
    if (!rec || typeof rec !== "object") continue;
    const entryTs = Date.parse(str(rec["entry-time"]));
    const updatedTs = Number.isFinite(entryTs) ? entryTs : 0;
    if (updatedTs) {
      feedUpdatedTs =
        feedUpdatedTs === null ? updatedTs : Math.max(feedUpdatedTs, updatedTs);
    }
    const driving = (
      Array.isArray(rec["driving-restriction"])
        ? (rec["driving-restriction"] as Array<Record<string, unknown>>)
        : []
    )
      .map((d) => str(d?.["restriction-id"]).trim())
      .filter((id) => id !== "" && id !== "0");
    const commercial = (
      Array.isArray(rec["commercial-vehicle-restriction"])
        ? (rec["commercial-vehicle-restriction"] as Array<
            Record<string, unknown>
          >)
        : []
    )
      .map((c) => str(c?.["restriction-type"]).trim())
      .filter((t) => t !== "" && !/^no restriction$/i.test(t));
    if (driving.length === 0 && commercial.length === 0) continue;
    const point = odotStartPoint(rec);
    if (!point) continue;
    const loc = rec.location as Record<string, unknown> | undefined;
    const place = str(loc?.["location-name"]).trim();
    const comments = str(rec.comments).trim();
    const isChain = driving.length > 0;
    events.push({
      state: "OR",
      source: ODOT_SOURCE,
      sourceId: `or-rw:${str(rec["station-id"]) || "?"}:${str(rec["entry-time"])}`,
      category: isChain ? "chain" : "restriction",
      route: str(loc?.["route-id"]),
      description: truncate(
        `${place}${comments ? ` — ${comments}` : ""}`,
        400,
      ),
      statusText: truncate(
        isChain
          ? `Chain law class ${driving.join(", ")}${comments ? ` — ${comments}` : ""}`
          : commercial.join(" · "),
        300,
      ),
      lat: point.lat,
      lon: point.lon,
      updatedTs,
    });
  }
  return { events, feedUpdatedTs };
}

/** Incidents: crashes, planned closures, construction zones. */
export function normaliseOdotIncidents(payload: unknown): RoadFeedResult {
  const list = odotList(payload, ["incident", "incidents"]);
  if (!list) {
    throw new Error("ODOT incidents payload failed schema check");
  }
  const events: RoadEvent[] = [];
  let feedUpdatedTs: number | null = null;
  list.forEach((raw, i) => {
    const rec = raw as Record<string, unknown>;
    if (!rec || typeof rec !== "object") return;
    const updTs = Date.parse(
      str(rec["last-update"] ?? rec["entry-time"]),
    );
    const updatedTs = Number.isFinite(updTs) ? updTs : 0;
    if (updatedTs) {
      feedUpdatedTs =
        feedUpdatedTs === null ? updatedTs : Math.max(feedUpdatedTs, updatedTs);
    }
    const point = odotStartPoint(rec);
    if (!point) return;
    const loc = rec.location as Record<string, unknown> | undefined;
    const place = str(loc?.["location-name"]).trim();
    const comments = str(rec.comments).trim();
    const haystack = `${comments} ${place}`.toLowerCase();
    const category: RoadEventCategory = /clos/.test(haystack)
      ? "closure"
      : /construction|work zone/.test(haystack)
        ? "workzone"
        : "incident";
    events.push({
      state: "OR",
      source: ODOT_SOURCE,
      sourceId: `or-inc:${str(rec["incident-id"]) || i}`,
      category,
      route: str(loc?.["route-id"]),
      description: truncate(comments || place, 400),
      statusText: truncate(place || category, 300),
      lat: point.lat,
      lon: point.lon,
      updatedTs,
    });
  });
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

/** States with a KEYLESS feed. ID is work-zones-only. This const is
 *  also what client components may import — client code cannot see
 *  server env, so keyed states appear only in configuredCoveredStates()
 *  and in the payload's coveredStates field. */
export const COVERED_STATES = ["CA", "MT", "ID"] as const;

/**
 * Keyless states + every keyed state whose DOT env var is configured
 * (ITD511_API_KEY deepens Idaho rather than adding a state — ID is
 * already in the keyless set). A state joins ONLY when its env var is
 * set to a non-blank value; there is no other activation path.
 */
export function configuredCoveredStates(
  env: Record<string, string | undefined> = process.env,
): string[] {
  const states: string[] = [...COVERED_STATES];
  if (env.UDOT_API_KEY?.trim()) states.push("UT");
  if (env.AZ511_API_KEY?.trim()) states.push("AZ");
  if (env.WSDOT_ACCESS_CODE?.trim()) states.push("WA");
  if (env.ODOT_TRIPCHECK_API_KEY?.trim()) states.push("OR");
  return states;
}

/* ------------------------------------------------------------------ */
/* Fetch layer (server only)                                           */
/* ------------------------------------------------------------------ */

const CA_DISTRICTS = ["03", "09", "10"] as const;
const MT_FILES = ["events", "restrictions", "construction"] as const;

const FEED_REVALIDATE_SECONDS = 300;

async function fetchJson(
  url: string,
  extraHeaders?: Record<string, string>,
): Promise<unknown> {
  const res = await fetch(url, {
    next: { revalidate: FEED_REVALIDATE_SECONDS },
    headers: {
      "User-Agent": "WorldEye road-conditions (worldeye.app)",
      ...extraHeaders,
    },
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

/** Fetch several resources — each with its OWN normaliser — and merge
 *  their results into one feed result (feed clock = max of the parts). */
async function loadMergedFeeds(
  parts: Array<{
    url: string;
    normalise: (payload: unknown) => RoadFeedResult;
  }>,
  fetcher: (url: string) => Promise<unknown> = fetchJson,
): Promise<RoadFeedResult> {
  const results = await Promise.all(
    parts.map((p) => fetcher(p.url).then(p.normalise)),
  );
  return {
    events: results.flatMap((p) => p.events),
    feedUpdatedTs: results.reduce<number | null>(
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
 * ODOT TripCheck Data API operation URLs.
 * UNVERIFIED PATHS: each feed's exact gateway URL is shown only inside
 * a signed-in developer-portal session (per the Getting Started Guide
 * V5), which the wiring build did not have; these follow the portal's
 * published API name (tripcheck-api-v1-0). If a path is wrong the OR
 * feed degrades to "unavailable" — never fabricated data — until the
 * path is confirmed with a live subscription key. See
 * powder-features/f10/WIRING-NOTES.md (owed probes).
 */
const ODOT_API_BASE = "https://apiportal.odot.state.or.us/tripcheck-api-v1-0";
const ODOT_ENDPOINTS = {
  rwReports: `${ODOT_API_BASE}/RoadAndWeatherReports`,
  incidents: `${ODOT_API_BASE}/Incidents`,
} as const;

/**
 * Fetch + normalise every feed. Feeds fail independently: a failed
 * or stale feed contributes NO events and an "unavailable" coverage
 * row, so the UI can say exactly that instead of implying "all clear".
 * Key-gated DOT feeds join ONLY when their env var is set (below).
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

  // Key-gated DOT feeds: each joins ONLY when its env var is set.
  // Unset states stay uncovered exactly as in v1 — their absence from
  // the coverage rows is the honest signal, never an implied all-clear.
  const keyed: Array<Promise<FeedOutcome>> = [];
  const udotKey = process.env.UDOT_API_KEY?.trim();
  if (udotKey) {
    const q = `key=${encodeURIComponent(udotKey)}`;
    keyed.push(
      runFeed(
        "UT",
        UDOT_SOURCE,
        "Traffic events & road conditions (developer API)",
        // ibi511 events refresh continuously — judge by the feed clock.
        { judgeStaleByFeedClock: true },
        () =>
          loadMergedFeeds([
            {
              url: `https://www.udottraffic.utah.gov/api/v2/get/event?${q}`,
              normalise: (p) =>
                normaliseIbi511Events(p, "UT", UDOT_SOURCE, "utah-event"),
            },
            {
              url: `https://www.udottraffic.utah.gov/api/v3/get/roadconditions?${q}`,
              normalise: (p) =>
                normaliseIbi511RoadConditions(p, "UT", UDOT_SOURCE, "utah-rc"),
            },
          ]),
      ),
    );
  }
  const azKey = process.env.AZ511_API_KEY?.trim();
  if (azKey) {
    const q = `key=${encodeURIComponent(azKey)}`;
    keyed.push(
      runFeed(
        "AZ",
        AZDOT_SOURCE,
        "Alerts & traffic events (developer API)",
        { judgeStaleByFeedClock: true },
        () =>
          loadMergedFeeds([
            {
              url: `https://az511.com/api/v2/get/alerts?${q}`,
              normalise: (p) =>
                normaliseIbi511Alerts(p, "AZ", AZDOT_SOURCE, "az-alert"),
            },
            {
              url: `https://az511.com/api/v2/get/event?${q}`,
              normalise: (p) =>
                normaliseIbi511Events(p, "AZ", AZDOT_SOURCE, "az-event"),
            },
          ]),
      ),
    );
  }
  const itdKey = process.env.ITD511_API_KEY?.trim();
  if (itdKey) {
    const q = `key=${encodeURIComponent(itdKey)}`;
    keyed.push(
      runFeed(
        "ID",
        ITD_MAIN_SOURCE,
        "Road conditions & restrictions (511 API)",
        { judgeStaleByFeedClock: true },
        () =>
          loadMergedFeeds([
            {
              url: `https://511.idaho.gov/api/v3/get/winterroads?${q}`,
              normalise: normaliseIdWinterRoads,
            },
            {
              url: `https://511.idaho.gov/api/v2/get/truckrestrictions?${q}`,
              normalise: (p) =>
                normaliseIbi511Events(p, "ID", ITD_MAIN_SOURCE, "id-restr"),
            },
          ]),
      ),
    );
  }
  const wsdotCode = process.env.WSDOT_ACCESS_CODE?.trim();
  if (wsdotCode) {
    const q = `AccessCode=${encodeURIComponent(wsdotCode)}`;
    keyed.push(
      runFeed(
        "WA",
        WSDOT_SOURCE,
        "Mountain pass conditions & restrictions",
        // Pass reports update only a few times a day by design —
        // availability = fetch + schema success (MT precedent).
        { judgeStaleByFeedClock: false },
        () =>
          loadMerged(
            [
              `https://wsdot.wa.gov/Traffic/api/MountainPassConditions/MountainPassConditionsREST.svc/GetMountainPassConditionsAsJson?${q}`,
            ],
            normaliseWsdotPassConditions,
          ),
      ),
      runFeed(
        "WA",
        WSDOT_SOURCE,
        "Highway alerts",
        { judgeStaleByFeedClock: false },
        () =>
          loadMerged(
            [
              `https://wsdot.wa.gov/Traffic/api/HighwayAlerts/HighwayAlertsREST.svc/GetAlertsAsJson?${q}`,
            ],
            normaliseWsdotHighwayAlerts,
          ),
      ),
    );
  }
  const odotKey = process.env.ODOT_TRIPCHECK_API_KEY?.trim();
  if (odotKey) {
    const fetchOdot = (url: string) =>
      fetchJson(url, {
        "Ocp-Apim-Subscription-Key": odotKey,
        Accept: "application/json",
      });
    keyed.push(
      runFeed(
        "OR",
        ODOT_SOURCE,
        "Road & weather reports & incidents (TripCheck API)",
        // ODOT publishes 30-second (incidents) and 5-minute (road &
        // weather) refresh rates — judge by the feed clock.
        { judgeStaleByFeedClock: true },
        () =>
          loadMergedFeeds(
            [
              {
                url: ODOT_ENDPOINTS.rwReports,
                normalise: normaliseOdotRwReports,
              },
              {
                url: ODOT_ENDPOINTS.incidents,
                normalise: normaliseOdotIncidents,
              },
            ],
            fetchOdot,
          ),
      ),
    );
  }
  const outcomes = [caChain, caClosures, mt, id, ...(await Promise.all(keyed))];
  const deduped = new Map<string, RoadEvent>();
  for (const o of outcomes) {
    for (const e of o.events) deduped.set(`${e.state}:${e.sourceId}`, e);
  }
  return {
    events: [...deduped.values()],
    coverage: outcomes.map((o) => o.coverage),
    coveredStates: configuredCoveredStates(),
    fetchedAt: new Date().toISOString(),
  };
}
