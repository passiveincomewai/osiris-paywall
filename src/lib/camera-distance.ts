/**
 * Camera Distance Finder — the pure logic behind /tools/camera-distance.
 *
 * A visitor picks two cameras from the real catalogue (or one camera
 * plus their own location) and gets the great-circle distance between
 * them. Distances are straight-line — "as the crow flies" — and the
 * page says so: this module never dresses a crow-flies figure up as a
 * road distance.
 *
 * The picks are catalogue records (id, name, city, country, lat, lng)
 * exactly as the directory chunks carry them (src/data/countries), the
 * same records the country/city pages and the globe's by-id fallback
 * resolve. A "your location" pick is the same shape with a null id —
 * it exists only in the visitor's browser and is never sent anywhere.
 */
import { buildGeoUrl } from './share/links';

export interface LatLng {
  lat: number;
  lng: number;
}

export interface CameraPick extends LatLng {
  /** Catalogue id; null for a "your location" pick. */
  id: string | null;
  name: string;
  city?: string;
  country?: string;
}

/** Mean Earth radius (IUGG), km — the haversine convention. */
export const EARTH_RADIUS_KM = 6371.0088;
export const KM_PER_MILE = 0.6213711922;

const toRad = (deg: number) => (deg * Math.PI) / 180;
const toDeg = (rad: number) => (rad * 180) / Math.PI;

export function isValidLatLng(p: LatLng | null | undefined): p is LatLng {
  return (
    !!p &&
    Number.isFinite(p.lat) &&
    Number.isFinite(p.lng) &&
    p.lat >= -90 &&
    p.lat <= 90 &&
    p.lng >= -180 &&
    p.lng <= 180
  );
}

/** Great-circle distance in kilometres (haversine). 0 for the same point. */
export function haversineKm(a: LatLng, b: LatLng): number {
  if (!isValidLatLng(a) || !isValidLatLng(b)) return NaN;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  // Clamp: floating point can push h a hair past 1 for antipodal points.
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Initial great-circle bearing from a to b, degrees clockwise from north, [0, 360). */
export function initialBearingDeg(a: LatLng, b: LatLng): number {
  if (!isValidLatLng(a) || !isValidLatLng(b)) return NaN;
  const dLng = toRad(b.lng - a.lng);
  const y = Math.sin(dLng) * Math.cos(toRad(b.lat));
  const x =
    Math.cos(toRad(a.lat)) * Math.sin(toRad(b.lat)) -
    Math.sin(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.cos(dLng);
  const deg = toDeg(Math.atan2(y, x));
  return (deg + 360) % 360;
}

/** 16-wind compass names in plain words. */
export const COMPASS_16 = [
  'north',
  'north-north-east',
  'north-east',
  'east-north-east',
  'east',
  'east-south-east',
  'south-east',
  'south-south-east',
  'south',
  'south-south-west',
  'south-west',
  'west-south-west',
  'west',
  'west-north-west',
  'north-west',
  'north-north-west',
] as const;

/** Plain-words compass direction for a bearing: 45° → "north-east". */
export function bearingCompass(deg: number): string {
  if (!Number.isFinite(deg)) return '';
  const idx = Math.floor(((deg % 360) + 360) % 360 / 22.5 + 0.5) % 16;
  return COMPASS_16[idx];
}

/** Midpoint on the sphere — where the "view both" globe link centres. */
export function sphericalMidpoint(a: LatLng, b: LatLng): LatLng {
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const lng1 = toRad(a.lng);
  const bx = Math.cos(lat2) * Math.cos(dLng);
  const by = Math.cos(lat2) * Math.sin(dLng);
  const lat3 = Math.atan2(
    Math.sin(lat1) + Math.sin(lat2),
    Math.sqrt((Math.cos(lat1) + bx) * (Math.cos(lat1) + bx) + by * by),
  );
  const lng3 = lng1 + Math.atan2(by, Math.cos(lat1) + bx);
  return { lat: toDeg(lat3), lng: ((toDeg(lng3) + 540) % 360) - 180 };
}

/** "City, Country" — the disambiguator the picker shows beside a name. */
export function placeLabel(pick: { city?: string | null; country?: string | null }): string {
  const parts = [pick.city?.trim(), pick.country?.trim()].filter(Boolean);
  return parts.join(', ');
}

/** Same camera picked twice: same catalogue id, or — for id-less picks — same name at the same spot. */
export function sameCamera(a: CameraPick, b: CameraPick): boolean {
  if (a.id && b.id) return a.id === b.id;
  return a.name === b.name && a.lat === b.lat && a.lng === b.lng;
}

function formatNumber(n: number): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: n < 1000 ? 1 : 0 });
}

