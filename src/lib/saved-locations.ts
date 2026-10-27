/**
 * OSIRIS — Saved locations: the places and cameras a visitor stars
 * to get back to in one tap.
 *
 * Persistence is LOCAL (localStorage) — deliberately, and for the
 * same reason as the transit watch list (lib/transit/watchlist.ts in
 * the rider upgrade): there is no account model that can hold a
 * mixed place+camera list. SavedCamera is a camera-only snapshot
 * store owned by the recording dashboard (stream snapshot, group,
 * sort order), and UserPreference is a fixed-column settings row
 * with no list field. Fitting places into either means a Prisma
 * migration, which is staged separately — so v1 lives on this
 * device, for this browser, works signed-out, and the UI copy says
 * exactly that. Nothing here may promise sync or cross-device
 * availability.
 *
 * The store functions take an injectable storage so they unit-test
 * without a DOM; the default is the guarded localStorage.
 */

import { buildGeoUrl } from './share/links';

export interface SavedLocation {
  kind: 'place' | 'camera';
  /**
   * Identity within the kind. Places: a stable page key
   * ("city:london", "country:france"). Cameras: the catalogue id —
   * the same id a `/?camera=` deep link carries.
   */
  key: string;
  /** Display name: place name or camera name. */
  label: string;
  /** Secondary line: "United Kingdom" for a place, "City, Country"
   *  for a camera, when the source surface knows it. */
  detail?: string;
  /**
   * Site-relative path the entry opens: the place page for a place,
   * the `/?camera=<id>` globe deep link for a camera. Must be a
   * site-relative path — absolute URLs are rejected on load.
   */
  href: string;
  /** Coordinates when the saving surface knew them — they power the
   *  "view on the globe" jump for places (camera hrefs already land
   *  on the globe). */
  lat?: number;
  lng?: number;
  /** Epoch ms when saved. */
  savedAt: number;
}

/** What a surface hands the store; savedAt is stamped at save time. */
export type SavedLocationInput = Omit<SavedLocation, 'savedAt'>;

export interface SavedStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const SAVED_LOCATIONS_KEY = 'worldeye.saved-locations.v1';

/** Window event fired after every save, so open surfaces refresh. */
export const SAVED_LOCATIONS_EVENT = 'we:saved-locations';

/**
 * The list cap. 100 is generous for a hand-picked favourites list,
 * small enough that the stored JSON stays trivial (~30 KB worst
 * case) and the Saved page stays a scannable list rather than a
 * second directory. At the cap, adding is refused (state 'full')
 * until something is removed — entries are never silently evicted,
 * because a favourites list that quietly drops your oldest save is
 * worse than one that asks.
 */
export const MAX_SAVED_LOCATIONS = 100;

export function savedId(e: Pick<SavedLocation, 'kind' | 'key'>): string {
  return `${e.kind}|${e.key}`;
}

export function defaultStorage(): SavedStorage | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage;
  } catch {
    return null; // privacy modes can make even the read throw
  }
}

function isCoord(v: unknown, min: number, max: number): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
}

function isEntry(v: any): v is SavedLocation {
  return (
    !!v &&
    (v.kind === 'place' || v.kind === 'camera') &&
    typeof v.key === 'string' &&
    v.key.length > 0 &&
    typeof v.label === 'string' &&
    v.label.length > 0 &&
    typeof v.href === 'string' &&
    v.href.startsWith('/') &&
    !v.href.startsWith('//') &&
    typeof v.savedAt === 'number' &&
    Number.isFinite(v.savedAt) &&
    (v.detail === undefined || typeof v.detail === 'string') &&
    (v.lat === undefined || isCoord(v.lat, -90, 90)) &&
    (v.lng === undefined || isCoord(v.lng, -180, 180))
  );
}

/**
 * Load the list (newest first). Corrupt or absent ⇒ empty; malformed
 * entries are dropped, duplicate identities collapse to the first
 * (newest) copy, and the result is capped at MAX_SAVED_LOCATIONS so
 * a hand-edited store cannot grow the list past the cap.
 */
export function loadSavedLocations(
  storage: SavedStorage | null = defaultStorage(),
): SavedLocation[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(SAVED_LOCATIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const seen = new Set<string>();
    const out: SavedLocation[] = [];
    for (const v of parsed) {
      if (!isEntry(v)) continue;
      const id = savedId(v);
      if (seen.has(id)) continue;
      seen.add(id);
      out.push(v);
      if (out.length >= MAX_SAVED_LOCATIONS) break;
    }
    return out;
  } catch {
    return [];
  }
}

export function saveSavedLocations(
  entries: SavedLocation[],
  storage: SavedStorage | null = defaultStorage(),
): void {
  if (!storage) return;
  try {
    storage.setItem(SAVED_LOCATIONS_KEY, JSON.stringify(entries.slice(0, MAX_SAVED_LOCATIONS)));
  } catch {
    /* storage full/blocked — the in-memory list still works this session */
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(SAVED_LOCATIONS_EVENT));
  }
}

export function isSavedLocation(
  entries: SavedLocation[],
  probe: Pick<SavedLocation, 'kind' | 'key'>,
): boolean {
  const id = savedId(probe);
  return entries.some((e) => savedId(e) === id);
}

export type ToggleSavedResult =
  | { entries: SavedLocation[]; state: 'added' }
  | { entries: SavedLocation[]; state: 'removed' }
  /** List is at the cap: nothing was added and nothing was evicted. */
  | { entries: SavedLocation[]; state: 'full' };

/**
 * Pure toggle: present ⇒ removed; absent ⇒ added at the front,
 * unless the list already holds MAX_SAVED_LOCATIONS entries, in
 * which case the list comes back unchanged with state 'full'.
 * `now` is injectable so tests are deterministic.
 */
export function toggleSavedLocation(
  entries: SavedLocation[],
  input: SavedLocationInput,
  now: number = Date.now(),
): ToggleSavedResult {
  const id = savedId(input);
  if (entries.some((e) => savedId(e) === id)) {
    return { entries: entries.filter((e) => savedId(e) !== id), state: 'removed' };
  }
  if (entries.length >= MAX_SAVED_LOCATIONS) {
    return { entries, state: 'full' };
  }
  return { entries: [{ ...input, savedAt: now }, ...entries], state: 'added' };
}

export function removeSavedLocation(
  entries: SavedLocation[],
  probe: Pick<SavedLocation, 'kind' | 'key'>,
): SavedLocation[] {
  const id = savedId(probe);
  return entries.filter((e) => savedId(e) !== id);
}

/* ── Links ────────────────────────────────────────────────────────
 * One place computes where a saved entry leads, so the Saved page
 * and any future surface agree. Camera entries already carry their
 * globe deep link as href; places carry their page href, plus a
 * geo jump when the saving surface knew coordinates. */

/** The `/?camera=<id>` globe deep link for a catalogue camera id. */
export function cameraSavedHref(cameraId: string): string {
  return `/?camera=${encodeURIComponent(cameraId)}`;
}

/**
 * The globe jump for an entry, or null when it adds nothing: a place
 * needs coordinates and frames wide (5 km radius); a camera's own
 * href already IS the globe link, so cameras get null.
 */
export function globeHrefFor(entry: SavedLocation): string | null {
  if (entry.kind !== 'place') return null;
  if (!isCoord(entry.lat, -90, 90) || !isCoord(entry.lng, -180, 180)) return null;
  return buildGeoUrl({ lat: entry.lat, lng: entry.lng, radiusM: 5_000 }, '');
}
