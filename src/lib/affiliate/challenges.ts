// ── Challenges: definitions, seeding, and server-side verification ───────
// Metrics are always computed from ledger tables (clicks, attributions,
// commissions) — never trusted from the client.

import { db } from "@/lib/db";
import { awardXP } from "./xp";

export type Metric = "visits" | "signups" | "paying_referrals" | "revenue_cents" | "rank_up" | "tutorial" | "studio_creations" | "studio_videos" | "studio_days" | "campaign_joins";

/** Pure helper: number of distinct UTC calendar days in `dates`. */
export function distinctUtcDays(dates: Date[]): number {
  return new Set(dates.map((d) => d.toISOString().slice(0, 10))).size;
}

export interface ChallengeSeed {
  slug: string;
  kind: "daily" | "weekly" | "monthly";
  title: string;
  description: string;
  xpReward: number;
  metric: Metric;
  target: number;
  durationDays: number;
}

export const SEEDED_CHALLENGES: ChallengeSeed[] = [
  { slug: "daily-tutorial", kind: "daily", title: "Study the Playbook", description: "Complete the affiliate marketing tutorial in Resources.", xpReward: 200, metric: "tutorial", target: 1, durationDays: 1 },
  { slug: "daily-visits-3", kind: "daily", title: "First Signals", description: "Generate 3 verified unique referral visits.", xpReward: 250, metric: "visits", target: 3, durationDays: 1 },
  { slug: "daily-resource", kind: "daily", title: "Arsenal Check", description: "Open a new promotional resource.", xpReward: 200, metric: "tutorial", target: 1, durationDays: 1 },
  { slug: "weekly-signups-3", kind: "weekly", title: "Recruit Squad", description: "Refer 3 verified new users.", xpReward: 400, metric: "signups", target: 3, durationDays: 7 },
  { slug: "weekly-paying-2", kind: "weekly", title: "Double Conversion", description: "Generate 2 paying subscriptions.", xpReward: 500, metric: "paying_referrals", target: 2, durationDays: 7 },
  { slug: "weekly-visits-100", kind: "weekly", title: "Signal Flood", description: "Reach 100 legitimate affiliate link visits.", xpReward: 350, metric: "visits", target: 100, durationDays: 7 },
  { slug: "monthly-paying-10", kind: "monthly", title: "Network Effect", description: "Generate 10 paying subscribers.", xpReward: 1200, metric: "paying_referrals", target: 10, durationDays: 30 },
  { slug: "monthly-revenue-500", kind: "monthly", title: "Half Grand", description: "Reach $500 in qualifying referred subscription revenue.", xpReward: 2000, metric: "revenue_cents", target: 50000, durationDays: 30 },
  { slug: "monthly-rank-up", kind: "monthly", title: "Promotion", description: "Unlock a new affiliate rank.", xpReward: 800, metric: "rank_up", target: 1, durationDays: 30 },
  { slug: "monthly-studio-creator", kind: "monthly", title: "Studio Creator", description: "Save 10 creations in the Studio this month", xpReward: 600, metric: "studio_creations", target: 10, durationDays: 30 },
  { slug: "monthly-studio-days", kind: "monthly", title: "Studio Regular", description: "Create on 7 different days this month", xpReward: 500, metric: "studio_days", target: 7, durationDays: 30 },
  { slug: "monthly-studio-video", kind: "monthly", title: "First Reel", description: "Personalize a video in the Studio", xpReward: 300, metric: "studio_videos", target: 1, durationDays: 30 },
  { slug: "monthly-studio-campaign", kind: "monthly", title: "Campaign Starter", description: "Join a Studio campaign", xpReward: 400, metric: "campaign_joins", target: 1, durationDays: 30 },
];

/** Ensure the current period's challenges exist (idempotent by slug+period). */
export async function ensureChallenges(): Promise<void> {
  const now = new Date();
  for (const s of SEEDED_CHALLENGES) {
    const slug = `${s.slug}`;
    const existing = await db.challenge.findUnique({ where: { slug } });
    // Reuse a live challenge for the period; create a fresh one when expired.
    if (existing && existing.endsAt > now && existing.active) continue;
    const startsAt = new Date(now);
    startsAt.setUTCHours(0, 0, 0, 0);
    const endsAt = new Date(startsAt.getTime() + s.durationDays * 86400_000);
    const uniqueSlug = existing ? `${s.slug}-${startsAt.toISOString().slice(0, 10)}` : s.slug;
    await db.challenge.upsert({
      where: { slug: uniqueSlug },
      create: {
        slug: uniqueSlug, kind: s.kind, title: s.title, description: s.description,
        xpReward: s.xpReward, metric: s.metric, target: s.target, startsAt, endsAt, active: true,
      },
      update: {},
    });
  }
  // Expire old ones
  await db.challenge.updateMany({ where: { endsAt: { lt: now }, active: true }, data: { active: false } });
}

