// Cinematic Director gate — the director tools are an affiliate perk.
//
// Source of truth: the same lookup the affiliate dashboard itself uses.
// GET /api/affiliate/invite-status resolves the caller's session and then
// looks up AffiliateProfile by userId (src/app/api/affiliate/_util.ts's
// requireAffiliate does the identical query server-side): a profile row
// existing at all means the user has signed up for the affiliate program.
// The endpoint answers 401 when signed out and { joined: boolean } when
// signed in, so the client gate is a pure mapping of that response — no
// local flag, nothing a user can flip in storage to unlock the tools.

export type DirectorAccess = 'unknown' | 'affiliate' | 'not-affiliate' | 'signed-out';

/**
 * Map an /api/affiliate/invite-status response to a gate decision.
 * 401 → signed out. 200 + { joined: true } → affiliate (profile exists).
 * 200 + any other object → signed in but not joined. Anything else
 * (5xx, non-JSON) stays 'unknown' so the panel can say it is checking
 * instead of guessing either way.
 */
export function directorAccessFromInviteStatus(status: number, body: unknown): DirectorAccess {
  if (status === 401) return 'signed-out';
  if (status !== 200 || !body || typeof body !== 'object') return 'unknown';
  return (body as { joined?: unknown }).joined === true ? 'affiliate' : 'not-affiliate';
}

/** Resolve the current visitor's director access from the live endpoint. */
export async function fetchDirectorAccess(
  fetchImpl: typeof fetch = fetch,
): Promise<DirectorAccess> {
  try {
    const res = await fetchImpl('/api/affiliate/invite-status', { cache: 'no-store' });
    const body = res.status === 200 ? await res.json().catch(() => null) : null;
    return directorAccessFromInviteStatus(res.status, body);
  } catch {
    return 'unknown';
  }
}

// ── The affiliate-panel Director switch ─────────────────────────────────
// On top of membership, the tools honour a persisted per-affiliate
// switch (AffiliateProfile.directorEnabled, toggled in the affiliate
// dashboard). DEFAULT OFF: the invite-status endpoint reports
// directorEnabled:false for everyone — signed-out visitors, non-members,
// and affiliates who never flipped the switch — and only an explicit
// `directorEnabled: true` on a joined profile turns the tools on.

export function directorEnabledFromInviteStatus(status: number, body: unknown): boolean {
  if (status !== 200 || !body || typeof body !== 'object') return false;
  const b = body as { joined?: unknown; directorEnabled?: unknown };
  return b.joined === true && b.directorEnabled === true;
}

export interface DirectorGate {
  access: DirectorAccess;
  /** True only for an affiliate whose panel switch is ON. */
  enabled: boolean;
}

/** Resolve membership + the panel switch in one call. */
export async function fetchDirectorGate(
  fetchImpl: typeof fetch = fetch,
): Promise<DirectorGate> {
  try {
    const res = await fetchImpl('/api/affiliate/invite-status', { cache: 'no-store' });
    const body = res.status === 200 ? await res.json().catch(() => null) : null;
    return {
      access: directorAccessFromInviteStatus(res.status, body),
      enabled: directorEnabledFromInviteStatus(res.status, body),
    };
  } catch {
    return { access: 'unknown', enabled: false };
  }
}
