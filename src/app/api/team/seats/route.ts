import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUserId, teamErrorResponse } from "@/lib/team/api";
import { TeamError } from "@/lib/team/permissions";
import { getTeamPricingConfig } from "@/lib/team/pricing-config";
import { applySeatChangeToStripe, reconcileOrgSeatsFromSubscription } from "@/lib/team/seats";
import { loadOwnerSeatContext } from "@/lib/team/seat-request";
import { logTeamActivity } from "@/lib/team/activity";
import { recordTeamEvent } from "@/lib/team/analytics";

export const runtime = "nodejs";

/**
 * POST /api/team/seats { orgId, seats } — owner only.
 * Increase: applied to Stripe immediately (prorations), then reconciled
 * locally (the webhook remains the reconciler of record).
 * Decrease: scheduled via org.pendingSeats at the period end; the
 * team-seats cron applies it to Stripe. Never touches the base item.
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const body = (await req.json().catch(() => ({}))) as { orgId?: string; seats?: number };
    const orgId = String(body.orgId ?? "");
    const seats = Number(body.seats);
    const config = await getTeamPricingConfig();
    if (!Number.isInteger(seats) || seats < 0 || seats > config.maxSeats) {
      throw new TeamError(400, `Seats must be between 0 and ${config.maxSeats}`);
    }
    const ctx = await loadOwnerSeatContext(orgId, userId);
    const { org, sub } = ctx;
    const occupied = ctx.members + ctx.pending;

    if (seats === org.purchasedSeats) {
      return NextResponse.json({ ok: true, kind: "none", purchasedSeats: org.purchasedSeats });
    }

    if (seats < org.purchasedSeats) {
      // DECREASE — schedule only, no Stripe call now.
      if (seats < occupied) {
        throw new TeamError(
          400,
          `Cannot reduce to ${seats} seats: ${occupied} are in use (${ctx.members} members + ${ctx.pending} pending invitations).`,
        );
      }
      const updated = await db.organization.update({
        where: { id: orgId },
        data: { pendingSeats: seats, pendingSeatsAt: sub.currentPeriodEnd },
      });
      await logTeamActivity(orgId, userId, "seats_downgraded", {
        from: org.purchasedSeats,
        to: seats,
        scheduled: true,
        effectiveDate: sub.currentPeriodEnd.toISOString(),
      });
      await recordTeamEvent("seats_downgraded", userId, orgId);
      return NextResponse.json({
        ok: true,
        scheduled: true,
        effectiveDate: sub.currentPeriodEnd.toISOString(),
        purchasedSeats: updated.purchasedSeats,
        pendingSeats: updated.pendingSeats,
      });
    }

    // INCREASE — Stripe now. A pending downgrade is superseded.
    if (org.pendingSeats != null) {
      await db.organization.update({
        where: { id: orgId },
        data: { pendingSeats: null, pendingSeatsAt: null },
      });
    }
    await recordTeamEvent("team_checkout_initiated", userId, orgId);
    const updatedSub = await applySeatChangeToStripe({
      stripeSubscriptionId: sub.stripeSubscriptionId,
      seatItemId: org.stripeSeatItemId,
      cycle: ctx.cycle,
      seats,
      prorationBehavior: "create_prorations",
      config,
    });
    const reconciled = await reconcileOrgSeatsFromSubscription(
      { id: orgId, pendingSeats: null },
      updatedSub as unknown as Parameters<typeof reconcileOrgSeatsFromSubscription>[1],
      config,
    );
    await logTeamActivity(orgId, userId, "seats_purchased", { from: org.purchasedSeats, to: seats });
    await recordTeamEvent("seats_purchased", userId, orgId);
    await recordTeamEvent("team_checkout_completed", userId, orgId);
    return NextResponse.json({
      ok: true,
      purchasedSeats: reconciled.purchasedSeats,
      ...(ctx.trialing ? { trial: true, trialEndsAt: ctx.trialEndsAt } : {}),
    });
  } catch (err) {
    return teamErrorResponse(err);
  }
}
