/**
 * Free-trial configuration per plan, shared by the Stripe checkout route
 * (which turns these into `trial_period_days` on the Checkout Session)
 * and its tests. Trials are Jameson's pricing decision (Conversion
 * Wave 2, F2 — every self-serve trial is 3 days):
 * weekly → 3 days, monthly → 3 days, annual → 3 days, enterprise → none.
 *
 * Changing a value here affects NEW checkout sessions only — a Stripe
 * subscription keeps the trial length it was created with.
 *
 * Stripe reports trialing subscriptions with status `trialing`, which
 * resolveSubscriptionStatus (src/auth.ts) normalizes to `active`, so trial
 * users get full Pro access and are never charged during the trial
 * (checkout collects the card up front via payment_method_collection).
 */
export type BillingPlan = "weekly" | "monthly" | "annual" | "enterprise";

export const TRIAL_DAYS: Record<BillingPlan, number> = {
  weekly: 3,
  monthly: 3,
  annual: 3,
  enterprise: 0,
};

/** Trial days for a plan name; unknown plans get no trial. */
export function trialDaysForPlan(plan: string): number {
  return (TRIAL_DAYS as Record<string, number>)[plan] ?? 0;
}
