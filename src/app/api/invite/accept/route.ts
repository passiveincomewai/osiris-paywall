import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUserId, teamErrorResponse } from "@/lib/team/api";
import { TeamError } from "@/lib/team/permissions";
import { hashInviteToken, canAccept } from "@/lib/team/invitations";
import { logTeamActivity } from "@/lib/team/activity";
import { recordTeamEvent } from "@/lib/team/analytics";

export const runtime = "nodejs";

/**
 * POST /api/invite/accept { token }
 * The signed-in user's verified email must match the invitation.
 * Accept is transactional: the pending invite already reserves its
 * seat, so converting it to a membership keeps members + pending ≤
 * purchasedSeats. The (org, user) unique constraint guards dupes.
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const body = (await req.json().catch(() => ({}))) as { token?: string };
    const token = String(body.token ?? "");
    if (!token) throw new TeamError(400, "Token required");

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { email: true, emailVerified: true },
    });
    if (!user?.email || !user.emailVerified) {
      throw new TeamError(403, "Your account needs a verified email address to accept an invitation");
    }
    const invite = await db.teamInvitation.findUnique({
      where: { tokenHash: hashInviteToken(token) },
    });
    if (!invite) throw new TeamError(404, "Invitation not found");
    if (user.email.toLowerCase() !== invite.email.toLowerCase()) {
      throw new TeamError(
        403,
        `This invitation was sent to ${invite.email}. Sign in with that email address to accept it.`,
      );
    }
    if (invite.status === "revoked") throw new TeamError(410, "This invitation was revoked");
    if (invite.status === "expired" || (invite.status === "pending" && invite.expiresAt <= new Date())) {
      if (invite.status === "pending") {
        await db.teamInvitation.update({ where: { id: invite.id }, data: { status: "expired" } });
      }
      throw new TeamError(410, "This invitation has expired");
    }

    const org = await db.organization.findUnique({ where: { id: invite.organizationId } });
    if (!org) throw new TeamError(404, "Team not found");
    if (org.suspended) throw new TeamError(403, "This team is suspended");

    const result = await db.$transaction(async (tx) => {
      const existing = await tx.organizationMember.findUnique({
        where: { organizationId_userId: { organizationId: org.id, userId } },
      });
      if (existing) {
        if (invite.status === "pending") {
          await tx.teamInvitation.update({
            where: { id: invite.id },
            data: { status: "accepted", acceptedById: userId, acceptedAt: new Date() },
          });
        }
        return { alreadyMember: true as const };
      }
      if (invite.status !== "pending") throw new TeamError(410, "This invitation is no longer valid");
      // Capacity re-check inside the tx. The invariant is
      // members + pending ≤ purchasedSeats and this pending invite
      // already reserves its seat, so converting it (pending −1,
      // members +1) preserves the invariant; only reject if the
      // invariant is already broken (e.g. seats were reduced).
      const [members, pending] = await Promise.all([
        tx.organizationMember.count({ where: { organizationId: org.id } }),
        tx.teamInvitation.count({ where: { organizationId: org.id, status: "pending" } }),
      ]);
      if (!canAccept({ members, pending, purchased: org.purchasedSeats, thisInvitePending: true })) {
        throw new TeamError(409, "This team has no seats available");
      }
      const member = await tx.organizationMember.create({
        data: { organizationId: org.id, userId, role: invite.role },
      });
      await tx.teamInvitation.update({
        where: { id: invite.id },
        data: { status: "accepted", acceptedById: userId, acceptedAt: new Date() },
      });
      return { alreadyMember: false as const, member };
    });

    if (!result.alreadyMember) {
      await logTeamActivity(org.id, userId, "invitation_accepted", { email: invite.email, role: invite.role });
      await recordTeamEvent("invitation_accepted", userId, org.id);
    }
    return NextResponse.json({ ok: true, orgId: org.id, alreadyMember: result.alreadyMember });
  } catch (err) {
    return teamErrorResponse(err);
  }
}
