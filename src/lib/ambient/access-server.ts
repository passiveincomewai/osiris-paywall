/**
 * WorldEye Ambient — server-side access resolution for API routes
 * and server components. Mirrors src/auth.ts's claims resolver (own
 * Subscription row + fail-soft team-entitlement merge) so an API
 * answer never disagrees with the session the same user holds.
 */
import { db } from "@/lib/db";
import { ambientAccessForRow } from "./access";
import { planTierForRow, type PlanTier } from "@/lib/plan-tier";
import { getEffectiveEntitlement, maxTier } from "@/lib/team/entitlement";

export async function resolveAmbientAccess(userId: string): Promise<boolean> {
  const sub = await db.subscription.findUnique({ where: { userId } });
  if (ambientAccessForRow(sub, process.env)) return true;
  // Team-granted Pro/VIP bypasses the gate like own Pro does.
  try {
    const entitlement = await getEffectiveEntitlement(userId);
    const tier: PlanTier = maxTier(
      planTierForRow(sub, process.env),
      entitlement.effectiveTier,
    );
    return tier === "pro" || tier === "vip";
  } catch {
    return false;
  }
}
