/**
 * Internal search-demand aggregation (SEO Programme Phase 8).
 *
 * Reads the `search_performed` PageView events that SearchBar has been
 * writing since the instrumentation shipped (payload design in
 * ./search-event.ts: event column holds "search_performed:<count>_<token>")
 * and aggregates them into the demand picture the SEO programme consumes:
 * most-searched tokens, the zero-result list, a weekly trend, a
 * demand-vs-inventory join against the committed catalogue, and the
 * search→camera-open success rate (a session counts as a success when a
 * `camera_open` event lands in the same session at or after the
 * session's first search).
 *
 * Privacy: the events store ONLY normalized tokens (never raw typed
 * text) and this module never emits session or user identifiers —
 * aggregates in, aggregates out.
 */
import { splitEvent } from "./ingest-fields";
import { normalizeSearchQuery, parseSearchPerformedDetail } from "./search-event";

export interface TimedEventRow {
  event: string;
  sessionId: string | null;
  createdAt: Date | string;
}

export interface SearchTokenStat {
  token: string;
  searches: number;
  zeroResultSearches: number;
  lastSearchedAt: string; // ISO
}

export interface SearchDemandReport {
  totalSearches: number;
  zeroResultSearches: number;
  uniqueTokens: number;
  /** Most-searched tokens, by searches desc then token asc. */
  top: SearchTokenStat[];
  /** Tokens whose searches ALL returned zero results, by searches desc. */
  zeroResults: SearchTokenStat[];
  /** ISO-week buckets (UTC Mondays), chronological. */
  weekly: { weekStart: string; searches: number; zeroResultSearches: number }[];
  success: {
    searchSessions: number;
    sessionsWithCameraOpen: number;
    /** Null when there are no search sessions to judge. */
    ratePct: number | null;
  };
}

function ts(v: Date | string): number {
  return v instanceof Date ? v.getTime() : new Date(v).getTime();
}

function weekStartIso(t: number): string {
  const d = new Date(t);
  const day = d.getUTCDay(); // 0 = Sunday
  const delta = (day + 6) % 7; // days since Monday
  const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - delta));
  return monday.toISOString().slice(0, 10);
}

const byRank = (a: SearchTokenStat, b: SearchTokenStat) =>
  b.searches - a.searches || a.token.localeCompare(b.token);

export function aggregateSearchDemand(
  searchRows: TimedEventRow[],
  cameraOpenRows: TimedEventRow[],
  limit = 25,
): SearchDemandReport {
  const tokens = new Map<string, SearchTokenStat>();
  const weeks = new Map<string, { weekStart: string; searches: number; zeroResultSearches: number }>();
  const firstSearchBySession = new Map<string, number>();
  let total = 0;
  let zeroTotal = 0;

  for (const row of searchRows) {
    const { name, detail } = splitEvent(row.event);
    if (name !== "search_performed") continue;
    const parsed = parseSearchPerformedDetail(detail);
    if (!parsed) continue;
    const t = ts(row.createdAt);
    total += 1;
    if (parsed.zeroResult) zeroTotal += 1;

    const stat =
      tokens.get(parsed.query) ??
      { token: parsed.query, searches: 0, zeroResultSearches: 0, lastSearchedAt: new Date(t).toISOString() };
    stat.searches += 1;
    if (parsed.zeroResult) stat.zeroResultSearches += 1;
    if (t > new Date(stat.lastSearchedAt).getTime()) stat.lastSearchedAt = new Date(t).toISOString();
    tokens.set(parsed.query, stat);

    const wk = weekStartIso(t);
    const bucket = weeks.get(wk) ?? { weekStart: wk, searches: 0, zeroResultSearches: 0 };
    bucket.searches += 1;
    if (parsed.zeroResult) bucket.zeroResultSearches += 1;
    weeks.set(wk, bucket);

    if (row.sessionId) {
      const prev = firstSearchBySession.get(row.sessionId);
      if (prev === undefined || t < prev) firstSearchBySession.set(row.sessionId, t);
    }
  }

  const openBySession = new Map<string, number[]>();
  for (const row of cameraOpenRows) {
    if (row.event !== "camera_open" || !row.sessionId) continue;
    const arr = openBySession.get(row.sessionId) ?? [];
    arr.push(ts(row.createdAt));
    openBySession.set(row.sessionId, arr);
  }
  let successSessions = 0;
  for (const [sessionId, firstSearch] of firstSearchBySession) {
    const opens = openBySession.get(sessionId);
    if (opens && opens.some((t) => t >= firstSearch)) successSessions += 1;
  }

  const all = [...tokens.values()];
  return {
    totalSearches: total,
    zeroResultSearches: zeroTotal,
    uniqueTokens: all.length,
    top: [...all].sort(byRank).slice(0, limit),
    zeroResults: all
      .filter((s) => s.zeroResultSearches === s.searches && s.searches > 0)
      .sort(byRank)
      .slice(0, limit),
    weekly: [...weeks.values()].sort((a, b) => a.weekStart.localeCompare(b.weekStart)),
    success: {
      searchSessions: firstSearchBySession.size,
      sessionsWithCameraOpen: successSessions,
      ratePct:
        firstSearchBySession.size > 0
          ? Math.round((successSessions / firstSearchBySession.size) * 1000) / 10
          : null,
    },
  };
}

/**
 * Demand vs inventory: for each searched token, the catalogue camera
 * count of the place it names, or null when the token matches no
 * catalogue place. A token matches a place when it equals the place's
 * normalized name, or the place's normalized name appears inside the
 * token as a whole segment run (e.g. token "tokyo_webcam" ⊃ "tokyo").
 * Matching uses the same normalization as the search events themselves
 * (normalizeSearchQuery), so "New York" and "new_york" meet exactly.
 */
export interface PlaceInventory {
  name: string;
  cameras: number;
}

export function matchTokenInventory(
  token: string,
  places: PlaceInventory[],
): { name: string; cameras: number } | null {
  let best: { name: string; cameras: number; keyLen: number } | null = null;
  for (const place of places) {
    const key = normalizeSearchQuery(place.name);
    if (!key) continue;
    if (token === key || token.startsWith(`${key}_`) || token.endsWith(`_${key}`) || token.includes(`_${key}_`)) {
      if (!best || key.length > best.keyLen) best = { name: place.name, cameras: place.cameras, keyLen: key.length };
    }
  }
  return best ? { name: best.name, cameras: best.cameras } : null;
}

export function demandVsInventory(
  report: SearchDemandReport,
  places: PlaceInventory[],
  limit = 25,
): { token: string; searches: number; zeroResultSearches: number; place: string | null; cameras: number | null }[] {
  return report.top.slice(0, limit).map((s) => {
    const m = matchTokenInventory(s.token, places);
    return {
      token: s.token,
      searches: s.searches,
      zeroResultSearches: s.zeroResultSearches,
      place: m?.name ?? null,
      cameras: m?.cameras ?? null,
    };
  });
}
