import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashInviteToken } from "@/lib/team/invitations";

export const runtime = "nodejs";

/** GET /api/invite/[token] — public invite preview. */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const invite = await db.teamInvitation.findUnique({
    where: { tokenHash: hashInviteToken(token) },
    include: {
      organization: { select: { name: true } },
      invitedBy: { select: { name: true } },
    },
  });
  if (!invite || invite.status === "revoked" || invite.status === "accepted") {
    return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
  }
  if (invite.status === "expired" || invite.expiresAt <= new Date()) {
    return NextResponse.json({ error: "Invitation expired" }, { status: 410 });
  }
  return NextResponse.json({
    orgName: invite.organization?.name ?? null,
    role: invite.role,
    inviterName: invite.invitedBy?.name ?? null,
    email: invite.email,
    expiresAt: invite.expiresAt.toISOString(),
  });
}
