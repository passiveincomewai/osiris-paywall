// ── Studio context: the single source every render/caption reads ───────
// Guarantees templates never invent data: code/link/rank all derive from
// the affiliate's real profile, settings, and user row.
import type { AffiliateProfile } from "@prisma/client";
import { db } from "@/lib/db";
import { referralLinkFor } from "@/lib/affiliate/brand";
import { getSettings } from "@/lib/affiliate/settings";
import { rankFor } from "@/lib/affiliate/ranks";
import type { StudioContext } from "./types";

export async function buildStudioContext(profile: AffiliateProfile): Promise<StudioContext> {
  const code = profile.customCode ?? profile.referralCode;
  const link = referralLinkFor(code);
  // Tiered discount codes (src/lib/affiliate/discount.ts): the profile
  // stores the code/pct, synced to a live Stripe promotion code by the
  // lazy /api/affiliate/me sync. Render the coupon ONLY when Stripe has
  // confirmed it (stripePromotionCodeId set) — a stored-but-unsynced code
  // does not redeem at checkout yet, so templates must not advertise it.
  const couponCode: string | null =
    profile.discountCode && profile.stripePromotionCodeId ? profile.discountCode : null;
  const discountPct: number | null = couponCode ? profile.discountPct : null;

  const user = await db.user.findUnique({
    where: { id: profile.userId },
    select: { name: true },
  });
  const displayName = user?.name ?? "";

  const settings = await getSettings();
  const rank = rankFor(profile.xp, settings.ranks);

  return {
    profileId: profile.id,
    userId: profile.userId,
    code,
    link,
    couponCode,
    discountPct,
    displayName,
    rankKey: rank.key,
    rankName: rank.name,
    xp: profile.xp,
    commissionPct: rank.commissionPct,
  };
}