async function metricValue(affiliateProfileId: string, metric: Metric, since: Date): Promise<number> {
  switch (metric) {
    case "visits":
      return db.referralClick.count({ where: { affiliateProfileId, createdAt: { gte: since } } });
    case "signups":
      return db.referralAttribution.count({ where: { affiliateProfileId, createdAt: { gte: since } } });
    case "paying_referrals": {
      const rows = await db.commission.findMany({
        where: { affiliateProfileId, level: 1, status: { not: "reversed" }, amountCents: { gt: 0 }, createdAt: { gte: since } },
        select: { referredUserId: true }, distinct: ["referredUserId"],
      });
      return rows.filter((r) => r.referredUserId).length;
    }
    case "revenue_cents": {
      const agg = await db.commission.aggregate({
        where: { affiliateProfileId, level: 1, status: { not: "reversed" }, createdAt: { gte: since } },
        _sum: { amountCents: true },
      });
      return agg._sum.amountCents ?? 0;
    }
    case "rank_up":
      return 0; // handled via XP events on rank change
    case "tutorial":
      return 0; // completed via explicit API call from Resources page
    case "studio_creations":
      return db.studioCreation.count({ where: { affiliateProfileId, createdAt: { gte: since } } });
    case "studio_videos":
      return db.generationJob.count({
        where: {
          profileId: affiliateProfileId,
          kind: { in: ["video_personalize", "video_template"] },
          status: "done",
          createdAt: { gte: since },
        },
      });
    case "studio_days": {
      const rows = await db.studioCreation.findMany({
        where: { affiliateProfileId, createdAt: { gte: since } },
        select: { createdAt: true },
      });
      return distinctUtcDays(rows.map((r) => r.createdAt));
    }
    case "campaign_joins":
      return db.studioCampaignParticipation.count({
        where: { profileId: affiliateProfileId, joinedAt: { gte: since } },
      });
  }
}

/**
 * Recompute an affiliate's progress on all live challenges. Awards XP on
 * completion (idempotent). Returns completed challenge ids.
 */
export async function refreshChallengeProgress(affiliateProfileId: string): Promise<string[]> {
  await ensureChallenges();
  const now = new Date();
  const live = await db.challenge.findMany({ where: { active: true, startsAt: { lte: now }, endsAt: { gt: now } } });
  const done: string[] = [];
  for (const c of live) {
    const value = await metricValue(affiliateProfileId, c.metric as Metric, c.startsAt);
    const prog = await db.challengeProgress.upsert({
      where: { affiliateProfileId_challengeId: { affiliateProfileId, challengeId: c.id } },
      create: { affiliateProfileId, challengeId: c.id, progress: value },
      update: { progress: value },
    });
    if (!prog.completedAt && value >= c.target) {
      await db.challengeProgress.update({
        where: { affiliateProfileId_challengeId: { affiliateProfileId, challengeId: c.id } },
        data: { completedAt: new Date() },
      });
      await awardXP(affiliateProfileId, `challenge:${c.slug}`, {
        xp: c.xpReward,
        idempotencyKey: `challenge:${affiliateProfileId}:${c.id}`,
      });
      done.push(c.id);
    }
  }
  return done;
}

/** Explicit completion for tutorial/resource challenges (server-verified view). */
export async function completeTutorialChallenge(affiliateProfileId: string, challengeId: string): Promise<boolean> {
  const c = await db.challenge.findUnique({ where: { id: challengeId } });
  if (!c || !c.active || c.metric !== "tutorial") return false;
  const prog = await db.challengeProgress.upsert({
    where: { affiliateProfileId_challengeId: { affiliateProfileId, challengeId } },
    create: { affiliateProfileId, challengeId, progress: 1 },
    update: { progress: 1 },
  });
  if (!prog.completedAt) {
    await db.challengeProgress.update({
      where: { affiliateProfileId_challengeId: { affiliateProfileId, challengeId } },
      data: { completedAt: new Date() },
    });
    await awardXP(affiliateProfileId, `challenge:${c.slug}`, { xp: c.xpReward, idempotencyKey: `challenge:${affiliateProfileId}:${c.id}` });
    return true;
  }
  return false;
}
