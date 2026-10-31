/**
 * Public API rate-limit ladder — one rung per real plan.
 *
 * The rungs come from the plan matrix in src/lib/billing/plans.ts (the
 * 3×3 grid + Enterprise), resolved off the key owner's Subscription row
 * with the same resolvers the rest of the product uses:
 *   - no active subscription (or a standalone Ambient / Powder Pass
 *     subscription, which carries no API tier) → free
 *   - Lite (any period)                        → lite
 *   - Pro weekly/monthly, comp grants, any
 *     unrecognized paying price, and Pro
 *     Annual subscriptions created after the
 *     legacy-VIP cutoff (the product's own
 *     contract ranks those "pro")              → pro
 *   - Ultra (any period) and Pro Annual
 *     subscriptions the plan-tier contract
 *     ranks "vip" (legacy holders)             → ultra
 *   - Enterprise price                         → enterprise
 *
 * The quotas themselves are this module's single source: the /developers
 * docs page renders its ladder table from API_TIER_LIMITS, so the docs
 * cannot drift from enforcement.
 */
import { db } from "@/lib/db";
import { resolvePriceId } from "@/lib/billing/plans";
import { planTierForRow } from "@/lib/plan-tier";
import { subscriptionStatusFromRow } from "@/lib/subscription-status";

export type ApiTier = "free" | "lite" | "pro" | "ultra" | "enterprise";

export interface ApiTierLimits {
  tier: ApiTier;
  /** The plan names this rung covers, as the docs present them. */
  planLabel: string;
  /** Requests per UTC day, counted per API key. */
  dailyRequests: number;
  /** Burst ceiling: requests per minute, counted per API key. */
  requestsPerMinute: number;
}

export const API_TIER_LIMITS: Record<ApiTier, ApiTierLimits> = {
  free: { tier: "free", planLabel: "Free", dailyRequests: 100, requestsPerMinute: 10 },
  lite: { tier: "lite", planLabel: "Lite", dailyRequests: 1_000, requestsPerMinute: 30 },
  pro: { tier: "pro", planLabel: "Pro (incl. VIP Pro Annual)", dailyRequests: 5_000, requestsPerMinute: 60 },
  ultra: { tier: "ultra", planLabel: "Ultra & legacy VIP Pro Annual", dailyRequests: 25_000, requestsPerMinute: 120 },
  enterprise: { tier: "enterprise", planLabel: "Enterprise", dailyRequests: 100_000, requestsPerMinute: 300 },
};

interface SubscriptionLike {
  status: string;
  currentPeriodEnd: Date;
  stripePriceId: string;
  /** Drives the legacy-VIP cutoff inside planTierForRow (Pro Annual). */
  createdAt?: Date | string | null;
}

/** The pure resolver: a Subscription row (or null) → API tier. */
export function apiTierForSubscription(
  sub: SubscriptionLike | null | undefined,
  env: Record<string, string | undefined> = process.env,
  now: Date = new Date(),
): ApiTier {
  if (subscriptionStatusFromRow(sub, now) !== "active") return "free";
  const priceId = sub?.stripePriceId;
  if (priceId && env.STRIPE_ENTERPRISE_PRICE_ID && priceId === env.STRIPE_ENTERPRISE_PRICE_ID) {
    return "enterprise";
  }
  const resolution = resolvePriceId(priceId, env);
  // Standalone products (Ambient, Powder Pass) carry no API tier.
  if (resolution.standalone) return "free";
  if (resolution.tier === "lite") return "lite";
  if (resolution.tier === "ultra") return "ultra";
  // Pro grid + comps + unknown paying prices land here. The product's
  // own tier contract decides the annual price: "vip" for legacy
  // holders (→ ultra rung), "pro" after the cutoff (→ pro rung).
  return planTierForRow(sub, env, now) === "vip" ? "ultra" : "pro";
}

/** The key owner's current API tier, read off their Subscription row. */
export async function apiTierForUser(userId: string): Promise<ApiTier> {
  const sub = await db.subscription
    .findUnique({ where: { userId } })
    .catch(() => null);
  return apiTierForSubscription(sub);
}
