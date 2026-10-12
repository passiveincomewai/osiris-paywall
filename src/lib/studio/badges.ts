// ── Studio badges: definitions, pure evaluation, DB-backed awarding ─────
// Badges are earned from real ledger metrics only (creations, generation
// jobs, campaign participations, paying referrals, ambassador flag).
// Each badge awards its XP exactly once via awardXP's idempotency key
// plus the unique (profileId, badgeKey) row.

import { db } from "@/lib/db";
import { awardXP, countPayingReferrals } from "@/lib/affiliate/xp";

export interface BadgeDef {
  key: string;
  label: string;
  blurb: string;
  xp: number;
}

export const BADGE_DEFS: BadgeDef[] = [
  { key: "studio_starter", label: "Studio Starter", blurb: "Save your first creation in the Studio", xp: 50 },
  { key: "content_creator", label: "Content Creator", blurb: "Save 10 creations in the Studio", xp: 150 },
  { key: "reel_machine", label: "Reel Machine", blurb: "Complete a video job in the Studio", xp: 100 },
  { key: "campaign_pro", label: "Campaign Pro", blurb: "Complete a Studio campaign", xp: 200 },
  { key: "top_promoter", label: "Top Promoter", blurb: "Refer 5 paying subscribers", xp: 500 },
  { key: "world_eye_ambassador", label: "WorldEye Ambassador", blurb: "Become an approved WorldEye Ambassador", xp: 250 },
];

export interface BadgeMetrics {
  creations: number;
  videoJobs: number;
  campaignCompletions: number;
  payingReferrals: number;
  isAmbassador: boolean;
}

/** Pure: which badge keys are earned for these metrics (in BADGE_DEFS order). */
export function badgesEarned(metrics: BadgeMetrics): string[] {
  const earned: string[] = [];
  if (metrics.creations >= 1) earned.push("studio_starter");
  if (metrics.creations >= 10) earned.push("content_creator");
  if (metrics.videoJobs >= 1) earned.push("reel_machine");
  if (metrics.campaignCompletions >= 1) earned.push("campaign_pro");
  if (metrics.payingReferrals >= 5) earned.push("top_promoter");
  if (metrics.isAmbassador) earned.push("world_eye_ambassador");
  return earned;
}

export interface BadgeState {
  key: string;
  label: string;
  blurb: string;
  xp: number;
  earned: boolean;
  earnedAt: Date | null;
}

/**
 * Compute metrics from real tables, insert newly-earned badge rows
 * (race-safe via the unique constraint), award XP per new badge, and
 * return the full badge state list in BADGE_DEFS order.
 */
export async function evaluateBadges(profileId: string): Promise<BadgeState[]> {
  const profile = await db.affiliateProfile.findUnique({
    where: { id: profileId },
    select: { isAmbassador: true },
  });

  const [creations, videoJobs, campaignCompletions, payingReferrals] = await Promise.all([
    db.studioCreation.count({ where: { affiliateProfileId: profileId } }),
    db.generationJob.count({
      where: {
        profileId,
        kind: { in: ["video_personalize", "video_template"] },
        status: "done",
      },
    }),
    db.studioCampaignParticipation.count({
      where: { profileId, completedAt: { not: null } },
    }),
    countPayingReferrals(profileId),
  ]);

  const metrics: BadgeMetrics = {
    creations,
    videoJobs,
    campaignCompletions,
    payingReferrals,
    isAmbassador: profile?.isAmbassador ?? false,
  };

  const earnedKeys = badgesEarned(metrics);
  const existing = await db.affiliateBadge.findMany({
    where: { profileId },
    select: { badgeKey: true, earnedAt: true },
  });
  const existingKeys = new Set(existing.map((b) => b.badgeKey));

  for (const def of BADGE_DEFS) {
    if (!earnedKeys.includes(def.key) || existingKeys.has(def.key)) continue;
    try {
      await db.affiliateBadge.create({
        data: { profileId, badgeKey: def.key },
      });
    } catch (e: unknown) {
      // Unique race: another evaluation inserted it first — skip the award
      // here; that path awards (and awardXP is idempotent regardless).
      if (e instanceof Error && /unique/i.test(e.message)) continue;
      // Prisma unique errors may not surface "unique" in message on all
      // adapters; check code P2002 as well.
      if ((e as { code?: string })?.code === "P2002") continue;
      throw e;
    }
    await awardXP(profileId, "studio_badge", {
      xp: def.xp,
      idempotencyKey: `badge:${def.key}:${profileId}`,
    });
  }

  const rows = await db.affiliateBadge.findMany({
    where: { profileId },
    select: { badgeKey: true, earnedAt: true },
  });
  const byKey = new Map(rows.map((r) => [r.badgeKey, r.earnedAt]));

  return BADGE_DEFS.map((def) => ({
    key: def.key,
    label: def.label,
    blurb: def.blurb,
    xp: def.xp,
    earned: byKey.has(def.key),
    earnedAt: byKey.get(def.key) ?? null,
  }));
}
