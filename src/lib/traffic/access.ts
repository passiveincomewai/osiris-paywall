/**
 * OSIRIS — Traffic access (server side).
 *
 * The traffic layer is a subscriber feature. The LayerPanel lock is the
 * visible fence; this module is the one the API routes check, so the paid
 * data path (the TomTom flow tiles) stays shut no matter what the client
 * does. "Active" means exactly what the rest of the product means:
 * resolveSubscriptionStatus (src/auth.ts) puts paid, trialing and comp
 * free-Pro on the session as 'active'; everything else — none, past_due,
 * canceled, expired — does not count. Same definition as
 * lib/oi/server-key.ts's isActiveSubscription.
 *
 * Team Access (Workstream H): subscriptionStatus stays the member's
 * OWN billing status, so a team member whose access comes from their
 * organization's owner reads not-active there; the session's planTier
 * is the EFFECTIVE tier (own or org-granted, resolved in the jwt in
 * src/auth.ts), so the gate also passes when that tier satisfies "pro"
 * via lib/plan-tier. Legacy sessions without planTier fall back to the
 * status check alone (planTierOf's own fallback), exactly as before.
 * Fail-soft: any error reading the tier falls back to the status-only
 * result — it never throws the gate open or closed.
 */
import { planTierOf, tierSatisfies } from '@/lib/plan-tier';

export function trafficAccessForStatus(status: string | null | undefined): boolean {
  return status === 'active';
}

export interface TrafficSessionLike {
  user?: {
    subscriptionStatus?: unknown;
    planTier?: unknown;
  } | null;
}

/** The gate over a session-shaped object: own-active OR effective-pro. */
export function trafficAccessForSession(session: TrafficSessionLike | null | undefined): boolean {
  let statusResult = false;
  try {
    statusResult = trafficAccessForStatus(
      session?.user?.subscriptionStatus as string | null | undefined,
    );
    if (statusResult) return true;
    return tierSatisfies(planTierOf(session), 'pro');
  } catch {
    return statusResult;
  }
}

/** Whether the current request's session belongs to a subscriber. */
export async function requestHasTrafficAccess(): Promise<boolean> {
  try {
    // Imported on use, like lib/oi/server-key.ts: the auth stack
    // (NextAuth + Prisma) stays out of every module that only needs the
    // decision. A session that cannot be read is not a subscriber.
    const { auth } = await import('@/auth');
    const session = await auth();
    return trafficAccessForSession(session);
  } catch {
    return false;
  }
}