/** Human distance: metres under a kilometre, then km with miles alongside. */
export function formatDistance(km: number): { primary: string; secondary: string } {
  if (!Number.isFinite(km)) return { primary: '—', secondary: '' };
  if (km < 1) {
    const m = Math.max(0, Math.round(km * 1000));
    return { primary: `${m.toLocaleString('en-US')} m`, secondary: `${(km * KM_PER_MILE * 5280).toFixed(0)} ft` };
  }
  return {
    primary: `${formatNumber(km)} km`,
    secondary: `${formatNumber(km * KM_PER_MILE)} miles`,
  };
}

/* ── Picker search ────────────────────────────────────────────────────
 * Ranking is deliberately simple and deterministic: a name that starts
 * with the query beats a name that contains it, which beats a city or
 * country match. Two cameras can share a name word-for-word (every
 * state has a "Main Street"), so results are never collapsed by name —
 * the place label beside each one is what tells them apart. */

function normalise(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

interface Searchable {
  name: string;
  city?: string | null;
  country?: string | null;
  lat: number;
  lng: number;
}

function scoreCamera(cam: Searchable, q: string, words: string[]): number {
  const name = normalise(cam.name);
  const city = normalise(cam.city ?? '');
  const country = normalise(cam.country ?? '');
  if (name.startsWith(q)) return 0;
  if (name.includes(q)) return 1;
  if (city && city.startsWith(q)) return 2;
  if ((city && city.includes(q)) || (country && country.includes(q))) return 3;
  // Every query word appears somewhere across name + place.
  const hay = `${name} ${city} ${country}`;
  if (words.every(w => hay.includes(w))) return 4;
  return -1;
}

export function searchCameras<T extends Searchable>(
  cameras: readonly T[],
  query: string,
  limit = 12,
): T[] {
  const q = normalise(query);
  if (q.length < 2) return [];
  const words = q.split(' ');
  const scored: { cam: T; score: number }[] = [];
  for (const cam of cameras) {
    if (!isValidLatLng(cam)) continue;
    const score = scoreCamera(cam, q, words);
    if (score >= 0) scored.push({ cam, score });
  }
  scored.sort(
    (x, y) => x.score - y.score || x.cam.name.localeCompare(y.cam.name),
  );
  return scored.slice(0, Math.max(1, limit)).map(s => s.cam);
}

/** Narrow a catalogue record to the pick shape the API returns. */
export function toCameraPick(cam: {
  id?: string | number | null;
  name?: string | null;
  city?: string | null;
  country?: string | null;
  lat?: number | null;
  lng?: number | null;
}): CameraPick | null {
  if (!cam || typeof cam.name !== 'string' || !cam.name.trim()) return null;
  if (typeof cam.lat !== 'number' || typeof cam.lng !== 'number') return null;
  const pick: CameraPick = {
    id: cam.id === null || cam.id === undefined ? null : String(cam.id),
    name: cam.name.trim(),
    lat: cam.lat,
    lng: cam.lng,
  };
  if (!isValidLatLng(pick)) return null;
  if (cam.city?.trim()) pick.city = cam.city.trim();
  if (cam.country?.trim()) pick.country = cam.country.trim();
  return pick;
}

/* ── Globe links ──────────────────────────────────────────────────────
 * One link can centre the globe on one target. For a pair, the honest
 * centre is the spherical midpoint, framed by a radius of half the
 * pair's distance (buildGeoUrl applies the site's 250 m–100 km radius
 * clamp, so intercontinental pairs centre at the widest framing the
 * geo link supports, with both cameras a pan away at worst). */

/** "View both on the globe": a /?geo= link centred between the picks. */
export function buildPairGlobeUrl(a: LatLng, b: LatLng, base?: string): string | null {
  if (!isValidLatLng(a) || !isValidLatLng(b)) return null;
  const mid = sphericalMidpoint(a, b);
  const radiusM = Math.max(250, (haversineKm(a, b) * 1000) / 2);
  return buildGeoUrl({ lat: mid.lat, lng: mid.lng, radiusM }, base);
}
