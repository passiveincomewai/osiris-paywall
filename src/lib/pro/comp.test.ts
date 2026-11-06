// Free-Pro (comp) program unit tests: the pure decision logic that guards
// real Stripe subscriptions, plus creator-application input validation.
// DB-backed paths (grant/revoke upserts, admin approval) are exercised
// against staging; these tests pin the rules that must never regress:
// a paying customer's row is untouchable, and comp rows are recognizable.
import { describe, it, expect } from "vitest";
import {
  isCompSubscription,
  compGrantDecision,
  compRevokeDecision,
  compSyntheticId,
  compExtendBase,
  isVisionaryXp,
  COMP_PRICE_ID,
} from "./comp";
import { validateCreatorApplication, CREATOR_MIN_FOLLOWERS } from "./creator";
import { RANKS } from "@/lib/affiliate/ranks";

const compRow = { stripeSubscriptionId: "comp_creator_user123" };
const visionaryRow = { stripeSubscriptionId: "comp_visionary_user123" };
const realRow = { stripeSubscriptionId: "sub_1AbC2dEf3GhI" };

describe("comp subscription detection", () => {
  it("recognizes comp rows by the comp_ prefix", () => {
    expect(isCompSubscription(compRow)).toBe(true);
    expect(isCompSubscription(visionaryRow)).toBe(true);
    expect(isCompSubscription(realRow)).toBe(false);
    expect(isCompSubscription(null)).toBe(false);
    expect(isCompSubscription(undefined)).toBe(false);
  });

  it("builds synthetic ids in the comp_<source>_<userId> shape", () => {
    expect(compSyntheticId("creator", "u1")).toBe("comp_creator_u1");
    expect(compSyntheticId("visionary", "u1")).toBe("comp_visionary_u1");
    expect(compSyntheticId("invite", "u1")).toBe("comp_invite_u1");
    expect(COMP_PRICE_ID).toBe("comp_free_pro");
  });
});

describe("comp grant decision (paid customers are untouchable)", () => {
  it("grants when there is no subscription row", () => {
    expect(compGrantDecision(null)).toBe("grant");
    expect(compGrantDecision(undefined)).toBe("grant");
  });

  it("grants over an existing comp row (extend / re-source)", () => {
    expect(compGrantDecision(compRow)).toBe("grant");
    expect(compGrantDecision(visionaryRow)).toBe("grant");
  });

  it("skips when a real Stripe subscription exists — any status", () => {
    expect(compGrantDecision(realRow)).toBe("skip_paid");
  });
});

describe("comp extend base (additive days grants)", () => {
  const now = new Date("2026-11-05T12:00:00Z");
  it("extends from a comp period end still in the future", () => {
    const end = new Date("2026-11-20T12:00:00Z");
    expect(compExtendBase({ currentPeriodEnd: end }, now)).toBe(end);
  });
  it("restarts from now when the comp period already ended", () => {
    const end = new Date("2026-10-01T12:00:00Z");
    expect(compExtendBase({ currentPeriodEnd: end }, now)).toBe(now);
  });
  it("starts from now with no existing row", () => {
    expect(compExtendBase(null, now)).toBe(now);
    expect(compExtendBase(undefined, now)).toBe(now);
  });
});

describe("comp revoke decision", () => {
  it("only ever touches comp rows", () => {
    expect(compRevokeDecision(compRow)).toBe(true);
    expect(compRevokeDecision(realRow)).toBe(false);
    expect(compRevokeDecision(null)).toBe(false);
  });
});

describe("visionary XP check", () => {
  it("matches the top of the default ladder (30,000 XP)", () => {
    const top = RANKS[RANKS.length - 1];
    expect(top.key).toBe("visionary");
    expect(isVisionaryXp(top.minXp - 1)).toBe(false);
    expect(isVisionaryXp(top.minXp)).toBe(true);
    expect(isVisionaryXp(top.minXp + 5000)).toBe(true);
    expect(isVisionaryXp(0)).toBe(false);
  });
});

describe("creator application validation", () => {
  const good = {
    platform: "instagram",
    handle: "creator",
    profileUrl: "https://instagram.com/creator",
    followers: CREATOR_MIN_FOLLOWERS,
  };

  it("accepts a well-formed application and strips a leading @", () => {
    const v = validateCreatorApplication({ ...good, handle: "@creator" });
    expect(v.ok).toBe(true);
    if (v.ok) {
      expect(v.value.handle).toBe("creator");
      expect(v.value.followers).toBe(25000);
    }
  });

  it("accepts followers below 25k (claims are stored; admin verifies)", () => {
    const v = validateCreatorApplication({ ...good, followers: 1200 });
    expect(v.ok).toBe(true);
  });

  it("accepts numeric-string followers", () => {
    const v = validateCreatorApplication({ ...good, followers: "42000" });
    expect(v.ok).toBe(true);
    if (v.ok) expect(v.value.followers).toBe(42000);
  });

  it("rejects unknown platforms, bad URLs, and negative followers", () => {
    expect(validateCreatorApplication({ ...good, platform: "myspace" }).ok).toBe(false);
    expect(validateCreatorApplication({ ...good, profileUrl: "not a url" }).ok).toBe(false);
    expect(validateCreatorApplication({ ...good, profileUrl: "ftp://x.com/a" }).ok).toBe(false);
    expect(validateCreatorApplication({ ...good, followers: -5 }).ok).toBe(false);
    expect(validateCreatorApplication({ ...good, followers: "lots" }).ok).toBe(false);
    expect(validateCreatorApplication({ ...good, handle: "  " }).ok).toBe(false);
    expect(validateCreatorApplication(null).ok).toBe(false);
    expect(validateCreatorApplication({}).ok).toBe(false);
  });
});
