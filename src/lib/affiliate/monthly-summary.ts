// ── Affiliate monthly summary (2026-11 expansion, pick 12) ──────────
// Affiliates currently hear from us per-event (signup, first
// commission, payout status) but never get the month in one place.
// On the 1st, every affiliate with ANY activity in the previous
// calendar month — attributed signups, commissions earned, payouts —
// gets one statement email with exactly those three numbers, read
// from the same tables the per-event mail uses. Silent months send
// nothing. Once per affiliate per month via LifecycleEmailLog
// (contextKey = the reported month, YYYY-MM), transactional class
// (it is an earnings statement, like the payout-status mail).

import { db } from "@/lib/db";
import { sendEmail, shell, escapeHtml, appUrl } from "@/lib/email";
import { isExcludedEmail } from "@/lib/lifecycle/config";
import { formatMoney } from "@/lib/billing/trial-reminders";

export const AFFILIATE_SUMMARY_TEMPLATE = "affiliate_monthly_summary";

/** Pure: the previous UTC calendar month as [start, end) + its key. */
export function previousMonthRange(now: Date): { start: Date; end: Date; key: string; label: string } {
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - 1, 1));
  const key = `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, "0")}`;
  const label = start.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
  return { start, end, key, label };
}

export function affiliateMonthlySummaryEmail(input: {
  name: string | null;
  monthLabel: string;
  signups: number;
  commissionsCount: number;
  commissionsCents: number;
  payoutsCount: number;
  payoutsCents: number;
}): { subject: string; html: string } {
  const first = escapeHtml(input.name?.split(" ")[0] ?? "there");
  const lines: string[] = [];
  if (input.signups > 0) {
    lines.push(
      `<p style="color:#a1a1aa;font-size:15px;line-height:1.6;margin:0 0 8px;"><strong style="color:#fff;">${input.signups}</strong> signup${input.signups === 1 ? "" : "s"} attributed to your link.</p>`,
    );
  }
  if (input.commissionsCount > 0) {
    lines.push(
      `<p style="color:#a1a1aa;font-size:15px;line-height:1.6;margin:0 0 8px;"><strong style="color:#fff;">${formatMoney(input.commissionsCents, "usd")}</strong> in commissions earned (${input.commissionsCount} commission${input.commissionsCount === 1 ? "" : "s"}).</p>`,
    );
  }
  if (input.payoutsCount > 0) {
    lines.push(
      `<p style="color:#a1a1aa;font-size:15px;line-height:1.6;margin:0 0 8px;"><strong style="color:#fff;">${formatMoney(input.payoutsCents, "usd")}</strong> in payouts processed (${input.payoutsCount} payout${input.payoutsCount === 1 ? "" : "s"}).</p>`,
    );
  }
  return {
    subject: `Your WorldEye affiliate summary for ${input.monthLabel}`,
    html: shell(
      `${input.monthLabel} in one place`,
      `Signups, commissions and payouts for ${input.monthLabel}.`,
      `<p style="color:#a1a1aa;font-size:15px;line-height:1.6;">Hi ${first},</p>
       <p style="color:#a1a1aa;font-size:15px;line-height:1.6;">Your affiliate month, straight from the ledger:</p>
       ${lines.join("\n")}
       <p style="color:#a1a1aa;font-size:15px;line-height:1.6;">The full breakdown — every attribution, commission and payout — lives in your affiliate dashboard.</p>`,
      { label: "Open my affiliate dashboard", href: appUrl("/affiliates") },
      { why: "You're receiving this because you have a WorldEye affiliate account with activity last month." },
    ),
  };
}

export async function runAffiliateMonthlySummary(
  now: Date = new Date(),
): Promise<{ sent: number; considered: number }> {
  const range = previousMonthRange(now);
  const inRange = { gte: range.start, lt: range.end };
  const profiles = await db.affiliateProfile.findMany({ select: { id: true, userId: true } });
  let sent = 0;
  for (const profile of profiles) {
    const [signups, commissions, payouts] = await Promise.all([
      db.referralAttribution.count({
        where: { affiliateProfileId: profile.id, createdAt: inRange },
      }),
      db.commission.findMany({
        where: { affiliateProfileId: profile.id, createdAt: inRange },
        select: { amountCents: true },
      }),
      db.payout.findMany({
        where: { affiliateProfileId: profile.id, requestedAt: inRange },
        select: { amountCents: true },
      }),
    ]);
    if (signups === 0 && commissions.length === 0 && payouts.length === 0) continue;
    const user = await db.user.findUnique({
      where: { id: profile.userId },
      select: { id: true, email: true, name: true },
    });
    if (!user || !user.email || isExcludedEmail(user.email)) continue;
    const already = await db.lifecycleEmailLog.findUnique({
      where: {
        userId_template_contextKey: {
          userId: user.id,
          template: AFFILIATE_SUMMARY_TEMPLATE,
          contextKey: range.key,
        },
      },
      select: { id: true },
    });
    if (already) continue;
    const mail = affiliateMonthlySummaryEmail({
      name: user.name,
      monthLabel: range.label,
      signups,
      commissionsCount: commissions.length,
      commissionsCents: commissions.reduce((a, c) => a + c.amountCents, 0),
      payoutsCount: payouts.length,
      payoutsCents: payouts.reduce((a, p) => a + p.amountCents, 0),
    });
    const ok = await sendEmail(user.email, mail.subject, mail.html);
    if (!ok) continue;
    await db.lifecycleEmailLog.create({
      data: { userId: user.id, recipientEmail: user.email, template: AFFILIATE_SUMMARY_TEMPLATE, contextKey: range.key, kind: "transactional", subject: mail.subject, status: "sent" },
    });
    sent++;
  }
  return { sent, considered: profiles.length };
}
