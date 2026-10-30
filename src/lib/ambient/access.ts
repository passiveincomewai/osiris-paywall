/**
 * WorldEye Ambient — who may stream without the demo gate.
 *
 * Ambient is a STANDALONE product ($4.99/mo, its own Stripe price),
 * not a Pro tier: an Ambient subscription unlocks Ambient and nothing
 * else, and lib/plan-tier keeps the Ambient price OUT of the pro/vip
 * mapping for exactly that reason. Access to Ambient itself is the
 * union (owner's spec, 2026-10-26):
 *
 *   - an active subscription on the Ambient price, OR
 *   - any Pro/VIP tier (weekly/monthly → pro, annual/enterprise →
 *     vip, incl. team-granted effective tiers) — Pro bypasses the
 *     Ambient gate entirely, OR
 *   - a comp row: the comp engine's only price is a Pro price, so
 *     comps arrive via the tier rule above.
 *
 * The session carries this as `session.user.ambientAccess`, resolved
 * in src/auth.ts's claims alongside subscriptionStatus/planTier on
 * the same 60 s TTL, so a finished Ambient checkout reflects on the
 * next session read — the same healing path every other gate uses.
 */
import {
  ambientPriceId,
  isAmbientPriceId,
  planTierForRow,
  tierSatisfies,
} from "@/lib/plan-tier";
import { entitlementsFor, resolvePriceId } from "@/lib/billing/plans";
import { subscriptionStatusFromRow } from "@/lib/subscription-status";

/* The Ambient price-id contract lives in lib/plan-tier (the price-id
 * module); re-exported here so Ambient code has one import home. The
 * env var wins when set; the fallback constant is the live price the
 * owner created, so a fresh deploy never 500s on a missing env. */
export { ambientPriceId, isAmbientPriceId };
export { AMBIENT_PRICE_ENV, AMBIENT_PRICE_ID_FALLBACK } from "@/lib/plan-tier";

interface SubRowLike {
  status: string;
  currentPeriodEnd: Date;
  stripePriceId: string;
}

/**
 * Ambient access from a Subscription row alone (pure — used by the
 * auth claims resolver and unit tests). Status must first fold to
 * "active" through the codebase's standard mapping
 * (lib/subscription-status), exactly like every other entitlement.
 */
export function ambientAccessForRow(
  sub: SubRowLike | null | undefined,
  env: Record<string, string | undefined> = process.env,
  now: Date = new Date(),
): boolean {
  if (subscriptionStatusFromRow(sub, now) !== "active") return false;
  if (isAmbientPriceId(sub?.stripePriceId, env)) return true;
  if (tierSatisfies(planTierForRow(sub, env, now), "pro")) return true;
  // Pricing Phase A (owner decision Q4): ANY paid tier bypasses the
  // Ambient gate — the central plan config's ambientBypass
  // (lib/billing/plans). The old-contract tier leg above already
  // covers Pro, Ultra and legacy-VIP holders; this leg adds Lite,
  // which the old contract deliberately reads as "free" so Lite can
  // never leak Pro benefits through pre-redesign consumers.
  // Standalone prices (Powder Pass) resolve with tier null and
  // unknown prices are already covered by the tier leg's Pro
  // default, so neither gains or loses anything here.
  const resolution = resolvePriceId(sub?.stripePriceId, env);
  if (resolution.known && resolution.tier) {
    return entitlementsFor(resolution.tier).ambientBypass;
  }
  return false;
}

/**
 * Client/session-side read: does this session-shaped object prove
 * Ambient access? The explicit `ambientAccess` claim wins; sessions
 * minted before the claim existed fall back to the tier rule (pro/vip
 * proves access; "active" alone does NOT — it cannot distinguish an
 * Ambient sub from a Pro one… both of which grant access, so active
 * is honestly sufficient too, and is the fallback's second leg).
 */
export function sessionHasAmbientAccess(
  session: {
    user?: {
      ambientAccess?: unknown;
      planTier?: unknown;
      subscriptionStatus?: unknown;
    } | null;
  } | null | undefined,
): boolean {
  const user = session?.user;
  if (!user) return false;
  if (user.ambientAccess === true) return true;
  if (user.planTier === "pro" || user.planTier === "vip") return true;
  return user.subscriptionStatus === "active";
}
