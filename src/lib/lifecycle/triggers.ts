// ── Trigger decisions ────────────────────────────────────────────────
// One pure function per lifecycle trigger: snapshot in, verdict out.
// These decide ONLY timing/eligibility — whether an email exists in
// the send log, opt-outs and the 48h cap are guards.ts' job, evaluated
// after a trigger says due. Windows come from config.ts and are pinned
// by triggers.test.ts; the engine adapts DB/Stripe rows into these
// snapshots, so nothing here touches a database or the network.
//
// Note on the trial-ENDING email: it is deliberately NOT a trigger
// here. /api/cron/trial-reminders already sends exactly one honest
// heads-up inside the last 24h of a trial (dedupe via Stripe metadata)
// — a second sender for the same moment would double-email trialing
// users. This system covers trial STARTED and trial ENDED (win-back).

import {
  WELCOME_MIN_AGE_MS,
  WELCOME_MAX_AGE_MS,
  INTEREST_MIN_ACCOUNT_AGE_MS,
  INTEREST_ACTIVITY_WINDOW_MS,
  RETARGET_PRICING_WINDOW_MS,
  RETARGET_ATTEMPT_QUIET_MS,
  RETARGET_CHECKOUT_MIN_ATTEMPT_AGE_MS,
  RETARGET_CHECKOUT_MIN_REMIND_GAP_MS,
  TRIAL_STARTED_WINDOW_MS,
  TRIAL_WINBACK_WINDOW_MS,
  TRIAL_WINBACK2_MIN_AGE_MS,
  TRIAL_WINBACK2_MAX_AGE_MS,
  RENEWAL_NOTICE_WINDOW_MS,
  SUBSCRIPTION_ENDED_WINBACK_WINDOW_MS,
  ONBOARDING_DAY2_MIN_AGE_MS,
  ONBOARDING_DAY2_MAX_AGE_MS,
  ONBOARDING_DAY5_MIN_AGE_MS,
  ONBOARDING_DAY5_MAX_AGE_MS,
  INACTIVE_STAGE1_MIN_MS,
  INACTIVE_STAGE1_MAX_MS,
  INACTIVE_STAGE2_MIN_MS,
  INACTIVE_STAGE2_MAX_MS,
  EXIT_SURVEY_MIN_AGE_MS,
  EXIT_SURVEY_MAX_AGE_MS,
  VERIFICATION_REMINDER_MIN_AGE_MS,
  VERIFICATION_REMINDER_MAX_AGE_MS,
  TRIAL_TRACK_SHORT_MAX_SPAN_MS,
  TRIAL_DAY1_RECAP_MIN_AGE_MS,
  TRIAL_DAY1_RECAP_MAX_AGE_MS,
  TRIAL_DAY2_CTA_MIN_AGE_MS,
  TRIAL_DAY2_CTA_MAX_AGE_MS,
  TRIAL_DAY5_FEATURE_MIN_AGE_MS,
  TRIAL_DAY5_FEATURE_MAX_AGE_MS,
  TRIAL_PRECHARGE_MIN_UNTIL_END_MS,
  TRIAL_PRECHARGE_MAX_UNTIL_END_MS,
  TRIAL_PRECHARGE_SHORT_MIN_AGE_MS,
  TRIAL_PRECHARGE_SHORT_MIN_REMAINING_MS,
  DAY_MS,
  AFFILIATE_SIGNUP_WINDOW_MS,
  AFFILIATE_COMMISSION_WINDOW_MS,
} from "./config";
import type { InterestResult } from "./interest";
import type { RegionInterest } from "./region";

export interface TriggerVerdict {
  due: boolean;
  /** Machine-readable why, surfaced in run summaries and pinned in tests. */
  reason: string;
}

const DUE: TriggerVerdict = { due: true, reason: "due" };
const no = (reason: string): TriggerVerdict => ({ due: false, reason });

// ── (a) Welcome + discount code ──────────────────────────────────────
export function welcomeDue(
  input: { userCreatedAt: Date; hasLiveSubscription: boolean },
  now: Date,
): TriggerVerdict {
  if (input.hasLiveSubscription) return no("already_subscribed");
  const age = now.getTime() - input.userCreatedAt.getTime();
  if (age < WELCOME_MIN_AGE_MS) return no("too_young");
  if (age > WELCOME_MAX_AGE_MS) return no("too_old");
  return DUE;
}

