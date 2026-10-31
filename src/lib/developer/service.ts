/**
 * Public developer API — the data service both doors (REST /api/v1 and
 * the MCP server /api/v1/mcp) are thin wrappers over.
 *
 * The catalogue served here is the REDISTRIBUTION-CLEARED subset of the
 * WorldEye catalogue: every record passes the enterprise rights gate
 * (src/lib/enterprise/rights — default excluded, a source ships only
 * with a clearance basis on file) and carries a playable stream or a
 * snapshot, exactly the rule the enterprise payload applies. A camera
 * outside that subset does not exist as far as this API is concerned.
 *
 * The public shape is deliberately narrower than the Enterprise feed
 * shape: metadata, the WorldEye-served snapshot URL, and a deep link
 * that opens the camera on the WorldEye globe. The catalogue's own
 * stream URLs never leave the building through this door — there is no
 * restreaming here, in payload or in proxy; watching happens on
 * WorldEye, through the watchUrl.
 */
import { enterpriseCatalogueById } from "@/lib/enterprise/catalogue";
import { feedEligibility } from "@/lib/enterprise/rights";
import { toFeedCamera, type CatalogueRecord } from "@/lib/enterprise/payload";
import { canonicalCountry, matchCameras, type SearchableCamera } from "@/lib/camera-search";
import { cameraMediaKind, type CameraMediaKind } from "@/lib/country-cameras";
import { haversine } from "@/lib/geo";

/* ── The eligible catalogue ──────────────────────────────────────── */

interface EligibleEntry {
  raw: CatalogueRecord;
  searchable: SearchableCamera;
}

const ELIGIBLE_CACHE_MS = 60_000;
let eligibleCache: { at: number; entries: EligibleEntry[] } | null = null;

function toSearchable(raw: CatalogueRecord): SearchableCamera {
  return {
    id: raw.id,
    name: raw.name ?? raw.id,
    city: raw.city,
    country: raw.country,
    source: raw.source,
    feed_url: raw.feed_url,
    stream_url: raw.stream_url,
    stream_type: raw.stream_type,
    external_url: raw.external_url,
    lat: raw.lat ?? 0,
    lng: raw.lng ?? 0,
  };
}

/**
 * Every rights-cleared, playable catalogue record. Null when the
 * catalogue itself is unavailable (cold instance still building) — the
 * doors answer 503, never a fabricated empty list.
 */
export async function eligibleEntries(): Promise<EligibleEntry[] | null> {
  if (eligibleCache && Date.now() - eligibleCache.at < ELIGIBLE_CACHE_MS) {
    return eligibleCache.entries;
  }
  const byId = await enterpriseCatalogueById();
  if (!byId) return null;
  const entries: EligibleEntry[] = [];
  for (const raw of byId.values()) {
    if (!feedEligibility(raw).eligible) continue;
    const probe = toFeedCamera(raw, "https://worldeye.app");
    if (!probe.streamUrl && !probe.snapshotUrl) continue;
    entries.push({ raw, searchable: toSearchable(raw) });
  }
  eligibleCache = { at: Date.now(), entries };
  return entries;
}

/** Test seam: drop the eligible-list cache. */
export function resetEligibleCache(): void {
  eligibleCache = null;
}

/* ── The public camera shape ─────────────────────────────────────── */

export interface PublicCamera {
  id: string;
  name: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
  /** Current-still URL served by WorldEye's frame route, or null for stream-only cameras. */
  snapshotUrl: string | null;
  /** Deep link that opens this camera on the WorldEye globe. */
  watchUrl: string;
  /** The operating agency to credit, e.g. "Alberta 511 via WorldEye". */
  attribution: string;
  /** The catalogue source label the rights verdict was taken from. */
  source: string;
}

/**
 * The public projection of a catalogue record: the enterprise feed
 * shape minus its stream URLs, plus the globe deep link. This is the
 * ONLY camera shape the public doors serve.
 */
