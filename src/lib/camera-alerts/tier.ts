/**
 * VIP camera alerts — the tier gate.
 *
 * The tier contract (landing in the billing build): entitlement tier is
 * 'free' | 'pro' | 'vip', resolved from the subscription's price —
 * annual is VIP — and carried on the session as session.user.planTier.
 * Until that shared helper is in the tree, this adapter resolves the
 * same contract straight from the Subscription row, the way
 * lib/recording/access.ts resolves Pro: fresh from the DB, never from
 * a possibly-stale JWT. Swap the internals for the shared helper when
 * it lands; the contract (and this file's callers) stay.
 *
 *   - no live subscription (or period already ended) → 'free'
 *   - live weekly / monthly / enterprise / comp          → 'pro'
 *   - live annual (either annual price id, old or new)   → 'vip'
 *
 * "Live" mirrors resolveSubscriptionStatus in src/auth.ts: status
 * active or trialing AND currentPeriodEnd still in the future.
 */
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { planByPriceIdFromEnv } from "@/lib/billing/trial-reminders";

export type PlanTier = "free" | "pro" | "vip";

interface SubscriptionFacts {
  status: string;
  currentPeriodEnd: Date;
  stripePriceId: string;
}

/** Pure tier resolution — the whole contract in one place. */
export function tierFromSubscription(
  sub: SubscriptionFacts | null | undefined,
  env: Record<string, string | undefined> = process.env,
  now: Date = new Date(),
): PlanTier {
  if (!sub) return "free";
  if (sub.status !== "active" && sub.status !== "trialing") return "free";
  if (!(sub.currentPeriodEnd > now)) return "free";
  const plan = planByPriceIdFromEnv(env)[sub.stripePriceId];
  return plan === "annual" ? "vip" : "pro";
}

/** The tier of one user, resolved fresh from their subscription row. */
export async function getUserTier(userId: string): Promise<PlanTier> {
  const sub = await db.subscription
    .findUnique({
      where: { userId },
      select: { status: true, currentPeriodEnd: true, stripePriceId: true },
    })
    .catch(() => null);
  return tierFromSubscription(sub);
}

/**
 * Session gate for the alert APIs, shaped like recordingAccess():
 * { ok: false } when signed out, else the user id + their tier.
 */
export async function cameraAlertAccess(): Promise<
  { ok: true; userId: string; tier: PlanTier } | { ok: false }
> {
  const session = await auth().catch(() => null);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return { ok: false };
  return { ok: true, userId, tier: await getUserTier(userId) };
}

/** Alerts are a VIP Pro exclusive. */
export function isVip(tier: PlanTier): boolean {
  return tier === "vip";
}
