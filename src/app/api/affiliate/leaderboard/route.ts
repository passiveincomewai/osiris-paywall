// GET /api/affiliate/leaderboard — public rankings (opt-out respected).
// Signed-in affiliates also get their own standing (position + figures)
// for the monthly and all-time boards, even outside the top 25 — unless
// they've opted out of the leaderboard, in which case they're told so.
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/affiliate/settings";
import { rankFor } from "@/lib/affiliate/ranks";

export const runtime = "nodejs";

export async function GET() {
  const settings = await getSettings();
  const monthStart = new Date();
  monthStart.setUTCDate(1); monthStart.setUTCHours(0, 0, 0, 0);
  const weekStart = new Date(Date.now() - 7 * 86400_000);

  const allProfiles = await db.affiliateProfile.findMany({
    where: { status: "active", leaderboardOptOut: false },
    include: { user: { select: { name: true, image: true } } },
    take: 500,
  });
  // Account-level privacy (settings item 18): a user who turned their
  // public profile off is hidden from public rankings even when their
  // affiliate-level leaderboard opt-out is off. Users with no
  // preference row keep the default (public).
  const hiddenUserIds = new Set(
    (
      await db.userPreference
        .findMany({
          where: { userId: { in: allProfiles.map((p) => p.userId) }, publicProfile: false },
          select: { userId: true },
        })
        .catch(() => [])
    ).map((r) => r.userId),
  );
  const profiles = allProfiles.filter((p) => !hiddenUserIds.has(p.userId));
  const ids = profiles.map((p) => p.id);

  const [monthComms, allComms, monthClicks] = await Promise.all([
    db.commission.groupBy({
      by: ["affiliateProfileId"],
      where: { affiliateProfileId: { in: ids }, level: 1, status: { not: "reversed" }, createdAt: { gte: monthStart } },
      _sum: { amountCents: true },
      _count: { referredUserId: true },
    }),
    db.commission.groupBy({
      by: ["affiliateProfileId"],
      where: { affiliateProfileId: { in: ids }, status: { not: "reversed" } },
      _sum: { amountCents: true },
    }),
    db.referralClick.groupBy({
      by: ["affiliateProfileId"],
      where: { affiliateProfileId: { in: ids }, createdAt: { gte: weekStart } },
      _count: true,
    }),
  ]);

  const byId = new Map(profiles.map((p) => [p.id, p]));
  const row = (id: string) => {
    const p = byId.get(id)!;
    const rank = rankFor(p.xp, settings.ranks);
    return {
      id, name: p.user.name ?? "Anonymous operative", image: p.user.image,
      rank: rank.name, rankColor: rank.color, badge: rank.badge, xp: p.xp,
    };
  };

  const payingFull = monthComms
    .map((m) => ({ ...row(m.affiliateProfileId), payingReferrals: m._count.referredUserId, revenueCents: m._sum.amountCents ?? 0 }))
    .sort((a, b) => b.payingReferrals - a.payingReferrals || b.revenueCents - a.revenueCents);
  const payingThisMonth = payingFull.slice(0, 25);
  const topRevenue = [...monthComms]
    .map((m) => ({ ...row(m.affiliateProfileId), revenueCents: m._sum.amountCents ?? 0 }))
    .sort((a, b) => b.revenueCents - a.revenueCents)
    .slice(0, 25);
  const topXp = [...profiles]
    .sort((a, b) => b.xp - a.xp)
    .slice(0, 25)
    .map((p) => row(p.id));
  const wealth = new Map(allComms.map((m) => [m.affiliateProfileId, m._sum.amountCents ?? 0]));
  const allTimeFull = [...profiles]
    .map((p) => ({ ...row(p.id), revenueCents: wealth.get(p.id) ?? 0 }))
    .sort((a, b) => b.revenueCents - a.revenueCents);
  const allTime = allTimeFull.slice(0, 25);
  const growth = monthClicks
    .map((m) => ({ ...row(m.affiliateProfileId), clicks: m._count }))
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 25);

  // Own standing (signed-in affiliates only; opt-out honored — an opted-
  // out affiliate is not ranked anywhere, including privately here).
  let mine: {
    optedOut: boolean;
    monthly: { position: number; of: number; row: (typeof payingFull)[number] } | null;
    allTime: { position: number; of: number; row: (typeof allTimeFull)[number] } | null;
  } | null = null;
  const session = await auth().catch(() => null);
  const userId = session?.user?.id;
  if (userId) {
    const me = await db.affiliateProfile.findUnique({
      where: { userId },
      select: { id: true, leaderboardOptOut: true },
    });
    if (me) {
      if (me.leaderboardOptOut) {
        mine = { optedOut: true, monthly: null, allTime: null };
      } else {
        const mi = payingFull.findIndex((r) => r.id === me.id);
        const ai = allTimeFull.findIndex((r) => r.id === me.id);
        mine = {
          optedOut: false,
          monthly: mi >= 0 ? { position: mi + 1, of: payingFull.length, row: payingFull[mi] } : null,
          allTime: ai >= 0 ? { position: ai + 1, of: allTimeFull.length, row: allTimeFull[ai] } : null,
        };
      }
    }
  }

  return NextResponse.json({ payingThisMonth, topRevenue, topXp, allTime, growth, mine });
}
