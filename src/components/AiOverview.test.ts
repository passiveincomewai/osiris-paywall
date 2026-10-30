import { describe, it, expect } from 'vitest';
import { overviewFailureFor } from './AiOverview';

/**
 * The middleware answers plan-gated layers with 402 + a JSON error code
 * ({ error: 'premium_required' | 'vip_required' }); the panel must turn
 * that into the lock + upgrade state, never a raw "HTTP 402" string.
 */
describe('overviewFailureFor', () => {
  it('maps a premium_required 402 to the Pro lock', () => {
    expect(overviewFailureFor(402, { error: 'premium_required' })).toEqual({ kind: 'locked', tier: 'pro' });
  });

  it('maps a vip_required 402 to the VIP lock', () => {
    expect(overviewFailureFor(402, { error: 'vip_required' })).toEqual({ kind: 'locked', tier: 'vip' });
  });

  it('maps a bare 402 (no/unparsable body) to the Pro lock', () => {
    expect(overviewFailureFor(402, null)).toEqual({ kind: 'locked', tier: 'pro' });
    expect(overviewFailureFor(402, undefined)).toEqual({ kind: 'locked', tier: 'pro' });
    expect(overviewFailureFor(402, 'Payment Required')).toEqual({ kind: 'locked', tier: 'pro' });
  });

  it('maps 429 (the route rate limit) to the busy state', () => {
    expect(overviewFailureFor(429, { error: 'Rate limit exceeded' })).toEqual({ kind: 'busy' });
  });

  it('maps anything else to unavailable — no status leaks to the UI', () => {
    expect(overviewFailureFor(500, { error: 'boom' })).toEqual({ kind: 'unavailable' });
    expect(overviewFailureFor(502, null)).toEqual({ kind: 'unavailable' });
    expect(overviewFailureFor(401, null)).toEqual({ kind: 'unavailable' });
  });
});
