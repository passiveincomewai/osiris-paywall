import type { HarvestReport } from './pipeline';

/**
 * The sync refusal gates (Stage E) — the rules that decide whether a
 * harvest regeneration may replace the committed source. Pure and
 * tested; tools/sync-cameras.ts applies them and the admin dashboard's
 * sync status records their verdict. A refused sync writes NOTHING to
 * the catalogue.
 *
 * The gates assume the wrapper's baseline discipline (baseline captured
 * from a flag-off server, so the report's verifiedNew IS the whole
 * regenerated generation — see tools/sync-cameras.ts header).
 */
export interface SyncGateInput {
  report: HarvestReport;
  /** Records in the currently committed generation. */
  prevOccTotal: number;
  /** Previous run's baseline size, for the partial-baseline guard. */
  prevBaselineTotal: number | null;
  allowShrink: boolean;
  allowGrowth: boolean;
}

export interface SyncGateVerdict {
  ok: boolean;
  reason: string;
}

export function gateReport(input: SyncGateInput): SyncGateVerdict {
  const { report, prevOccTotal, prevBaselineTotal, allowShrink, allowGrowth } = input;

  if (!report.reconciles) {
    return { ok: false, reason: 'the run\'s accounting does not reconcile — nothing was written' };
  }

  const windy = report.families.find(f => f.family === 'windy');
  if (windy && windy.verifiedNew > 0) {
    return {
      ok: false,
      reason: `licensing regression: the Windy family produced ${windy.verifiedNew} verified-new records (it is structurally excluded — a human must review the family registry)`,
    };
  }

  const newTotal = report.totals.verifiedNew;
  if (prevOccTotal > 0 && newTotal < prevOccTotal * 0.95 && !allowShrink) {
    return {
      ok: false,
      reason: `the regenerated set shrinks the harvest from ${prevOccTotal} to ${newTotal} (>5%) — refusing without --allow-shrink; a probe outage or partial run must not wipe the source`,
    };
  }
  if (prevOccTotal > 0 && newTotal > prevOccTotal * 1.5 && !allowGrowth) {
    return {
      ok: false,
      reason: `the regenerated set grows the harvest from ${prevOccTotal} to ${newTotal} (>50%) — refusing without --allow-growth; growth this fast means the baseline or the licensing registry changed`,
    };
  }

  if (
    report.baseline.source.includes('regions pending') &&
    prevBaselineTotal != null &&
    report.baseline.total < prevBaselineTotal * 0.9
  ) {
    return {
      ok: false,
      reason: `the baseline came back partial (${report.baseline.total} cameras vs ${prevBaselineTotal} last run) — dedupe against a partial catalogue manufactures duplicates`,
    };
  }

  return { ok: true, reason: 'reconciles, licensing gates intact, delta within tolerance' };
}
