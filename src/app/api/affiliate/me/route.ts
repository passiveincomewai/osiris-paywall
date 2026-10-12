// GET /api/affiliate/me — profile, rank, referral link.
import { NextResponse } from "next/server";
import { getSettings } from "@/lib/affiliate/settings";
import { rankFor, nextRank, rankProgress } from "@/lib/affiliate/ranks";
import { referralLinkFor } from "@/lib/affiliate/brand";
import { db } from "@/lib/db";
import { requireAffiliate } from "../_util";

export const runtime = "nodejs";

export async function GET() {
  const { profile, error } = await requireAffiliate();
  if (error) return error;
  const settings = await getSettings();
  const rank = rankFor(profile.xp, settings.ranks);
  const nxt = nextRank(profile.xp, settings.ranks);
  const code = profile.customCode ?? profile.referralCode;
  // Latest creator free-Pro application (drives the dashboard status card).
  const creatorApp = await db.creatorApplication.findFirst({
    where: { userId: profile.userId },
    orderBy: { createdAt: "desc" },
    select: { platform: true, handle: true, followers: true, status: true, createdAt: true, reviewedAt: true },
  });
  return NextResponse.json({
    creatorApplication: creatorApp
      ? {
          ...creatorApp,
          createdAt: creatorApp.createdAt.toISOString(),
          reviewedAt: creatorApp.reviewedAt?.toISOString() ?? null,
        }
      : null,
    profile: {
      id: profile.id,
      referralCode: profile.referralCode,
      customCode: profile.customCode,
      status: profile.status,
      xp: profile.xp,
      leaderboardOptOut: profile.leaderboardOptOut,
      payoutEmail: profile.payoutEmail,
      payoutMethod: profile.payoutMethod,
      createdAt: profile.createdAt,
    },
    rank,
    nextRank: nxt,
    progress: rankProgress(profile.xp, settings.ranks),
    referralLink: referralLinkFor(code),
    ranks: settings.ranks,
  });
}

export async function PATCH(req: Request) {
  const { profile, error, userId } = await requireAffiliate();
  if (error || !profile) return error ?? NextResponse.json({ error: "Not an affiliate" }, { status: 404 });
  const body = (await req.json().catch(() => ({}))) as {
    leaderboardOptOut?: boolean; payoutEmail?: string; payoutMethod?: string;
  };
  const data: Record<string, unknown> = {};
  if (typeof body.leaderboardOptOut === "boolean") data.leaderboardOptOut = body.leaderboardOptOut;
  if (typeof body.payoutEmail === "string") data.payoutEmail = body.payoutEmail.slice(0, 120);
  if (typeof body.payoutMethod === "string") data.payoutMethod = body.payoutMethod.slice(0, 30);
  const updated = await db.affiliateProfile.update({ where: { id: profile.id }, data });
  void userId;
  return NextResponse.json({
    leaderboardOptOut: updated.leaderboardOptOut,
    payoutEmail: updated.payoutEmail,
    payoutMethod: updated.payoutMethod,
  });
}
