import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUserId, teamErrorResponse } from "@/lib/team/api";
import { requireMembership, assertOrgWritable, TeamError } from "@/lib/team/permissions";

export const runtime = "nodejs";

/** POST /api/team/workspace/collections/items { orgId, collectionId, cameraId, op } — creator or admin+. */
export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const body = (await req.json().catch(() => ({}))) as {
      orgId?: string; collectionId?: string; cameraId?: string; op?: string;
    };
    const orgId = String(body.orgId ?? "");
    const collectionId = String(body.collectionId ?? "");
    const cameraId = String(body.cameraId ?? "");
    const op = String(body.op ?? "");
    if (!cameraId || (op !== "add" && op !== "remove")) throw new TeamError(400, "cameraId and op (add|remove) are required");
    const { org, membership } = await requireMembership(orgId, userId, "member");
    assertOrgWritable(org, userId);
    const collection = await db.cameraCollection.findUnique({ where: { id: collectionId } });
    if (!collection || collection.organizationId !== orgId) throw new TeamError(404, "Collection not found");
    const isCreator = collection.userId === userId;
    const isAdminPlus = membership.role === "admin" || membership.role === "owner";
    if (!isCreator && !isAdminPlus) throw new TeamError(403, "Only the creator or a team admin can edit this collection");

    if (op === "add") {
      await db.cameraCollectionItem.upsert({
        where: { collectionId_cameraId: { collectionId, cameraId } },
        create: { collectionId, cameraId },
        update: {},
      });
    } else {
      await db.cameraCollectionItem.deleteMany({ where: { collectionId, cameraId } });
    }
    const itemCount = await db.cameraCollectionItem.count({ where: { collectionId } });
    return NextResponse.json({ ok: true, itemCount });
  } catch (err) {
    return teamErrorResponse(err);
  }
}
