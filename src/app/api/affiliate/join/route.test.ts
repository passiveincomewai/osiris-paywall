// Join-endpoint pins: auth, idempotent re-join, and the referral-code
// regression — codes are RANDOM. A user named "Test" must NOT be issued
// the code "test" (the pre-fix slugify(name) behaviour that made the
// invite UI present worldeye.app/ref/test as if it were a placeholder).
import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(async () => null as { user?: { id?: string; name?: string; email?: string } } | null),
  profileByUser: vi.fn(async () => null as unknown),
  profileByCode: vi.fn(async () => null as unknown),
  identityByCode: vi.fn(async () => null as unknown),
  createProfile: vi.fn(async ({ data }: any) => ({ id: "prof_new", ...data })),
  attributionByUser: vi.fn(async () => null as unknown),
  awardXP: vi.fn(async () => ({})),
  audit: vi.fn(async () => ({})),
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/db", () => ({
  db: {
    affiliateProfile: {
      findUnique: mocks.profileByUser,
      findFirst: mocks.profileByCode,
      create: mocks.createProfile,
    },
    referralAttribution: { findUnique: mocks.attributionByUser },
    shareIdentity: { findUnique: mocks.identityByCode },
    // Account-settings ship: codeTaken + findAffiliateByCode also
    // consult former-code aliases. No aliases exist in these fixtures.
    referralCodeAlias: { findUnique: async () => null },
  },
}));
vi.mock("@/lib/affiliate/xp", () => ({ awardXP: mocks.awardXP }));
vi.mock("@/lib/affiliate/admin", () => ({ audit: mocks.audit }));
vi.mock("@/lib/growth", () => ({
  sendGrowthEvent: vi.fn(async () => {}),
  hashUserRef: (s: string) => `h:${s}`,
  utmFromRequest: () => ({}),
}));

import { POST } from "./route";

const post = () => POST(new Request("http://localhost/api/affiliate/join", { method: "POST" }));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.profileByUser.mockResolvedValue(null);
  mocks.profileByCode.mockResolvedValue(null);
  mocks.identityByCode.mockResolvedValue(null);
  mocks.attributionByUser.mockResolvedValue(null);
  mocks.createProfile.mockImplementation(async ({ data }: any) => ({ id: "prof_new", ...data }));
});

describe("POST /api/affiliate/join", () => {
  it("401 when signed out — no profile, no code", async () => {
    mocks.auth.mockResolvedValue(null);
    const res = await post();
    expect(res.status).toBe(401);
    expect(mocks.createProfile).not.toHaveBeenCalled();
  });

  it("existing profile: joined:false and nothing is re-minted", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "u1", name: "Test", email: "theboodirectory@gmail.com" } });
    mocks.profileByUser.mockResolvedValue({ id: "prof_old", referralCode: "whatever1" });
    const res = await post();
    expect(res.status).toBe(200);
    expect((await res.json()).joined).toBe(false);
    expect(mocks.createProfile).not.toHaveBeenCalled();
  });

  it("REGRESSION: a user named 'Test' gets a random code — never 'test', never name-derived", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "u_test", name: "Test", email: "theboodirectory@gmail.com" } });
    const res = await post();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.joined).toBe(true);
    const code = body.profile.referralCode as string;
    expect(code).not.toBe("test");
    expect(code.toLowerCase()).not.toContain("theboodirectory");
    expect(code).toMatch(/^[abcdefghjkmnpqrstuvwxyz23456789]{10}$/);
  });

  it("collision: a taken candidate is skipped and a different code is issued", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "u2", name: "Anyone", email: "a@b.co" } });
    // First candidate is reported taken (by profile), the rest are free.
    mocks.profileByCode
      .mockResolvedValueOnce({ id: "prof_someone" })
      .mockResolvedValue(null);
    const res = await post();
    expect(res.status).toBe(200);
    expect(mocks.profileByCode.mock.calls.length).toBeGreaterThanOrEqual(2);
    const code = (await res.json()).profile.referralCode as string;
    expect(code).toMatch(/^[abcdefghjkmnpqrstuvwxyz23456789]{10}$/);
  });

  it("a share-identity holding the candidate also counts as taken", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "u3", name: "Anyone", email: "a@b.co" } });
    mocks.identityByCode
      .mockResolvedValueOnce({ id: "ident_1" })
      .mockResolvedValue(null);
    const res = await post();
    expect(res.status).toBe(200);
    expect(mocks.identityByCode.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it("re-applies an existing attribution as recruitedBy on the new profile", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "u4", name: "Recruit", email: "r@b.co" } });
    mocks.attributionByUser.mockResolvedValue({ affiliateProfileId: "prof_inviter" });
    const res = await post();
    expect(res.status).toBe(200);
    expect(mocks.createProfile).toHaveBeenCalledWith({
      data: expect.objectContaining({ recruitedByProfileId: "prof_inviter" }),
    });
  });
});
