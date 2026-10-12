// ── Studio analytics: per-affiliate stats, leaderboard, admin report ────
// All numbers are computed from real ledger tables (creations, jobs,
// credit ledger, XP events, clicks/attributions/commissions) — never
// from client-supplied values.

import { db } from "@/lib/db";
import { countPayingReferrals } from "@/lib/affiliate/xp";

// XP activities that count as "Studio XP": Studio awards (`studio*`,
// which includes `studio_badge`), legacy badge activities (`badge:*`),
// and monthly Studio challenge completions (`challenge:monthly-studio*`).
const STUDIO_XP_OR = [
  { activity: { startsWith: "studio" } },
  { activity: { startsWith: "badge:" } },
  { activity: { startsWith: "challenge:monthly-studio" } },
] as const;

// ── Pure helpers ──────────────────────────────────────────────────────────

/** Pure: UTC month window containing `now`. `end` is exclusive. */
export function monthWindowUtc(now: Date): { start: Date; end: Date; month: string } {
  const year = now.getUTCFullYear();
  const monthIdx = now.getUTCMonth();
  const start = new Date(Date.UTC(year, monthIdx, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, monthIdx + 1, 1, 0, 0, 0, 0));
  const month = `${String(year).padStart(4, "0")}-${String(monthIdx + 1).padStart(2, "0")}`;
  return { start, end, month };
}

export interface LeaderboardRow {
  profileId: string;
  name: string;
  creations: number;
  xpEarned: number;
  campaignsCompleted: number;
}

export interface LeaderboardEntry extends LeaderboardRow {
  rank: number;
}

/**
 * Pure: sort by creations desc, then xpEarned desc, then
 * campaignsCompleted desc; assign sequential ranks; cap at 25.
 */
export function rankLeaderboard(rows: LeaderboardRow[]): LeaderboardEntry[] {
  const sorted = [...rows].sort((a, b) => {
    if (b.creations !== a.creations) return b.creations - a.creations;
    if (b.xpEarned !== a.xpEarned) return b.xpEarned - a.xpEarned;
    if (b.campaignsCompleted !== a.campaignsCompleted) {
      return b.campaignsCompleted - a.campaignsCompleted;
    }
    return 0;
  });
  return sorted.slice(0, 25).map((row, i) => ({ ...row, rank: i + 1 }));
}

// ── Per-affiliate analytics ───────────────────────────────────────────────

export async function getAffiliateStudioAnalytics(profileId: string) {
  const [
    creationsTotal,
    creationsByKindRows,
    renders,
    earnedAgg,
    spentAgg,
    account,
    studioXpAgg,
    participations,
    clicks,
    signups,
    payingReferrals,
    commissionsAgg,
  ] = await Promise.all([
    db.studioCreation.count({ where: { affiliateProfileId: profileId } }),
    db.studioCreation.groupBy({
      by: ["kind"],
      where: { affiliateProfileId: profileId },
      _count: { _all: true },
    }),
    db.generationJob.count({
      where: {
        profileId,
        kind: { in: ["image_render", "video_personalize", "video_template"] },
        status: "done",
      },
    }),
    db.studioCreditLedger.aggregate({
      where: { profileId, delta: { gt: 0 } },
      _sum: { delta: true },
    }),
    db.studioCreditLedger.aggregate({
      where: { profileId, delta: { lt: 0 } },
      _sum: { delta: true },
    }),
    db.studioCreditAccount.findUnique({ where: { profileId } }),
    db.xPEvent.aggregate({
      where: { affiliateProfileId: profileId, OR: [...STUDIO_XP_OR] },
      _sum: { xp: true },
    }),
    db.studioCampaignParticipation.findMany({
      where: { profileId },
      include: { campaign: { select: { name: true, status: true } } },
      orderBy: { joinedAt: "desc" },
    }),
    db.referralClick.count({ where: { affiliateProfileId: profileId } }),
    db.referralAttribution.count({ where: { affiliateProfileId: profileId } }),
    countPayingReferrals(profileId),
    db.commission.aggregate({
      where: { affiliateProfileId: profileId, level: 1, status: { not: "reversed" } },
      _sum: { amountCents: true },
    }),
  ]);

  const byKind: Record<string, number> = {};
  for (const row of creationsByKindRows) {
    byKind[row.kind] = row._count._all;
  }

  return {
    creations: { total: creationsTotal, byKind },
    renders,
    credits: {
      earned: earnedAgg._sum.delta ?? 0,
      spent: -(spentAgg._sum.delta ?? 0),
      balance: account?.balance ?? 0,
    },
    studioXp: studioXpAgg._sum.xp ?? 0,
    campaigns: participations.map((p) => ({
      campaignId: p.campaignId,
      name: p.campaign.name,
      status: p.campaign.status,
      joinedAt: p.joinedAt,
      completedAt: p.completedAt,
      postUrl: p.postUrl,
      reviewStatus: p.reviewStatus,
    })),
    referrals: {
      clicks,
      signups,
      payingReferrals,
      commissionsCents: commissionsAgg._sum.amountCents ?? 0,
    },
  };
}

