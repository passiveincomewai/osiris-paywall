// ── Tiered affiliate discount codes ───────────────────────────────────────
// Every affiliate carries a personal Stripe promotion code whose % off the
// buyer's FIRST payment follows their rank (see ranks.ts discountPct;
// approved creators get a 20% floor). The public code string is
// `{SLUG}{PCT}` — e.g. JAMESON20 — built from the affiliate's referral
// slug (customCode ?? referralCode).
//
// Design rules:
//  - One shared Stripe coupon per percent (duration "once"), cached in
//    AffiliateDiscountCoupon so affiliates reuse it — only the per-
//    affiliate promotion code is minted individually.
//  - Codes ROTATE with tier: when the desired code/pct changes, the old
//    promotion code is deactivated and the new one stored.
//  - Honest degradation: without STRIPE_SECRET_KEY nothing is faked — the
//    intended code/pct are stored (so the product can show intent) with
//    stripePromotionCodeId null, and the state reports "pending_config".
//    Checkout redemption only works once Stripe has confirmed the code.
//  - Sync is LAZY: /api/affiliate/me calls ensureDiscountCode, so a code
//    materializes/updates the next time the affiliate loads a surface.
//  - Discount sales attribute back: a checkout completed with one of
//    these promotion codes (and no stronger attribution) links the buyer
//    to the affiliate via the standard linkAttribution mechanism.

import type Stripe from "stripe";
import type { AffiliateProfile } from "@prisma/client";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { buildDiscountCode, discountPercentFor, type RankDef } from "./ranks";
import { getSettings } from "./settings";
import { linkAttribution } from "./attribution";

export type DiscountSyncStatus = "synced" | "pending_config" | "error";

export interface DiscountCodeState {
  code: string;
  pct: number;
  /** True only when Stripe has confirmed the promotion code exists. */
  synced: boolean;
  status: DiscountSyncStatus;
}

type StoredDiscount = {
  discountCode: string | null;
  discountPct: number | null;
  stripePromotionCodeId: string | null;
};

/** Pure: the code/pct an affiliate SHOULD carry right now. */
export function desiredDiscountFor(
  profile: { xp: number; customCode: string | null; referralCode: string },
  creatorApproved: boolean,
  ranks?: RankDef[],
): { code: string; pct: number } {
  const pct = discountPercentFor({ xp: profile.xp, creatorApproved }, ranks);
  const slug = profile.customCode ?? profile.referralCode;
  return { code: buildDiscountCode(slug, pct), pct };
}

/**
 * Pure sync decision:
 *  - "synced"         stored code+pct match the desired ones AND Stripe has
 *                     confirmed a promotion code for them;
 *  - "pending_config" Stripe isn't configured — store intent only;
 *  - "needs_sync"     Stripe is configured but stored state is stale/absent.
 */
export function discountSyncDecision(
  stored: StoredDiscount | null | undefined,
  desired: { code: string; pct: number },
  stripeConfigured: boolean,
): "synced" | "pending_config" | "needs_sync" {
  if (
    stored &&
    stored.discountCode === desired.code &&
    stored.discountPct === desired.pct &&
    stored.stripePromotionCodeId
  ) {
    return "synced";
  }
  return stripeConfigured ? "needs_sync" : "pending_config";
}

/** True when the user holds an APPROVED creator application (20% floor). */
export async function isCreatorApproved(userId: string): Promise<boolean> {
  const app = await db.creatorApplication.findFirst({
    where: { userId, status: "approved" },
    select: { id: true },
  });
  return !!app;
}

function stripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

/**
 * Ensure the affiliate's stored discount code matches their current tier
 * and (when Stripe is configured) exists as a live promotion code.
 * Never throws — callers (/api/affiliate/me) must not fail on sync errors.
 */
