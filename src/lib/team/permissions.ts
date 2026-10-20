// Team Access — membership & role gates. Every team route resolves the
// caller's membership through here so the role rules live in one place.

import { db } from "@/lib/db";

export type TeamRole = "owner" | "admin" | "member";

export const ROLE_RANK: Record<TeamRole, number> = { member: 1, admin: 2, owner: 3 };

export function isTeamRole(v: unknown): v is TeamRole {
  return v === "owner" || v === "admin" || v === "member";
}

export function roleSatisfies(role: string | null | undefined, minRole: TeamRole): boolean {
  if (!isTeamRole(role)) return false;
  return ROLE_RANK[role] >= ROLE_RANK[minRole];
}

export class TeamError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function getMembership(orgId: string, userId: string) {
  return db.organizationMember.findUnique({
    where: { organizationId_userId: { organizationId: orgId, userId } },
  });
}

/**
 * Resolve the caller's membership in `orgId`, requiring at least
 * `minRole`. The org's owner always satisfies any role via their owner
 * membership row (created with the org); if that row is missing we
 * synthesize the owner role from Organization.ownerId so the owner can
 * never be locked out of their own team.
 * Throws TeamError (404 org missing / 403 not a member or role too low).
 */
export async function requireMembership(orgId: string, userId: string, minRole: TeamRole = "member") {
  const org = await db.organization.findUnique({ where: { id: orgId } });
  if (!org) throw new TeamError(404, "Team not found");
  let membership = await getMembership(orgId, userId);
  if (!membership && org.ownerId === userId) {
    membership = { id: "", organizationId: orgId, userId, role: "owner", createdAt: org.createdAt } as unknown as typeof membership;
  }
  if (!membership) throw new TeamError(403, "You are not a member of this team");
  if (!roleSatisfies(membership.role, minRole)) {
    throw new TeamError(403, "Insufficient team role");
  }
  return { org, membership };
}

/** Suspended orgs: reads allowed for the owner; member writes blocked. */
export function assertOrgWritable(org: { suspended: boolean; ownerId: string }, userId: string) {
  if (org.suspended && org.ownerId !== userId) {
    throw new TeamError(403, "This team is suspended");
  }
}
