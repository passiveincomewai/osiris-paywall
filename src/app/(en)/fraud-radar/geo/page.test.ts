import { describe, it, expect, vi, afterEach } from 'vitest';
import FraudRadarGeoPage from './page';

/**
 * Geo page flag gate (§6.6/§14.3): flag off ⇒ notFound (404,
 * indistinguishable from the route not existing).
 */
afterEach(() => vi.unstubAllEnvs());

describe('/fraud-radar/geo — flag gate', () => {
  it('404s while FRAUD_RADAR_ENABLED is off', async () => {
    vi.stubEnv('FRAUD_RADAR_ENABLED', '');
    let thrown: unknown;
    try {
      await FraudRadarGeoPage();
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
