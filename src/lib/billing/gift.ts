/**
 * Gift subscriptions — purchase fulfilment + redemption decisions.
 *
 * Flow (design record: ~/workspace/gift-subscriptions/NOTES.md):
 *   1. POST /api/gift/checkout creates a GiftSubscription row
 *      (status "pending") and a subscription-mode Checkout Session on
 *      one of the nine EXISTING grid price ids — no trial, the buyer
 *      pays the first term up front. Session metadata carries
 *      { kind: "gift", giftId }; subscription metadata carries
 *      { gift: "1", giftId }.
 *   2. The Stripe webhook calls fulfillGiftPurchase on
 *      checkout.session.completed: the gift flips pending → paid
 *      exactly once (Stripe replays no-op), the paid period is stored,
 *      the Stripe subscription is set to cancel at period end (a gift
 *      is ONE prepaid term — the buyer's card is never charged a
 *      renewal), and the recipient is emailed a redemption link.
 *      syncSubscription never writes an entitlement row for a gift
 *      subscription — the buyer must not gain access from buying one.
 *   3. POST /api/gift/redeem lets the signed-in recipient claim it:
 *      redeemDecision below owns the refusal table, and the grant
 *      writes the recipient's Subscription row with synthetic ids
 *      ("gift_<giftId>", the comp-grant pattern in lib/pro/comp.ts)
 *      carrying the REAL gifted price id and exactly the paid period.
 */
import { randomBytes } from "node:crypto";
import type Stripe from "stripe";
import { db } from "@/lib/db";
import { stripe, appUrl } from "@/lib/stripe";
import { sendEmail, emailConfigured, shell, escapeHtml } from "@/lib/email";
import { normalizeEmail } from "@/lib/password-auth";
import { PLAN_DEFS, type PlanKey } from "./plans";

/** The nine sellable grid plans are giftable. Standalone products
 *  (enterprise, ambient, ski) are not — they are not tier gifts. */
export const GIFT_PLAN_KEYS: PlanKey[] = [
  "lite_weekly",
  "lite_monthly",
  "lite_annual",
  "pro_weekly",
  "pro_monthly",
  "pro_annual",
  "ultra_weekly",
  "ultra_monthly",
  "ultra_annual",
];

export function isGiftPlanKey(value: unknown): value is PlanKey {
  return (
    typeof value === "string" &&
    (GIFT_PLAN_KEYS as string[]).includes(value) &&
    value in PLAN_DEFS
  );
}

/** Redemption codes are bearer tokens delivered by email: 192 bits of
 *  randomness, URL-safe, never sequential or guessable. */
export function generateGiftCode(): string {
  return randomBytes(24).toString("base64url");
}

/** Synthetic Subscription-row id prefix for redeemed gifts (comp
 *  pattern): no real Stripe object can ever carry this id. */
export const GIFT_ROW_ID_PREFIX = "gift_";

export function giftRowId(giftId: string): string {
  return `${GIFT_ROW_ID_PREFIX}${giftId}`;
}

/** True when a Stripe subscription belongs to a gift purchase — the
 *  webhook's entitlement writer must skip these unconditionally. */
export function isGiftStripeSubscription(sub: {
  metadata?: Record<string, string> | null;
}): boolean {
  return !!sub?.metadata?.giftId || sub?.metadata?.gift === "1";
}

/** The paid term of a Stripe subscription (v18: the period lives on
 *  the items; a gift subscription has exactly one item). */
export function giftPeriodFromSubscription(sub: {
  items?: {
    data?: Array<{
      current_period_start?: number | null;
      current_period_end?: number | null;
    }>;
  } | null;
}): { start: Date; end: Date } | null {
  const item = sub.items?.data?.[0];
  const start = item?.current_period_start ?? 0;
  const end = item?.current_period_end ?? 0;
  if (!start || !end || end <= start) return null;
  return { start: new Date(start * 1000), end: new Date(end * 1000) };
}

/* ------------------------------------------------------------------ */
/* Recipient email                                                     */
/* ------------------------------------------------------------------ */

