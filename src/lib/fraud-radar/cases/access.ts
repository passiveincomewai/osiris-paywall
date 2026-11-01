/**
 * Fraud Radar Phase 8 — case access resolution (PHASE8 §1.5).
 *
 * The ONLY place case access is decided. Every route and server
 * component calls resolveCaseAccess() (directly or through
 * loadAccessibleCase); no route hand-rolls an ownership check.
 *
 * Private by default: a case is visible to its owner only,
 * unless visibility = "team" AND the Phase 11 entitlement
 * interface resolves the caller as a member of the case's
 * teamRef. teamRef is OPAQUE — Phase 8 creates no team table
 * and no link to the camera product's Organization model.
 *
 * V1 resolver behaviour: ownership grants read + write; the
 * default team-membership resolver knows "no team grants exist
 * yet" and returns false for every team query, so team-visible
 * cases are owner-only in effect until Phase 11 injects its
 * resolver. An injected resolver that confirms membership
 * grants READ only — write stays owner-only in v1 (Phase 11
 * may extend team roles, never beyond).
 *
 * A case the caller cannot read produces 404 in the routes —
 * identical to a nonexistent case; existence is never leaked
 * (the Phase 7 §3.5 precedent, PHASE8 §0 rule 3).
 */

export interface CaseAccess {
  canRead: boolean;
  canWrite: boolean;
  via: "owner" | "team" | "none";
}

export interface CaseAccessRow {
  ownerId: string;
  visibility: string;
  teamRef: string | null;
}

/** The Phase 11 injection point: team membership resolution. */
export type TeamMembershipResolver = (
  userId: string,
  teamRef: string,
) => Promise<boolean>;

/** The v1 default: no team grants exist yet. */
export const noTeamGrants: TeamMembershipResolver = async () => false;

export async function resolveCaseAccess(args: {
  userId: string | null;
  caseRow: CaseAccessRow;
  teamMembership?: TeamMembershipResolver;
}): Promise<CaseAccess> {
  const { userId, caseRow } = args;
  if (!userId) return { canRead: false, canWrite: false, via: "none" };
  if (caseRow.ownerId === userId) {
    return { canRead: true, canWrite: true, via: "owner" };
  }
  if (caseRow.visibility === "team" && caseRow.teamRef) {
    const isMember = await (args.teamMembership ?? noTeamGrants)(
      userId,
      caseRow.teamRef,
    );
    if (isMember) return { canRead: true, canWrite: false, via: "team" };
  }
  return { canRead: false, canWrite: false, via: "none" };
}

/** The minimal store surface the loader needs (cases/store.ts). */
export interface CaseLookup {
  getCaseById(id: string): Promise<CaseAccessRow | null>;
}

/**
 * Load a case by id and apply access in one step. Returns the
 * row plus its access when the caller may proceed, or null —
 * routes render null as 404 whether the case is foreign or
 * nonexistent, so the two are indistinguishable.
 */
export async function loadAccessibleCase<T extends CaseAccessRow>(
  lookup: { getCaseById(id: string): Promise<T | null> },
  args: {
    userId: string | null;
    caseId: string;
    write?: boolean;
    teamMembership?: TeamMembershipResolver;
  },
): Promise<{ caseRow: T; access: CaseAccess } | null> {
  const caseRow = await lookup.getCaseById(args.caseId);
  if (!caseRow) return null;
  const access = await resolveCaseAccess({
    userId: args.userId,
    caseRow,
    teamMembership: args.teamMembership,
  });
  if (!access.canRead) return null;
  if (args.write && !access.canWrite) return null;
  return { caseRow, access };
}
