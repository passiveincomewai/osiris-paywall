import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUserId, sessionUser, teamErrorResponse } from "@/lib/team/api";
import { requireMembership, TeamError } from "@/lib/team/permissions";
import { getTeamPricingConfig } from "@/lib/team/pricing-config";
import { generateInviteToken, hashInviteToken, normalizeInviteEmail, canInvite } from "@/lib/team/invitations";
import { isValidEmail } from "@/lib/password-auth";
import { isRateLimited, clientIp } from "@/lib/password-auth";
import { sendEmail, teamInviteEmail } from "@/lib/email";
import { appBaseUrl } from "@/lib/app-url";
import { logTeamActivity } from "@/lib/team/activity";
import { recordTeamEvent } from "@/lib/team/analytics";

export const runtime = "nodejs";

/** Lazily expire past-due pending invitations for an org. Returns count. */
export async function expireStaleInvitations(orgId: string): Promise<number> {
  const stale = await db.teamInvitation.findMany({
    where: { organizationId: orgId, status: "pending", expiresAt: { lt: new Date() } },
    select: { id: true },
  });
  if (stale.length === 0) return 0;
  await db.teamInvitation.updateMany({
    where: { id: { in: stale.map((s) => s.id) } },
    data: { status: "expired" },
  });
  for (const s of stale) {
    await logTeamActivity(orgId, null, "invitation_expired", { invitationId: s.id });
    await recordTeamEvent("invitation_expired", null, orgId);
  }
  return stale.length;
}

/** GET /api/team/invitations?orgId= — pending list (member+). */
export async function GET(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const orgId = req.nextUrl.searchParams.get("orgId") ?? "";
    await requireMembership(orgId, userId, "member");
    await expireStaleInvitations(orgId);
    const rows = await db.teamInvitation.findMany({
      where: { organizationId: orgId, status: "pending" },
      include: { invitedBy: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(
      rows.map((r) => ({
        id: r.id,
        email: r.email,
        role: r.role,
        expiresAt: r.expiresAt.toISOString(),
        createdAt: r.createdAt.toISOString(),
        invitedByName: r.invitedBy?.name ?? null,
      })),
    );
  } catch (err) {
    return teamErrorResponse(err);
  }
}

/**
 * POST /api/team/invitations { orgId, emails[], role }
 * Owner/admin always; members only when org.allowMemberInvites.
 * Capacity (members + pending ≤ purchasedSeats) is checked INSIDE the
 * transaction so concurrent sends can't race past it.
 */
export async function POST(req: NextRequest) {
  try {
    const me = await sessionUser();
    if (!me) throw new TeamError(401, "Sign in required");
    if (isRateLimited(`team-invite:${clientIp(req)}:${me.id}`, 30, 60 * 60 * 1000)) {
      return NextResponse.json({ error: "Too many invitations — try again later" }, { status: 429 });
    }
    const body = (await req.json().catch(() => ({}))) as { orgId?: string; emails?: string[]; role?: string };
    const orgId = String(body.orgId ?? "");
    const emails = Array.isArray(body.emails) ? body.emails.map((e) => normalizeInviteEmail(String(e))) : [];
    if (emails.length === 0 || emails.length > 20) throw new TeamError(400, "Provide 1–20 email addresses");

    const { org, membership } = await requireMembership(orgId, me.id, "member");
    if (org.suspended) throw new TeamError(403, "This team is suspended");
    const isPrivileged = membership.role === "owner" || membership.role === "admin";
    if (!isPrivileged && !org.allowMemberInvites) {
      throw new TeamError(403, "Members cannot send invitations for this team");
    }
    const role = String(body.role ?? org.defaultInviteRole);
    if (role !== "member" && role !== "admin") throw new TeamError(400, "Role must be member or admin");
    if (role === "admin" && membership.role === "member") {
      throw new TeamError(403, "Members cannot invite admins");
    }

    const config = await getTeamPricingConfig();
    const expiresAt = new Date(Date.now() + config.inviteExpiryDays * 86400_000);
    const inviterName = me.name ?? me.email ?? "A teammate";

    interface Prepared { email: string; token: string }
    const results: Array<{ email: string; ok: boolean; error?: string }> = [];
    const prepared: Prepared[] = [];

    await db.$transaction(async (tx) => {
      await expireStaleInvitations(orgId);
      const [members, pending] = await Promise.all([
        tx.organizationMember.count({ where: { organizationId: orgId } }),
        tx.teamInvitation.count({ where: { organizationId: orgId, status: "pending" } }),
      ]);
      let occupied = members + pending;
      const memberUsers = await tx.organizationMember.findMany({
        where: { organizationId: orgId },
        include: { user: { select: { email: true } } },
      });
      const memberEmails = new Set(memberUsers.map((m) => (m.user?.email ?? "").toLowerCase()).filter(Boolean));
      const pendingRows = await tx.teamInvitation.findMany({
        where: { organizationId: orgId, status: "pending" },
        select: { email: true },
      });
      const pendingEmails = new Set(pendingRows.map((r) => r.email));

      for (const email of emails) {
        if (!isValidEmail(email)) { results.push({ email, ok: false, error: "Invalid email address" }); continue; }
        if (memberEmails.has(email)) { results.push({ email, ok: false, error: "Already a team member" }); continue; }
        if (pendingEmails.has(email)) { results.push({ email, ok: false, error: "Invitation already pending" }); continue; }
        if (!canInvite({ members, pending: occupied - members, purchased: org.purchasedSeats }, 1)) {
          results.push({ email, ok: false, error: "No seats available — purchase more seats to invite" });
          continue;
        }
        const token = generateInviteToken();
        await tx.teamInvitation.create({
          data: {
            organizationId: orgId,
            email,
            role,
            tokenHash: hashInviteToken(token),
            invitedById: me.id,
            status: "pending",
            expiresAt,
          },
        });
        pendingEmails.add(email);
        occupied += 1;
        prepared.push({ email, token });
        results.push({ email, ok: true });
      }
    });

    // Emails go out after the transaction commits.
    for (const p of prepared) {
      const { subject, html } = teamInviteEmail({
        orgName: org.name,
        inviterName,
        role,
        expiresAt,
        acceptUrl: `${appBaseUrl()}/invite/${p.token}`,
      });
      await sendEmail(p.email, subject, html);
      await logTeamActivity(orgId, me.id, "invitation_created", { email: p.email, role });
      await recordTeamEvent("invitation_created", me.id, orgId);
    }
    return NextResponse.json({ results });
  } catch (err) {
    return teamErrorResponse(err);
  }
}
