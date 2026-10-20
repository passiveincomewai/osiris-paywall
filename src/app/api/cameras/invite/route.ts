// GET /api/cameras/invite — what the camera-limit popup's invite
// section needs: the user's referral code (null until they provision
// one via POST /api/affiliate/join — the affiliate program's own
// lightweight path, reused rather than forked) as a full /ref link,
// plus their current bonus balance for the honest state line.
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { appUrl } from "@/lib/stripe";
import { getCameraBonusBalance } from "@/lib/camera-bonus";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const profile = await db.affiliateProfile.findUnique({
    where: { userId },
    select: { referralCode: true, customCode: true, status: true },
  });
  const code =
    profile?.status === "active"
      ? (profile.customCode ?? profile.referralCode)
      : null;

  return NextResponse.json({
    code,
    link: code ? `${appUrl()}/ref/${code}` : null,
    balance: await getCameraBonusBalance(userId),
  });
}