// ── (b) Interest-matched follow-up ───────────────────────────────────
// Needs an honest plan signal (a checkout attempt names the plan).
// Pricing-engagement-only users are retarget_pricing's audience, so
// the two audiences never overlap and nobody gets both.
export function interestFollowupDue(
  input: { userCreatedAt: Date; interest: InterestResult; hasLiveSubscription: boolean },
  now: Date,
): TriggerVerdict {
  if (input.hasLiveSubscription) return no("already_subscribed");
  if (input.interest.basis !== "checkout_attempt" || !input.interest.plan) {
    return no("no_plan_signal");
  }
  const age = now.getTime() - input.userCreatedAt.getTime();
  if (age < INTEREST_MIN_ACCOUNT_AGE_MS) return no("too_young");
  return DUE;
}

// ── (c1) Retargeting: engaged with pricing, never reached checkout ──
export function retargetPricingDue(
  input: {
    interest: InterestResult;
    lastAttemptAt: Date | null;
    hasLiveSubscription: boolean;
  },
  now: Date,
): TriggerVerdict {
  if (input.hasLiveSubscription) return no("already_subscribed");
  if (!input.interest.pricingEngaged || !input.interest.lastPricingViewAt) {
    return no("no_pricing_engagement");
  }
  const sinceView = now.getTime() - input.interest.lastPricingViewAt.getTime();
  if (sinceView > RETARGET_PRICING_WINDOW_MS) return no("engagement_stale");
  if (sinceView < 0) return no("engagement_in_future");
  // A recent checkout attempt makes this the checkout trigger's user.
  if (
    input.lastAttemptAt &&
    now.getTime() - input.lastAttemptAt.getTime() < RETARGET_ATTEMPT_QUIET_MS
  ) {
    return no("recent_attempt");
  }
  return DUE;
}

// ── (c2) Retargeting: abandoned checkout, second touch with a code ──
// The existing abandoned-cart cron owns the first touch (status flips
// started -> reminded after its send). This fires only on reminded
// attempts that stayed unconverted.
export function retargetCheckoutDue(
  input: {
    attempt: { status: string; createdAt: Date; remindedAt: Date | null };
    hasLiveSubscription: boolean;
  },
  now: Date,
): TriggerVerdict {
  if (input.hasLiveSubscription) return no("already_subscribed");
  const a = input.attempt;
  if (a.status === "completed") return no("attempt_completed");
  if (a.status !== "reminded" || !a.remindedAt) return no("first_touch_pending");
  if (now.getTime() - a.createdAt.getTime() < RETARGET_CHECKOUT_MIN_ATTEMPT_AGE_MS) {
    return no("attempt_too_fresh");
  }
  if (now.getTime() - a.remindedAt.getTime() < RETARGET_CHECKOUT_MIN_REMIND_GAP_MS) {
    return no("reminded_too_recently");
  }
  return DUE;
}

// ── (d1) Trial started ───────────────────────────────────────────────
export function trialStartedDue(
  input: { stripeStatus: string; subscriptionCreatedAt: Date },
  now: Date,
): TriggerVerdict {
  if (input.stripeStatus !== "trialing") return no("not_trialing");
  const age = now.getTime() - input.subscriptionCreatedAt.getTime();
  if (age < 0) return no("starts_in_future");
  if (age > TRIAL_STARTED_WINDOW_MS) return no("too_old");
  return DUE;
}

// ── (d2) Trial ended without converting → win-back ───────────────────
export function trialWinbackDue(
  input: {
    stripeStatus: string;
    /** Unix seconds, Stripe `trial_end`; null when the sub never trialed. */
    trialEndSec: number | null;
    hasLiveSubscription: boolean;
  },
  now: Date,
): TriggerVerdict {
  if (input.hasLiveSubscription) return no("already_subscribed");
  if (!input.trialEndSec) return no("never_trialed");
  // Only a dead subscription is a lost trial. An active one converted;
  // a still-trialing one hasn't ended; anything else (past_due etc.)
  // is a billing state the dunning flow owns, not a win-back.
  if (input.stripeStatus !== "canceled" && input.stripeStatus !== "incomplete_expired") {
    return no("not_ended_unconverted");
  }
  const sinceEnd = now.getTime() - input.trialEndSec * 1000;
  if (sinceEnd < 0) return no("trial_not_ended");
  if (sinceEnd > TRIAL_WINBACK_WINDOW_MS) return no("too_old");
  return DUE;
}

