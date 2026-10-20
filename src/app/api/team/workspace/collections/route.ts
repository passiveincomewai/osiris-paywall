import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUserId, teamErrorResponse } from "@/lib/team/api";
import { requireMembership, assertOrgWritable, TeamError } from "@/lib/team/permissions";
import { logTeamActivity } from "@/lib/team/activity";

export const runtime = "nodejs";

/** POST /api/team/workspace/collections { orgId, name, cameraIds? } — member+. */
export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const body = (await req.json().catch(() => ({}))) as { orgId?: string; name?: string; cameraIds?: string[] };
    const orgId = String(body.orgId ?? "");
    const { org } = await requireMembership(orgId, userId, "member");
    assertOrgWritable(org, userId);
    const name = String(body.name ?? "").trim();
    if (!name || name.length > 120) throw new TeamError(400, "A collection name (1–120 chars) is required");
    const cameraIds = Array.isArray(body.cameraIds)
      ? [...new Set(body.cameraIds.map((c) => String(c)).filter(Boolean))].slice(0, 500)
      : [];
    const collection = await db.cameraCollection.create({
      data: {
        userId,
        organizationId: orgId,
        name,
        items: cameraIds.length ? { create: cameraIds.map((cameraId) => ({ cameraId })) } : undefined,
      },
      include: { items: { select: { cameraId: true } } },
    });
    await logTeamActivity(orgId, userId, "collection_created", { collectionId: collection.id, name });
    return NextResponse.json({ collection }, { status: 201 });
  } catch (err) {
    return teamErrorResponse(err);
  }
}

/** DELETE /api/team/workspace/collections?orgId=&collectionId= — creator or admin+. */
export async function DELETE(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const orgId = req.nextUrl.searchParams.get("orgId") ?? "";
    const collectionId = req.nextUrl.searchParams.get("collectionId") ?? "";
    const { org, membership } = await requireMembership(orgId, userId, "member");
    assertOrgWritable(org, userId);
    const collection = await db.cameraCollection.findUnique({ where: { id: collectionId } });
    if (!collection || collection.organizationId !== orgId) throw new TeamError(404, "Collection not found");
    const isCreator = collection.userId === userId;
    const isAdminPlus = membership.role === "admin" || membership.role === "owner";
    if (!isCreator && !isAdminPlus) throw new TeamError(403, "Only the creator or a team admin can delete this collection");
    await db.cameraCollection.delete({ where: { id: collectionId } });
    await logTeamActivity(orgId, userId, "collection_deleted", { collectionId, name: collection.name });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return teamErrorResponse(err);
  }
}
