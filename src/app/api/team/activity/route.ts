import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUserId, teamErrorResponse } from "@/lib/team/api";
import { requireMembership } from "@/lib/team/permissions";

export const runtime = "nodejs";

/** GET /api/team/activity?orgId= — last 100 activity rows (member+). */
export async function GET(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const orgId = req.nextUrl.searchParams.get("orgId") ?? "";
    await requireMembership(orgId, userId, "member");
    const rows = await db.teamActivityLog.findMany({
      where: { organizationId: orgId },
      include: { actor: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return NextResponse.json(
      rows.map((r) => ({
        id: r.id,
        type: r.type,
        actorName: r.actor?.name ?? null,
        detail: r.detail ?? null,
        createdAt: r.createdAt.toISOString(),
      })),
    );
  } catch (err) {
    return teamErrorResponse(err);
  }
}
