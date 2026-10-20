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