export function toPublicCamera(raw: CatalogueRecord, origin: string): PublicCamera {
  const feed = toFeedCamera(raw, origin);
  return {
    id: feed.id,
    name: feed.name,
    city: feed.city,
    country: feed.country,
    lat: feed.lat,
    lng: feed.lng,
    snapshotUrl: feed.snapshotUrl,
    watchUrl: `${origin}/?camera=${encodeURIComponent(feed.id)}`,
    attribution: feed.attribution,
    source: feed.source,
  };
}

/* ── Search ──────────────────────────────────────────────────────── */

export interface CameraSearchParams {
  q?: string;
  /** Country as a full name ("Japan") or ISO alpha-2 code ("JP"). */
  country?: string;
  kind?: CameraMediaKind;
  limit: number;
  offset: number;
}

export interface CameraSearchResult {
  total: number;
  cameras: PublicCamera[];
}

export function clampLimit(value: number | undefined, fallback = 20, max = 100): number {
  if (value === undefined || !Number.isFinite(value) || value <= 0) return fallback;
  return Math.min(Math.floor(value), max);
}

export function clampOffset(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value) || value < 0) return 0;
  return Math.floor(value);
}

/** Pure search over an eligible-entry list (the unit tests pin this). */
export function searchEntries(
  entries: EligibleEntry[],
  params: CameraSearchParams,
  origin: string,
): CameraSearchResult {
  let picked: EligibleEntry[];
  const q = (params.q ?? "").trim();
  if (q) {
    const byId = new Map(entries.map((e) => [e.raw.id, e]));
    picked = matchCameras(
      entries.map((e) => e.searchable),
      q,
      entries.length,
    ).map((cam) => byId.get(cam.id)!);
  } else {
    picked = [...entries].sort((a, b) =>
      a.searchable.name.localeCompare(b.searchable.name),
    );
  }
  const countryKey = params.country ? canonicalCountry(params.country)?.key : undefined;
  if (countryKey) {
    picked = picked.filter(
      (e) => canonicalCountry(e.searchable.country)?.key === countryKey,
    );
  }
  if (params.kind) {
    picked = picked.filter((e) => cameraMediaKind(e.searchable) === params.kind);
  }
  const total = picked.length;
  const page = picked.slice(params.offset, params.offset + params.limit);
  return { total, cameras: page.map((e) => toPublicCamera(e.raw, origin)) };
}

export async function searchCameras(
  params: CameraSearchParams,
  origin: string,
): Promise<CameraSearchResult | null> {
  const entries = await eligibleEntries();
  if (!entries) return null;
  return searchEntries(entries, params, origin);
}

/* ── Detail ──────────────────────────────────────────────────────── */

export async function getCamera(
  id: string,
  origin: string,
): Promise<PublicCamera | null> {
  const entries = await eligibleEntries();
  if (!entries) return null;
  const entry = entries.find((e) => e.raw.id === id);
  return entry ? toPublicCamera(entry.raw, origin) : null;
}

/* ── Near ────────────────────────────────────────────────────────── */

export interface GeoPoint {
  lat: number;
  lng: number;
  label?: string;
}

export interface NearCamera extends PublicCamera {
  distanceKm: number;
}

export interface NearResult {
  center: GeoPoint;
  total: number;
  cameras: NearCamera[];
}

/** Pure radius search over an eligible-entry list. */
export function nearEntries(
  entries: EligibleEntry[],
  center: GeoPoint,
  radiusKm: number,
  limit: number,
  origin: string,
): NearResult {
  const within: { entry: EligibleEntry; distanceKm: number }[] = [];
  for (const entry of entries) {
    const { lat, lng } = entry.searchable;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    if (lat === 0 && lng === 0) continue;
    const distanceKm = haversine([center.lng, center.lat], [lng, lat]);
    if (distanceKm <= radiusKm) within.push({ entry, distanceKm });
  }
  within.sort((a, b) => a.distanceKm - b.distanceKm);
  return {
    center,
    total: within.length,
    cameras: within.slice(0, limit).map(({ entry, distanceKm }) => ({
      ...toPublicCamera(entry.raw, origin),
      distanceKm: Math.round(distanceKm * 10) / 10,
    })),
  };
}

