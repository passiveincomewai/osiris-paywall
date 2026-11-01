/**
 * Fraud Radar Phase 8 — case entitlement interface (PHASE8 §5.3).
 *
 * Phase 11 owns Fraud Radar billing and ratifies these numbers.
 * Phase 8 builds against this one interface — the same
 * fraudRadarTierOf(session) resolver Phase 7 shipped — plus this
 * single quota config object, so ratifying a number later is a
 * one-line change here, never a code hunt. Phase 8 builds NO
 * billing: nothing in this module imports Stripe, the billing
 * library, or the main Subscription model (§14.3 guard).
 *
 * Enforcement points (all server-side): case creation (count),
 * evidence initiate (storage — P8-B), verification runs
 * (monthly count — P8-C), processing enqueue (monthly jobs —
 * P8-B/E). Quota exhaustion is an honest state (429 with the
 * limit stated), never a degraded write.
 */

import {
  fraudRadarTierOf,
  type FraudRadarTier,
  type SessionLike,
} from "../investigator/entitlements";

export { fraudRadarTierOf };
export type { FraudRadarTier, SessionLike };

/** The §2.2 per-file ceiling — tier-independent in v1. */
export const MAX_EVIDENCE_FILE_BYTES = 25_000_000;

export interface StorageQuota {
  /** Uploads to the vault enabled at all (artifact evidence is not gated by this). */
  vaultEnabled: boolean;
  /** Total vault bytes across the caller's cases. */
  maxVaultBytes: bigint;
  /** Per-file ceiling (§2.2). */
  maxEvidenceFileBytes: number;
}

export interface CaseEntitlements {
  /** Open cases (status != closed) the caller may hold. */
  maxOpenCases: number;
  storage: StorageQuota;
  /** Claim-verification runs per calendar month (UTC). */
  verificationsPerMonth: number;
  /** Document-processing jobs per calendar month (UTC). */
  processingJobsPerMonth: number;
}

import { FR_ENTITLEMENTS } from "../billing/entitlements";

const MB = BigInt(1_000_000);
const GB = BigInt(1_000_000_000);
void MB; void GB;

/**
 * The one quota config object — the §5.3 proposed defaults,
 * stored here for Phase 11 to ratify: Free 3 cases / vault
 * closed · Plus 25 / 500 MB · Pro 200 / 5 GB · Teams 200/seat /
 * 5 GB/seat pooled (per-seat figures in v1; pooling is a
 * Phase 11 resolver concern, not a config shape change).
 */
export const CASE_ENTITLEMENTS: Record<
  Exclude<FraudRadarTier, "none">,
  CaseEntitlements
> = (Object.fromEntries(
  (["free", "plus", "pro", "teams"] as const).map((tier) => {
    const e = FR_ENTITLEMENTS[tier];
    return [tier, {
      maxOpenCases: e.maxOpenCases,
      storage: {
        vaultEnabled: e.vaultEnabled,
        maxVaultBytes: e.maxVaultBytes,
        maxEvidenceFileBytes: e.maxEvidenceFileBytes,
      },
      verificationsPerMonth: e.claimVerificationsPerMonth,
      processingJobsPerMonth: e.processingJobsPerMonth,
    } satisfies CaseEntitlements];
  }),
) as unknown) as Record<Exclude<FraudRadarTier, "none">, CaseEntitlements>;

/** Entitlements for a tier; null for "none" (signed out — routes 401 first). */
export function caseEntitlementsFor(
  tier: FraudRadarTier,
): CaseEntitlements | null {
  return tier === "none" ? null : CASE_ENTITLEMENTS[tier];
}

/** Entitlements for a session, via the Phase 11 resolver interface. */
export function caseEntitlementsForSession(
  session: SessionLike | null | undefined,
  env: Record<string, string | undefined> = process.env,
): { tier: FraudRadarTier; entitlements: CaseEntitlements | null } {
  const tier = fraudRadarTierOf(session, env);
  return { tier, entitlements: caseEntitlementsFor(tier) };
}
