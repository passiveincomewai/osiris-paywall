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
  // No coupon/discount-code system exists (no coupon model, no Stripe
  // promotion codes are ever created — see marketing-studio PLAN.md §a.2),
  // so there is no valid code to render. Templates must hide discount
  // copy when this is null rather than inventing one.
  const couponCode: string | null = null;

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
    displayName,
    rankKey: rank.key,
    rankName: rank.name,
    xp: profile.xp,
    commissionPct: rank.commissionPct,
  };
}
