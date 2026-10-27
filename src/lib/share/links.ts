// ── Universal entity share links ─────────────────────────────────────
// One deep link per entity on the globe, in the established style of
// the camera link (lib/camera-share.ts: `/?camera=<id>`):
//
//   camera  /?camera=<catalogue id>
//   flight  /?flight=<icao24 hex>
//   quake   /?quake=<USGS event id>
//   storm   /?storm=<NHC storm id>
//   fire    /?fire=<lat3>,<lng3>     (FIRMS detections carry no id —
//   event   /?event=<lat3>,<lng3>     the coordinate cell IS the key)
//
// Every link can carry the sharer's personal code by riding the
// established /ref mechanism: `/ref/<code>?camera=…` — the /ref route
// records the click, drops the 30-day attribution cookie and redirects
// to the deep link (see app/ref/[code]/route.ts). Without a code the
// link is the plain deep link; sharing never depends on having one.

import { appBaseUrl } from '../app-url';

/** Query param for a bare coordinate target (see the geo section below). */
export const GEO_PARAM = 'geo';

export type ShareEntityKind = 'camera' | 'flight' | 'quake' | 'storm' | 'fire' | 'event';

export const SHARE_PARAM_BY_KIND: Record<ShareEntityKind, string> = {
  camera: 'camera',
  flight: 'flight',
  quake: 'quake',
  storm: 'storm',
  fire: 'fire',
  event: 'event',
};

/** Query params the /ref landing passes through to the globe. */
export const REF_PASSTHROUGH_PARAMS: readonly string[] = [...Object.values(SHARE_PARAM_BY_KIND), GEO_PARAM];

/* ── Geo targets (/?geo=<lat>,<lng>,<radiusM>) ──────────────────────
 * A bare coordinate target, for results that are a PLACE rather than
 * an entity in a feed — the Photo Geolocation tool's "Explore in 3D"
 * handoff. The coordinates are self-contained, so unlike an entity
 * link this one never goes stale and needs no layer lit beyond the
 * cameras the visitor came to see. The radius rides along so the
 * globe frames the same uncertainty the result page showed. */

/** The public precision floor, mirrored from lib/geolocation/candidates. */
export const GEO_MIN_RADIUS_M = 250;
export const GEO_MAX_RADIUS_M = 100_000;
export const GEO_DEFAULT_RADIUS_M = 1_000;

export interface GeoTarget {
  lat: number;
  lng: number;
  radiusM: number;
}

/** The deep link for a coordinate target, or null when it is not one. */
export function buildGeoUrl(target: GeoTarget, base?: string): string | null {
  const { lat, lng } = target;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  const radius = Number.isFinite(target.radiusM)
    ? Math.min(GEO_MAX_RADIUS_M, Math.max(GEO_MIN_RADIUS_M, Math.round(target.radiusM)))
    : GEO_DEFAULT_RADIUS_M;
  const root = (base ?? defaultBase()).replace(/\/+$/, '');
  return `${root}/?${GEO_PARAM}=${lat.toFixed(5)},${lng.toFixed(5)},${radius}`;
}

/** Read a geo target out of a query string; null when absent or malformed. */
export function geoTargetFromSearch(search: string | null | undefined): GeoTarget | null {
  if (!search) return null;
  let raw: string | null;
  try {
    raw = new URLSearchParams(search).get(GEO_PARAM);
  } catch {
    return null;
  }
  if (!raw) return null;
  const parts = raw.split(',').map(s => Number(s.trim()));
  if (parts.length < 2 || parts.length > 3) return null;
  const [lat, lng] = parts;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  const radius = parts.length === 3 && Number.isFinite(parts[2])
    ? Math.min(GEO_MAX_RADIUS_M, Math.max(GEO_MIN_RADIUS_M, Math.round(parts[2])))
    : GEO_DEFAULT_RADIUS_M;
  return { lat, lng, radiusM: radius };
}

/**
 * Globe zoom that frames a radius: the uncertainty circle should fill
 * most of the view, the same framing the result page's map preview
 * uses (lib/geolocation/map-preview.ts zoomForRadius).
 */
export function zoomForRadiusM(radiusM: number, lat: number): number {
  const mppNeeded = (2 * Math.max(radiusM, 25)) / (480 * 0.78);
  const z = Math.log2((156543.03392 * Math.cos((lat * Math.PI) / 180)) / mppNeeded);
  return Math.min(17, Math.max(3, Math.floor(z)));
}

/* ── Entity ids ───────────────────────────────────────────────────────
 * Each system's real identifier where it has one; systems that carry
 * no id (FIRMS fire detections, GDACS incidents, conflict markers) are
 * keyed by their coordinate cell at the precision the UI displays
 * (3dp ≈ 100 m). Ephemeral feeds turn over, so a key that no longer
 * matches anything is a stale link — the globe lands plainly. */

/** Coordinate-cell key shared by the id-less systems. */
export function coordShareId(lat: number, lng: number): string | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return `${lat.toFixed(3)},${lng.toFixed(3)}`;
}

