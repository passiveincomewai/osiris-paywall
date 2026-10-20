/**
 * The site-key decision matrix: who pays for an OI call, and when the
 * site's OpenAI key may stand in for a key of the visitor's own.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

const authMocks = vi.hoisted(() => ({ auth: vi.fn() }));
vi.mock('@/auth', () => ({ auth: authMocks.auth }));

import { applyKeyDecision, decideKeyUse, isActiveSubscription, resolveRouteKey, siteAiKey, siteAiModel, siteKeyHourLimited } from './server-key';
import type { Credentials } from './service';

const SITE = { signedIn: true, key: 'sk-site-key', model: 'gpt-5-mini' };
const NO_KEY: Credentials = {};
const OPENAI: Credentials = { provider: 'openai' };

afterEach(() => { vi.unstubAllEnvs(); });

describe('decideKeyUse', () => {
  it('a caller key always wins, signed in or out, site key or not', () => {
    const withKey: Credentials = { provider: 'openai', key: 'sk-theirs' };
    expect(decideKeyUse(withKey, SITE)).toEqual({ kind: 'byok' });
    expect(decideKeyUse(withKey, { ...SITE, signedIn: false })).toEqual({ kind: 'byok' });
    expect(decideKeyUse(withKey, { ...SITE, key: null })).toEqual({ kind: 'byok' });
    expect(decideKeyUse({ provider: 'anthropic', key: 'sk-ant-theirs' }, SITE)).toEqual({ kind: 'byok' });
  });

  it('another provider without a key is left to the downstream answer', () => {
    expect(decideKeyUse({ provider: 'anthropic' }, SITE)).toEqual({ kind: 'passthrough' });
    expect(decideKeyUse({ provider: 'anthropic' }, { ...SITE, key: null })).toEqual({ kind: 'passthrough' });
    // The scripted demo needs no key at all.
    expect(decideKeyUse({ provider: 'demo' }, { ...SITE, signedIn: false })).toEqual({ kind: 'passthrough' });
  });

  it('signed in with no key of their own: the site key pays', () => {
    expect(decideKeyUse(OPENAI, SITE)).toMatchObject({ kind: 'site', key: 'sk-site-key' });
    // No engine chosen: the site model comes with the key.
    expect(decideKeyUse(NO_KEY, SITE)).toMatchObject({ kind: 'site', key: 'sk-site-key', model: 'gpt-5-mini' });
    // An engine chosen: the caller's model stands (applyKeyDecision keeps it).
    expect(decideKeyUse({ provider: 'openai', model: 'gpt-5' }, SITE)).toMatchObject({ kind: 'site', key: 'sk-site-key' });
  });

  it('signed out with no key of their own: 401, sign in', () => {
    const out = decideKeyUse(OPENAI, { ...SITE, signedIn: false });
    expect(out).toMatchObject({ kind: 'error', status: 401, code: 'SIGN_IN_REQUIRED' });
    expect(decideKeyUse(NO_KEY, { ...SITE, signedIn: false })).toMatchObject({ kind: 'error', status: 401 });
  });

  it('no site key configured: a signed-in visitor is told plainly, a signed-out one keeps the old answers', () => {
    expect(decideKeyUse(OPENAI, { ...SITE, key: null })).toMatchObject({ kind: 'error', status: 503, code: 'AI_NOT_CONFIGURED' });
    expect(decideKeyUse(NO_KEY, { ...SITE, key: null })).toMatchObject({ kind: 'error', status: 503 });
    expect(decideKeyUse(OPENAI, { ...SITE, key: null, signedIn: false })).toEqual({ kind: 'passthrough' });
  });

  it('applying a site decision injects provider, key and the right model', () => {
    const chosen = applyKeyDecision({ provider: 'openai', model: 'gpt-5' }, { kind: 'site', key: 'sk-site-key' });
    expect(chosen).toEqual({ provider: 'openai', key: 'sk-site-key', model: 'gpt-5' });
    const unchosen = applyKeyDecision(NO_KEY, { kind: 'site', key: 'sk-site-key', model: 'gpt-5-mini' });
    expect(unchosen).toEqual({ provider: 'openai', key: 'sk-site-key', model: 'gpt-5-mini' });
    // Non-site decisions leave the credentials untouched.
    expect(applyKeyDecision(OPENAI, { kind: 'byok' })).toEqual(OPENAI);
    expect(applyKeyDecision(OPENAI, { kind: 'passthrough' })).toEqual(OPENAI);
  });
});

describe('the site key in the environment', () => {
  it('reads OPENAI_API_KEY, trimmed, and nothing when unset or blank', () => {
    vi.stubEnv('OPENAI_API_KEY', '  sk-live  ');
    expect(siteAiKey()).toBe('sk-live');
    vi.stubEnv('OPENAI_API_KEY', '   ');
    expect(siteAiKey()).toBeNull();
    vi.stubEnv('OPENAI_API_KEY', '');
    expect(siteAiKey()).toBeNull();
  });

  it('OPENAI_MODEL overrides the model; the OpenAI default otherwise', () => {
    vi.stubEnv('OPENAI_MODEL', 'gpt-5');
    expect(siteAiModel()).toBe('gpt-5');
    vi.stubEnv('OPENAI_MODEL', '');
    expect(siteAiModel()).toBe('gpt-5-mini');
  });
});

describe('isActiveSubscription — the gate the companion rides on', () => {
  it("only the resolved 'active' passes: paid, trialing and comp all resolve to it upstream", () => {
    expect(isActiveSubscription('active')).toBe(true);
    // resolveSubscriptionStatus returns the raw status when it is not active:
    // none of these may open the subscriber gate.
    for (const s of ['none', 'trialing', 'past_due', 'canceled', 'incomplete', null, undefined, '']) {
      expect(isActiveSubscription(s)).toBe(false);
    }
  });

  it('own-active passes unchanged, even with a stale free planTier claim', () => {
    expect(isActiveSubscription('active', 'free')).toBe(true);
    expect(isActiveSubscription('active', null)).toBe(true);
  });

  it('team grant (Workstream H): own status inactive + effective planTier pro passes', () => {
    expect(isActiveSubscription('none', 'pro')).toBe(true);
    expect(isActiveSubscription('canceled', 'pro')).toBe(true);
  });

  it('team grant (Workstream H): granted VIP passes (vip satisfies pro)', () => {
    expect(isActiveSubscription('none', 'vip')).toBe(true);
  });

  it('free still fails: inactive status with planTier free, absent or invalid', () => {
    expect(isActiveSubscription('none', 'free')).toBe(false);
    expect(isActiveSubscription('none', null)).toBe(false);
    expect(isActiveSubscription('none', undefined)).toBe(false);
    expect(isActiveSubscription('none', 'gold')).toBe(false);
    expect(isActiveSubscription('active', 'gold')).toBe(true);
  });
});

describe('resolveRouteKey — subscriptionActive layering (Workstream H)', () => {
  const sessionWith = (user: Record<string, unknown>) => ({ user });
  const grantSession = (planTier: string, subscriptionStatus = 'none') =>
    sessionWith({ id: 'u-grant', subscriptionStatus, planTier });

  it('own subscriber on the site key: subscriptionActive true, unchanged', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'sk-site-key');
    authMocks.auth.mockResolvedValue(grantSession('pro', 'active'));
    const resolved = await resolveRouteKey(OPENAI);
    expect(resolved).toMatchObject({ ok: true, siteUserId: 'u-grant', subscriptionActive: true });
  });

  it('granted member (own status inactive + planTier pro) is subscriptionActive on the site key', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'sk-site-key');
    authMocks.auth.mockResolvedValue(grantSession('pro'));
    const resolved = await resolveRouteKey(OPENAI);
    expect(resolved).toMatchObject({ ok: true, siteUserId: 'u-grant', subscriptionActive: true });
  });

  it('granted VIP member is subscriptionActive on the site key', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'sk-site-key');
    authMocks.auth.mockResolvedValue(grantSession('vip'));
    const resolved = await resolveRouteKey(OPENAI);
    expect(resolved).toMatchObject({ ok: true, siteUserId: 'u-grant', subscriptionActive: true });
  });

  it('free member on the site key stays subscriptionActive false', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'sk-site-key');
    authMocks.auth.mockResolvedValue(grantSession('free'));
    const resolved = await resolveRouteKey(OPENAI);
    expect(resolved).toMatchObject({ ok: true, siteUserId: 'u-grant', subscriptionActive: false });
    // Legacy session without a planTier claim: status alone decides.
    authMocks.auth.mockResolvedValue(sessionWith({ id: 'u-grant', subscriptionStatus: 'none' }));
    const legacy = await resolveRouteKey(OPENAI);
    expect(legacy).toMatchObject({ ok: true, siteUserId: 'u-grant', subscriptionActive: false });
  });

  it('fail-soft: a session read that throws resolves to the signed-out refusal, never an open gate', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'sk-site-key');
    authMocks.auth.mockRejectedValue(new Error('auth unavailable'));
    const resolved = await resolveRouteKey(OPENAI);
    expect(resolved).toMatchObject({ ok: false, status: 401, code: 'SIGN_IN_REQUIRED' });
  });

  it('a caller key never touches the session (unchanged)', async () => {
    authMocks.auth.mockRejectedValue(new Error('auth unavailable'));
    const resolved = await resolveRouteKey({ provider: 'openai', key: 'sk-theirs' });
    expect(resolved).toMatchObject({ ok: true, siteUserId: null, subscriptionActive: true });
  });
});

describe('siteKeyHourLimited', () => {
  it('lets the allowance through, then refuses, per user and bucket', () => {
    const user = `test-${Math.random().toString(36).slice(2)}`;
    for (let i = 0; i < 30; i++) expect(siteKeyHourLimited('assist', user)).toBe(false);
    expect(siteKeyHourLimited('assist', user)).toBe(true);
    // A different bucket, and a different user, are unaffected.
    expect(siteKeyHourLimited('ask', user)).toBe(false);
    expect(siteKeyHourLimited('assist', `${user}-other`)).toBe(false);
  });
});
