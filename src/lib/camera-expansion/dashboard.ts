import {
  classifyHarvestShard,
  classifyLabelSource,
  classifyObservedSource,
  harvestStaleness,
  rollup,
  type HealthRollup,
  type SourceHealth,
} from './health';
import type { SourceObservation } from '../sourceCache';
import type { HarvestReport } from './pipeline';

/**
 * Camera Network dashboard — data shaping (Stage E).
 *
 * Pure functions from observed inputs to the admin view model, so the
 * numbers on the page are exactly the numbers the tests pin down. The
 * runtime collector (dashboard-server.ts) gathers the inputs from the
 * live catalogue cache, the saved catalogue, and the committed sync
 * artifacts; nothing here fetches, guesses, or fills in a plausible
 * number where a real one is missing — absent inputs render as absent.
 */

export interface RegionInput {
  region: string;
  served: number;
  /** Saved-catalogue count for this region, when a snapshot exists. */
  baseline: number | null;
  obs: SourceObservation | null;
}

export interface LabelInput {
  label: string;
  current: number;
  baseline: number | null;
}

export interface HarvestHealthShard {
  records: number;
  /** probedAt (epoch seconds) for every camera with an alive verdict. */
  verifiedProbedAt: number[];
  /** Cameras with no alive verdict found in the probe cache. */
  unverified: number;
}

export interface HarvestHealthArtifact {
  generatedAt: string;
  shards: Record<string, HarvestHealthShard>;
  oldest: { id: string; shard: string; probedAt: string }[];
}

export interface SyncStatus {
  lastRunAt: string;
  mode: 'write' | 'dry-run';
  verdict: 'ok' | 'refused' | 'failed';
  detail: string;
  counts: {
    inspected: number;
    verifiedNew: number;
    duplicates: number;
    intraDuplicates: number;
    licenseHeld: number;
    licenseExcluded: number;
    invalidFeed: number;
    invalidCoordinates: number;
    dead: number;
    placeholder: number;
    reconciles: boolean;
  } | null;
  baselineTotal: number | null;
  /** How the baseline was captured ('flag-off' for sync-wrapper runs).
   *  The partial-baseline gate only compares like with like: a baseline
   *  from a flag-on server (~71k, harvest included) and one from a
   *  flag-off server (~40k) are different quantities. */
  baselineDiscipline?: string;
  occTotalAfter: number | null;
  reportFile: string | null;
  requestSatisfiedAt: string | null;
}

export interface DashboardInputs {
  now: number;
  regions: RegionInput[];
  labels: LabelInput[];
  alert: { served: number; obs: SourceObservation | null };
  occEnabled: boolean;
  harvestHealth: HarvestHealthArtifact | null;
  latestWriteReport: HarvestReport | null;
  latestDryRunReport: HarvestReport | null;
  syncStatus: SyncStatus | null;
}

export interface ReportSummary {
  generatedAt: string;
  mode: string;
  baselineTotal: number;
  baselineSource: string;
  inspected: number;
  verifiedNew: number;
  nearDistinct: number;
  duplicatesByMethod: Record<string, number>;
  duplicatesTotal: number;
  intraDuplicates: number;
  licenseHeld: number;
  licenseExcluded: number;
  invalidCoordinates: number;
  invalidFeed: number;
  dead: number;
  placeholder: number;
  reconciles: boolean;
  notes: string[];
}

export function summarizeReport(report: HarvestReport): ReportSummary {
  const t = report.totals;
  const duplicatesByMethod = { ...t.duplicates };
  return {
    generatedAt: report.generatedAt,
    mode: report.mode,
    baselineTotal: report.baseline.total,
    baselineSource: report.baseline.source,
    inspected: t.inspected,
    verifiedNew: t.verifiedNew,
    nearDistinct: t.nearDistinct,
    duplicatesByMethod,
    duplicatesTotal: Object.values(duplicatesByMethod).reduce((a, b) => a + b, 0),
    intraDuplicates: t.intraDuplicates,
    licenseHeld: t.licenseHeld,
    licenseExcluded: t.licenseExcluded,
    invalidCoordinates: t.invalidCoordinates,
    invalidFeed: t.invalidFeed,
    dead: t.dead,
    placeholder: t.placeholder,
    reconciles: report.reconciles,
    notes: report.notes ?? [],
  };
}

