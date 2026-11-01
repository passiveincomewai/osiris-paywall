/**
 * Fraud Radar Phase 7 — admin aggregate usage read model
 * (PHASE7 §3.5, Payload P7-D).
 *
 * Platform admins see OPERATIONS AGGREGATES ONLY in
 * /admin/fraud-radar: turn counts, ops by tier, ledger totals,
 * model-error events, and validator outcomes. A user's research
 * is their work product — this module never reads a
 * conversation's text, a question, or an answer. Every query
 * below is a count / sum / group-by over the usage ledger and
 * the message table's status columns, plus one date-only read
 * for the per-day series; no message text column is selected
 * anywhere in this module (pinned by admin-usage.test.ts and
 * the §14.3 isolation suite).
 *
 * Fail-soft by design, following registry-admin.ts: before the
 * investigator migration is applied (or if the DB is
 * unreachable) the admin view renders an honest not-available
 * state instead of crashing.
 */

import { db } from "@/lib/db";

export interface InvestigatorUsageTotals {
  /** All turns ever recorded in the ledger (any status). */
  turns: number;
  /** Turns that stand charged (the billable AI ops). */
  chargedOps: number;
  /** Turns refunded (provider failure, deadline, validator fallback). */
  refundedOps: number;
  failedFreeOps: number;
  inputTokens: number;
  outputTokens: number;
  toolCalls: number;
  /** Sum of the ledger's estimated cost (an estimate, labelled). */
  estimatedCostUsd: number;
}

export interface InvestigatorTierUsage {
  tier: string;
  turns: number;
  chargedOps: number;
  estimatedCostUsd: number;
}

export interface InvestigatorDayUsage {
  /** UTC day, YYYY-MM-DD. */
  day: string;
  turns: number;
}

export interface InvestigatorAdminUsage {
  /** false when the investigator tables could not be read at all. */
  available: boolean;
  totals: InvestigatorUsageTotals;
  byTier: InvestigatorTierUsage[];
  /** Charged + refunded + failed turns per UTC day, last 30 days. */
  turnsByDay: InvestigatorDayUsage[];
  /** Settled-turn validator outcomes (ledger verdict column). */
  validator: {
    pass: number;
    regenerated: number;
    fallback: number;
    /** fallback / (pass + regenerated + fallback); null when no settled turn exists. */
    fallbackRate: number | null;
  };
  /** Error events by house error code (message rows in error state). */
  errorsByCode: { code: string; count: number }[];
  /** Model-availability failures: not-configured + provider-down + bad key. */
  modelDownEvents: number;
}

const MODEL_DOWN_CODES = ["AI_NOT_CONFIGURED", "PROVIDER_UNAVAILABLE", "INVALID_KEY"];

const EMPTY: InvestigatorAdminUsage = {
  available: false,
  totals: {
    turns: 0,
    chargedOps: 0,
    refundedOps: 0,
    failedFreeOps: 0,
    inputTokens: 0,
    outputTokens: 0,
    toolCalls: 0,
    estimatedCostUsd: 0,
  },
  byTier: [],
  turnsByDay: [],
  validator: { pass: 0, regenerated: 0, fallback: 0, fallbackRate: null },
  errorsByCode: [],
  modelDownEvents: 0,
};

/** Bucket ledger creation instants into UTC days (last 30 days). */
export function bucketTurnsByDay(
  instants: Date[],
  now: Date = new Date(),
): InvestigatorDayUsage[] {
  const days: InvestigatorDayUsage[] = [];
  const byDay = new Map<string, number>();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i));
    const key = d.toISOString().slice(0, 10);
    byDay.set(key, 0);
    days.push({ day: key, turns: 0 });
  }
  for (const instant of instants) {
    const key = instant.toISOString().slice(0, 10);
    if (byDay.has(key)) byDay.set(key, (byDay.get(key) ?? 0) + 1);
  }
  for (const row of days) row.turns = byDay.get(row.day) ?? 0;
  return days;
}

export async function getInvestigatorAdminUsage(
  now: Date = new Date(),
): Promise<InvestigatorAdminUsage> {
  try {
    const windowStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 29),
    );
    const [aggregate, byTierStatus, byVerdict, byError, recent] = await Promise.all([
      db.frInvestigatorUsageLedger.aggregate({
        _count: { _all: true },
        _sum: { inputTokens: true, outputTokens: true, toolCallCount: true, estimatedCostUsd: true },
      }),
      db.frInvestigatorUsageLedger.groupBy({
        by: ["tier", "status"],
        _count: { _all: true },
        _sum: { estimatedCostUsd: true },
      }),
      db.frInvestigatorUsageLedger.groupBy({
        by: ["validatorVerdict"],
        _count: { _all: true },
      }),
      db.frInvestigatorMessage.groupBy({
        by: ["errorCode"],
        where: { status: "error" },
        _count: { _all: true },
      }),
      // Date-only read for the per-day series — no text column
      // is selected, here or anywhere in this module.
      db.frInvestigatorUsageLedger.findMany({
        where: { createdAt: { gte: windowStart } },
        select: { createdAt: true },
      }),
    ]);

    const statusCount = (status: string) =>
      byTierStatus
        .filter((r) => r.status === status)
        .reduce((sum, r) => sum + r._count._all, 0);

    const tierMap = new Map<string, InvestigatorTierUsage>();
    for (const row of byTierStatus) {
      const entry = tierMap.get(row.tier) ?? {
        tier: row.tier,
        turns: 0,
        chargedOps: 0,
        estimatedCostUsd: 0,
      };
      entry.turns += row._count._all;
      if (row.status === "charged") entry.chargedOps += row._count._all;
      entry.estimatedCostUsd += Number(row._sum.estimatedCostUsd ?? 0);
      tierMap.set(row.tier, entry);
    }

    const verdictCount = (verdict: string) =>
      byVerdict.find((r) => r.validatorVerdict === verdict)?._count._all ?? 0;
    const pass = verdictCount("pass");
    const regenerated = verdictCount("regenerated");
    const fallback = verdictCount("fallback");
    const settled = pass + regenerated + fallback;

    const errorsByCode = byError
      .filter((r) => r.errorCode !== null)
      .map((r) => ({ code: r.errorCode as string, count: r._count._all }))
      .sort((a, b) => b.count - a.count || a.code.localeCompare(b.code));

    return {
      available: true,
      totals: {
        turns: aggregate._count._all,
        chargedOps: statusCount("charged"),
        refundedOps: statusCount("refunded"),
        failedFreeOps: statusCount("failed_free"),
        inputTokens: aggregate._sum.inputTokens ?? 0,
        outputTokens: aggregate._sum.outputTokens ?? 0,
        toolCalls: aggregate._sum.toolCallCount ?? 0,
        estimatedCostUsd: Number(aggregate._sum.estimatedCostUsd ?? 0),
      },
      byTier: [...tierMap.values()].sort((a, b) => a.tier.localeCompare(b.tier)),
      turnsByDay: bucketTurnsByDay(
        recent.map((r) => r.createdAt),
        now,
      ),
      validator: {
        pass,
        regenerated,
        fallback,
        fallbackRate: settled > 0 ? fallback / settled : null,
      },
      errorsByCode,
      modelDownEvents: errorsByCode
        .filter((r) => MODEL_DOWN_CODES.includes(r.code))
        .reduce((sum, r) => sum + r.count, 0),
    };
  } catch {
    return EMPTY;
  }
}
