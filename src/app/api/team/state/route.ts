import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUserId, teamErrorResponse } from "@/lib/team/api";

export const runtime = "nodejs";

interface OrgSummary {
  id: string;
  name: string;
  role: string;
  ownerName: string | null;
  memberCount: number;
  purchasedSeats: number;
}

async function summarize(orgId: string, role: string): Promise<OrgSummary | null> {
  const org = await db.organization.findUnique({
    where: { id: orgId },
    include: { owner: { select: { name: true } } },
  });
  if (!org) return null;
  const memberCount = await db.organizationMember.count({ where: { organizationId: orgId } });
  return {
    id: org.id,
    name: org.name,
    role,
    ownerName: org.owner?.name ?? null,
    memberCount,
    purchasedSeats: org.purchasedSeats,
  };
}

/** GET /api/team/state → { owned, memberships } for the signed-in user. */
export async function GET() {
  try {
    const userId = await requireUserId();
    const ownedOrg = await db.organization.findUnique({ where: { ownerId: userId } });
    const owned = ownedOrg ? await summarize(ownedOrg.id, "owner") : null;

    const memberships: OrgSummary[] = [];
    const rows = await db.organizationMember.findMany({ where: { userId } });
    for (const m of rows) {
      if (ownedOrg && m.organizationId === ownedOrg.id) continue;
      const s = await summarize(m.organizationId, m.role);
      if (s) memberships.push(s);
    }
    return NextResponse.json({ owned, memberships });
  } catch (err) {
    return teamErrorResponse(err);
  }
}
