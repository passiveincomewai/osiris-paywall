/**
 * "Pick up where you left off" — the client half of the recents list.
 *
 * Every camera_open (via trackAnalyticsEvent's camera argument) records
 * the opened camera into localStorage `we_recent_cameras`, most recent
 * first, deduped by id. The list is what the return rail renders from
 * for signed-out visitors (who have no server-side history to read) and
 * as the instant fallback for signed-in visitors, whose authoritative
 * history is their camera_open PageView rows (cameraId stamped by the
 * ingest route — see src/lib/analytics/ingest-fields.ts).
 *
 * Honesty rules:
 *  - Only cameras the visitor actually opened on THIS browser are ever
 *    listed. Nothing is seeded, suggested, or backfilled — pre-ship
 *    opens were never recorded with an id anywhere, so the list simply
 *    starts empty and the rail does not render until a real open lands.
 *  - The stored name is the label at open time; the rail re-resolves
 *    each id against /api/cctv?id= at render time and drops ids that no
 *    longer resolve, so a stale or renamed camera never shows a
 *    placeholder.
 *  - Storage failures (private mode, blocked storage) degrade to
 *    "no recents" — the rail just doesn't render. No sentinel values.
 */

export const RECENT_CAMERAS_KEY = "we_recent_cameras";
/** Stored list cap (the rail displays fewer; headroom for dropped ids). */
export const RECENT_CAMERAS_MAX = 12;

export interface RecentCamera {
  id: string;
  name: string;
  /** Epoch ms of the most recent open. */
  at: number;
}

/** Minimal storage surface, injected in tests (visitor-id.ts pattern). */
export interface RecentCamerasStore {
  get(key: string): string | null;
  set(key: string, value: string): void;
}

const defaultStore: RecentCamerasStore = {
  get(key) {
    try {
      return typeof localStorage !== "undefined" ? localStorage.getItem(key) : null;
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      if (typeof localStorage !== "undefined") localStorage.setItem(key, value);
    } catch {
      /* storage blocked — recents simply don't persist */
    }
  },
};

function isRecentCamera(v: unknown): v is RecentCamera {
  if (typeof v !== "object" || v === null) return false;
  const r = v as Record<string, unknown>;
  return (
    typeof r.id === "string" &&
    r.id.length > 0 &&
    typeof r.name === "string" &&
    typeof r.at === "number" &&
    Number.isFinite(r.at)
  );
}

/** Parse a stored payload, dropping anything malformed. Never throws. */
export function parseRecentCameras(raw: string | null): RecentCamera[] {
  if (!raw) return [];
  try {
    const v: unknown = JSON.parse(raw);
    if (!Array.isArray(v)) return [];
    const seen = new Set<string>();
    const out: RecentCamera[] = [];
    for (const item of v) {
      if (!isRecentCamera(item) || seen.has(item.id)) continue;
      seen.add(item.id);
      out.push({ id: item.id, name: item.name, at: item.at });
      if (out.length >= RECENT_CAMERAS_MAX) break;
    }
    return out;
  } catch {
    return [];
  }
}

/**
 * Pure merge: `opened` becomes the head, any older entry for the same
 * camera is replaced, the rest keep their order, list capped.
 */
export function recordRecentCamera(
  list: RecentCamera[],
  opened: { id: string; name: string },
  now: number,
): RecentCamera[] {
  const head: RecentCamera = { id: opened.id, name: opened.name, at: now };
  return [head, ...list.filter((r) => r.id !== opened.id)].slice(0, RECENT_CAMERAS_MAX);
}

/** Read the stored recents (newest first). Empty when none/blocked. */
export function readRecentCameras(store: RecentCamerasStore = defaultStore): RecentCamera[] {
  try {
    return parseRecentCameras(store.get(RECENT_CAMERAS_KEY));
  } catch {
    return [];
  }
}

/** Record an open into storage. Fire-and-forget: never throws. */
export function rememberRecentCamera(
  camera: { id: string; name: string },
  store: RecentCamerasStore = defaultStore,
  now: number = Date.now(),
): void {
  if (!camera.id) return;
  try {
    const next = recordRecentCamera(readRecentCameras(store), camera, now);
    store.set(RECENT_CAMERAS_KEY, JSON.stringify(next));
  } catch {
    /* storage blocked — recents simply don't persist */
  }
}
