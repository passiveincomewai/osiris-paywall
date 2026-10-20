// Shared loading for the seat quote/purchase routes: org (owner-only),
// the owner's subscription row, cycle, and live Stripe trial state.

import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { TeamError } from "./permissions";
import { cycleForPriceId, type Cycle } from "./seats";

export async function loadOwnerSeatContext(orgId: string, userId: string) {
  const org = await db.organization.findUnique({ where: { id: orgId } });
  if (!org) throw new TeamError(404, "Team not found");
  if (org.ownerId !== userId) throw new TeamError(403, "Only the team owner manages seats");
  const sub = await db.subscription.findUnique({ where: { userId: org.ownerId } });
  if (!sub) throw new TeamError(400, "The team owner has no subscription");
  const cycle: Cycle = cycleForPriceId(sub.stripePriceId);
  let trialing = sub.status === "trialing";
  let trialEndsAt: string | null = null;
  try {
    const stripeSub = await stripe().subscriptions.retrieve(sub.stripeSubscriptionId);
    if (stripeSub.status === "trialing" && stripeSub.trial_end) {
      trialing = true;
      trialEndsAt = new Date(stripeSub.trial_end * 1000).toISOString();
    }
  } catch {
    // Best-effort: the DB row still tells us the sub is trialing.
  }
  const [members, pending] = await Promise.all([
    db.organizationMember.count({ where: { organizationId: orgId } }),
    db.teamInvitation.count({ where: { organizationId: orgId, status: "pending" } }),
  ]);
  return { org, sub, cycle, trialing, trialEndsAt, members, pending };
}