export interface CameraDashboardData {
  generatedAt: string;
  totals: {
    catalogue: number;
    regions: number;
    /** Cameras from sources other than the occ harvest. */
    nonHarvest: number;
    occ: number;
    occByShard: Record<string, number>;
    faa: number;
    alert: number;
  };
  health: {
    rollup: HealthRollup;
    sources: SourceHealth[];
  };
  harvestStaleness: ReturnType<typeof harvestStaleness> | null;
  latestWrite: ReportSummary | null;
  latestDryRun: ReportSummary | null;
  sync: SyncStatus | null;
  oldestVerifications: { id: string; shard: string; probedAt: string }[];
}

export function buildCameraDashboard(inputs: DashboardInputs): CameraDashboardData {
  const sources: SourceHealth[] = [];

  for (const r of inputs.regions) {
    if (r.region.startsWith('occ-')) continue; // shards classified below, from probe age
    sources.push(classifyObservedSource({
      id: r.region, label: r.region, kind: 'region',
      served: r.served, baseline: r.baseline, obs: r.obs,
    }));
  }

  sources.push(classifyObservedSource({
    id: 'alert-cameras', label: 'ALERT cameras (ALERTCalifornia / ALERTWest)', kind: 'alert',
    served: inputs.alert.served, baseline: null, obs: inputs.alert.obs,
  }));

  /* Harvest shards: static generated data — health is verification age. */
  const occByShard: Record<string, number> = {};
  let occTotal = 0;
  const allProbed: (number | null)[] = [];
  const allAlive: boolean[] = [];
  if (inputs.harvestHealth) {
    for (const [shard, data] of Object.entries(inputs.harvestHealth.shards)) {
      occByShard[shard] = data.records;
      occTotal += data.records;
      const probed: (number | null)[] = [
        ...data.verifiedProbedAt,
        ...Array<number | null>(data.unverified).fill(null),
      ];
      const alive = [
        ...data.verifiedProbedAt.map(() => true),
        ...Array<boolean>(data.unverified).fill(false),
      ];
      allProbed.push(...probed);
      allAlive.push(...alive);
      sources.push(classifyHarvestShard({ shard, staleness: harvestStaleness(probed, alive, inputs.now) }));
    }
  } else {
    for (const r of inputs.regions) {
      if (!r.region.startsWith('occ-')) continue;
      occByShard[r.region] = r.served;
      occTotal += r.served;
      sources.push({
        id: `occ:${r.region}`, label: `OpenCCTV harvest — ${r.region}`, kind: 'occ-shard',
        status: r.served > 0 ? 'unknown' : 'unknown',
        served: r.served, expected: null, lastSuccessAt: null, lastFailureAt: null,
        lastError: null,
        reason: 'No harvest-health artifact committed yet — verification ages unavailable.',
      });
    }
  }

  /* Feed labels inside composite regions — the silent-absence surface. */
  for (const l of inputs.labels) {
    if (l.baseline == null && l.current === 0) continue;
    sources.push(classifyLabelSource(l));
  }

  const catalogue = inputs.regions.reduce((n, r) => n + r.served, 0);
  const faa = inputs.regions.find(r => r.region === 'faa')?.served ?? 0;

  sources.sort((a, b) => {
    const rank: Record<SourceHealth['status'], number> = { down: 0, degraded: 1, gated: 2, unknown: 3, healthy: 4 };
    return rank[a.status] - rank[b.status] || b.served - a.served || a.label.localeCompare(b.label);
  });

  return {
    generatedAt: new Date(inputs.now).toISOString(),
    totals: {
      catalogue,
      regions: inputs.regions.length,
      nonHarvest: catalogue - occTotal,
      occ: occTotal,
      occByShard,
      faa,
      alert: inputs.alert.served,
    },
    health: { rollup: rollup(sources), sources },
    harvestStaleness: inputs.harvestHealth ? harvestStaleness(allProbed, allAlive, inputs.now) : null,
    latestWrite: inputs.latestWriteReport ? summarizeReport(inputs.latestWriteReport) : null,
    latestDryRun: inputs.latestDryRunReport ? summarizeReport(inputs.latestDryRunReport) : null,
    sync: inputs.syncStatus,
    oldestVerifications: inputs.harvestHealth?.oldest ?? [],
  };
}
