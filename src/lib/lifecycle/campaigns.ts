// ── Campaign engine (holidays / flash sales) ─────────────────────────
// PREPARES campaigns; never blasts them. prepareCampaign does the three
// mechanical pieces the owner used to do by hand —
//   1. mints the Stripe coupon + promotion code (capped redemptions,
//      hard expiry — the affiliate/discount.ts creation pattern),
//   2. builds the recipient segment from live DB state,
//   3. drafts the email —
// and returns a JSON-serializable CampaignDraft for review. Sending is
// a separate, explicit step (sendCampaign, driven by
// tools/lifecycle-campaign.ts with the owner's approval) that re-checks
// every guard per recipient and logs each send like any other
// lifecycle email (template "campaign", contextKey = campaign slug),
// so a campaign can never double-hit a user and always respects the
// opt-out and the 48h marketing cap.

import { db } from "../db";
import { stripe } from "../stripe";
import { sendEmail } from "../email";
import { appBaseUrl } from "../app-url";
import { isExcludedEmail, MARKETING_CAP_WINDOW_MS, type DiscountOffer } from "./config";
import { evaluateGuards } from "./guards";
import { campaignEmail } from "./templates";
import { buildUnsubscribeUrl, unsubscribeSecret } from "./unsubscribe";

export type CampaignAudience = "free_users" | "all_users" | "trialing" | "affiliates";

export interface CampaignInput {
  /** Short campaign id, e.g. "halloween-2026". Becomes part of the code. */
  slug: string;
  /** Percent off the first payment, 1–100. */
  pct: number;
  /** Hard cap on total redemptions of the promotion code. */
  maxRedemptions: number;
  /** When the code stops redeeming. */
  expiresAt: Date;
  headline: string;
  /** Plain-text body copy (paragraphs separated by blank lines). */
  bodyText: string;
  ctaLabel?: string;
  ctaPath?: string;
  audience: CampaignAudience;
}

export interface CampaignDraft {
  version: 1;
  slug: string;
  /** The Stripe promotion code string users type at checkout. */
  code: string;
  stripeCouponId: string | null;
  stripePromotionCodeId: string | null;
  pct: number;
  maxRedemptions: number;
  expiresAt: string; // ISO
  audience: CampaignAudience;
  headline: string;
  bodyText: string;
  ctaLabel: string;
  ctaPath: string;
  /** Segment as prepared — send re-validates every recipient. */
  recipientUserIds: string[];
  segmentSize: number;
  preparedAt: string; // ISO
}

/** The code string for a campaign slug + pct: "HALLOWEEN50". */
export function campaignCodeFor(slug: string, pct: number): string {
  const base = slug.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return `${base}${pct}`;
}

export function validateCampaignInput(input: CampaignInput, now: Date = new Date()): string | null {
  if (!input.slug || input.slug.trim().length < 3) return "slug too short";
  if (!Number.isInteger(input.pct) || input.pct < 1 || input.pct > 100) return "pct must be 1–100";
  if (!Number.isInteger(input.maxRedemptions) || input.maxRedemptions < 1) {
    return "maxRedemptions must be ≥ 1";
  }
  if (input.expiresAt.getTime() <= now.getTime()) return "expiresAt must be in the future";
  if (!input.headline.trim()) return "headline required";
  if (!input.bodyText.trim()) return "bodyText required";
  return null;
}

const userSelect = { id: true, email: true, name: true, emailOptOut: true } as const;

export interface SegmentUser {
  id: string;
  email: string | null;
  name: string | null;
  emailOptOut: boolean;
}

/**
 * The recipient segment for an audience, from live DB state. Already
 * excludes: no-email users, owner/test inboxes, and marketing opt-outs.
 * Send re-checks everything anyway (state can change after prepare).
 */
export async function buildCampaignSegment(audience: CampaignAudience): Promise<SegmentUser[]> {
  const base = { email: { not: null }, emailOptOut: false } as const;
  let users: SegmentUser[] = [];
  switch (audience) {
    case "all_users":
      users = await db.user.findMany({ where: base, select: userSelect, take: 10000 });
      break;
    case "free_users": {
      const all = await db.user.findMany({
        where: base,
        select: { ...userSelect, subscription: { select: { status: true } } },
        take: 10000,
      });
      users = all.filter(
        (u) => !u.subscription || (u.subscription.status !== "active" && u.subscription.status !== "trialing"),
      );
      break;
    }
    case "trialing": {
      const all = await db.user.findMany({
        where: { ...base, subscription: { status: "trialing" } },
        select: userSelect,
        take: 10000,
      });
      users = all;
      break;
    }
    case "affiliates":
      users = await db.user.findMany({
        where: { ...base, affiliateProfile: { isNot: null } },
        select: userSelect,
        take: 10000,
      });
      break;
  }
  return users.filter((u) => !isExcludedEmail(u.email));
}

/**
 * Prepare a campaign: mint (or reuse) the Stripe coupon + promotion
 * code, build the segment, draft the copy. Sends NOTHING. Without
 * STRIPE_SECRET_KEY the Stripe ids come back null (intent recorded in
 * the draft) — the honest-degradation pattern from affiliate codes.
 */
