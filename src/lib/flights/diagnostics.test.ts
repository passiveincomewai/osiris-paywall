import { describe, expect, it } from 'vitest';
import { classifyDropReason, deriveFlightCoverage, REGIONS_TOTAL, type FlightsPayload } from './diagnostics';
import { REGIONS } from '@/app/api/flights/route';

describe('classifyDropReason', () => {
  it('drops tower pseudo-records', () => {
    expect(classifyDropReason({ t: 'TWR', lat: 1, lon: 2 })).toBe('tower');
    expect(classifyDropReason({ t: 'twr', lat: 1, lon: 2 })).toBe('tower');
  });

  it('drops records with no position', () => {
    expect(classifyDropReason({ t: 'B738', lat: null, lon: 2 })).toBe('no-position');
    expect(classifyDropReason({ t: 'B738', lat: 1, lon: undefined })).toBe('no-position');
    expect(classifyDropReason({ t: 'B738' })).toBe('no-position');
  });

  it('keeps positionable aircraft — including lat/lon of exactly 0', () => {
    expect(classifyDropReason({ t: 'B738', lat: 0, lon: 0 })).toBeNull();
    expect(classifyDropReason({ t: 'A359', lat: 51.4, lon: -0.5 })).toBeNull();
  });

  it('checks tower before position, matching the classifier', () => {
    expect(classifyDropReason({ t: 'TWR', lat: null, lon: null })).toBe('tower');
  });
});

const NOW = Date.parse('2026-10-18T09:00:00.000Z');

function flights(n: number): unknown[] {
  return Array.from({ length: n }, () => ({}));
}

describe('deriveFlightCoverage — regional mode (production steady state)', () => {
  const payload: FlightsPayload = {
    total: 3759,
    source: 'regional',
    timestamp: '2026-10-18T08:59:30.000Z',
    commercial_flights: flights(3040),
    private_flights: flights(486),
    private_jets: flights(96),
    military_flights: flights(125),
    providers: {
      adsbfi_mil: 105,
      adsbfi_regional: 3747,
      adsbfi_regions: 33,
      adsbfi_regional_age_s: 42,
      opensky: 0,
      opensky_auth: false,
      opensky_age_s: null,
    },
    diagnostics: { dropped_invalid: 12, dropped_stale: null },
  };
  const vm = deriveFlightCoverage(payload, NOW);

  it('reconciles received = classified + dropped invalid', () => {
    expect(vm.classified).toBe(3747);
    expect(vm.received).toBe(3759);
    expect(vm.received).toBe(vm.classified + (vm.droppedInvalid ?? 0));
  });

  it('rendered == classified (the 1:1 client property)', () => {
    expect(vm.rendered).toBe(vm.classified);
  });

  it('reports dropped stale as not measured (null), never zero', () => {
    expect(vm.droppedStale).toBeNull();
  });

  it('classifies the source and update age', () => {
    expect(vm.sourceKind).toBe('regional');
    expect(vm.servingStale).toBe(false);
    expect(vm.lastUpdateAgeSec).toBe(30);
  });

  it('flags OpenSky anonymous + empty as a warning state', () => {
    const os = vm.providers.find((r) => r.key === 'opensky')!;
    expect(os.state).toBe('warning');
    expect(os.count).toBe(0);
    expect(os.detail).toContain('opensky_auth: false');
    expect(vm.warnings.some((w) => w.includes('OpenSky'))).toBe(true);
  });

  it('marks the sweep active in regional mode and notes partial regions', () => {
    const reg = vm.providers.find((r) => r.key === 'adsbfi_regional')!;
    expect(reg.state).toBe('ok');
    expect(reg.detail).toContain('33/40');
    expect(vm.warnings.some((w) => w.includes('33/40'))).toBe(true);
  });
});

describe('deriveFlightCoverage — OpenSky snapshot mode', () => {
  const vm = deriveFlightCoverage(
    {
      total: 6604,
      source: 'opensky-anon',
      timestamp: '2026-10-18T08:59:00.000Z',
      commercial_flights: flights(5905),
      private_flights: flights(540),
      private_jets: flights(96),
      military_flights: flights(63),
      providers: {
        adsbfi_mil: 63,
        adsbfi_regional: 0,
        adsbfi_regions: 0,
        adsbfi_regional_age_s: null,
        opensky: 6618,
        opensky_auth: false,
        opensky_age_s: 12,
      },
      diagnostics: { dropped_invalid: 0, dropped_stale: null },
    },
    NOW,
  );

  it('snapshot kind, sweep idle, no OpenSky warning', () => {
    expect(vm.sourceKind).toBe('snapshot');
    expect(vm.providers.find((r) => r.key === 'opensky')!.state).toBe('ok');
    expect(vm.providers.find((r) => r.key === 'adsbfi_regional')!.state).toBe('idle');
    expect(vm.warnings).toHaveLength(0);
    expect(vm.received).toBe(6604);
  });
});

describe('deriveFlightCoverage — stale fallback + missing diagnostics', () => {
  const vm = deriveFlightCoverage(
    {
      total: 50,
      source: 'regional+stale',
      timestamp: 'not-a-date',
      commercial_flights: flights(40),
      private_flights: flights(10),
      private_jets: [],
      military_flights: [],
      providers: { opensky: 0, opensky_auth: true },
      // no diagnostics field at all (older payload shape)
    },
    NOW,
  );

  it('surfaces the stale fallback and low coverage honestly', () => {
    expect(vm.servingStale).toBe(true);
    expect(vm.warnings.some((w) => w.includes('+stale'))).toBe(true);
    expect(vm.warnings.some((w) => w.includes('50'))).toBe(true);
    expect(vm.warnings.some((w) => w.includes('despite configured credentials'))).toBe(true);
  });

  it('absent counters stay null (unknown), unparseable time stays null', () => {
    expect(vm.droppedInvalid).toBeNull();
    expect(vm.droppedStale).toBeNull();
    expect(vm.lastUpdateIso).toBeNull();
    expect(vm.lastUpdateAgeSec).toBeNull();
    // received falls back to classified when total is unusable… total=50 here is usable:
    expect(vm.received).toBe(50);
  });
});

describe('REGIONS_TOTAL drift pin', () => {
  it('equals the real REGIONS array length in the flights route', () => {
    // diagnostics.ts cannot import the route (the route imports it), so
    // the pin lives here where both modules can be imported.
    expect(REGIONS_TOTAL).toBe(REGIONS.length);
  });
});