export async function ensureDiscountCode(
  profile: AffiliateProfile,
): Promise<DiscountCodeState> {
  const settings = await getSettings();
  const creatorApproved = await isCreatorApproved(profile.userId);
  const desired = desiredDiscountFor(profile, creatorApproved, settings.ranks);
  const stored: StoredDiscount = {
    discountCode: profile.discountCode,
    discountPct: profile.discountPct,
    stripePromotionCodeId: profile.stripePromotionCodeId,
  };
  const decision = discountSyncDecision(stored, desired, stripeConfigured());

  if (decision === "synced") {
    return { code: desired.code, pct: desired.pct, synced: true, status: "synced" };
  }

  if (decision === "pending_config") {
    // Store intent only. If the code/pct changed while unconfigured, any
    // previously stored promotion-code id no longer describes this code —
    // clear it so a later "synced" check can't pass on a stale id.
    if (stored.discountCode !== desired.code || stored.discountPct !== desired.pct) {
      await db.affiliateProfile.update({
        where: { id: profile.id },
        data: {
          discountCode: desired.code,
          discountPct: desired.pct,
          stripePromotionCodeId: null,
          discountSyncedAt: null,
        },
      }).catch(() => {});
    }
    return { code: desired.code, pct: desired.pct, synced: false, status: "pending_config" };
  }

  // needs_sync → talk to Stripe.
  try {
    const promo = await syncPromotionCode(profile, desired);
    if (profile.stripePromotionCodeId && profile.stripePromotionCodeId !== promo.id) {
      // Tier/slug rotated: retire the previous code (best effort — the new
      // code is already authoritative in our DB either way).
      await stripe().promotionCodes
        .update(profile.stripePromotionCodeId, { active: false })
        .catch(() => {});
    }
    await db.affiliateProfile.update({
      where: { id: profile.id },
      data: {
        discountCode: desired.code,
        discountPct: desired.pct,
        stripePromotionCodeId: promo.id,
        discountSyncedAt: new Date(),
      },
    });
    return { code: desired.code, pct: desired.pct, synced: true, status: "synced" };
  } catch (e) {
    console.error(`[discount] sync failed for profile ${profile.id}:`, e);
    // Keep the intended code/pct visible; redemption stays off until a
    // later successful sync fills in the promotion-code id.
    if (stored.discountCode !== desired.code || stored.discountPct !== desired.pct) {
      await db.affiliateProfile.update({
        where: { id: profile.id },
        data: { discountCode: desired.code, discountPct: desired.pct },
      }).catch(() => {});
    }
    return { code: desired.code, pct: desired.pct, synced: false, status: "error" };
  }
}

/** Consumer-plan product ids for coupon applies_to (best effort). */
async function consumerProductIds(): Promise<string[]> {
  const envKeys = ["STRIPE_WEEKLY_PRICE_ID", "STRIPE_MONTHLY_PRICE_ID", "STRIPE_ANNUAL_PRICE_ID"];
  const products = new Set<string>();
  for (const key of envKeys) {
    const priceId = process.env[key];
    if (!priceId) continue;
    try {
      const price = await stripe().prices.retrieve(priceId);
      const product = typeof price.product === "string" ? price.product : price.product?.id;
      if (product) products.add(product);
    } catch {
      // Unresolvable price — leave that plan out of the restriction.
    }
  }
  return [...products];
}

/**
 * Get-or-create the shared Stripe coupon for a percent. The coupon id is
 * cached in AffiliateDiscountCoupon (keyed by pct) so steady-state syncs
 * make zero list calls. Coupons are duration "once" (first payment only)
 * and, when the consumer plan products resolve, restricted to them so a
 * tier code can never discount the enterprise plan.
 */
async function getOrCreateTierCoupon(pct: number): Promise<string> {
  const cached = await db.affiliateDiscountCoupon.findUnique({ where: { pct } });
  if (cached) return cached.stripeCouponId;

  const products = await consumerProductIds();
  const coupon = await stripe().coupons.create({
    percent_off: pct,
    duration: "once",
    name: `WorldEye affiliate tier — ${pct}% off first payment`,
    metadata: { worldeye_affiliate_tier: "1", pct: String(pct) },
    ...(products.length > 0 ? { applies_to: { products } } : {}),
  });
  await db.affiliateDiscountCoupon.upsert({
    where: { pct },
    create: { pct, stripeCouponId: coupon.id },
    update: { stripeCouponId: coupon.id },
  });
  return coupon.id;
}

