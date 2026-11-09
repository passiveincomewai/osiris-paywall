// Client-side premium entitlement for the globe page — SELF-HEALING.
//
// The bug this fixes: page.tsx learned "is this viewer Pro?" from ONE
// session fetch on mount. If that fetch resolved before the session
// settled (post-sign-in landing, post-checkout return) or hit a transient
// bad response, a paying Pro user was treated as free for the ENTIRE
// visit — camera wall, satellite lock, traffic filter, all wrong
// together, with no recovery.
//
// The fix has three parts, all built on checkPremiumEntitlement():
//  1. Decision-time healing: the camera gate's blocked path re-checks
//     ONCE before showing the wall or spending a bonus open.
//  2. Ambient healing: focus / visibilitychange re-checks (throttled).
//  3. Upgrade-only application: checks may flip false→true, never
//     true→false. A failed fetch is "unknown", never a downgrade —
//     explicit sign-out navigates away anyway, so nothing legitimate
//     needs a client-side downgrade.

import { planTierOf, type PlanTier } from "./plan-tier";

export type EntitlementCheck = "active" | "free" | "unknown";

/** One fresh session read. "free" means the session definitively says
 *  not-active; any failure (network, non-200, bad JSON) is "unknown".
 *
 *  Team Access (Phase 10): this module has no server-side DB resolver —
 *  its one resolution entry point is this session read, and it is wired
 *  to the jwt change in src/auth.ts. subscriptionStatus stays the
 *  member's OWN billing status, so a team member with no personal
 *  subscription reads not-active there; the session's planTier is the
 *  EFFECTIVE tier (own or org-granted), so a pro/vip planTier also
 *  proves premium access. Legacy sessions without planTier fall back
 *  to the status check alone, exactly as before. */
export async function checkPremiumEntitlement(
  fetchFn: typeof fetch = fetch,
): Promise<EntitlementCheck> {
  try {
    const r = await fetchFn("/api/auth/session", { cache: "no-store" });
    if (!r.ok) return "unknown";
    const s = (await r.json().catch(() => null)) as {
      user?: { subscriptionStatus?: string; planTier?: string };
    } | null;
    if (s?.user?.subscriptionStatus === "active") return "active";
    if (s?.user?.planTier === "pro" || s?.user?.planTier === "vip") return "active";
    return "free";
  } catch {
    return "unknown";
  }
}

export type SessionIdentityState = "anonymous" | "free" | "premium" | "unknown";

export interface SessionIdentity {
  state: SessionIdentityState;
  /** Effective plan tier (the lib/plan-tier contract). "free" unless the
   *  session proves pro/vip. */
  planTier: PlanTier;
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    subscriptionStatus?: string;
    planTier?: string;
    /** Email verification state from the session (lib/auth-verification's
     *  rule, resolved server-side in src/auth.ts). The camera ladder
     *  reads it for its verify rung: signed-in + false = the +5 verify
     *  prompt at the cap; true (or a Google session) = the full
     *  allowance. Absent on legacy sessions → treated as unverified. */
    emailVerified?: boolean;
    /** Support WorldEye supporter flag (User.supporter via the session
     *  claims). Donation prompts read it to stop for donors. */
    supporter?: boolean;
  };
}

/** One fresh session read for IDENTITY — who is this viewer? — the
 *  companion to checkPremiumEntitlement's entitlement question.
 *
 *  The HUD bug this fixes: page.tsx rendered the account menu only for
 *  premium viewers, so a signed-in FREE user saw the exact anonymous
 *  chrome — no avatar, no "signed in as", nothing — and reasonably
 *  concluded the sign-in hadn't worked and tried again. Identity and
 *  entitlement are different questions: a free account is still an
 *  account, and the header has to say so.
 *
 *  Failure semantics mirror checkPremiumEntitlement: any failed read
 *  (network, non-200, bad JSON) is "unknown", never a claim. A session
 *  with no user is definitively "anonymous". Premium uses the same
 *  rule as the entitlement check (own active status OR effective
 *  pro/vip tier), so the HUD can never disagree with the gates about
 *  premium — only about free-vs-anonymous, which is the point. */
export async function readSessionIdentity(
  fetchFn: typeof fetch = fetch,
): Promise<SessionIdentity> {
  try {
    const r = await fetchFn("/api/auth/session", { cache: "no-store" });
    if (!r.ok) return { state: "unknown", planTier: "free" };
    const s = (await r.json().catch(() => null)) as {
      user?: SessionIdentity["user"];
    } | null;
    const user = s?.user;
    if (!user) return { state: "anonymous", planTier: "free" };
    const planTier = planTierOf(s);
    const premium =
      user.subscriptionStatus === "active" || planTier === "pro" || planTier === "vip";
    return { state: premium ? "premium" : "free", planTier, user };
  } catch {
    return { state: "unknown", planTier: "free" };
  }
}

/** Ambient/mount application: only ever upgrades. A "free" or "unknown"
 *  result leaves a known-Pro state untouched. */
export function applyAmbientEntitlement(current: boolean, check: EntitlementCheck): boolean {
  return current || check === "active";
}

export const ENTITLEMENT_RECHECK_THROTTLE_MS = 10_000;

export function shouldRecheckEntitlement(lastCheckAt: number, now: number): boolean {
  return now - lastCheckAt >= ENTITLEMENT_RECHECK_THROTTLE_MS;
}

/** The camera gate's blocked-path decision after the fresh check:
 *  active → open the camera (no wall, no click consumed, no bonus
 *  spent); still free → the pre-existing paths, unchanged (bonus open
 *  if one is banked, otherwise the wall). */
export function blockedCameraAction(
  check: EntitlementCheck,
  hasBonus: boolean,
): "open" | "bonus" | "wall" {
  if (check === "active") return "open";
  return hasBonus ? "bonus" : "wall";
}
