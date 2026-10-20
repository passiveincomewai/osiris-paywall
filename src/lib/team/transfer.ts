// Team Access — secure organization ownership transfer (Phase 8).
//
// The owner can hand the org to a member, but only to someone who can
// actually fund it: the new owner must have their OWN subscription
// folding active (active/trialing, period in the future), on the SAME
// billing cycle as the org, and must not already own an organization.
//
// Billing choreography (abort-safe, in order):
//  a. Add the seat item to the TARGET's subscription (prorated). A
//     trialing target simply adds the item to the trial.
//  b. Remove the seat item from the OLD owner's subscription
//     (prorated). If this fails after (a) succeeded, (a) is rolled
//     back by deleting the just-created item and NOTHING is written
//     to the database.
//  c. DB transaction: ownerId swap, new seat item id/price, pending
//     seat downgrade cancelled (it belonged to the old owner's
//     billing), membership roles swapped (target → owner, old
//     owner → admin), activity logged.
//  d. Reconcile purchasedSeats from the target's Stripe subscription.
//
// The webhook remains the sole Subscription writer — this module only
// moves a subscription ITEM between two existing subscriptions via
// the Stripe API, which the webhook reconciles as usual.

import type Stripe from "stripe";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { subscriptionStatusFromRow } from "@/lib/subscription-status";
import { TeamError } from "./permissions";
import { getTeamPricingConfig, type TeamPricingConfigResolved } from "./pricing-config";
import {
  cycleForPriceId,
  findSeatItem,
  reconcileOrgSeatsFromSubscription,
  type Cycle,
} from "./seats";
import { logTeamActivity } from "./activity";
import { recordTeamEvent } from "./analytics";

export const TRANSFER_CONFIRMATION = "TRANSFER";

/* ------------------------------------------------------------------ */
/* Guards (pure)                                                       */
/* ------------------------------------------------------------------ */

/** The confirm string must be exactly "TRANSFER" — no case games. */
export function assertTransferConfirmation(confirm: unknown): void {
  if (confirm !== TRANSFER_CONFIRMATION) {
    throw new TeamError(400, 'Type TRANSFER to confirm the ownership transfer');
  }
}

/* ------------------------------------------------------------------ */
/* Billing cycle                                                       */
/* ------------------------------------------------------------------ */

/**
 * The org's billing cycle: derived from the seat price it bills
 * (org.stripeSeatPriceId via the pricing config's seatPriceIds),
 * falling back to the current owner's own subscription cycle when
 * the org has no seat item.
 */
export function resolveOrgBillingCycle(
  org: { stripeSeatPriceId?: string | null },
  ownerSub: { stripePriceId?: string | null } | null | undefined,
  config: TeamPricingConfigResolved,
): Cycle {
  if (org.stripeSeatPriceId) {
    const match = (Object.entries(config.seatPriceIds) as Array<[Cycle, string]>).find(
      ([, priceId]) => priceId === org.stripeSeatPriceId,
    );
    if (match) return match[0];
  }
  return cycleForPriceId(ownerSub?.stripePriceId);
}

/* ------------------------------------------------------------------ */
/* Eligibility                                                         */
/* ------------------------------------------------------------------ */

export interface TransferEligibility {
  eligible: boolean;
  /** Plain-words reason when ineligible; null when eligible. */
  reason: string | null;
  targetCycle: Cycle | null;
  trialing: boolean;
}

interface TargetSubLike {
  status: string;
  currentPeriodEnd: Date;
  stripePriceId: string;
}

/**
 * Pure eligibility check for a prospective new owner.
 *  - must have their own Subscription row folding active
 *    (active/trialing with the period still in the future);
 *  - their cycle must equal the org's billing cycle;
 *  - they must not already own an Organization.
 */
export function evaluateTransferEligibility(input: {
  targetSub: TargetSubLike | null | undefined;
  orgCycle: Cycle;
  targetOwnsOrganization: boolean;
  now?: Date;
}): TransferEligibility {
  const { targetSub, orgCycle } = input;
  const trialing = targetSub?.status === "trialing";
  if (!targetSub) {
    return {
      eligible: false,
      reason: "This member has no subscription of their own — they need an active WorldEye plan to own the team.",
      targetCycle: null,
      trialing: false,
    };
  }
  if (subscriptionStatusFromRow(targetSub, input.now) !== "active") {
    return {
      eligible: false,
      reason: "This member's subscription isn't active — it must be active or in a free trial to take over the team.",
      targetCycle: cycleForPriceId(targetSub.stripePriceId),
      trialing,
    };
  }
  const targetCycle = cycleForPriceId(targetSub.stripePriceId);
  if (input.targetOwnsOrganization) {
    return {
      eligible: false,
      reason: "This member already owns a team — a person can only own one team.",
      targetCycle,
      trialing,
    };
  }
  if (targetCycle !== orgCycle) {
    return {
      eligible: false,
      reason: `This member's plan bills ${targetCycle} but this team bills ${orgCycle} — they need a ${orgCycle} plan to take over the team.`,
      targetCycle,
      trialing,
    };
  }
  return { eligible: true, reason: null, targetCycle, trialing };
}

