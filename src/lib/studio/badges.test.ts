// Badges unit tests: badgesEarned threshold matrix — each badge flips
// exactly at its threshold, never before.
import { describe, it, expect } from "vitest";
import { BADGE_DEFS, badgesEarned, type BadgeMetrics } from "./badges";

const base: BadgeMetrics = {
  creations: 0,
  videoJobs: 0,
  campaignCompletions: 0,
  payingReferrals: 0,
  isAmbassador: false,
};

function earned(patch: Partial<BadgeMetrics>): string[] {
  return badgesEarned({ ...base, ...patch });
}

describe("BADGE_DEFS", () => {
  it("defines the six spec badges with their XP", () => {
    expect(BADGE_DEFS.map((d) => [d.key, d.xp])).toEqual([
      ["studio_starter", 50],
      ["content_creator", 150],
      ["reel_machine", 100],
      ["campaign_pro", 200],
      ["top_promoter", 500],
      ["world_eye_ambassador", 250],
    ]);
    for (const d of BADGE_DEFS) {
      expect(d.label.length).toBeGreaterThan(0);
      expect(d.blurb.length).toBeGreaterThan(0);
    }
  });
});

describe("badgesEarned thresholds", () => {
  it("earns nothing at zero metrics", () => {
    expect(earned({})).toEqual([]);
  });

  it("studio_starter flips at exactly 1 creation", () => {
    expect(earned({ creations: 0 })).not.toContain("studio_starter");
    expect(earned({ creations: 1 })).toContain("studio_starter");
  });

  it("content_creator flips at exactly 10 creations", () => {
    expect(earned({ creations: 9 })).not.toContain("content_creator");
    expect(earned({ creations: 9 })).toContain("studio_starter");
    expect(earned({ creations: 10 })).toContain("content_creator");
  });

  it("reel_machine flips at exactly 1 video job", () => {
    expect(earned({ videoJobs: 0 })).not.toContain("reel_machine");
    expect(earned({ videoJobs: 1 })).toContain("reel_machine");
  });

  it("campaign_pro flips at exactly 1 campaign completion", () => {
    expect(earned({ campaignCompletions: 0 })).not.toContain("campaign_pro");
    expect(earned({ campaignCompletions: 1 })).toContain("campaign_pro");
  });

  it("top_promoter flips at exactly 5 paying referrals", () => {
    expect(earned({ payingReferrals: 4 })).not.toContain("top_promoter");
    expect(earned({ payingReferrals: 5 })).toContain("top_promoter");
  });

  it("world_eye_ambassador requires the ambassador flag", () => {
    expect(earned({ isAmbassador: false })).not.toContain("world_eye_ambassador");
    expect(earned({ isAmbassador: true })).toContain("world_eye_ambassador");
  });

  it("earns all six at max metrics, in BADGE_DEFS order", () => {
    expect(
      earned({
        creations: 25,
        videoJobs: 3,
        campaignCompletions: 2,
        payingReferrals: 9,
        isAmbassador: true,
      }),
    ).toEqual(BADGE_DEFS.map((d) => d.key));
  });
});
