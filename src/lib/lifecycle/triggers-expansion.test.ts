// Lifecycle trigger tests for the 2026-11 email expansion triggers
// (annual renewal notice, second trial win-back, cancellation save,
// subscription-ended win-back). Same pinning style as triggers.test.ts:
// every window edge on both sides, because a regression here either
// double-touches users or silently never sends.
import { describe, it, expect } from "vitest";
import {
  renewalNoticeDue,
  trialWinbackSecondDue,
  cancellationSaveDue,
  subscriptionEndedWinbackDue,
  onboardingDripDue,
  inactiveDue,
  trialExitSurveyDue,
  verificationReminderDue,
} from "./triggers";

const NOW = new Date(Date.UTC(2026, 10, 1, 18, 0, 0)); // Nov 1 2026, 18:00 UTC
const hoursFromNow = (h: number) => new Date(NOW.getTime() + h * 3600_000);
const daysFromNow = (d: number) => hoursFromNow(d * 24);
const daysAgoSec = (d: number) => Math.floor((NOW.getTime() - d * 86400_000) / 1000);

describe("renewalNoticeDue", () => {
  const base = {
    stripeStatus: "active",
    cancelAtPeriodEnd: false,
    periodEnd: daysFromNow(3),
    isAnnual: true,
  };
  it("is due inside the final week before an annual renewal", () => {
    expect(renewalNoticeDue(base, NOW).due).toBe(true);
    expect(renewalNoticeDue({ ...base, periodEnd: daysFromNow(7) }, NOW).due).toBe(true);
  });
  it("waits until the final week", () => {
    expect(renewalNoticeDue({ ...base, periodEnd: daysFromNow(8) }, NOW).reason).toBe("too_early");
  });
  it("never warns after the period has ended", () => {
    expect(renewalNoticeDue({ ...base, periodEnd: daysFromNow(-1) }, NOW).reason).toBe("period_ended");
  });
  it("never warns a subscriber who is already cancelling (no charge is coming)", () => {
    expect(renewalNoticeDue({ ...base, cancelAtPeriodEnd: true }, NOW).reason).toBe("already_cancelling");
  });
  it("only fires for annual prices and live subscriptions", () => {
    expect(renewalNoticeDue({ ...base, isAnnual: false }, NOW).reason).toBe("not_annual");
    expect(renewalNoticeDue({ ...base, stripeStatus: "trialing" }, NOW).reason).toBe("not_active");
    expect(renewalNoticeDue({ ...base, stripeStatus: "past_due" }, NOW).reason).toBe("not_active");
  });
});

describe("trialWinbackSecondDue", () => {
  const base = { stripeStatus: "canceled", trialEndSec: daysAgoSec(30), hasLiveSubscription: false };
  it("is due ~30 days after the trial died unconverted", () => {
    expect(trialWinbackSecondDue(base, NOW).due).toBe(true);
    expect(trialWinbackSecondDue({ ...base, trialEndSec: daysAgoSec(28) }, NOW).due).toBe(true);
    expect(trialWinbackSecondDue({ ...base, trialEndSec: daysAgoSec(38) }, NOW).due).toBe(true);
  });
  it("stays silent inside the first win-back's band (days 0–27)", () => {
    expect(trialWinbackSecondDue({ ...base, trialEndSec: daysAgoSec(7) }, NOW).reason).toBe("too_early");
    expect(trialWinbackSecondDue({ ...base, trialEndSec: daysAgoSec(27) }, NOW).reason).toBe("too_early");
  });
  it("does no archaeology past the band", () => {
    expect(trialWinbackSecondDue({ ...base, trialEndSec: daysAgoSec(39) }, NOW).reason).toBe("too_old");
  });
  it("keeps the lost-trial gates from the first win-back", () => {
    expect(trialWinbackSecondDue({ ...base, trialEndSec: null }, NOW).reason).toBe("never_trialed");
    expect(trialWinbackSecondDue({ ...base, stripeStatus: "active" }, NOW).reason).toBe("not_ended_unconverted");
    expect(trialWinbackSecondDue({ ...base, hasLiveSubscription: true }, NOW).reason).toBe("already_subscribed");
  });
});

describe("cancellationSaveDue", () => {
  const base = { stripeStatus: "active", cancelAtPeriodEnd: true, periodEnd: daysFromNow(12) };
  it("is due for a live subscription set to cancel with time left", () => {
    expect(cancellationSaveDue(base, NOW).due).toBe(true);
    expect(cancellationSaveDue({ ...base, stripeStatus: "trialing" }, NOW).due).toBe(true);
  });
  it("requires the cancelling state", () => {
    expect(cancellationSaveDue({ ...base, cancelAtPeriodEnd: false }, NOW).reason).toBe("not_cancelling");
  });
  it("stays silent once access has actually ended (the ended win-back owns that)", () => {
    expect(cancellationSaveDue({ ...base, periodEnd: daysFromNow(-1) }, NOW).reason).toBe("period_ended");
    expect(cancellationSaveDue({ ...base, stripeStatus: "canceled" }, NOW).reason).toBe("not_live");
  });
});

