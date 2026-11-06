// GET /api/invite/summary — the Settings invite panel's data: the
// user's personal /ref link (same code and provisioning as the
// camera popup's invite section, GET /api/cameras/invite) plus their
// invite-a-friend Pro-days numbers from lib/invite-pro: friends
// joined, friends verified, Pro days earned, banked days, and this
// month's rewarded count against the cap.
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { appUrl } from "@/lib/stripe";
import { getInviteProSummary } from "@/lib/invite-pro";

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

  const summary = await getInviteProSummary(userId);
  return NextResponse.json({
    code,
    link: code ? `${appUrl()}/ref/${code}` : null,
    ...summary,
  });
}