export async function prepareCampaign(
  input: CampaignInput,
  now: Date = new Date(),
): Promise<CampaignDraft> {
  const invalid = validateCampaignInput(input, now);
  if (invalid) throw new Error(`invalid campaign: ${invalid}`);
  const code = campaignCodeFor(input.slug, input.pct);
  const expiresSec = Math.floor(input.expiresAt.getTime() / 1000);

  let stripeCouponId: string | null = null;
  let stripePromotionCodeId: string | null = null;
  if (process.env.STRIPE_SECRET_KEY) {
    const s = stripe();
    const listed = await s.promotionCodes.list({ code, limit: 1 });
    const existing = listed.data[0];
    if (existing) {
      stripePromotionCodeId = existing.id;
      stripeCouponId = typeof existing.coupon === "string" ? existing.coupon : existing.coupon.id;
    } else {
      const coupon = await s.coupons.create({
        percent_off: input.pct,
        duration: "once",
        name: `WorldEye campaign — ${input.slug}`,
        redeem_by: expiresSec,
        metadata: { worldeye_campaign: input.slug },
      });
      const promo = await s.promotionCodes.create({
        coupon: coupon.id,
        code,
        max_redemptions: input.maxRedemptions,
        expires_at: expiresSec,
        metadata: { worldeye_campaign: input.slug },
      });
      stripeCouponId = coupon.id;
      stripePromotionCodeId = promo.id;
    }
  }

  const segment = await buildCampaignSegment(input.audience);
  return {
    version: 1,
    slug: input.slug,
    code,
    stripeCouponId,
    stripePromotionCodeId,
    pct: input.pct,
    maxRedemptions: input.maxRedemptions,
    expiresAt: input.expiresAt.toISOString(),
    audience: input.audience,
    headline: input.headline,
    bodyText: input.bodyText,
    ctaLabel: input.ctaLabel ?? "See the offer",
    ctaPath: input.ctaPath ?? "/pricing",
    recipientUserIds: segment.map((u) => u.id),
    segmentSize: segment.length,
    preparedAt: now.toISOString(),
  };
}

export interface CampaignSendSummary {
  sent: number;
  skipped: Record<string, number>;
}

/**
 * THE send step — invoked only from the owner-approved command path,
 * never from a cron. Re-validates each recipient against the guards at
 * send time and logs every send (template "campaign", contextKey =
 * slug), so re-running a send for the same draft is a no-op for anyone
 * already mailed.
 */
export async function sendCampaign(
  draft: CampaignDraft,
  opts: {
    now?: Date;
    env?: Record<string, string | undefined>;
    send?: (to: string, subject: string, html: string) => Promise<boolean>;
  } = {},
): Promise<CampaignSendSummary> {
  const now = opts.now ?? new Date();
  const env = opts.env ?? process.env;
  const send = opts.send ?? sendEmail;
  const secret = unsubscribeSecret(env);
  const offer: DiscountOffer = {
    code: draft.code,
    label: `${draft.pct}% off your first payment`,
    expiresAt: new Date(draft.expiresAt),
  };
  const summary: CampaignSendSummary = { sent: 0, skipped: {} };
  const skip = (reason: string) => {
    summary.skipped[reason] = (summary.skipped[reason] ?? 0) + 1;
  };

  for (const userId of draft.recipientUserIds) {
    const user = await db.user.findUnique({ where: { id: userId }, select: userSelect });
    if (!user) {
      skip("user_gone");
      continue;
    }
    const existing = await db.lifecycleEmailLog.findUnique({
      where: { userId_template_contextKey: { userId, template: "campaign", contextKey: draft.slug } },
      select: { status: true },
    });
    const marketingSendsInWindow = await db.lifecycleEmailLog.count({
      where: {
        userId,
        kind: "marketing",
        status: "sent",
        createdAt: { gte: new Date(now.getTime() - MARKETING_CAP_WINDOW_MS) },
      },
    });
    const verdict = evaluateGuards({
      email: user.email,
      kind: "marketing",
      emailOptOut: user.emailOptOut,
      alreadySent: existing?.status === "sent",
      marketingSendsInWindow,
    });
    if (!verdict.allow) {
      skip(verdict.reason);
      continue;
    }
    const rendered = campaignEmail({
      headline: draft.headline,
      bodyText: draft.bodyText,
      offer,
      ctaLabel: draft.ctaLabel,
      ctaPath: draft.ctaPath,
      unsubscribeUrl: buildUnsubscribeUrl(appBaseUrl(), userId, secret),
    });
    const ok = await send(user.email!, rendered.subject, rendered.html);
    if (!ok) {
      skip("send_failed");
      continue;
    }
    await db.lifecycleEmailLog
      .create({
        data: {
          userId,
          recipientEmail: user.email!,
          template: "campaign",
          contextKey: draft.slug,
          kind: "marketing",
          subject: rendered.subject,
          status: "sent",
        },
      })
      .catch(() => {});
    summary.sent++;
  }
  return summary;
}
