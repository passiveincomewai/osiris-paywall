import { describe, it, expect } from "vitest";
import { resolveCaseAccess, loadAccessibleCase } from "./access";

/**
 * Phase 8 — access resolver (PHASE8 §1.5): owner-only in v1,
 * team visibility resolves ONLY through the injected Phase 11
 * interface, and the default resolver grants no team access.
 */

const owned = { ownerId: "user-a", visibility: "private", teamRef: null };
const teamCase = { ownerId: "user-a", visibility: "team", teamRef: "team-1" };

describe("resolveCaseAccess (§1.5)", () => {
  it("the owner can read and write, via owner", async () => {
    expect(await resolveCaseAccess({ userId: "user-a", caseRow: owned })).toEqual({
      canRead: true,
      canWrite: true,
      via: "owner",
    });
  });

  it("a signed-out caller gets nothing", async () => {
    expect(await resolveCaseAccess({ userId: null, caseRow: owned })).toEqual({
      canRead: false,
      canWrite: false,
      via: "none",
    });
  });

  it("another user gets nothing on a private case", async () => {
    expect(await resolveCaseAccess({ userId: "user-b", caseRow: owned })).toEqual({
      canRead: false,
      canWrite: false,
      via: "none",
    });
  });

  it("team visibility grants NOTHING under the default v1 resolver", async () => {
    // visibility=team is stored intent that activates when
    // Phase 11 lands its resolver — in v1 the case is owner-only.
    expect(await resolveCaseAccess({ userId: "user-b", caseRow: teamCase })).toEqual({
      canRead: false,
      canWrite: false,
      via: "none",
    });
  });

  it("an injected Phase 11 resolver can grant team READ — never write in v1", async () => {
    const access = await resolveCaseAccess({
      userId: "user-b",
      caseRow: teamCase,
      teamMembership: async (userId, teamRef) => userId === "user-b" && teamRef === "team-1",
    });
    expect(access).toEqual({ canRead: true, canWrite: false, via: "team" });
  });

  it("an injected resolver that denies membership grants nothing", async () => {
    const access = await resolveCaseAccess({
      userId: "user-b",
      caseRow: teamCase,
      teamMembership: async () => false,
    });
    expect(access.via).toBe("none");
  });

  it("teamRef alone (visibility still private) grants nothing even with a resolver", async () => {
    const access = await resolveCaseAccess({
      userId: "user-b",
      caseRow: { ownerId: "user-a", visibility: "private", teamRef: "team-1" },
      teamMembership: async () => true,
    });
    expect(access.via).toBe("none");
  });
});

describe("loadAccessibleCase — the 404 loader (§1.5)", () => {
  const lookup = {
    async getCaseById(id: string) {
      return id === "case-1" ? { id, ...owned } : null;
    },
  };

  it("returns the case for its owner", async () => {
    const found = await loadAccessibleCase(lookup, { userId: "user-a", caseId: "case-1" });
    expect(found?.caseRow.id).toBe("case-1");
    expect(found?.access.via).toBe("owner");
  });

  it("returns null for a foreign case — indistinguishable from nonexistent", async () => {
    expect(await loadAccessibleCase(lookup, { userId: "user-b", caseId: "case-1" })).toBeNull();
    expect(await loadAccessibleCase(lookup, { userId: "user-b", caseId: "nope" })).toBeNull();
    expect(await loadAccessibleCase(lookup, { userId: "user-a", caseId: "nope" })).toBeNull();
  });

  it("write loads fail for read-only (team) access", async () => {
    const teamLookup = {
      async getCaseById(id: string) {
        return id === "case-2" ? { id, ...teamCase } : null;
      },
    };
    const membership = async () => true;
    expect(
      await loadAccessibleCase(teamLookup, {
        userId: "user-b",
        caseId: "case-2",
        teamMembership: membership,
      }),
    ).not.toBeNull();
    expect(
      await loadAccessibleCase(teamLookup, {
        userId: "user-b",
        caseId: "case-2",
        write: true,
        teamMembership: membership,
      }),
    ).toBeNull();
  });
});
