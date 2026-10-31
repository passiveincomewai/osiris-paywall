/**
 * Fraud Radar Phase 7 — entitlement resolver + quota config
 * (PHASE7 §1.3, §4.3, §4.4).
 *
 * Phase 11 owns Fraud Radar billing and the real entitlement
 * enforcement. Phase 7 builds against this one interface —
 * `fraudRadarTierOf(session)` — and one quota config object, so
 * ratifying the numbers or wiring real subscriptions later is a
 * change inside this module, never a code hunt.
 *
 * V1 resolver behaviour (Phase 11 swaps the internals):
 *   - no session                       → "none" (routes 401 first)
 *   - a `fraudRadarTier` session claim → that tier, when valid
 *     (the Phase-11 claim shape, AUDIT §5, read opportunistically)
 *   - a platform admin (ADMIN_EMAILS)  → "pro" (flag-on staging)
 *   - any other signed-in user         → "free" (the Free Explorer
 *     taster allowance, recorded against the usage ledger)
 * With the flag OFF (production) the investigator routes 404
 * before entitlement is ever consulted.
 */

export type FraudRadarTier = "free" | "plus" | "pro" | "teams" | "none";

const TIERS: readonly FraudRadarTier[] = ["free", "plus", "pro", "teams"];

export interface SessionLike {
  user?: {
    id?: string | null;
    email?: string | null;
    fraudRadarTier?: unknown;
  } | null;
}

/** The Phase-11 entitlement interface (PHASE7 §1.3). */
export function fraudRadarTierOf(
  session: SessionLike | null | undefined,
  env: Record<string, string | undefined> = process.env,
): FraudRadarTier {
  const user = session?.user;
  if (!user?.id) return "none";
  const claim = user.fraudRadarTier;
  if (typeof claim === "string" && (TIERS as readonly string[]).includes(claim)) {
    return claim as FraudRadarTier;
  }
  const admins = (env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (user.email && admins.includes(user.email.toLowerCase())) return "pro";
  return "free";
}

export interface InvestigatorQuota {
  /** AI operations (user turns) per calendar month, UTC. */
  monthlyOps: number;
  /** Tool rounds per turn (§4.3; Pro/Teams get the higher cap). */
  maxRounds: number;
  /** Tool calls per turn (§4.3). */
  maxCallsPerTurn: number;
  /** Calls per round (§4.3). */
  maxCallsPerRound: number;
  /** Per-turn estimated-cost ceiling in USD (§4.4) — an audit
   *  bound; the token/round ceilings are the enforcement. */
  perTurnCostCeilingUsd: number;
}

/**
 * The one quota config object. The Plus figure is spec-anchored
 * ("≈50 AI research operations monthly", AUDIT §7 / README §27);
 * the rest are design defaults for Phase 11 to ratify here.
 */
export const INVESTIGATOR_QUOTAS: Record<
  Exclude<FraudRadarTier, "none">,
  InvestigatorQuota
> = {
  free: { monthlyOps: 5, maxRounds: 6, maxCallsPerTurn: 12, maxCallsPerRound: 4, perTurnCostCeilingUsd: 0.25 },
  plus: { monthlyOps: 50, maxRounds: 6, maxCallsPerTurn: 12, maxCallsPerRound: 4, perTurnCostCeilingUsd: 0.25 },
  pro: { monthlyOps: 300, maxRounds: 8, maxCallsPerTurn: 12, maxCallsPerRound: 4, perTurnCostCeilingUsd: 0.5 },
  teams: { monthlyOps: 300, maxRounds: 8, maxCallsPerTurn: 12, maxCallsPerRound: 4, perTurnCostCeilingUsd: 0.5 },
};

export function quotaForTier(tier: FraudRadarTier): InvestigatorQuota | null {
  return tier === "none" ? null : INVESTIGATOR_QUOTAS[tier];
}

/** The investigator's model: env override, else the house default (§4.1). */
export function investigatorModel(
  env: Record<string, string | undefined> = process.env,
): string {
  return env.FRAUD_RADAR_INVESTIGATOR_MODEL?.trim() || "gemini-2.0-flash";
}

/**
 * Published per-token rates used for the ledger's estimated cost
 * (USD per 1M tokens). An estimate, labelled as such wherever the
 * figure is shown — never a billed amount.
 */
export const MODEL_PRICING_PER_MILLION: Record<
  string,
  { input: number; output: number }
> = {
  "gemini-2.0-flash": { input: 0.1, output: 0.4 },
};

export function estimateCostUsd(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const rates = MODEL_PRICING_PER_MILLION[model] ??
    MODEL_PRICING_PER_MILLION["gemini-2.0-flash"];
  return (
    (inputTokens * rates.input + outputTokens * rates.output) / 1_000_000
  );
}
