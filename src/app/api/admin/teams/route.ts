import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/affiliate/admin";
import { subscriptionStatusFromRow } from "@/lib/subscription-status";
import { BASE_CENTS, seatCostCents, type Cycle } from "@/lib/team/pricing";
import { getTeamPricingConfig } from "@/lib/team/pricing-config";
import { cycleForPriceId } from "@/lib/team/seats";
import { planTierForRow } from "@/lib/plan-tier";

export const runtime = "nodejs";

/** Normalize a per-cycle amount to monthly revenue. */
function monthlyNormalized(cycle: Cycle, cents: number): number {
  if (cycle === "weekly") return (cents * 52) / 12;
  if (cycle === "annual") return cents / 12;
  return cents;
}

/** GET /api/admin/teams — platform-admin team metrics + org list. */
export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ ok: false, error: "Admin only" }, { status: 403 });
  }
  const config = await getTeamPricingConfig();
  const orgs = await db.organization.findMany({
    include: {
      owner: { select: { email: true, subscription: true } },
      _count: { select: { members: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  let activePaidTeams = 0;
  let totalPurchasedSeats = 0;
  let totalOccupiedSeats = 0;
  let pendingInvitations = 0;
  let teamMrrCents = 0;
  let baseMrrCents = 0;

  const orgRows = [];
  for (const org of orgs) {
    const sub = org.owner?.subscription ?? null;
    const cycle = cycleForPriceId(sub?.stripePriceId);
    const tier = planTierForRow(sub, process.env);
    const members = org._count.members;
    const pending = await db.teamInvitation.count({
      where: { organizationId: org.id, status: "pending" },
    });
    // Occupied = non-owner members (members rows include the owner).
    const occupied = Math.max(0, members - 1);
    const isActivePaid = subscriptionStatusFromRow(sub) === "active";

    totalPurchasedSeats += org.purchasedSeats;
    totalOccupiedSeats += occupied;
    pendingInvitations += pending;
    if (isActivePaid) {
      activePaidTeams += 1;
      teamMrrCents += monthlyNormalized(cycle, seatCostCents(config.tiers[cycle], org.purchasedSeats));
      baseMrrCents += monthlyNormalized(cycle, BASE_CENTS[cycle]);
    }
    orgRows.push({
      id: org.id,
      name: org.name,
      ownerEmail: org.owner?.email ?? null,
      cycle,
      tier,
      purchasedSeats: org.purchasedSeats,
      members,
      pending,
      suspended: org.suspended,
      createdAt: org.createdAt.toISOString(),
    });
  }

  const organizations = orgs.length;
  const availableSeats = Math.max(0, totalPurchasedSeats - totalOccupiedSeats - pendingInvitations);
  return NextResponse.json({
    metrics: {
      organizations,
      activePaidTeams,
      totalPurchasedSeats,
      totalOccupiedSeats,
      pendingInvitations,
      availableSeats,
      teamMrrCents: Math.round(teamMrrCents),
      baseMrrCents: Math.round(baseMrrCents),
      avgSeatsPerTeam: organizations ? totalPurchasedSeats / organizations : 0,
      seatUtilization: totalPurchasedSeats
        ? (totalOccupiedSeats + pendingInvitations) / totalPurchasedSeats
        : 0,
    },
    orgs: orgRows,
  });
}
