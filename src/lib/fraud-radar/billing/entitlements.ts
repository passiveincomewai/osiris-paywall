/**
 * Fraud Radar Phase 11 — the ONE entitlement matrix (PHASE11
 * §3.1/§3.2, SHV-11 P11-B). Every quota value lives here; the
 * per-phase modules (investigator, cases) are thin views over
 * this record, pinned deep-equal by entitlements.test.ts.
 *
 * Ratification: investigator ops 5/50/300/300 (Plus 50 = spec),
 * cases 3/25/200/200, vault closed/500MB/5GB/5GB, verifications
 * 5/50/300/300, processing 0/50/300/300 — all adopted unchanged
 * from PHASE7 §1.3 / PHASE8 §5.3. Reports values from PHASE9
 * §5.3 (no report tables ship in this tree yet, so they are
 * config-only until the reports payload lands). Graph/geo/
 * monitor values are PHASE11 §3.2 PROPOSED (Phase 10's caps
 * were not in this tree to ratify against — recorded in
 * RECORD-P11.md).
 */
import type { FrTier, FrTierOrNone } from "./plans";
import type { FrEntitlement } from "./tier";

export interface FrEntitlements {
  investigatorOpsPerMonth: number;
  perTurnCostCeilingUsd: number;
  investigatorMaxRounds: number;
  maxOpenCases: number;
  vaultEnabled: boolean;
  maxVaultBytes: bigint;
  maxEvidenceFileBytes: number;
  claimVerificationsPerMonth: number;
  processingJobsPerMonth: number;
  maxReports: number;
  reportGenerationsPerMonth: number;
  reportTemplates: "ac" | "all";
  zipIncludesEvidence: boolean;
  exportBytesPerMonth: bigint;
  graphMaxDepth: number;
  graphMaxNodes: number;
  entityMonitors: number;
}

const MB = BigInt(1_000_000);
const GB = BigInt(1_000_000_000);

export const FR_ENTITLEMENTS: Record<FrTier, FrEntitlements> = {
  free: {
    investigatorOpsPerMonth: 5, perTurnCostCeilingUsd: 0.25, investigatorMaxRounds: 6,
    maxOpenCases: 3, vaultEnabled: false, maxVaultBytes: BigInt(0),
    maxEvidenceFileBytes: 25_000_000, claimVerificationsPerMonth: 5,
    processingJobsPerMonth: 0, maxReports: 3, reportGenerationsPerMonth: 5,
    reportTemplates: "ac", zipIncludesEvidence: false,
    exportBytesPerMonth: BigInt(100) * MB, graphMaxDepth: 1, graphMaxNodes: 50,
    entityMonitors: 0,
  },
  plus: {
    investigatorOpsPerMonth: 50, perTurnCostCeilingUsd: 0.25, investigatorMaxRounds: 6,
    maxOpenCases: 25, vaultEnabled: true, maxVaultBytes: BigInt(500) * MB,
    maxEvidenceFileBytes: 25_000_000, claimVerificationsPerMonth: 50,
    processingJobsPerMonth: 50, maxReports: 50, reportGenerationsPerMonth: 100,
    reportTemplates: "all", zipIncludesEvidence: true,
    exportBytesPerMonth: GB, graphMaxDepth: 2, graphMaxNodes: 200,
    entityMonitors: 10,
  },
  pro: {
    investigatorOpsPerMonth: 300, perTurnCostCeilingUsd: 0.5, investigatorMaxRounds: 8,
    maxOpenCases: 200, vaultEnabled: true, maxVaultBytes: BigInt(5) * GB,
    maxEvidenceFileBytes: 25_000_000, claimVerificationsPerMonth: 300,
    processingJobsPerMonth: 300, maxReports: 500, reportGenerationsPerMonth: 1000,
    reportTemplates: "all", zipIncludesEvidence: true,
    exportBytesPerMonth: BigInt(10) * GB, graphMaxDepth: 3, graphMaxNodes: 1000,
    entityMonitors: 100,
  },
  teams: {
    investigatorOpsPerMonth: 300, perTurnCostCeilingUsd: 0.5, investigatorMaxRounds: 8,
    maxOpenCases: 200, vaultEnabled: true, maxVaultBytes: BigInt(5) * GB,
    maxEvidenceFileBytes: 25_000_000, claimVerificationsPerMonth: 300,
    processingJobsPerMonth: 300, maxReports: 500, reportGenerationsPerMonth: 1000,
    reportTemplates: "all", zipIncludesEvidence: true,
    exportBytesPerMonth: BigInt(10) * GB, graphMaxDepth: 3, graphMaxNodes: 1000,
    entityMonitors: 100,
  },
};

export function entitlementsForTier(tier: FrTierOrNone): FrEntitlements | null {
  return tier === "none" ? null : FR_ENTITLEMENTS[tier];
}

export function entitlementsFor(ent: FrEntitlement): FrEntitlements | null {
  return entitlementsForTier(ent.tier);
}

/** Teams pooled limit: per-seat value × seats (personal otherwise). */
export function pooledLimit(base: number, ent: FrEntitlement, pool: "personal" | "team"): number {
  if (pool === "team") return base * Math.max(1, ent.seats || 5);
  return base;
}
