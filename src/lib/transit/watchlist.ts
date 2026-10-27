/**
 * OSIRIS — Transit watch list (rider upgrade, 2026-10-26): the
 * stops and routes a rider stars to keep an eye on.
 *
 * Persistence is LOCAL (localStorage) — deliberately. There is no
 * account favourites model in the schema: UserPreference is a
 * fixed-column settings row (home point, units, layer defaults)
 * with no room for a list, and adding one is a Prisma migration,
 * out of scope for this build. So a watch list lives on this
 * device, for this browser, and the UI copy says exactly that.
 * The store functions take an injectable storage so they unit-test
 * without a DOM; the default is the guarded localStorage.
 *
 * Alerts on watched items are IN-APP only — the Explorer's Alerts
 * view shows their live status while it is open. Push notifications
 * are not wired anywhere in the app yet, and nothing here (or in
 * the UI built on it) may promise them.
 */

export interface WatchEntry {
  kind: 'stop' | 'route';
  agencyId: string;
  /** Stop id (kind 'stop') or public route label (kind 'route'). */
  key: string;
  /** Display label: stop name, or "701 · Blue Line" for a route. */
  label: string;
  /** Stop coordinates when known — lets a watched stop fly the
   *  globe and seed directions without a network lookup. */
  lat?: number;
  lng?: number;
}

export interface WatchStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const WATCHLIST_KEY = 'osiris.transit.watchlist.v1';

/** Window event fired after every save, so open surfaces refresh. */
export const WATCHLIST_EVENT = 'we:transit-watchlist';

export function watchId(e: Pick<WatchEntry, 'kind' | 'agencyId' | 'key'>): string {
  return `${e.agencyId}|${e.kind}|${e.key}`;
}

export function defaultStorage(): WatchStorage | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage;
  } catch {
    return null; // privacy modes can make even the read throw
  }
}

function isEntry(v: any): v is WatchEntry {
  return (
    !!v &&
    (v.kind === 'stop' || v.kind === 'route') &&
    typeof v.agencyId === 'string' &&
    typeof v.key === 'string' &&
    typeof v.label === 'string'
  );
}

/** Load the list (newest first). Corrupt or absent ⇒ empty. */
export function loadWatchlist(storage: WatchStorage | null = defaultStorage()): WatchEntry[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(WATCHLIST_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isEntry);
  } catch {
    return [];
  }
}

export function saveWatchlist(
  entries: WatchEntry[],
  storage: WatchStorage | null = defaultStorage(),
): void {
  if (!storage) return;
  try {
    storage.setItem(WATCHLIST_KEY, JSON.stringify(entries));
  } catch {
    /* storage full/blocked — the in-memory list still works this session */
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(WATCHLIST_EVENT));
  }
}

/** Pure toggle: present ⇒ removed; absent ⇒ added at the front. */
export function toggleWatch(entries: WatchEntry[], entry: WatchEntry): WatchEntry[] {
  const id = watchId(entry);
  if (entries.some((e) => watchId(e) === id)) {
    return entries.filter((e) => watchId(e) !== id);
  }
  return [entry, ...entries];
}

export function isWatched(
  entries: WatchEntry[],
  probe: Pick<WatchEntry, 'kind' | 'agencyId' | 'key'>,
): boolean {
  const id = watchId(probe);
  return entries.some((e) => watchId(e) === id);
}

/** The watched entries belonging to one agency, stops first. */
export function watchForAgency(entries: WatchEntry[], agencyId: string): WatchEntry[] {
  return entries
    .filter((e) => e.agencyId === agencyId)
    .sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'stop' ? -1 : 1));
}
