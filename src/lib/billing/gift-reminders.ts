// ── Unredeemed-gift reminder runner (2026-11 expansion, pick 6) ─────
// A paid gift whose term is running but that nobody has redeemed is
// money evaporating: the BUYER gets one reminder inside the final
// week, carrying the same redemption link so they can pass it on.
// Dedupe via LifecycleEmailLog (template "gift_unredeemed_reminder",
// contextKey = gift id) — the dunning pattern. Account buyers only:
// guest checkouts have no User row to key the once-only log on, and
// inventing a second dedupe store for them isn't worth a duplicate
// risk; their confirmation email already carries the link.
// Dark with the feature: the runner no-ops while
// GIFT_SUBSCRIPTIONS_ENABLED is off, exactly like checkout.

import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { appUrl } from "@/lib/stripe";
import { PLAN_DEFS, type PlanKey } from "./plans";
import { giftSubscriptionsEnabled } from "./gift-flag";
import { giftUnredeemedReminderEmail } from "./gift";

export const GIFT_REMINDER_TEMPLATE = "gift_unredeemed_reminder";
export const GIFT_REMINDER_WINDOW_MS = 7 * 86400_000;

export async function runGiftReminders(
  now: Date = new Date(),
): Promise<{ sent: number; skipped?: string }> {
  if (!giftSubscriptionsEnabled(process.env)) return { sent: 0, skipped: "flag_off" };
  const gifts = await db.giftSubscription.findMany({
    where: {
      status: "paid",
      redeemedAt: null,
      buyerUserId: { not: null },
      periodEnd: { gt: now, lte: new Date(now.getTime() + GIFT_REMINDER_WINDOW_MS) },
    },
    take: 100,
  });
  let sent = 0;
  for (const gift of gifts) {
    if (!gift.buyerUserId || !gift.periodEnd) continue;
    const buyer = await db.user.findUnique({
      where: { id: gift.buyerUserId },
      select: { id: true, email: true, emailOptOut: true },
    });
    if (!buyer || buyer.emailOptOut) continue;
    const already = await db.lifecycleEmailLog.findUnique({
      where: {
        userId_template_contextKey: {
          userId: buyer.id,
          template: GIFT_REMINDER_TEMPLATE,
          contextKey: gift.id,
        },
      },
      select: { id: true },
    });
    if (already) continue;
    const plan = PLAN_DEFS[gift.planKey as PlanKey];
    const mail = giftUnredeemedReminderEmail({
      planDisplayName: plan?.displayName ?? gift.planKey,
      recipientEmail: gift.recipientEmail,
      periodEnd: gift.periodEnd,
      redeemUrl: `${appUrl()}/gift/redeem?code=${gift.code}`,
    });
    const ok = await sendEmail(buyer.email, mail.subject, mail.html);
    if (!ok) continue; // no log row on failure — next run retries
    await db.lifecycleEmailLog.create({
      data: { userId: buyer.id, template: GIFT_REMINDER_TEMPLATE, contextKey: gift.id },
    });
    sent++;
  }
  return { sent };
}