describe("subscriptionEndedWinbackDue", () => {
  const paidBase = {
    stripeStatus: "canceled",
    trialEndSec: daysAgoSec(90), // trialed long ago, converted, paid for months
    canceledAtSec: daysAgoSec(2),
    hasLiveSubscription: false,
  };
  it("is due in the first week after a paid subscription ended", () => {
    expect(subscriptionEndedWinbackDue(paidBase, NOW).due).toBe(true);
    expect(subscriptionEndedWinbackDue({ ...paidBase, trialEndSec: null }, NOW).due).toBe(true);
    expect(subscriptionEndedWinbackDue({ ...paidBase, canceledAtSec: daysAgoSec(7) }, NOW).due).toBe(true);
  });
  it("never double-touches a trial death (the trial win-back owns it)", () => {
    const trialDeath = { ...paidBase, trialEndSec: daysAgoSec(4), canceledAtSec: daysAgoSec(2) };
    expect(subscriptionEndedWinbackDue(trialDeath, NOW).reason).toBe("trial_death");
  });
  it("does no archaeology past a week", () => {
    expect(subscriptionEndedWinbackDue({ ...paidBase, canceledAtSec: daysAgoSec(8) }, NOW).reason).toBe("too_old");
  });
  it("requires a real cancellation", () => {
    expect(subscriptionEndedWinbackDue({ ...paidBase, stripeStatus: "incomplete_expired" }, NOW).reason).toBe("not_ended");
    expect(subscriptionEndedWinbackDue({ ...paidBase, canceledAtSec: null }, NOW).reason).toBe("no_cancel_time");
    expect(subscriptionEndedWinbackDue({ ...paidBase, hasLiveSubscription: true }, NOW).reason).toBe("already_subscribed");
  });
});

describe("onboardingDripDue", () => {
  const mk = (ageDays: number, sub = false) => ({
    createdAt: new Date(NOW.getTime() - ageDays * 86400_000),
    hasLiveSubscription: sub,
  });
  it("day 2 fires in the 2–5 day band only", () => {
    expect(onboardingDripDue(mk(1), NOW).day2.reason).toBe("too_early");
    expect(onboardingDripDue(mk(2), NOW).day2.due).toBe(true);
    expect(onboardingDripDue(mk(4), NOW).day2.due).toBe(true);
    expect(onboardingDripDue(mk(5), NOW).day2.reason).toBe("too_old");
  });
  it("day 5 fires in the 5–9 day band only, disjoint from day 2", () => {
    expect(onboardingDripDue(mk(4), NOW).day5.reason).toBe("too_early");
    expect(onboardingDripDue(mk(5), NOW).day5.due).toBe(true);
    expect(onboardingDripDue(mk(8), NOW).day5.due).toBe(true);
    expect(onboardingDripDue(mk(9), NOW).day5.reason).toBe("too_old");
  });
  it("never drips at subscribers", () => {
    expect(onboardingDripDue(mk(3, true), NOW).day2.reason).toBe("already_subscribed");
    expect(onboardingDripDue(mk(6, true), NOW).day5.reason).toBe("already_subscribed");
  });
});

describe("inactiveDue", () => {
  const mk = (quietDays: number, sub = false) => ({
    quietSince: new Date(NOW.getTime() - quietDays * 86400_000),
    hasLiveSubscription: sub,
  });
  it("stage 14 fires in the 14–21 day quiet band", () => {
    expect(inactiveDue(mk(13), NOW).stage14.reason).toBe("too_early");
    expect(inactiveDue(mk(14), NOW).stage14.due).toBe(true);
    expect(inactiveDue(mk(20), NOW).stage14.due).toBe(true);
    expect(inactiveDue(mk(21), NOW).stage14.reason).toBe("too_old");
  });
  it("stage 30 fires in the 30–45 day quiet band", () => {
    expect(inactiveDue(mk(29), NOW).stage30.reason).toBe("too_early");
    expect(inactiveDue(mk(30), NOW).stage30.due).toBe(true);
    expect(inactiveDue(mk(44), NOW).stage30.due).toBe(true);
    expect(inactiveDue(mk(45), NOW).stage30.reason).toBe("too_old");
  });
  it("never nudges subscribers", () => {
    expect(inactiveDue(mk(16, true), NOW).stage14.reason).toBe("already_subscribed");
  });
});

describe("trialExitSurveyDue", () => {
  const base = { stripeStatus: "canceled", trialEndSec: daysAgoSec(4), hasLiveSubscription: false };
  it("is due 3–5 days after the trial died", () => {
    expect(trialExitSurveyDue(base, NOW).due).toBe(true);
    expect(trialExitSurveyDue({ ...base, trialEndSec: daysAgoSec(3) }, NOW).due).toBe(true);
    expect(trialExitSurveyDue({ ...base, trialEndSec: daysAgoSec(5) }, NOW).due).toBe(true);
  });
  it("waits until after the first win-back touch, and does no archaeology", () => {
    expect(trialExitSurveyDue({ ...base, trialEndSec: daysAgoSec(2) }, NOW).reason).toBe("too_early");
    expect(trialExitSurveyDue({ ...base, trialEndSec: daysAgoSec(6) }, NOW).reason).toBe("too_old");
  });
  it("keeps the lost-trial gates", () => {
    expect(trialExitSurveyDue({ ...base, trialEndSec: null }, NOW).reason).toBe("never_trialed");
    expect(trialExitSurveyDue({ ...base, hasLiveSubscription: true }, NOW).reason).toBe("already_subscribed");
  });
});

describe("verificationReminderDue", () => {
  const mk = (ageDays: number, verified = false) => ({
    verified,
    createdAt: new Date(NOW.getTime() - ageDays * 86400_000),
  });
  it("is due for unverified accounts 1–30 days old", () => {
    expect(verificationReminderDue(mk(1), NOW).due).toBe(true);
    expect(verificationReminderDue(mk(14), NOW).due).toBe(true);
    expect(verificationReminderDue(mk(30), NOW).due).toBe(true);
  });
  it("waits a day (the signup verification email just went out) and stops at 30", () => {
    expect(verificationReminderDue(mk(0), NOW).reason).toBe("too_early");
    expect(verificationReminderDue(mk(31), NOW).reason).toBe("too_old");
  });
  it("never reminds a verified account (incl. provider-verified)", () => {
    expect(verificationReminderDue(mk(5, true), NOW).reason).toBe("already_verified");
  });
});
