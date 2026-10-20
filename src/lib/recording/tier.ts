/**
 * Recording tier resolution — LOCAL ADAPTER for the tier contract the
 * billing workstream is landing (tier ∈ 'free' | 'pro' | 'vip' from the
 * subscription's price: the annual plan IS VIP Pro; a shared helper +
 * session.user.planTier will own this app-wide). Until that helper is
 * in the tree, the Recording Studio resolves its tier here, from the
 * same source everything else uses: the DB subscription row's Stripe
 * price id, mapped through the env price config
 * (lib/billing/trial-reminders' planByPriceIdFromEnv — the same map the
 * in-house subscription page resolves plans with).
 *
 * Swap note: when the shared tier helper lands, recordingAccess should
 * read it instead of this file, and this adapter goes away. The mapping
 * itself must not drift in the meantime:
 *   weekly / monthly → 'pro' · annual / enterprise → 'vip'
 * Enterprise sits above the annual plan, so it carries VIP's recording
 * entitlements too. A paying subscriber whose price id the env config
 * doesn't recognize (e.g. a legacy price from before a price rotation)
 * resolves 'pro' — never stripped of the studio, never granted VIP on
 * an unrecognized price.
 */
import { planByPriceIdFromEnv } from "@/lib/billing/trial-reminders";

export type PlanTier = "free" | "pro" | "vip";

/** The tier a known plan name carries, or null for anything else. */
export function tierForPlan(plan: string | null | undefined): PlanTier | null {
  switch (plan) {
    case "annual":
    case "enterprise":
      return "vip";
    case "weekly":
    case "monthly":
      return "pro";
    default:
      return null;
  }
}

/** The tier a Stripe price id carries under the env price config. */
export function tierForPriceId(
  stripePriceId: string | null | undefined,
  env: Record<string, string | undefined>,
): PlanTier | null {
  if (!stripePriceId) return null;
  return tierForPlan(planByPriceIdFromEnv(env)[stripePriceId]);
}

/**
 * The studio's tier for one subscription state: signed-out / no active
 * subscription is 'free' (the caller passes pro=false); an active
 * subscriber is at least 'pro', and 'vip' when their price says so.
 */
export function resolveRecordingTier(input: {
  pro: boolean;
  stripePriceId: string | null | undefined;
  env: Record<string, string | undefined>;
}): PlanTier {
  if (!input.pro) return "free";
  return tierForPriceId(input.stripePriceId, input.env) ?? "pro";
}
