// ── Admin affiliate panel: detailed list, per-affiliate detail, controls ──
// Powers /admin/affiliates (rich list) and /admin/affiliates/[profileId]
// (detail + controls). Every number here is a real aggregate over the
// affiliate tables — nothing is estimated or fabricated.
//
// Controls dispatch lives here too (applyAffiliateAdminAction) so the API
// route stays a thin requireAdmin + audit wrapper and the logic is testable.

import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { getSettings } from "./settings";
import { rankFor, nextRank, rankProgress } from "./ranks";
import { referralLinkFor } from "./brand";
import { awardXP } from "./xp";
import { grantCompPro, revokeCompPro, isCompSubscription } from "@/lib/pro/comp";
import { stripe } from "@/lib/stripe";
import { sendEmail } from "@/lib/email";
import { appBaseUrl } from "@/lib/app-url";
import {
  adminAffiliateWelcomeEmail,
  adminAffiliatePayoutEmail,
  adminAffiliateCheckinEmail,
  adminCustomEmail,
} from "@/lib/lifecycle/templates";
import { buildUnsubscribeUrl, unsubscribeSecret } from "@/lib/lifecycle/unsubscribe";

// ── Pure helpers ─────────────────────────────────────────────────────────

/** Mask an email for display in admin tables: "ja***@example.com". */
export function maskEmail(email: string | null | undefined): string {
  if (!email) return "—";
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  const head = local.slice(0, 2);
  return `${head}***@${domain}`;
}

/** Plan display name for a Stripe price id (mirrors the /admin mapping). */
export function planNameForPriceId(priceId: string | null | undefined): string {
  if (!priceId) return "—";
  if (priceId === "comp_free_pro") return "Free Pro (comp)";
  const map: Record<string, string> = {
    [process.env.STRIPE_WEEKLY_PRICE_ID ?? ""]: "Weekly",
    [process.env.STRIPE_MONTHLY_PRICE_ID ?? ""]: "Monthly",
    [process.env.STRIPE_ANNUAL_PRICE_ID ?? ""]: "Annual",
    [process.env.STRIPE_ENTERPRISE_PRICE_ID ?? ""]: "Enterprise",
  };
  return map[priceId] ?? "Other";
}

/** Comp source ("creator" | "visionary" | "admin") from a synthetic sub id. */
export function compSourceOf(stripeSubscriptionId: string | null | undefined): string | null {
  if (!stripeSubscriptionId || !isCompSubscription({ stripeSubscriptionId })) return null;
  const parts = stripeSubscriptionId.split("_");
  return parts.length >= 2 ? parts[1] : "comp";
}

export const AFFILIATE_STATUSES = ["pending", "active", "suspended", "banned", "removed"] as const;
export type AffiliateStatusValue = (typeof AFFILIATE_STATUSES)[number];

// ── List ─────────────────────────────────────────────────────────────────

export type AffiliateSort = "earnings" | "signups" | "xp" | "joined";

export interface AdminAffiliateRow {
  id: string;
  userId: string;
  email: string | null;
  name: string | null;
  image: string | null;
  referralCode: string;
  customCode: string | null;
  status: string;
  xp: number;
  rankKey: string;
  rankName: string;
  isAmbassador: boolean;
  hasFreePro: boolean;
  clicks: number;
  signups: number;
  conversions: number;
  earnedCents: number;
  owedCents: number;
  createdAt: Date;
}

export interface AdminAffiliateList {
  total: number;
  capped: boolean;
  summary: {
    totalAffiliates: number;
    activeAffiliates: number;
    newThisMonth: number;
    totalEarnedCents: number;
    pendingCommissionsCents: number;
  };
  affiliates: AdminAffiliateRow[];
}

const LIST_HARD_CAP = 100;
const AGGREGATE_CANDIDATE_CAP = 500;

