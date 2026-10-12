// ── Studio campaigns: tracked links, pure completion rules, DB ops ──────
// Campaigns are admin-built posting challenges: an affiliate joins, posts
// with the required hashtags/snippet, submits their post URL (trust-based;
// admins spot-check via reviewStatus), and completion pays the campaign's
// XP + credit rewards exactly once.
//
// Exactly-once is enforced three ways:
//  - the participation row is claimed atomically (updateMany where
//    completedAt is still null — only one caller wins),
//  - awardXP is idempotent on `campaign:<campaignId>:<profileId>`,
//  - the credit ledger row is unique on
//    `campaign_reward:<participationId>`.

import { db } from "@/lib/db";
import { referralLinkFor } from "@/lib/affiliate/brand";
import { awardXP } from "@/lib/affiliate/xp";
import type {
  AffiliateProfile,
  StudioCampaign,
  StudioCampaignParticipation,
} from "@prisma/client";

// ── Errors ────────────────────────────────────────────────────────────────

/** Error with an HTTP-ish status the API routes map straight through. */
export class CampaignError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "CampaignError";
    this.status = status;
  }
}

function statusOf(e: unknown): number {
  return (e as { status?: number })?.status ?? 400;
}
export { statusOf as campaignErrorStatus };

// ── Pure helpers ──────────────────────────────────────────────────────────

/** Stable UTM campaign key for a campaign id, e.g. "we-campaign-clx12345". */
export function campaignKeyFor(campaignId: string): string {
  return `we-campaign-${campaignId.slice(0, 8)}`;
}

/** The affiliate's referral link tagged with this campaign's UTM key. */
export function campaignTrackedLink(code: string, campaignId: string): string {
  return (
    `${referralLinkFor(code)}` +
    `?utm_source=affiliate&utm_medium=social&utm_campaign=${campaignKeyFor(campaignId)}`
  );
}

export interface CompletionCampaign {
  status: string;
  endsAt: Date;
}

export interface CompletionParticipation {
  joinedAt: Date;
  completedAt: Date | null;
}

export type CompletionEvaluation =
  | { ok: true }
  | { ok: false; reason: string };