// ── (e1) Affiliate: someone signed up via your link ──────────────────
export function affiliateSignupDue(
  input: { attributionCreatedAt: Date },
  now: Date,
): TriggerVerdict {
  const age = now.getTime() - input.attributionCreatedAt.getTime();
  if (age < 0) return no("in_future");
  if (age > AFFILIATE_SIGNUP_WINDOW_MS) return no("too_old");
  return DUE;
}

// ── (e2) Affiliate: first commission ever ────────────────────────────
export function affiliateFirstCommissionDue(
  input: { commissionCreatedAt: Date; isFirstCommission: boolean },
  now: Date,
): TriggerVerdict {
  if (!input.isFirstCommission) return no("not_first");
  const age = now.getTime() - input.commissionCreatedAt.getTime();
  if (age < 0) return no("in_future");
  if (age > AFFILIATE_COMMISSION_WINDOW_MS) return no("too_old");
  return DUE;
}

// ── (f) Region interest ──────────────────────────────────────────────
// The heavy-lifting verdict lives in region.ts (summarizeRegionInterest
// applies the opens/touches/dwell/share bar); this is the remaining
// gate: paying users don't need a Pro pitch for the region they watch.
export function regionInterestDue(
  input: { interest: RegionInterest | null; hasLiveSubscription: boolean },
  _now: Date,
): TriggerVerdict {
  if (input.hasLiveSubscription) return no("already_subscribed");
  if (!input.interest) return no("below_threshold");
  return DUE;
}

// ── (g) Annual renewal advance notice ────────────────────────────────
// The trial-ending email owns a trial's first charge; this owns every
// ANNUAL renewal after it. Only a live, non-cancelling annual sub is
// ever charged again, so anything else is a false warning.
export function renewalNoticeDue(
  input: {
    stripeStatus: string;
    cancelAtPeriodEnd: boolean;
    periodEnd: Date;
    /** From the live Stripe price's recurring interval — never assumed. */
    isAnnual: boolean;
  },
  now: Date,
): TriggerVerdict {
  if (input.stripeStatus !== "active") return no("not_active");
  if (input.cancelAtPeriodEnd) return no("already_cancelling");
  if (!input.isAnnual) return no("not_annual");
  const untilEnd = input.periodEnd.getTime() - now.getTime();
  if (untilEnd <= 0) return no("period_ended");
  if (untilEnd > RENEWAL_NOTICE_WINDOW_MS) return no("too_early");
  return DUE;
}

// ── (d3) Second trial win-back (~30 days) ────────────────────────────
// Same lost-trial gates as trialWinbackDue, a disjoint later band:
// days 28–38 after the trial died. One extra touch, never a sequence.
export function trialWinbackSecondDue(
  input: {
    stripeStatus: string;
    trialEndSec: number | null;
    hasLiveSubscription: boolean;
  },
  now: Date,
): TriggerVerdict {
  if (input.hasLiveSubscription) return no("already_subscribed");
  if (!input.trialEndSec) return no("never_trialed");
  if (input.stripeStatus !== "canceled" && input.stripeStatus !== "incomplete_expired") {
    return no("not_ended_unconverted");
  }
  const sinceEnd = now.getTime() - input.trialEndSec * 1000;
  if (sinceEnd < TRIAL_WINBACK2_MIN_AGE_MS) return no("too_early");
  if (sinceEnd > TRIAL_WINBACK2_MAX_AGE_MS) return no("too_old");
  return DUE;
}

// ── (h) Cancellation save ────────────────────────────────────────────
// State-based, not transition-based: a live subscription sitting in
// cancel_at_period_end with paid time left gets ONE save email per
// period (the once-only log keys on the period end). Catching the
// state — rather than diffing webhook events — means portal, API and
// support cancellations are all covered identically.
export function cancellationSaveDue(
  input: {
    stripeStatus: string;
    cancelAtPeriodEnd: boolean;
    periodEnd: Date;
  },
  now: Date,
): TriggerVerdict {
  if (input.stripeStatus !== "active" && input.stripeStatus !== "trialing") {
    return no("not_live");
  }
  if (!input.cancelAtPeriodEnd) return no("not_cancelling");
  if (input.periodEnd.getTime() <= now.getTime()) return no("period_ended");
  return DUE;
}