/**
 * Resolve a place name to coordinates with Photon (Komoot's OSM index —
 * the same geocoder the site's own geosearch leads with). Keyless OSM
 * community service; one best hit or null.
 */
export async function geocodePlace(place: string): Promise<GeoPoint | null> {
  try {
    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(place)}&limit=1`;
    const res = await fetch(url, {
      headers: { "User-Agent": "WorldEye-API/1.0 (https://worldeye.app/developers)" },
      signal: AbortSignal.timeout(6_000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      features?: {
        geometry?: { coordinates?: [number, number] };
        properties?: Record<string, string | undefined>;
      }[];
    };
    const feature = data.features?.[0];
    const coords = feature?.geometry?.coordinates;
    if (!coords || coords.length !== 2) return null;
    const p = feature?.properties ?? {};
    const label = [p.name, p.city, p.state, p.country].filter(Boolean).join(", ");
    return { lat: coords[1], lng: coords[0], label: label || place };
  } catch {
    return null;
  }
}

export async function camerasNear(
  center: GeoPoint,
  radiusKm: number,
  limit: number,
  origin: string,
): Promise<NearResult | null> {
  const entries = await eligibleEntries();
  if (!entries) return null;
  return nearEntries(entries, center, radiusKm, limit, origin);
}

/* ── Earthquakes (USGS, as served on the site) ───────────────────── */

export interface Earthquake {
  id: string;
  lat: number;
  lng: number;
  depth: number;
  magnitude: number | null;
  place: string;
  /** Event time, epoch milliseconds (the USGS `time` field). */
  time: number;
  url: string;
  tsunami: number;
  type: string;
  felt: number | null;
  alert: string | null;
}

export interface EarthquakeResult {
  earthquakes: Earthquake[];
  total: number;
  generatedAt: string;
  source: string;
}

const USGS_FEED = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson";
const QUAKE_CACHE_MS = 60_000;
let quakeCache: { at: number; result: EarthquakeResult } | null = null;

/**
 * The site's earthquake layer, shared with /api/earthquakes: USGS
 * M2.5+ events from the last 24 hours. USGS data is US federal public
 * domain. Null on upstream failure (doors answer 502, never invent).
 */
export async function latestEarthquakes(limit?: number): Promise<EarthquakeResult | null> {
  if (quakeCache && Date.now() - quakeCache.at < QUAKE_CACHE_MS) {
    const { result } = quakeCache;
    return limit !== undefined
      ? { ...result, earthquakes: result.earthquakes.slice(0, limit) }
      : result;
  }
  try {
    const res = await fetch(USGS_FEED, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return null;
    const data = (await res.json()) as { features?: unknown[] };
    const features = (data.features ?? []) as {
      id: string;
      geometry?: { coordinates?: [number, number, number] };
      properties?: Record<string, unknown>;
    }[];
    const earthquakes: Earthquake[] = features.map((f) => {
      const coords = f.geometry?.coordinates ?? [0, 0, 0];
      const props = f.properties ?? {};
      return {
        id: f.id,
        lat: coords[1],
        lng: coords[0],
        depth: coords[2],
        magnitude: (props.mag as number | null) ?? null,
        place: (props.place as string) ?? "",
        time: (props.time as number) ?? 0,
        url: (props.url as string) ?? "",
        tsunami: (props.tsunami as number) ?? 0,
        type: (props.type as string) ?? "",
        felt: (props.felt as number | null) ?? null,
        alert: (props.alert as string | null) ?? null,
      };
    });
    const result: EarthquakeResult = {
      earthquakes,
      total: earthquakes.length,
      generatedAt: new Date().toISOString(),
      source: "USGS earthquake feed (M2.5+, last 24 hours), via WorldEye",
    };
    quakeCache = { at: Date.now(), result };
    return limit !== undefined
      ? { ...result, earthquakes: result.earthquakes.slice(0, limit) }
      : result;
  } catch {
    return null;
  }
}
