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
 * `session.user.planTier`. Since Team Access Phase 10 the token's tier
 * is the EFFECTIVE tier — max(own tier, org-granted tier via
 * lib/team/entitlement) — while subscriptionStatus stays the member's
 * own billing status. Client and edge code read it through
 * planTierOf(session) — never by re-deriving from price ids locally.
 *
 * Consumers: timelapse gate (lib/timelapse), the middleware intel gate,
 * camera alerts + VIP recording (sibling workstreams) — all read tier
 * via planTierOf / tierSatisfies so the contract has one home.
 */
import { subscriptionStatusFromRow } from "./subscription-status";
import { legacyVipFor, resolvePriceId } from "./billing/plans";

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

/* ── WorldEye Ambient: a standalone product, NOT a tier ─────────────
 * Ambient ($4.99/mo) is sold beside the tiers, not inside them: its
 * price must never resolve to pro/vip, or a $4.99 Ambient subscriber
 * would silently hold all of Pro. Ambient access itself is computed
 * in lib/ambient/access (Ambient price OR any pro/vip tier). The
 * price-id resolution lives here because this module is the price-id
 * contract; lib/ambient/access re-exports it. */
export const AMBIENT_PRICE_ENV = "STRIPE_AMBIENT_PRICE_ID";
/** The Ambient price the owner created in Stripe (live mode). */
export const AMBIENT_PRICE_ID_FALLBACK = "price_1UUxUnGfHuTnzrlHH0pNYhJU";

export function ambientPriceId(
  env: Record<string, string | undefined>,
): string {
  return env[AMBIENT_PRICE_ENV] ?? AMBIENT_PRICE_ID_FALLBACK;
}

export function isAmbientPriceId(
  priceId: string | null | undefined,
  env: Record<string, string | undefined>,
): boolean {
  return !!priceId && priceId === ambientPriceId(env);
}

/* ── Powder Pass: a second standalone product, NOT a tier ──────────
 * Powder Pass ($4.99/mo ski-only, owner's pick 2026-10-28) is sold
 * beside the tiers exactly like Ambient: its price must never resolve
 * to pro/vip, or a $4.99 ski subscriber would silently hold all of
 * Pro. Ski access itself is computed in lib/ski/access (Powder Pass
 * price OR vip tier OR comp). Unlike Ambient there is NO fallback
 * price constant: the owner has not created the Stripe price yet, so
 * the env var is the only source — unset env means "not configured",
 * and checkout answers the standard not-configured 500. The whole
 * product is dark until POWDER_PASS_ENABLED is set (lib/ski/access). */
export const POWDER_PASS_PRICE_ENV = "POWDER_PASS_PRICE_ID";

export function powderPassPriceId(
  env: Record<string, string | undefined>,
): string | undefined {
  return env[POWDER_PASS_PRICE_ENV] || undefined;
}

export function isPowderPassPriceId(
  priceId: string | null | undefined,
  env: Record<string, string | undefined>,
): boolean {
  const configured = powderPassPriceId(env);
  return !!priceId && !!configured && priceId === configured;
}

/**
 * The comp engine's only price id (COMP_PRICE_ID in lib/pro/comp).
 * Recognised here, in the price-id contract module, so pure
 * entitlement code can spot a comp row without importing the
 * DB-backed comp module.
 */
export function isCompPriceId(priceId: string | null | undefined): boolean {
  return priceId === "comp_free_pro";
}

/**
 * Tier from a Stripe price id alone (active subscription assumed).
 *
 * PRICING REDESIGN PHASE A — the new-price bridge. Resolution now runs
 * through the central config (lib/billing/plans), but this module's
 * public contract (free | pro | vip) is UNCHANGED for every existing
 * price and consumer. The new tiers bridge into the old contract as:
 *
 *   lite price        → "free"-equivalent. Lite is not sellable yet
 *                       (Phase C) so nobody can hold one; the bridge
 *                       exists so Lite can NEVER leak Pro benefits
 *                       through old consumers when it does launch —
 *                       plans.ts carries Lite's true entitlements for
 *                       Phase B/C consumers.
 *   ultra price       → "vip" (Ultra is the new top tier; vip was the
 *                       old name for the same entitlement set).
 *   Pro annual price  → "vip" while the subscription is a legacy-VIP
 *                       holder (created before LEGACY_VIP_CUTOFF in
 *                       plans.ts), "pro" for post-cutoff subscriptions.
 *                       Callers that know the subscription's creation
 *                       date pass it (planTierForRow does, from the DB
 *                       row); price-only callers get the legacy
 *                       reading — annual ⇒ vip, exactly as before
 *                       Phase A — because a missing date must never
 *                       strip an existing holder.
 *   grandfathered     → GF weekly/monthly "pro"; GF annual "vip"
 *   prices              (its holders keep the VIP extras).
 *   enterprise        → "vip" (as before).
 *   standalone prices → "free" (Ambient / Powder Pass confer no tier).
 *   unknown live price → "pro" (never strip a payer, as before).
 */
export function planTierForPriceId(
  priceId: string | null | undefined,
  env: Record<string, string | undefined>,
  createdAt?: Date | string | null,
): PlanTier {
  if (!priceId) return "free";
  // Ambient is a standalone product — it confers no tier (see above).
  // Checked explicitly, ahead of the central resolution, to preserve
  // this helper's exact env-or-fallback semantics.
  if (isAmbientPriceId(priceId, env)) return "free";
  // Powder Pass is a standalone product too — no tier (see above).
  if (isPowderPassPriceId(priceId, env)) return "free";
  const resolution = resolvePriceId(priceId, env);
  if (resolution.known) {
    if (resolution.standalone) return "free";
    switch (resolution.tier) {
      case "lite":
        return "free";
      case "ultra":
        return "vip";
      case "pro":
        return legacyVipFor(resolution, createdAt) ? "vip" : "pro";
      default:
        return "free";
    }
  }
  // Unknown live price (incl. comp grants, whose only price id is
  // COMP_PRICE_ID) → pro: a payer is never stripped.
  return "pro";
}

/**
 * Tier from a Subscription DB row: the status must first fold to
 * "active" (lib/subscription-status — active/trialing with a future
 * period end); the price id then decides pro vs vip. The row's
 * createdAt drives the legacy-VIP cutoff for the Pro annual price
 * (see planTierForPriceId); rows selected without it keep the legacy
 * reading.
 */
export function planTierForRow(
  sub: {
    status: string;
    currentPeriodEnd: Date;
    stripePriceId: string;
    createdAt?: Date | string | null;
  } | null | undefined,
  env: Record<string, string | undefined>,
  now: Date = new Date(),
): PlanTier {
  if (subscriptionStatusFromRow(sub, now) !== "active") return "free";
  return planTierForPriceId(sub?.stripePriceId, env, sub?.createdAt);
}
