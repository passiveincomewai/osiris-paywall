// Team seat billing — quote math (pure), Stripe application, and the
// single reconciliation function shared by the seats route, the
// team-seats cron, and the Stripe webhook (the reconciler of record).
//
// Rules:
//  - Seats are ONE graduated-tier item on the owner's EXISTING
//    subscription. The base item is never touched.
//  - Increases apply immediately with prorations.
//  - Decreases are scheduled (org.pendingSeats) and applied by cron at
//    the period end with proration_behavior "none".

import type Stripe from "stripe";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { planByPriceIdFromEnv } from "@/lib/billing/trial-reminders";
import { BASE_CENTS, seatCostCents, type Cycle } from "./pricing";
import { getTeamPricingConfig, isSeatPriceId, SEAT_PRODUCT_ID, type TeamPricingConfigResolved } from "./pricing-config";
import { logTeamActivity } from "./activity";
import { recordTeamEvent } from "./analytics";

export type { Cycle };

/** Billing cycle for a base-plan price id (enterprise rides annual seat pricing). */
export function cycleForPriceId(
  priceId: string | null | undefined,
  env: Record<string, string | undefined> = process.env,
): Cycle {
  const plan = priceId ? planByPriceIdFromEnv(env)[priceId] : undefined;
  if (plan === "weekly" || plan === "monthly" || plan === "annual") return plan;
  if (plan === "enterprise") return "annual";
  return "monthly";
}

/* ------------------------------------------------------------------ */
/* Quote (pure)                                                        */
/* ------------------------------------------------------------------ */

export interface SeatQuoteInput {
  cycle: Cycle;
  tiers: import("./pricing").TierBand[];
  currentSeats: number;
  targetSeats: number;
  members: number;
  pending: number;
  periodStart: Date;
  periodEnd: Date;
  now?: Date;
  trialing?: boolean;
  trialEndsAt?: string | null;
}

export interface SeatQuote {
  cycle: Cycle;
  baseCents: number;
  currentSeats: number;
  targetSeats: number;
  seatCostCents: number;
  totalCents: number;
  kind: "increase" | "decrease" | "none";
  immediateDueEstimateCents: number;
  effectiveDate: string | null;
  futureTotalCents: number;
  trialEndsAt: string | null;
  blockedReason: string | null;
}

export function quoteSeatChange(input: SeatQuoteInput): SeatQuote {
  const now = input.now ?? new Date();
  const baseCents = BASE_CENTS[input.cycle];
  const targetCost = seatCostCents(input.tiers, input.targetSeats);
  const kind: SeatQuote["kind"] =
    input.targetSeats > input.currentSeats ? "increase" : input.targetSeats < input.currentSeats ? "decrease" : "none";

  const occupied = input.members + input.pending;
  const blockedReason =
    kind === "decrease" && input.targetSeats < occupied
      ? `Cannot reduce to ${input.targetSeats} seats: ${occupied} seats are in use (${input.members} members + ${input.pending} pending invitations). Remove members or revoke invitations first.`
      : null;

  let immediateDueEstimateCents = 0;
  if (kind === "increase" && !input.trialing) {
    const totalMs = input.periodEnd.getTime() - input.periodStart.getTime();
    const remainingMs = input.periodEnd.getTime() - now.getTime();
    const fraction = totalMs > 0 ? Math.min(1, Math.max(0, remainingMs / totalMs)) : 0;
    immediateDueEstimateCents = Math.round((targetCost - currentCost) * fraction);
  }

  return {
    cycle: input.cycle,
    baseCents,
    currentSeats: input.currentSeats,
    targetSeats: input.targetSeats,
    seatCostCents: targetCost,
    totalCents: baseCents + targetCost,
    kind,
    immediateDueEstimateCents,
    effectiveDate: kind === "decrease" ? input.periodEnd.toISOString() : null,
    futureTotalCents: baseCents + targetCost,
    trialEndsAt: input.trialing ? (input.trialEndsAt ?? null) : null,
    blockedReason,
  };
}

/* ------------------------------------------------------------------ */
/* Reconciliation                                                      */
/* ------------------------------------------------------------------ */

interface StripeSubLike {
  items: {
    data: Array<{
      id: string;
      quantity?: number | null;
      current_period_start?: number;
      current_period_end?: number;
      price?: { id?: string; product?: string | { id?: string } | null } | null;
    }>;
  };
}

