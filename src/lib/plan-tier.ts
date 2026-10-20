/**
 * PLAN TIER CONTRACT — the shared entitlement signal for every gate.
 *
 *   tier ∈ "free" | "pro" | "vip"        (vip ⊃ pro ⊃ free)
 *
 * Tier comes from the subscription's Stripe price id:
 *   annual price id     → "vip"   (the plan sold as VIP Pro)
 *   enterprise price id → "vip"   (enterprise includes everything)
 *   weekly / monthly    → "pro"
 *   comp grants         → "pro"   (the comp engine's only price id is
 *                                  COMP_PRICE_ID "comp_free_pro" — there
 *                                  is no comp-annual convention)
 *   no active sub       → "free"
 *
 * Server-side, the tier is resolved in the Auth.js jwt callback (same
 * read + 60s TTL as subscriptionStatus) and exposed as
 * `session.user.planTier`. Client and edge code read it through
 * planTierOf(session) — never by re-deriving from price ids locally.
 *
 * Consumers: timelapse gate (lib/timelapse), the middleware intel gate,
 * camera alerts + VIP recording (sibling workstreams) — all read tier
 * via planTierOf / tierSatisfies so the contract has one home.
 */
import { subscriptionStatusFromRow } from "./subscription-status";

export type PlanTier = "free" | "pro" | "vip";

export const TIER_RANK: Record<PlanTier, number> = { free: 0, pro: 1, vip: 2 };

export function isPlanTier(v: unknown): v is PlanTier {
  return v === "free" || v === "pro" || v === "vip";
}

/** Does `tier` satisfy a gate that requires `required`? vip ⊃ pro. */
export function tierSatisfies(tier: PlanTier, required: "pro" | "vip"): boolean {
  return TIER_RANK[tier] >= TIER_RANK[required];
}

interface SessionLike {
  user?: {
    planTier?: unknown;
    subscriptionStatus?: unknown;
  } | null;
}

/**
 * THE helper other workstreams consume: the tier for a session-shaped
 * object ({ user: { planTier, subscriptionStatus } } — an Auth.js
 * session, a JWT token, or the /api/auth/session JSON).
 *
 * A session minted before planTier existed carries no field: fall back
 * to subscriptionStatus, where "active" proves Pro but can never prove
 * VIP (the price id isn't in the old token) — conservative by design.
 */
export function planTierOf(session: SessionLike | null | undefined): PlanTier {
  const user = session?.user;
  if (!user) return "free";
  if (isPlanTier(user.planTier)) return user.planTier;
  return user.subscriptionStatus === "active" ? "pro" : "free";
}

/** Tier from a Stripe price id alone (active subscription assumed). */
export function planTierForPriceId(
  priceId: string | null | undefined,
  env: Record<string, string | undefined>,
): PlanTier {
  if (!priceId) return "free";
  if (priceId === env.STRIPE_ANNUAL_PRICE_ID) return "vip";
  if (priceId === env.STRIPE_ENTERPRISE_PRICE_ID) return "vip";
  return "pro";
}

/**
 * Tier from a Subscription DB row: the status must first fold to
 * "active" (lib/subscription-status — active/trialing with a future
 * period end); the price id then decides pro vs vip.
 */
export function planTierForRow(
  sub: { status: string; currentPeriodEnd: Date; stripePriceId: string } | null | undefined,
  env: Record<string, string | undefined>,
  now: Date = new Date(),
): PlanTier {
  if (subscriptionStatusFromRow(sub, now) !== "active") return "free";
  return planTierForPriceId(sub?.stripePriceId, env);
}
