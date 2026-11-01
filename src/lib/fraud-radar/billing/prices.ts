/**
 * Fraud Radar Phase 11 — price-ID mapping, write-time only
 * (PHASE11 §1.4, SHV-11 P11-A).
 *
 * The map is built FROM ENV: each FrPlanDef.envKey present in env
 * contributes priceId -> def. Until the owner's P11-H step creates
 * the Stripe objects and sets the env vars, the map is EMPTY —
 * no plan is sellable or resolvable, and no price ID is ever
 * invented or hardcoded here.
 */
import { FR_PLAN_DEFS, type FrPlanDef } from "./plans";

export function frPriceMap(
  env: Record<string, string | undefined> = process.env,
): Map<string, FrPlanDef> {
  const map = new Map<string, FrPlanDef>();
  for (const d of FR_PLAN_DEFS) {
    const id = env[d.envKey]?.trim();
    if (id) map.set(id, d);
  }
  // Grandfathering mechanism (§1.6): FRAUD_RADAR_LEGACY_PRICE_IDS
  // holds comma-separated priceId:plan:interval triples for
  // superseded prices. Empty at launch; parsed defensively.
  const legacy = env.FRAUD_RADAR_LEGACY_PRICE_IDS?.trim();
  if (legacy) {
    for (const triple of legacy.split(",")) {
      const [priceId, plan, interval] = triple.split(":").map((s) => s?.trim());
      if (!priceId || map.has(priceId)) continue;
      const d = FR_PLAN_DEFS.find((x) => x.key === plan && x.interval === interval);
      if (d) map.set(priceId, d);
    }
  }
  return map;
}

export function frPlanForPriceId(
  priceId: string,
  env: Record<string, string | undefined> = process.env,
): FrPlanDef | null {
  return frPriceMap(env).get(priceId) ?? null;
}

export function isFraudRadarPriceId(
  priceId: string,
  env: Record<string, string | undefined> = process.env,
): boolean {
  return frPriceMap(env).has(priceId) || priceId.startsWith("frcomp_");
}

/** Synthetic comp price ids (§3.6) — never real Stripe objects. */
export const FR_COMP_PRICE_IDS: Record<string, string> = {
  plus: "frcomp_plus",
  pro: "frcomp_pro",
  teams: "frcomp_teams",
};
