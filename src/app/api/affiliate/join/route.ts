// POST /api/affiliate/join — activate the free affiliate program for a user.
// Open to anyone legally eligible; no purchase required. Generates a unique
// referral code from their name/email with collision retries.
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { awardXP } from "@/lib/affiliate/xp";
import { REF_CODE_RE } from "@/lib/affiliate/attribution";
import { audit } from "@/lib/affiliate/admin";
import { sendGrowthEvent, hashUserRef, utmFromRequest } from "@/lib/growth";

export const runtime = "nodejs";

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 16) || "agent";
}

async function uniqueCode(base: string): Promise<string> {
  for (let i = 0; i < 12; i++) {
    const candidate = i === 0 ? base : `${base}${Math.floor(100 + Math.random() * 900)}`;
    if (!REF_CODE_RE.test(candidate)) continue;
    const taken = await db.affiliateProfile.findFirst({
      where: { OR: [{ referralCode: candidate }, { customCode: candidate }] },
      select: { id: true },
    });
    if (!taken) return candidate;
  }
  return `agent${Date.now().toString(36)}`;
}

export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const existing = await db.affiliateProfile.findUnique({ where: { userId } });
  if (existing) return NextResponse.json({ profile: existing, joined: false });

  const base = slugify(session.user?.name || session.user?.email?.split("@")[0] || "agent");
  const code = await uniqueCode(base);

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
