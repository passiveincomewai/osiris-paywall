// Effective entitlement: a team member inherits the team OWNER's plan
// tier while the owner's subscription is active and the org is not
// suspended. effectiveTier = max(own tier, best org source tier).

import { db } from "@/lib/db";
import { planTierForRow, TIER_RANK, type PlanTier } from "@/lib/plan-tier";
import { MAX_MULTI_CAMERAS, MAX_MULTI_CAMERAS_VIP } from "@/lib/recording/multi";

export function recordingCapForTier(tier: PlanTier): number {
  if (tier === "vip") return MAX_MULTI_CAMERAS_VIP;
  if (tier === "pro") return MAX_MULTI_CAMERAS;
  return 0;
}

export function maxTier(a: PlanTier, b: PlanTier): PlanTier {
  return TIER_RANK[a] >= TIER_RANK[b] ? a : b;
}

export interface EntitlementSource {
  orgId: string;
  orgName: string;
  role: string;
  tier: PlanTier;
}

export interface EffectiveEntitlement {
  ownTier: PlanTier;
  effectiveTier: PlanTier;
  sources: EntitlementSource[];
}

export async function getEffectiveEntitlement(userId: string): Promise<EffectiveEntitlement> {
  const ownSub = await db.subscription.findUnique({ where: { userId } }).catch(() => null);
  const ownTier = planTierForRow(ownSub, process.env);

  const memberships = await db.organizationMember
    .findMany({
      where: { userId },
      include: {
        organization: {
          include: { owner: { include: { subscription: true } } },
        },
      },
    })
    .catch(() => []);

  const sources: EntitlementSource[] = [];
  let effectiveTier = ownTier;
  for (const m of memberships) {
    const org = m.organization;
    if (!org || org.suspended) continue;
    const ownerTier = planTierForRow(org.owner?.subscription ?? null, process.env);
    if (ownerTier === "free") continue;
    sources.push({ orgId: org.id, orgName: org.name, role: m.role, tier: ownerTier });
    effectiveTier = maxTier(effectiveTier, ownerTier);
  }
  return { ownTier, effectiveTier, sources };
}
