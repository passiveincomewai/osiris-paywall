// ── Admin helpers: gating, fraud signals, audit ──────────────────────────

import { auth } from "@/auth";
import { db } from "@/lib/db";

export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export async function requireAdmin() {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();
  if (!email || !adminEmails().includes(email)) {
    const err = new Error("Admin only") as Error & { status?: number };
    err.status = 403;
    throw err;
  }
  return session;
}

export async function audit(action: string, opts: { actorUserId?: string; targetType?: string; targetId?: string; details?: Record<string, unknown> } = {}) {
  await db.affiliateAuditLog.create({
    data: {
      actorUserId: opts.actorUserId,
      action,
      targetType: opts.targetType,
      targetId: opts.targetId,
      details: (opts.details ?? {}) as object,
    },
  }).catch(() => {});
}

export interface FraudSignal {
  type: string;
  severity: "low" | "medium" | "high";
  detail: string;
  affiliateProfileId?: string;
}

/** Heuristic fraud scan for the admin dashboard. */
export async function fraudScan(limit = 50): Promise<FraudSignal[]> {
  const signals: FraudSignal[] = [];
  const since = new Date(Date.now() - 7 * 86400_000);

  // 1. Same IP hash attributed to many different users (duplicate accounts)
  const multiUser = await db.$queryRaw<{ ipHash: string; users: bigint }[]>`
    SELECT c."ipHash" AS "ipHash", COUNT(DISTINCT a."referredUserId") AS users
    FROM "ReferralAttribution" a
    JOIN "ReferralClick" c ON c."affiliateProfileId" = a."affiliateProfileId"
    WHERE a."createdAt" >= ${since}
    GROUP BY c."ipHash"
    HAVING COUNT(DISTINCT a."referredUserId") >= 4
    LIMIT 20`;
  for (const r of multiUser) {
    signals.push({
      type: "shared_ip_attributions",
      severity: Number(r.users) >= 8 ? "high" : "medium",
      detail: `${r.users} attributed users share one visitor hash in 7d`,
    });
  }

  // 2. Click farms: extreme click volume with zero attributions
  const clicky = await db.$queryRaw<{ affiliateProfileId: string; clicks: bigint }[]>`
    SELECT "affiliateProfileId", COUNT(*) AS clicks
    FROM "ReferralClick" WHERE "createdAt" >= ${since}
    GROUP BY "affiliateProfileId" HAVING COUNT(*) > 2000 LIMIT 20`;
  for (const r of clicky) {
    const attrs = await db.referralAttribution.count({ where: { affiliateProfileId: r.affiliateProfileId, createdAt: { gte: since } } });
    if (attrs === 0) {
      signals.push({
        type: "click_farm",
        severity: "medium",
        detail: `${r.clicks} clicks, 0 attributions in 7d`,
        affiliateProfileId: r.affiliateProfileId,
      });
    }
  }

  // 3. Suspended affiliates still generating clicks
  const susp = await db.affiliateProfile.count({ where: { status: { in: ["suspended", "banned"] } } });
  if (susp > 0) {
    signals.push({ type: "suspended_present", severity: "low", detail: `${susp} suspended/banned affiliates on record` });
  }

  return signals.slice(0, limit);
}
