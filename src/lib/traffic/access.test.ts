import { beforeEach, describe, expect, it, vi } from 'vitest';
import { auth } from '@/auth';
import { requestHasTrafficAccess, trafficAccessForSession, trafficAccessForStatus } from './access';

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

describe('trafficAccessForSession — team grant layering (Workstream H)', () => {
  it('own-active passes, unchanged (even with a stale free planTier claim)', () => {
    expect(trafficAccessForSession({ user: { subscriptionStatus: 'active' } })).toBe(true);
    expect(trafficAccessForSession({ user: { subscriptionStatus: 'active', planTier: 'free' } })).toBe(true);
  });

  it('granted member passes: own status inactive + effective planTier pro', () => {
    expect(trafficAccessForSession({ user: { subscriptionStatus: 'none', planTier: 'pro' } })).toBe(true);
    expect(trafficAccessForSession({ user: { subscriptionStatus: 'canceled', planTier: 'pro' } })).toBe(true);
  });

  it('granted VIP passes (vip satisfies pro)', () => {
    expect(trafficAccessForSession({ user: { subscriptionStatus: 'none', planTier: 'vip' } })).toBe(true);
  });

  it('free still fails: inactive status with planTier free or absent (legacy)', () => {
    expect(trafficAccessForSession({ user: { subscriptionStatus: 'none', planTier: 'free' } })).toBe(false);
    expect(trafficAccessForSession({ user: { subscriptionStatus: 'none' } })).toBe(false);
    expect(trafficAccessForSession({ user: {} })).toBe(false);
    expect(trafficAccessForSession(null)).toBe(false);
    expect(trafficAccessForSession(undefined)).toBe(false);
  });

  it('an invalid planTier claim falls back to the status alone', () => {
    expect(trafficAccessForSession({ user: { subscriptionStatus: 'none', planTier: 'gold' } })).toBe(false);
    expect(trafficAccessForSession({ user: { subscriptionStatus: 'active', planTier: 'gold' } })).toBe(true);
  });

  it('fail-soft: a planTier read that throws falls back to the status-only result', () => {
    const throwingTier = (subscriptionStatus: string) => ({
      user: {
        subscriptionStatus,
        get planTier(): string {
          throw new Error('claim read failed');
        },
      },
    });
    expect(trafficAccessForSession(throwingTier('none') as any)).toBe(false);
    expect(trafficAccessForSession(throwingTier('active') as any)).toBe(true);
  });
});

describe('requestHasTrafficAccess', () => {
  it('grants a signed-in subscriber', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', subscriptionStatus: 'active' } } as any);
    await expect(requestHasTrafficAccess()).resolves.toBe(true);
  });

  it('grants a team-granted member (own status inactive, effective planTier pro/vip)', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', subscriptionStatus: 'none', planTier: 'pro' } } as any);
    await expect(requestHasTrafficAccess()).resolves.toBe(true);
    mockAuth.mockResolvedValue({ user: { id: 'u1', subscriptionStatus: 'none', planTier: 'vip' } } as any);
    await expect(requestHasTrafficAccess()).resolves.toBe(true);
  });

  it('denies a free member (inactive status, planTier free)', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', subscriptionStatus: 'none', planTier: 'free' } } as any);
    await expect(requestHasTrafficAccess()).resolves.toBe(false);
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
