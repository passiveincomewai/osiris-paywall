import type { DupMethod } from './dedupe';

/**
 * Camera expansion — harvest accounting.
 *
 * The dry-run report is the programme's contract with the reader: every
 * inspected record lands in exactly one outcome bucket, and the buckets
 * must reconcile (inspected = Σ outcomes) or the run is not trustworthy.
 * This module is the bookkeeping; tools/harvest-opencctv.ts drives it.
 *
 * Outcome classes (expansion brief, Phase 4): duplicate (by matcher),
 * license-held (CONDITIONAL family, not enabled this run), license-excluded
 * (terms known not to clear — Windy class), invalid (coordinates / feed
 * shape), dead (probe failed or placeholder), verified-new.
 */

export type Outcome =
  | 'verified-new'
  | 'duplicate'
  | 'license-held'
  | 'license-excluded'
  | 'invalid-coordinates'
  | 'invalid-feed'
  | 'dead';

export interface FamilyStats {
  family: string;
  inspected: number;
  verifiedNew: number;
  /** Verified-new records that sit ≤120 m from an existing camera under a
   *  different name — imported as distinct cameras, never merged (brief). */
  nearDistinct: number;
  duplicates: Record<DupMethod, number>;
  intraDuplicates: number;
  licenseHeld: number;
  licenseExcluded: number;
  invalidCoordinates: number;
  invalidFeed: number;
  dead: number;
  placeholder: number;
}

export function emptyFamilyStats(family: string): FamilyStats {
  return {
    family,
    inspected: 0,
    verifiedNew: 0,
    nearDistinct: 0,
    duplicates: { id: 0, 'url-full': 0, 'url-hostpath': 0, 'same-location': 0, 'geo-name': 0 },
    intraDuplicates: 0,
    licenseHeld: 0,
    licenseExcluded: 0,
    invalidCoordinates: 0,
    invalidFeed: 0,
    dead: 0,
    placeholder: 0,
  };
}

export function familyOutcomes(stats: FamilyStats): number {
  const dups = Object.values(stats.duplicates).reduce((a, b) => a + b, 0);
  return (
    stats.verifiedNew +
    dups +
    stats.intraDuplicates +
    stats.licenseHeld +
    stats.licenseExcluded +
    stats.invalidCoordinates +
    stats.invalidFeed +
    stats.dead +
    stats.placeholder
  );
}

export interface HarvestReport {
  generatedAt: string;
  mode: 'dry-run' | 'write';
  harvest: {
    markersTotal: number;
    idsSelected: number;
    recordsFetched: number;
    recordsCached: number;
  };
  baseline: { total: number; source: string };
  families: FamilyStats[];
  totals: FamilyStats;
  /** inspected === outcomes, for the totals row and every family row. */
  reconciles: boolean;
  notes: string[];
}

export function summarizeFamilies(families: FamilyStats[]): FamilyStats {
  const totals = emptyFamilyStats('TOTAL');
  for (const stats of families) {
    totals.inspected += stats.inspected;
    totals.verifiedNew += stats.verifiedNew;
    totals.nearDistinct += stats.nearDistinct;
    totals.intraDuplicates += stats.intraDuplicates;
    totals.licenseHeld += stats.licenseHeld;
    totals.licenseExcluded += stats.licenseExcluded;
    totals.invalidCoordinates += stats.invalidCoordinates;
    totals.invalidFeed += stats.invalidFeed;
    totals.dead += stats.dead;
    totals.placeholder += stats.placeholder;
    for (const method of Object.keys(stats.duplicates) as DupMethod[]) {
      totals.duplicates[method] += stats.duplicates[method];
    }
  }
  return totals;
}

export function reportReconciles(report: HarvestReport): boolean {
  if (familyOutcomes(report.totals) !== report.totals.inspected) return false;
  return report.families.every(stats => familyOutcomes(stats) === stats.inspected);
}
