import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUserId, teamErrorResponse } from "@/lib/team/api";
import { requireMembership, assertOrgWritable, TeamError, isTeamRole } from "@/lib/team/permissions";
import { logTeamActivity } from "@/lib/team/activity";
import { recordTeamEvent } from "@/lib/team/analytics";

export const runtime = "nodejs";

/** GET /api/team/members?orgId= */
export async function GET(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const orgId = req.nextUrl.searchParams.get("orgId") ?? "";
    await requireMembership(orgId, userId, "member");
    const rows = await db.organizationMember.findMany({
      where: { organizationId: orgId },
      include: { user: { select: { name: true, email: true, image: true } } },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(
      rows.map((m) => ({
        userId: m.userId,
        name: m.user?.name ?? null,
        email: m.user?.email ?? null,
        image: m.user?.image ?? null,
        role: m.role,
        joinedAt: m.createdAt.toISOString(),
      })),
    );
  } catch (err) {
    return teamErrorResponse(err);
  }
}

/** PATCH /api/team/members { orgId, userId, role } — admin+. */
export async function PATCH(req: NextRequest) {
  try {
    const actorId = await requireUserId();
    const body = (await req.json().catch(() => ({}))) as { orgId?: string; userId?: string; role?: string };
    const orgId = String(body.orgId ?? "");
    const targetId = String(body.userId ?? "");
    const role = String(body.role ?? "");
    if (!isTeamRole(role) || role === "owner") throw new TeamError(400, "Role must be admin or member");
    const { org, membership } = await requireMembership(orgId, actorId, "admin");
    assertOrgWritable(org, actorId);
    if (targetId === org.ownerId) throw new TeamError(400, "The owner's role cannot be changed");
    const target = await db.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId: targetId } },
    });
    if (!target) throw new TeamError(404, "Member not found");
    if (target.role === "admin" && membership.role !== "owner") {
      throw new TeamError(403, "Only the owner can change another admin's role");
    }
    const updated = await db.organizationMember.update({
      where: { organizationId_userId: { organizationId: orgId, userId: targetId } },
      data: { role },
    });
    await logTeamActivity(orgId, actorId, "role_changed", { userId: targetId, from: target.role, to: role });
    return NextResponse.json({ member: updated });
  } catch (err) {
    return teamErrorResponse(err);
  }
}

/** DELETE /api/team/members?orgId=&userId= — admin+; frees the seat. */
export async function DELETE(req: NextRequest) {
  try {
    const actorId = await requireUserId();
    const orgId = req.nextUrl.searchParams.get("orgId") ?? "";
    const targetId = req.nextUrl.searchParams.get("userId") ?? "";
    const { org, membership } = await requireMembership(orgId, actorId, "admin");
    assertOrgWritable(org, actorId);
    if (targetId === org.ownerId) throw new TeamError(400, "The owner cannot be removed");
    const target = await db.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId: targetId } },
    });
    if (!target) throw new TeamError(404, "Member not found");
    if (target.role === "admin" && membership.role !== "owner") {
      throw new TeamError(403, "Admins cannot remove other admins");
    }
    await db.organizationMember.delete({
      where: { organizationId_userId: { organizationId: orgId, userId: targetId } },
    });
    await logTeamActivity(orgId, actorId, "member_removed", { userId: targetId, role: target.role });
    await recordTeamEvent("member_removed", actorId, orgId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return teamErrorResponse(err);
  }
}
