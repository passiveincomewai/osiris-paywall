// GET /api/affiliate/insights — the suite's deeper analytics, all from
// real ledger rows: range stats, funnel, retention, source breakdown,
// tracking-link performance, creative performance, rank ladder/history.
//
// Honesty rules:
//  • A dimension the click pipeline never captured is returned as
//    notTracked (country, per-creative signups) — never guessed.
//  • Click rows written before source capture existed carry NULL
//    referrer/UTM and are bucketed "Not tracked".
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/affiliate/settings";
import { rankFor } from "@/lib/affiliate/ranks";
import { referralLinkFor } from "@/lib/affiliate/brand";
import {
  bucketSeries, buildFunnel, countBy, platformFromReferrer,
  deviceFromUserAgent, osFromUserAgent, rankHistoryFromXpEvents,
  type DailyPoint, type Granularity,
} from "@/lib/affiliate/insights";
import { requireAffiliate } from "../_util";

export const runtime = "nodejs";

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 86400_000);
}

export async function GET(req: Request) {
  const { profile, error } = await requireAffiliate();
  if (error) return error;
  const pid = profile.id;
  const settings = await getSettings();
  const { searchParams } = new URL(req.url);
  const rangeParam = searchParams.get("range") ?? "30";
  const granularity = (["day", "week", "month"].includes(searchParams.get("granularity") ?? "")
    ? searchParams.get("granularity")
    : "day") as Granularity;

  const rangeDays = rangeParam === "all" ? null : rangeParam === "7" ? 7 : rangeParam === "90" ? 90 : 30;
  const since = rangeDays === null ? new Date(0) : daysAgo(rangeDays);

  const [
    windowClicks, allClicks, attributions, commissions, xpEvents, trackingLinks, creations,
  ] = await Promise.all([
    db.referralClick.findMany({
      where: { affiliateProfileId: pid, createdAt: { gte: since } },
      select: { createdAt: true, referrer: true, utmSource: true, utmMedium: true, utmCampaign: true, userAgent: true, trackingLinkId: true },
      take: 20000,
    }),
    db.referralClick.count({ where: { affiliateProfileId: pid } }),
    db.referralAttribution.findMany({
      where: { affiliateProfileId: pid },
      select: { id: true, referredUserId: true, createdAt: true, convertedAt: true, clickId: true },
    }),
    db.commission.findMany({
      where: { affiliateProfileId: pid, status: { not: "reversed" } },
      select: { amountCents: true, level: true, referredUserId: true, createdAt: true },
      take: 5000,
    }),
    db.xPEvent.findMany({
      where: { affiliateProfileId: pid },
      orderBy: { createdAt: "asc" },
      select: { xp: true, createdAt: true },
      take: 5000,
    }),
    db.affiliateTrackingLink.findMany({
      where: { affiliateProfileId: pid },
      orderBy: { createdAt: "asc" },
    }),
    db.studioCreation.findMany({
      where: { affiliateProfileId: pid },
      select: { kind: true, title: true, template: { select: { slug: true, title: true } } },
      take: 5000,
    }),
  ]);

  // ── Range totals (the stats header) ────────────────────────────────
  const windowAttributions = attributions.filter((a) => a.createdAt >= since);
  const windowCommissions = commissions.filter((c) => c.createdAt >= since);
  const rangeTotals = {
    clicks: windowClicks.length,
    signups: windowAttributions.length,
    conversions: windowAttributions.filter((a) => a.convertedAt && a.convertedAt >= since).length,
    earnedCents: windowCommissions.reduce((a, c) => a + c.amountCents, 0),
    range: rangeParam,
  };

  // ── Series (earnings + clicks, bucketed by granularity) ───────────
  const seriesDays = rangeDays ?? Math.min(366, Math.max(90, Math.ceil((Date.now() - profile.createdAt.getTime()) / 86400_000) + 1));
  const daily: DailyPoint[] = [];
  const allClickRows = rangeDays === null ? windowClicks : await db.referralClick.findMany({
    where: { affiliateProfileId: pid, createdAt: { gte: daysAgo(seriesDays) } },
    select: { createdAt: true },
  });
  for (let i = seriesDays - 1; i >= 0; i--) {
    const d = daysAgo(i);
    const next = daysAgo(i - 1);
    daily.push({
      date: d.toISOString().slice(0, 10),
      cents: commissions.filter((c) => c.createdAt >= d && c.createdAt < next).reduce((a, c) => a + c.amountCents, 0),
      clicks: allClickRows.filter((r) => r.createdAt >= d && r.createdAt < next).length,
    });
  }
  const series = bucketSeries(daily, granularity);

  // ── Funnel (all-time cohort: of the people who clicked, how far) ──
  const referredUserIds = attributions.map((a) => a.referredUserId);
  const subscriptions = referredUserIds.length
    ? await db.subscription.findMany({
        where: { userId: { in: referredUserIds } },
        select: { userId: true, status: true },
      })
    : [];
  const subByUser = new Map(subscriptions.map((s) => [s.userId, s.status]));
  const startedPlan = attributions.filter((a) => subByUser.has(a.referredUserId) || a.convertedAt).length;
  const paying = attributions.filter((a) => a.convertedAt).length;
  const funnel = buildFunnel([
    { key: "clicks", label: "Link clicks", count: allClicks },
    { key: "signups", label: "Signups", count: attributions.length },
    { key: "plans", label: "Started a plan (trial or paid)", count: startedPlan },
    { key: "paying", label: "Became paying subscribers", count: paying },
  ]);

  // ── Retention (current state of referred subscribers) ──────────────
  const payingReferralIds = new Set(
    commissions.filter((c) => c.level === 1 && c.referredUserId).map((c) => c.referredUserId as string),
  );
  let subActive = 0, subTrialing = 0, subPastDue = 0, subChurned = 0, subNone = 0;
  for (const uid of payingReferralIds) {
    const st = subByUser.get(uid);
    if (st === "active") subActive++;
    else if (st === "trialing") subTrialing++;
    else if (st === "past_due" || st === "unpaid") subPastDue++;
    else if (st) subChurned++;
    else subNone++;
  }
  const everStartedPlan = attributions.filter((a) => subByUser.has(a.referredUserId)).length;
  const retention = {
    referredSubscribers: payingReferralIds.size,
    currentlyPaying: subActive,
    currentlyTrialing: subTrialing,
    pastDue: subPastDue,
    churned: subChurned + subNone,
    trialToPaidPct: everStartedPlan > 0 ? Math.round((paying / everStartedPlan) * 1000) / 10 : 0,
    note: "States are each referred subscriber's current subscription status. \"Churned\" counts subscribers whose plan has ended (or whose subscription record is gone) after having paid at least once.",
  };

  // ── Sources (from captured referrer / UTM / user-agent only) ──────
  const trackedClicks = windowClicks.filter((c) => c.referrer !== null || c.utmSource !== null);
  const sources = {
    byPlatform: countBy(windowClicks, (c) => platformFromReferrer(c.referrer)),
    byUtmSource: countBy(windowClicks, (c) => c.utmSource ?? "Not tracked"),
    byUtmCampaign: countBy(windowClicks, (c) => c.utmCampaign ?? "Not tracked"),
    byDevice: countBy(windowClicks, (c) => deviceFromUserAgent(c.userAgent)),
    byOs: countBy(windowClicks, (c) => osFromUserAgent(c.userAgent)),
    trackedShare: windowClicks.length > 0 ? Math.round((trackedClicks.length / windowClicks.length) * 1000) / 10 : 0,
    country: { tracked: false, note: "Country is not captured for referral clicks, so no country breakdown is shown." },
  };

  // ── Tracking links (per-link clicks + signups via click chain) ────
  const clickById = new Map<string, string | null>();
  const allClickIdRows = await db.referralClick.findMany({
    where: { affiliateProfileId: pid },
    select: { id: true, trackingLinkId: true },
    take: 20000,
  });
  for (const c of allClickIdRows) clickById.set(c.id, c.trackingLinkId);
  const signupsByLink = new Map<string, number>();
  let primarySignups = 0;
  for (const a of attributions) {
    const linkId = a.clickId ? clickById.get(a.clickId) : undefined;
    if (linkId) signupsByLink.set(linkId, (signupsByLink.get(linkId) ?? 0) + 1);
    else primarySignups++;
  }
  const code = profile.customCode ?? profile.referralCode;
  const links = [
    {
      id: null as string | null,
      label: "Primary link",
      slug: code,
      url: referralLinkFor(code),
      clicks: allClickIdRows.filter((c) => !c.trackingLinkId).length,
      signups: primarySignups,
      primary: true,
    },
    ...trackingLinks.map((l) => ({
      id: l.id as string | null,
      label: l.label,
      slug: l.slug,
      url: `${referralLinkFor(code)}?t=${l.slug}`,
      clicks: allClickIdRows.filter((c) => c.trackingLinkId === l.id).length,
      signups: signupsByLink.get(l.id) ?? 0,
      primary: false,
    })),
  ];

  // ── Creative performance ───────────────────────────────────────────
  const creativeMap = new Map<string, { templateSlug: string; kind: string; creations: number }>();
  for (const c of creations) {
    const name = c.template?.title ?? c.template?.slug ?? "Custom creation";
    const key = `${name}|${c.kind ?? "image"}`;
    const cur = creativeMap.get(key) ?? { templateSlug: name, kind: c.kind ?? "image", creations: 0 };
    cur.creations++;
    creativeMap.set(key, cur);
  }
  const creative = {
    rows: [...creativeMap.values()].sort((a, b) => b.creations - a.creations).map((r) => ({
      ...r,
      // No creation→click linkage exists in the pipeline, so per-creative
      // signups are honestly zero/not tracked rather than estimated.
      signups: 0,
      signupsTracked: false,
    })),
    totalCreations: creations.length,
    note: "Creations are counted from your Studio library. Signups per creative aren't tracked yet — creations don't carry a per-creative tag into the click pipeline — so that column reads 0 rather than guessing.",
  };

  // ── Rank ladder + history ──────────────────────────────────────────
  const rank = rankFor(profile.xp, settings.ranks);
  const ladder = settings.ranks.map((r) => ({
    key: r.key, name: r.name, minXp: r.minXp, commissionPct: r.commissionPct, discountPct: r.discountPct,
    color: r.color, badge: r.badge,
    unlocks: [
      `${r.commissionPct}% direct commission`,
      `Audience discount code: ${r.discountPct}% off`,
      ...(r.key === "visionary" ? ["Free WorldEye Pro while you hold the rank"] : []),
    ],
    reached: profile.xp >= r.minXp,
    current: rank.key === r.key,
  }));
  const rankHistory = rankHistoryFromXpEvents(xpEvents, settings.ranks);

  return NextResponse.json({
    rangeTotals,
    series,
    granularity,
    funnel,
    retention,
    sources,
    links,
    creative,
    ladder,
    rankHistory,
  });
}
