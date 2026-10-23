// Pins for the F3 trial-prompt decisions: who qualifies (never-trialed
// free accounts only), the welcome-before-banner order, the dismissal
// cooldown, the excluded surfaces, the plan preselection, and the
// storage helpers' fail-soft behavior.
import { describe, it, expect } from "vitest";
import {
  TRIAL_BANNER_COOLDOWN_MS,
  decideTrialPromptSurface,
  dismissTrialSurfaces,
  isTrialPromptPathExcluded,
  markPendingWelcome,
  markWelcomed,
  readBannerDismissedAt,
  readLastViewedPlan,
  readPendingWelcome,
  readWelcomed,
  recordLastViewedPlan,
  resolveTrialPromptPlan,
  trialPromptEligible,
  clearPendingWelcome,
  type StorageLike,
  type TrialPromptInput,
} from "./trial-prompt";

const NOW = 1_800_000_000_000;

const eligible: TrialPromptInput = {
  identityState: "free",
  subscriptionStatus: "none",
  pathname: "/",
  pendingWelcome: false,
  welcomed: true,
  bannerDismissedAt: null,
  now: NOW,
};

describe("trialPromptEligible", () => {
  it("admits only signed-in free users whose status is exactly 'none'", () => {
    expect(trialPromptEligible({ identityState: "free", subscriptionStatus: "none" })).toBe(true);
    expect(trialPromptEligible({ identityState: "free", subscriptionStatus: "canceled" })).toBe(false);
    expect(trialPromptEligible({ identityState: "free", subscriptionStatus: "past_due" })).toBe(false);
    expect(trialPromptEligible({ identityState: "free", subscriptionStatus: undefined })).toBe(false);
    expect(trialPromptEligible({ identityState: "premium", subscriptionStatus: "active" })).toBe(false);
    expect(trialPromptEligible({ identityState: "anonymous", subscriptionStatus: "none" })).toBe(false);
    expect(trialPromptEligible({ identityState: "unknown", subscriptionStatus: "none" })).toBe(false);
  });
});

describe("decideTrialPromptSurface", () => {
  it("shows the welcome prompt once, right after signup", () => {
    expect(
      decideTrialPromptSurface({ ...eligible, pendingWelcome: true, welcomed: false }),
    ).toBe("welcome");
  });

  it("never repeats the welcome prompt once it has been shown", () => {
    expect(
      decideTrialPromptSurface({ ...eligible, pendingWelcome: true, welcomed: true }),
    ).toBe("banner");
  });

  it("falls back to the banner for eligible users with no signup flag", () => {
    expect(decideTrialPromptSurface(eligible)).toBe("banner");
  });

  it("silences both surfaces for the cooldown after a dismissal", () => {
    const dismissed = { ...eligible, bannerDismissedAt: NOW - 60_000 };
    expect(decideTrialPromptSurface(dismissed)).toBe("none");
    expect(
      decideTrialPromptSurface({
        ...dismissed,
        bannerDismissedAt: NOW - TRIAL_BANNER_COOLDOWN_MS - 1,
      }),
    ).toBe("banner");
    // The welcome prompt still outranks a stale dismissal: a user who
    // dismissed the banner and THEN signed up gets their welcome.
    expect(
      decideTrialPromptSurface({
        ...dismissed,
        pendingWelcome: true,
        welcomed: false,
      }),
    ).toBe("welcome");
  });

  it("stays off conversion, account and auth surfaces", () => {
    for (const pathname of [
      "/pricing",
      "/checkout",
      "/settings/subscription",
      "/admin/affiliates",
      "/signin",
      "/signup",
      "/welcome",
    ]) {
      expect(
        decideTrialPromptSurface({ ...eligible, pathname, pendingWelcome: true, welcomed: false }),
      ).toBe("none");
    }
  });

  it("stays off for anyone ineligible, whatever the flags say", () => {
    expect(
      decideTrialPromptSurface({
        ...eligible,
        identityState: "premium",
        subscriptionStatus: "active",
        pendingWelcome: true,
        welcomed: false,
      }),
    ).toBe("none");
  });
});

describe("isTrialPromptPathExcluded", () => {
  it("matches prefixes on segment boundaries only", () => {
    expect(isTrialPromptPathExcluded("/pricing")).toBe(true);
    expect(isTrialPromptPathExcluded("/pricing/teams")).toBe(true);
    expect(isTrialPromptPathExcluded("/pricingx")).toBe(false);
    expect(isTrialPromptPathExcluded("/")).toBe(false);
    expect(isTrialPromptPathExcluded("/cameras")).toBe(false);
  });
});

describe("resolveTrialPromptPlan", () => {
  it("keeps a real last-viewed trial plan", () => {
    expect(resolveTrialPromptPlan("weekly")).toBe("weekly");
    expect(resolveTrialPromptPlan("annual")).toBe("annual");
    expect(resolveTrialPromptPlan("monthly")).toBe("monthly");
  });

  it("defaults to Monthly for anything unknown", () => {
    expect(resolveTrialPromptPlan(null)).toBe("monthly");
    expect(resolveTrialPromptPlan(undefined)).toBe("monthly");
    expect(resolveTrialPromptPlan("enterprise")).toBe("monthly");
    expect(resolveTrialPromptPlan("garbage")).toBe("monthly");
  });
});

function fakeStorage(): StorageLike & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  };
}

describe("storage helpers", () => {
  it("round-trips the pending-welcome flag and clears it", () => {
    const s = fakeStorage();
    expect(readPendingWelcome(s)).toBe(false);
    markPendingWelcome(s);
    expect(readPendingWelcome(s)).toBe(true);
    clearPendingWelcome(s);
    expect(readPendingWelcome(s)).toBe(false);
  });

  it("round-trips the welcomed flag", () => {
    const s = fakeStorage();
    expect(readWelcomed(s)).toBe(false);
    markWelcomed(s);
    expect(readWelcomed(s)).toBe(true);
  });

  it("round-trips the dismissal timestamp and rejects junk", () => {
    const s = fakeStorage();
    expect(readBannerDismissedAt(s)).toBeNull();
    dismissTrialSurfaces(NOW, s);
    expect(readBannerDismissedAt(s)).toBe(NOW);
    s.setItem("worldeye:trial-banner-dismissed-at", "not-a-number");
    expect(readBannerDismissedAt(s)).toBeNull();
  });

  it("records only real trial plans as last-viewed", () => {
    const s = fakeStorage();
    expect(readLastViewedPlan(s)).toBe("monthly");
    recordLastViewedPlan("annual", s);
    expect(readLastViewedPlan(s)).toBe("annual");
    recordLastViewedPlan("enterprise", s);
    expect(readLastViewedPlan(s)).toBe("annual");
  });

  it("fails soft when storage throws (private mode)", () => {
    const throwing: StorageLike = {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("denied");
      },
      removeItem: () => {
        throw new Error("denied");
      },
    };
    expect(readPendingWelcome(throwing)).toBe(false);
    expect(readBannerDismissedAt(throwing)).toBeNull();
    expect(readLastViewedPlan(throwing)).toBe("monthly");
    expect(() => markPendingWelcome(throwing)).not.toThrow();
    expect(() => dismissTrialSurfaces(NOW, throwing)).not.toThrow();
  });
});