// ── (i) Paid subscription ended → win-back ───────────────────────────
// A subscription whose PAID period actually ended (status canceled at
// or after its paid period end) — explicitly NOT a trial death: when
// the cancellation lands within a week of trial_end, the trial
// win-back owns this user and this trigger stays silent. A converted
// subscriber's canceled_at is their period end, weeks past trial_end,
// so the guard separates the two populations cleanly.
export function subscriptionEndedWinbackDue(
  input: {
    stripeStatus: string;
    /** Unix seconds, Stripe `trial_end`; null when the sub never trialed. */
    trialEndSec: number | null;
    /** Unix seconds, Stripe `canceled_at`; for cancel-at-period-end
     * subs this is the moment access ended. */
    canceledAtSec: number | null;
    hasLiveSubscription: boolean;
  },
  now: Date,
): TriggerVerdict {
  if (input.hasLiveSubscription) return no("already_subscribed");
  if (input.stripeStatus !== "canceled") return no("not_ended");
  if (!input.canceledAtSec) return no("no_cancel_time");
  if (
    input.trialEndSec &&
    input.canceledAtSec - input.trialEndSec <= 7 * (DAY_MS / 1000)
  ) {
    return no("trial_death");
  }
  const sinceEnd = now.getTime() - input.canceledAtSec * 1000;
  if (sinceEnd < 0) return no("ends_in_future");
  if (sinceEnd > SUBSCRIPTION_ENDED_WINBACK_WINDOW_MS) return no("too_old");
  return DUE;
}

// ── (j) Onboarding drip ──────────────────────────────────────────────
// Verified free accounts (the engine filters to emailVerified users
// with no live subscription). Two disjoint age bands: day 2 then day 5.
export function onboardingDripDue(
  input: { createdAt: Date; hasLiveSubscription: boolean },
  now: Date,
): { day2: TriggerVerdict; day5: TriggerVerdict } {
  if (input.hasLiveSubscription) {
    return { day2: no("already_subscribed"), day5: no("already_subscribed") };
  }
  const age = now.getTime() - input.createdAt.getTime();
  const day2: TriggerVerdict =
    age < ONBOARDING_DAY2_MIN_AGE_MS ? no("too_early")
    : age >= ONBOARDING_DAY2_MAX_AGE_MS ? no("too_old")
    : DUE;
  const day5: TriggerVerdict =
    age < ONBOARDING_DAY5_MIN_AGE_MS ? no("too_early")
    : age >= ONBOARDING_DAY5_MAX_AGE_MS ? no("too_old")
    : DUE;
  return { day2, day5 };
}

// ── (k) Inactive re-engagement ───────────────────────────────────────
// Quiet is measured from the later of account creation and the last
// signed-in page view, so an active user can never look inactive and
// a brand-new account can't be "inactive" before it had a chance.
export function inactiveDue(
  input: { quietSince: Date; hasLiveSubscription: boolean },
  now: Date,
): { stage14: TriggerVerdict; stage30: TriggerVerdict } {
  if (input.hasLiveSubscription) {
    return { stage14: no("already_subscribed"), stage30: no("already_subscribed") };
  }
  const quiet = now.getTime() - input.quietSince.getTime();
  const stage14: TriggerVerdict =
    quiet < INACTIVE_STAGE1_MIN_MS ? no("too_early")
    : quiet >= INACTIVE_STAGE1_MAX_MS ? no("too_old")
    : DUE;
  const stage30: TriggerVerdict =
    quiet < INACTIVE_STAGE2_MIN_MS ? no("too_early")
    : quiet >= INACTIVE_STAGE2_MAX_MS ? no("too_old")
    : DUE;
  return { stage14, stage30 };
}

// ── (l) Exit survey ──────────────────────────────────────────────────
// Same lost-trial gates as the win-backs; the 3–5 day band puts it
// after the first win-back touch and before the ~30d second touch.
export function trialExitSurveyDue(
  input: {
    stripeStatus: string;
    trialEndSec: number | null;
    hasLiveSubscription: boolean;
  },
  now: Date,
): TriggerVerdict {
  if (input.hasLiveSubscription) return no("already_subscribed");
  if (!input.trialEndSec) return no("never_trialed");
  if (input.stripeStatus !== "canceled" && input.stripeStatus !== "incomplete_expired") {
    return no("not_ended_unconverted");
  }
  const sinceEnd = now.getTime() - input.trialEndSec * 1000;
  if (sinceEnd < EXIT_SURVEY_MIN_AGE_MS) return no("too_early");
  if (sinceEnd > EXIT_SURVEY_MAX_AGE_MS) return no("too_old");
  return DUE;
}

// ── (t) Trialist engagement track ────────────────────────────────────
// Touches DURING a live trial. Track kind derives from the sub's REAL
// trial span (trial_start → trial_end), never from restated plan
// constants: the weekly trial spans 3 days, the rest span 10, and the
// 5-day cut separates them with room on both sides. The engine only
// evaluates these for subs Stripe reports as trialing; the status
// gate is repeated here so the pure contract stands alone in tests.
export type TrialTrackKind = "short" | "long";

