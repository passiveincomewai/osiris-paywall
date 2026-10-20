/**
 * OSIRIS — camera search for the globe's search bar, and its Pro filters.
 *
 * What search returns today: places (via /api/geosearch — free, never
 * filtered) and, with this module, cameras matched on the client over the
 * catalogue the page already downloads for the map (src/lib/camera-catalog).
 * There is no camera search backend and this module does not invent one:
 * the catalogue is the free tier's public data, the same records
 * nearby-cameras.ts and the country explorers read.
 *
 * The ADVANCED FILTERS are the Pro perk the pricing page advertises:
 *   · Country — restrict camera results to one country. Catalogue records
 *     disagree on spelling: curated sources use full names ("Japan"),
 *     harvest/FAA sources use ISO alpha-2 codes ("JP", "US"). Both are
 *     canonicalised to one facet before comparison.
 *   · Type — the catalogue's real taxonomy is its media kind, derived by
 *     cameraMediaKind (lib/country-cameras): Live video / Live snapshot /
 *     Live embed / At source. The data carries no scene category
 *     (traffic/beach/…), so none is offered.
 *   · Live feeds only — records that carry an actual feed (feed_url or
 *     stream_url). The catalogue has no per-camera status field; every
 *     served record was verified at import, and 'link' records hold no
 *     feed of their own — those are what this filter removes.
 *
 * The gate lives in applyCameraFilters: for anyone who is not Pro the
 * filters are inert (the input comes back unchanged), so a free client
 * gains nothing by setting filter state — it can only ever see what basic
 * search shows. Access uses the product's one definition of Pro:
 * session.user.subscriptionStatus === 'active' (paid, trialing and comp
 * all resolve to 'active' in src/auth.ts) — the same test as the traffic
 * gate (lib/traffic/access) and the flight-path gate (lib/flights/path).
 *
 * Team Access (Workstream H): subscriptionStatus stays the member's
 * OWN billing status, so a team member whose access comes from their
 * organization's owner reads not-active there; the session's planTier
 * is the EFFECTIVE tier (own or org-granted, resolved in the jwt in
 * src/auth.ts), so the gate also passes when that tier satisfies "pro"
 * via lib/plan-tier. Legacy sessions without planTier fall back to the
 * status check alone (planTierOf's own fallback), exactly as before.
 * Fail-soft: any error reading the tier falls back to the status-only
 * result — it never throws the gate open or closed.
 */
import { cameraMediaKind, type CameraMediaKind, type CountryCamera } from '@/lib/country-cameras';
import { planTierOf, tierSatisfies } from '@/lib/plan-tier';

