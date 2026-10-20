import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUserId, teamErrorResponse } from "@/lib/team/api";
import { requireMembership } from "@/lib/team/permissions";

export const runtime = "nodejs";

/** GET /api/team/workspace?orgId= — org-shared camera collections. */
export async function GET(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const orgId = req.nextUrl.searchParams.get("orgId") ?? "";
    await requireMembership(orgId, userId, "member");
    const rows = await db.cameraCollection.findMany({
      where: { organizationId: orgId },
      include: {
        user: { select: { name: true } },
        items: { select: { cameraId: true } },
      },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({
      collections: rows.map((c) => ({
        id: c.id,
        name: c.name,
        createdByName: c.user?.name ?? null,
        items: c.items.map((i) => ({ cameraId: i.cameraId })),
        itemCount: c.items.length,
        mine: c.userId === userId,
      })),
    });
  } catch (err) {
    return teamErrorResponse(err);
  }
}