export function trialTrackKind(input: {
  /** Unix seconds: trial start (Stripe trial_start, else sub created). */
  trialStartSec: number;
  /** Unix seconds: Stripe trial_end. */
  trialEndSec: number;
}): TrialTrackKind {
  const spanMs = (input.trialEndSec - input.trialStartSec) * 1000;
  return spanMs <= TRIAL_TRACK_SHORT_MAX_SPAN_MS ? "short" : "long";
}

interface TrialEngagementInput {
  stripeStatus: string;
  track: TrialTrackKind;
  /** Trial start (Stripe trial_start, else subscription created). */
  trialStart: Date;
}

export function trialDay1RecapDue(input: TrialEngagementInput, now: Date): TriggerVerdict {
  if (input.stripeStatus !== "trialing") return no("not_trialing");
  if (input.track !== "long") return no("short_track");
  const age = now.getTime() - input.trialStart.getTime();
  if (age < TRIAL_DAY1_RECAP_MIN_AGE_MS) return no("too_early");
  if (age >= TRIAL_DAY1_RECAP_MAX_AGE_MS) return no("too_old");
  return DUE;
}

export function trialDay2CtaDue(input: TrialEngagementInput, now: Date): TriggerVerdict {
  if (input.stripeStatus !== "trialing") return no("not_trialing");
  if (input.track !== "long") return no("short_track");
  const age = now.getTime() - input.trialStart.getTime();
  if (age < TRIAL_DAY2_CTA_MIN_AGE_MS) return no("too_early");
  if (age >= TRIAL_DAY2_CTA_MAX_AGE_MS) return no("too_old");
  return DUE;
}

export function trialDay5FeatureDue(input: TrialEngagementInput, now: Date): TriggerVerdict {
  if (input.stripeStatus !== "trialing") return no("not_trialing");
  if (input.track !== "long") return no("short_track");
  const age = now.getTime() - input.trialStart.getTime();
  if (age < TRIAL_DAY5_FEATURE_MIN_AGE_MS) return no("too_early");
  if (age >= TRIAL_DAY5_FEATURE_MAX_AGE_MS) return no("too_old");
  return DUE;
}

// The last engagement touch before the charge. Long track: purely the
// (24h, 48h]-to-end window — disjoint from the transactional
// trial-reminders email, which owns the final 24h. Short track: the
// ONLY touch (the generic cadence can't fit a 3-day trial under the
// 48h cap after the welcome), gated to age ≥48h with ≥6h remaining so
// it lands mid-final-day, never on top of the reminder.
export function trialPrechargeRecapDue(
  input: TrialEngagementInput & { trialEnd: Date },
  now: Date,
): TriggerVerdict {
  if (input.stripeStatus !== "trialing") return no("not_trialing");
  const untilEnd = input.trialEnd.getTime() - now.getTime();
  if (input.track === "short") {
    const age = now.getTime() - input.trialStart.getTime();
    if (age < TRIAL_PRECHARGE_SHORT_MIN_AGE_MS) return no("too_early");
    if (untilEnd < TRIAL_PRECHARGE_SHORT_MIN_REMAINING_MS) return no("ending_too_soon");
    if (untilEnd > TRIAL_PRECHARGE_MAX_UNTIL_END_MS) return no("too_early");
    return DUE;
  }
  if (untilEnd <= TRIAL_PRECHARGE_MIN_UNTIL_END_MS) return no("ending_too_soon");
  if (untilEnd > TRIAL_PRECHARGE_MAX_UNTIL_END_MS) return no("too_early");
  return DUE;
}

// ── (m) Verification reminder (round 2, R1) ──────────────────────────
// `verified` arrives precomputed by the engine via lib/auth-verification's
// isVerifiedRow (column set OR a provider-verified OAuth link) — a
// Google user whose column hasn't healed yet must never be reminded.
export function verificationReminderDue(
  input: { verified: boolean; createdAt: Date },
  now: Date,
): TriggerVerdict {
  if (input.verified) return no("already_verified");
  const age = now.getTime() - input.createdAt.getTime();
  if (age < VERIFICATION_REMINDER_MIN_AGE_MS) return no("too_early");
  if (age > VERIFICATION_REMINDER_MAX_AGE_MS) return no("too_old");
  return DUE;
}