/** The catalogue fields camera search and its filters read. */
export interface SearchableCamera extends CountryCamera {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export type SearchFiltersAccess = 'pro' | 'free' | 'signed-out';

/**
 * Access for the advanced filters from a session object (the shape
 * /api/auth/session returns). Mirrors flightPathAccess in
 * lib/flights/path.ts: a malformed session is 'unknown' ground — treated
 * as not Pro by applyCameraFilters, which is the safe side.
 */
export function searchFiltersAccess(session: unknown): SearchFiltersAccess | 'unknown' {
  if (!session || typeof session !== 'object') return 'unknown';
  const user = (session as { user?: unknown }).user;
  if (!user || typeof user !== 'object') return 'signed-out';
  // Own billing status first (unchanged for own subscribers), then the
  // effective tier the jwt now carries for team-granted members.
  if ((user as { subscriptionStatus?: unknown }).subscriptionStatus === 'active') return 'pro';
  try {
    return tierSatisfies(
      planTierOf(session as { user?: { planTier?: unknown; subscriptionStatus?: unknown } }),
      'pro',
    )
      ? 'pro'
      : 'free';
  } catch {
    return 'free';
  }
}

// ── Country facets ──────────────────────────────────────────────────

export interface CountryFacet {
  /** Canonical key compared against canonicalCountry(cam.country).key. */
  key: string;
  /** Display label ("United States", "Japan"). */
  label: string;
  count: number;
}

let regionNames: Intl.DisplayNames | null | undefined;
function regionDisplayNames(): Intl.DisplayNames | null {
  if (regionNames === undefined) {
    try {
      regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
    } catch {
      regionNames = null;
    }
  }
  return regionNames;
}

/**
 * One canonical country for the values the catalogue actually carries:
 * full names pass through, ISO alpha-2 codes become their English name
 * ("US" → "United States", "UK" → "United Kingdom"), so the two spellings
 * of one country share a facet. Returns null for an empty value.
 */
export function canonicalCountry(raw: string | undefined | null): { key: string; label: string } | null {
  const value = (raw ?? '').replace(/\s+/g, ' ').trim();
  if (!value) return null;
  if (/^[A-Za-z]{2}$/.test(value)) {
    const dn = regionDisplayNames();
    if (dn) {
      try {
        const label = dn.of(value.toUpperCase());
        if (label && label !== value.toUpperCase()) return { key: label.toLowerCase(), label };
      } catch {
        /* not a region code ICU knows — fall through to the raw value */
      }
    }
  }
  return { key: value.toLowerCase(), label: value };
}

/** Country facets over a camera set, biggest first, name as tiebreak. */
export function countryFacets(cameras: readonly SearchableCamera[]): CountryFacet[] {
  const byKey = new Map<string, CountryFacet>();
  for (const cam of cameras) {
    const c = canonicalCountry(cam.country);
    if (!c) continue;
    const existing = byKey.get(c.key);
    if (existing) existing.count++;
    else byKey.set(c.key, { key: c.key, label: c.label, count: 1 });
  }
  return [...byKey.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

// ── Camera type (media kind) ────────────────────────────────────────

/** Filter options for Type, in the order the explorer presents them. */
export const CAMERA_KIND_OPTIONS: { kind: CameraMediaKind; label: string }[] = [
  { kind: 'video', label: 'Live video' },
  { kind: 'snapshot', label: 'Live snapshot' },
  { kind: 'embed', label: 'Live embed' },
  { kind: 'link', label: 'At source' },
];

export function cameraKindLabel(kind: CameraMediaKind): string {
  return CAMERA_KIND_OPTIONS.find((o) => o.kind === kind)?.label ?? 'At source';
}

// ── Matching (basic search — free) ──────────────────────────────────

function clean(value: string | undefined | null): string {
  return (value ?? '').replace(/\s+/g, ' ').trim().toLowerCase();
}

/**
 * Cameras whose name, city, country or source mentions the query, best
 * matches first: a name that starts with the query, then a name that
 * contains it, then a city match, then country/source. Deterministic
 * (name as tiebreak) so the list never reshuffles between keystrokes
 * beyond what the query itself changed.
 */
export function matchCameras(
  cameras: readonly SearchableCamera[],
  query: string,
  limit = 200,
): SearchableCamera[] {
  const q = clean(query);
  if (q.length < 2) return [];
  const scored: { cam: SearchableCamera; score: number }[] = [];
  for (const cam of cameras) {
    const name = clean(cam.name);
    let score = -1;
    if (name.startsWith(q)) score = 0;
    else if (name.includes(q)) score = 1;
    else if (clean(cam.city).includes(q)) score = 2;
    else if (clean(canonicalCountry(cam.country)?.label).includes(q) || clean(cam.source).includes(q)) score = 3;
    if (score >= 0) scored.push({ cam, score });
  }
  return scored
    .sort((a, b) => a.score - b.score || a.cam.name.localeCompare(b.cam.name))
    .slice(0, limit)
    .map((s) => s.cam);
}

// ── The advanced filters (Pro) ──────────────────────────────────────

export interface CameraSearchFilters {
  /** Canonical country key (see canonicalCountry), or null for all. */
  countryKey: string | null;
  /** Media kind, or null for all types. */
  kind: CameraMediaKind | null;
  /** Only cameras carrying an actual feed (media kind ≠ 'link'). */
  liveOnly: boolean;
}

export const EMPTY_CAMERA_FILTERS: CameraSearchFilters = {
  countryKey: null,
  kind: null,
  liveOnly: false,
};

export function cameraFiltersActive(filters: CameraSearchFilters): boolean {
  return filters.countryKey !== null || filters.kind !== null || filters.liveOnly;
}

/**
 * Apply the advanced filters. THE GATE: unless access is 'pro' the set
 * comes back unchanged — locked controls in the UI are the visible fence,
 * this is the functional one, and it is what the tests pin.
 */
export function applyCameraFilters(
  cameras: readonly SearchableCamera[],
  filters: CameraSearchFilters,
  access: SearchFiltersAccess | 'unknown',
): SearchableCamera[] {
  if (access !== 'pro' || !cameraFiltersActive(filters)) return [...cameras];
  return cameras.filter((cam) => {
    if (filters.countryKey && canonicalCountry(cam.country)?.key !== filters.countryKey) return false;
    if (filters.kind || filters.liveOnly) {
      const kind = cameraMediaKind(cam);
      if (filters.kind && kind !== filters.kind) return false;
      if (filters.liveOnly && kind === 'link') return false;
    }
    return true;
  });
}
