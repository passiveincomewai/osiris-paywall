/**
 * Fraud Radar Phase 11 — admin READ models (SHV-11 P11-G
 * read-only half). Fail-soft like registry-admin.ts: absent
 * tables render an honest unavailable state, never a 500.
 * Admins see operations + billing metadata ONLY — counts,
 * tiers, statuses, usage and ids; never user content (§0.5).
 */
import { db } from "@/lib/db";

export interface FrAdminSubscriptionRow {
  userId: string; plan: string; interval: string; status: string;
  isComp: boolean; compSource: string | null; periodEnd: string;
  stripeSubscriptionId: string; // truncated by the caller view
}
export interface FrAdminUsageRow { kind: string; tierAtCharge: string; rows: number; reversals: number }

export async function listFrSubscriptions(limit = 50): Promise<{ available: boolean; rows: FrAdminSubscriptionRow[] }> {
  try {
    const rows = await db.fraudRadarSubscription.findMany({
      orderBy: { updatedAt: "desc" }, take: limit,
      select: {
        userId: true, plan: true, interval: true, status: true, isComp: true,
        compSource: true, currentPeriodEnd: true, stripeSubscriptionId: true,
      },
    });
    return {
      available: true,
      rows: rows.map((r) => ({ ...r, periodEnd: r.currentPeriodEnd.toISOString() })),
    };
  } catch { return { available: false, rows: [] }; }
}

export async function listFrUsageAggregates(): Promise<{ available: boolean; rows: FrAdminUsageRow[]; totalRows: number; totalReversals: number }> {
  try {
    const grouped = await db.frUsageLedger.groupBy({
      by: ["kind", "tierAtCharge"], _count: { _all: true },
    });
    const reversals = await db.frUsageLedger.count({ where: { reversalOfId: { not: null } } });
    const total = await db.frUsageLedger.count();
    return {
      available: true, totalRows: total, totalReversals: reversals,
      rows: grouped.map((g) => ({ kind: g.kind, tierAtCharge: g.tierAtCharge, rows: g._count._all, reversals: 0 })),
    };
  } catch { return { available: false, rows: [], totalRows: 0, totalReversals: 0 }; }
}