/** Same key from a GeoJSON [lng, lat] coordinate pair. */
export function coordShareIdFromCoords(coords: readonly number[] | null | undefined): string | null {
  if (!coords || coords.length < 2) return null;
  return coordShareId(coords[1], coords[0]);
}

export function fireShareId(fire: { lat?: number | null; lng?: number | null } | null | undefined): string | null {
  if (!fire || typeof fire.lat !== 'number' || typeof fire.lng !== 'number') return null;
  return coordShareId(fire.lat, fire.lng);
}

export function eventShareId(ev: { lat?: number | null; lng?: number | null } | null | undefined): string | null {
  if (!ev || typeof ev.lat !== 'number' || typeof ev.lng !== 'number') return null;
  return coordShareId(ev.lat, ev.lng);
}

export function quakeShareId(eq: { id?: string | number | null } | null | undefined): string | null {
  const id = eq?.id === null || eq?.id === undefined ? '' : String(eq.id).trim();
  return id ? id : null;
}

export function stormShareId(
  feature: { properties?: { stormId?: unknown } } | null | undefined,
): string | null {
  const id = typeof feature?.properties?.stormId === 'string' ? feature.properties.stormId.trim() : '';
  return id ? id : null;
}

export function flightShareId(flight: { icao24?: string | null } | null | undefined): string | null {
  const id = (flight?.icao24 ?? '').trim().toLowerCase();
  return /^[0-9a-f]{4,8}$/.test(id) ? id : null;
}

/* ── URL building ───────────────────────────────────────────────────── */

function defaultBase(): string {
  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin;
  return appBaseUrl();
}

export interface EntityShareRef {
  kind: ShareEntityKind;
  id: string;
}

/**
 * The share URL for an entity. With a personal `code` the link rides
 * /ref/<code> so the visit attributes to the sharer; without one it is
 * the bare deep link.
 */
export function buildEntityShareUrl(ref: EntityShareRef, code?: string | null, base?: string): string {
  const root = (base ?? defaultBase()).replace(/\/+$/, '');
  const param = SHARE_PARAM_BY_KIND[ref.kind];
  const qs = `${param}=${encodeURIComponent(ref.id)}`;
  const cleanCode = (code ?? '').trim().toLowerCase();
  return cleanCode ? `${root}/ref/${encodeURIComponent(cleanCode)}?${qs}` : `${root}/?${qs}`;
}

/** The personal link itself: /ref/<code>, exactly the affiliate link. */
export function buildPersonalShareUrl(code: string, base?: string): string | null {
  const clean = (code ?? '').trim().toLowerCase();
  if (!clean) return null;
  const root = (base ?? defaultBase()).replace(/\/+$/, '');
  return `${root}/ref/${encodeURIComponent(clean)}`;
}

/* ── Parsing (globe landing) ────────────────────────────────────────── */

const ID_SHAPE: Record<ShareEntityKind, RegExp> = {
  camera: /^[\w.+-]{1,128}$/,
  flight: /^[0-9a-f]{4,8}$/i,
  quake: /^[\w-]{1,64}$/,
  storm: /^[\w-]{1,32}$/,
  fire: /^-?\d{1,3}\.\d{3},-?\d{1,3}\.\d{3}$/,
  event: /^-?\d{1,3}\.\d{3},-?\d{1,3}\.\d{3}$/,
};

// When several params ride one URL, the most specific entity wins.
const PARSE_PRIORITY: readonly ShareEntityKind[] = ['camera', 'flight', 'quake', 'storm', 'fire', 'event'];

/** Read an entity deep link out of a query string; null when none is well-formed. */
export function entityRefFromSearch(search: string | null | undefined): EntityShareRef | null {
  if (!search) return null;
  let params: URLSearchParams;
  try {
    params = new URLSearchParams(search);
  } catch {
    return null;
  }
  for (const kind of PARSE_PRIORITY) {
    const raw = params.get(SHARE_PARAM_BY_KIND[kind])?.trim();
    if (!raw) continue;
    const id = kind === 'flight' ? raw.toLowerCase() : raw;
    if (ID_SHAPE[kind].test(id)) return { kind, id };
  }
  return null;
}

/* ── Globe landing: layer lighting + open deadlines ─────────────────
 * page.tsx lights the shared entity's layer(s) and offers the entity
 * to the map until a deadline. Flights are the special case twice
 * over: the aircraft may ride in ANY of the four flight buckets, so
 * all four layers light (OsirisMap's render loop holds a flight
 * source empty while its layer is off — with none lit, a flight link
 * could never resolve, which is exactly what used to happen); and a
 * cold /api/flights build takes ~11 s to its first partial payload
 * and ~50 s worst case, so the shared 12 s deadline expired before
 * the data existed. */

