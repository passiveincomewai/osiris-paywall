import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { appUrl } from "@/lib/stripe";

export const runtime = "nodejs";

export const INVITE_GOAL = 3;

/**
 * GET /api/affiliate/invite-status — powers the header "Invite a friend n/3"
 * tracker. Returns the caller's invite progress. Does NOT auto-join: if the
 * user hasn't activated affiliates, the client offers a one-tap join.
 */
export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const profile = await db.affiliateProfile.findUnique({
    where: { userId },
    select: { id: true, referralCode: true, customCode: true, status: true, directorEnabled: true },
  });

  if (!profile) {
    return NextResponse.json({ joined: false, invites: 0, goal: INVITE_GOAL, directorEnabled: false });
  }

  const invites = await db.referralAttribution.count({
    where: { affiliateProfileId: profile.id },
  });

  const code = profile.customCode ?? profile.referralCode;

  return NextResponse.json({
    joined: true,
    invites,
    goal: INVITE_GOAL,
    referralCode: code,
    referralLink: `${appUrl()}/ref/${code}`,
    // Cinematic Director switch (affiliate panel): the globe's director
    // tools stay off unless the affiliate turned them on. Default false.
    directorEnabled: profile.status === "active" ? profile.directorEnabled : false,
  });
}
