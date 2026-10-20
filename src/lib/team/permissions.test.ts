import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    organization: { findUnique: vi.fn() },
    organizationMember: { findUnique: vi.fn() },
  },
}));

import { db } from "@/lib/db";
import { ROLE_RANK, roleSatisfies, requireMembership, TeamError } from "./permissions";

const org = { id: "org1", ownerId: "owner1", createdAt: new Date(), suspended: false };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockDb = db as any;

beforeEach(() => {
  vi.clearAllMocks();
  mockDb.organization.findUnique.mockResolvedValue(org);
});

describe("ROLE_RANK / roleSatisfies", () => {
  it("ranks owner > admin > member", () => {
    expect(ROLE_RANK.owner).toBeGreaterThan(ROLE_RANK.admin);
    expect(ROLE_RANK.admin).toBeGreaterThan(ROLE_RANK.member);
  });
  it("satisfies at or above the minimum role only", () => {
    expect(roleSatisfies("owner", "admin")).toBe(true);
    expect(roleSatisfies("admin", "admin")).toBe(true);
    expect(roleSatisfies("member", "admin")).toBe(false);
    expect(roleSatisfies("member", "member")).toBe(true);
    expect(roleSatisfies("bogus", "member")).toBe(false);
    expect(roleSatisfies(null, "member")).toBe(false);
  });
});

describe("requireMembership", () => {
  it("returns membership when the role suffices", async () => {
    mockDb.organizationMember.findUnique.mockResolvedValue({ userId: "u1", role: "admin" });
    const { membership } = await requireMembership("org1", "u1", "admin");
    expect(membership.role).toBe("admin");
  });

  it("throws 403 when the role is too low", async () => {
    mockDb.organizationMember.findUnique.mockResolvedValue({ userId: "u1", role: "member" });
    await expect(requireMembership("org1", "u1", "admin")).rejects.toMatchObject({ status: 403 });
  });

  it("throws 403 for non-members", async () => {
    mockDb.organizationMember.findUnique.mockResolvedValue(null);
    await expect(requireMembership("org1", "stranger", "member")).rejects.toBeInstanceOf(TeamError);
  });

  it("synthesizes the owner role from Organization.ownerId", async () => {
    mockDb.organizationMember.findUnique.mockResolvedValue(null);
    const { membership } = await requireMembership("org1", "owner1", "owner");
    expect(membership.role).toBe("owner");
  });

  it("throws 404 when the org does not exist", async () => {
    mockDb.organization.findUnique.mockResolvedValue(null);
    await expect(requireMembership("nope", "u1", "member")).rejects.toMatchObject({ status: 404 });
  });
});
