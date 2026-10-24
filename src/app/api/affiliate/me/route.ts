// GET /api/affiliate/me — profile, rank, referral link.
import { NextResponse } from "next/server";
import { getSettings } from "@/lib/affiliate/settings";
import { rankFor, nextRank, rankProgress } from "@/lib/affiliate/ranks";
import { referralLinkFor } from "@/lib/affiliate/brand";
import { ensureDiscountCode } from "@/lib/affiliate/discount";
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
  // Tiered discount code: lazy sync — the code materializes / rotates to
  // the current rank the next time the affiliate loads a surface. Never
  // throws; without Stripe configured it reports "pending_config".
  const discount = await ensureDiscountCode(profile).catch(() => null);
  return NextResponse.json({
    discount: discount
      ? { code: discount.code, pct: discount.pct, synced: discount.synced, status: discount.status }
      : null,
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
      payoutThresholdCents: profile.payoutThresholdCents,
      directorEnabled: profile.directorEnabled,
      createdAt: profile.createdAt,
    },
    // The threshold a payout request must clear: the affiliate's own
    // threshold when set, never below the program minimum.
    effectiveMinPayoutCents: Math.max(settings.minPayoutCents, profile.payoutThresholdCents ?? 0),
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
    payoutThresholdCents?: number | null; directorEnabled?: boolean;
  };
  const data: Record<string, unknown> = {};
  if (typeof body.leaderboardOptOut === "boolean") data.leaderboardOptOut = body.leaderboardOptOut;
  if (typeof body.payoutEmail === "string") data.payoutEmail = body.payoutEmail.slice(0, 120);
  if (typeof body.payoutMethod === "string") data.payoutMethod = body.payoutMethod.slice(0, 30);
  if (typeof body.directorEnabled === "boolean") data.directorEnabled = body.directorEnabled;
  if (body.payoutThresholdCents === null) {
    data.payoutThresholdCents = null;
  } else if (typeof body.payoutThresholdCents === "number" && Number.isFinite(body.payoutThresholdCents)) {
    // Personal threshold: whole cents, never below the program minimum.
    const settings = await getSettings();
    const cents = Math.round(body.payoutThresholdCents);
    if (cents < settings.minPayoutCents) {
      return NextResponse.json(
        { error: `Your payout threshold can't be below the $${(settings.minPayoutCents / 100).toFixed(2)} program minimum.` },
        { status: 400 },
      );
    }
    data.payoutThresholdCents = Math.min(cents, 100_000_00); // cap $100k sanity
  }
  const updated = await db.affiliateProfile.update({ where: { id: profile.id }, data });
  void userId;
  return NextResponse.json({
    leaderboardOptOut: updated.leaderboardOptOut,
    payoutEmail: updated.payoutEmail,
    payoutMethod: updated.payoutMethod,
    payoutThresholdCents: updated.payoutThresholdCents,
    directorEnabled: updated.directorEnabled,
  });
}