export async function listAffiliatesAdmin(opts: {
  q?: string;
  status?: string;
  sort?: AffiliateSort;
  take?: number;
} = {}): Promise<AdminAffiliateList> {
  const q = (opts.q ?? "").trim();
  const sort: AffiliateSort = opts.sort ?? "joined";
  const take = Math.min(LIST_HARD_CAP, Math.max(1, opts.take ?? 50));
  const status = opts.status && (AFFILIATE_STATUSES as readonly string[]).includes(opts.status)
    ? (opts.status as AffiliateStatusValue)
    : undefined;

  const where = {
    ...(status ? { status } : {}),
    ...(q
      ? {
          OR: [
            { user: { email: { contains: q, mode: "insensitive" as const } } },
            { user: { name: { contains: q, mode: "insensitive" as const } } },
            { referralCode: { contains: q.toLowerCase() } },
            { customCode: { contains: q.toLowerCase() } },
          ],
        }
      : {}),
  };

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [total, activeAffiliates, newThisMonth, earnedAgg, pendingAgg, settings] = await Promise.all([
    db.affiliateProfile.count({ where }),
    db.affiliateProfile.count({ where: { status: "active" } }),
    db.affiliateProfile.count({ where: { createdAt: { gte: monthStart } } }),
    db.commission.aggregate({ where: { status: { not: "reversed" } }, _sum: { amountCents: true } }),
    db.commission.aggregate({
      where: { status: { in: ["pending", "available"] } },
      _sum: { amountCents: true },
    }),
    getSettings(),
  ]);

  // Candidate fetch: DB-ordered for joined/xp sorts; a bounded window for
  // aggregate sorts (earnings/signups), which are resolved in JS.
  const aggregateSort = sort === "earnings" || sort === "signups";
  const candidates = await db.affiliateProfile.findMany({
    where,
    include: { user: { select: { email: true, name: true, image: true } } },
    orderBy: sort === "xp" ? { xp: "desc" } : { createdAt: "desc" },
    take: aggregateSort ? AGGREGATE_CANDIDATE_CAP : take,
  });
  const capped = aggregateSort && total > candidates.length;

  const ids = candidates.map((c) => c.id);
  const userIds = candidates.map((c) => c.userId);
  const [clickAgg, signupAgg, convAgg, commAgg, subs] = await Promise.all([
    db.referralClick.groupBy({ by: ["affiliateProfileId"], where: { affiliateProfileId: { in: ids } }, _count: true }),
    db.referralAttribution.groupBy({ by: ["affiliateProfileId"], where: { affiliateProfileId: { in: ids } }, _count: true }),
    db.referralAttribution.groupBy({
      by: ["affiliateProfileId"],
      where: { affiliateProfileId: { in: ids }, convertedAt: { not: null } },
      _count: true,
    }),
    db.commission.groupBy({
      by: ["affiliateProfileId", "status"],
      where: { affiliateProfileId: { in: ids } },
      _sum: { amountCents: true },
    }),
    db.subscription.findMany({
      where: { userId: { in: userIds } },
      select: { userId: true, stripeSubscriptionId: true, status: true, currentPeriodEnd: true },
    }),
  ]);

  const clicks = new Map(clickAgg.map((r) => [r.affiliateProfileId, r._count]));
  const signups = new Map(signupAgg.map((r) => [r.affiliateProfileId, r._count]));
  const conversions = new Map(convAgg.map((r) => [r.affiliateProfileId, r._count]));
  const earned = new Map<string, number>();
  const owed = new Map<string, number>();
  for (const r of commAgg) {
    const amt = r._sum.amountCents ?? 0;
    if (r.status !== "reversed") earned.set(r.affiliateProfileId, (earned.get(r.affiliateProfileId) ?? 0) + amt);
    if (r.status === "pending" || r.status === "available" || r.status === "requested") {
      owed.set(r.affiliateProfileId, (owed.get(r.affiliateProfileId) ?? 0) + amt);
    }
  }
  const now = new Date();
  const compUsers = new Set(
    subs
      .filter((s) => isCompSubscription(s) && s.status === "active" && s.currentPeriodEnd > now)
      .map((s) => s.userId),
  );

  let rows: AdminAffiliateRow[] = candidates.map((c) => {
    const rank = rankFor(c.xp, settings.ranks);
    return {
      id: c.id,
      userId: c.userId,
      email: c.user.email,
      name: c.user.name,
      image: c.user.image,
      referralCode: c.referralCode,
      customCode: c.customCode,
      status: c.status,
      xp: c.xp,
      rankKey: rank.key,
      rankName: rank.name,
      isAmbassador: c.isAmbassador,
      hasFreePro: compUsers.has(c.userId),
      clicks: clicks.get(c.id) ?? 0,
      signups: signups.get(c.id) ?? 0,
      conversions: conversions.get(c.id) ?? 0,
      earnedCents: earned.get(c.id) ?? 0,
      owedCents: owed.get(c.id) ?? 0,
      createdAt: c.createdAt,
    };
  });

  if (sort === "earnings") rows.sort((a, b) => b.earnedCents - a.earnedCents);
  else if (sort === "signups") rows.sort((a, b) => b.signups - a.signups);
  rows = rows.slice(0, take);

  return {
    total,
    capped,
    summary: {
      totalAffiliates: await db.affiliateProfile.count(),
      activeAffiliates,
      newThisMonth,
      totalEarnedCents: earnedAgg._sum.amountCents ?? 0,
      pendingCommissionsCents: pendingAgg._sum.amountCents ?? 0,
    },
    affiliates: rows,
  };
}

