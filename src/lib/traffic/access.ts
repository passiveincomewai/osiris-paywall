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
 */

export function trafficAccessForStatus(status: string | null | undefined): boolean {
  return status === 'active';
}

/** Whether the current request's session belongs to a subscriber. */
export async function requestHasTrafficAccess(): Promise<boolean> {
  try {
    // Imported on use, like lib/oi/server-key.ts: the auth stack
    // (NextAuth + Prisma) stays out of every module that only needs the
    // decision. A session that cannot be read is not a subscriber.
    const { auth } = await import('@/auth');
    const session = await auth();
    return trafficAccessForStatus(session?.user?.subscriptionStatus);
  } catch {
    return false;
  }
}
