// ── API daily-quota warnings (2026-11 expansion, pick 13) ───────────
// A public-API key that burns through its day gets cut off at the
// tier limit with no warning today. This runner (hourly) emails the
// key's owner once per key per UTC day when usage crosses ~80% of
// the owner's tier limit — the limit itself resolved through the
// same ladder the /developers docs publish (lib/developer/limits).
// Transactional account-service class; dedupe via LifecycleEmailLog.

import { db } from "@/lib/db";
import { sendEmail, shell, escapeHtml, appUrl } from "@/lib/email";
import { isExcludedEmail } from "@/lib/lifecycle/config";
import { API_TIER_LIMITS, apiTierForUser } from "./limits";
import { utcDayStart } from "./auth";

export const API_QUOTA_TEMPLATE = "api_quota_warning";

/** Pure: at or past 80% of the daily limit (ceil — no float drift). */
export function quotaWarningDue(count: number, limit: number): boolean {
  return limit > 0 && count >= Math.ceil(limit * 0.8);
}

export function apiQuotaWarningEmail(input: {
  name: string | null;
  keyName: string;
  keyPrefix: string;
  usedLabel: string;
  limitLabel: string;
}): { subject: string; html: string } {
  const first = escapeHtml(input.name?.split(" ")[0] ?? "there");
  return {
    subject: `Your WorldEye API key “${input.keyName}” has used ${input.usedLabel} of ${input.limitLabel} daily requests`,
    html: shell(
      "Approaching today's API limit",
      `Key “${input.keyName}” has used ${input.usedLabel} of its ${input.limitLabel} daily requests.`,
      `<p style="color:#a1a1aa;font-size:15px;line-height:1.6;">Hi ${first},</p>
       <p style="color:#a1a1aa;font-size:15px;line-height:1.6;">Your public API key <strong style="color:#fff;">${escapeHtml(input.keyName)}</strong> (${escapeHtml(input.keyPrefix)}) has used <strong style="color:#fff;">${escapeHtml(input.usedLabel)}</strong> of its <strong style="color:#fff;">${escapeHtml(input.limitLabel)}</strong> requests for today (UTC). At the limit, further calls today return 429 until the counter resets at midnight UTC.</p>
       <p style="color:#a1a1aa;font-size:15px;line-height:1.6;">If this pace is normal for you, a higher plan raises the daily limit — the ladder is on the developers page. If it isn't expected, check the key hasn't leaked: you can revoke it and mint a fresh one under <strong style="color:#fff;">Settings → Developer</strong>.</p>`,
      { label: "See the API tiers", href: appUrl("/developers") },
      { why: "You're receiving this because one of your WorldEye API keys is nearing its daily quota." },
    ),
  };
}

export async function runApiQuotaAlerts(
  now: Date = new Date(),
): Promise<{ sent: number; checked: number }> {
  const dayStart = utcDayStart(now);
  const dayEnd = new Date(dayStart.getTime() + 86400_000);
  const keys = await db.enterpriseApiKey.findMany({
    where: {
      scope: "public",
      revokedAt: null,
      rateWindowStart: { gte: dayStart, lt: dayEnd },
      rateWindowCount: { gt: 0 },
    },
    take: 500,
  });
  let sent = 0;
  for (const key of keys) {
    try {
      const tier = await apiTierForUser(key.userId);
      const limit = API_TIER_LIMITS[tier].dailyRequests;
      if (!quotaWarningDue(key.rateWindowCount, limit)) continue;
      const user = await db.user.findUnique({
        where: { id: key.userId },
        select: { id: true, email: true, name: true },
      });
      if (!user || isExcludedEmail(user.email)) continue;
      const contextKey = `${key.id}:${dayStart.toISOString().slice(0, 10)}`;
      const already = await db.lifecycleEmailLog.findUnique({
        where: {
          userId_template_contextKey: {
            userId: user.id,
            template: API_QUOTA_TEMPLATE,
            contextKey,
          },
        },
        select: { id: true },
      });
      if (already) continue;
      const mail = apiQuotaWarningEmail({
        name: user.name,
        keyName: key.name,
        keyPrefix: key.keyPrefix,
        usedLabel: key.rateWindowCount.toLocaleString("en-US"),
        limitLabel: limit.toLocaleString("en-US"),
      });
      const ok = await sendEmail(user.email, mail.subject, mail.html);
      if (!ok) continue;
      await db.lifecycleEmailLog.create({
        data: { userId: user.id, template: API_QUOTA_TEMPLATE, contextKey },
      });
      sent++;
    } catch (err) {
      console.error(`[api-quota] failed for key ${key.id}:`, err);
    }
  }
  return { sent, checked: keys.length };
}
