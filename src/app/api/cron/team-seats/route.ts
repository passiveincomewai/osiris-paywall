import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { applyPendingSeatChange } from "@/lib/team/seats";
import { logTeamActivity } from "@/lib/team/activity";
import { recordTeamEvent } from "@/lib/team/analytics";

export const runtime = "nodejs";

/**
 * Team seats cron: apply scheduled seat decreases whose period end has
 * arrived, and sweep-expire stale pending invitations for all orgs.
 * CRON_SECRET Bearer guard — same house pattern as the other crons.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const authHeader = req.headers.get("authorization") ?? "";
    if (authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
  }
  const now = new Date();
  let applied = 0;
  let failed = 0;

  const due = await db.organization.findMany({
    where: { pendingSeats: { not: null }, pendingSeatsAt: { lte: now } },
    select: { id: true },
  });
  for (const org of due) {
    try {
      const result = await applyPendingSeatChange(org.id);
      if (result) applied++;
    } catch (err) {
      failed++;
      console.error(`[cron/team-seats] failed for org ${org.id}:`, err);
    }
  }

  // Invitation expiry sweep (all orgs).
  const stale = await db.teamInvitation.findMany({
    where: { status: "pending", expiresAt: { lt: now } },
    select: { id: true, organizationId: true },
  });
  if (stale.length > 0) {
    await db.teamInvitation.updateMany({
      where: { id: { in: stale.map((s) => s.id) } },
      data: { status: "expired" },
    });
    for (const s of stale) {
      await logTeamActivity(s.organizationId, null, "invitation_expired", { invitationId: s.id });
      await recordTeamEvent("invitation_expired", null, s.organizationId);
    }
  }

  return NextResponse.json({ ok: true, applied, failed, expiredInvitations: stale.length });
}
