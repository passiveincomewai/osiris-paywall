import { describe, expect, it, vi } from 'vitest';
import {
  directorAccessFromInviteStatus,
  fetchDirectorAccess,
  type DirectorAccess,
} from './access';

// The shapes below are the REAL /api/affiliate/invite-status contract:
// 401 { error } when signed out; 200 { joined: false, invites, goal } when
// signed in without a profile; 200 { joined: true, referralCode, ... }
// when an AffiliateProfile row exists for the user.

describe('directorAccessFromInviteStatus', () => {
  it('401 → signed-out, whatever the body', () => {
    expect(directorAccessFromInviteStatus(401, { error: 'Sign in required' })).toBe('signed-out');
    expect(directorAccessFromInviteStatus(401, null)).toBe('signed-out');
  });

  it('200 + joined:true (affiliate record exists) → affiliate', () => {
    const body = { joined: true, invites: 2, goal: 3, referralCode: 'ABC123', referralLink: 'https://worldeye.app/ref/ABC123' };
    expect(directorAccessFromInviteStatus(200, body)).toBe('affiliate');
  });

  it('200 + joined:false (signed in, no affiliate record) → not-affiliate', () => {
    expect(directorAccessFromInviteStatus(200, { joined: false, invites: 0, goal: 3 })).toBe('not-affiliate');
  });

  it('200 + object without joined:true → not-affiliate (the endpoint always sends joined)', () => {
    expect(directorAccessFromInviteStatus(200, {})).toBe('not-affiliate');
    expect(directorAccessFromInviteStatus(200, { joined: 'yes' })).toBe('not-affiliate');
  });

  it('non-200/401 statuses and non-object bodies → unknown', () => {
    expect(directorAccessFromInviteStatus(500, { error: 'boom' })).toBe('unknown');
    expect(directorAccessFromInviteStatus(200, null)).toBe('unknown');
    expect(directorAccessFromInviteStatus(200, 'joined')).toBe('unknown');
    expect(directorAccessFromInviteStatus(0, null)).toBe('unknown');
  });
});

describe('fetchDirectorAccess', () => {
  const stub = (res: { status: number; body?: unknown; jsonFails?: boolean }) =>
    vi.fn(async () => ({
      status: res.status,
      json: async () => {
        if (res.jsonFails) throw new Error('not json');
        return res.body ?? null;
      },
    })) as unknown as typeof fetch;

  it('resolves affiliate from a joined:true response', async () => {
    const a: DirectorAccess = await fetchDirectorAccess(stub({ status: 200, body: { joined: true } }));
    expect(a).toBe('affiliate');
  });

  it('resolves signed-out from a 401', async () => {
    expect(await fetchDirectorAccess(stub({ status: 401, body: { error: 'Sign in required' } }))).toBe('signed-out');
  });

  it('resolves not-affiliate from joined:false', async () => {
    expect(await fetchDirectorAccess(stub({ status: 200, body: { joined: false, invites: 0, goal: 3 } }))).toBe('not-affiliate');
  });

  it('network failure → unknown (never guesses access)', async () => {
    const failing = vi.fn(async () => { throw new Error('offline'); }) as unknown as typeof fetch;
    expect(await fetchDirectorAccess(failing)).toBe('unknown');
  });

  it('unparseable 200 body → unknown', async () => {
    expect(await fetchDirectorAccess(stub({ status: 200, jsonFails: true }))).toBe('unknown');
  });
});
