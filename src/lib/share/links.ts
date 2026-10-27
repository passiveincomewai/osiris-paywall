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
export const REF_PASSTHROUGH_PARAMS: readonly string[] = Object.values(SHARE_PARAM_BY_KIND);

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
  return kind === 'flight' ? FLIGHT_SHARE_OPEN_DEADLINE_MS : SHARE_OPEN_DEADLINE_MS;
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
