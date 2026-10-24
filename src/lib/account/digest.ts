// ── Weekly digest region filter (item 17) ───────────────────────────
// The digest sender lives in the lifecycle-email branch; this is the
// region filter it must apply so a user's region picks actually shape
// their digest. An item matches when the user picked no regions
// (digest everywhere) or when any of the item's region labels matches
// a picked region (case-insensitive substring, either direction —
// picks are free-text like "Utah" or "Florida Keys").

import type { Preferences } from "./preferences";

export interface DigestItem {
  title: string;
  /** Free-text region labels for the item, e.g. ["Utah", "Wasatch Front"]. */
  regions: string[];
}

export function digestEnabledFor(prefs: Preferences): boolean {
  return prefs.digestEnabled && prefs.emailWeeklyDigest;
}

export function filterDigestItems<T extends DigestItem>(prefs: Preferences, items: T[]): T[] {
  const picks = prefs.digestRegions.map((r) => r.trim().toLowerCase()).filter(Boolean);
  if (picks.length === 0) return items;
  return items.filter((item) =>
    item.regions.some((region) => {
      const r = region.trim().toLowerCase();
      return r !== "" && picks.some((p) => r.includes(p) || p.includes(r));
    }),
  );
}
