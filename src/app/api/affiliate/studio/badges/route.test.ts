// Route tests for GET /api/affiliate/studio/badges.
// Regression pin: this read feeds the DASHBOARD's BadgesStrip, which hides
// itself on any non-OK response. When the route was gated with
// requireStudioAccess (active status + paid membership), every affiliate
// without a current paid membership got a 403 and the strip silently
// vanished from their dashboard. The read is now affiliate-gated like the
// rest of the dashboard; Studio USE stays membership-gated elsewhere.
import { describe, it, expect, vi, beforeEach } from "vitest";

const CANNED_BADGES = [
  { key: "studio_starter", label: "Studio Starter", blurb: "Save your first creation in the Studio", xp: 50, earned: true, earnedAt: "2026-10-15T00:00:00.000Z" },
  { key: "top_promoter", label: "Top Promoter", blurb: "Refer 5 paying subscribers", xp: 500, earned: false, earnedAt: null },
];

const mocks = vi.hoisted(() => ({
  auth: vi.fn(async () => null as { user?: { id?: string } } | null),
  findProfile: vi.fn(async () => null as { id: string; status: string; showcaseEnabled: boolean; isAmbassador: boolean } | null),
  evaluateBadges: vi.fn(async () => [] as unknown[]),
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/db", () => ({
  db: {
    affiliateProfile: { findUnique: mocks.findProfile },
    // Present so resolveMembership (imported by _util) would find no
    // subscription if it were ever called — the non-member case.
    subscription: { findUnique: async () => null },
  },
}));
vi.mock("@/lib/studio/badges", () => ({ evaluateBadges: mocks.evaluateBadges }));

import { GET } from "./route";

const PROFILE = { id: "prof-1", status: "active", showcaseEnabled: false, isAmbassador: false };

describe("GET /api/affiliate/studio/badges", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.evaluateBadges.mockResolvedValue(CANNED_BADGES);
  });

  it("signed out → 401, badges never evaluated", async () => {
    mocks.auth.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
    expect(mocks.evaluateBadges).not.toHaveBeenCalled();
  });

  it("signed in without an affiliate profile → 404", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "u1" } });
    mocks.findProfile.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(404);
    expect(mocks.evaluateBadges).not.toHaveBeenCalled();
  });

  it("affiliate WITHOUT a paid membership still gets badge state (the dashboard case)", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "u1" } });
    mocks.findProfile.mockResolvedValue(PROFILE);
    const res = await GET();
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.badges).toEqual(CANNED_BADGES);
    expect(mocks.evaluateBadges).toHaveBeenCalledWith("prof-1");
  });

  it("pending-status affiliate also gets badge state, matching the dashboard gate", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "u1" } });
    mocks.findProfile.mockResolvedValue({ ...PROFILE, status: "pending" });
    const res = await GET();
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.badges).toEqual(CANNED_BADGES);
  });
});
