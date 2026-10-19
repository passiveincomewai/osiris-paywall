import { describe, expect, it } from 'vitest';
import type { SourceObservation } from '../sourceCache';
import {
  classifyHarvestShard,
  classifyLabelSource,
  classifyObservedSource,
  harvestStaleness,
  rollup,
} from './health';

function obs(partial: Partial<SourceObservation>): SourceObservation {
  return {
    key: 'cctv:test', attempts: 0, successes: 0, failures: 0, empties: 0,
    lastAttemptAt: null, lastSuccessAt: null, lastFailureAt: null,
    lastError: null, lastCount: null, highWaterCount: 0, seededCount: 0,
    ...partial,
  };
}

describe('classifyObservedSource', () => {
  it('healthy when serving and fetches succeed', () => {
    const h = classifyObservedSource({
      id: 'uk', label: 'uk', kind: 'region', served: 890, baseline: 900,
      obs: obs({ attempts: 3, successes: 3, lastSuccessAt: 1000, highWaterCount: 900 }),
    });
    expect(h.status).toBe('healthy');
    expect(h.expected).toBe(900);
  });

  it('degraded when serving stale after a failed refresh', () => {
    const h = classifyObservedSource({
      id: 'uk', label: 'uk', kind: 'region', served: 890, baseline: null,
      obs: obs({ attempts: 2, successes: 1, failures: 1, lastSuccessAt: 1000, lastFailureAt: 2000, lastError: 'timeout' }),
    });
    expect(h.status).toBe('degraded');
    expect(h.reason).toContain('cached');
  });

  it('degraded on a large drop against baseline', () => {
    const h = classifyObservedSource({
      id: 'canada', label: 'canada', kind: 'region', served: 400, baseline: 2000,
      obs: obs({ attempts: 1, successes: 1, lastSuccessAt: 1000, highWaterCount: 2000 }),
    });
    expect(h.status).toBe('degraded');
  });

  it('DOWN on silent absence: baseline has cameras, source serves zero', () => {
    const h = classifyObservedSource({
      id: 'canada', label: 'canada', kind: 'region', served: 0, baseline: 1067,
      obs: obs({ attempts: 2, successes: 2, lastSuccessAt: 2000, highWaterCount: 1067 }),
    });
    expect(h.status).toBe('down');
    expect(h.reason).toContain('Silent absence');
  });

  it('DOWN on silent absence via high-water mark alone (no snapshot)', () => {
    const h = classifyObservedSource({
      id: 'faa', label: 'faa', kind: 'region', served: 0, baseline: null,
      obs: obs({ attempts: 4, successes: 1, empties: 3, lastSuccessAt: 1000, highWaterCount: 3528 }),
    });
    expect(h.status).toBe('down');
  });

  it('down when fetches fail with nothing cached', () => {
    const h = classifyObservedSource({
      id: 'faa', label: 'faa', kind: 'region', served: 0, baseline: null,
      obs: obs({ attempts: 2, failures: 2, lastFailureAt: 2000, lastError: 'HTTP 401' }),
    });
    expect(h.status).toBe('down');
    expect(h.lastError).toBe('HTTP 401');
  });

  it('degraded (not down) for a successful empty fetch with no baseline', () => {
    const h = classifyObservedSource({
      id: 'new', label: 'new', kind: 'region', served: 0, baseline: null,
      obs: obs({ attempts: 1, empties: 1, lastCount: 0 }),
    });
    expect(h.status).toBe('degraded');
  });

  it('unknown when never loaded on this instance', () => {
    const h = classifyObservedSource({
      id: 'new', label: 'new', kind: 'region', served: 0, baseline: null, obs: null,
    });
    expect(h.status).toBe('unknown');
  });

  it('healthy from a snapshot restore before any fetch', () => {
    const h = classifyObservedSource({
      id: 'uk', label: 'uk', kind: 'region', served: 890, baseline: 890,
      obs: obs({ seededCount: 890, lastCount: 890, highWaterCount: 890 }),
    });
    expect(h.status).toBe('healthy');
    expect(h.reason).toContain('saved catalogue');
  });
});

describe('classifyLabelSource (sub-sources inside composite regions)', () => {
  it('DOWN on DriveBC-style silent absence', () => {
    const h = classifyLabelSource({ label: 'DriveBC', current: 0, baseline: 1067 });
    expect(h.status).toBe('down');
    expect(h.reason).toContain('Silent absence');
  });

  it('degraded on a halved label count', () => {
    const h = classifyLabelSource({ label: 'Caltrans', current: 900, baseline: 2936 });
    expect(h.status).toBe('degraded');
  });

  it('healthy when the label holds its baseline', () => {
    const h = classifyLabelSource({ label: 'TfL', current: 890, baseline: 900 });
    expect(h.status).toBe('healthy');
  });

  it('reports the intentionally gated WSDOT fetcher as gated, not down', () => {
    const h = classifyLabelSource({ label: 'WSDOT', current: 0, baseline: 500 });
    expect(h.status).toBe('gated');
    expect(h.reason).toContain('404');
  });

  it('unknown when absent with no baseline', () => {
    const h = classifyLabelSource({ label: 'NewFeed', current: 0, baseline: null });
    expect(h.status).toBe('unknown');
  });
});

describe('harvest staleness', () => {
  const now = Date.parse('2026-10-18T00:00:00Z');
  const daysAgo = (d: number) => Math.floor((now - d * 86_400_000) / 1000);

  it('buckets probe ages into fresh / aging / stale / unknown', () => {
    const s = harvestStaleness(
      [daysAgo(1), daysAgo(10), daysAgo(60), null],
      [true, true, false, false],
      now,
    );
    expect(s.total).toBe(4);
    expect(s.fresh).toBe(1);
    expect(s.aging).toBe(1);
    expect(s.stale).toBe(1);
    expect(s.unknownAge).toBe(1);
    expect(s.withVerdict).toBe(3);
    expect(s.aliveAtVerification).toBe(2);
    expect(s.newestProbedAt).toBe('2026-10-17T00:00:00.000Z');
    expect(s.oldestProbedAt).toBe('2026-08-19T00:00:00.000Z');
  });

  it('shard reads healthy when freshly verified, degraded when mostly stale', () => {
    const freshSet = harvestStaleness([daysAgo(0), daysAgo(2)], [true, true], now);
    expect(classifyHarvestShard({ shard: 'europe', staleness: freshSet }).status).toBe('healthy');
    const staleSet = harvestStaleness(
      Array.from({ length: 10 }, () => daysAgo(90)),
      Array.from({ length: 10 }, () => true),
      now,
    );
    const h = classifyHarvestShard({ shard: 'europe', staleness: staleSet });
    expect(h.status).toBe('degraded');
    expect(h.reason).toContain('sync is overdue');
  });
});

describe('rollup', () => {
  it('counts every status', () => {
    const sources = [
      classifyLabelSource({ label: 'TfL', current: 10, baseline: 10 }),
      classifyLabelSource({ label: 'DriveBC', current: 0, baseline: 10 }),
      classifyLabelSource({ label: 'WSDOT', current: 0, baseline: 10 }),
      classifyLabelSource({ label: 'NewFeed', current: 0, baseline: null }),
    ];
    const r = rollup(sources);
    expect(r).toEqual({ healthy: 1, degraded: 0, down: 1, unknown: 1, gated: 1, total: 4 });
  });
});
