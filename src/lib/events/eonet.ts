/**
 * Natural events — NASA EONET.
 *
 * One EONET pipeline for the globe's Natural Events layer: /api/eonet
 * wraps the EONET v3 open-events feed and these helpers normalize it, so
 * the layer can never drift from what the route serves. Source: NASA
 * Earth Observatory Natural Event Tracker (EONET) —
 * https://eonet.gsfc.nasa.gov/ — open data, no API key.
 *
 * Scope: the categories that add information the globe doesn't already
 * carry. Wildfires and earthquakes are deliberately OUT — FIRMS and USGS
 * have dedicated layers, and a second pin for the same event is a defect,
 * not coverage. Drought is out too: GDACS droughts already ride the
 * severe-weather feed. Everything else EONET curates is in.
 *
 * Freshness model: EONET keeps long-lived events "open" with infrequent
 * geometry updates (a volcano's only observation can be years old), so a
 * recency window would silently drop most volcanoes and icebergs. The
 * feed is therefore read with status=open and NO day window; honesty is
 * carried per pin instead — every event keeps the date of its latest
 * EONET geometry, and the UI labels it as the reported date, never as
 * "live".
 *
 * The category filter rides in the QUERY, not just the normalizer, and
 * that is load-bearing: the unfiltered open-events feed is flooded with
 * wildfires (hundreds open at any time), so a limit=500 read returns
 * almost nothing else — verified live 2026-11-05: unfiltered → 500
 * events of which 6 in scope; category-filtered → all 69 in-scope open
 * events (32 volcanoes, 35 icebergs, 2 storms). The normalizer's
 * allowlist stays as the second line of defence.
 */

/** Canonical event page base — an event's own `link` field points here too. */
export const EONET_EVENT_BASE = "https://eonet.gsfc.nasa.gov/api/v3/events";

/** EONET category id → display label (labels are EONET's own titles). */
export const EONET_CATEGORY_LABELS: Record<string, string> = {
  volcanoes: "Volcanoes",
  severeStorms: "Severe Storms",
  floods: "Floods",
  landslides: "Landslides",
  snow: "Snow",
  seaLakeIce: "Sea and Lake Ice",
  dustHaze: "Dust and Haze",
  tempExtremes: "Temperature Extremes",
  waterColor: "Water Color",
  manmade: "Manmade",
};

/** The in-scope category ids, in display order. */
export const EONET_CATEGORY_IDS = Object.keys(EONET_CATEGORY_LABELS);

/**
 * The one upstream read: open events in the in-scope categories only
 * (see the header note on why the filter must be in the query).
 */
export const EONET_EVENTS_URL = `https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=500&category=${EONET_CATEGORY_IDS.join(",")}`;

const IN_SCOPE = new Set(EONET_CATEGORY_IDS);

export interface NaturalEvent {
  id: string;
  title: string;
  /** EONET category id (see EONET_CATEGORY_LABELS). */
  category: string;
  /** EONET's own category title. */
  categoryLabel: string;
  lat: number;
  lng: number;
  /** ISO date of the event's latest EONET geometry — its reported date. */
  date: string;
  /** Canonical EONET event page. */
  url: string;
}

function numOrNull(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/**
 * The representative point of one EONET geometry: a Point is itself; a
 * Polygon contributes the centroid of its outer ring (good enough for a
 * globe pin — the event page carries the real footprint). Null when the
 * geometry has no usable coordinates.
 */
export function geometryPoint(geom: any): { lat: number; lng: number } | null {
  if (!geom || typeof geom !== "object") return null;
  if (geom.type === "Point") {
    const coords = geom.coordinates;
    if (!Array.isArray(coords) || coords.length < 2) return null;
    const lng = numOrNull(coords[0]);
    const lat = numOrNull(coords[1]);
    return lat === null || lng === null ? null : { lat, lng };
  }
  if (geom.type === "Polygon") {
    const ring = geom.coordinates?.[0];
    if (!Array.isArray(ring) || ring.length === 0) return null;
    let latSum = 0;
    let lngSum = 0;
    let n = 0;
    for (const vertex of ring) {
      if (!Array.isArray(vertex) || vertex.length < 2) continue;
      const lng = numOrNull(vertex[0]);
      const lat = numOrNull(vertex[1]);
      if (lat === null || lng === null) continue;
      lngSum += lng;
      latSum += lat;
      n += 1;
    }
    return n === 0 ? null : { lat: latSum / n, lng: lngSum / n };
  }
  return null;
}

/**
 * Parse one EONET v3 event into a NaturalEvent. Returns null for
 * out-of-scope categories (wildfires, earthquakes, drought, anything
 * unmapped) and for events without the id/title/geometry spine a pin
 * needs. The pin position and date come from the event's LATEST
 * geometry (the geometry array is chronological).
 */
export function parseEonetEvent(e: any): NaturalEvent | null {
  if (!e || typeof e !== "object") return null;
  const id = typeof e.id === "string" ? e.id.trim() : "";
  const title = typeof e.title === "string" ? e.title.trim() : "";
  if (!id || !title) return null;

  const categories = Array.isArray(e.categories) ? e.categories : [];
  const primary = categories.find(
    (c: any) => c && typeof c.id === "string" && IN_SCOPE.has(c.id),
  );
  if (!primary) return null;
  const category = primary.id as string;

  const geometries = Array.isArray(e.geometry) ? e.geometry : [];
  const latest = geometries.length > 0 ? geometries[geometries.length - 1] : null;
  const point = geometryPoint(latest);
  if (!point) return null;
  const date = typeof latest?.date === "string" ? latest.date : "";
  if (!date) return null;

  const link =
    typeof e.link === "string" && e.link ? e.link : `${EONET_EVENT_BASE}/${id}`;
  return {
    id,
    title,
    category,
    categoryLabel: EONET_CATEGORY_LABELS[category],
    lat: point.lat,
    lng: point.lng,
    date,
    url: link,
  };
}

/** Normalize a whole EONET events payload: parse, dedupe by id, newest first. */
export function normalizeEonetEvents(payload: any): NaturalEvent[] {
  const raw = Array.isArray(payload?.events) ? payload.events : [];
  const byId = new Map<string, NaturalEvent>();
  for (const e of raw) {
    const parsed = parseEonetEvent(e);
    if (parsed) byId.set(parsed.id, parsed);
  }
  return [...byId.values()].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

type FetchFn = typeof fetch;

/**
 * Server-side natural events, straight from the EONET open-events feed —
 * parsed, scoped, deduped, sorted. Throws on upstream failure; the
 * route's cache decides what a failure means for readers.
 */
export async function fetchNaturalEvents(
  fetchFn: FetchFn = fetch,
): Promise<NaturalEvent[]> {
  const res = await fetchFn(EONET_EVENTS_URL, {
    headers: { "User-Agent": "WorldEye/1.0 (worldeye.app)" },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`EONET events feed → ${res.status}`);
  const data: any = await res.json();
  return normalizeEonetEvents(data);
}
