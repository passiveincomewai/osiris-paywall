/**
 * Trial-ending popup (#12) — pure eligibility.
 *
 * The window: the subscription is in its free trial (status
 * "trialing") and the trial ends within the next 48 hours. The end
 * instant is the trialing row's currentPeriodEnd — the same field
 * lib/subscription-status treats as the trial's operative end (for a
 * trialing Stripe subscription the first period ends when the trial
 * does; lib/billing/manage reads Stripe's trial_end for the billing
 * page, and the webhook keeps this row's period in step with Stripe).
 *
 * Once per trial is enforced by the caller with a user+trial-end key:
 * a new trial has a new end instant and may fire again; conversion
 * (status leaves "trialing") or the end passing suppresses it forever
 * for that trial.
 */

/** "~2 days left": the popup's window before the trial end. */
export const TRIAL_ENDING_WINDOW_MS = 48 * 60 * 60 * 1000;

export interface TrialEndingFacts {
  /** Raw subscription status from the user's row. */
  status: string | null;
  /** currentPeriodEnd as epoch ms (the trial end while trialing). */
  periodEndMs: number | null;
  now: number;
}

export function trialEndingEligible(facts: TrialEndingFacts): boolean {
  if (facts.status !== "trialing") return false;
  if (facts.periodEndMs === null || !Number.isFinite(facts.periodEndMs)) {
    return false;
  }
  const remaining = facts.periodEndMs - facts.now;
  return remaining > 0 && remaining <= TRIAL_ENDING_WINDOW_MS;
}

/** Whole days left to display ("ends in 1 day" / "ends in 2 days") —
 *  ceil so a trial with 25 hours left reads 2, never 1. */
export function trialDaysLeft(periodEndMs: number, now: number): number {
  return Math.max(1, Math.ceil((periodEndMs - now) / (24 * 60 * 60 * 1000)));
}
