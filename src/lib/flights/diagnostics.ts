/**
 * OSIRIS — flight coverage diagnostics.
 *
 * Two jobs, both bookkeeping-only:
 *
 * 1. classifyDropReason() names WHY classifyFlight() in /api/flights refuses
 *    a record, so the route can count its exclusions instead of letting them
 *    vanish into "received − classified". The two reasons are the only two
 *    early returns the classifier has ever had: ground "tower" pseudo-records
 *    and records with no position. Nothing else is dropped, and in particular
 *    NOTHING is dropped for staleness — the route applies no staleness filter,
 *    so deriveFlightCoverage() reports dropped_stale as null (not measured)
 *    rather than inventing a number.
 *
 * 2. deriveFlightCoverage() turns one /api/flights payload into the view
 *    model the admin Flight Coverage section renders. It derives ONLY from
 *    fields the payload actually carries (counts, providers{}, timestamp,
 *    diagnostics{}) and labels everything it infers as inferred.
 */

export type FlightDropReason = 'tower' | 'no-position';

/**
 * Why the flights classifier would drop this raw record, or null if it would
 * keep it. Mirrors the classifier's early returns exactly — classifyFlight()
 * calls this so the conditions live in one place.
 */
export function classifyDropReason(f: any): FlightDropReason | null {
  if ((f.t || '').toUpperCase() === 'TWR') return 'tower';
  if (f.lat == null || f.lon == null) return 'no-position';
  return null;
}

export interface FlightsProviders {
  adsblol_mil?: number | null;
  adsbfi_mil?: number | null;
  adsblol_regional?: number | null;
  adsblol_regions?: number | null;
  adsbfi_regions?: number | null;
  adsblol_regional_age_s?: number | null;
  opensky?: number | null;
  opensky_auth?: boolean | null;
  opensky_age_s?: number | null;
}

/** The subset of the /api/flights payload the diagnostics read. */
export interface FlightsPayload {
  total?: number;
  source?: string;
  timestamp?: string;
  commercial_flights?: unknown[];
  private_flights?: unknown[];
  private_jets?: unknown[];
  military_flights?: unknown[];
  providers?: FlightsProviders;
  diagnostics?: {
    dropped_invalid?: number | null;
    dropped_stale?: number | null;
  } | null;
}

export type ProviderState = 'ok' | 'warning' | 'idle' | 'unknown';

export interface ProviderRow {
  key: string;
  label: string;
  count: number | null;
  detail: string;
  state: ProviderState;
}

export interface FlightCoverageView {
  /** Unique aircraft records the route received (post cross-provider dedupe). */
  received: number;
  commercial: number;
  privateCount: number;
  jets: number;
  military: number;
  classified: number;
  /**
   * == classified. The client converts classified aircraft to map features
   * 1:1 (unit-tested property of src/lib/flights/render.ts since 8035e71),
   * so the server's classified count IS the rendered count; there is no
   * separate server-side render counter and none is implied.
   */
  rendered: number;
  /** Records the classifier dropped as tower pseudo-records / position-less. */
  droppedInvalid: number | null;
  /**
   * Always null from the current route: no staleness filter exists
   * server-side, so no aircraft are excluded for age and there is no honest
   * number to show. Null = "not measured", never zero.
   */
  droppedStale: number | null;
  sourceRaw: string;
  sourceKind: 'snapshot' | 'regional' | 'unknown';
  /** True when the payload is the stale-cache fallback (source carries +stale). */
  servingStale: boolean;
  lastUpdateIso: string | null;
  lastUpdateAgeSec: number | null;
  providers: ProviderRow[];
  warnings: string[];
}

/** Total regions in the sweep — must equal REGIONS.length in
 * src/app/api/flights/route.ts. Exported so diagnostics.test.ts can pin
 * it against the real array (this module cannot import the route: the
 * route imports this module). */
export const REGIONS_TOTAL = 40;

function len(a: unknown[] | undefined): number {
  return Array.isArray(a) ? a.length : 0;
}

function num(v: number | null | undefined): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function ageDetail(ageSec: number | null): string {
  return ageSec == null ? '' : ` · snapshot age ${ageSec}s`;
}

