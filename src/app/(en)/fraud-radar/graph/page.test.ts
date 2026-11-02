import { describe, it, expect, vi, afterEach } from 'vitest';
import FraudRadarGraphPage from './page';

/**
 * Graph page flag gate (§6.6/§14.3): flag off ⇒ notFound. The
 * explorer is never a public path (§6.2) — pinned in the
 * isolation suite.
 */
afterEach(() => vi.unstubAllEnvs());

describe('/fraud-radar/graph — flag gate', () => {
  it('404s while FRAUD_RADAR_ENABLED is off', async () => {
    vi.stubEnv('FRAUD_RADAR_ENABLED', '');
    let thrown: unknown;
    try {
      await FraudRadarGraphPage({ searchParams: Promise.resolve({}) });
    } catch (e) {
      thrown = e;
    }
    const digest = (thrown as { digest?: string })?.digest ?? '';
    expect(
      digest === 'NEXT_NOT_FOUND' ||
        digest.startsWith('NEXT_HTTP_ERROR_FALLBACK;404'),
    ).toBe(true);
  });
});
