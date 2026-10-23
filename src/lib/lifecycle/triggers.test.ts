// Lifecycle trigger tests: these functions decide who gets emailed and
// when. A regression here either spams users (double touches, stale
// archaeology) or silently never converts anyone — so every window edge
// is pinned on both sides, following the trial-reminders.test.ts style.
import { describe, it, expect } from "vitest";
import {
  welcomeDue,
  interestFollowupDue,
  retargetPricingDue,
  retargetCheckoutDue,
  trialStartedDue,
  trialWinbackDue,
  affiliateSignupDue,
  affiliateFirstCommissionDue,
} from "./triggers";
import { inferPlanInterest } from "./interest";

const NOW = new Date(Date.UTC(2026, 9, 22, 18, 0, 0)); // Oct 22 2026, 18:00 UTC
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3600_000);
const daysAgo = (d: number) => hoursAgo(d * 24);
const NOW_SEC = Math.floor(NOW.getTime() / 1000);

const engagedInterest = (over: Partial<Parameters<typeof inferPlanInterest>[0]> = {}) =>
  inferPlanInterest({
    attempts: over.attempts ?? [],
    pricingViews: over.pricingViews ?? [
      { durationSec: 45, createdAt: hoursAgo(5) },
      { durationSec: 20, createdAt: hoursAgo(26) },
    ],
  });

describe("welcomeDue", () => {
  it("is due for a fresh, unsubscribed signup inside the window", () => {
    expect(welcomeDue({ userCreatedAt: hoursAgo(2), hasLiveSubscription: false }, NOW).due).toBe(true);
    expect(welcomeDue({ userCreatedAt: hoursAgo(47), hasLiveSubscription: false }, NOW).due).toBe(true);
  });
  it("waits out the first 15 minutes (the verify email owns minute zero)", () => {
    expect(welcomeDue({ userCreatedAt: hoursAgo(0.1), hasLiveSubscription: false }, NOW).reason).toBe("too_young");
  });
  it("never welcomes stale signups (first-run baseline protection)", () => {
    expect(welcomeDue({ userCreatedAt: daysAgo(3), hasLiveSubscription: false }, NOW).reason).toBe("too_old");
  });
  it("skips users who already subscribed", () => {
    expect(welcomeDue({ userCreatedAt: hoursAgo(2), hasLiveSubscription: true }, NOW).reason).toBe(
      "already_subscribed",
    );
  });
});

describe("interestFollowupDue", () => {
  const withAttempt = engagedInterest({ attempts: [{ plan: "monthly", createdAt: hoursAgo(50) }] });
  it("is due when a checkout attempt named a plan and the account is 48h+", () => {
    expect(
      interestFollowupDue({ userCreatedAt: daysAgo(3), interest: withAttempt, hasLiveSubscription: false }, NOW).due,
    ).toBe(true);
  });
  it("requires the honest plan signal — pricing engagement alone is not enough", () => {
    const noAttempt = engagedInterest();
    expect(noAttempt.basis).toBe("pricing_engagement");
    expect(
      interestFollowupDue({ userCreatedAt: daysAgo(3), interest: noAttempt, hasLiveSubscription: false }, NOW).reason,
    ).toBe("no_plan_signal");
  });
  it("gives new accounts two days to convert on their own", () => {
    expect(
      interestFollowupDue({ userCreatedAt: hoursAgo(24), interest: withAttempt, hasLiveSubscription: false }, NOW)
        .reason,
    ).toBe("too_young");
  });
});

describe("retargetPricingDue", () => {
  it("is due for engaged pricing viewers with no recent attempt", () => {
    expect(
      retargetPricingDue({ interest: engagedInterest(), lastAttemptAt: null, hasLiveSubscription: false }, NOW).due,
    ).toBe(true);
  });
  it("is not due for a pricing bounce", () => {
    const bounce = inferPlanInterest({
      attempts: [],
      pricingViews: [{ durationSec: 2, createdAt: hoursAgo(3) }],
    });
    expect(bounce.pricingEngaged).toBe(false);
    expect(
      retargetPricingDue({ interest: bounce, lastAttemptAt: null, hasLiveSubscription: false }, NOW).reason,
    ).toBe("no_pricing_engagement");
  });
  it("goes stale after 7 days and yields to a recent checkout attempt", () => {
    const stale = inferPlanInterest({
      attempts: [],
      pricingViews: [
        { durationSec: 60, createdAt: daysAgo(8) },
        { durationSec: 60, createdAt: daysAgo(8) },
      ],
    });
    expect(
      retargetPricingDue({ interest: stale, lastAttemptAt: null, hasLiveSubscription: false }, NOW).reason,
    ).toBe("engagement_stale");
    expect(
      retargetPricingDue(
        { interest: engagedInterest(), lastAttemptAt: hoursAgo(10), hasLiveSubscription: false },
        NOW,
      ).reason,
    ).toBe("recent_attempt");
  });
});