export function deriveFlightCoverage(p: FlightsPayload, nowMs: number): FlightCoverageView {
  const commercial = len(p.commercial_flights);
  const privateCount = len(p.private_flights);
  const jets = len(p.private_jets);
  const military = len(p.military_flights);
  const classified = commercial + privateCount + jets + military;

  const droppedInvalid = num(p.diagnostics?.dropped_invalid ?? null);
  const droppedStale = num(p.diagnostics?.dropped_stale ?? null);

  const received = typeof p.total === 'number' && Number.isFinite(p.total)
    ? p.total
    : classified + (droppedInvalid ?? 0);

  const sourceRaw = typeof p.source === 'string' ? p.source : '';
  const sourceKind: FlightCoverageView['sourceKind'] = sourceRaw.startsWith('opensky')
    ? 'snapshot'
    : sourceRaw.startsWith('regional')
      ? 'regional'
      : 'unknown';
  const servingStale = sourceRaw.includes('stale');

  let lastUpdateIso: string | null = null;
  let lastUpdateAgeSec: number | null = null;
  if (typeof p.timestamp === 'string') {
    const t = Date.parse(p.timestamp);
    if (Number.isFinite(t)) {
      lastUpdateIso = p.timestamp;
      lastUpdateAgeSec = Math.max(0, Math.round((nowMs - t) / 1000));
    }
  }

  const prov = p.providers ?? {};
  const osCount = num(prov.opensky ?? null);
  const osAuth = prov.opensky_auth === true;
  const milLolCount = num(prov.adsblol_mil ?? null);
  const milFallbackCount = num(prov.adsbfi_mil ?? null);
  const milCount =
    milLolCount == null && milFallbackCount == null
      ? null
      : (milLolCount ?? 0) + (milFallbackCount ?? 0);
  const regCount = num(prov.adsblol_regional ?? null);
  const lolRegions = num(prov.adsblol_regions ?? null);
  const fiRegions = num(prov.adsbfi_regions ?? null);
  const regRegions =
    lolRegions == null && fiRegions == null ? null : (lolRegions ?? 0) + (fiRegions ?? 0);

  const providers: ProviderRow[] = [
    {
      key: 'opensky',
      label: 'OpenSky snapshot',
      count: osCount,
      detail:
        (osAuth ? 'authenticated' : 'anonymous — no credentials configured (opensky_auth: false)') +
        ageDetail(num(prov.opensky_age_s ?? null)),
      state: osCount == null ? 'unknown' : osCount > 0 ? 'ok' : 'warning',
    },
    {
      key: 'adsblol_mil',
      label: 'adsb.lol — military feed (primary)',
      count: milCount,
      detail:
        (milCount === 0
          ? 'returned 0 aircraft this cycle'
          : 'global type feed, refreshed every cycle') +
        ((milFallbackCount ?? 0) > 0
          ? ` · adsb.fi fallback carried ${milFallbackCount} of these this cycle`
          : ''),
      state: milCount == null ? 'unknown' : milCount > 0 ? 'ok' : 'warning',
    },
    {
      key: 'adsblol_regional',
      label: 'adsb.lol — regional sweep (primary)',
      count: regCount,
      detail:
        (regRegions != null
          ? `regions answered ${regRegions}/${REGIONS_TOTAL} (adsb.lol ${lolRegions ?? 0} · adsb.fi fallback ${fiRegions ?? 0})`
          : 'region count not reported') +
        ageDetail(num(prov.adsblol_regional_age_s ?? null)) +
        (sourceKind === 'snapshot' ? ' · standby — runs only when no OpenSky snapshot exists' : ''),
      state:
        regCount == null
          ? 'unknown'
          : sourceKind === 'snapshot'
            ? 'idle'
            : regCount > 0
              ? 'ok'
              : 'warning',
    },
  ];

  const warnings: string[] = [];
  if (servingStale) {
    warnings.push('Serving the last good payload (source reports +stale) — the latest refresh failed and the route fell back to its cache.');
  }
  if (osCount === 0 && !osAuth) {
    warnings.push('OpenSky is contributing 0 aircraft and no credentials are configured (opensky_auth: false) — the anonymous pool cannot sustain a global snapshot from this host.');
  } else if (osCount === 0 && osAuth) {
    warnings.push('OpenSky is contributing 0 aircraft despite configured credentials — check the provider status.');
  }
  if (received > 0 && received < 100) {
    warnings.push(`Only ${received} aircraft received — coverage is severely degraded (the route serves no-store below 100).`);
  }
  if (sourceKind === 'regional' && regRegions != null && regRegions < REGIONS_TOTAL) {
    warnings.push(`Regional sweep answered from ${regRegions}/${REGIONS_TOTAL} regions — the rest timed out or returned nothing this cycle.`);
  }

  return {
    received,
    commercial,
    privateCount,
    jets,
    military,
    classified,
    rendered: classified,
    droppedInvalid,
    droppedStale,
    sourceRaw,
    sourceKind,
    servingStale,
    lastUpdateIso,
    lastUpdateAgeSec,
    providers,
    warnings,
  };
}
