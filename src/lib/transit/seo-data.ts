import { TRANSIT_AGENCIES, agencyById, type TransitAgency } from './agencies';
import { networkFor, type TransitNetwork } from './network';
import { buildRouteSlugs, stateForAgency, type StateInfo } from './seo';

/**
 * OSIRIS — server-side data access for the /transit SEO pages.
 * The page family is generated from the agency registry: an agency
 * lights up automatically when it carries BOTH a `staticGtfsUrl`
 * and a `timezone` (the same condition the routes/stops/schedule
 * network build requires). Agencies with live vehicles only are
 * listed on the national hub as map-only — they get NO schedule
 * pages until a static feed is wired.
 */

export function seoAgencies(): TransitAgency[] {
  return TRANSIT_AGENCIES.filter(a => a.staticGtfsUrl && a.timezone);
}

export function seoAgencyById(id: string): TransitAgency | null {
  const a = agencyById(id);
  return a?.staticGtfsUrl && a.timezone ? a : null;
}

export interface AgencySeoData {
  agency: TransitAgency;
  net: TransitNetwork;
  /** routeId → public slug (buildRouteSlugs). */
  slugs: Map<string, string>;
  /** slug → routeId (reverse of slugs). */
  routeIdBySlug: Map<string, string>;
  state: StateInfo | null;
  tz: string;
}

/** Load + index one agency's network for page rendering. */
export async function agencySeoData(agency: TransitAgency): Promise<AgencySeoData> {
  const net = await networkFor(agency.id, agency.staticGtfsUrl!);
  const slugs = buildRouteSlugs(net.routes);
  return {
    agency,
    net,
    slugs,
    routeIdBySlug: new Map([...slugs].map(([id, slug]) => [slug, id])),
    state: stateForAgency(agency),
    tz: agency.timezone ?? 'UTC',
  };
}

/** Distinct states (registry order) that have at least one SEO agency. */
export function seoStates(): Array<{ state: StateInfo; agencies: TransitAgency[] }> {
  const bySlug = new Map<string, { state: StateInfo; agencies: TransitAgency[] }>();
  for (const agency of seoAgencies()) {
    const state = stateForAgency(agency);
    if (!state) continue;
    let entry = bySlug.get(state.slug);
    if (!entry) { entry = { state, agencies: [] }; bySlug.set(state.slug, entry); }
    entry.agencies.push(agency);
  }
  return [...bySlug.values()].sort((a, b) => a.state.name.localeCompare(b.state.name));
}

export function seoStateBySlug(slug: string): { state: StateInfo; agencies: TransitAgency[] } | null {
  return seoStates().find(s => s.state.slug === slug) ?? null;
}
