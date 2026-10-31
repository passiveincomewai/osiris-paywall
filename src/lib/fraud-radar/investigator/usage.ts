/**
 * Fraud Radar Phase 7 — usage ledger operations (PHASE7 §4.4).
 *
 * The ledger is the quota source of truth: monthly ops = count
 * of `charged` rows in the calendar month (UTC). Charge-before,
 * refund-on-failure (the Marketing Studio GenerationJob shape):
 * a turn's row is written `charged` at start; a provider failure,
 * a deadline, or a validator fallback-to-table flips it
 * `refunded`; a regeneration that succeeds stays charged — the
 * user got an answer. Client counters are never trusted.
 */

import { estimateCostUsd, quotaForTier, type FraudRadarTier } from "./entitlements";
import type { InvestigatorStore, LedgerRecord } from "./store";

/** The UTC calendar-month window containing `now`, plus the reset instant. */
export function monthWindowUtc(now: Date): { start: Date; end: Date; resetAt: Date } {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { start, end, resetAt: end };
}

export interface UsageSummary {
  tier: FraudRadarTier;
  /** Monthly AI-op allowance for the tier (0 when tier is none). */
  limit: number;
  /** Charged ops so far this calendar month (UTC). */
  used: number;
  remaining: number;
  /** First instant of next month (UTC), ISO string. */
  resetAt: string;
}

export async function getUsageSummary(
  store: InvestigatorStore,
  userId: string,
  tier: FraudRadarTier,
  now: Date = new Date(),
): Promise<UsageSummary> {
  const quota = quotaForTier(tier);
  const { start, end, resetAt } = monthWindowUtc(now);
  const used = await store.countChargedOps(userId, start, end);
  const limit = quota?.monthlyOps ?? 0;
  return {
    tier,
    limit,
    used,
    remaining: Math.max(0, limit - used),
    resetAt: resetAt.toISOString(),
  };
}

/** Charge-before: write the turn's ledger row as `charged`. */
export async function chargeTurn(
  store: InvestigatorStore,
  data: {
    userId: string;
    conversationId: string;
    turnId: string;
    tier: FraudRadarTier;
    model: string;
  },
): Promise<LedgerRecord> {
  return store.createLedger({
    userId: data.userId,
    conversationId: data.conversationId,
    turnId: data.turnId,
    tier: data.tier,
    model: data.model,
    inputTokens: 0,
    outputTokens: 0,
    toolCallCount: 0,
    estimatedCostUsd: 0,
    status: "charged",
    validatorVerdict: null,
  });
}

/** Record the finished turn's usage on its charged row. */
export async function settleTurn(
  store: InvestigatorStore,
  turnId: string,
  data: {
    inputTokens: number;
    outputTokens: number;
    toolCallCount: number;
    validatorVerdict: string;
  },
): Promise<void> {
  const row = await store.getLedgerByTurn(turnId);
  if (!row) return;
  await store.updateLedgerByTurn(turnId, {
    inputTokens: data.inputTokens,
    outputTokens: data.outputTokens,
    toolCallCount: data.toolCallCount,
    estimatedCostUsd: estimateCostUsd(row.model, data.inputTokens, data.outputTokens),
    validatorVerdict: data.validatorVerdict,
  });
}

/** Refund-on-failure: the turn costs the user nothing. Token and
 *  cost figures are still recorded — they are the audit record. */
export async function refundTurn(
  store: InvestigatorStore,
  turnId: string,
  data: {
    inputTokens: number;
    outputTokens: number;
    toolCallCount: number;
    validatorVerdict: string | null;
  },
): Promise<void> {
  const row = await store.getLedgerByTurn(turnId);
  if (!row) return;
  await store.updateLedgerByTurn(turnId, {
    inputTokens: data.inputTokens,
    outputTokens: data.outputTokens,
    toolCallCount: data.toolCallCount,
    estimatedCostUsd: estimateCostUsd(row.model, data.inputTokens, data.outputTokens),
    validatorVerdict: data.validatorVerdict,
    status: "refunded",
  });
}