// ── Detail ───────────────────────────────────────────────────────────────

export async function getAffiliateAdminDetail(profileId: string) {
  const profile = await db.affiliateProfile.findUnique({
    where: { id: profileId },
    include: { user: { select: { id: true, email: true, name: true, image: true, createdAt: true, emailOptOut: true } } },
  });
  if (!profile) return null;

  const pid = profile.id;
  const d30 = new Date(Date.now() - 30 * 86400_000);
  const settings = await getSettings();

  const [
    sub, creatorApp, ambassadorApp, recruitedBy,
    clicksTotal, clicks30d, attrTotal, attrConverted,
    commByStatus, creationsCount, campaignsJoined, badgesCount,
    attributions, commissions, payouts, xpEvents, recruitCount,
  ] = await Promise.all([
    db.subscription.findUnique({ where: { userId: profile.userId } }),
    db.creatorApplication.findFirst({
      where: { userId: profile.userId },
      orderBy: { createdAt: "desc" },
      select: { platform: true, handle: true, profileUrl: true, followers: true, status: true, createdAt: true },
    }),
    db.ambassadorApplication.findFirst({
      where: { profileId: pid },
      orderBy: { createdAt: "desc" },
      select: { platform: true, handle: true, profileUrl: true, audience: true, status: true, createdAt: true },
    }),
    profile.recruitedByProfileId
      ? db.affiliateProfile.findUnique({
          where: { id: profile.recruitedByProfileId },
          select: { id: true, referralCode: true, customCode: true, user: { select: { email: true } } },
        })
      : Promise.resolve(null),
    db.referralClick.count({ where: { affiliateProfileId: pid } }),
    db.referralClick.count({ where: { affiliateProfileId: pid, createdAt: { gte: d30 } } }),
    db.referralAttribution.count({ where: { affiliateProfileId: pid } }),
    db.referralAttribution.count({ where: { affiliateProfileId: pid, convertedAt: { not: null } } }),
    db.commission.groupBy({ by: ["status"], where: { affiliateProfileId: pid }, _sum: { amountCents: true }, _count: true }),
    db.studioCreation.count({ where: { affiliateProfileId: pid } }),
    db.studioCampaignParticipation.count({ where: { profileId: pid } }),
    db.affiliateBadge.count({ where: { profileId: pid } }),
    db.referralAttribution.findMany({
      where: { affiliateProfileId: pid },
      orderBy: { createdAt: "desc" },
      take: 25,
    }),
    db.commission.findMany({
      where: { affiliateProfileId: pid },
      orderBy: { createdAt: "desc" },
      take: 25,
      select: {
        id: true, amountCents: true, status: true, level: true,
        stripeInvoiceId: true, createdAt: true, availableAt: true, referredUserId: true,
      },
    }),
    db.payout.findMany({
      where: { affiliateProfileId: pid },
      orderBy: { requestedAt: "desc" },
      take: 25,
      select: {
        id: true, amountCents: true, currency: true, method: true, status: true,
        providerRef: true, requestedAt: true, decidedAt: true, decidedBy: true,
      },
    }),
    db.xPEvent.findMany({
      where: { affiliateProfileId: pid },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, activity: true, xp: true, createdAt: true },
    }),
    db.affiliateProfile.count({ where: { recruitedByProfileId: pid } }),
  ]);

  // Referred users for the attribution table (masked emails + their plan).
  const referredIds = attributions.map((a) => a.referredUserId);
  const [referredUsers, referredSubs] = await Promise.all([
    db.user.findMany({ where: { id: { in: referredIds } }, select: { id: true, email: true } }),
    db.subscription.findMany({
      where: { userId: { in: referredIds } },
      select: { userId: true, stripePriceId: true, status: true },
    }),
  ]);
  const emailById = new Map(referredUsers.map((u) => [u.id, u.email]));
  const subByUser = new Map(referredSubs.map((s) => [s.userId, s]));

  const commTotals: Record<string, { cents: number; count: number }> = {};
  for (const r of commByStatus) commTotals[r.status] = { cents: r._sum.amountCents ?? 0, count: r._count };
  const sumStatuses = (...ss: string[]) => ss.reduce((a, s) => a + (commTotals[s]?.cents ?? 0), 0);

  const rank = rankFor(profile.xp, settings.ranks);
  const nxt = nextRank(profile.xp, settings.ranks);
  const creditAccount = await db.studioCreditAccount.findUnique({
    where: { profileId: pid },
    select: { balance: true },
  });

  const isComp = isCompSubscription(sub);
  const subLive = !!(sub && (sub.status === "active" || sub.status === "trialing") && sub.currentPeriodEnd > new Date());

  return {
    profile: {
      id: profile.id,
      userId: profile.userId,
      referralCode: profile.referralCode,
      customCode: profile.customCode,
      referralLink: referralLinkFor(profile.customCode ?? profile.referralCode),
      status: profile.status as string,
      xp: profile.xp,
      isAmbassador: profile.isAmbassador,
      showcaseEnabled: profile.showcaseEnabled,
      leaderboardOptOut: profile.leaderboardOptOut,
      payoutEmail: profile.payoutEmail,
      payoutMethod: profile.payoutMethod,
      createdAt: profile.createdAt,
      discount: {
        code: profile.discountCode,
        pct: profile.discountPct,
        stripePromotionCodeId: profile.stripePromotionCodeId,
        synced: !!profile.stripePromotionCodeId,
        syncedAt: profile.discountSyncedAt,
      },
    },
    user: profile.user,
    subscription: sub
      ? {
          kind: isComp ? ("comp" as const) : ("paid" as const),
          compSource: compSourceOf(sub.stripeSubscriptionId),
          planName: planNameForPriceId(sub.stripePriceId),
          status: sub.status as string,
          live: subLive,
          currentPeriodEnd: sub.currentPeriodEnd,
          cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
        }
      : null,
    creatorApplication: creatorApp,
    ambassadorApplication: ambassadorApp,
    recruitedBy: recruitedBy
      ? { id: recruitedBy.id, code: recruitedBy.customCode ?? recruitedBy.referralCode, email: recruitedBy.user.email }
      : null,
    recruits: recruitCount,
    rank: { key: rank.key, name: rank.name, commissionPct: rank.commissionPct },
    nextRank: nxt ? { key: nxt.key, name: nxt.name, minXp: nxt.minXp } : null,
    progress: rankProgress(profile.xp, settings.ranks),
    stats: {
      clicksTotal,
      clicks30d,
      signups: attrTotal,
      conversions: attrConverted,
      conversionRate: attrTotal > 0 ? attrConverted / attrTotal : 0,
      commissionsPendingCents: sumStatuses("pending"),
      commissionsAvailableCents: sumStatuses("available"),
      commissionsRequestedCents: sumStatuses("requested"),
      commissionsPaidCents: sumStatuses("paid"),
      commissionsReversedCents: sumStatuses("reversed"),
      commissionsTotalCents: Object.entries(commTotals)
        .filter(([s]) => s !== "reversed")
        .reduce((a, [, v]) => a + v.cents, 0),
      commissionsCount: Object.values(commTotals).reduce((a, v) => a + v.count, 0),
      studioCreations: creationsCount,
      studioCreditBalance: creditAccount?.balance ?? 0,
      campaignsJoined,
      badges: badgesCount,
    },
    attributions: attributions.map((a) => {
      const rsub = subByUser.get(a.referredUserId);
      return {
        id: a.id,
        maskedEmail: maskEmail(emailById.get(a.referredUserId)),
        status: a.convertedAt ? ("converted" as const) : ("signed_up" as const),
        planName: rsub ? planNameForPriceId(rsub.stripePriceId) : null,
        planStatus: rsub?.status ?? null,
        createdAt: a.createdAt,
        convertedAt: a.convertedAt,
        expiresAt: a.expiresAt,
      };
    }),
    commissions,
    payouts,
    xpEvents,
  };
}

