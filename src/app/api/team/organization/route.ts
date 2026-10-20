import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUserId, teamErrorResponse } from "@/lib/team/api";
import { subscriptionStatusFromRow } from "@/lib/subscription-status";
import { logTeamActivity } from "@/lib/team/activity";

export const runtime = "nodejs";

/** POST /api/team/organization { name } — one org per paying owner. */
export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const body = (await req.json().catch(() => ({}))) as { name?: string };
    const name = String(body.name ?? "").trim();
    if (!name || name.length > 120) {
      return NextResponse.json({ error: "A team name (1–120 chars) is required" }, { status: 400 });
    }
    const sub = await db.subscription.findUnique({ where: { userId } });
    if (subscriptionStatusFromRow(sub) !== "active") {
      return NextResponse.json(
        { error: "An active paid subscription is required to create a team" },
        { status: 403 },
      );
    }
    const existing = await db.organization.findUnique({ where: { ownerId: userId } });
    if (existing) {
      return NextResponse.json({ error: "You already have a team", org: existing }, { status: 409 });
    }
    const org = await db.organization.create({ data: { name, ownerId: userId } });
    await db.organizationMember.create({
      data: { organizationId: org.id, userId, role: "owner" },
    });
    await logTeamActivity(org.id, userId, "organization_created", { name });
    return NextResponse.json({ org }, { status: 201 });
  } catch (err) {
    return teamErrorResponse(err);
  }
}
