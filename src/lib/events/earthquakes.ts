/**
 * Breaking-events — Earthquakes.
 *
 * One USGS pipeline for the whole site: the globe's quake layer is served
 * by /api/earthquakes, which wraps the USGS GeoJSON summary feed below.
 * These helpers parse that exact feed shape (the FDSN event-detail
 * GeoJSON for a single event is the same shape), so the tracker pages,
 * the per-event pages and the news sitemap can never drift from what the
 * map shows. Source: USGS — https://earthquake.usgs.gov/
 */

/** The "large magnitude" bar for the significant-quakes surfaces. */
export const SIGNIFICANT_MAGNITUDE = 4.5;

/** Same summary feed /api/earthquakes wraps for the globe (24 h, M2.5+). */
export const USGS_SUMMARY_FEED_URL =
  "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson";

const USGS_FDSN_EVENT_URL = "https://earthquake.usgs.gov/fdsnws/event/1/query";

export interface QuakeEvent {
  id: string;
  magnitude: number | null;
  place: string;
  /** Epoch milliseconds (USGS `time`). */
  time: number;
  /** Epoch milliseconds of the last USGS revision, when published. */
  updated: number | null;
  lat: number;
  lng: number;
  depthKm: number | null;
  tsunami: boolean;
  /** Number of "Did You Feel It" reports, when anyone filed one. */
  felt: number | null;
  /** Community Decimal Intensity (felt intensity), when DYFI data exists. */
  cdi: number | null;
  /** Instrumental modified Mercalli intensity, when computed. */
  mmi: number | null;
  /** USGS PAGER alert level: green | yellow | orange | red. */
  alert: string | null;
  sig: number | null;
  status: string | null;
  type: string | null;
  /** Canonical USGS event page. */
  url: string | null;
  /** Minutes east of UTC at the epicenter, when USGS publishes it. */
  tzOffsetMinutes: number | null;
}

function numOrNull(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/**
 * Parse one USGS GeoJSON feature (summary feed or FDSN detail — the
 * property names are identical) into a QuakeEvent. Returns null for
 * features without the id/coordinate/time spine everything keys on.
 */
export function parseUsgsFeature(f: any): QuakeEvent | null {
  if (!f || typeof f !== "object") return null;
  const id = typeof f.id === "string" ? f.id.trim() : "";
  const coords = f.geometry?.coordinates;
  const props = f.properties ?? {};
  if (!id || !Array.isArray(coords) || coords.length < 2) return null;
  const lng = numOrNull(coords[0]);
  const lat = numOrNull(coords[1]);
  const time = numOrNull(props.time);
  if (lat === null || lng === null || time === null) return null;
  return {
    id,
    magnitude: numOrNull(props.mag),
    place: typeof props.place === "string" && props.place ? props.place : "Unknown location",
    time,
    updated: numOrNull(props.updated),
    lat,
    lng,
    depthKm: numOrNull(coords[2]),
    tsunami: props.tsunami === 1 || props.tsunami === true,
    felt: numOrNull(props.felt),
    cdi: numOrNull(props.cdi),
    mmi: numOrNull(props.mmi),
    alert: typeof props.alert === "string" && props.alert ? props.alert : null,
    sig: numOrNull(props.sig),
    status: typeof props.status === "string" && props.status ? props.status : null,
    type: typeof props.type === "string" && props.type ? props.type : null,
    url: typeof props.url === "string" && props.url ? props.url : null,
    tzOffsetMinutes: numOrNull(props.tz),
  };
}

/** Keep events at or above the magnitude threshold; nulls never pass. */
export function filterSignificant(
  quakes: QuakeEvent[],
  threshold: number = SIGNIFICANT_MAGNITUDE,
): QuakeEvent[] {
  return quakes.filter((q) => q.magnitude !== null && q.magnitude >= threshold);
}

/** One entry per USGS id — the newest revision wins. */
export function dedupeQuakes(quakes: QuakeEvent[]): QuakeEvent[] {
  const byId = new Map<string, QuakeEvent>();
  for (const q of quakes) {
    const prev = byId.get(q.id);
    if (!prev || (q.updated ?? 0) >= (prev.updated ?? 0)) byId.set(q.id, q);
  }
  return [...byId.values()];
}

/** Newest first; ties break toward the larger magnitude. */
export function sortNewestFirst(quakes: QuakeEvent[]): QuakeEvent[] {
  return [...quakes].sort(
    (a, b) => b.time - a.time || (b.magnitude ?? 0) - (a.magnitude ?? 0),
  );
}

/** The search phrasing people use: "M6.1 earthquake near …". Place is verbatim USGS. */
export function quakeHeadline(q: QuakeEvent): string {
  const mag = q.magnitude === null ? "" : `M${q.magnitude.toFixed(1)} `;
  return `${mag}Earthquake near ${q.place}`;
}

const UTC_FMT = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

/** "Oct 22, 2026, 4:23 AM UTC". */
export function formatQuakeTimeUtc(epochMs: number): string {
  return `${UTC_FMT.format(new Date(epochMs))} UTC`;
}

/**
 * Local time at the epicenter from the USGS `tz` offset (minutes east of
 * UTC): "Oct 22, 2026, 2:23 PM (UTC+10:00)". Null when USGS didn't
 * publish an offset for the event — callers omit rather than guess.
 */
export function quakeLocalTimeLabel(q: QuakeEvent): string | null {
  if (q.tzOffsetMinutes === null) return null;
  const off = q.tzOffsetMinutes;
  const sign = off < 0 ? "-" : "+";
  const abs = Math.abs(off);
  const hh = String(Math.floor(abs / 60)).padStart(2, "0");
  const mm = String(abs % 60).padStart(2, "0");
  const local = UTC_FMT.format(new Date(q.time + off * 60_000));
  return `${local} local (UTC${sign}${hh}:${mm})`;
}

type FetchFn = typeof fetch;

/**
 * Server-side significant quakes, straight from the same USGS summary
 * feed the globe's API wraps — parsed, thresholded, deduped, sorted.
 * Throws on upstream failure; callers that must degrade catch.
 */
export async function fetchSignificantQuakes(
  fetchFn: FetchFn = fetch,
  threshold: number = SIGNIFICANT_MAGNITUDE,
): Promise<QuakeEvent[]> {
  const res = await fetchFn(USGS_SUMMARY_FEED_URL, {
    headers: { "User-Agent": "WorldEye/1.0 (worldeye.app)" },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`USGS summary feed → ${res.status}`);
  const data: any = await res.json();
  const parsed = (data?.features ?? [])
    .map((f: any) => parseUsgsFeature(f))
    .filter((q: QuakeEvent | null): q is QuakeEvent => q !== null);
  return sortNewestFirst(dedupeQuakes(filterSignificant(parsed, threshold)));
}

const QUAKE_ID_SHAPE = /^[\w-]{1,64}$/;

/**
 * One event by USGS id, via the FDSN event service (the same catalog the
 * summary feed draws from, so ids stay valid after they age out of the
 * 24-hour summary). Null when USGS has no such event.
 */
export async function fetchQuakeEvent(
  id: string,
  fetchFn: FetchFn = fetch,
): Promise<QuakeEvent | null> {
  if (!QUAKE_ID_SHAPE.test(id)) return null;
  const url = `${USGS_FDSN_EVENT_URL}?eventid=${encodeURIComponent(id)}&format=geojson`;
  const res = await fetchFn(url, {
    headers: { "User-Agent": "WorldEye/1.0 (worldeye.app)" },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) return null;
  const data: any = await res.json().catch(() => null);
  if (!data || data.type !== "Feature") return null;
  return parseUsgsFeature(data);
}
