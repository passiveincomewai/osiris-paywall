import { describe, expect, it } from "vitest";
import { arbitrate, frequencyAllows } from "./manager";
import { trialDaysLeft, trialEndingEligible } from "./trial-ending";
import { affiliateInviteEligible } from "./affiliate-invite";

const NOW = 1_800_000_000_000;
const HOUR = 60 * 60 * 1000;

describe("trialEndingEligible (#12)", () => {
  it("fires inside the last 48 hours of a trial", () => {
    expect(
      trialEndingEligible({ status: "trialing", periodEndMs: NOW + 47 * HOUR, now: NOW }),
    ).toBe(true);
    expect(
      trialEndingEligible({ status: "trialing", periodEndMs: NOW + 1 * HOUR, now: NOW }),
    ).toBe(true);
  });
  it("stays dark earlier in the trial and after it ends", () => {
    expect(
      trialEndingEligible({ status: "trialing", periodEndMs: NOW + 49 * HOUR, now: NOW }),
    ).toBe(false);
    expect(
      trialEndingEligible({ status: "trialing", periodEndMs: NOW - HOUR, now: NOW }),
    ).toBe(false);
  });
  it("suppresses after conversion (status leaves trialing)", () => {
    expect(
      trialEndingEligible({ status: "active", periodEndMs: NOW + 10 * HOUR, now: NOW }),
    ).toBe(false);
    expect(
      trialEndingEligible({ status: "past_due", periodEndMs: NOW + 10 * HOUR, now: NOW }),
    ).toBe(false);
    expect(
      trialEndingEligible({ status: null, periodEndMs: null, now: NOW }),
    ).toBe(false);
  });
  it("days-left rounds up, never down", () => {
    expect(trialDaysLeft(NOW + 25 * HOUR, NOW)).toBe(2);
    expect(trialDaysLeft(NOW + 23 * HOUR, NOW)).toBe(1);
    expect(trialDaysLeft(NOW + 48 * HOUR, NOW)).toBe(2);
  });
});

describe("affiliateInviteEligible (#13)", () => {
  it("requires the full bar: 30 opens on 5 distinct days", () => {
    expect(
      affiliateInviteEligible({ hasAffiliateProfile: false, cameraOpens30d: 30, activeDays30d: 5 }),
    ).toBe(true);
    expect(
      affiliateInviteEligible({ hasAffiliateProfile: false, cameraOpens30d: 120, activeDays30d: 14 }),
    ).toBe(true);
  });
  it("rejects binges and light users", () => {
    expect(
      affiliateInviteEligible({ hasAffiliateProfile: false, cameraOpens30d: 60, activeDays30d: 2 }),
    ).toBe(false);
    expect(
      affiliateInviteEligible({ hasAffiliateProfile: false, cameraOpens30d: 29, activeDays30d: 9 }),
    ).toBe(false);
  });
  it("never fires for existing affiliates", () => {
    expect(
      affiliateInviteEligible({ hasAffiliateProfile: true, cameraOpens30d: 500, activeDays30d: 30 }),
    ).toBe(false);
  });
});

describe("arbitration with the account popups", () => {
  const base = {
    sessionClaim: null,
    freq: {},
    now: NOW,
    modalOpen: false,
    pathname: "/",
  };
  it("trial_ending sits just under pricing_save, above trial_waiting", () => {
    const r = arbitrate({
      ...base,
      candidates: ["trial_waiting", "trial_ending", "happening_now"],
    });
    expect(r.show).toBe("trial_ending");
    const r2 = arbitrate({
      ...base,
      pathname: "/pricing",
      candidates: ["trial_ending", "pricing_save"],
    });
    expect(r2.show).toBe("pricing_save");
  });
  it("affiliate_invite is the lowest priority in the system", () => {
    const r = arbitrate({
      ...base,
      candidates: ["affiliate_invite", "install"],
    });
    expect(r.show).toBe("install");
    const alone = arbitrate({ ...base, candidates: ["affiliate_invite"] });
    expect(alone.show).toBe("affiliate_invite");
  });
  it("both account popups are exempt from the 7-day frequency cap", () => {
    const freq = { trial_ending: NOW - HOUR, affiliate_invite: NOW - HOUR };
    expect(frequencyAllows(freq, "trial_ending", NOW)).toBe(true);
    expect(frequencyAllows(freq, "affiliate_invite", NOW)).toBe(true);
    expect(frequencyAllows({ welcome_back: NOW - HOUR }, "welcome_back", NOW)).toBe(false);
  });
});