// ── Leaderboard ───────────────────────────────────────────────────────────

async function buildLeaderboardRows(now: Date): Promise<LeaderboardRow[]> {
  const { start, end } = monthWindowUtc(now);
  const inWindow = { gte: start, lt: end };

  const [creationRows, xpRows, campaignRows] = await Promise.all([
    db.studioCreation.groupBy({
      by: ["affiliateProfileId"],
      where: { createdAt: inWindow },
      _count: { _all: true },
    }),
    db.xPEvent.groupBy({
      by: ["affiliateProfileId"],
      where: { createdAt: inWindow, OR: [...STUDIO_XP_OR] },
      _sum: { xp: true },
    }),
    db.studioCampaignParticipation.groupBy({
      by: ["profileId"],
      where: { completedAt: inWindow },
      _count: { _all: true },
    }),
  ]);

  const creationsBy = new Map(creationRows.map((r) => [r.affiliateProfileId, r._count._all]));
  const xpBy = new Map(xpRows.map((r) => [r.affiliateProfileId, r._sum.xp ?? 0]));
  const campaignsBy = new Map(campaignRows.map((r) => [r.profileId, r._count._all]));

  const ids = new Set<string>([
    ...creationsBy.keys(),
    ...xpBy.keys(),
    ...campaignsBy.keys(),
  ]);
  if (ids.size === 0) return [];

  const profiles = await db.affiliateProfile.findMany({
    where: { id: { in: [...ids] } },
    select: {
      id: true,
      leaderboardOptOut: true,
      user: { select: { name: true } },
    },
  });

  const rows: LeaderboardRow[] = [];
  for (const p of profiles) {
    if (p.leaderboardOptOut) continue;
    rows.push({
      profileId: p.id,
      name: p.user?.name ?? "Affiliate",
      creations: creationsBy.get(p.id) ?? 0,
      xpEarned: xpBy.get(p.id) ?? 0,
      campaignsCompleted: campaignsBy.get(p.id) ?? 0,
    });
  }
  return rows;
}

export async function getStudioLeaderboard(now: Date = new Date()) {
  const { month } = monthWindowUtc(now);
  const rows = await buildLeaderboardRows(now);
  const entries = rankLeaderboard(rows);
  return { month, entries };
}

/**
 * The caller's own leaderboard entry for the current month — used by the
 * leaderboard route when the caller is outside the published top 25
 * (or has opted out of the published list). `rank` is null because the
 * caller is not in the published ranking.
 */
export interface OwnLeaderboardEntry extends Omit<LeaderboardEntry, "rank"> {
  rank: number | null;
}

export async function getOwnLeaderboardEntry(
  profileId: string,
  now: Date = new Date(),
): Promise<OwnLeaderboardEntry | null> {
  const { start, end } = monthWindowUtc(now);
  const inWindow = { gte: start, lt: end };
  const [profile, creations, xpAgg, campaignsCompleted] = await Promise.all([
    db.affiliateProfile.findUnique({
      where: { id: profileId },
      select: { user: { select: { name: true } } },
    }),
    db.studioCreation.count({
      where: { affiliateProfileId: profileId, createdAt: inWindow },
    }),
    db.xPEvent.aggregate({
      where: { affiliateProfileId: profileId, createdAt: inWindow, OR: [...STUDIO_XP_OR] },
      _sum: { xp: true },
    }),
    db.studioCampaignParticipation.count({
      where: { profileId, completedAt: inWindow },
    }),
  ]);
  if (!profile) return null;
  return {
    rank: null,
    profileId,
    name: profile.user?.name ?? "Affiliate",
    creations,
    xpEarned: xpAgg._sum.xp ?? 0,
    campaignsCompleted,
  };
}

// ── Admin report (last 30 days) ───────────────────────────────────────────

