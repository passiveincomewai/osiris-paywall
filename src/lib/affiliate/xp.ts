// ── XP engine: idempotent awards + anti-abuse ─────────────────────────────
// Every award carries an idempotency key (activity + subject). Replays and
// double-clicks can never double-award. XP has no cash value.

import { db } from "@/lib/db";
import { getSettings } from "./settings";
import { rankFor } from "./ranks";
import { maybeGrantVisionaryPro } from "@/lib/pro/comp";

export async function awardXP(
  affiliateProfileId: string,
  activity: string,
  opts: { xp?: number; idempotencyKey: string; meta?: Record<string, unknown> } = { idempotencyKey: "" },
): Promise<{ awarded: boolean; totalXp: number; rankUp: boolean; xp: number }> {
  if (!opts.idempotencyKey) throw new Error("awardXP requires an idempotencyKey");
  const settings = await getSettings();
  const amount = opts.xp ?? settings.xpTable[activity] ?? 0;
  if (amount <= 0) {
    const p = await db.affiliateProfile.findUnique({ where: { id: affiliateProfileId }, select: { xp: true } });
    return { awarded: false, totalXp: p?.xp ?? 0, rankUp: false, xp: 0 };
  }

  const before = await db.affiliateProfile.findUnique({ where: { id: affiliateProfileId }, select: { xp: true } });
  const beforeXp = before?.xp ?? 0;

  // Idempotent insert: duplicate key → no-op (no double award, no throw).
  let created = false;
  try {
    await db.xPEvent.create({
      data: {
        affiliateProfileId,
        activity,
        xp: amount,
        idempotencyKey: opts.idempotencyKey,
        meta: (opts.meta ?? {}) as object,
      },
    });
    created = true;
  } catch (e: unknown) {
    if (e instanceof Error && /unique/i.test(e.message)) {
      return { awarded: false, totalXp: beforeXp, rankUp: false, xp: 0 };
    }
    throw e;
  }

  const updated = await db.affiliateProfile.update({
    where: { id: affiliateProfileId },
    data: { xp: { increment: amount } },
    select: { xp: true },
  });

  const rankUp = rankFor(updated.xp, settings.ranks).key !== rankFor(beforeXp, settings.ranks).key;

  // Visionary perk: free WorldEye Pro at the top rank. awardXP is the single
  // choke point for every XP source, so the check lives here. The helper is
  // idempotent (re-grants extend the comp period), never overwrites a paid
  // Stripe subscription, and never throws — a comp failure can't break XP.
  if (rankFor(updated.xp, settings.ranks).key === "visionary") {
    const prof = await db.affiliateProfile.findUnique({
      where: { id: affiliateProfileId },
      select: { userId: true },
    });
    if (prof?.userId) await maybeGrantVisionaryPro(prof.userId, updated.xp, settings.ranks);
  }

  void created;
  return { awarded: true, totalXp: updated.xp, rankUp, xp: amount };
}

/** Count distinct paying referrals (L1 customers with ≥1 paid commission). */
export async function countPayingReferrals(affiliateProfileId: string): Promise<number> {
  const rows = await db.commission.findMany({
    where: { affiliateProfileId, level: 1, status: { not: "reversed" }, amountCents: { gt: 0 } },
    select: { referredUserId: true },
    distinct: ["referredUserId"],
  });
  return rows.filter((r) => r.referredUserId).length;
}
