import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUserId, teamErrorResponse } from "@/lib/team/api";
import { requireMembership, assertOrgWritable, TeamError } from "@/lib/team/permissions";
import { BASE_CENTS, seatCostCents, totalCents } from "@/lib/team/pricing";
import { getTeamPricingConfig } from "@/lib/team/pricing-config";
import { cycleForPriceId } from "@/lib/team/seats";
import { planTierForRow } from "@/lib/plan-tier";
import { logTeamActivity } from "@/lib/team/activity";

export const runtime = "nodejs";

/** GET /api/team/org?orgId= — full org view for members. */
export async function GET(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const orgId = req.nextUrl.searchParams.get("orgId") ?? "";
    const { org, membership } = await requireMembership(orgId, userId, "member");

    const owner = await db.user.findUnique({
      where: { id: org.ownerId },
      select: { name: true, email: true },
    });
    const ownerSub = await db.subscription.findUnique({ where: { userId: org.ownerId } });
    const cycle = cycleForPriceId(ownerSub?.stripePriceId);
    const tier = planTierForRow(ownerSub, process.env);
    const config = await getTeamPricingConfig();

    const [members, pendingInvites] = await Promise.all([
      db.organizationMember.count({ where: { organizationId: orgId } }),
      db.teamInvitation.count({ where: { organizationId: orgId, status: "pending" } }),
    ]);
    const occupied = members + pendingInvites;

    return NextResponse.json({
      org: {
        id: org.id,
        name: org.name,
        logoUrl: org.logoUrl,
        description: org.description,
        defaultInviteRole: org.defaultInviteRole,
        allowMemberInvites: org.allowMemberInvites,
        suspended: org.suspended,
        createdAt: org.createdAt.toISOString(),
      },
      myRole: membership.role,
      owner: { name: owner?.name ?? null, email: owner?.email ?? null },
      plan: { cycle, tier, baseCents: BASE_CENTS[cycle] },
      seats: {
        purchased: org.purchasedSeats,
        members,
        pendingInvites,
        available: Math.max(0, org.purchasedSeats - occupied),
        pendingSeats: org.pendingSeats,
        pendingSeatsAt: org.pendingSeatsAt?.toISOString() ?? null,
      },
      totals: {
        seatCostCents: seatCostCents(config.tiers[cycle], org.purchasedSeats),
        totalCents: totalCents(BASE_CENTS[cycle], config.tiers[cycle], org.purchasedSeats),
      },
    });
  } catch (err) {
    return teamErrorResponse(err);
  }
}

/** PATCH /api/team/org — settings (admin+). Billing fields are NOT here. */
export async function PATCH(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const body = (await req.json().catch(() => ({}))) as {
      orgId?: string;
      name?: string;
      logoUrl?: string | null;
      description?: string | null;
      defaultInviteRole?: string;
      allowMemberInvites?: boolean;
    };
    const orgId = String(body.orgId ?? "");
    const { org } = await requireMembership(orgId, userId, "admin");
    assertOrgWritable(org, userId);

    const data: Record<string, unknown> = {};
    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (!name || name.length > 120) throw new TeamError(400, "Invalid team name");
      data.name = name;
    }
    if (body.logoUrl !== undefined) data.logoUrl = body.logoUrl ? String(body.logoUrl) : null;
    if (body.description !== undefined) data.description = body.description ? String(body.description) : null;
    if (body.defaultInviteRole !== undefined) {
      if (body.defaultInviteRole !== "member" && body.defaultInviteRole !== "admin") {
        throw new TeamError(400, "defaultInviteRole must be member or admin");
      }
      data.defaultInviteRole = body.defaultInviteRole;
    }
    if (body.allowMemberInvites !== undefined) data.allowMemberInvites = !!body.allowMemberInvites;
    if (Object.keys(data).length === 0) throw new TeamError(400, "Nothing to update");

    const updated = await db.organization.update({ where: { id: orgId }, data });
    await logTeamActivity(orgId, userId, "settings_changed", data as Record<string, unknown>);
    return NextResponse.json({ org: updated });
  } catch (err) {
    return teamErrorResponse(err);
  }
}