export async function getStudioAdminReport(now: Date = new Date()) {
  const since = new Date(now.getTime() - 30 * 86400_000);
  const inWindow = { gte: since };

  const [
    creationsByKindRows,
    issuedRows,
    consumedAgg,
    refundedAgg,
    campaignRewardsAgg,
    topTemplateRows,
    topCreatorRows,
    campaignRows,
    badgeRows,
  ] = await Promise.all([
    db.studioCreation.groupBy({
      by: ["kind"],
      where: { createdAt: inWindow },
      _count: { _all: true },
    }),
    db.studioCreditLedger.groupBy({
      by: ["reason"],
      where: { createdAt: inWindow, delta: { gt: 0 } },
      _sum: { delta: true },
    }),
    db.studioCreditLedger.aggregate({
      where: { createdAt: inWindow, reason: "generation_charge", delta: { lt: 0 } },
      _sum: { delta: true },
    }),
    db.studioCreditLedger.aggregate({
      where: { createdAt: inWindow, reason: "generation_refund" },
      _sum: { delta: true },
    }),
    db.studioCreditLedger.aggregate({
      where: { createdAt: inWindow, reason: "campaign_reward" },
      _sum: { delta: true },
    }),
    db.studioCreation.groupBy({
      by: ["templateId"],
      where: { createdAt: inWindow, templateId: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { templateId: "desc" } },
      take: 10,
    }),
    db.studioCreation.groupBy({
      by: ["affiliateProfileId"],
      where: { createdAt: inWindow },
      _count: { _all: true },
      orderBy: { _count: { affiliateProfileId: "desc" } },
      take: 10,
    }),
    db.studioCampaign.findMany({
      select: { id: true, name: true, status: true },
      orderBy: { createdAt: "desc" },
    }),
    db.affiliateBadge.groupBy({
      by: ["badgeKey"],
      _count: { _all: true },
    }),
  ]);

  const creationsByKind: Record<string, number> = {};
  for (const r of creationsByKindRows) creationsByKind[r.kind] = r._count._all;

  const issuedByReason: Record<string, number> = {};
  for (const r of issuedRows) issuedByReason[r.reason] = r._sum.delta ?? 0;

  // Top templates: resolve titles, skip null templateId (already filtered).
  const templateIds = topTemplateRows
    .map((r) => r.templateId)
    .filter((id): id is string => !!id);
  const templates = templateIds.length
    ? await db.marketingTemplate.findMany({
        where: { id: { in: templateIds } },
        select: { id: true, title: true },
      })
    : [];
  const templateTitleBy = new Map(templates.map((t) => [t.id, t.title]));
  const topTemplates = topTemplateRows
    .filter((r) => r.templateId)
    .map((r) => ({
      templateId: r.templateId as string,
      title: templateTitleBy.get(r.templateId as string) ?? "Unknown template",
      count: r._count._all,
    }));

  // Top creators: resolve display names.
  const creatorIds = topCreatorRows.map((r) => r.affiliateProfileId);
  const creators = creatorIds.length
    ? await db.affiliateProfile.findMany({
        where: { id: { in: creatorIds } },
        select: { id: true, user: { select: { name: true } } },
      })
    : [];
  const creatorNameBy = new Map(creators.map((c) => [c.id, c.user?.name ?? "Affiliate"]));
  const topCreators = topCreatorRows.map((r) => ({
    profileId: r.affiliateProfileId,
    name: creatorNameBy.get(r.affiliateProfileId) ?? "Affiliate",
    count: r._count._all,
  }));

  // Campaigns: joined / completed counts per campaign.
  const campaignIds = campaignRows.map((c) => c.id);
  const [joinedRows, completedRows] = campaignIds.length
    ? await Promise.all([
        db.studioCampaignParticipation.groupBy({
          by: ["campaignId"],
          where: { campaignId: { in: campaignIds } },
          _count: { _all: true },
        }),
        db.studioCampaignParticipation.groupBy({
          by: ["campaignId"],
          where: { campaignId: { in: campaignIds }, completedAt: { not: null } },
          _count: { _all: true },
        }),
      ])
    : [[], []];
  const joinedBy = new Map(joinedRows.map((r) => [r.campaignId, r._count._all]));
  const completedBy = new Map(completedRows.map((r) => [r.campaignId, r._count._all]));
  const campaigns = campaignRows.map((c) => ({
    id: c.id,
    name: c.name,
    status: c.status,
    joined: joinedBy.get(c.id) ?? 0,
    completed: completedBy.get(c.id) ?? 0,
  }));

  const badges: Record<string, number> = {};
  for (const r of badgeRows) badges[r.badgeKey] = r._count._all;

  return {
    since,
    creationsByKind,
    credits: {
      issuedByReason,
      consumed: -(consumedAgg._sum.delta ?? 0),
      refunded: refundedAgg._sum.delta ?? 0,
      campaignRewards: campaignRewardsAgg._sum.delta ?? 0,
    },
    topTemplates,
    topCreators,
    campaigns,
    badges,
  };
}
