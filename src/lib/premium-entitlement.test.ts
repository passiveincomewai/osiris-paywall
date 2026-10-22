// Self-healing entitlement pins (scope F). The bug: one mount fetch set
// the globe's isPremiumUser for the whole visit; a raced/transient result
// walled a paying Pro user on every Pro surface. These pin the healing
// primitives page.tsx now runs on: fresh checks, upgrade-only ambient
// application, the recheck throttle, and the blocked-click decision.
import { describe, it, expect, vi } from "vitest";
import {
  checkPremiumEntitlement,
  readSessionIdentity,
  applyAmbientEntitlement,
  shouldRecheckEntitlement,
  blockedCameraAction,
  ENTITLEMENT_RECHECK_THROTTLE_MS,
} from "./premium-entitlement";

function fakeFetch(impl: () => Promise<{ ok: boolean; json: () => Promise<unknown> }>) {
  return vi.fn(impl) as unknown as typeof fetch;
}
const sessionResponse = (status: string | null) => ({
  ok: true,
  json: async () => (status === null ? {} : { user: { subscriptionStatus: status } }),
});

describe("checkPremiumEntitlement", () => {
  it("maps an active session to 'active'", async () => {
    await expect(checkPremiumEntitlement(fakeFetch(async () => sessionResponse("active")))).resolves.toBe("active");
  });

  it("maps any non-active session to 'free' (the mount-fetch-free state)", async () => {
    await expect(checkPremiumEntitlement(fakeFetch(async () => sessionResponse("none")))).resolves.toBe("free");
    await expect(checkPremiumEntitlement(fakeFetch(async () => sessionResponse(null)))).resolves.toBe("free");
  });

  it("maps failures to 'unknown' — never to a downgrade signal", async () => {
    await expect(
      checkPremiumEntitlement(fakeFetch(async () => ({ ok: false, json: async () => ({}) }))),
    ).resolves.toBe("unknown");
    await expect(
      checkPremiumEntitlement(fakeFetch(async () => { throw new Error("network"); })),
    ).resolves.toBe("unknown");
  });

  it("team grant (Phase 10): a pro/vip planTier is active even when the OWN status is not", async () => {
    const tierSession = (planTier: string) => ({
      ok: true,
      json: async () => ({ user: { subscriptionStatus: "none", planTier } }),
    });
    await expect(checkPremiumEntitlement(fakeFetch(async () => tierSession("vip")))).resolves.toBe("active");
    await expect(checkPremiumEntitlement(fakeFetch(async () => tierSession("pro")))).resolves.toBe("active");
    await expect(checkPremiumEntitlement(fakeFetch(async () => tierSession("free")))).resolves.toBe("free");
  });
});

describe("blocked-click decision (F1)", () => {
  it("mount said free, click-time refetch says active → open (no wall, no bonus spent)", () => {
    expect(blockedCameraAction("active", true)).toBe("open");
    expect(blockedCameraAction("active", false)).toBe("open");
  });

  it("refetch still free → the pre-existing paths: bonus if banked, else the wall", () => {
    expect(blockedCameraAction("free", true)).toBe("bonus");
    expect(blockedCameraAction("free", false)).toBe("wall");
  });

  it("refetch failed (unknown) → same as free: bonus/wall unchanged, never a silent open", () => {
    expect(blockedCameraAction("unknown", true)).toBe("bonus");
    expect(blockedCameraAction("unknown", false)).toBe("wall");
  });
});

describe("applyAmbientEntitlement (F2/F3)", () => {
  it("an ambient active flips false → true (satellite/traffic surfaces read the same state)", () => {
    expect(applyAmbientEntitlement(false, "active")).toBe(true);
  });

  it("a failed or free ambient check NEVER downgrades a known-Pro state", () => {
    expect(applyAmbientEntitlement(true, "unknown")).toBe(true);
    expect(applyAmbientEntitlement(true, "free")).toBe(true);
  });

  it("free stays free until a check actually says active", () => {
    expect(applyAmbientEntitlement(false, "free")).toBe(false);
    expect(applyAmbientEntitlement(false, "unknown")).toBe(false);
  });
});

describe("shouldRecheckEntitlement (F2 throttle)", () => {
  it("suppresses rechecks inside the throttle window, allows them after", () => {
    const t0 = 1_000_000;
    expect(shouldRecheckEntitlement(t0, t0 + ENTITLEMENT_RECHECK_THROTTLE_MS - 1)).toBe(false);
    expect(shouldRecheckEntitlement(t0, t0 + ENTITLEMENT_RECHECK_THROTTLE_MS)).toBe(true);
    expect(shouldRecheckEntitlement(0, t0)).toBe(true);
  });
});

describe("readSessionIdentity (signed-in visibility)", () => {
  const sessionWith = (user: unknown) => ({
    ok: true,
    json: async () => (user === null ? {} : { user }),
  });

  it("no user in the session → anonymous", async () => {
    const id = await readSessionIdentity(fakeFetch(async () => sessionWith(null)));
    expect(id.state).toBe("anonymous");
    expect(id.planTier).toBe("free");
  });

  it("a signed-in user with no subscription → free (an account, not a ghost)", async () => {
    const id = await readSessionIdentity(
      fakeFetch(async () => sessionWith({ email: "a@b.c", subscriptionStatus: "none", planTier: "free" })),
    );
    expect(id.state).toBe("free");
    expect(id.planTier).toBe("free");
    expect(id.user?.email).toBe("a@b.c");
  });

  it("an active subscription → premium, even with a stale free tier claim", async () => {
    const id = await readSessionIdentity(
      fakeFetch(async () => sessionWith({ email: "a@b.c", subscriptionStatus: "active", planTier: "free" })),
    );
    expect(id.state).toBe("premium");
  });

  it("an effective vip tier (team grant / annual) → premium with planTier vip", async () => {
    const id = await readSessionIdentity(
      fakeFetch(async () => sessionWith({ email: "a@b.c", subscriptionStatus: "none", planTier: "vip" })),
    );
    expect(id.state).toBe("premium");
    expect(id.planTier).toBe("vip");
  });

  it("failures map to unknown — never to anonymous or a downgrade claim", async () => {
    await expect(
      readSessionIdentity(fakeFetch(async () => ({ ok: false, json: async () => ({}) }))),
    ).resolves.toMatchObject({ state: "unknown" });
    await expect(
      readSessionIdentity(fakeFetch(async () => { throw new Error("network"); })),
    ).resolves.toMatchObject({ state: "unknown" });
  });
});
