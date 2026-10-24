// POST /api/affiliate/join — activate the free affiliate program for a user.
// Open to anyone legally eligible; no purchase required. Generates a unique
// RANDOM referral code with collision retries (lib/affiliate/referral-code;
// never derived from the member's name/email — see that module for why).
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { awardXP } from "@/lib/affiliate/xp";
import { mintReferralCode } from "@/lib/affiliate/referral-code";
import { audit } from "@/lib/affiliate/admin";
import { sendGrowthEvent, hashUserRef, utmFromRequest } from "@/lib/growth";

export const runtime = "nodejs";

/** A candidate is taken if any profile (either code field), any
 *  former-code alias, or any share identity already owns it —
 *  /ref resolves across all of them. */
async function codeTaken(candidate: string): Promise<boolean> {
  const [profile, identity, alias] = await Promise.all([
    db.affiliateProfile.findFirst({
      where: { OR: [{ referralCode: candidate }, { customCode: candidate }] },
      select: { id: true },
    }),
    db.shareIdentity.findUnique({ where: { code: candidate }, select: { id: true } }),
    db.referralCodeAlias.findUnique({ where: { code: candidate }, select: { id: true } }).catch(() => null),
  ]);
  return !!profile || !!identity || !!alias;
}

export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const existing = await db.affiliateProfile.findUnique({ where: { userId } });
  if (existing) return NextResponse.json({ profile: existing, joined: false });

  let code: string;
  try {
    code = await mintReferralCode(codeTaken);
  } catch {
    return NextResponse.json(
      { error: "Couldn't create your link just now — try again in a moment." },
      { status: 500 },
    );
  }

  // If this user was referred, their attribution already set recruitedBy —
  // re-apply it here in case the profile is created after attribution.
  const attr = await db.referralAttribution.findUnique({ where: { referredUserId: userId } });

  const profile = await db.affiliateProfile.create({
    data: {
      userId,
      referralCode: code,
      status: "active",
      recruitedByProfileId: attr && attr.affiliateProfileId ? attr.affiliateProfileId : null,
    },
  });

  await awardXP(profile.id, "join", { idempotencyKey: `join:${profile.id}` });
  // Email verified via a verified provider counts for the verify bonus.
  if (session.user?.email) {
    await awardXP(profile.id, "account_verified", { idempotencyKey: `verify:${profile.id}` });
  }
  await audit("affiliate.join", { actorUserId: userId, targetType: "AffiliateProfile", targetId: profile.id });

  // Growth Engine conversion event (no-op until configured; never blocks join).
  void sendGrowthEvent({
    type: "affiliate_signup",
    userRef: hashUserRef(userId),
    idempotencyKey: `affiliate:${profile.id}`,
    ...utmFromRequest(req),
  });

  return NextResponse.json({ profile, joined: true });
}
