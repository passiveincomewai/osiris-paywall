import { describe, expect, it } from 'vitest';
import { gateReport } from './sync-gate';
import { emptyFamilyStats, type HarvestReport } from './pipeline';

function report(partial: {
  verifiedNew?: number;
  reconciles?: boolean;
  windyNew?: number;
  baselineTotal?: number;
  baselineSource?: string;
}): HarvestReport {
  const totals = emptyFamilyStats('TOTAL');
  totals.inspected = 137080;
  totals.verifiedNew = partial.verifiedNew ?? 30889;
  const windy = emptyFamilyStats('windy');
  windy.inspected = 14950;
  windy.verifiedNew = partial.windyNew ?? 0;
  windy.licenseExcluded = 14950 - (partial.windyNew ?? 0);
  return {
    generatedAt: '2026-10-19T00:00:00.000Z',
    mode: 'write',
    harvest: { markersTotal: 137080, idsSelected: 137080, recordsFetched: 0, recordsCached: 137080 },
    baseline: {
      total: partial.baselineTotal ?? 40216,
      source: partial.baselineSource ?? 'GET http://localhost:3217/api/cctv?region=all @ fixture',
    },
    families: [windy],
    totals,
    reconciles: partial.reconciles ?? true,
    notes: [],
  };
}

const BASE = { prevOccTotal: 30889, prevBaselineTotal: 40216, allowShrink: false, allowGrowth: false };

describe('gateReport — the sync refusal gates', () => {
  it('passes a reconciled, in-tolerance run', () => {
    const v = gateReport({ report: report({}), ...BASE });
    expect(v.ok).toBe(true);
  });

  it('REFUSES a run whose accounting does not reconcile', () => {
    const v = gateReport({ report: report({ reconciles: false }), ...BASE });
    expect(v.ok).toBe(false);
    expect(v.reason).toContain('does not reconcile');
  });

  it('REFUSES any Windy verified-new (licensing regression)', () => {
    const v = gateReport({ report: report({ windyNew: 5 }), ...BASE });
    expect(v.ok).toBe(false);
    expect(v.reason).toContain('Windy');
  });

  it('REFUSES a >5% shrink without the override, passes with it', () => {
    const shrunk = report({ verifiedNew: 20000 });
    expect(gateReport({ report: shrunk, ...BASE }).ok).toBe(false);
    expect(gateReport({ report: shrunk, ...BASE, allowShrink: true }).ok).toBe(true);
  });

  it('REFUSES a >50% growth without the override, passes with it', () => {
    const grown = report({ verifiedNew: 60000 });
    expect(gateReport({ report: grown, ...BASE }).ok).toBe(false);
    expect(gateReport({ report: grown, ...BASE, allowGrowth: true }).ok).toBe(true);
  });

  it('REFUSES a partial baseline well below the previous run', () => {
    const partial = report({
      baselineTotal: 30000,
      baselineSource: 'GET x @ t (still 9 regions pending — largest answer kept) ∪ audit capture',
    });
    const v = gateReport({ report: partial, ...BASE });
    expect(v.ok).toBe(false);
    expect(v.reason).toContain('partial');
  });

  it('a partial baseline note at full size does not trip the guard', () => {
    const full = report({
      baselineTotal: 40216,
      baselineSource: 'GET x @ t (still 2 regions pending — largest answer kept) ∪ audit capture',
    });
    expect(gateReport({ report: full, ...BASE }).ok).toBe(true);
  });

  it('the C/D idempotency shape (verifiedNew ≈ previous total) passes', () => {
    /* Flag-off baseline ⇒ a re-run regenerates the whole set; verifiedNew
       lands within a few records of the committed total. */
    const v = gateReport({ report: report({ verifiedNew: 30892 }), ...BASE });
    expect(v.ok).toBe(true);
  });
});