/**
 * Find the live promotion code for (coupon, code string), reusing an
 * existing one when it already represents this affiliate+pct (idempotent
 * re-syncs, deactivated-code revival), otherwise mint it. Throws on a
 * genuine code-string collision with another affiliate.
 */
async function syncPromotionCode(
  profile: AffiliateProfile,
  desired: { code: string; pct: number },
): Promise<Stripe.PromotionCode> {
  let couponId = await getOrCreateTierCoupon(desired.pct);
  try {
    return await findOrCreatePromotionCode(couponId, desired, profile.id);
  } catch (e) {
    // The cached coupon may have been deleted on the Stripe side — rebuild
    // it once and retry before giving up.
    const msg = e instanceof Error ? e.message : "";
    if (!/coupon/i.test(msg)) throw e;
    await db.affiliateDiscountCoupon.delete({ where: { pct: desired.pct } }).catch(() => {});
    couponId = await getOrCreateTierCoupon(desired.pct);
    return findOrCreatePromotionCode(couponId, desired, profile.id);
  }
}

async function findOrCreatePromotionCode(
  couponId: string,
  desired: { code: string; pct: number },
  profileId: string,
): Promise<Stripe.PromotionCode> {
  const listed = await stripe().promotionCodes.list({ code: desired.code, limit: 1 });
  const existing = listed.data[0];
  if (existing) {
    const owner = existing.metadata?.affiliateProfileId;
    if (owner && owner !== profileId) {
      throw new Error(`discount code ${desired.code} already belongs to another affiliate`);
    }
    const existingCouponPct =
      typeof existing.coupon === "object" && existing.coupon ? existing.coupon.percent_off : null;
    if (existing.coupon?.id === couponId || existingCouponPct === desired.pct) {
      // Same affiliate + same percent (possibly a rebuilt coupon cache):
      // the existing code already delivers the right discount — revive it.
      if (!existing.active) {
        return stripe().promotionCodes.update(existing.id, { active: true });
      }
      return existing;
    }
    throw new Error(`discount code ${desired.code} exists with a mismatched coupon`);
  }
  return stripe().promotionCodes.create({
    coupon: couponId,
    code: desired.code,
    metadata: { affiliateProfileId: profileId, worldeye_discount_code: "1" },
  });
}

/**
 * Webhook fallback attribution: a buyer checked out with `promo` (a Stripe
 * promotion-code id or object from checkout.session.completed). If that
 * code is one of ours and the buyer has NO existing referral attribution,
 * link them to the owning affiliate through the standard mechanism.
 * Never overrides an existing attribution. Returns true when the buyer
 * ends up attributed to the code's affiliate.
 */
export async function attributeUserToDiscountAffiliate(
  referredUserId: string,
  promo: string | Stripe.PromotionCode,
): Promise<boolean> {
  const promoId = typeof promo === "string" ? promo : promo.id;
  let codeStr = typeof promo === "string" ? null : promo.code;

  let profile = await db.affiliateProfile.findFirst({
    where: { stripePromotionCodeId: promoId },
    select: { id: true },
  });

  if (!profile) {
    if (!codeStr) {
      try {
        const fetched = await stripe().promotionCodes.retrieve(promoId);
        codeStr = fetched.code;
      } catch {
        return false;
      }
    }
    if (codeStr) {
      profile =
        (await db.affiliateProfile.findFirst({
          where: { discountCode: codeStr },
          select: { id: true },
        })) ??
        (await db.affiliateProfile.findFirst({
          where: { discountCode: codeStr.toUpperCase() },
          select: { id: true },
        }));
    }
  }
  if (!profile) return false;

  const existing = await db.referralAttribution.findUnique({
    where: { referredUserId },
    select: { affiliateProfileId: true },
  });
  if (existing) return existing.affiliateProfileId === profile.id;

  const attr = await linkAttribution(referredUserId, profile.id);
  return !!attr && attr.affiliateProfileId === profile.id;
}
