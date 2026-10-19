import { beforeEach, describe, expect, it, vi } from 'vitest';
import { auth } from '@/auth';
import { requestHasTrafficAccess, trafficAccessForStatus } from './access';

vi.mock('@/auth', () => ({ auth: vi.fn() }));

const mockAuth = vi.mocked(auth);

beforeEach(() => {
  vi.resetAllMocks();
});

describe('trafficAccessForStatus', () => {
  it('grants only the resolved active status', () => {
    // resolveSubscriptionStatus folds paid, trialing and comp into
    // 'active' before it reaches the session — that is the one grant.
    expect(trafficAccessForStatus('active')).toBe(true);
  });

  it('denies every non-active state', () => {
    for (const status of ['none', 'past_due', 'canceled', 'expired', 'trialing', '', null, undefined]) {
      expect(trafficAccessForStatus(status)).toBe(false);
    }
  });
});

describe('requestHasTrafficAccess', () => {
  it('grants a signed-in subscriber', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', subscriptionStatus: 'active' } } as any);
    await expect(requestHasTrafficAccess()).resolves.toBe(true);
  });

  it('denies a signed-in non-subscriber', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', subscriptionStatus: 'none' } } as any);
    await expect(requestHasTrafficAccess()).resolves.toBe(false);
  });

  it('denies a signed-out request (no session)', async () => {
    mockAuth.mockResolvedValue(null as any);
    await expect(requestHasTrafficAccess()).resolves.toBe(false);
  });

  it('denies when the session cannot be read at all', async () => {
    mockAuth.mockRejectedValue(new Error('auth unavailable'));
    await expect(requestHasTrafficAccess()).resolves.toBe(false);
  });
});
