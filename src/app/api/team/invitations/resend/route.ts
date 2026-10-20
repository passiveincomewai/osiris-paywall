import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUserId, sessionUser, teamErrorResponse } from "@/lib/team/api";
import { requireMembership, TeamError } from "@/lib/team/permissions";
import { getTeamPricingConfig } from "@/lib/team/pricing-config";
import { generateInviteToken, hashInviteToken } from "@/lib/team/invitations";
import { isRateLimited, clientIp } from "@/lib/password-auth";
import { sendEmail, teamInviteEmail } from "@/lib/email";
import { appBaseUrl } from "@/lib/app-url";
import { logTeamActivity } from "@/lib/team/activity";

export const runtime = "nodejs";

const MIN_RESEND_INTERVAL_MS = 60_000;

/** POST /api/team/invitations/resend { orgId, invitationId } — admin+. */
export async function POST(req: NextRequest) {
  try {
    const me = await sessionUser();
    if (!me) throw new TeamError(401, "Sign in required");
    if (isRateLimited(`team-invite-resend:${clientIp(req)}:${me.id}`, 30, 60 * 60 * 1000)) {
      return NextResponse.json({ error: "Too many resends — try again later" }, { status: 429 });
    }
    const body = (await req.json().catch(() => ({}))) as { orgId?: string; invitationId?: string };
    const orgId = String(body.orgId ?? "");
    const invitationId = String(body.invitationId ?? "");
    const { org } = await requireMembership(orgId, me.id, "admin");
    const invite = await db.teamInvitation.findUnique({ where: { id: invitationId } });
    if (!invite || invite.organizationId !== orgId) throw new TeamError(404, "Invitation not found");
    if (invite.status !== "pending") throw new TeamError(400, "Invitation is not pending");
    if (Date.now() - invite.createdAt.getTime() < MIN_RESEND_INTERVAL_MS) {
      return NextResponse.json(
        { error: "Invitation was just sent — wait a minute before resending" },
        { status: 429 },
      );
    }
    const config = await getTeamPricingConfig();
    const token = generateInviteToken();
    const expiresAt = new Date(Date.now() + config.inviteExpiryDays * 86400_000);
    const updated = await db.teamInvitation.update({
      where: { id: invitationId },
      data: { tokenHash: hashInviteToken(token), expiresAt },
    });
    const { subject, html } = teamInviteEmail({
      orgName: org.name,
      inviterName: me.name ?? me.email ?? "A teammate",
      role: updated.role,
      expiresAt,
      acceptUrl: `${appBaseUrl()}/invite/${token}`,
    });
    await sendEmail(updated.email, subject, html);
    await logTeamActivity(orgId, me.id, "invitation_resent", { invitationId, email: updated.email });
    return NextResponse.json({ ok: true, expiresAt: expiresAt.toISOString() });
  } catch (err) {
    return teamErrorResponse(err);
  }
}