export function giftRecipientEmail(input: {
  planDisplayName: string;
  periodEnd: Date;
  redeemUrl: string;
  buyerEmail: string;
}): { subject: string; html: string } {
  const end = input.periodEnd.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
  const subject = `You've been gifted WorldEye ${input.planDisplayName}`;
  const html = shell(
    subject,
    `${input.buyerEmail} sent you a WorldEye gift — redeem it in one click.`,
    `<p style="margin:0 0 14px;color:#d4d4d8;line-height:1.65;">${escapeHtml(input.buyerEmail)} has gifted you <strong style="color:#fff;">WorldEye ${escapeHtml(input.planDisplayName)}</strong> — one prepaid term, already paid for.</p>` +
      `<p style="margin:0 0 14px;color:#d4d4d8;line-height:1.65;">Your access runs through <strong style="color:#fff;">${escapeHtml(end)}</strong> once you redeem. Redeem with the account signed in under THIS email address — if you don't have a WorldEye account yet, create one with this address first, then open the link again.</p>` +
      `<p style="margin:0;color:#a1a1aa;line-height:1.65;font-size:13px;">Gifts don't auto-renew — nothing will be charged to you or the buyer when the term ends.</p>`,
    { label: "Redeem your gift", href: input.redeemUrl },
  );
  return { subject, html };
}

/* ------------------------------------------------------------------ */
/* Webhook fulfilment                                                  */
/* ------------------------------------------------------------------ */

export type GiftFulfilResult =
  | { handled: false }
  | { handled: true; fulfilled: boolean; reason?: string; emailed?: boolean };

/**
 * Fulfil a gift purchase from its completed Checkout Session.
 * Idempotent: only the pending → paid transition does work, so Stripe
 * replays are no-ops. Best-effort side effects (cancel-at-period-end,
 * the recipient email) are logged on failure, never thrown — the
 * webhook must not 500 over them once the payment itself is recorded.
 */
export async function fulfillGiftPurchase(
  session: Stripe.Checkout.Session,
): Promise<GiftFulfilResult> {
  const giftId = session.metadata?.giftId;
  if (session.metadata?.kind !== "gift" || !giftId) return { handled: false };

  const gift = await db.giftSubscription.findUnique({ where: { id: giftId } });
  if (!gift) {
    console.error(`[gift] checkout session ${session.id} names unknown gift ${giftId}`);
    return { handled: true, fulfilled: false, reason: "gift_not_found" };
  }
  if (gift.status !== "pending") {
    return { handled: true, fulfilled: false, reason: "replay" };
  }
  if (session.payment_status !== "paid") {
    // Cards settle synchronously; an async method that hasn't settled
    // leaves the gift pending (the studio credit-pack precedent).
    console.warn(`[gift] session ${session.id} completed unpaid for gift ${gift.id}; not fulfilling`);
    return { handled: true, fulfilled: false, reason: "unpaid" };
  }
  const subId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id;
  if (!subId) return { handled: true, fulfilled: false, reason: "no_subscription" };

  const sub = await stripe().subscriptions.retrieve(subId);
  const period = giftPeriodFromSubscription(sub);
  if (!period) {
    console.error(`[gift] subscription ${subId} for gift ${gift.id} has no readable period`);
    return { handled: true, fulfilled: false, reason: "no_period" };
  }

  // Claim the transition atomically: a concurrent replay that loses
  // this race sees count 0 and stops before any side effect.
  const claim = await db.giftSubscription.updateMany({
    where: { id: gift.id, status: "pending" },
    data: {
      status: "paid",
      stripeCheckoutSessionId: session.id,
      stripeSubscriptionId: subId,
      periodStart: period.start,
      periodEnd: period.end,
    },
  });
  if (claim.count === 0) return { handled: true, fulfilled: false, reason: "replay" };

  // One prepaid term: stop the buyer's card ever being renewal-charged.
  try {
    await stripe().subscriptions.update(subId, { cancel_at_period_end: true });
  } catch (e) {
    console.error(`[gift] failed to set cancel_at_period_end on gift sub ${subId}:`, e);
  }

  let emailed = false;
  if (emailConfigured()) {
    try {
      const plan = PLAN_DEFS[gift.planKey as PlanKey];
      const mail = giftRecipientEmail({
        planDisplayName: plan?.displayName ?? gift.planKey,
        periodEnd: period.end,
        redeemUrl: `${appUrl()}/gift/redeem?code=${gift.code}`,
        buyerEmail: gift.buyerEmail,
      });
      emailed = await sendEmail(gift.recipientEmail, mail.subject, mail.html);
    } catch (e) {
      console.error(`[gift] recipient email failed for gift ${gift.id}:`, e);
    }
  }
  return { handled: true, fulfilled: true, emailed };
}

