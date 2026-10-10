// ── Commission engine: the money core ─────────────────────────────────────
// Called ONLY from verified Stripe webhooks (invoice.payment_succeeded).
// Rules:
//  • Only real paid subscription invoices (amount_paid > 0, subscription).
//  • L1: affiliate's rank rate at payment time × invoice amount.
//  • L2: 5% override to the affiliate's recruiter. L3: 2% to recruiter's recruiter.
//  • Idempotent per (invoice, level): replays never double-pay.
//  • 30-day holding period before commissions become "available".
//  • Refunds / disputes reverse the matching commissions.

import { db } from "@/lib/db";
import { getSettings } from "./settings";
import { rankFor } from "./ranks";
import { getAttributionForUser } from "./attribution";
import { awardXP, countPayingReferrals } from "./xp";

export interface PaidInvoice {
  stripeInvoiceId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  userId: string; // the paying subscriber
  amountCents: number; // amount_paid, must be > 0
  currency: string;
}

function holdingUntil(settings: { holdingPeriodDays: number }): Date {
  return new Date(Date.now() + settings.holdingPeriodDays * 86400_000);
}

async function createCommissionOnce(args: {
  affiliateProfileId: string;
  referredUserId: string;
  invoice: PaidInvoice;
  level: 1 | 2 | 3;
  amountCents: number;
}): Promise<boolean> {
  const { affiliateProfileId, referredUserId, invoice, level, amountCents } = args;
  if (amountCents <= 0) return false;
  const settings = await getSettings();
  try {
    await db.commission.create({
      data: {
        affiliateProfileId,
        referredUserId,
        stripeInvoiceId: invoice.stripeInvoiceId,
        stripeCustomerId: invoice.stripeCustomerId,
        level,
        amountCents,
        currency: invoice.currency,
        status: "pending",
        availableAt: holdingUntil(settings),
        idempotencyKey: `${invoice.stripeInvoiceId}:L${level}:${affiliateProfileId}`,
      },
    });
    return true;
  } catch (e: unknown) {
    if (e instanceof Error && /unique/i.test(e.message)) return false; // replay
    throw e;
  }
}

/** Upline chain: [L2 affiliate, L3 affiliate] above the given profile. */
async function upline(profileId: string): Promise<string[]> {
  const chain: string[] = [];
  let cur: string | null = profileId;
  for (let i = 0; i < 2; i++) {
    if (!cur) break;
    const self: { recruitedByProfileId: string | null } | null =
      await db.affiliateProfile.findUnique({
        where: { id: cur },
        select: { recruitedByProfileId: true },
      });
    const recruiterId: string | null = self?.recruitedByProfileId ?? null;
    if (!recruiterId) break;
    const up: { id: string; status: string } | null =
      await db.affiliateProfile.findUnique({
        where: { id: recruiterId },
        select: { id: true, status: true },
      });
    if (!up || up.status !== "active") break;
    chain.push(up.id);
    cur = up.id;
  }
  return chain;
}

/**
 * Record L1/L2/L3 commissions for a paid subscription invoice.
 * Returns the total cents awarded (for logging).
 */
export async function recordCommissionsForInvoice(invoice: PaidInvoice): Promise<number> {
  if (invoice.amountCents <= 0) return 0;
  const settings = await getSettings();
  const attr = await getAttributionForUser(invoice.userId);
  if (!attr) return 0;

  // Mark attribution converted (first paid conversion only).
  if (!attr.convertedAt) {
    await db.referralAttribution.update({
      where: { id: attr.id },
      data: { convertedAt: new Date() },
    }).catch(() => {});
  }

  let total = 0;
  const l1Profile = await db.affiliateProfile.findUnique({
    where: { id: attr.affiliateProfileId },
    select: { id: true, xp: true, status: true },
  });
  if (!l1Profile || l1Profile.status !== "active") return 0;

  // L1 — direct referral at the affiliate's CURRENT rank rate.
  const rank = rankFor(l1Profile.xp, settings.ranks);
  const l1Cents = Math.floor((invoice.amountCents * rank.commissionPct) / 100);
  if (await createCommissionOnce({ affiliateProfileId: l1Profile.id, referredUserId: invoice.userId, invoice, level: 1, amountCents: l1Cents })) {
    total += l1Cents;
    // XP: first paying referral is a milestone, the rest are standard.
    const n = await countPayingReferrals(l1Profile.id);
    if (n <= 1) {
      await awardXP(l1Profile.id, "first_paying_referral", { idempotencyKey: `firstpay:${invoice.userId}` });
    } else {
      await awardXP(l1Profile.id, "paying_referral", { idempotencyKey: `payref:${invoice.stripeInvoiceId}:${invoice.userId}` });
    }
    if (n === 5) await awardXP(l1Profile.id, "bonus_5_paying", { idempotencyKey: `bonus5:${l1Profile.id}` });
    if (n === 10) await awardXP(l1Profile.id, "bonus_10_paying", { idempotencyKey: `bonus10:${l1Profile.id}` });
  }

  // L2 / L3 overrides — flat percentages of the same invoice.
  const ups = await upline(l1Profile.id);
  const overrides = [settings.overrideL2Pct, settings.overrideL3Pct];
  for (let i = 0; i < ups.length; i++) {
    const cents = Math.floor((invoice.amountCents * overrides[i]) / 100);
    if (await createCommissionOnce({ affiliateProfileId: ups[i], referredUserId: invoice.userId, invoice, level: (i + 2) as 2 | 3, amountCents: cents })) {
      total += cents;
    }
  }
  return total;
}

/**
 * Reverse all commissions tied to an invoice (refund / dispute).
 * Creates a reversal record by flipping status; the ledger stays auditable.
 */
export async function reverseCommissionsForInvoice(stripeInvoiceId: string, reason: string): Promise<number> {
  const rows = await db.commission.findMany({
    where: { stripeInvoiceId, status: { in: ["pending", "available", "requested"] } },
    select: { id: true },
  });
  if (!rows.length) return 0;
  await db.commission.updateMany({
    where: { id: { in: rows.map((r) => r.id) } },
    data: { status: "reversed" },
  });
  await db.affiliateAuditLog.create({
    data: {
      action: "commission.reversed",
      targetType: "Invoice",
      targetId: stripeInvoiceId,
      details: { reason, count: rows.length },
    },
  });
  return rows.length;
}

/** Lazy promotion: pending → available once the holding period elapses. */
export async function releaseMaturedCommissions(): Promise<number> {
  const res = await db.commission.updateMany({
    where: { status: "pending", availableAt: { lte: new Date() } },
    data: { status: "available" },
  });
  return res.count;
}
