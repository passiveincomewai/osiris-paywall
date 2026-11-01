/**
 * Fraud Radar Phase 11 — plan family (PHASE11 §1.2, SHV-11 P11-A).
 *
 * The ONLY home of the FR plan family, mirroring the house
 * lib/billing/plans.ts central-config pattern WITHOUT importing
 * it (dependency guard: lib/fraud-radar/** never imports
 * lib/billing/** — pinned by non-interference.test.ts).
 *
 * Prices are DATA only. No Stripe objects exist for Fraud Radar:
 * catalogue creation is the owner's P11-H operations step
 * (OD-3), deferred by design. Where a Stripe price ID would go,
 * the config records it as not-created: every def's envKey is
 * unset until P11-H, and an unset env var means the plan is not
 * sellable and not resolvable (prices.ts) — never a hardcoded
 * fallback ID.
 *
 * Trials ship OFF (OD-1 fallback): FRAUD_RADAR_TRIAL_DAYS = 0.
 * Enabling trials later is a config + copy change, never schema.
 */

export type FrTier = "free" | "plus" | "pro" | "teams";
export type FrTierOrNone = FrTier | "none";
export type FrPlanKey = "plus" | "pro" | "teams";
export type FrInterval = "month" | "year";

export interface FrPlanDef {
  key: FrPlanKey;
  tier: FrTier;
  interval: FrInterval;
  /** Env var that WILL hold the Stripe price id after P11-H. */
  envKey: string;
  /** Display only; Stripe is the ledger once objects exist. */
  displayPrice: string;
  displayName: string;
  seatsIncluded: number | null;
  /** Stripe catalogue state: no FR objects have been created. */
  stripeObjectCreated: false;
}

function def(
  key: FrPlanKey,
  interval: FrInterval,
  envKey: string,
  displayPrice: string,
  displayName: string,
  seatsIncluded: number | null,
): FrPlanDef {
  return { key, tier: key, interval, envKey, displayPrice, displayName, seatsIncluded, stripeObjectCreated: false };
}

/** The five sellable combinations (§2.2). Teams is monthly-only
 *  in v1 (OD-2 fallback: no Teams annual figure exists; 5 seats
 *  included, capped — no per-seat price exists). */
export const FR_PLAN_DEFS: FrPlanDef[] = [
  def("plus", "month", "FRAUD_RADAR_PLUS_PRICE_ID", "$29.99", "Fraud Radar Plus", null),
  def("plus", "year", "FRAUD_RADAR_PLUS_ANNUAL_PRICE_ID", "$299", "Fraud Radar Plus", null),
  def("pro", "month", "FRAUD_RADAR_PRO_PRICE_ID", "$99", "Fraud Radar Pro", null),
  def("pro", "year", "FRAUD_RADAR_PRO_ANNUAL_PRICE_ID", "$999", "Fraud Radar Pro", null),
  def("teams", "month", "FRAUD_RADAR_TEAMS_PRICE_ID", "$349", "Fraud Radar Teams", 5),
];

export function frPlanDef(key: FrPlanKey, interval: FrInterval): FrPlanDef | null {
  return FR_PLAN_DEFS.find((d) => d.key === key && d.interval === interval) ?? null;
}

/** OD-1 fallback, shipped: trials OFF. */
export const FRAUD_RADAR_TRIAL_DAYS = 0;

/** Tier ordering for max-tier resolution (§1.3 step 5). */
export const FR_TIER_RANK: Record<FrTierOrNone, number> = {
  none: 0, free: 1, plus: 2, pro: 3, teams: 4,
};

export function maxFrTier(a: FrTierOrNone, b: FrTierOrNone): FrTierOrNone {
  return FR_TIER_RANK[a] >= FR_TIER_RANK[b] ? a : b;
}

export function isFrTier(v: unknown): v is FrTier {
  return v === "free" || v === "plus" || v === "pro" || v === "teams";
}
