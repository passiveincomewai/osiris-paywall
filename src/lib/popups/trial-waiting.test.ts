import { describe, it, expect } from "vitest";
import {
  TRIAL_WAITING_MIN_ACCOUNT_AGE_MS,
  trialWaitingEligible,
} from "./trial-waiting";

const NOW = Date.UTC(2026, 9, 29, 18, 0, 0);
const DAY = 24 * 60 * 60 * 1000;

const base = {
  emailVerified: true,
  accountCreatedAtMs: NOW - 10 * DAY,
  hasSubscriptionRow: false,
  now: NOW,
};

describe("trialWaitingEligible", () => {
  it("fires for a verified, 10-day-old, never-subscribed account", () => {
    expect(trialWaitingEligible(base)).toBe(true);
  });

  it("never fires for an unverified account", () => {
    expect(trialWaitingEligible({ ...base, emailVerified: false })).toBe(false);
  });

  it("never fires when any Subscription row exists (trialed or paid before)", () => {
    expect(trialWaitingEligible({ ...base, hasSubscriptionRow: true })).toBe(false);
  });

  it("respects the 3-day account-age boundary exactly", () => {
    expect(
      trialWaitingEligible({
        ...base,
        accountCreatedAtMs: NOW - TRIAL_WAITING_MIN_ACCOUNT_AGE_MS,
      }),
    ).toBe(true);
    expect(
      trialWaitingEligible({
        ...base,
        accountCreatedAtMs: NOW - TRIAL_WAITING_MIN_ACCOUNT_AGE_MS + 1,
      }),
    ).toBe(false);
    expect(trialWaitingEligible({ ...base, accountCreatedAtMs: NOW - DAY })).toBe(false);
  });

  it("fails closed on a missing or corrupt creation date", () => {
    expect(trialWaitingEligible({ ...base, accountCreatedAtMs: 0 })).toBe(false);
    expect(trialWaitingEligible({ ...base, accountCreatedAtMs: Number.NaN })).toBe(false);
  });
});