export type AffiliateAdminDetail = NonNullable<Awaited<ReturnType<typeof getAffiliateAdminDetail>>>;

// ── Controls ─────────────────────────────────────────────────────────────

export type AffiliateAdminAction =
  | { action: "grant_comp" }
  | { action: "revoke_comp" }
  | { action: "set_status"; status: string }
  | { action: "set_ambassador"; value: boolean }
  | { action: "reset_discount" }
  | { action: "adjust_xp"; xp: number; reason?: string };

export class AffiliateActionError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

/**
 * Execute one admin control against an affiliate profile. Throws
 * AffiliateActionError for expected failures (bad input, paid sub blocks a
 * comp grant, …). Callers wrap with requireAdmin + audit.
 */
export async function applyAffiliateAdminAction(
  profileId: string,
  actorEmail: string | undefined,
  input: AffiliateAdminAction,
): Promise<{ result: string; xp?: number; status?: string }> {
  const profile = await db.affiliateProfile.findUnique({
    where: { id: profileId },
    select: { id: true, userId: true, xp: true, isAmbassador: true, stripePromotionCodeId: true },
  });
  if (!profile) throw new AffiliateActionError("Affiliate not found", 404);

  switch (input.action) {
    case "grant_comp": {
      // 12-month complimentary Pro. grantCompPro refuses to touch a real
      // Stripe subscription — a paying customer always wins.
      const r = await grantCompPro(profile.userId, "admin", 12);
      if (!r.granted) {
        throw new AffiliateActionError(
          "This user has a real paid subscription — a comp grant would not take effect and was not applied.",
          409,
        );
      }
      return { result: `Free Pro granted until ${r.currentPeriodEnd.toISOString().slice(0, 10)}` };
    }
    case "revoke_comp": {
      const r = await revokeCompPro(profile.userId);
      if (!r.revoked) {
        throw new AffiliateActionError("No comp (free) subscription to revoke — any paid subscription is untouched.", 409);
      }
      return { result: "Free Pro revoked" };
    }
    case "set_status": {
      if (!(AFFILIATE_STATUSES as readonly string[]).includes(input.status)) {
        throw new AffiliateActionError("Invalid status");
      }
      await db.affiliateProfile.update({
        where: { id: profileId },
        data: { status: input.status as AffiliateStatusValue },
      });
      return { result: `Status set to ${input.status}`, status: input.status };
    }
    case "set_ambassador": {
      await db.affiliateProfile.update({
        where: { id: profileId },
        data: { isAmbassador: !!input.value },
      });
      return { result: input.value ? "Ambassador enabled" : "Ambassador removed" };
    }
    case "reset_discount": {
      // Deactivate the live Stripe promotion code (best effort), then clear
      // the stored code fields. ensureDiscountCode re-mints at the
      // affiliate's current rank on their next dashboard load.
      if (profile.stripePromotionCodeId && process.env.STRIPE_SECRET_KEY) {
        await stripe()
          .promotionCodes.update(profile.stripePromotionCodeId, { active: false })
          .catch(() => {});
      }
      await db.affiliateProfile.update({
        where: { id: profileId },
        data: {
          discountCode: null,
          discountPct: null,
          stripePromotionCodeId: null,
          discountSyncedAt: null,
        },
      });
      return { result: "Discount code reset — a fresh code mints at the affiliate's current rank on their next dashboard load" };
    }
    case "adjust_xp": {
      const delta = input.xp;
      if (typeof delta !== "number" || !Number.isFinite(delta) || delta === 0 || Math.abs(delta) > 10000) {
        throw new AffiliateActionError("xp must be a non-zero finite number within ±10000");
      }
      const key = `admin:${randomUUID()}:${profileId}`;
      const meta = { reason: input.reason ?? "", by: actorEmail, requested: delta };
      if (delta > 0) {
        const r = await awardXP(profileId, "admin_award", { xp: delta, idempotencyKey: key, meta });
        return { result: `Awarded ${delta} XP`, xp: r.totalXp };
      }
      // Deduct: negative XPEvent + decrement, clamped so XP never goes
      // below zero; the ledger records the APPLIED delta.
      const applied = Math.max(delta, -profile.xp);
      if (applied === 0) throw new AffiliateActionError("Affiliate already has 0 XP");
      await db.$transaction([
        db.xPEvent.create({
          data: { affiliateProfileId: profileId, activity: "admin_revoke", xp: applied, idempotencyKey: key, meta: meta as object },
        }),
        db.affiliateProfile.update({ where: { id: profileId }, data: { xp: { increment: applied } } }),
      ]);
      const fresh = await db.affiliateProfile.findUnique({ where: { id: profileId }, select: { xp: true } });
      return { result: `Deducted ${Math.abs(applied)} XP`, xp: fresh?.xp ?? 0 };
    }
  }
}

