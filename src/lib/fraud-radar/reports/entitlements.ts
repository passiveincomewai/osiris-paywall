/**
 * Fraud Radar Phase 9 — report entitlement interface
 * (PHASE9 §5.3).
 *
 * Phase 11 owns Fraud Radar billing and ratifies these
 * numbers. Phase 9 builds against this one interface — the
 * same fraudRadarTierOf(session) resolver Phases 7/8 shipped
 * — plus this single quota config object, so ratifying a
 * number later is a one-line change here. Phase 9 builds NO
 * billing: nothing in this module imports Stripe, the
 * billing library, or the main Subscription model (§14.3
 * guard).
 *
 * Enforcement points (all server-side): report creation
 * (count + template allowed), version creation (template
 * re-check), generate (monthly job count — the job table is
 * the ledger; the generate route lands in P9-C). Quota
 * exhaustion is an honest 429 with limit + reset stated,
 * never a degraded render.
 */

import {
  fraudRadarTierOf,
  type FraudRadarTier,
  type SessionLike,
} from "../investigator/entitlements";

export { fraudRadarTierOf };
export type { FraudRadarTier, SessionLike };

export interface ReportEntitlements {
  /** Reports the caller may hold (all statuses). */
  maxReports: number;
  /** Generation jobs per calendar month (UTC). A generation
   *  is one job run, any format count — formats are
   *  renderings of one validated document, metered once;
   *  re-export/download is unmetered. Enforced in P9-C. */
  generationsPerMonth: number;
  /** Template ids the tier may use, or "all". G/H are the
   *  sensitive pair: preparation for authorities stays a
   *  paid-tier surface — a product decision recorded in
   *  PHASE9 §5.3 for Phase 11 to ratify, not a safety claim. */
  templates: string[] | "all";
  /** ZIP bundles may include evidence files (F/G, per-item
   *  opt-in). Enforced in P9-C. */
  zipIncludesEvidence: boolean;
  /** Export bytes per calendar month. Enforced in P9-C. */
  maxExportBytesPerMonth: bigint;
}

const GB = BigInt(1_000_000_000);

/** The one quota config object — the §5.3 proposed defaults,
 *  stored here for Phase 11 to ratify. */
export const REPORT_ENTITLEMENTS: Record<
  Exclude<FraudRadarTier, "none">,
  ReportEntitlements
> = {
  free: {
    maxReports: 3,
    generationsPerMonth: 5,
    templates: ["A", "C"],
    zipIncludesEvidence: false,
    maxExportBytesPerMonth: BigInt(0),
  },
  plus: {
    maxReports: 50,
    generationsPerMonth: 100,
    templates: "all",
    zipIncludesEvidence: true,
    maxExportBytesPerMonth: GB,
  },
  pro: {
    maxReports: 500,
    generationsPerMonth: 1000,
    templates: "all",
    zipIncludesEvidence: true,
    maxExportBytesPerMonth: BigInt(10) * GB,
  },
  teams: {
    maxReports: 500,
    generationsPerMonth: 1000,
    templates: "all",
    zipIncludesEvidence: true,
    maxExportBytesPerMonth: BigInt(10) * GB,
  },
};

/** Entitlements for a tier; null for "none" (signed out — routes 401 first). */
export function reportEntitlementsFor(
  tier: FraudRadarTier,
): ReportEntitlements | null {
  return tier === "none" ? null : REPORT_ENTITLEMENTS[tier];
}

/** Entitlements for a session, via the Phase 11 resolver interface. */
export function reportEntitlementsForSession(
  session: SessionLike | null | undefined,
  env: Record<string, string | undefined> = process.env,
): { tier: FraudRadarTier; entitlements: ReportEntitlements | null } {
  const tier = fraudRadarTierOf(session, env);
  return { tier, entitlements: reportEntitlementsFor(tier) };
}

/** Whether a tier's entitlements allow a template at all. */
export function templateAllowed(
  entitlements: ReportEntitlements | null,
  templateId: string,
): boolean {
  if (!entitlements) return false;
  return (
    entitlements.templates === "all" ||
    entitlements.templates.includes(templateId)
  );
}
