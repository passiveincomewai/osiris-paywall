import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUserId, teamErrorResponse } from "@/lib/team/api";
import { requireMembership } from "@/lib/team/permissions";
import { recordingCapForTier } from "@/lib/team/entitlement";
import { planTierForRow } from "@/lib/plan-tier";

export const runtime = "nodejs";

/** GET /api/team/recording/usage?orgId= — pool usage for the org. */
export async function GET(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const orgId = req.nextUrl.searchParams.get("orgId") ?? "";
    const { org } = await requireMembership(orgId, userId, "member");
    const ownerSub = await db.subscription.findUnique({ where: { userId: org.ownerId } });
    const cap = recordingCapForTier(planTierForRow(ownerSub, process.env));
    const now = new Date();
    const leases = await db.teamRecordingLease.findMany({
      where: { organizationId: orgId, expiresAt: { gte: now } },
      select: { userId: true, cameraKey: true },
    });
    return NextResponse.json({
      cap,
      inUse: leases.length,
      mine: leases.filter((l) => l.userId === userId).map((l) => l.cameraKey),
    });
  } catch (err) {
    return teamErrorResponse(err);
  }
}
