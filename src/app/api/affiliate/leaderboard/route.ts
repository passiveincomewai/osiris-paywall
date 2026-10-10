// GET /api/affiliate/leaderboard — public rankings (opt-out respected).
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/affiliate/settings";
import { rankFor } from "@/lib/affiliate/ranks";

export const runtime = "nodejs";

export async function GET() {
  const settings = await getSettings();
  const monthStart = new Date();
  monthStart.setUTCDate(1); monthStart.setUTCHours(0, 0, 0, 0);
  const weekStart = new Date(Date.now() - 7 * 86400_000);

  const profiles = await db.affiliateProfile.findMany({
    where: { status: "active", leaderboardOptOut: false },
    include: { user: { select: { name: true, image: true } } },
    take: 500,
  });
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

  const payingThisMonth = monthComms
    .map((m) => ({ ...row(m.affiliateProfileId), payingReferrals: m._count.referredUserId, revenueCents: m._sum.amountCents ?? 0 }))
    .sort((a, b) => b.payingReferrals - a.payingReferrals || b.revenueCents - a.revenueCents)
    .slice(0, 25);
  const topRevenue = [...monthComms]
    .map((m) => ({ ...row(m.affiliateProfileId), revenueCents: m._sum.amountCents ?? 0 }))
    .sort((a, b) => b.revenueCents - a.revenueCents)
    .slice(0, 25);
  const topXp = [...profiles]
    .sort((a, b) => b.xp - a.xp)
    .slice(0, 25)
    .map((p) => row(p.id));
  const wealth = new Map(allComms.map((m) => [m.affiliateProfileId, m._sum.amountCents ?? 0]));
  const allTime = [...profiles]
    .map((p) => ({ ...row(p.id), revenueCents: wealth.get(p.id) ?? 0 }))
    .sort((a, b) => b.revenueCents - a.revenueCents)
    .slice(0, 25);
  const growth = monthClicks
    .map((m) => ({ ...row(m.affiliateProfileId), clicks: m._count }))
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 25);

  return NextResponse.json({ payingThisMonth, topRevenue, topXp, allTime, growth });
}