function isValidHttpUrl(value: unknown): value is string {
  if (typeof value !== "string" || !value.trim()) return false;
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
export { isValidHttpUrl };

/**
 * Pure completion gate. A completion is allowed when:
 *  - the affiliate actually joined (a participation row exists),
 *  - it has not already been completed (replays never re-pay),
 *  - the campaign is not still a draft,
 *  - the submitted post URL is a valid http(s) URL,
 *  - the affiliate joined on or before the campaign's end.
 * `now` is accepted for call-site determinism / future time rules; the
 * current rules read their times from the participation + campaign rows.
 */
export function evaluateCompletion(
  participation: CompletionParticipation | null | undefined,
  campaign: CompletionCampaign,
  postUrl: unknown,
  now: Date = new Date(),
): CompletionEvaluation {
  void now;
  if (!participation) return { ok: false, reason: "not_joined" };
  if (participation.completedAt) return { ok: false, reason: "already_completed" };
  if (campaign.status === "draft") return { ok: false, reason: "campaign_draft" };
  if (!isValidHttpUrl(postUrl)) {
    return { ok: false, reason: "invalid_post_url" };
  }
  if (participation.joinedAt.getTime() > campaign.endsAt.getTime()) {
    return { ok: false, reason: "joined_after_campaign_end" };
  }
  return { ok: true };
}

// ── DB ops ────────────────────────────────────────────────────────────────

async function getCampaignOrThrow(campaignId: string): Promise<StudioCampaign> {
  const campaign = await db.studioCampaign.findUnique({ where: { id: campaignId } });
  if (!campaign) throw new CampaignError("Campaign not found", 404);
  return campaign;
}

/**
 * Join an active campaign. The campaign must be status "active" and `now`
 * must fall within [startsAt, endsAt]. Idempotent: re-joining returns the
 * existing participation row (unique on campaignId + profileId).
 */
export async function joinCampaign(
  profileId: string,
  campaignId: string,
  now: Date = new Date(),
): Promise<StudioCampaignParticipation> {
  const campaign = await getCampaignOrThrow(campaignId);
  if (campaign.status !== "active") {
    throw new CampaignError(`Campaign is ${campaign.status}, not active`);
  }
  if (now.getTime() < campaign.startsAt.getTime()) {
    throw new CampaignError("Campaign has not started yet");
  }
  if (now.getTime() > campaign.endsAt.getTime()) {
    throw new CampaignError("Campaign has ended");
  }
  return db.studioCampaignParticipation.upsert({
    where: { campaignId_profileId: { campaignId, profileId } },
    create: { campaignId, profileId, joinedAt: now },
    update: {},
  });
}

export interface CompleteCampaignResult {
  participation: StudioCampaignParticipation;
  rewards: {
    xpAwarded: number;
    creditsAwarded: number;
    alreadyCompleted: boolean;
  };
}

/**
 * Complete a campaign from the affiliate's submitted post URL.
 * Replays (participation already completed, or a lost claim race) return
 * `alreadyCompleted: true` with zero awards — they never throw and never
 * double-pay. Other rule failures throw CampaignError with the reason.
 */
export async function completeCampaign(
  profileId: string,
  campaignId: string,
  postUrl: unknown,
  now: Date = new Date(),
): Promise<CompleteCampaignResult> {
  const campaign = await getCampaignOrThrow(campaignId);

  const participation = await db.studioCampaignParticipation.findUnique({
    where: { campaignId_profileId: { campaignId, profileId } },
  });

  // Replay fast-path: evaluateCompletion would (correctly) reject this,
  // but the DB op's contract is an idempotent zero-award return.
  if (participation?.completedAt) {
    return {
      participation,
      rewards: { xpAwarded: 0, creditsAwarded: 0, alreadyCompleted: true },
    };
  }

  const evaluation = evaluateCompletion(participation, campaign, postUrl, now);
  if (!evaluation.ok) {
    throw new CampaignError(evaluation.reason, evaluation.reason === "not_joined" ? 404 : 400);
  }
  // evaluateCompletion proved the row exists and the URL is a string.
  const row = participation as StudioCampaignParticipation;
  const cleanPostUrl = (postUrl as string).trim();

  // Atomic claim: exactly one concurrent caller flips completedAt.
  const claimed = await db.studioCampaignParticipation.updateMany({
    where: { id: row.id, completedAt: null },
    data: { completedAt: now, postUrl: cleanPostUrl, postedAt: now },
  });
  if (claimed.count !== 1) {
    const fresh = await db.studioCampaignParticipation.findUnique({
      where: { id: row.id },
    });
    return {
      participation: fresh ?? row,
      rewards: { xpAwarded: 0, creditsAwarded: 0, alreadyCompleted: true },
    };
  }

  // Winner-only rewards.
  let xpAwarded = 0;
  if (campaign.xpReward > 0) {
    const award = await awardXP(profileId, "studio_campaign", {
      xp: campaign.xpReward,
      idempotencyKey: `campaign:${campaignId}:${profileId}`,
    });
    xpAwarded = award.awarded ? award.xp : 0;
  }

  let creditsAwarded = 0;
  if (campaign.creditReward !== 0) {
    const creditReward = campaign.creditReward;
    await db.$transaction(async (tx) => {
      await tx.studioCreditAccount.upsert({
        where: { profileId },
        create: { profileId, balance: creditReward },
        update: { balance: { increment: creditReward } },
      });
      await tx.studioCreditLedger.create({
        data: {
          profileId,
          delta: creditReward,
          reason: "campaign_reward",
          idempotencyKey: `campaign_reward:${row.id}`,
        },
      });
    });
    creditsAwarded = creditReward;
  }

  const updated = await db.studioCampaignParticipation.findUnique({
    where: { id: row.id },
  });
  return {
    participation: updated ?? row,
    rewards: { xpAwarded, creditsAwarded, alreadyCompleted: false },
  };
}

export interface CampaignForAffiliate {
  campaign: StudioCampaign;
  myParticipation: StudioCampaignParticipation | null;
  trackedLink: string;
}

/**
 * Campaigns an affiliate can act on: every active campaign that has not
 * ended yet, plus recently-ended (last 30 days) campaigns they joined.
 * Each row carries the caller's participation (or null) and their
 * campaign-tracked referral link.
 */
export async function listCampaignsForAffiliate(
  profileId: string,
  now: Date = new Date(),
): Promise<CampaignForAffiliate[]> {
  const profile = (await db.affiliateProfile.findUnique({
    where: { id: profileId },
    select: { referralCode: true, customCode: true },
  })) as Pick<AffiliateProfile, "referralCode" | "customCode"> | null;
  const code = profile?.customCode ?? profile?.referralCode ?? "";

  const includeMine = {
    participations: { where: { profileId } },
  } as const;

  const recentCutoff = new Date(now.getTime() - 30 * 86400_000);
  const [active, joinedEnded] = await Promise.all([
    db.studioCampaign.findMany({
      where: { status: "active", endsAt: { gte: now } },
      include: includeMine,
      orderBy: { startsAt: "asc" },
    }),
    db.studioCampaign.findMany({
      where: {
        endsAt: { lt: now, gte: recentCutoff },
        participations: { some: { profileId } },
      },
      include: includeMine,
      orderBy: { endsAt: "desc" },
    }),
  ]);

  const seen = new Set<string>();
  const out: CampaignForAffiliate[] = [];
  for (const row of [...active, ...joinedEnded]) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    const { participations, ...campaign } = row;
    out.push({
      campaign: campaign as StudioCampaign,
      myParticipation: participations[0] ?? null,
      trackedLink: campaignTrackedLink(code, row.id),
    });
  }
  return out;
}