/** Eligibility with the DB lookups (target subscription + owned org). */
export async function getTransferEligibility(
  targetUserId: string,
  orgCycle: Cycle,
  now?: Date,
): Promise<{ eligibility: TransferEligibility; targetSub: TargetSubLike | null }> {
  const [targetSub, ownedOrg] = await Promise.all([
    db.subscription.findUnique({ where: { userId: targetUserId } }),
    db.organization.findUnique({ where: { ownerId: targetUserId } }),
  ]);
  const eligibility = evaluateTransferEligibility({
    targetSub,
    orgCycle,
    targetOwnsOrganization: !!ownedOrg,
    now,
  });
  return { eligibility, targetSub };
}

/* ------------------------------------------------------------------ */
/* Candidates (owner only)                                             */
/* ------------------------------------------------------------------ */

export interface TransferCandidate {
  userId: string;
  name: string | null;
  email: string | null;
  role: string;
  eligible: boolean;
  reason: string | null;
}

async function loadOrgOwnedBy(orgId: string, callerId: string) {
  const org = await db.organization.findUnique({ where: { id: orgId } });
  if (!org) throw new TeamError(404, "Team not found");
  if (org.ownerId !== callerId) {
    throw new TeamError(403, "Only the team owner can transfer ownership");
  }
  return org;
}

export async function listTransferCandidates(
  orgId: string,
  callerId: string,
): Promise<TransferCandidate[]> {
  const org = await loadOrgOwnedBy(orgId, callerId);
  const config = await getTeamPricingConfig();
  const ownerSub = await db.subscription.findUnique({ where: { userId: org.ownerId } });
  const orgCycle = resolveOrgBillingCycle(org, ownerSub, config);

  const members = await db.organizationMember.findMany({
    where: { organizationId: orgId },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: "asc" },
  });

  const candidates: TransferCandidate[] = [];
  for (const m of members) {
    if (m.userId === org.ownerId) continue;
    const { eligibility } = await getTransferEligibility(m.userId, orgCycle);
    candidates.push({
      userId: m.userId,
      name: m.user?.name ?? null,
      email: m.user?.email ?? null,
      role: m.role,
      eligible: eligibility.eligible,
      reason: eligibility.reason,
    });
  }
  return candidates;
}

/* ------------------------------------------------------------------ */
/* Transfer                                                            */
/* ------------------------------------------------------------------ */

export interface TransferOrganizationResult {
  newOwnerEmail: string | null;
  seatsMoved: number;
  pendingDowngradeCancelled: boolean;
  targetTrialing: boolean;
}

