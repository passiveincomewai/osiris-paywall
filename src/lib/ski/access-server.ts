/**
 * Powder Pass — server-side access resolution for API routes and
 * server components. Mirrors src/auth.ts's claims resolver (own
 * Subscription row + fail-soft team-entitlement merge) so an API
 * answer never disagrees with the session the same user holds.
 * Inert while POWDER_PASS_ENABLED is off (lib/ski/access).
 */
import { db } from "@/lib/db";
import { powderPassEnabled, skiAccessForRow } from "./access";
import { planTierForRow, type PlanTier } from "@/lib/plan-tier";
import { getEffectiveEntitlement, maxTier } from "@/lib/team/entitlement";

export async function resolveSkiAccess(userId: string): Promise<boolean> {
  if (!powderPassEnabled(process.env)) return false;
  const sub = await db.subscription.findUnique({ where: { userId } });
  if (skiAccessForRow(sub, process.env)) return true;
  // Team-granted VIP includes Powder Pass like own VIP does.
  // (Team-granted Pro does not — Pro never includes ski.)
  try {
    const entitlement = await getEffectiveEntitlement(userId);
    const tier: PlanTier = maxTier(
      planTierForRow(sub, process.env),
      entitlement.effectiveTier,
    );
    return tier === "vip";
  } catch {
    return false;
  }
}
