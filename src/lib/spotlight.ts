/**
 * Wave 2 F13 — Daily Spotlight Cam selection.
 *
 * BRIEF F13 asks for "yesterday's most-opened" camera. That number does
 * not exist in stored data today: the analytics `camera_open` event is
 * fired without a camera id (see the call sites in src/app/page.tsx and
 * the directory explorers — trackAnalyticsEvent('camera_open') with no
 * detail token, and the ingest detail grammar [a-z0-9_]{1,24} cannot
 * carry catalogue ids anyway). Rather than invent a "most-opened"
 * figure, the spotlight is a DETERMINISTIC DAILY ROTATION over the real
 * catalogue: the same camera all day (Denver calendar day), a different
 * one tomorrow, chosen only from cameras the site's own preview
 * machinery can actually play (lib/camera-preview's previewMedia —
 * the same test the homepage showcase uses), so a dead camera is never
 * featured knowingly.
 *
 * Pure module: the route (app/api/spotlight) resolves the catalogue and
 * hands the playable records here.
 */

/** The spotlight day: the America/Denver calendar date (the owner's and
 *  the audience's day), as YYYY-MM-DD. */
export function spotlightDateKey(now: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Denver",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** FNV-1a — small, stable, deterministic across processes and deploys
 *  (unlike a seeded PRNG, this can never drift between instances, so
 *  every visitor and every function instance agrees on today's pick). */
export function spotlightHash(key: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

export interface SpotlightPick<T> {
  camera: T;
  index: number;
  total: number;
  dateKey: string;
}

/**
 * Pick today's camera from the playable catalogue records. The list is
 * sorted by id first, so the pick depends only on (date, catalogue id
 * set) — never on loader order, which differs between the payload,
 * snapshot and fastlane catalogue sources.
 */
export function pickSpotlight<T extends { id: string }>(
  cameras: readonly T[],
  dateKey: string,
): SpotlightPick<T> | null {
  const sorted = [...cameras]
    .filter((c) => typeof c?.id === "string" && c.id.length > 0)
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  if (sorted.length === 0) return null;
  const index = spotlightHash(`worldeye-spotlight:${dateKey}`) % sorted.length;
  return { camera: sorted[index], index, total: sorted.length, dateKey };
}
