// GET /api/affiliate/dashboard — full dashboard aggregates (real data only).
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/affiliate/settings";
import { rankFor } from "@/lib/affiliate/ranks";
import { releaseMaturedCommissions } from "@/lib/affiliate/commissions";
import { requireAffiliate } from "../_util";

export const runtime = "nodejs";

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 86400_000);
}

export async function GET(req: Request) {
  const { profile, error } = await requireAffiliate();
  if (error) return error;

  // Promote matured commissions lazily so balances are always current.
  await releaseMaturedCommissions().catch(() => {});

  const settings = await getSettings();
  const rank = rankFor(profile.xp, settings.ranks);
  const { searchParams } = new URL(req.url);
  const range = searchParams.get("range") ?? "30";

  const pid = profile.id;
  const [
    commissions,
    payouts,
    clicks,
    attributions,
    xpEvents,
    recruits,
  ] = await Promise.all([
    db.commission.findMany({ where: { affiliateProfileId: pid }, orderBy: { createdAt: "desc" }, take: 500 }),
    db.payout.findMany({ where: { affiliateProfileId: pid }, orderBy: { requestedAt: "desc" }, take: 50 }),
    // All-time on purpose: the stat row is all-time (lifetime earnings,
    // direct referrals, conversion %), so a range-windowed click count
    // would be internally inconsistent. The range only drives the chart.
    db.referralClick.count({ where: { affiliateProfileId: pid } }),
    db.referralAttribution.findMany({ where: { affiliateProfileId: pid }, select: { referredUserId: true, convertedAt: true, createdAt: true } }),
    db.xPEvent.findMany({ where: { affiliateProfileId: pid }, orderBy: { createdAt: "desc" }, take: 100 }),
    db.affiliateProfile.count({ where: { recruitedByProfileId: pid } }),
  ]);

  const live = commissions.filter((c) => c.status !== "reversed");
  const sum = (rows: typeof live) => rows.reduce((a, c) => a + c.amountCents, 0);
  const lifetimeCents = sum(live);
  const availableCents = sum(live.filter((c) => c.status === "available"));
  const pendingCents = sum(live.filter((c) => c.status === "pending"));
  const paidCents = sum(live.filter((c) => c.status === "paid"));

  // Estimated recurring monthly: commissions from the last 90d, monthly-normalized.
  const cutoff90 = daysAgo(90);
  const recent = live.filter((c) => c.createdAt >= cutoff90);
  const estimatedMonthlyCents = Math.round((sum(recent) / 90) * 30);

  // Active paying referrals: distinct L1 users with a live commission.
  const activePaying = new Set(
    live.filter((c) => c.level === 1 && c.referredUserId).map((c) => c.referredUserId as string),
  );
  const directRefs = attributions.length;
  const convertedRefs = attributions.filter((a) => a.convertedAt).length;
  const indirectRefs = recruits;

  // Daily earnings series for the chart. "all" spans the affiliate's whole
  // history (bounded to a year of daily points so the loop stays cheap);
  // the fixed ranges span exactly their window.
  const days = range === "all"
    ? Math.min(366, Math.max(90, Math.ceil((Date.now() - profile.createdAt.getTime()) / 86400_000) + 1))
    : range === "7" ? 7 : range === "90" ? 90 : 30;
  const series: { date: string; cents: number; clicks: number }[] = [];
  const clickRows = await db.referralClick.findMany({
    where: { affiliateProfileId: pid, createdAt: { gte: daysAgo(days) } },
    select: { createdAt: true },
  });
  for (let i = days - 1; i >= 0; i--) {
    const d = daysAgo(i);
    const key = d.toISOString().slice(0, 10);
    const next = daysAgo(i - 1);
    const cents = live
      .filter((c) => c.createdAt >= d && c.createdAt < next)
      .reduce((a, c) => a + c.amountCents, 0);
    const dayClicks = clickRows.filter((r) => r.createdAt >= d && r.createdAt < next).length;
    series.push({ date: key, cents, clicks: dayClicks });
  }

  return NextResponse.json({
    rank,
    totals: {
      lifetimeCents,
      availableCents,
      pendingCents,
      paidOutCents: paidCents,
      estimatedMonthlyCents,
      activePayingReferrals: activePaying.size,
      directReferrals: directRefs,
      convertedReferrals: convertedRefs,
      indirectReferrals: indirectRefs,
      clicks,
      conversionPct: directRefs > 0 ? Math.round((convertedRefs / directRefs) * 1000) / 10 : 0,
    },
    series,
    commissions: commissions.slice(0, 100).map((c) => ({
      id: c.id, level: c.level, amountCents: c.amountCents, currency: c.currency,
      status: c.status, availableAt: c.availableAt, createdAt: c.createdAt,
    })),
    payouts: payouts.map((p) => ({
      id: p.id, amountCents: p.amountCents, status: p.status, method: p.method,
      requestedAt: p.requestedAt, decidedAt: p.decidedAt, note: p.note,
    })),
    xpEvents: xpEvents.map((e) => ({ activity: e.activity, xp: e.xp, createdAt: e.createdAt })),
    settings: {
      holdingPeriodDays: settings.holdingPeriodDays,
      minPayoutCents: settings.minPayoutCents,
    },
  });
}