/** The seat item on a subscription: seat price id, or seat product. */
export function findSeatItem(sub: StripeSubLike, config: TeamPricingConfigResolved) {
  return (
    sub.items.data.find((item) => {
      const priceId = item.price?.id ?? null;
      const product = item.price?.product;
      const productId = typeof product === "string" ? product : product?.id;
      return isSeatPriceId(priceId, config) || productId === SEAT_PRODUCT_ID;
    }) ?? null
  );
}

/** The base item: the first item that is NOT the seat item. */
export function findBaseItem(sub: StripeSubLike, config: TeamPricingConfigResolved) {
  const seat = findSeatItem(sub, config);
  return sub.items.data.find((item) => item !== seat) ?? sub.items.data[0] ?? null;
}

/**
 * Reconcile an org's seat state from a Stripe subscription object.
 * Sets stripeSeatItemId / stripeSeatPriceId / purchasedSeats from the
 * seat item (0 / null when absent) and clears a pending downgrade once
 * Stripe reflects exactly that quantity.
 */
export async function reconcileOrgSeatsFromSubscription(
  org: { id: string; pendingSeats?: number | null },
  stripeSub: StripeSubLike,
  config?: TeamPricingConfigResolved,
) {
  const cfg = config ?? (await getTeamPricingConfig());
  const seatItem = findSeatItem(stripeSub, cfg);
  const quantity = seatItem?.quantity ?? 0;
  const data: {
    stripeSeatItemId: string | null;
    stripeSeatPriceId: string | null;
    purchasedSeats: number;
    pendingSeats?: null;
    pendingSeatsAt?: null;
  } = {
    stripeSeatItemId: seatItem?.id ?? null,
    stripeSeatPriceId: seatItem?.price?.id ?? null,
    purchasedSeats: quantity,
  };
  if (org.pendingSeats != null && quantity === org.pendingSeats) {
    data.pendingSeats = null;
    data.pendingSeatsAt = null;
  }
  const updated = await db.organization.update({ where: { id: org.id }, data });
  return updated;
}

/* ------------------------------------------------------------------ */
/* Applying changes to Stripe                                          */
/* ------------------------------------------------------------------ */

/**
 * Apply a seat quantity to the owner's Stripe subscription NOW
 * (increases and the cron's scheduled decreases). Quantity 0 deletes
 * the seat item. Returns the updated Stripe subscription.
 */
export async function applySeatChangeToStripe(input: {
  stripeSubscriptionId: string;
  seatItemId: string | null;
  cycle: Cycle;
  seats: number;
  prorationBehavior: "create_prorations" | "none";
  config?: TeamPricingConfigResolved;
}): Promise<Stripe.Subscription> {
  const cfg = input.config ?? (await getTeamPricingConfig());
  const s = stripe();
  if (input.seats === 0) {
    if (input.seatItemId) {
      await s.subscriptionItems.del(input.seatItemId);
    }
    return s.subscriptions.retrieve(input.stripeSubscriptionId);
  }
  const params: Stripe.SubscriptionUpdateParams = {
    proration_behavior: input.prorationBehavior,
    items: input.seatItemId
      ? [{ id: input.seatItemId, quantity: input.seats }]
      : [{ price: cfg.seatPriceIds[input.cycle], quantity: input.seats }],
  };
  return s.subscriptions.update(input.stripeSubscriptionId, params);
}

/** Full owner-seat change used by the cron when a pending decrease falls due. */
export async function applyPendingSeatChange(orgId: string) {
  const org = await db.organization.findUnique({ where: { id: orgId } });
  if (!org || org.pendingSeats == null) return null;
  const sub = await db.subscription.findUnique({ where: { userId: org.ownerId } });
  if (!sub) return null;
  const target = org.pendingSeats;
  const updated = await applySeatChangeToStripe({
    stripeSubscriptionId: sub.stripeSubscriptionId,
    seatItemId: org.stripeSeatItemId,
    cycle: cycleForPriceId(sub.stripePriceId),
    seats: target,
    prorationBehavior: "none",
  });
  const reconciled = await reconcileOrgSeatsFromSubscription(
    { id: org.id, pendingSeats: org.pendingSeats },
    updated as unknown as StripeSubLike,
  );
  // Reconcile clears pending only when quantities match; force-clear
  // here because this run IS the application of the pending change.
  const finalOrg =
    reconciled.pendingSeats != null
      ? await db.organization.update({
          where: { id: org.id },
          data: { pendingSeats: null, pendingSeatsAt: null },
        })
      : reconciled;
  await logTeamActivity(org.id, null, "seats_downgraded", { seats: target, appliedBy: "cron" });
  await recordTeamEvent("seats_downgraded", org.ownerId, org.id);
  return finalOrg;
}
