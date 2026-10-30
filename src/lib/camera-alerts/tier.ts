/**
 * Camera alerts — the tier gate.
 *
 * The tier contract: entitlement tier is 'free' | 'pro' | 'vip',
 * resolved from the subscription's price — annual is VIP — and
 * carried on the session as session.user.planTier. This adapter
 * resolves the same contract straight from the Subscription row, the
 * way lib/recording/access.ts resolves Pro: fresh from the DB, never
 * from a possibly-stale JWT. Since Pricing Phase A the price
 * resolution itself runs through the central plan config
 * (lib/billing/plans); the contract (and this file's callers) stay.
 *
 *   - no live subscription (or period already ended) → 'free'
 *   - live weekly / monthly / enterprise / comp          → 'pro'
 *   - live annual (either annual price id, old or new)   → 'vip'
 *
 * "Live" mirrors resolveSubscriptionStatus in src/auth.ts: status
 * active or trialing AND currentPeriodEnd still in the future.
 *
 * What a tier may DO with alerts is not decided here — the per-tier
 * active-rule cap (free 0 · Pro 2 · VIP Pro 10) is alertCapForTier in
 * ./logic, the single source every enforcement point reads.
 */
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { legacyVipFor, resolvePriceId } from "@/lib/billing/plans";
import { getEffectiveEntitlement, maxTier } from "@/lib/team/entitlement";

export type PlanTier = "free" | "pro" | "vip";

interface SubscriptionFacts {
  status: string;
  currentPeriodEnd: Date;
  stripePriceId: string;
  /** Subscription creation date (the DB row's createdAt), when the
   *  caller has it: drives the legacy-VIP cutoff for the annual price. */
  createdAt?: Date | string | null;
}

/**
 * Pure tier resolution — the whole contract in one place.
 *
 * Phase A: resolution runs through the central plan config
 * (lib/billing/plans) with this adapter's historical outcomes kept
 * byte-identical for every existing price:
 *   - live annual price → 'vip' while the holder is a legacy-VIP
 *     holder (pre-cutoff, per plans' LEGACY_VIP_CUTOFF — the row's
 *     createdAt decides when supplied; without a date the legacy
 *     reading stands, as before Phase A), 'pro' post-cutoff;
 *   - everything else live → 'pro' (weekly/monthly, enterprise, comp,
 *     unrecognized paying prices — this adapter has always defaulted
 *     a payer to Pro), EXCEPT the new-price bridge: an Ultra price is
 *     'vip' (Ultra carries the old vip entitlement set), and a Lite
 *     price is 'free'-equivalent in this old contract — Lite's alert
 *     cap is 0 in the central config, and Lite must not leak Pro
 *     benefits through old consumers (nobody can hold Lite yet).
 */
export function tierFromSubscription(
  sub: SubscriptionFacts | null | undefined,
  env: Record<string, string | undefined> = process.env,
  now: Date = new Date(),
): PlanTier {
  if (!sub) return "free";
  if (sub.status !== "active" && sub.status !== "trialing") return "free";
  if (!(sub.currentPeriodEnd > now)) return "free";
  const resolution = resolvePriceId(sub.stripePriceId, env);
  // This adapter's pinned historical contract: enterprise reads 'pro'
  // for alerts (it predates the tier grid; enterprise holders are
  // served by the plan-tier/session path as vip elsewhere).
  if (resolution.planKey === "enterprise") return "pro";
  if (resolution.tier === "lite") return "free";
  if (resolution.tier === "ultra") return "vip";
  if (resolution.tier === "pro") {
    return legacyVipFor(resolution, sub.createdAt) ? "vip" : "pro";
  }
  // Standalone products (ambient/ski) and unknown paying prices keep
  // this adapter's historical default: a live payer is Pro.
  return "pro";
}

/** The tier of one user, resolved fresh from their subscription row,
 *  layered with any team grant (Team Access Phase 10): the effective
 *  tier from lib/team/entitlement is the single source for the merge,
 *  so a member of a VIP owner's org is VIP here even with no personal
 *  subscription — for both the alert APIs (cameraAlertAccess) and the
 *  cron checker, which resolves owners through this same function.
 *  Fail-soft: any error in the org lookup leaves the own tier. */
export async function getUserTier(userId: string): Promise<PlanTier> {
  const sub = await db.subscription
    .findUnique({
      where: { userId },
      select: { status: true, currentPeriodEnd: true, stripePriceId: true, createdAt: true },
    })
    .catch(() => null);
  const ownTier = tierFromSubscription(sub);
  try {
    const entitlement = await getEffectiveEntitlement(userId);
    return maxTier(ownTier, entitlement.effectiveTier);
  } catch {
    return ownTier;
  }
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

/**
 * Is this tier VIP Pro? Feeds the API response's `vip` flag (the UIs
 * use it to aim the upsell: Pro members at their cap are pointed at
 * VIP, free members at Pro). Alert eligibility itself is cap-based —
 * alertCapForTier in ./logic (free 0 · Pro 2 · VIP Pro 10).
 */
export function isVip(tier: PlanTier): boolean {
  return tier === "vip";
}