/* ------------------------------------------------------------------ */
/* Redemption decision (pure — the refusal table lives here)           */
/* ------------------------------------------------------------------ */

export type GiftStatusLike = "pending" | "paid" | "redeemed" | "expired";

export interface RedeemGiftView {
  status: GiftStatusLike;
  recipientEmail: string;
  periodEnd: Date | null;
}

export interface RedeemExistingSubView {
  status: string;
  currentPeriodEnd: Date;
}

export type RedeemRefusalReason =
  | "not_found"
  | "unpaid"
  | "already_redeemed"
  | "expired"
  | "email_mismatch"
  | "already_subscribed";

export type RedeemDecision =
  | { kind: "grant" }
  | { kind: "refuse"; reason: RedeemRefusalReason; httpStatus: number; message: string };

/** Subscription statuses that mean "this account already has access"
 *  while their period is still in the future — a gift must never
 *  clobber or stack over them (a paying customer always wins, the
 *  comp-grant rule). The gift stays redeemable for later. */
const BLOCKING_SUB_STATUSES = new Set(["active", "trialing", "past_due"]);

export function redeemDecision(input: {
  gift: RedeemGiftView | null;
  userEmail: string;
  existingSub: RedeemExistingSubView | null;
  now: Date;
}): RedeemDecision {
  const { gift, userEmail, existingSub, now } = input;
  if (!gift) {
    return {
      kind: "refuse",
      reason: "not_found",
      httpStatus: 404,
      message: "That gift code doesn't match any gift.",
    };
  }
  if (gift.status === "redeemed") {
    return {
      kind: "refuse",
      reason: "already_redeemed",
      httpStatus: 409,
      message: "This gift has already been redeemed.",
    };
  }
  if (gift.status === "expired") {
    return {
      kind: "refuse",
      reason: "expired",
      httpStatus: 410,
      message: "This gift's paid term has ended, so it can no longer be redeemed.",
    };
  }
  if (gift.status !== "paid") {
    return {
      kind: "refuse",
      reason: "unpaid",
      httpStatus: 400,
      message:
        "This gift hasn't been paid for yet — it can be redeemed once the purchase completes.",
    };
  }
  if (!gift.periodEnd || gift.periodEnd.getTime() <= now.getTime()) {
    return {
      kind: "refuse",
      reason: "expired",
      httpStatus: 410,
      message: "This gift's paid term has ended, so it can no longer be redeemed.",
    };
  }
  if (normalizeEmail(userEmail) !== normalizeEmail(gift.recipientEmail)) {
    return {
      kind: "refuse",
      reason: "email_mismatch",
      httpStatus: 403,
      message:
        "This gift was sent to a different email address. Sign in with the email the gift was sent to.",
    };
  }
  if (
    existingSub &&
    BLOCKING_SUB_STATUSES.has(existingSub.status) &&
    existingSub.currentPeriodEnd.getTime() > now.getTime()
  ) {
    return {
      kind: "refuse",
      reason: "already_subscribed",
      httpStatus: 409,
      message:
        "You already have a WorldEye plan active. This gift stays saved — redeem it once your current plan ends.",
    };
  }
  return { kind: "grant" };
}
