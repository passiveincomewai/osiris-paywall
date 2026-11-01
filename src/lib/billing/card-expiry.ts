// ── Card-expiring-soon notices (2026-11 expansion, pick 2) ──────────
// The gap dunning can't cover: dunning starts AFTER a charge fails.
// This warns a month ahead — when the card on file expires during the
// NEXT calendar month, the subscriber gets one transactional notice
// with the update path, while updating is still a choice rather than
// an emergency. The card itself is read from Stripe at run time (the
// subscription's default payment method) — nothing about cards is
// stored locally. Once per (subscription, expiry month) via
// LifecycleEmailLog, the dunning pattern.

import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { sendEmail, shell, escapeHtml, appUrl } from "@/lib/email";
import { isExcludedEmail } from "@/lib/lifecycle/config";

export const CARD_EXPIRY_TEMPLATE = "card_expiring";

/** Pure: does a card expiring (expMonth 1–12, expYear) expire during
 * the calendar month AFTER `now`'s month (UTC)? */
export function cardExpiryDue(expMonth: number, expYear: number, now: Date): boolean {
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return expYear === next.getUTCFullYear() && expMonth === next.getUTCMonth() + 1;
}

export function cardExpiringEmail(input: {
  name: string | null;
  /** e.g. "Visa ending 4242". */
  cardLabel: string;
  /** e.g. "December 2026". */
  expiresLabel: string;
}): { subject: string; html: string } {
  const first = escapeHtml(input.name?.split(" ")[0] ?? "there");
  return {
    subject: "Your WorldEye card expires next month",
    html: shell(
      "Your card is about to expire",
      `The card on file (${input.cardLabel}) expires ${input.expiresLabel} — update it now to keep your plan uninterrupted.`,
      `<p style="color:#a1a1aa;font-size:15px;line-height:1.6;">Hi ${first},</p>
       <p style="color:#a1a1aa;font-size:15px;line-height:1.6;">A heads-up while it's still a small thing: the card paying for your WorldEye subscription — <strong style="color:#fff;">${escapeHtml(input.cardLabel)}</strong> — expires in <strong style="color:#fff;">${escapeHtml(input.expiresLabel)}</strong>. If it lapses before your next renewal, the payment will fail and your plan will pause.</p>
       <p style="color:#a1a1aa;font-size:15px;line-height:1.6;">Updating takes a minute: <strong style="color:#fff;">Settings → Manage billing</strong>, and swap in the new card. Done now, your renewal never notices.</p>`,
      { label: "Update my card", href: appUrl("/settings") },
      { why: "You're receiving this because the card on your WorldEye account expires next month." },
    ),
  };
}

export async function runCardExpiryNotices(
  now: Date = new Date(),
): Promise<{ sent: number; checked: number }> {
  const s = stripe();
  const subs = await db.subscription.findMany({
    where: { status: { in: ["active", "trialing", "past_due"] } },
    select: { userId: true, stripeSubscriptionId: true, stripeCustomerId: true },
    take: 500,
  });
  let sent = 0;
  for (const row of subs) {
    try {
      const sub = await s.subscriptions.retrieve(row.stripeSubscriptionId);
      const pmId =
        typeof sub.default_payment_method === "string"
          ? sub.default_payment_method
          : sub.default_payment_method?.id;
      if (!pmId) continue;
      const pm = await s.paymentMethods.retrieve(pmId);
      if (!pm.card) continue;
      if (!cardExpiryDue(pm.card.exp_month, pm.card.exp_year, now)) continue;
      const user = await db.user.findUnique({
        where: { id: row.userId },
        select: { id: true, email: true, name: true },
      });
      if (!user || isExcludedEmail(user.email)) continue;
      const contextKey = `${row.stripeSubscriptionId}:${pm.card.exp_year}-${String(pm.card.exp_month).padStart(2, "0")}`;
      const already = await db.lifecycleEmailLog.findUnique({
        where: {
          userId_template_contextKey: {
            userId: user.id,
            template: CARD_EXPIRY_TEMPLATE,
            contextKey,
          },
        },
        select: { id: true },
      });
      if (already) continue;
      const brand = pm.card.brand
        ? pm.card.brand[0].toUpperCase() + pm.card.brand.slice(1)
        : "Card";
      const mail = cardExpiringEmail({
        name: user.name,
        cardLabel: `${brand} ending ${pm.card.last4}`,
        expiresLabel: new Date(Date.UTC(pm.card.exp_year, pm.card.exp_month - 1, 1)).toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
          timeZone: "UTC",
        }),
      });
      const ok = await sendEmail(user.email, mail.subject, mail.html);
      if (!ok) continue;
      await db.lifecycleEmailLog.create({
        data: { userId: user.id, template: CARD_EXPIRY_TEMPLATE, contextKey },
      });
      sent++;
    } catch (err) {
      console.error(`[card-expiry] failed for subscription ${row.stripeSubscriptionId}:`, err);
    }
  }
  return { sent, checked: subs.length };
}
