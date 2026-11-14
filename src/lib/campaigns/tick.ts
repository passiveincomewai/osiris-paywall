// Campaign tick engine: one pass sends the next batch for every
// campaign in "sending" status. Called by the 5-minute Vercel cron
// (via /api/campaigns/tick with the CAMPAIGN_TICK_SECRET header) or
// manually from the admin panel ("Send next batch now", admin session).
//
// Rules (locked spec, 2026-11-14):
//  - At most 10 recipients per tick per campaign.
//  - Daily allowance: a campaign's own dailyCap when set; otherwise
//    the shared warm-up ramp (lib/campaigns/ramp) computed across ALL
//    campaigns from the earliest recorded send.
//  - Suppression is re-checked at send time — an address suppressed
//    after import is marked suppressed and never sent to.
//  - A provider error marks that one recipient failed (error text
//    stored); the tick itself never crashes on a send failure.
//  - A sending campaign with no pending recipients left is completed.

import { db } from "@/lib/db";
import { rampDailyCap, startOfUtcDay } from "./ramp";
import { renderCampaignEmail, sendCampaignEmail } from "./send";

export const TICK_BATCH_SIZE = 10;

export interface CampaignTickSummary {
  campaignId: string;
  name: string;
  sent: number;
  failed: number;
  suppressed: number;
  completed: boolean;
}

export interface TickSummary {
  at: string;
  campaigns: CampaignTickSummary[];
  totalSent: number;
}

export async function runCampaignTick(now = new Date()): Promise<TickSummary> {
  const campaigns = await db.emailCampaign.findMany({
    where: { status: "sending" },
    orderBy: { createdAt: "asc" },
  });

  // Global ramp inputs: earliest send ever + how many already went
  // out today (UTC) across every campaign.
  const earliest = await db.campaignRecipient.findFirst({
    where: { sentAt: { not: null } },
    orderBy: { sentAt: "asc" },
    select: { sentAt: true },
  });
  const dayStart = startOfUtcDay(now);
  let globalSentToday = await db.campaignRecipient.count({
    where: { sentAt: { gte: dayStart } },
  });
  const globalCap = rampDailyCap(earliest?.sentAt ?? null, now);

  const summaries: CampaignTickSummary[] = [];

  for (const campaign of campaigns) {
    const summary: CampaignTickSummary = {
      campaignId: campaign.id,
      name: campaign.name,
      sent: 0,
      failed: 0,
      suppressed: 0,
      completed: false,
    };

    let allowance: number;
    if (campaign.dailyCap != null) {
      const sentTodayByCampaign = await db.campaignRecipient.count({
        where: { campaignId: campaign.id, sentAt: { gte: dayStart } },
      });
      allowance = Math.max(0, campaign.dailyCap - sentTodayByCampaign);
    } else {
      allowance = Math.max(0, globalCap - globalSentToday);
    }
    const batchSize = Math.min(TICK_BATCH_SIZE, allowance);

    if (batchSize > 0) {
      const pending = await db.campaignRecipient.findMany({
        where: { campaignId: campaign.id, status: "pending" },
        orderBy: { createdAt: "asc" },
        take: batchSize,
      });
      for (const recipient of pending) {
        // Suppression re-check at send time.
        const suppressed = await db.emailSuppression.findUnique({
          where: { email: recipient.email },
          select: { id: true },
        });
        if (suppressed) {
          await db.campaignRecipient.update({
            where: { id: recipient.id },
            data: { status: "suppressed", error: "Suppressed before send" },
          });
          summary.suppressed++;
          continue;
        }
        const rendered = renderCampaignEmail(campaign, (recipient.meta ?? {}) as Record<string, unknown>);
        const result = await sendCampaignEmail({
          fromName: campaign.fromName,
          fromEmail: campaign.fromEmail,
          to: recipient.email,
          subject: rendered.subject,
          text: rendered.text,
          html: rendered.html,
        });
        if (result.ok) {
          await db.campaignRecipient.update({
            where: { id: recipient.id },
            data: { status: "sent", resendId: result.id, sentAt: new Date(), error: null },
          });
          summary.sent++;
          globalSentToday++;
        } else {
          await db.campaignRecipient.update({
            where: { id: recipient.id },
            data: { status: "failed", error: result.error },
          });
          summary.failed++;
        }
      }
    }

    const remaining = await db.campaignRecipient.count({
      where: { campaignId: campaign.id, status: "pending" },
    });
    if (remaining === 0) {
      await db.emailCampaign.update({
        where: { id: campaign.id },
        data: { status: "completed" },
      });
      summary.completed = true;
    }
    summaries.push(summary);
  }

  return {
    at: now.toISOString(),
    campaigns: summaries,
    totalSent: summaries.reduce((n, s) => n + s.sent, 0),
  };
}