export async function transferOrganization(input: {
  orgId: string;
  callerId: string;
  newOwnerUserId: string;
  confirm: unknown;
}): Promise<TransferOrganizationResult> {
  // Guard first — a wrong confirm string must cause no side effects.
  assertTransferConfirmation(input.confirm);

  const { orgId, callerId } = input;
  const newOwnerUserId = String(input.newOwnerUserId ?? "");
  if (!newOwnerUserId) throw new TeamError(400, "A new owner is required");
  if (newOwnerUserId === callerId) {
    throw new TeamError(400, "You already own this team");
  }

  const org = await loadOrgOwnedBy(orgId, callerId);
  if (org.suspended) throw new TeamError(403, "This team is suspended");

  const targetMembership = await db.organizationMember.findUnique({
    where: { organizationId_userId: { organizationId: orgId, userId: newOwnerUserId } },
  });
  if (!targetMembership) throw new TeamError(404, "Member not found");

  // Recompute eligibility — never trust the candidates call.
  const config = await getTeamPricingConfig();
  const ownerSub = await db.subscription.findUnique({ where: { userId: org.ownerId } });
  const orgCycle = resolveOrgBillingCycle(org, ownerSub, config);
  const { eligibility, targetSub } = await getTransferEligibility(newOwnerUserId, orgCycle);
  if (!eligibility.eligible || !targetSub) {
    throw new TeamError(400, eligibility.reason ?? "This member can't take over the team.");
  }
  const targetStripeSubId = (
    targetSub as TargetSubLike & { stripeSubscriptionId?: string }
  ).stripeSubscriptionId;
  if (!targetStripeSubId) {
    throw new TeamError(400, "This member's subscription isn't active — it must be active or in a free trial to take over the team.");
  }

  const targetUser = await db.user.findUnique({
    where: { id: newOwnerUserId },
    select: { email: true },
  });

  const seatsMoved = org.purchasedSeats;
  const pendingDowngradeCancelled = org.pendingSeats != null;
  const targetTrialing = eligibility.trialing;

  /* ---- Stripe choreography (seats > 0 only) ---- */
  let updatedTargetSub: Stripe.Subscription | null = null;
  let newSeatItem: ReturnType<typeof findSeatItem> = null;

  if (seatsMoved > 0) {
    if (!org.stripeSeatPriceId) {
      throw new TeamError(400, "Seat billing isn't configured for this team — nothing was changed.");
    }
    const s = stripe();
    // (a) Add the seat item to the target's subscription. When the
    // target is trialing, the item joins the trial — no charge today.
    try {
      updatedTargetSub = await s.subscriptions.update(targetStripeSubId, {
        items: [{ price: org.stripeSeatPriceId, quantity: seatsMoved }],
        proration_behavior: "create_prorations",
      });
    } catch (err) {
      console.error("[team] transfer: adding seat item to new owner failed:", err);
      throw new TeamError(
        502,
        "Couldn't add the team seats to the new owner's subscription — nothing was changed.",
      );
    }
    newSeatItem = findSeatItem(
      updatedTargetSub as unknown as Parameters<typeof findSeatItem>[0],
      config,
    );

    // (b) Remove the seat item from the old owner's subscription.
    if (org.stripeSeatItemId) {
      try {
        await s.subscriptionItems.del(org.stripeSeatItemId, {
          proration_behavior: "create_prorations",
        });
      } catch (err) {
        console.error("[team] transfer: removing seat item from old owner failed:", err);
        // Roll back (a): delete the just-created item, write nothing.
        if (newSeatItem) {
          try {
            await s.subscriptionItems.del(newSeatItem.id);
          } catch (rollbackErr) {
            console.error("[team] transfer: rollback of new seat item failed:", rollbackErr);
          }
        }
        throw new TeamError(
          502,
          "Couldn't remove the team seats from your subscription — the transfer was rolled back and nothing was changed.",
        );
      }
    }
  }

  /* ---- (c) DB transaction: ownership + roles swap ---- */
  const updatedOrg = await db.$transaction(async (tx) => {
    const updated = await tx.organization.update({
      where: { id: orgId },
      data: {
        ownerId: newOwnerUserId,
        stripeSeatItemId: seatsMoved > 0 ? (newSeatItem?.id ?? null) : null,
        stripeSeatPriceId: seatsMoved > 0 ? (newSeatItem?.price?.id ?? null) : null,
        // A pending downgrade belonged to the old owner's billing.
        pendingSeats: null,
        pendingSeatsAt: null,
      },
    });
    await tx.organizationMember.update({
      where: { organizationId_userId: { organizationId: orgId, userId: newOwnerUserId } },
      data: { role: "owner" },
    });
    const oldOwnerRow = await tx.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId: callerId } },
    });
    if (oldOwnerRow) {
      await tx.organizationMember.update({
        where: { organizationId_userId: { organizationId: orgId, userId: callerId } },
        data: { role: "admin" },
      });
    } else {
      await tx.organizationMember.create({
        data: { organizationId: orgId, userId: callerId, role: "admin" },
      });
    }
    return updated;
  });

  await logTeamActivity(orgId, callerId, "organization_transferred", {
    fromUserId: callerId,
    toUserId: newOwnerUserId,
    seatsMoved,
  });

  /* ---- (d) Reconcile seat state from Stripe truth ---- */
  if (seatsMoved > 0 && updatedTargetSub) {
    try {
      await reconcileOrgSeatsFromSubscription(
        { id: orgId, pendingSeats: updatedOrg.pendingSeats },
        updatedTargetSub as unknown as Parameters<typeof reconcileOrgSeatsFromSubscription>[1],
        config,
      );
    } catch (err) {
      // The transfer itself committed; the webhook reconciles seats
      // as usual, so a failed local reconcile must not undo it.
      console.error("[team] transfer: post-transfer seat reconcile failed:", err);
    }
  }

  await recordTeamEvent("team_ownership_transferred", callerId, orgId);

  return {
    newOwnerEmail: targetUser?.email ?? null,
    seatsMoved,
    pendingDowngradeCancelled,
    targetTrialing,
  };
}
