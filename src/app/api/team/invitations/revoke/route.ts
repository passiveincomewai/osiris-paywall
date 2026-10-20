import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUserId, teamErrorResponse } from "@/lib/team/api";
import { requireMembership, TeamError } from "@/lib/team/permissions";
import { logTeamActivity } from "@/lib/team/activity";

export const runtime = "nodejs";

/** POST /api/team/invitations/revoke { orgId, invitationId } — admin+. */
export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const body = (await req.json().catch(() => ({}))) as { orgId?: string; invitationId?: string };
    const orgId = String(body.orgId ?? "");
    const invitationId = String(body.invitationId ?? "");
    await requireMembership(orgId, userId, "admin");
    const invite = await db.teamInvitation.findUnique({ where: { id: invitationId } });
    if (!invite || invite.organizationId !== orgId) throw new TeamError(404, "Invitation not found");
    if (invite.status !== "pending") throw new TeamError(400, "Invitation is not pending");
    await db.teamInvitation.update({ where: { id: invitationId }, data: { status: "revoked" } });
    await logTeamActivity(orgId, userId, "invitation_revoked", { invitationId, email: invite.email });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return teamErrorResponse(err);
  }
}