export const SHARE_OPEN_DEADLINE_MS = 12_000;
export const FLIGHT_SHARE_OPEN_DEADLINE_MS = 90_000;
/** Storms ride the NHC pipeline (CurrentStorms + MapServer, server
 *  cache 10 min): a cold first load can take longer than the generic
 *  deadline, so a storm link gets 30 s before it settles as stale —
 *  at which point the page says the storm is no longer active. */
export const STORM_SHARE_OPEN_DEADLINE_MS = 30_000;

/** activeLayers keys the globe lights for a shared entity of a kind. */
export function shareLayersForKind(kind: ShareEntityKind): string[] {
  switch (kind) {
    case 'flight': return ['flights', 'private', 'jets', 'military'];
    case 'quake': return ['earthquakes'];
    case 'fire': return ['fires'];
    case 'storm': return ['hurricanes'];
    case 'event': return ['global_incidents'];
    case 'camera': return [];
  }
}

/** How long the globe keeps offering a shared entity to the map. */
export function shareOpenDeadlineMs(kind: ShareEntityKind): number {
  if (kind === 'flight') return FLIGHT_SHARE_OPEN_DEADLINE_MS;
  if (kind === 'storm') return STORM_SHARE_OPEN_DEADLINE_MS;
  return SHARE_OPEN_DEADLINE_MS;
}

/** How long a flight share may wait for the FIRST flights payload
 *  before it settles as stale. A cold /api/flights build takes ~50 s —
 *  and a build killed at the route's 60 s cap is only retried on the
 *  next 30 s poll — so the pre-data wait must far outlast the
 *  post-data open window. It is still bounded: a link whose data
 *  never comes lands plainly, like every stale link. */
export const FLIGHT_SHARE_PRE_DATA_CAP_MS = 300_000;

/**
 * Whether a flight share offer is still inside its window. The 90 s
 * open window (FLIGHT_SHARE_OPEN_DEADLINE_MS) runs from the first
 * flights payload arrival, NOT from the first offer: the deadline
 * used to be measured from page mount, and a cold build plus one
 * retry could outlast it, so the globe stopped offering the aircraft
 * before its data existed and the link landed inert (measured
 * 2026-10-27: a /?flight= landing sat at the home view for three
 * minutes while the aircraft was live in the feed). Before any
 * payload has arrived, the pre-data cap governs instead.
 */
export function flightShareWindowOpen(
  now: number,
  firstOfferAt: number,
  firstDataAt: number | null,
): boolean {
  if (firstDataAt == null) return now - firstOfferAt < FLIGHT_SHARE_PRE_DATA_CAP_MS;
  return now - firstDataAt < FLIGHT_SHARE_OPEN_DEADLINE_MS;
}

/** A GeoJSON flight feature is the share target when its icao24
 *  matches the link id — case-insensitively on both sides, since the
 *  link id is lowercased at parse while features carry the feed's
 *  hex verbatim. */
export function featureMatchesFlightShareId(
  feature: { properties?: { icao24?: unknown } } | null | undefined,
  id: string,
): boolean {
  const hex = typeof feature?.properties?.icao24 === 'string' ? feature.properties.icao24.trim().toLowerCase() : '';
  return hex !== '' && hex === id.trim().toLowerCase();
}

/* ── Resolution finders (pure; used by the globe landing) ───────────── */

export function findQuakeByShareId<T extends { id?: string | number | null }>(
  quakes: readonly T[] | null | undefined,
  id: string,
): T | undefined {
  return quakes?.find(q => String(q.id ?? '') === id);
}

export function findStormFeatureByShareId<T extends { properties?: { stormId?: unknown; kind?: unknown } }>(
  features: readonly T[] | null | undefined,
  id: string,
): T | undefined {
  return features?.find(
    f => f.properties?.kind === 'current' && String(f.properties?.stormId ?? '') === id,
  );
}

/** First record whose coordinate cell matches the share id. */
export function findByCoordShareId<T extends { lat?: number | null; lng?: number | null }>(
  records: readonly T[] | null | undefined,
  id: string,
): T | undefined {
  return records?.find(r => typeof r.lat === 'number' && typeof r.lng === 'number' && coordShareId(r.lat, r.lng) === id);
}

/* ── Share-sheet titles ───────────────────────────────────────────────
 * True at the level of the system, never invented detail: a title
 * names the entity only when the caller supplies a verified label. */

export function entityShareTitle(kind: ShareEntityKind, label?: string | null): string {
  const clean = (label ?? '').trim();
  if (clean) return `${clean} — live on WorldEye`;
  switch (kind) {
    case 'camera': return 'Live camera — live on WorldEye';
    case 'flight': return 'Live flight — live on WorldEye';
    case 'quake': return 'Earthquake — live on WorldEye';
    case 'storm': return 'Tropical cyclone — live on WorldEye';
    case 'fire': return 'Active wildfire — live on WorldEye';
    case 'event': return 'Developing event — live on WorldEye';
  }
}

export function entityShareText(kind: ShareEntityKind, label?: string | null): string {
  return entityShareTitle(kind, label);
}