describe("retargetCheckoutDue", () => {
  const reminded = { status: "reminded", createdAt: daysAgo(4), remindedAt: daysAgo(3) };
  it("is due for a reminded attempt that stayed unconverted", () => {
    expect(retargetCheckoutDue({ attempt: reminded, hasLiveSubscription: false }, NOW).due).toBe(true);
  });
  it("never pre-empts the abandoned-cart cron's first touch", () => {
    expect(
      retargetCheckoutDue(
        { attempt: { status: "started", createdAt: daysAgo(4), remindedAt: null }, hasLiveSubscription: false },
        NOW,
      ).reason,
    ).toBe("first_touch_pending");
  });
  it("respects the 48h gap after the first reminder", () => {
    expect(
      retargetCheckoutDue(
        { attempt: { status: "reminded", createdAt: daysAgo(4), remindedAt: hoursAgo(10) }, hasLiveSubscription: false },
        NOW,
      ).reason,
    ).toBe("reminded_too_recently");
  });
  it("ignores completed attempts and live subscribers", () => {
    expect(
      retargetCheckoutDue(
        { attempt: { ...reminded, status: "completed" }, hasLiveSubscription: false },
        NOW,
      ).reason,
    ).toBe("attempt_completed");
    expect(retargetCheckoutDue({ attempt: reminded, hasLiveSubscription: true }, NOW).reason).toBe(
      "already_subscribed",
    );
  });
});

describe("trialStartedDue", () => {
  it("is due for a fresh trialing subscription", () => {
    expect(
      trialStartedDue({ stripeStatus: "trialing", subscriptionCreatedAt: hoursAgo(3) }, NOW).due,
    ).toBe(true);
  });
  it("does not backfill old trials and ignores non-trialing subs", () => {
    expect(
      trialStartedDue({ stripeStatus: "trialing", subscriptionCreatedAt: daysAgo(2) }, NOW).reason,
    ).toBe("too_old");
    expect(
      trialStartedDue({ stripeStatus: "active", subscriptionCreatedAt: hoursAgo(1) }, NOW).reason,
    ).toBe("not_trialing");
  });
});

describe("trialWinbackDue", () => {
  it("is due within a week of a canceled trial ending", () => {
    expect(
      trialWinbackDue({ stripeStatus: "canceled", trialEndSec: NOW_SEC - 2 * 86400, hasLiveSubscription: false }, NOW)
        .due,
    ).toBe(true);
  });
  it("never win-backs a converted or still-trialing user", () => {
    expect(
      trialWinbackDue({ stripeStatus: "active", trialEndSec: NOW_SEC - 2 * 86400, hasLiveSubscription: true }, NOW)
        .reason,
    ).toBe("already_subscribed");
    expect(
      trialWinbackDue({ stripeStatus: "trialing", trialEndSec: NOW_SEC + 86400, hasLiveSubscription: false }, NOW)
        .reason,
    ).toBe("not_ended_unconverted");
  });
  it("ignores subs that never trialed and stale endings", () => {
    expect(
      trialWinbackDue({ stripeStatus: "canceled", trialEndSec: null, hasLiveSubscription: false }, NOW).reason,
    ).toBe("never_trialed");
    expect(
      trialWinbackDue({ stripeStatus: "canceled", trialEndSec: NOW_SEC - 9 * 86400, hasLiveSubscription: false }, NOW)
        .reason,
    ).toBe("too_old");
  });
  it("leaves past_due to billing dunning, not win-back", () => {
    expect(
      trialWinbackDue({ stripeStatus: "past_due", trialEndSec: NOW_SEC - 86400, hasLiveSubscription: false }, NOW)
        .reason,
    ).toBe("not_ended_unconverted");
  });
});

describe("affiliate triggers", () => {
  it("signup notifications are prompt-only", () => {
    expect(affiliateSignupDue({ attributionCreatedAt: hoursAgo(1) }, NOW).due).toBe(true);
    expect(affiliateSignupDue({ attributionCreatedAt: daysAgo(2) }, NOW).reason).toBe("too_old");
  });
  it("first commission requires actually being first", () => {
    expect(
      affiliateFirstCommissionDue({ commissionCreatedAt: hoursAgo(5), isFirstCommission: true }, NOW).due,
    ).toBe(true);
    expect(
      affiliateFirstCommissionDue({ commissionCreatedAt: hoursAgo(5), isFirstCommission: false }, NOW).reason,
    ).toBe("not_first");
    expect(
      affiliateFirstCommissionDue({ commissionCreatedAt: daysAgo(9), isFirstCommission: true }, NOW).reason,
    ).toBe("too_old");
  });
});
