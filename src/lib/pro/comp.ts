// ── Comp (free) Pro grants ────────────────────────────────────────────────
// Pro access is resolved from the Subscription row (resolveSubscriptionStatus
// in src/auth.ts): status "active"/"trialing" AND currentPeriodEnd in the
// future. The Stripe webhook is the sole writer of *Stripe* subscriptions,
// so a comp grant is a Subscription row carrying clearly synthetic Stripe
// ids ("comp_<source>_<userId>") that no real Stripe object can ever have.
//
// Hard rule: a REAL Stripe subscription row (stripeSubscriptionId NOT
// starting with "comp_") is never overwritten, extended, or downgraded by
// this module — a paying customer always wins. (The reverse direction — a
// comp user who later pays — is handled in the Stripe webhook, which
// replaces the comp row when the real subscription syncs.)

import { db } from "@/lib/db";
import { rankFor, RANKS, type RankDef } from "@/lib/affiliate/ranks";

export type CompSource = "creator" | "visionary";

export const COMP_PRICE_ID = "comp_free_pro";
export const COMP_ID_PREFIX = "comp_";

export type CompGrantResult =
  | { granted: true; currentPeriodEnd: Date }
  | { granted: false; reason: "paid_subscription_exists" };

export type CompRevokeResult = { revoked: boolean };

/** True when a Subscription row is a comp grant rather than a Stripe sub. */
export function isCompSubscription(
  sub: { stripeSubscriptionId: string } | null | undefined,
): boolean {
  return !!sub && sub.stripeSubscriptionId.startsWith(COMP_ID_PREFIX);
}

export function compSyntheticId(source: CompSource, userId: string): string {
  return `${COMP_ID_PREFIX}${source}_${userId}`;
}

/**
 * Pure decision: given the user's current Subscription row (or null), may a
 * comp grant proceed? Only a real Stripe row blocks it; a missing row or an
 * existing comp row (extend/replace) proceeds.
 */
export function compGrantDecision(
  existing: { stripeSubscriptionId: string } | null | undefined,
): "grant" | "skip_paid" {
  if (!existing) return "grant";
  return isCompSubscription(existing) ? "grant" : "skip_paid";
}

/** Pure decision: may revoke touch this row? Only comp rows. */
export function compRevokeDecision(
  existing: { stripeSubscriptionId: string } | null | undefined,
): boolean {
  return isCompSubscription(existing);
}

/**
 * Grant (or extend) complimentary Pro for `months` from now. Idempotent:
 * re-granting a comp user upserts the same row with a fresh period. Never
 * touches a real Stripe subscription — returns granted:false instead.
 */
export async function grantCompPro(
  userId: string,
  source: CompSource,
  months = 12,
): Promise<CompGrantResult> {
  const existing = await db.subscription.findUnique({ where: { userId } });
  if (compGrantDecision(existing) === "skip_paid") {
    return { granted: false, reason: "paid_subscription_exists" };
  }

  const now = new Date();
  const end = new Date(now);
  end.setMonth(end.getMonth() + months);
  const syntheticId = compSyntheticId(source, userId);
  const data = {
    stripeCustomerId: syntheticId,
    stripeSubscriptionId: syntheticId,
    stripePriceId: COMP_PRICE_ID,
    status: "active" as const,
    currentPeriodStart: now,
    currentPeriodEnd: end,
    cancelAtPeriodEnd: false,
  };

  const sub = await db.subscription.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
  });
  return { granted: true, currentPeriodEnd: sub.currentPeriodEnd };
}

/**
 * Revoke complimentary Pro. Only ever touches comp rows — a real Stripe
 * subscription is left completely alone.
 */
export async function revokeCompPro(userId: string): Promise<CompRevokeResult> {
  const existing = await db.subscription.findUnique({ where: { userId } });
  if (!compRevokeDecision(existing)) return { revoked: false };
  const now = new Date();
  await db.subscription.update({
    where: { userId },
    data: { status: "canceled", currentPeriodEnd: now },
  });
  return { revoked: true };
}

/** Pure: does this XP total sit at Visionary rank under the given ladder? */
export function isVisionaryXp(xp: number, ranks: RankDef[] = RANKS): boolean {
  return rankFor(xp, ranks).key === "visionary";
}

/**
 * Visionary perk: an affiliate at Visionary rank gets free Pro. Safe to
 * call after every XP award — it no-ops below Visionary, and it NEVER
 * throws (a comp failure must not break XP awarding), returning null when
 * no grant happened.
 */
export async function maybeGrantVisionaryPro(
  userId: string,
  xp: number,
  ranks: RankDef[] = RANKS,
): Promise<CompGrantResult | null> {
  try {
    if (!isVisionaryXp(xp, ranks)) return null;
    return await grantCompPro(userId, "visionary", 12);
  } catch {
    return null;
  }
}