// ── Admin email sends ────────────────────────────────────────────────────
// One-off emails from the affiliate detail page, mirroring the accounts
// page pattern (POST /api/admin/accounts/[userId]): sends go through
// sendEmail → Resend from WorldEye <noreply@worldeye.app> and every send
// is logged in LifecycleEmailLog with template
// "admin_affiliate_<template>", kind "marketing", and the acting
// admin's email in the contextKey (timestamped, so repeat sends each
// get their own row). All four templates are marketing sends, so
// User.emailOptOut refuses absolutely — nothing is sent.

export const AFFILIATE_EMAIL_TEMPLATES = ["welcome", "payout_available", "checkin", "custom"] as const;
export type AffiliateEmailTemplate = (typeof AFFILIATE_EMAIL_TEMPLATES)[number];

/** Caps for the admin custom-email composer — same as the accounts page. */
const CUSTOM_SUBJECT_MAX = 150;
const CUSTOM_BODY_MAX = 5000;

function fmtUsd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export async function sendAffiliateAdminEmail(
  profileId: string,
  actorEmail: string | undefined,
  input: { template: string; subject?: string; body?: string },
): Promise<{ result: string; logged: boolean }> {
  if (!(AFFILIATE_EMAIL_TEMPLATES as readonly string[]).includes(input.template)) {
    throw new AffiliateActionError("Unknown email template");
  }
  const template = input.template as AffiliateEmailTemplate;

  const profile = await db.affiliateProfile.findUnique({
    where: { id: profileId },
    include: { user: { select: { id: true, email: true, name: true, emailOptOut: true } } },
  });
  if (!profile) throw new AffiliateActionError("Affiliate not found", 404);
  const user = profile.user;

  // Custom composer validation first (mirrors the accounts route):
  // both fields required, non-empty after trimming, length-capped.
  let custom: { subject: string; bodyText: string } | null = null;
  if (template === "custom") {
    const subject = typeof input.subject === "string" ? input.subject.trim() : "";
    const bodyText = typeof input.body === "string" ? input.body.trim() : "";
    if (!subject) throw new AffiliateActionError("Write a subject line first — nothing was sent.");
    if (!bodyText) throw new AffiliateActionError("Write a message body first — nothing was sent.");
    if (subject.length > CUSTOM_SUBJECT_MAX || bodyText.length > CUSTOM_BODY_MAX) {
      throw new AffiliateActionError(
        `Too long — subjects are capped at ${CUSTOM_SUBJECT_MAX} characters and bodies at ${CUSTOM_BODY_MAX}. Nothing was sent.`,
      );
    }
    custom = { subject, bodyText };
  }

  if (!user.email) {
    throw new AffiliateActionError("This account has no email address.", 422);
  }
  if (user.emailOptOut) {
    throw new AffiliateActionError("This user has opted out of marketing email — the send was refused.", 422);
  }

  const unsubscribeUrl = buildUnsubscribeUrl(appBaseUrl(), user.id, unsubscribeSecret());
  const referralLink = referralLinkFor(profile.customCode ?? profile.referralCode);

  let rendered: { subject: string; html: string };
  let resultLabel: string;
  if (template === "welcome") {
    const settings = await getSettings();
    const rank = rankFor(profile.xp, settings.ranks);
    rendered = adminAffiliateWelcomeEmail({
      name: user.name,
      referralLink,
      commissionPct: rank.commissionPct,
      unsubscribeUrl,
    });
    resultLabel = "Welcome email";
  } else if (template === "payout_available") {
    // The balance in the copy is the affiliate's real available total
    // (commissions past the holding period, not yet requested/paid) —
    // the same aggregate the detail page shows. Refuse at $0 rather
    // than announce a payout that isn't there.
    const agg = await db.commission.aggregate({
      where: { affiliateProfileId: profileId, status: "available" },
      _sum: { amountCents: true },
    });
    const availableCents = agg._sum.amountCents ?? 0;
    if (availableCents <= 0) {
      throw new AffiliateActionError(
        "This affiliate has no available commission balance right now — nothing was sent.",
        422,
      );
    }
    rendered = adminAffiliatePayoutEmail({
      name: user.name,
      availableLabel: fmtUsd(availableCents),
      unsubscribeUrl,
    });
    resultLabel = `Payout-available email (${fmtUsd(availableCents)})`;
  } else if (template === "checkin") {
    rendered = adminAffiliateCheckinEmail({ name: user.name, referralLink, unsubscribeUrl });
    resultLabel = "Check-in email";
  } else {
    rendered = adminCustomEmail({
      name: user.name,
      subject: custom!.subject,
      bodyText: custom!.bodyText,
      unsubscribeUrl,
    });
    resultLabel = "Custom email";
  }

  const sent = await sendEmail(user.email, rendered.subject, rendered.html);
  if (!sent) {
    throw new AffiliateActionError("The email service refused the send — nothing was sent or logged.", 502);
  }

  let logged = false;
  try {
    await db.lifecycleEmailLog.create({
      data: {
        userId: user.id,
        recipientEmail: user.email,
        template: `admin_affiliate_${template}`,
        contextKey: `admin:${actorEmail ?? "unknown"}:${new Date().toISOString()}`,
        kind: "marketing",
        subject: rendered.subject,
        status: "sent",
      },
    });
    logged = true;
  } catch {
    logged = false;
  }
  return { result: `${resultLabel} sent to ${user.email}`, logged };
}
