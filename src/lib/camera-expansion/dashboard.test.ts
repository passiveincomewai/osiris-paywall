import { describe, expect, it } from 'vitest';
import { buildCameraDashboard, summarizeReport, type DashboardInputs } from './dashboard';
import { emptyFamilyStats, type HarvestReport } from './pipeline';

function fixtureReport(mode: 'write' | 'dry-run'): HarvestReport {
  const totals = emptyFamilyStats('TOTAL');
  totals.inspected = 1000;
  totals.verifiedNew = 300;
  totals.nearDistinct = 4;
  totals.duplicates = { id: 10, 'url-full': 100, 'url-hostpath': 5, 'same-location': 40, 'geo-name': 3 };
  totals.intraDuplicates = 12;
  totals.licenseHeld = 200;
  totals.licenseExcluded = 150;
  totals.invalidCoordinates = 1;
  totals.invalidFeed = 60;
  totals.dead = 100;
  totals.placeholder = 19;
  const windy = emptyFamilyStats('windy');
  windy.inspected = 150;
  windy.licenseExcluded = 150;
  return {
    generatedAt: '2026-10-18T21:52:33.863Z',
    mode,
    harvest: { markersTotal: 1000, idsSelected: 1000, recordsFetched: 900, recordsCached: 100 },
    baseline: { total: 40216, source: 'GET http://localhost:3217/api/cctv?region=all @ fixture' },
    families: [windy],
    totals,
    reconciles: true,
    notes: ['fixture note'],
  };
}

const NOW = Date.parse('2026-10-18T23:00:00Z');

function fixtureInputs(): DashboardInputs {
  return {
    now: NOW,
    regions: [
      { region: 'uk', served: 890, baseline: 900, obs: null },
      { region: 'canada', served: 2100, baseline: 2100, obs: null },
      { region: 'faa', served: 3528, baseline: 3528, obs: null },
      { region: 'occ-europe', served: 2948, baseline: null, obs: null },
    ],
    labels: [
      { label: 'TfL', current: 890, baseline: 900 },
      { label: 'DriveBC', current: 0, baseline: 1067 },
      { label: 'WSDOT', current: 0, baseline: 500 },
    ],
    alert: { served: 1285, obs: null },
    occEnabled: true,
    harvestHealth: {
      generatedAt: '2026-10-18T22:00:00Z',
      shards: {
        'occ-europe': {
          records: 2948,
          verifiedProbedAt: Array.from({ length: 2900 }, () => Math.floor(NOW / 1000) - 3600),
          unverified: 48,
        },
      },
      oldest: [{ id: 'occ-x-1', shard: 'occ-europe', probedAt: '2026-10-18T20:00:00.000Z' }],
    },
    latestWriteReport: fixtureReport('write'),
    latestDryRunReport: null,
    syncStatus: null,
  };
}

describe('summarizeReport', () => {
  it('flattens the totals row and sums duplicates across methods', () => {
    const s = summarizeReport(fixtureReport('write'));
    expect(s.verifiedNew).toBe(300);
    expect(s.duplicatesTotal).toBe(158);
    expect(s.duplicatesByMethod['url-full']).toBe(100);
    expect(s.licenseHeld).toBe(200);
    expect(s.licenseExcluded).toBe(150);
    expect(s.reconciles).toBe(true);
    expect(s.baselineTotal).toBe(40216);
  });
});

describe('buildCameraDashboard', () => {
  it('totals come from the region inputs, with the harvest broken out', () => {
    const d = buildCameraDashboard(fixtureInputs());
    expect(d.totals.catalogue).toBe(890 + 2100 + 3528 + 2948);
    expect(d.totals.occ).toBe(2948);
    expect(d.totals.nonHarvest).toBe(890 + 2100 + 3528);
    expect(d.totals.faa).toBe(3528);
    expect(d.totals.alert).toBe(1285);
    expect(d.totals.occByShard['occ-europe']).toBe(2948);
  });

  it('the rollup surfaces DriveBC-style silent absence as down and WSDOT as gated', () => {
    const d = buildCameraDashboard(fixtureInputs());
    const drivebc = d.health.sources.find(s => s.id === 'label:DriveBC');
    expect(drivebc?.status).toBe('down');
    const wsdot = d.health.sources.find(s => s.id === 'label:WSDOT');
    expect(wsdot?.status).toBe('gated');
    expect(d.health.rollup.down).toBeGreaterThanOrEqual(1);
    expect(d.health.rollup.gated).toBe(1);
    expect(d.health.rollup.total).toBe(d.health.sources.length);
  });

  it('problem sources sort ahead of healthy ones', () => {
    const d = buildCameraDashboard(fixtureInputs());
    const firstNonHealthy = d.health.sources.findIndex(s => s.status === 'healthy');
    const downs = d.health.sources.filter(s => s.status === 'down');
    for (const down of downs) {
      expect(d.health.sources.indexOf(down)).toBeLessThan(firstNonHealthy === -1 ? Infinity : firstNonHealthy);
    }
  });

  it('harvest staleness aggregates the per-camera verdict ages', () => {
    const d = buildCameraDashboard(fixtureInputs());
    expect(d.harvestStaleness?.total).toBe(2948);
    expect(d.harvestStaleness?.withVerdict).toBe(2900);
    expect(d.harvestStaleness?.fresh).toBe(2900);
    expect(d.oldestVerifications[0]?.id).toBe('occ-x-1');
  });

  it('carries the latest write report summary through', () => {
    const d = buildCameraDashboard(fixtureInputs());
    expect(d.latestWrite?.verifiedNew).toBe(300);
    expect(d.latestDryRun).toBeNull();
    expect(d.sync).toBeNull();
  });

  it('stays honest with no artifacts and a cold catalogue', () => {
    const inputs = fixtureInputs();
    inputs.harvestHealth = null;
    inputs.latestWriteReport = null;
    inputs.regions = [{ region: 'uk', served: 0, baseline: null, obs: null }];
    inputs.labels = [];
    const d = buildCameraDashboard(inputs);
    expect(d.totals.catalogue).toBe(0);
    expect(d.latestWrite).toBeNull();
    expect(d.harvestStaleness).toBeNull();
    expect(d.health.sources.find(s => s.id === 'uk')?.status).toBe('unknown');
  });
});
