import { getSourceObservations, peekSource } from '../sourceCache';
import { readSnapshot } from '../cctv-snapshot';
import { cctvCatalogueState } from '@/app/api/cctv/route';
import {
  buildCameraDashboard,
  type CameraDashboardData,
  type DashboardInputs,
  type HarvestHealthArtifact,
  type SyncStatus,
} from './dashboard';
import type { HarvestReport } from './pipeline';
import latestWriteJson from './reports/harvest-latest-write.json';
import latestDryRunJson from './reports/harvest-latest-dry-run.json';
import syncStatusJson from './sync-status.json';
import harvestHealthJson from './harvest-health.json';

/**
 * Camera Network dashboard — runtime collector (Stage E).
 *
 * Gathers the dashboard's inputs from what this process actually holds:
 * the catalogue cache (via the cctv route's own state export), the
 * source cache's observation registry, the saved catalogue on disk (the
 * baseline expectations), and the committed sync artifacts. Read-only —
 * collecting never triggers an upstream fetch; a cold instance honestly
 * reports sources as not-yet-loaded rather than inventing numbers.
 *
 * Scope, same as Flight Coverage: this describes the CURRENT instance's
 * catalogue, not a fleet-wide time series.
 */
export async function collectCameraDashboard(): Promise<CameraDashboardData> {
  const state = cctvCatalogueState();
  const observations = new Map(getSourceObservations().map(o => [o.key, o]));
  const snapshot = await readSnapshot().catch(() => null);

  const baselineRegions = new Map<string, number>();
  const baselineLabels = new Map<string, number>();
  if (snapshot) {
    for (const [region, cameras] of Object.entries(snapshot.regions)) {
      baselineRegions.set(region, cameras.length);
      for (const camera of cameras) {
        const label = String((camera as { source?: unknown }).source ?? 'unknown');
        baselineLabels.set(label, (baselineLabels.get(label) ?? 0) + 1);
      }
    }
  }

  const inputs: DashboardInputs = {
    now: Date.now(),
    regions: state.regions.map(r => ({
      region: r.region,
      served: r.served,
      baseline: baselineRegions.get(r.region) ?? null,
      obs: observations.get(`cctv:${r.region}`) ?? null,
    })),
    labels: [...new Set([...Object.keys(state.labels), ...baselineLabels.keys()])].map(label => ({
      label,
      current: state.labels[label] ?? 0,
      baseline: baselineLabels.get(label) ?? null,
    })),
    alert: {
      served: peekSource<unknown>('alertwest-cameras', true)?.length ?? 0,
      obs: observations.get('alertwest-cameras') ?? null,
    },
    occEnabled: state.occHarvestEnabled,
    harvestHealth: harvestHealthJson as HarvestHealthArtifact,
    latestWriteReport: latestWriteJson as unknown as HarvestReport,
    latestDryRunReport: latestDryRunJson as unknown as HarvestReport,
    syncStatus: syncStatusJson as SyncStatus,
  };
  return buildCameraDashboard(inputs);
}
