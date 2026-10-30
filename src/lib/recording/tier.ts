/**
 * Recording tier resolution — LOCAL ADAPTER for the tier contract
 * (tier ∈ 'free' | 'pro' | 'vip' from the subscription's price: the
 * annual plan IS VIP Pro). Since Pricing Phase A the price resolution
 * runs through the central plan config (lib/billing/plans); this
 * adapter keeps its historical outcomes for every existing price:
 *   weekly / monthly → 'pro' · annual / enterprise → 'vip'
 * Enterprise sits above the annual plan, so it carries VIP's recording
 * entitlements too. A paying subscriber whose price id the config
 * doesn't recognize (e.g. a legacy price from before a price rotation)
 * resolves 'pro' — never stripped of the studio, never granted VIP on
 * an unrecognized price.
 *
 * New-price bridge (Phase A): Ultra prices → 'vip' (Ultra carries the
 * old vip entitlement set, recording cap included). Lite prices carry
 * NO tier in this old contract — tierForPriceId returns null and
 * resolveRecordingTier reads a known Lite price as 'free' here, so
 * Lite can never leak the Pro multi-camera cap (20) through this
 * adapter; Lite's true studio entitlement (cap 5) lives in
 * lib/billing/plans for Phase B/C consumers. Legacy-VIP holders
 * (grandfathered annual, or the current annual price created before
 * plans' LEGACY_VIP_CUTOFF) keep 'vip' — resolveRecordingTier applies
 * the cutoff when the caller supplies the subscription's createdAt.
 */
import { legacyVipFor, resolvePriceId } from "@/lib/billing/plans";

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

/**
 * The tier a Stripe price id carries under the central plan config.
 * Null when the price carries no old-contract tier (unknown prices,
 * the standalone Ambient/Powder Pass prices, and Lite prices).
 * Price-only resolution keeps the legacy reading for legacy-VIP
 * prices (annual ⇒ vip): with no subscription date there is nothing
 * to apply the cutoff against, and a holder is never stripped on a
 * missing date.
 */
export function tierForPriceId(
  stripePriceId: string | null | undefined,
  env: Record<string, string | undefined>,
): PlanTier | null {
  if (!stripePriceId) return null;
  const resolution = resolvePriceId(stripePriceId, env);
  if (!resolution.known || resolution.standalone) return null;
  switch (resolution.tier) {
    case "ultra":
      return "vip";
    case "pro":
      return legacyVipFor(resolution) ? "vip" : "pro";
    default:
      return null;
  }
}

/**
 * The studio's tier for one subscription state: signed-out / no active
 * subscription is 'free' (the caller passes pro=false); an active
 * subscriber is at least 'pro', and 'vip' when their price says so.
 * `createdAt` (the subscription's creation date, when known) applies
 * the legacy-VIP cutoff to the annual price; without it the legacy
 * reading stands.
 */
export function resolveRecordingTier(input: {
  pro: boolean;
  stripePriceId: string | null | undefined;
  env: Record<string, string | undefined>;
  createdAt?: Date | string | null;
}): PlanTier {
  if (!input.pro) return "free";
  if (input.stripePriceId) {
    const resolution = resolvePriceId(input.stripePriceId, input.env);
    if (resolution.known && !resolution.standalone) {
      // New-price bridge: a known Lite price is 'free'-equivalent in
      // this old contract (see the header note).
      if (resolution.tier === "lite") return "free";
      if (resolution.tier === "ultra") return "vip";
      if (resolution.tier === "pro") {
        return legacyVipFor(resolution, input.createdAt) ? "vip" : "pro";
      }
    }
  }
  return tierForPriceId(input.stripePriceId, input.env) ?? "pro";
}
