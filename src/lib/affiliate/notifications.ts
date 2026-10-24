// ── Affiliate notification center ────────────────────────────────────────
// Notifications are DERIVED from the real ledger tables (attributions,
// commissions, payouts) and materialized lazily on read with unique
// idempotency keys — a re-sync can never duplicate one, and nothing here
// invents an event that isn't in the source data. A notification's
// createdAt is the moment the underlying event happened, not the moment
// of the sync, so the feed reads in true chronological order.

import { db } from "@/lib/db";

interface NotificationDraft {
  type: string;
  title: string;
  body: string;
  href: string;
  idempotencyKey: string;
  createdAt: Date;
}

const fmtUsd = (cents: number) => `$${(cents / 100).toFixed(2)}`;

/** Build the full candidate set from source tables (pure reads). */
async function collectDrafts(affiliateProfileId: string): Promise<NotificationDraft[]> {
  const [attributions, payouts, firstCommission] = await Promise.all([
    db.referralAttribution.findMany({
      where: { affiliateProfileId },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: { id: true, createdAt: true, convertedAt: true },
    }),
    db.payout.findMany({
      where: { affiliateProfileId, status: { in: ["paid", "rejected"] } },
      orderBy: { requestedAt: "desc" },
      take: 50,
      select: { id: true, amountCents: true, status: true, decidedAt: true, requestedAt: true, note: true },
    }),
    db.commission.findFirst({
      where: { affiliateProfileId, status: { not: "reversed" } },
      orderBy: { createdAt: "asc" },
      select: { id: true, amountCents: true, createdAt: true, level: true },
    }),
  ]);

  const drafts: NotificationDraft[] = [];

  for (const a of attributions) {
    drafts.push({
      type: "referral_signup",
      title: "New referral signup",
      body: "Someone created a WorldEye account through your referral link.",
      href: "/affiliates/network",
      idempotencyKey: `signup:${a.id}`,
      createdAt: a.createdAt,
    });
    if (a.convertedAt) {
      drafts.push({
        type: "referral_converted",
        title: "A referral subscribed",
        body: "One of your referrals became a paying subscriber — commissions from them now flow into your ledger.",
        href: "/affiliates/dashboard",
        idempotencyKey: `converted:${a.id}`,
        createdAt: a.convertedAt,
      });
    }
  }

  if (firstCommission) {
    drafts.push({
      type: "first_commission",
      title: "First commission earned",
      body: `Your first commission of ${fmtUsd(firstCommission.amountCents)} landed. It becomes available after the holding period.`,
      href: "/affiliates/dashboard",
      idempotencyKey: `first-commission:${affiliateProfileId}`,
      createdAt: firstCommission.createdAt,
    });
  }

  for (const p of payouts) {
    if (p.status === "paid") {
      drafts.push({
        type: "payout_paid",
        title: "Payout sent",
        body: `Your payout of ${fmtUsd(p.amountCents)} was approved and sent.`,
        href: "/affiliates/dashboard",
        idempotencyKey: `payout-paid:${p.id}`,
        createdAt: p.decidedAt ?? p.requestedAt,
      });
    } else if (p.status === "rejected") {
      drafts.push({
        type: "payout_rejected",
        title: "Payout request declined",
        body: `Your payout request of ${fmtUsd(p.amountCents)} was declined${p.note ? `: ${p.note}` : "."} The commissions returned to your available balance.`,
        href: "/affiliates/dashboard",
        idempotencyKey: `payout-rejected:${p.id}`,
        createdAt: p.decidedAt ?? p.requestedAt,
      });
    }
  }

  return drafts;
}

/** Materialize any missing notifications for this affiliate. */
export async function syncAffiliateNotifications(affiliateProfileId: string): Promise<void> {
  const drafts = await collectDrafts(affiliateProfileId);
  if (!drafts.length) return;
  const existing = await db.affiliateNotification.findMany({
    where: { affiliateProfileId, idempotencyKey: { in: drafts.map((d) => d.idempotencyKey) } },
    select: { idempotencyKey: true },
  });
  const have = new Set(existing.map((e) => e.idempotencyKey));
  const missing = drafts.filter((d) => !have.has(d.idempotencyKey));
  for (const d of missing) {
    await db.affiliateNotification
      .create({ data: { affiliateProfileId, ...d } })
      .catch(() => {}); // unique-key race with a parallel sync — already there is fine
  }
}

export async function listNotifications(affiliateProfileId: string, take = 30) {
  await syncAffiliateNotifications(affiliateProfileId).catch(() => {});
  const [items, unread] = await Promise.all([
    db.affiliateNotification.findMany({
      where: { affiliateProfileId },
      orderBy: { createdAt: "desc" },
      take,
    }),
    db.affiliateNotification.count({ where: { affiliateProfileId, readAt: null } }),
  ]);
  return { items, unread };
}

export async function markNotificationsRead(affiliateProfileId: string, ids?: string[]): Promise<number> {
  const res = await db.affiliateNotification.updateMany({
    where: {
      affiliateProfileId,
      readAt: null,
      ...(ids && ids.length ? { id: { in: ids } } : {}),
    },
    data: { readAt: new Date() },
  });
  return res.count;
}
