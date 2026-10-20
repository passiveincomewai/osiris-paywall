import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/affiliate/admin";
import { logTeamActivity } from "@/lib/team/activity";

export const runtime = "nodejs";

/** POST /api/admin/teams/suspend { orgId, suspended } — platform admin. */
export async function POST(req: NextRequest) {
  let session;
  try {
    session = await requireAdmin();
  } catch {
    return NextResponse.json({ ok: false, error: "Admin only" }, { status: 403 });
  }
  const body = (await req.json().catch(() => ({}))) as { orgId?: string; suspended?: boolean };
  const orgId = String(body.orgId ?? "");
  if (!orgId || typeof body.suspended !== "boolean") {
    return NextResponse.json({ ok: false, error: "orgId and suspended are required" }, { status: 400 });
  }
  const org = await db.organization.findUnique({ where: { id: orgId } });
  if (!org) return NextResponse.json({ ok: false, error: "Team not found" }, { status: 404 });
  const updated = await db.organization.update({
    where: { id: orgId },
    data: { suspended: body.suspended },
  });
  const actorId = (session?.user as { id?: string } | undefined)?.id ?? null;
  await logTeamActivity(orgId, actorId, body.suspended ? "org_suspended" : "org_unsuspended", {
    byAdmin: true,
  });
  return NextResponse.json({ ok: true, org: { id: updated.id, suspended: updated.suspended } });
}
