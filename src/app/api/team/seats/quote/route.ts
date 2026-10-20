import { NextRequest, NextResponse } from "next/server";
import { requireUserId, teamErrorResponse } from "@/lib/team/api";
import { TeamError } from "@/lib/team/permissions";
import { getTeamPricingConfig } from "@/lib/team/pricing-config";
import { quoteSeatChange } from "@/lib/team/seats";
import { loadOwnerSeatContext } from "@/lib/team/seat-request";

export const runtime = "nodejs";

/** POST /api/team/seats/quote { orgId, seats } — owner only, server-authoritative. */
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
    const quote = quoteSeatChange({
      cycle: ctx.cycle,
      tiers: config.tiers[ctx.cycle],
      currentSeats: ctx.org.purchasedSeats,
      targetSeats: seats,
      members: ctx.members,
      pending: ctx.pending,
      periodStart: ctx.sub.currentPeriodStart,
      periodEnd: ctx.sub.currentPeriodEnd,
      trialing: ctx.trialing,
      trialEndsAt: ctx.trialEndsAt,
    });
    return NextResponse.json(quote);
  } catch (err) {
    return teamErrorResponse(err);
  }
}
