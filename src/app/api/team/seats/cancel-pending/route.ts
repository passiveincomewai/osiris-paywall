import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUserId, teamErrorResponse } from "@/lib/team/api";
import { TeamError } from "@/lib/team/permissions";
import { logTeamActivity } from "@/lib/team/activity";

export const runtime = "nodejs";

/** POST /api/team/seats/cancel-pending { orgId } — owner only. */
export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const body = (await req.json().catch(() => ({}))) as { orgId?: string };
    const orgId = String(body.orgId ?? "");
    const org = await db.organization.findUnique({ where: { id: orgId } });
    if (!org) throw new TeamError(404, "Team not found");
    if (org.ownerId !== userId) throw new TeamError(403, "Only the team owner manages seats");
    await db.organization.update({
      where: { id: orgId },
      data: { pendingSeats: null, pendingSeatsAt: null },
    });
    await logTeamActivity(orgId, userId, "seats_pending_canceled", { was: org.pendingSeats });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return teamErrorResponse(err);
  }
}
