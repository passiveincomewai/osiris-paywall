/**
 * On-site search analytics — the payload builder for the `search_performed`
 * PageView event, fired from src/components/SearchBar.tsx through the
 * standard client path (trackAnalyticsEvent → POST /api/analytics/track)
 * and validated server-side by parseSearchDetail in ./ingest-fields.
 *
 * Why this exists: zero-result mining (see
 * ~/workspace/worldeye-zero-result/REPORT.md §2) had no first-party data at
 * all — SearchBar fired no events, so what visitors type into WorldEye's
 * own search and fail to find was invisible. This event makes every future
 * mining wave a ranked list instead of guesswork.
 *
 * Payload: ONE detail token, "<resultCount>_<query token>", stored in the
 * PageView event column as e.g. "search_performed:0_jamaica" or
 * "search_performed:12_eiffel_tower".
 *  - resultCount: how many results the search produced (places + camera
 *    matches, before the camera display cap). Clamped to 0–9999.
 *  - zeroResult: resultCount === 0 — derived, exact, never a bucket.
 *  - query token: the visitor's text NORMALIZED, never raw — lowercased,
 *    diacritics folded, every run of non-[a-z0-9] collapsed to one "_",
 *    edge "_" stripped, capped at 55 chars. The event system stores only
 *    machine tokens (camera_open carries no detail at all; utm values are
 *    charset-sanitized the same way), so raw typed text would break that
 *    discipline; the token still preserves the actual terms mining needs
 *    ("eiffel_tower", "marysville_wa", "kilauea").
 */

/** Max chars of normalized query kept in the detail token. */
export const SEARCH_QUERY_TOKEN_MAX = 55;

/** Normalize raw search text to the event system's [a-z0-9_] alphabet. */
export function normalizeSearchQuery(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // fold diacritics: Kīlauea → Kilauea, Zürich → Zurich
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, SEARCH_QUERY_TOKEN_MAX)
    .replace(/_+$/g, ""); // the cap may have cut right after a separator
}

/**
 * Build the `search_performed` detail token for one submitted search.
 * Returns null when the query has no searchable terms (empty / punctuation
 * only) — the caller fires no event in that case.
 */
export function buildSearchPerformedDetail(rawQuery: string, resultCount: number): string | null {
  const token = normalizeSearchQuery(rawQuery);
  if (!token) return null;
  const n = Number.isFinite(resultCount) ? Math.floor(resultCount) : 0;
  const count = Math.max(0, Math.min(9999, n));
  return `${count}_${token}`;
}

/**
 * Parse a stored detail token back into its parts — the reader side for
 * mining queries and reports. Input is the detail half of a stored event
 * (splitEvent(raw).detail where raw starts with "search_performed:").
 * `query` is the normalized token (underscores, not the raw typed text).
 */
export function parseSearchPerformedDetail(
  detail: string | null | undefined,
): { query: string; resultCount: number; zeroResult: boolean } | null {
  if (!detail) return null;
  const i = detail.indexOf("_");
  if (i < 1) return null;
  const head = detail.slice(0, i);
  if (!/^\d+$/.test(head)) return null;
  const query = detail.slice(i + 1);
  if (!query) return null;
  const resultCount = parseInt(head, 10);
  return { query, resultCount, zeroResult: resultCount === 0 };
}
